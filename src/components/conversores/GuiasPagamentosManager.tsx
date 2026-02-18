import { useState, useMemo, useRef, useCallback } from "react";
import { CreditCard, Plus, Trash2, Upload, Download, Search, Building2, SearchCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useGuiasPagamentos } from "@/hooks/useGuiasPagamentos";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCnpj, cleanCnpj, isValidCnpj, fetchCnpjData } from "@/utils/cnpjUtils";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const columns = [
  { key: "numero_nota", label: "Número Nota", width: "w-28" },
  { key: "valor_guia", label: "Valor Guia", width: "w-32", type: "currency" as const },
  { key: "data_nota", label: "Data da Nota", width: "w-28", type: "date" as const },
  { key: "data_pagamento", label: "Data Pagamento", width: "w-28", type: "date" as const },
  { key: "numero_doc_pagamento", label: "Número Doc Pag.", width: "w-32" },
  { key: "codigo_barras", label: "Código Barras", width: "w-64" },
  { key: "produto", label: "Produto", width: "w-36" },
  { key: "credito_icms_proprio", label: "Crédito ICMS Próprio", width: "w-36" },
  { key: "credito_icms_st", label: "Crédito ICMS-ST", width: "w-36" },
];

const ROWS_PER_PAGE = 100;

export function GuiasPagamentosManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Empresa selector (same pattern as NotasEntradaSTManager)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(() => {
    return localStorage.getItem("guiasPag_empresaId") || null;
  });
  const [showNewEmpresaDialog, setShowNewEmpresaDialog] = useState(false);
  const [newEmpresaForm, setNewEmpresaForm] = useState({ nome: "", cnpj: "" });
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-conversores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome, cnpj")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const empresaAtiva = useMemo(() => {
    if (selectedEmpresaId) {
      const found = empresas.find((e) => e.id === selectedEmpresaId);
      if (found) return found;
    }
    if (empresas.length > 0) return empresas[0];
    return null;
  }, [empresas, selectedEmpresaId]);

  const handleSelectEmpresa = (id: string) => {
    setSelectedEmpresaId(id);
    localStorage.setItem("guiasPag_empresaId", id);
  };

  const createEmpresa = useMutation({
    mutationFn: async (data: { nome: string; cnpj: string }) => {
      const { data: result, error } = await supabase
        .from("empresas")
        .insert({ nome: data.nome, cnpj: data.cnpj || null })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["empresas-conversores"] });
      handleSelectEmpresa(data.id);
      setShowNewEmpresaDialog(false);
      setNewEmpresaForm({ nome: "", cnpj: "" });
      toast.success("Empresa cadastrada com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao cadastrar empresa: " + err.message);
    },
  });

  const handleCnpjChange = (value: string) => {
    const formatted = formatCnpj(value);
    setNewEmpresaForm((p) => ({ ...p, cnpj: formatted }));
  };

  const handleBuscarCnpj = async () => {
    const cnpj = cleanCnpj(newEmpresaForm.cnpj);
    if (!isValidCnpj(cnpj)) {
      toast.error("CNPJ inválido");
      return;
    }
    setBuscandoCnpj(true);
    try {
      const data = await fetchCnpjData(cnpj);
      if (data) {
        setNewEmpresaForm((p) => ({
          ...p,
          nome: data.razao_social || data.nome_fantasia || p.nome,
        }));
        toast.success("Dados do CNPJ carregados");
      }
    } catch {
      toast.error("Erro ao buscar CNPJ");
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const { guias, isLoading, deleteGuia } = useGuiasPagamentos(empresaAtiva?.id);
  const [search, setSearch] = useState("");

  // Drag-to-scroll
  const useDragScroll = () => {
    const ref = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      isDragging.current = true;
      startX.current = e.pageX - el.offsetLeft;
      scrollLeft.current = el.scrollLeft;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const el = ref.current;
      if (!el) return;
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft.current - (x - startX.current);
    }, []);

    const onMouseUp = useCallback(() => {
      isDragging.current = false;
      const el = ref.current;
      if (el) {
        el.style.cursor = "grab";
        el.style.userSelect = "";
      }
    }, []);

    return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp };
  };

  const scrollProps = useDragScroll();

  const filtered = useMemo(() => {
    if (!search) return guias;
    const s = search.toLowerCase();
    return guias.filter(
      (g) =>
        g.numero_nota.toLowerCase().includes(s) ||
        (g.produto && g.produto.toLowerCase().includes(s)) ||
        (g.numero_doc_pagamento && g.numero_doc_pagamento.toLowerCase().includes(s))
    );
  }, [guias, search]);

  const formatCell = (guia: any, col: typeof columns[0]) => {
    const val = guia[col.key];
    if (val == null || val === "") return "-";
    if (col.type === "currency") return formatCurrency(Number(val));
    if (col.type === "date") {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("pt-BR");
        }
      } catch {}
      return String(val);
    }
    return String(val);
  };

  // Totals
  const totals = useMemo(() => {
    return {
      count: guias.length,
      valor_total: guias.reduce((acc, g) => acc + (Number(g.valor_guia) || 0), 0),
    };
  }, [guias]);

  const renderNewEmpresaDialog = () => (
    <Dialog open={showNewEmpresaDialog} onOpenChange={(open) => {
      setShowNewEmpresaDialog(open);
      if (!open) setNewEmpresaForm({ nome: "", cnpj: "" });
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Nova Empresa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <div className="flex gap-2">
              <Input
                value={newEmpresaForm.cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                placeholder="00.000.000/0001-00"
                maxLength={18}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBuscarCnpj}
                disabled={buscandoCnpj || cleanCnpj(newEmpresaForm.cnpj).length < 14}
                title="Buscar CNPJ na Receita Federal"
              >
                {buscandoCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchCheck className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nome da Empresa *</Label>
            <Input
              value={newEmpresaForm.nome}
              onChange={(e) => setNewEmpresaForm((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Razão Social ou Nome Fantasia"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewEmpresaDialog(false)}>Cancelar</Button>
          <Button
            onClick={() => createEmpresa.mutate(newEmpresaForm)}
            disabled={!newEmpresaForm.nome || createEmpresa.isPending}
          >
            {createEmpresa.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!empresaAtiva) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-4">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Nenhuma empresa cadastrada.</p>
        <Button onClick={() => setShowNewEmpresaDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Cadastrar Empresa
        </Button>
        {renderNewEmpresaDialog()}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {renderNewEmpresaDialog()}

      {/* Empresa Selector */}
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={empresaAtiva.id} onValueChange={handleSelectEmpresa}>
          <SelectTrigger className="w-60 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome} {e.cnpj ? `(${e.cnpj})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setShowNewEmpresaDialog(true)}>
          <Plus className="w-3.5 h-3.5" /> Nova
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--blue))] to-[hsl(var(--blue))/0.6] flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-background" />
          </div>
          <div>
            <h3 className="font-bold text-base">Guias Pagamentos</h3>
            <p className="text-[11px] text-muted-foreground">
              {guias.length} guia{guias.length !== 1 ? "s" : ""} cadastrada{guias.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar nota, produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-48"
            />
          </div>

          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" disabled />
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
              <span>
                <Upload className="w-3.5 h-3.5" /> Importar XLSX
              </span>
            </Button>
          </label>

          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={guias.length === 0}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="flex gap-3 flex-wrap">
        <div className="glass rounded-lg px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Total Guias</p>
          <p className="text-sm font-bold">{totals.count}</p>
        </div>
        <div className="glass rounded-lg px-3 py-2 border-[hsl(var(--blue))/0.3]">
          <p className="text-[10px] text-muted-foreground">Valor Total</p>
          <p className="text-sm font-bold text-[hsl(var(--blue))]">{formatCurrency(totals.valor_total)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div
          ref={scrollProps.ref}
          onMouseDown={scrollProps.onMouseDown}
          onMouseMove={scrollProps.onMouseMove}
          onMouseUp={scrollProps.onMouseUp}
          onMouseLeave={scrollProps.onMouseLeave}
          className="overflow-x-auto cursor-grab scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
        >
          <div className="min-w-[1400px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8 text-[10px] px-2">#</TableHead>
                  {columns.map((col) => (
                    <TableHead key={col.key} className={`text-[10px] px-2 whitespace-nowrap ${col.width}`}>
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-8 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="text-center text-xs text-muted-foreground py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="text-center text-xs text-muted-foreground py-8">
                      {search ? "Nenhuma guia encontrada para o filtro" : "Nenhuma guia cadastrada. Importe uma planilha ou adicione manualmente."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((guia, idx) => (
                    <TableRow key={guia.id} className={`transition-all duration-150 ${idx % 2 === 0 ? "bg-muted/20" : ""} hover:bg-primary/10 hover:shadow-[inset_3px_0_0_hsl(var(--primary))] hover:scale-[1.002]`}>
                      <TableCell className="text-[10px] text-muted-foreground px-2 font-mono">
                        {idx + 1}
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={`text-[11px] px-2 whitespace-nowrap ${
                            col.type === "currency" ? "text-right font-mono" : ""
                          }`}
                        >
                          {formatCell(guia, col)}
                        </TableCell>
                      ))}
                      <TableCell className="px-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteGuia.mutate(guia.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
