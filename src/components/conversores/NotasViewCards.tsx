import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, Trash2, ChevronDown } from "lucide-react";
import type { NotaEntradaST } from "@/hooks/useNotasEntradaST";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatPct = (v: number) =>
  `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v * 100)}%`;

const formatDateBR = (val: any): string => {
  if (!val) return "";
  const s = String(val);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.substring(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
};

const parseDateBR = (s: string): string | null => {
  if (!s) return null;
  const match = s.trim().match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s.trim())) return s.trim().substring(0, 10);
  return s.trim() || null;
};

const parseBRLNumber = (s: string): number => {
  if (!s) return 0;
  const cleaned = s.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".").trim();
  return parseFloat(cleaned) || 0;
};

interface NotasViewCardsProps {
  notas: NotaEntradaST[];
  onUpdate: (data: any) => void;
  onDelete: (id: string) => void;
}

const primaryFields = [
  { key: "nfe", label: "NF-e" },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "competencia", label: "Comp.", type: "date" },
  { key: "valor_total", label: "Valor Total", type: "currency" },
  { key: "total_st", label: "Total ST", type: "currency" },
];

const secondaryFields = [
  { key: "ncm", label: "NCM" },
  { key: "quantidade", label: "QTD", type: "number" },
  { key: "valor_produto", label: "Valor Produto", type: "currency" },
  { key: "ipi", label: "IPI", type: "currency" },
  { key: "frete", label: "Frete", type: "currency" },
  { key: "desconto", label: "Desconto", type: "currency" },
  { key: "pct_mva", label: "% MVA", type: "pct" },
  { key: "pct_icms_interno", label: "% ICMS Int.", type: "pct" },
  { key: "pct_fecp", label: "% FECP", type: "pct" },
  { key: "pct_icms_interestadual", label: "% ICMS Interest.", type: "pct" },
  { key: "bc_icms_st", label: "BC ICMS ST", type: "currency" },
  { key: "valor_icms_nf", label: "ICMS na NF", type: "currency" },
  { key: "valor_icms_st", label: "ICMS ST", type: "currency" },
  { key: "valor_fecp", label: "FECP", type: "currency" },
  { key: "valor_st_un", label: "ST UN", type: "currency" },
  { key: "data_pagamento", label: "Pagamento", type: "date" },
];

const formatField = (nota: any, field: { key: string; type?: string }) => {
  const v = nota[field.key];
  if (v == null || v === "") return "—";
  if (field.type === "currency") return formatCurrency(Number(v));
  if (field.type === "pct") return formatPct(Number(v));
  if (field.type === "number") return Number(v).toLocaleString("pt-BR");
  if (field.type === "date") return formatDateBR(v);
  return String(v);
};

