import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { CreditCard, Trash2, Upload, Download, Search, RefreshCw, Pencil, Check, FileSpreadsheet } from "lucide-react";
import { readExcelFile, normalizeKey } from "@/utils/fileParserUtils";
import { ViewModeSelector, type ViewMode } from "./ViewModeSelector";
import { GuiasCompactCards, GuiasAccordionCards, GuiasGridCards } from "./GuiasViewCards";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useGuiasPagamentos, type GuiaStatus } from "@/hooks/useGuiasPagamentos";
import { useNotasEntradaST } from "@/hooks/useNotasEntradaST";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/** Format ISO/DB date string to dd/mm/yyyy */
const formatDateBR = (val: any): string => {
  if (!val) return "";
  const s = String(val);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.substring(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  try {
    const dt = new Date(s + (s.length === 10 ? "T12:00:00" : ""));
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString("pt-BR");
  } catch {}
  return s;
};

/** Parse dd/mm/yyyy to yyyy-mm-dd for DB storage */
const parseDateBR = (s: string): string | null => {
  if (!s) return null;
  const trimmed = s.trim();
  const match = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);
  return trimmed || null;
};

const STATUS_OPTIONS: { value: GuiaStatus; label: string; color: string }[] = [
  { value: "PAGO", label: "Pago", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "NAO PAGO", label: "Não Pago", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "UTILIZADO", label: "Utilizado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "NAO UTILIZAVEL", label: "Não Utilizável", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "VENDA INTERNA", label: "Venda Interna", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
];

const getStatusOption = (status: string | null) =>
  STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[1]; // default NAO PAGO

const columns = [
  { key: "numero_nota", label: "Número Nota", width: "w-28" },
  { key: "valor_guia", label: "Valor Guia", width: "w-32", type: "currency" as const },
  { key: "data_nota", label: "Data da Nota", width: "w-28", type: "date" as const },
  { key: "data_pagamento", label: "Data Pagamento", width: "w-28", type: "date" as const, editable: true },
  { key: "numero_doc_pagamento", label: "Número Doc Pag.", width: "w-32", editable: true },
  { key: "codigo_barras", label: "Código Barras", width: "w-64", editable: true },
  { key: "produto", label: "Produto", width: "w-36", editable: true },
  { key: "credito_icms_proprio", label: "Crédito ICMS Próprio", width: "w-36", type: "currency" as const },
  { key: "credito_icms_st", label: "Crédito ICMS-ST", width: "w-36", type: "currency" as const },
  { key: "status", label: "Status", width: "w-36", type: "status" as const, editable: true },
];

interface GuiasPagamentosManagerProps {
  empresaId?: string;
}

export function GuiasPagamentosManager({ empresaId }: GuiasPagamentosManagerProps) {
  const { guias, isLoading, deleteGuia, updateGuia, addMany } = useGuiasPagamentos(empresaId);
  const { notas, isLoading: isLoadingNotas } = useNotasEntradaST(empresaId);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

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
      const existingGuiasMap = new Map(guias.map((g) => [g.numero_nota, g]));
      const newNotas: typeof notas = [];
      const updatedCount = { value: 0 };

      for (const n of notas) {
        const existing = existingGuiasMap.get(n.nfe);
        if (!existing) {
          newNotas.push(n);
        } else {
          // Update existing guia with latest data from nota
          const updates: Record<string, any> = {};
          const newValorGuia = n.total_st || 0;
          const newDataNota = n.competencia || null;
          const newDataPagamento = n.data_pagamento || null;
          const newCreditoIcmsProprio = n.valor_icms_nf != null ? String(n.valor_icms_nf) : null;
          const newCreditoIcmsSt = n.total_st != null ? String(n.total_st) : null;

          if (Number(existing.valor_guia) !== newValorGuia) updates.valor_guia = newValorGuia;
          if (existing.data_nota !== newDataNota) updates.data_nota = newDataNota;
          if (existing.data_pagamento !== newDataPagamento) updates.data_pagamento = newDataPagamento;
          if (existing.credito_icms_proprio !== newCreditoIcmsProprio) updates.credito_icms_proprio = newCreditoIcmsProprio;
          if (existing.credito_icms_st !== newCreditoIcmsSt) updates.credito_icms_st = newCreditoIcmsSt;

          if (Object.keys(updates).length > 0) {
            await updateGuia.mutateAsync({ id: existing.id, ...updates } as any);
            updatedCount.value++;
          }
        }
      }

      // Insert new guias
      if (newNotas.length > 0) {
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
          status: "NAO PAGO" as GuiaStatus,
        }));
        await addMany.mutateAsync(guiasToInsert);
      }

      if (newNotas.length === 0 && updatedCount.value === 0) {
        toast({ title: "Tudo sincronizado", description: "Nenhuma alteração detectada nas Notas." });
      } else {
        const parts: string[] = [];
        if (newNotas.length > 0) parts.push(`${newNotas.length} nova(s)`);
        if (updatedCount.value > 0) parts.push(`${updatedCount.value} atualizada(s)`);
        toast({ title: `Sincronização concluída`, description: `Guias: ${parts.join(", ")}.` });
      }
    } catch (err: any) {
      toast({ title: "Erro ao sincronizar", description: err.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  // Import XLSM/XLSX to fill missing fields only
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaId) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    setIsImporting(true);
    try {
      const rows = await readExcelFile(file);
      if (rows.length < 2) {
        toast({ title: "Arquivo vazio", description: "Nenhuma linha de dados encontrada.", variant: "destructive" });
        return;
      }

      // Detect header row
      const headerRow = rows[0].map(normalizeKey);
      
      // Map known column names to DB fields
      const fieldMap: Record<string, { dbKey: string; transform?: (v: string) => any }> = {
        "numeronota": { dbKey: "numero_nota" },
        "nfe": { dbKey: "numero_nota" },
        "nota": { dbKey: "numero_nota" },
        "valorguia": { dbKey: "valor_guia", transform: (v) => parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0 },
        "valor": { dbKey: "valor_guia", transform: (v) => parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0 },
        "datanota": { dbKey: "data_nota", transform: (v) => parseDateBR(v) },
        "datapagamento": { dbKey: "data_pagamento", transform: (v) => parseDateBR(v) },
        "numerodocpagamento": { dbKey: "numero_doc_pagamento" },
        "docpagamento": { dbKey: "numero_doc_pagamento" },
        "codigobarras": { dbKey: "codigo_barras" },
        "codbarras": { dbKey: "codigo_barras" },
        "produto": { dbKey: "produto" },
        "creditoicmsproprio": { dbKey: "credito_icms_proprio" },
        "icmsproprio": { dbKey: "credito_icms_proprio" },
        "creditoicmsst": { dbKey: "credito_icms_st" },
        "icmsst": { dbKey: "credito_icms_st" },
        "status": { dbKey: "status" },
        "observacoes": { dbKey: "observacoes" },
      };

      // Find column indices
      const colMapping: { idx: number; dbKey: string; transform?: (v: string) => any }[] = [];
      let notaIdx = -1;

      headerRow.forEach((h, i) => {
        const mapping = fieldMap[h];
        if (mapping) {
          colMapping.push({ idx: i, dbKey: mapping.dbKey, transform: mapping.transform });
          if (mapping.dbKey === "numero_nota") notaIdx = i;
        }
      });

      if (notaIdx === -1) {
        toast({ title: "Coluna de nota não encontrada", description: "O arquivo precisa ter uma coluna 'Número Nota', 'NFE' ou 'Nota'.", variant: "destructive" });
        return;
      }

      // Build a map of existing guias by numero_nota
      const guiasMap = new Map(guias.map((g) => [g.numero_nota.trim(), g]));

      let updatedCount = 0;
      let skippedCount = 0;

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const notaValue = String(row[notaIdx] ?? "").trim();
        if (!notaValue) continue;

        const existing = guiasMap.get(notaValue);
        if (!existing) {
          skippedCount++;
          continue;
        }

        // Build updates only for fields that are currently null/empty
        const updates: Record<string, any> = {};
        for (const col of colMapping) {
          if (col.dbKey === "numero_nota") continue; // skip key field
          const cellValue = String(row[col.idx] ?? "").trim();
          if (!cellValue) continue; // nothing to fill

          const currentVal = (existing as any)[col.dbKey];
          const isEmpty = currentVal == null || String(currentVal).trim() === "" || String(currentVal).trim() === "0";
          if (!isEmpty) continue; // field already has data

          updates[col.dbKey] = col.transform ? col.transform(cellValue) : cellValue;
        }

        if (Object.keys(updates).length > 0) {
          await updateGuia.mutateAsync({ id: existing.id, ...updates } as any);
          updatedCount++;
        }
      }

      const parts: string[] = [];
      if (updatedCount > 0) parts.push(`${updatedCount} guia(s) atualizada(s)`);
      if (skippedCount > 0) parts.push(`${skippedCount} nota(s) não encontrada(s)`);
      toast({ title: "Importação concluída", description: parts.join(", ") || "Nenhum campo faltante para preencher." });
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
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
    if (col.type === "date") return formatDateBR(val);
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
          <ViewModeSelector value={viewMode} onChange={setViewMode} />

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar nota, produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-48"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm"
            className="hidden"
            onChange={handleImportXlsx}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <Upload className="w-3.5 h-3.5" />
            {isImporting ? "Importando..." : "Importar XLSX"}
          </Button>

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

      {viewMode === "cards" ? (
        <GuiasCompactCards guias={filtered} onUpdate={(data: any) => updateGuia.mutate(data)} onDelete={(id: string) => deleteGuia.mutate(id)} />
      ) : viewMode === "accordion" ? (
        <GuiasAccordionCards guias={filtered} onUpdate={(data: any) => updateGuia.mutate(data)} onDelete={(id: string) => deleteGuia.mutate(id)} />
      ) : viewMode === "grid" ? (
        <GuiasGridCards guias={filtered} onUpdate={(data: any) => updateGuia.mutate(data)} onDelete={(id: string) => deleteGuia.mutate(id)} />
      ) : (
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
          <div className="min-w-[1600px]">
            <Table wrapperClassName="overflow-visible">
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
                  filtered.map((guia, idx) => {
                    const isEditing = editingRowId === guia.id;
                    return (
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
                          {isEditing && (col as any).editable ? (
                            col.type === "status" ? (
                              <Select
                                defaultValue={guia[col.key] || "NAO PAGO"}
                                onValueChange={(val) => {
                                  updateGuia.mutate({ id: guia.id, status: val } as any);
                                }}
                              >
                                <SelectTrigger className="h-6 text-[11px] min-w-[120px] border-dashed border-muted-foreground/30 bg-transparent">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-[11px]">
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : col.type === "date" ? (
                              <Input
                                className="h-6 text-[11px] px-1.5 border-dashed border-muted-foreground/30 bg-transparent focus:bg-background min-w-[90px]"
                                defaultValue={formatDateBR(guia[col.key])}
                                placeholder="dd/mm/aaaa"
                                onBlur={(e) => {
                                  const newVal = parseDateBR(e.target.value);
                                  if (newVal !== (guia[col.key] ?? null)) {
                                    updateGuia.mutate({ id: guia.id, [col.key]: newVal } as any);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                }}
                              />
                            ) : (
                              <Input
                                className="h-6 text-[11px] px-1.5 border-dashed border-muted-foreground/30 bg-transparent focus:bg-background min-w-[80px]"
                                defaultValue={guia[col.key] ?? ""}
                                placeholder="—"
                                onBlur={(e) => {
                                  const newVal = e.target.value || null;
                                  if (newVal !== (guia[col.key] ?? null)) {
                                    updateGuia.mutate({ id: guia.id, [col.key]: newVal } as any);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                }}
                              />
                            )
                          ) : col.type === "status" ? (
                            (() => {
                              const opt = getStatusOption(guia[col.key]);
                              return (
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 border ${opt.color}`}>
                                  {opt.label}
                                </Badge>
                              );
                            })()
                          ) : (
                            <span>{formatCell(guia, col)}</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="px-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 w-6 p-0 ${isEditing ? "text-green-500 hover:text-green-600" : "text-muted-foreground hover:text-primary"}`}
                            onClick={() => setEditingRowId(isEditing ? null : guia.id)}
                            title={isEditing ? "Confirmar" : "Editar"}
                          >
                            {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteGuia.mutate(guia.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      )}
    </motion.div>
  );
}
