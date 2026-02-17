import { memo, useState } from "react";
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
        className="h-7 w-full text-[10px] border-destructive/30 text-destructive/80 justify-start bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/50"
        onClick={() => setOpen(true)}
      >
        <Search className="w-2.5 h-2.5 mr-1 shrink-0" />
        {placeholder}
      </Button>
    );
  }

  const filtered = search.trim()
    ? options.filter((o) => {
        const term = search.toLowerCase();
        return o.codigo.toLowerCase().includes(term) || o.descricao.toLowerCase().includes(term);
      }).slice(0, 80)
    : options.slice(0, 80);

  return (
    <div className="border border-[hsl(var(--cyan)/0.3)] rounded-md bg-popover shadow-lg shadow-[hsl(var(--cyan)/0.05)]">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
        <Search className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="flex-1 text-[10px] bg-transparent outline-none h-5"
        />
        <button onClick={() => { setOpen(false); setSearch(""); }} className="text-muted-foreground hover:text-foreground">
          <X className="w-2.5 h-2.5" />
        </button>
      </div>
      <ScrollArea className="max-h-36">
        <div className="py-0.5">
          {filtered.length === 0 && (
            <p className="text-[9px] text-muted-foreground px-2 py-1">Nenhum resultado</p>
          )}
          {filtered.map((o) => (
            <button
              key={o.codigo}
              onClick={() => { onSelect(o.codigo); setOpen(false); setSearch(""); }}
              className="w-full text-left px-2 py-0.5 text-[10px] hover:bg-[hsl(var(--cyan)/0.1)] truncate transition-colors"
            >
              <span className="font-mono text-[hsl(var(--cyan))]">{o.codigo}</span>
              <span className="text-muted-foreground"> — {o.descricao}</span>
            </button>
          ))}
          {filtered.length === 80 && (
            <p className="text-[9px] text-muted-foreground px-2 py-0.5 italic">Refine a busca...</p>
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
    <div className={`rounded-lg border p-2.5 space-y-1.5 transition-all duration-200 ${
      isOk
        ? "border-border/60 bg-card/50 hover:border-[hsl(var(--cyan)/0.2)]"
        : "border-destructive/25 bg-destructive/[0.03] hover:border-destructive/40"
    }`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isOk ? (
            <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="w-2.5 h-2.5 text-destructive/70" />
            </div>
          )}
          <span className="text-[10px] font-mono text-muted-foreground/70">#{lote}</span>
          <span className="text-[10px] text-muted-foreground">{r.data_pagto || "—"}</span>
          <span className="text-[10px] font-mono text-[hsl(var(--cyan)/0.8)]">{r.valor || "—"}</span>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground/50">{codigoEmpresa}</span>
      </div>

      <p className="text-[11px] font-medium leading-tight truncate">{r.fornecedor || "—"}</p>
      <p className="text-[9px] text-muted-foreground/70 break-words leading-relaxed line-clamp-2">{r.historico_concatenado}</p>

      {/* Accounts grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <span className="text-[8px] text-muted-foreground/60 uppercase tracking-widest font-medium">Débito</span>
          {r.conta_debito_codigo ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-mono text-emerald-300">{r.conta_debito_codigo}</span>
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
          <span className="text-[8px] text-muted-foreground/60 uppercase tracking-widest font-medium">Crédito</span>
          {r.conta_credito_codigo ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[hsl(var(--cyan)/0.1)] border border-[hsl(var(--cyan)/0.2)]">
              <Check className="w-2.5 h-2.5 text-[hsl(var(--cyan))] shrink-0" />
              <span className="text-[10px] font-mono text-[hsl(var(--cyan)/0.8)]">{r.conta_credito_codigo}</span>
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
