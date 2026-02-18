import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Check, Trash2, ChevronDown } from "lucide-react";
import type { GuiaPagamento, GuiaStatus } from "@/hooks/useGuiasPagamentos";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

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

const STATUS_OPTIONS: { value: GuiaStatus; label: string; color: string }[] = [
  { value: "PAGO", label: "Pago", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "NAO PAGO", label: "Não Pago", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "UTILIZADO", label: "Utilizado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "NAO UTILIZAVEL", label: "Não Utilizável", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "VENDA INTERNA", label: "Venda Interna", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
];

const getStatusOption = (status: string | null) =>
  STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[1];

interface GuiasViewCardsProps {
  guias: GuiaPagamento[];
  onUpdate: (data: any) => void;
  onDelete: (id: string) => void;
}

/** Compact 2-line card view */
export function GuiasCompactCards({ guias, onUpdate, onDelete }: GuiasViewCardsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {guias.map((g) => {
        const opt = getStatusOption(g.status);
        const isEditing = editingId === g.id;
        return (
          <div key={g.id} className="glass rounded-xl p-3 transition-all hover:bg-primary/5 hover:shadow-[inset_3px_0_0_hsl(var(--primary))]">
            <div className="flex items-center justify-between gap-3">
              {/* Line 1: Main info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs font-bold font-mono shrink-0">#{g.numero_nota}</span>
                <span className="text-sm font-semibold">{formatCurrency(Number(g.valor_guia))}</span>
                {isEditing ? (
                  <Select defaultValue={g.status || "NAO PAGO"} onValueChange={(val) => onUpdate({ id: g.id, status: val })}>
                    <SelectTrigger className="h-6 text-[11px] w-32 border-dashed"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-[11px]">{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 border ${opt.color}`}>{opt.label}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${isEditing ? "text-green-500" : "text-muted-foreground"}`} onClick={() => setEditingId(isEditing ? null : g.id)}>
                  {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(g.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            {/* Line 2: Details */}
            <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
              <span>Nota: {formatDateBR(g.data_nota) || "—"}</span>
              {isEditing ? (
                <span className="flex items-center gap-1">Pag.:
                  <Input className="h-5 text-[11px] px-1 w-24 border-dashed bg-transparent" defaultValue={formatDateBR(g.data_pagamento)} placeholder="dd/mm/aaaa"
                    onBlur={(e) => { const v = parseDateBR(e.target.value); if (v !== (g.data_pagamento ?? null)) onUpdate({ id: g.id, data_pagamento: v }); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                </span>
              ) : (
                <span>Pag.: {formatDateBR(g.data_pagamento) || "—"}</span>
              )}
              {isEditing ? (
                <span className="flex items-center gap-1">Doc:
                  <Input className="h-5 text-[11px] px-1 w-28 border-dashed bg-transparent" defaultValue={g.numero_doc_pagamento ?? ""} placeholder="—"
                    onBlur={(e) => { const v = e.target.value || null; if (v !== (g.numero_doc_pagamento ?? null)) onUpdate({ id: g.id, numero_doc_pagamento: v }); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                </span>
              ) : (
                <span>Doc: {g.numero_doc_pagamento || "—"}</span>
              )}
              {isEditing ? (
                <span className="flex items-center gap-1">Prod.:
                  <Input className="h-5 text-[11px] px-1 w-28 border-dashed bg-transparent" defaultValue={g.produto ?? ""} placeholder="—"
                    onBlur={(e) => { const v = e.target.value || null; if (v !== (g.produto ?? null)) onUpdate({ id: g.id, produto: v }); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                </span>
              ) : (
              g.produto && <span>Prod.: {g.produto}</span>
              )}
              {isEditing ? (
                <span className="flex items-center gap-1">Cód. Barras:
                  <Input className="h-5 text-[11px] px-1 w-44 border-dashed bg-transparent" defaultValue={g.codigo_barras ?? ""} placeholder="—"
                    onBlur={(e) => { const v = e.target.value || null; if (v !== (g.codigo_barras ?? null)) onUpdate({ id: g.id, codigo_barras: v }); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                </span>
              ) : (
                g.codigo_barras && <span>Cód. Barras: {g.codigo_barras}</span>
              )}
              <span>ICMS Próprio: {g.credito_icms_proprio ? formatCurrency(Number(g.credito_icms_proprio)) : "—"}</span>
              <span>ICMS-ST: {g.credito_icms_st ? formatCurrency(Number(g.credito_icms_st)) : "—"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Accordion view — compact summary, expandable details */
export function GuiasAccordionCards({ guias, onUpdate, onDelete }: GuiasViewCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {guias.map((g) => {
        const opt = getStatusOption(g.status);
        const expanded = expandedId === g.id;
        const isEditing = editingId === g.id;
        return (
          <div key={g.id} className="glass rounded-xl overflow-hidden transition-all">
            {/* Summary row */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-primary/5 transition-colors"
              onClick={() => setExpandedId(expanded ? null : g.id)}
            >
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
              <span className="text-xs font-bold font-mono">#{g.numero_nota}</span>
              <span className="text-sm font-semibold">{formatCurrency(Number(g.valor_guia))}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 border ${opt.color}`}>{opt.label}</Badge>
              <span className="text-[11px] text-muted-foreground ml-auto">{formatDateBR(g.data_nota) || "—"}</span>
            </button>

            {/* Expanded details */}
            {expanded && (
              <div className="px-3 pb-3 pt-1 border-t border-border/20">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Data Pagamento", key: "data_pagamento", type: "date" },
                    { label: "Doc. Pagamento", key: "numero_doc_pagamento", type: "text" },
                    { label: "Código Barras", key: "codigo_barras", type: "text" },
                    { label: "Produto", key: "produto", type: "text" },
                    { label: "Crédito ICMS Próprio", key: "credito_icms_proprio", type: "currency" },
                    { label: "Crédito ICMS-ST", key: "credito_icms_st", type: "currency" },
                  ].map((field) => (
                    <div key={field.key}>
                      <p className="text-[10px] text-muted-foreground mb-0.5">{field.label}</p>
                      {isEditing && field.type !== "currency" ? (
                        <Input
                          className="h-6 text-[11px] px-1.5 border-dashed bg-transparent"
                          defaultValue={field.type === "date" ? formatDateBR((g as any)[field.key]) : (g as any)[field.key] ?? ""}
                          placeholder={field.type === "date" ? "dd/mm/aaaa" : "—"}
                          onBlur={(e) => {
                            let v: any = e.target.value || null;
                            if (field.type === "date" && v) v = parseDateBR(v);
                            if (v !== ((g as any)[field.key] ?? null)) onUpdate({ id: g.id, [field.key]: v });
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        />
                      ) : (
                        <p className="text-xs font-medium">
                          {field.type === "currency" && (g as any)[field.key]
                            ? formatCurrency(Number((g as any)[field.key]))
                            : field.type === "date"
                            ? formatDateBR((g as any)[field.key]) || "—"
                            : (g as any)[field.key] || "—"}
                        </p>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Status</p>
                      <Select defaultValue={g.status || "NAO PAGO"} onValueChange={(val) => onUpdate({ id: g.id, status: val })}>
                        <SelectTrigger className="h-6 text-[11px] border-dashed"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-[11px]">{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-2 justify-end">
                  <Button variant="ghost" size="sm" className={`h-6 text-xs gap-1 ${isEditing ? "text-green-500" : "text-muted-foreground"}`} onClick={() => setEditingId(isEditing ? null : g.id)}>
                    {isEditing ? <><Check className="w-3 h-3" /> Confirmar</> : <><Pencil className="w-3 h-3" /> Editar</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-destructive" onClick={() => onDelete(g.id)}>
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

/** Grid cards grouped visually */
export function GuiasGridCards({ guias, onUpdate, onDelete }: GuiasViewCardsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {guias.map((g) => {
        const opt = getStatusOption(g.status);
        const isEditing = editingId === g.id;
        return (
          <div key={g.id} className="glass rounded-xl p-3 flex flex-col gap-2 transition-all hover:bg-primary/5 hover:shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono">#{g.numero_nota}</span>
                {isEditing ? (
                  <Select defaultValue={g.status || "NAO PAGO"} onValueChange={(val) => onUpdate({ id: g.id, status: val })}>
                    <SelectTrigger className="h-6 text-[11px] w-32 border-dashed"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-[11px]">{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 border ${opt.color}`}>{opt.label}</Badge>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${isEditing ? "text-green-500" : "text-muted-foreground"}`} onClick={() => setEditingId(isEditing ? null : g.id)}>
                  {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(g.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Value */}
            <p className="text-lg font-bold">{formatCurrency(Number(g.valor_guia))}</p>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div>
                <span className="text-muted-foreground">Data Nota</span>
                <p className="font-medium">{formatDateBR(g.data_nota) || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Pagamento</span>
                {isEditing ? (
                  <Input className="h-5 text-[11px] px-1 border-dashed bg-transparent" defaultValue={formatDateBR(g.data_pagamento)} placeholder="dd/mm/aaaa"
                    onBlur={(e) => { const v = parseDateBR(e.target.value); if (v !== (g.data_pagamento ?? null)) onUpdate({ id: g.id, data_pagamento: v }); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                ) : (
                  <p className="font-medium">{formatDateBR(g.data_pagamento) || "—"}</p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Produto</span>
                {isEditing ? (
                  <Input className="h-5 text-[11px] px-1 border-dashed bg-transparent" defaultValue={g.produto ?? ""}
                    onBlur={(e) => { const v = e.target.value || null; if (v !== (g.produto ?? null)) onUpdate({ id: g.id, produto: v }); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                ) : (
                  <p className="font-medium">{g.produto || "—"}</p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Doc Pag.</span>
                {isEditing ? (
                  <Input className="h-5 text-[11px] px-1 border-dashed bg-transparent" defaultValue={g.numero_doc_pagamento ?? ""}
                    onBlur={(e) => { const v = e.target.value || null; if (v !== (g.numero_doc_pagamento ?? null)) onUpdate({ id: g.id, numero_doc_pagamento: v }); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                ) : (
                  <p className="font-medium">{g.numero_doc_pagamento || "—"}</p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Cód. Barras</span>
                {isEditing ? (
                  <Input className="h-5 text-[11px] px-1 border-dashed bg-transparent" defaultValue={g.codigo_barras ?? ""}
                    onBlur={(e) => { const v = e.target.value || null; if (v !== (g.codigo_barras ?? null)) onUpdate({ id: g.id, codigo_barras: v }); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                ) : (
                  <p className="font-medium truncate">{g.codigo_barras || "—"}</p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">ICMS Próprio</span>
                <p className="font-medium">{g.credito_icms_proprio ? formatCurrency(Number(g.credito_icms_proprio)) : "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">ICMS-ST</span>
                <p className="font-medium">{g.credito_icms_st ? formatCurrency(Number(g.credito_icms_st)) : "—"}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
