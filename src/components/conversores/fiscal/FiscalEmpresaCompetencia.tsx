import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Calendar, ChevronRight, Plus, Loader2, Search, Edit2, Check, X, Shield, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEmpresasExternas, type EmpresaExterna } from "@/hooks/useEmpresasExternas";
import { formatCnpj, isValidCnpj, fetchCnpjData, cleanCnpj } from "@/utils/cnpjUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FiscalEmpresaCompetenciaProps {
  onConfirm: (empresa: EmpresaExterna, competencia: { mes: number; ano: number }) => void;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const REGIMES = [
  { value: "simples_nacional", label: "Simples Nacional", color: "hsl(var(--cyan))" },
  { value: "lucro_presumido", label: "Lucro Presumido", color: "hsl(var(--blue))" },
  { value: "lucro_real", label: "Lucro Real", color: "hsl(var(--orange))" },
  { value: "mei", label: "MEI", color: "hsl(var(--yellow))" },
];

function detectRegimeFromPorte(porte: string | null, natureza: string | null): string | null {
  if (!porte && !natureza) return null;
  const p = (porte || "").toLowerCase();
  const n = (natureza || "").toLowerCase();
  if (n.includes("mei") || n.includes("microempreendedor individual")) return "mei";
  if (p.includes("micro") || p.includes("pequeno")) return "simples_nacional";
  return null;
}

function getRegimeInfo(regime: string | null) {
  return REGIMES.find(r => r.value === regime);
}

