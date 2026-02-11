import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, AlertTriangle, Pencil } from "lucide-react";
import type { ApaeResultado, ApaePlanoContas } from "@/hooks/useApaeSessoes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  resultado: ApaeResultado;
  lote: number;
  codigoEmpresa: string;
  planoContas: ApaePlanoContas[];
  bancos: ApaePlanoContas[];
  onUpdateDebito: (id: string, codigo: string) => void;
  onUpdateCredito: (id: string, codigo: string) => void;
}

export function LancamentoCard({ resultado, lote, codigoEmpresa, planoContas, bancos, onUpdateDebito, onUpdateCredito }: Props) {
  const r = resultado;
  const isOk = r.conta_debito_codigo && r.conta_credito_codigo;

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${isOk ? "border-border bg-card" : "border-destructive/40 bg-destructive/5"}`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isOk ? (
            <Check className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          )}
          <span className="text-xs font-mono text-muted-foreground">Lote {lote}</span>
          <Badge variant="secondary" className="text-[10px]">{r.data_pagto || "—"}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono">{r.valor || "—"}</Badge>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{codigoEmpresa}</span>
      </div>

      {/* Fornecedor + Histórico */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{r.fornecedor || "—"}</span>
        </p>
        <p className="text-[11px] text-muted-foreground break-words leading-relaxed">
          {r.historico_concatenado}
        </p>
      </div>

      {/* Conta Débito + Conta Crédito side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Conta Débito</Label>
          {r.conta_debito_codigo ? (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-primary/10 border border-primary/20">
              <Check className="w-3 h-3 text-primary shrink-0" />
              <span className="text-xs font-mono">{r.conta_debito_codigo}</span>
            </div>
          ) : (
            <Select onValueChange={(val) => onUpdateDebito(r.id, val)}>
              <SelectTrigger className="h-8 text-xs border-destructive/40">
                <SelectValue placeholder="Selecionar conta..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {planoContas.map((c) => (
                  <SelectItem key={c.id} value={c.codigo} className="text-xs">
                    {c.codigo} — {c.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Conta Crédito</Label>
          {r.conta_credito_codigo ? (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-primary/10 border border-primary/20">
              <Check className="w-3 h-3 text-primary shrink-0" />
              <span className="text-xs font-mono">{r.conta_credito_codigo}</span>
            </div>
          ) : (
            <Select onValueChange={(val) => onUpdateCredito(r.id, val)}>
              <SelectTrigger className="h-8 text-xs border-destructive/40">
                <SelectValue placeholder="Selecionar banco..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {bancos.map((c) => (
                  <SelectItem key={c.id} value={c.codigo} className="text-xs">
                    {c.codigo} — {c.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}
