import { memo, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ApaeResultado } from "@/hooks/useApaeSessoes";

interface ContaOption {
  codigo: string;
  descricao: string;
}

interface Props {
  resultado: ApaeResultado;
  lote: number;
  codigoEmpresa: string;
  planoOptions: ContaOption[];
  bancoOptions: ContaOption[];
  onUpdateDebito: (id: string, codigo: string) => void;
  onUpdateCredito: (id: string, codigo: string) => void;
}

/** Lightweight inline search-select that only renders options when open */
function InlineContaSelector({ options, placeholder, onSelect }: {
  options: ContaOption[];
  placeholder: string;
  onSelect: (codigo: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full text-xs border-destructive/40 text-destructive justify-start"
        onClick={() => setOpen(true)}
      >
        <Search className="w-3 h-3 mr-1 shrink-0" />
        {placeholder}
      </Button>
    );
  }

  const filtered = search.trim()
    ? options.filter((o) => {
        const term = search.toLowerCase();
        return o.codigo.toLowerCase().includes(term) || o.descricao.toLowerCase().includes(term);
      }).slice(0, 30)
    : options.slice(0, 30);

  return (
    <div className="border border-border rounded-md bg-popover shadow-md">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
        <Search className="w-3 h-3 text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="flex-1 text-xs bg-transparent outline-none h-6"
        />
        <button onClick={() => { setOpen(false); setSearch(""); }} className="text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </button>
      </div>
      <ScrollArea className="max-h-40">
        <div className="py-0.5">
          {filtered.length === 0 && (
            <p className="text-[10px] text-muted-foreground px-2 py-1">Nenhum resultado</p>
          )}
          {filtered.map((o) => (
            <button
              key={o.codigo}
              onClick={() => { onSelect(o.codigo); setOpen(false); setSearch(""); }}
              className="w-full text-left px-2 py-1 text-xs hover:bg-accent truncate"
            >
              <span className="font-mono">{o.codigo}</span>
              <span className="text-muted-foreground"> — {o.descricao}</span>
            </button>
          ))}
          {filtered.length === 30 && (
            <p className="text-[10px] text-muted-foreground px-2 py-1 italic">Refine a busca para ver mais...</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export const LancamentoCard = memo(function LancamentoCard({
  resultado: r,
  lote,
  codigoEmpresa,
  planoOptions,
  bancoOptions,
  onUpdateDebito,
  onUpdateCredito,
}: Props) {
  const isOk = r.conta_debito_codigo && r.conta_credito_codigo;

  return (
    <div className={`rounded-md border p-2.5 space-y-1.5 ${isOk ? "border-border bg-card" : "border-destructive/40 bg-destructive/5"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {isOk ? <Check className="w-3.5 h-3.5 text-primary shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
          <span className="text-[10px] font-mono text-muted-foreground">#{lote}</span>
          <span className="text-[10px] text-muted-foreground">{r.data_pagto || "—"}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{r.valor || "—"}</span>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground">{codigoEmpresa}</span>
      </div>

      <p className="text-xs font-medium leading-tight">{r.fornecedor || "—"}</p>
      <p className="text-[10px] text-muted-foreground break-words leading-relaxed">{r.historico_concatenado}</p>

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Débito</span>
          {r.conta_debito_codigo ? (
            <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-primary/10 border border-primary/20">
              <Check className="w-3 h-3 text-primary shrink-0" />
              <span className="text-[11px] font-mono">{r.conta_debito_codigo}</span>
            </div>
          ) : (
            <InlineContaSelector
              options={planoOptions}
              placeholder="Selecionar..."
              onSelect={(codigo) => onUpdateDebito(r.id, codigo)}
            />
          )}
        </div>
        <div>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Crédito</span>
          {r.conta_credito_codigo ? (
            <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-primary/10 border border-primary/20">
              <Check className="w-3 h-3 text-primary shrink-0" />
              <span className="text-[11px] font-mono">{r.conta_credito_codigo}</span>
            </div>
          ) : (
            <InlineContaSelector
              options={bancoOptions}
              placeholder="Selecionar..."
              onSelect={(codigo) => onUpdateCredito(r.id, codigo)}
            />
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.resultado === next.resultado &&
    prev.lote === next.lote &&
    prev.codigoEmpresa === next.codigoEmpresa &&
    prev.planoOptions === next.planoOptions &&
    prev.bancoOptions === next.bancoOptions
  );
});
