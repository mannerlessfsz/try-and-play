import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { CreditCard, Trash2, Upload, Download, Search, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useGuiasPagamentos } from "@/hooks/useGuiasPagamentos";
import { useNotasEntradaST } from "@/hooks/useNotasEntradaST";
import { useToast } from "@/hooks/use-toast";

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

interface GuiasPagamentosManagerProps {
  empresaId?: string;
}

export function GuiasPagamentosManager({ empresaId }: GuiasPagamentosManagerProps) {
  const { guias, isLoading, deleteGuia, addMany } = useGuiasPagamentos(empresaId);
  const { notas, isLoading: isLoadingNotas } = useNotasEntradaST(empresaId);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync from Notas ST when component mounts and there are notas but no guias
  useEffect(() => {
    if (empresaId && !isLoading && !isLoadingNotas && notas.length > 0 && guias.length === 0) {
      handleSyncFromNotas();
    }
  }, [empresaId, isLoading, isLoadingNotas, notas.length, guias.length]);

  const handleSyncFromNotas = async () => {
    if (!empresaId || notas.length === 0) {
      toast({ title: "Sem notas para sincronizar", description: "Cadastre notas em 'Notas Entrada ST' primeiro.", variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    try {
      // Deduplicate: only sync notas whose nfe is not already in guias
      const existingNotas = new Set(guias.map((g) => g.numero_nota));
      const newNotas = notas.filter((n) => !existingNotas.has(n.nfe));

      if (newNotas.length === 0) {
        toast({ title: "Tudo sincronizado", description: "Todas as notas já estão em Guias Pagamentos." });
        setIsSyncing(false);
        return;
      }

      const guiasToInsert = newNotas.map((n) => ({
        empresa_id: empresaId,
        numero_nota: n.nfe,
        valor_guia: n.total_st || 0,
        data_nota: n.competencia || null,
        data_pagamento: n.data_pagamento || null,
        numero_doc_pagamento: null,
        codigo_barras: null,
        produto: null,
        credito_icms_proprio: n.valor_icms_nf != null ? String(n.valor_icms_nf) : null,
        credito_icms_st: n.total_st != null ? String(n.total_st) : null,
        observacoes: null,
      }));

      await addMany.mutateAsync(guiasToInsert);
      toast({ title: `${newNotas.length} guia(s) sincronizada(s)`, description: "Dados importados de Notas Entrada ST." });
    } catch (err: any) {
      toast({ title: "Erro ao sincronizar", description: err.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

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
        if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
      } catch {}
      return String(val);
    }
    return String(val);
  };

  const totals = useMemo(() => ({
    count: guias.length,
    valor_total: guias.reduce((acc, g) => acc + (Number(g.valor_guia) || 0), 0),
  }), [guias]);

  if (!empresaId) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-4">
        <CreditCard className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Selecione uma empresa no painel acima para continuar.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
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

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleSyncFromNotas}
            disabled={isSyncing || isLoadingNotas || !empresaId}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar de Notas ST"}
          </Button>

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
