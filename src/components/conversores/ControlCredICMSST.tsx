import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, FileText, Package, ChevronRight, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGuiasPagamentos, type GuiaPagamento } from "@/hooks/useGuiasPagamentos";
import { useNotasEntradaST } from "@/hooks/useNotasEntradaST";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  empresaId?: string;
}

type Step = "notas-utilizaveis" | "movimento-estoque";

export function ControlCredICMSST({ empresaId }: Props) {
  const [activeStep, setActiveStep] = useState<Step>("notas-utilizaveis");
  const [syncing, setSyncing] = useState(false);

  const queryClient = useQueryClient();
  const { guias, isLoading: isLoadingGuias } = useGuiasPagamentos(empresaId);
  const { notas, isLoading: isLoadingNotas } = useNotasEntradaST(empresaId);

  // Sync: re-fetch data from Guias and Notas Entrada ST
  const handleSync = useCallback(async () => {
    setSyncing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["guias_pagamentos", empresaId] }),
      queryClient.invalidateQueries({ queryKey: ["notas_entrada_st", empresaId] }),
    ]);
    setTimeout(() => {
      setSyncing(false);
      toast.success("Dados sincronizados com Guias e Notas Entrada ST");
    }, 600);
  }, [queryClient, empresaId]);

  // Only UTILIZAVEL guias
  const guiasUtilizaveis = useMemo(
    () => guias.filter(g => g.status === "UTILIZAVEL"),
    [guias]
  );

  // Map NFE -> nota for cross-referencing quantidade
  const notasByNfe = useMemo(() => {
    const map = new Map<string, typeof notas[0]>();
    notas.forEach(n => {
      const key = n.nfe.replace(/^0+/, "");
      map.set(key, n);
    });
    return map;
  }, [notas]);

  // Build enriched rows for Step 1
  const enrichedRows = useMemo(() => {
    return guiasUtilizaveis.map((guia) => {
      const nfeKey = guia.numero_nota.replace(/^0+/, "");
      const nota = notasByNfe.get(nfeKey);
      const quantidade = nota?.quantidade || 0;
      const icmsProprio = parseFloat(String(guia.credito_icms_proprio || "0")) || 0;
      const icmsST = parseFloat(String(guia.credito_icms_st || "0")) || 0;
      const icmsProprioUn = quantidade > 0 ? icmsProprio / quantidade : 0;
      const icmsSTUn = quantidade > 0 ? icmsST / quantidade : 0;
      const totalIcmsProprio = icmsProprio;
      const totalIcmsST = icmsST;

      return {
        guia,
        quantidade,
        saldoAnterior: 0,
        saldoAtual: 0,
        icmsProprio,
        icmsST,
        icmsProprioUn,
        icmsSTUn,
        totalIcmsProprio,
        totalIcmsST,
        chaveNfe: nota?.chave_nfe || null,
      };
    });
  }, [guiasUtilizaveis, notasByNfe]);

  if (!empresaId) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-4">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Selecione uma empresa no painel acima para continuar.</p>
      </div>
    );
  }

  const isLoading = isLoadingGuias || isLoadingNotas;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-background" />
          </div>
          <div>
            <h3 className="font-bold text-base">Controle Créditos ICMS-ST</h3>
            <p className="text-[11px] text-muted-foreground">
              Controle em 2 passos: Notas Utilizáveis → Movimento Estoque
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleSync}
          disabled={syncing || isLoading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center gap-2">
        <StepButton
          label="1. Notas Utilizáveis"
          icon={FileText}
          active={activeStep === "notas-utilizaveis"}
          count={guiasUtilizaveis.length}
          onClick={() => setActiveStep("notas-utilizaveis")}
        />
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        <StepButton
          label="2. Movimento Estoque"
          icon={Package}
          active={activeStep === "movimento-estoque"}
          onClick={() => setActiveStep("movimento-estoque")}
          disabled
        />
      </div>

      {/* Step Content */}
      {activeStep === "notas-utilizaveis" && (
        <NotasUtilizaveisStep
          rows={enrichedRows}
          isLoading={isLoading}
        />
      )}

      {activeStep === "movimento-estoque" && (
        <div className="glass rounded-xl p-8 text-center space-y-3">
          <Package className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Movimento Estoque — em breve.</p>
        </div>
      )}
    </motion.div>
  );
}

/* ── Step Button ── */
function StepButton({
  label, icon: Icon, active, count, onClick, disabled,
}: {
  label: string;
  icon: React.ComponentType<any>;
  active: boolean;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className={`h-9 text-xs gap-2 ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {count !== undefined && (
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-1 h-4">
          {count}
        </Badge>
      )}
    </Button>
  );
}

/* ── Step 1: Notas Utilizáveis ── */
interface EnrichedRow {
  guia: GuiaPagamento;
  quantidade: number;
  saldoAnterior: number;
  saldoAtual: number;
  icmsProprio: number;
  icmsST: number;
  icmsProprioUn: number;
  icmsSTUn: number;
  totalIcmsProprio: number;
  totalIcmsST: number;
  chaveNfe: string | null;
}

function NotasUtilizaveisStep({ rows, isLoading }: { rows: EnrichedRow[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-xs text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center space-y-3">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhuma guia com status <strong>UTILIZÁVEL</strong> encontrada.
        </p>
        <p className="text-[11px] text-muted-foreground">
          Verifique o módulo <em>Guias Pagamentos</em> e altere o status das guias desejadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          {rows.length} nota(s) utilizável(is)
        </Badge>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[9px] px-2 whitespace-nowrap">Nº Nota</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">Qtd Nota</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">Saldo Anterior</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">Saldo Atual</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">ICMS Próprio</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">ICMS-ST</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">ICMS Próp. UN</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">ICMS-ST UN</TableHead>
                <TableHead className="text-[9px] px-2 whitespace-nowrap">Nº Doc Pagto</TableHead>
                <TableHead className="text-[9px] px-2 whitespace-nowrap">Cód. Barras</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">Total ICMS Próp.</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">Total ICMS-ST</TableHead>
                <TableHead className="text-[9px] px-2 whitespace-nowrap min-w-[320px]">Chave NFE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.guia.id} className={idx % 2 === 0 ? "bg-muted/20" : ""}>
                  <TableCell className="text-[11px] px-2 font-mono">{row.guia.numero_nota}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">{row.quantidade || "-"}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">{row.saldoAnterior}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">{row.saldoAtual}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">{formatCurrency(row.icmsProprio)}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">{formatCurrency(row.icmsST)}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">{formatCurrency(row.icmsProprioUn)}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">{formatCurrency(row.icmsSTUn)}</TableCell>
                  <TableCell className="text-[11px] px-2 font-mono">{row.guia.numero_doc_pagamento || "-"}</TableCell>
                  <TableCell className="text-[11px] px-2 font-mono text-[10px]">{row.guia.codigo_barras || "-"}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">{formatCurrency(row.totalIcmsProprio)}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">{formatCurrency(row.totalIcmsST)}</TableCell>
                  <TableCell className="text-[10px] px-2 font-mono tracking-tight">{row.chaveNfe || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
