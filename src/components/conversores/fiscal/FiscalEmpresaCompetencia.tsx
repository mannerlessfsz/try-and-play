import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Calendar, ChevronRight, Plus, Loader2, Search, Edit2, Check, X, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEmpresasExternas, type EmpresaExterna } from "@/hooks/useEmpresasExternas";
import { formatCnpj, isValidCnpj, fetchCnpjData, cleanCnpj } from "@/utils/cnpjUtils";
import { cn } from "@/lib/utils";

interface FiscalEmpresaCompetenciaProps {
  onConfirm: (empresa: EmpresaExterna, competencia: { mes: number; ano: number }) => void;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const REGIMES = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
  { value: "mei", label: "MEI" },
];

function detectRegimeFromPorte(porte: string | null, natureza: string | null): string | null {
  if (!porte && !natureza) return null;
  const p = (porte || "").toLowerCase();
  const n = (natureza || "").toLowerCase();
  if (n.includes("mei") || n.includes("microempreendedor individual")) return "mei";
  if (p.includes("micro") || p.includes("pequeno")) return "simples_nacional";
  return null;
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
  const [mes, setMes] = useState(now.getMonth()); // 0-indexed for display, +1 for value
  const [ano, setAno] = useState(now.getFullYear());

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    codigo_empresa: "",
    regime_tributario: "",
  });

  const selectedEmpresa = empresasExternas.find(e => e.id === selectedId);
  const filteredEmpresas = empresasExternas.filter(e =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.codigo_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.cnpj && e.cnpj.includes(searchTerm.replace(/\D/g, "")))
  );

  const handleOpenModal = (empresa?: EmpresaExterna) => {
    if (empresa) {
      setEditingEmpresa(empresa);
      setFormData({
        nome: empresa.nome,
        cnpj: empresa.cnpj ? formatCnpj(empresa.cnpj) : "",
        codigo_empresa: empresa.codigo_empresa,
        regime_tributario: (empresa as any).regime_tributario || "",
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
    if (!isValidCnpj(digits)) { setCnpjValidado(false); return; }

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
        } as any);
      } else {
        const result = await createEmpresa.mutateAsync({
          nome: formData.nome,
          cnpj: cnpjLimpo || null,
          codigo_empresa: formData.codigo_empresa,
          regime_tributario: formData.regime_tributario || null,
        } as any);
        if (result) setSelectedId(result.id);
      }
      setShowModal(false);
    } catch { /* handled by mutation */ }
  };

  const handleConfirm = () => {
    if (!selectedEmpresa) return;
    onConfirm(selectedEmpresa, { mes: mes + 1, ano });
  };

  const accentColor = "hsl(var(--cyan))";

  return (
    <div className="space-y-6">
      {/* Company Selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor + "15", border: `1px solid ${accentColor}30` }}>
            <Building2 className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <h3 className="text-sm font-bold">Empresa Tomadora</h3>
            <p className="text-[10px] text-muted-foreground">Selecione a empresa que está tomando os serviços</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid gap-2 max-h-[240px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filteredEmpresas.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Nenhuma empresa encontrada
            </div>
          ) : (
            filteredEmpresas.map((empresa) => {
              const regime = (empresa as any).regime_tributario;
              return (
                <div
                  key={empresa.id}
                  onClick={() => setSelectedId(empresa.id)}
                  className={cn(
                    "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group",
                    selectedId === empresa.id
                      ? "border-[hsl(var(--cyan)/0.5)] bg-[hsl(var(--cyan)/0.05)]"
                      : "border-foreground/5 hover:border-foreground/15 hover:bg-foreground/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{empresa.nome}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-mono">{empresa.cnpj ? formatCnpj(empresa.cnpj) : "Sem CNPJ"}</span>
                        <span>·</span>
                        <span>{empresa.codigo_empresa}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {regime && (
                      <Badge variant="outline" className="text-[9px]">
                        <Shield className="w-2.5 h-2.5 mr-1" />
                        {REGIMES.find(r => r.value === regime)?.label || regime}
                      </Badge>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenModal(empresa); }}
                      className="p-1 rounded hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Button variant="outline" size="sm" onClick={() => handleOpenModal()} className="w-full text-xs gap-1.5">
          <Plus className="w-3 h-3" /> Cadastrar Nova Empresa
        </Button>
      </motion.div>

      {/* Competência Selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[hsl(var(--blue)/0.1)] border border-[hsl(var(--blue)/0.25)]">
            <Calendar className="w-4 h-4 text-[hsl(var(--blue))]" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Competência</h3>
            <p className="text-[10px] text-muted-foreground">Mês/ano de referência das notas fiscais</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Confirm */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Button
          onClick={handleConfirm}
          disabled={!selectedEmpresa}
          className="w-full text-background hover:opacity-90 h-11 text-sm gap-2"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor.replace(")", " / 0.8)")})` }}
        >
          Continuar
          <ChevronRight className="w-4 h-4" />
        </Button>
        {!selectedEmpresa && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">Selecione uma empresa para continuar</p>
        )}
      </motion.div>

      {/* Modal Nova/Editar Empresa */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {editingEmpresa ? "Editar Empresa" : "Nova Empresa"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <div className="relative">
                <Input
                  value={formData.cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  maxLength={18}
                  className={cn(
                    cnpjValidado === true && "border-green-500",
                    cnpjValidado === false && "border-destructive"
                  )}
                />
                {buscandoCnpj && <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />}
              </div>
              {cnpjValidado === false && <p className="text-xs text-destructive">CNPJ inválido</p>}
            </div>

            <div className="space-y-2">
              <Label>Razão Social *</Label>
              <Input value={formData.nome} onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Empresa ABC Ltda" />
            </div>

            <div className="space-y-2">
              <Label>Código *</Label>
              <Input value={formData.codigo_empresa} onChange={(e) => setFormData(p => ({ ...p, codigo_empresa: e.target.value.toUpperCase().replace(/\s/g, "") }))} placeholder="ABC001" className="uppercase" />
            </div>

            <div className="space-y-2">
              <Label>Regime Tributário</Label>
              <Select value={formData.regime_tributario} onValueChange={(v) => setFormData(p => ({ ...p, regime_tributario: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o regime..." />
                </SelectTrigger>
                <SelectContent>
                  {REGIMES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Importante para validação de retenções — Simples Nacional/MEI dispensa impostos federais</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}><X className="w-4 h-4 mr-2" />Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.nome || !formData.codigo_empresa || createEmpresa.isPending || updateEmpresa.isPending}>
              <Check className="w-4 h-4 mr-2" />{editingEmpresa ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