export function FiscalEmpresaCompetencia({ onConfirm }: FiscalEmpresaCompetenciaProps) {
  const { empresasExternas, isLoading, createEmpresa, updateEmpresa } = useEmpresasExternas();
  const [selectedId, setSelectedId] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaExterna | null>(null);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [cnpjValidado, setCnpjValidado] = useState<boolean | null>(null);

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    codigo_empresa: "",
    regime_tributario: "",
  });

  const selectedEmpresa = empresasExternas.find(e => e.id === selectedId);
  const filteredEmpresas = useMemo(() => empresasExternas.filter(e =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.codigo_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.cnpj && e.cnpj.includes(searchTerm.replace(/\D/g, "")))
  ), [empresasExternas, searchTerm]);

  const handleOpenModal = (empresa?: EmpresaExterna) => {
    if (empresa) {
      setEditingEmpresa(empresa);
      setFormData({
        nome: empresa.nome,
        cnpj: empresa.cnpj ? formatCnpj(empresa.cnpj) : "",
        codigo_empresa: empresa.codigo_empresa,
        regime_tributario: empresa.regime_tributario || "",
      });
      setCnpjValidado(empresa.cnpj ? isValidCnpj(empresa.cnpj) : null);
    } else {
      setEditingEmpresa(null);
      setFormData({ nome: "", cnpj: "", codigo_empresa: "", regime_tributario: "" });
      setCnpjValidado(null);
    }
    setShowModal(true);
  };

  const handleCnpjChange = async (rawValue: string) => {
    const formatted = formatCnpj(rawValue);
    setFormData(prev => ({ ...prev, cnpj: formatted }));
    const digits = cleanCnpj(formatted);
    if (digits.length < 14) { setCnpjValidado(null); return; }
    if (!isValidCnpj(digits)) {
      setCnpjValidado(false);
      toast.error("CNPJ inválido — dígitos verificadores não conferem");
      return;
    }

    setCnpjValidado(true);
    setBuscandoCnpj(true);
    try {
      const data = await fetchCnpjData(digits);
      const detectedRegime = detectRegimeFromPorte(data.porte, data.natureza_juridica);
      setFormData(prev => ({
        ...prev,
        nome: prev.nome || data.razao_social,
        codigo_empresa: prev.codigo_empresa || digits.slice(0, 8),
        regime_tributario: prev.regime_tributario || detectedRegime || "",
      }));
      toast.success(`Empresa encontrada: ${data.razao_social}`);
    } catch { /* handled silently */ }
    finally { setBuscandoCnpj(false); }
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.codigo_empresa) return;
    const cnpjLimpo = cleanCnpj(formData.cnpj);
    try {
      if (editingEmpresa) {
        await updateEmpresa.mutateAsync({
          id: editingEmpresa.id,
          nome: formData.nome,
          cnpj: cnpjLimpo || null,
          codigo_empresa: formData.codigo_empresa,
          regime_tributario: formData.regime_tributario || null,
        });
      } else {
        const result = await createEmpresa.mutateAsync({
          nome: formData.nome,
          cnpj: cnpjLimpo || null,
          codigo_empresa: formData.codigo_empresa,
          regime_tributario: formData.regime_tributario || null,
        });
        if (result) setSelectedId(result.id);
      }
      setShowModal(false);
    } catch { /* handled by mutation */ }
  };

  const handleConfirm = () => {
    if (!selectedEmpresa) return;
    onConfirm(selectedEmpresa, { mes: mes + 1, ano });
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 py-2">
      {/* ── Company Selector ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--cyan)/0.12)] border border-[hsl(var(--cyan)/0.2)] flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-[hsl(var(--cyan))]" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Empresa Tomadora</h3>
              <p className="text-[10px] text-muted-foreground">Selecione ou cadastre a empresa</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenModal()}
            className="h-7 text-[10px] gap-1 text-[hsl(var(--cyan))] hover:text-[hsl(var(--cyan))] hover:bg-[hsl(var(--cyan)/0.08)]"
          >
            <Plus className="w-3 h-3" /> Nova
          </Button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-background/50 border-border/40 focus-visible:ring-[hsl(var(--cyan)/0.3)]"
            />
          </div>
        </div>

        {/* List */}
        <div className="px-3 pb-3 max-h-[260px] overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmpresas.length === 0 ? (
            <div className="text-center py-10">
              <Building2 className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Nenhuma empresa encontrada</p>
              <Button variant="link" size="sm" onClick={() => handleOpenModal()} className="text-[10px] text-[hsl(var(--cyan))] mt-1 h-auto p-0">
                Cadastrar agora →
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredEmpresas.map((empresa, i) => {
                const isSelected = selectedId === empresa.id;
                const regime = getRegimeInfo(empresa.regime_tributario);
                return (
                  <motion.div
                    key={empresa.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelectedId(empresa.id)}
                    className={cn(
                      "group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-1",
                      isSelected
                        ? "bg-[hsl(var(--cyan)/0.08)] ring-1 ring-[hsl(var(--cyan)/0.3)]"
                        : "hover:bg-foreground/[0.03]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 transition-all",
                        isSelected
                          ? "bg-[hsl(var(--cyan)/0.15)] text-[hsl(var(--cyan))] ring-1 ring-[hsl(var(--cyan)/0.3)]"
                          : "bg-muted/50 text-muted-foreground"
                      )}>
                        {empresa.nome.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-semibold truncate transition-colors",
                          isSelected && "text-[hsl(var(--cyan))]"
                        )}>{empresa.nome}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {empresa.cnpj ? formatCnpj(empresa.cnpj) : "Sem CNPJ"}
                          </span>
                          <span className="text-[9px] text-muted-foreground/40">·</span>
                          <span className="text-[9px] text-muted-foreground">{empresa.codigo_empresa}</span>
                        </div>
                      </div>

                      {/* Regime + Edit */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {regime && (
                          <span
                            className="text-[8px] font-medium px-1.5 py-0.5 rounded-md border"
                            style={{
                              color: regime.color,
                              borderColor: regime.color.replace(")", " / 0.25)"),
                              backgroundColor: regime.color.replace(")", " / 0.08)"),
                            }}
                          >
                            {regime.label}
                          </span>
                        )}
                        {!empresa.regime_tributario && (
                          <span className="text-[8px] text-destructive/70 px-1.5 py-0.5 rounded-md bg-destructive/5 border border-destructive/10">
                            Sem regime
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(empresa); }}
                          className="p-1 rounded-md hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition-all"
                          title="Editar empresa"
                        >
                          <Edit2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Selected glow */}
                    {isSelected && (
                      <motion.div
                        layoutId="empresa-selected"
                        className="absolute inset-0 rounded-xl ring-1 ring-[hsl(var(--cyan)/0.2)] pointer-events-none"
                        style={{ boxShadow: "inset 0 0 20px hsl(160 100% 50% / 0.03)" }}
                        transition={{ type: "spring", duration: 0.4 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Selected summary bar */}
        <AnimatePresence>
          {selectedEmpresa && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/40 bg-[hsl(var(--cyan)/0.04)] overflow-hidden"
            >
              <div className="px-5 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px]">
                  <Check className="w-3 h-3 text-[hsl(var(--cyan))]" />
                  <span className="text-muted-foreground">Selecionada:</span>
                  <span className="font-semibold text-[hsl(var(--cyan))]">{selectedEmpresa.nome}</span>
                </div>
                <button onClick={() => setSelectedId(undefined)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  Limpar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Competência Selector ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl p-5 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--blue)/0.12)] border border-[hsl(var(--blue)/0.2)] flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-[hsl(var(--blue))]" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Competência</h3>
            <p className="text-[10px] text-muted-foreground">Mês/ano de referência das notas fiscais</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* ── Confirm Button ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Button
          onClick={handleConfirm}
          disabled={!selectedEmpresa}
          className={cn(
            "w-full h-11 text-sm gap-2 rounded-xl font-semibold transition-all",
            selectedEmpresa
              ? "bg-[hsl(var(--cyan))] text-background hover:bg-[hsl(var(--cyan)/0.85)] shadow-[0_0_20px_hsl(160_100%_50%/0.2)]"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Sparkles className="w-4 h-4" />
          Iniciar Processamento
          <ChevronRight className="w-4 h-4" />
        </Button>
        {!selectedEmpresa && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">Selecione uma empresa para continuar</p>
        )}
      </motion.div>

      {/* ── Modal Nova/Editar Empresa ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md border-border/60 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-[hsl(var(--cyan)/0.12)] border border-[hsl(var(--cyan)/0.2)] flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-[hsl(var(--cyan))]" />
              </div>
              {editingEmpresa ? "Editar Empresa" : "Nova Empresa"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">CNPJ</Label>
              <div className="relative">
                <Input
                  value={formData.cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  maxLength={18}
                  className={cn(
                    "h-9 text-xs font-mono",
                    cnpjValidado === true && "border-[hsl(var(--cyan)/0.5)] focus-visible:ring-[hsl(var(--cyan)/0.3)]",
                    cnpjValidado === false && "border-destructive"
                  )}
                />
                {buscandoCnpj && <Loader2 className="absolute right-3 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                {cnpjValidado === true && !buscandoCnpj && <Check className="absolute right-3 top-2.5 h-3.5 w-3.5 text-[hsl(var(--cyan))]" />}
              </div>
              {cnpjValidado === false && <p className="text-[10px] text-destructive">CNPJ inválido</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Razão Social *</Label>
              <Input value={formData.nome} onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Empresa ABC Ltda" className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Código *</Label>
              <Input value={formData.codigo_empresa} onChange={(e) => setFormData(p => ({ ...p, codigo_empresa: e.target.value.toUpperCase().replace(/\s/g, "") }))} placeholder="ABC001" className="h-9 text-xs uppercase font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Regime Tributário</Label>
              <Select value={formData.regime_tributario} onValueChange={(v) => setFormData(p => ({ ...p, regime_tributario: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o regime..." />
                </SelectTrigger>
                <SelectContent>
                  {REGIMES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                        {r.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[9px] text-muted-foreground">
                Essencial para validação — Simples Nacional/MEI dispensa retenções federais
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)} className="text-xs h-8">
              <X className="w-3 h-3 mr-1.5" /> Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!formData.nome || !formData.codigo_empresa || createEmpresa.isPending || updateEmpresa.isPending}
              className="text-xs h-8 bg-[hsl(var(--cyan))] text-background hover:bg-[hsl(var(--cyan)/0.85)]"
            >
              {(createEmpresa.isPending || updateEmpresa.isPending) ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Check className="w-3 h-3 mr-1.5" />
              )}
              {editingEmpresa ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