/** Compact 2-line cards */
export function NotasCompactCards({ notas, onUpdate, onDelete }: NotasViewCardsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {notas.map((n) => {
        const isEditing = editingId === n.id;
        return (
          <div key={n.id} className="glass rounded-xl p-3 transition-all hover:bg-primary/5 hover:shadow-[inset_3px_0_0_hsl(var(--primary))]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs font-bold font-mono shrink-0">#{n.nfe}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{n.fornecedor}</span>
                <span className="text-sm font-semibold">{formatCurrency(n.valor_total)}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--orange))/0.3] text-[hsl(var(--orange))]">
                  ST: {formatCurrency(n.total_st)}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${isEditing ? "text-green-500" : "text-muted-foreground"}`} onClick={() => setEditingId(isEditing ? null : n.id)}>
                  {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(n.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
              <span>Comp.: {formatDateBR(n.competencia) || "—"}</span>
              <span>NCM: {n.ncm || "—"}</span>
              <span>QTD: {Number(n.quantidade).toLocaleString("pt-BR")}</span>
              <span>Val. Prod.: {formatCurrency(n.valor_produto)}</span>
              <span>IPI: {formatCurrency(n.ipi)}</span>
              <span>Frete: {formatCurrency(n.frete)}</span>
              <span>Desc.: {formatCurrency(n.desconto)}</span>
              <span>MVA: {formatPct(n.pct_mva)}</span>
              <span>ICMS Int.: {formatPct(n.pct_icms_interno)}</span>
              <span>FECP%: {formatPct(n.pct_fecp)}</span>
              <span>ICMS Inter.: {formatPct(n.pct_icms_interestadual)}</span>
              <span>BC ST: {formatCurrency(n.bc_icms_st)}</span>
              <span>ICMS NF: {formatCurrency(n.valor_icms_nf)}</span>
              <span>ICMS ST: {formatCurrency(n.valor_icms_st)}</span>
              <span>FECP: {formatCurrency(n.valor_fecp)}</span>
              <span>ST UN: {formatCurrency(n.valor_st_un)}</span>
              <span>Pag.: {formatDateBR(n.data_pagamento) || "—"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Accordion view */
export function NotasAccordionCards({ notas, onUpdate, onDelete }: NotasViewCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {notas.map((n) => {
        const expanded = expandedId === n.id;
        const isEditing = editingId === n.id;
        return (
          <div key={n.id} className="glass rounded-xl overflow-hidden transition-all">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-primary/5 transition-colors"
              onClick={() => setExpandedId(expanded ? null : n.id)}
            >
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
              <span className="text-xs font-bold font-mono">#{n.nfe}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">{n.fornecedor}</span>
              <span className="text-sm font-semibold">{formatCurrency(n.valor_total)}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--orange))/0.3] text-[hsl(var(--orange))]">
                ST: {formatCurrency(n.total_st)}
              </Badge>
              <span className="text-[11px] text-muted-foreground ml-auto">{formatDateBR(n.competencia) || "—"}</span>
            </button>

            {expanded && (
              <div className="px-3 pb-3 pt-1 border-t border-border/20">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {secondaryFields.map((field) => (
                    <div key={field.key}>
                      <p className="text-[10px] text-muted-foreground mb-0.5">{field.label}</p>
                      {isEditing ? (
                        <Input
                          className="h-6 text-[11px] px-1.5 border-dashed bg-transparent"
                          defaultValue={
                            field.type === "date" ? formatDateBR((n as any)[field.key])
                            : field.type === "currency" ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number((n as any)[field.key]) || 0)
                            : field.type === "pct" ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number((n as any)[field.key]) * 100 || 0)
                            : String((n as any)[field.key] ?? "")
                          }
                          placeholder={field.type === "date" ? "dd/mm/aaaa" : "—"}
                          onBlur={(e) => {
                            const raw = e.target.value;
                            let newVal: any = raw || null;
                            if (raw && field.type === "currency") newVal = parseBRLNumber(raw);
                            else if (raw && field.type === "pct") newVal = parseFloat(raw.replace(",", ".")) / 100;
                            else if (raw && field.type === "number") newVal = parseFloat(raw.replace(",", "."));
                            else if (raw && field.type === "date") newVal = parseDateBR(raw);
                            const oldVal = (n as any)[field.key];
                            if (newVal !== oldVal && !(newVal == null && oldVal == null)) onUpdate({ id: n.id, [field.key]: newVal });
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        />
                      ) : (
                        <p className="text-xs font-medium">{formatField(n, field)}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 mt-2 justify-end">
                  <Button variant="ghost" size="sm" className={`h-6 text-xs gap-1 ${isEditing ? "text-green-500" : "text-muted-foreground"}`} onClick={() => setEditingId(isEditing ? null : n.id)}>
                    {isEditing ? <><Check className="w-3 h-3" /> Confirmar</> : <><Pencil className="w-3 h-3" /> Editar</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-destructive" onClick={() => onDelete(n.id)}>
                    <Trash2 className="w-3 h-3" /> Excluir
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Grid cards */
export function NotasGridCards({ notas, onUpdate, onDelete }: NotasViewCardsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {notas.map((n) => {
        const isEditing = editingId === n.id;
        return (
          <div key={n.id} className="glass rounded-xl p-3 flex flex-col gap-2 transition-all hover:bg-primary/5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono">#{n.nfe}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--orange))/0.3] text-[hsl(var(--orange))]">
                  ST: {formatCurrency(n.total_st)}
                </Badge>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${isEditing ? "text-green-500" : "text-muted-foreground"}`} onClick={() => setEditingId(isEditing ? null : n.id)}>
                  {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(n.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground truncate">{n.fornecedor}</p>
            <p className="text-lg font-bold">{formatCurrency(n.valor_total)}</p>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              {[
                { label: "Comp.", key: "competencia", type: "date" },
                { label: "NCM", key: "ncm" },
                { label: "QTD", key: "quantidade", type: "number" },
                { label: "Valor Prod.", key: "valor_produto", type: "currency" },
                { label: "IPI", key: "ipi", type: "currency" },
                { label: "Frete", key: "frete", type: "currency" },
                { label: "Desconto", key: "desconto", type: "currency" },
                { label: "% MVA", key: "pct_mva", type: "pct" },
                { label: "% ICMS Int.", key: "pct_icms_interno", type: "pct" },
                { label: "% FECP", key: "pct_fecp", type: "pct" },
                { label: "% ICMS Inter.", key: "pct_icms_interestadual", type: "pct" },
                { label: "BC ICMS ST", key: "bc_icms_st", type: "currency" },
                { label: "ICMS NF", key: "valor_icms_nf", type: "currency" },
                { label: "ICMS ST", key: "valor_icms_st", type: "currency" },
                { label: "FECP", key: "valor_fecp", type: "currency" },
                { label: "ST UN", key: "valor_st_un", type: "currency" },
                { label: "Pagamento", key: "data_pagamento", type: "date" },
              ].map((field) => (
                <div key={field.key}>
                  <span className="text-muted-foreground">{field.label}</span>
                  <p className="font-medium">{formatField(n, field)}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
