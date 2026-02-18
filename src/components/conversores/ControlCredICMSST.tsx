import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Calendar, Check, ChevronLeft, ChevronRight,
  Lock, Unlock, RefreshCw, AlertTriangle, TrendingUp, TrendingDown,
  FileText, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useControleCreditos, type ControleCredito, type ControleStatus } from "@/hooks/useControleCreditos";
import { useGuiasPagamentos, type GuiaPagamento } from "@/hooks/useGuiasPagamentos";
import { useToast } from "@/hooks/use-toast";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const MESES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const STATUS_CONFIG: Record<ControleStatus, { label: string; color: string; icon: typeof Check }> = {
  aberto: { label: "Aberto", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Unlock },
  conferido: { label: "Conferido", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Check },
  fechado: { label: "Fechado", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: Lock },
};

interface Props {
  empresaId?: string;
}

export function ControlCredICMSST({ empresaId }: Props) {
  const { toast } = useToast();
  const { controles, isLoading, upsertControle, updateControle } = useControleCreditos(empresaId);
  const { guias, isLoading: isLoadingGuias } = useGuiasPagamentos(empresaId);

  const currentDate = new Date();
  const [selectedAno, setSelectedAno] = useState(currentDate.getFullYear());
  const [selectedMes, setSelectedMes] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [obsText, setObsText] = useState("");

  // Build timeline data: map of mes -> controle for the selected year
  const timelineData = useMemo(() => {
    const map = new Map<number, ControleCredito>();
    controles
      .filter(c => c.competencia_ano === selectedAno)
      .forEach(c => map.set(c.competencia_mes, c));
    return map;
  }, [controles, selectedAno]);

  // Guias grouped by competência (month from data_nota)
  const guiasByMonth = useMemo(() => {
    const map = new Map<number, GuiaPagamento[]>();
    guias.forEach(g => {
      if (!g.data_nota) return;
      const month = parseInt(g.data_nota.substring(5, 7));
      const year = parseInt(g.data_nota.substring(0, 4));
      if (year !== selectedAno) return;
      const existing = map.get(month) || [];
      existing.push(g);
      map.set(month, existing);
    });
    return map;
  }, [guias, selectedAno]);

  // Available months with guias
  const monthsWithData = useMemo(() => {
    const months = new Set<number>();
    guiasByMonth.forEach((_, m) => months.add(m));
    controles.filter(c => c.competencia_ano === selectedAno).forEach(c => months.add(c.competencia_mes));
    return months;
  }, [guiasByMonth, controles, selectedAno]);

  // Selected controle
  const selectedControle = selectedMes ? timelineData.get(selectedMes) : null;
  const selectedGuias = selectedMes ? (guiasByMonth.get(selectedMes) || []) : [];

  // Calculate stats from guias
  const calcStats = (guiasList: GuiaPagamento[]) => {
    const utilizaveis = guiasList.filter(g => (g.status || "NAO PAGO") === "UTILIZAVEL");
    const utilizadas = guiasList.filter(g => g.status === "UTILIZADO");
    const naoPagas = guiasList.filter(g => (g.status || "NAO PAGO") === "NAO PAGO");
    const creditoST = guiasList.reduce((sum, g) => sum + (parseFloat(String(g.credito_icms_st || "0")) || 0), 0);
    const creditoProprio = guiasList.reduce((sum, g) => sum + (parseFloat(String(g.credito_icms_proprio || "0")) || 0), 0);
    const valorUtilizado = utilizadas.reduce((sum, g) => sum + (parseFloat(String(g.credito_icms_st || "0")) || 0), 0);

    return {
      total: guiasList.length,
      utilizaveis: utilizaveis.length,
      utilizadas: utilizadas.length,
      naoPagas: naoPagas.length,
      creditoST,
      creditoProprio,
      valorUtilizado,
    };
  };

  // Get previous month's saldo_final as saldo_anterior
  const getSaldoAnterior = (mes: number): number => {
    if (mes === 1) {
      const prevYearControle = controles.find(
        c => c.competencia_ano === selectedAno - 1 && c.competencia_mes === 12
      );
      return prevYearControle?.saldo_final || 0;
    }
    const prevControle = controles.find(
      c => c.competencia_ano === selectedAno && c.competencia_mes === mes - 1
    );
    return prevControle?.saldo_final || 0;
  };

  const handleSync = async () => {
    if (!empresaId || !selectedMes) return;
    setIsSyncing(true);
    try {
      const stats = calcStats(selectedGuias);
      const saldoAnterior = getSaldoAnterior(selectedMes);
      const creditoPeriodo = stats.creditoST;
      const utilizadoPeriodo = stats.valorUtilizado;
      const saldoFinal = saldoAnterior + creditoPeriodo - utilizadoPeriodo;

      await upsertControle.mutateAsync({
        empresa_id: empresaId,
        competencia_mes: selectedMes,
        competencia_ano: selectedAno,
        saldo_anterior: saldoAnterior,
        credito_periodo: creditoPeriodo,
        utilizado_periodo: utilizadoPeriodo,
        estornado_periodo: 0,
        saldo_final: saldoFinal,
        total_guias: stats.total,
        guias_utilizaveis: stats.utilizaveis,
        guias_utilizadas: stats.utilizadas,
        guias_nao_pagas: stats.naoPagas,
        status: "aberto" as ControleStatus,
        observacoes: obsText || null,
        conferido_por: null,
        conferido_em: null,
      });
      toast({ title: "Competência sincronizada", description: `${MESES_FULL[selectedMes - 1]}/${selectedAno} atualizado.` });
    } catch (err: any) {
      toast({ title: "Erro ao sincronizar", description: err.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleChangeStatus = async (newStatus: ControleStatus) => {
    if (!selectedControle) return;
    try {
      await updateControle.mutateAsync({
        id: selectedControle.id,
        status: newStatus,
        ...(newStatus === "conferido" ? { conferido_em: new Date().toISOString() } : {}),
      } as any);
      toast({ title: `Status alterado para "${STATUS_CONFIG[newStatus].label}"` });
    } catch {}
  };

  if (!empresaId) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-4">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground" />
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-background" />
          </div>
          <div>
            <h3 className="font-bold text-base">ControlCredICMSST</h3>
            <p className="text-[11px] text-muted-foreground">
              Controle de créditos ICMS-ST por competência
            </p>
          </div>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedAno(a => a - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold text-sm w-12 text-center">{selectedAno}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedAno(a => a + 1)}
            disabled={selectedAno >= currentDate.getFullYear()}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Mensal */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">Timeline {selectedAno}</span>
        </div>

        <div className="grid grid-cols-12 gap-1.5">
          {MESES.map((mes, idx) => {
            const mesNum = idx + 1;
            const controle = timelineData.get(mesNum);
            const hasGuias = guiasByMonth.has(mesNum);
            const isSelected = selectedMes === mesNum;
            const status = controle?.status || null;

            let bgColor = "bg-muted/30";
            let borderColor = "border-transparent";
            let textColor = "text-muted-foreground";

            if (status === "fechado") {
              bgColor = "bg-emerald-500/15";
              borderColor = "border-emerald-500/40";
              textColor = "text-emerald-400";
            } else if (status === "conferido") {
              bgColor = "bg-blue-500/15";
              borderColor = "border-blue-500/40";
              textColor = "text-blue-400";
            } else if (status === "aberto") {
              bgColor = "bg-amber-500/15";
              borderColor = "border-amber-500/40";
              textColor = "text-amber-400";
            } else if (hasGuias) {
              bgColor = "bg-purple-500/10";
              borderColor = "border-purple-500/20";
              textColor = "text-purple-400";
            }

            return (
              <motion.button
                key={mesNum}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedMes(isSelected ? null : mesNum)}
                className={`relative rounded-lg border p-2 text-center transition-all ${bgColor} ${borderColor} ${
                  isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                } ${hasGuias || controle ? "cursor-pointer hover:opacity-80" : "opacity-40 cursor-default"}`}
                disabled={!hasGuias && !controle}
              >
                <span className={`text-[10px] font-bold ${textColor}`}>{mes}</span>
                {controle && (
                  <div className="mt-1">
                    <span className="text-[8px] font-mono text-muted-foreground block">
                      {formatCurrency(controle.saldo_final).replace("R$\u00a0", "")}
                    </span>
                  </div>
                )}
                {!controle && hasGuias && (
                  <div className="mt-1">
                    <span className="text-[8px] text-purple-400">{guiasByMonth.get(mesNum)?.length} guias</span>
                  </div>
                )}
                {/* Status dot */}
                {controle && (
                  <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-background ${
                    status === "fechado" ? "bg-emerald-500" : status === "conferido" ? "bg-blue-500" : "bg-amber-500"
                  }`} />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-[9px] text-muted-foreground">Com guias</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[9px] text-muted-foreground">Aberto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[9px] text-muted-foreground">Conferido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] text-muted-foreground">Fechado</span>
          </div>
        </div>
      </div>

      {/* Detalhes da competência selecionada */}
      {selectedMes && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Título */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm">{MESES_FULL[selectedMes - 1]} / {selectedAno}</h4>
              {selectedControle && (
                <Badge variant="outline" className={`text-[10px] ${STATUS_CONFIG[selectedControle.status].color}`}>
                  {STATUS_CONFIG[selectedControle.status].label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleSync}
                disabled={isSyncing || selectedGuias.length === 0}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {selectedControle ? "Recalcular" : "Calcular"}
              </Button>
              {selectedControle && selectedControle.status === "aberto" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => handleChangeStatus("conferido")}
                >
                  <Check className="w-3.5 h-3.5" /> Conferir
                </Button>
              )}
              {selectedControle && selectedControle.status === "conferido" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => handleChangeStatus("fechado")}
                  >
                    <Lock className="w-3.5 h-3.5" /> Fechar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => handleChangeStatus("aberto")}
                  >
                    <Unlock className="w-3.5 h-3.5" /> Reabrir
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Cards de resumo */}
          {selectedControle ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <SummaryCard label="Saldo Anterior" value={formatCurrency(selectedControle.saldo_anterior)} icon={ArrowRight} />
              <SummaryCard label="Crédito Período" value={formatCurrency(selectedControle.credito_periodo)} icon={TrendingUp} color="text-emerald-400" />
              <SummaryCard label="Utilizado" value={formatCurrency(selectedControle.utilizado_periodo)} icon={TrendingDown} color="text-red-400" />
              <SummaryCard label="Saldo Final" value={formatCurrency(selectedControle.saldo_final)} icon={BarChart3}
                color={selectedControle.saldo_final >= 0 ? "text-emerald-400" : "text-red-400"} highlighted />
              <SummaryCard label="Guias Utilizáveis" value={String(selectedControle.guias_utilizaveis)} icon={FileText} color="text-emerald-400" />
              <SummaryCard label="Não Pagas" value={String(selectedControle.guias_nao_pagas)} icon={AlertTriangle}
                color={selectedControle.guias_nao_pagas > 0 ? "text-red-400" : "text-muted-foreground"} />
            </div>
          ) : selectedGuias.length > 0 ? (
            <div className="glass rounded-xl p-4 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-400" />
              <p className="text-xs text-muted-foreground">
                {selectedGuias.length} guia(s) encontrada(s). Clique em <strong>"Calcular"</strong> para gerar o controle.
              </p>
            </div>
          ) : (
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Nenhuma guia para esta competência.</p>
            </div>
          )}

          {/* Tabela de guias */}
          {selectedGuias.length > 0 && (
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-border/30">
                <p className="text-[10px] text-muted-foreground">{selectedGuias.length} guia(s) na competência</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] px-2">Nota</TableHead>
                    <TableHead className="text-[10px] px-2 text-right">Valor Guia</TableHead>
                    <TableHead className="text-[10px] px-2 text-right">ICMS Próprio</TableHead>
                    <TableHead className="text-[10px] px-2 text-right">ICMS-ST</TableHead>
                    <TableHead className="text-[10px] px-2">Produto</TableHead>
                    <TableHead className="text-[10px] px-2">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedGuias.map((guia, idx) => {
                    const statusLabel = guia.status || "NAO PAGO";
                    const statusColors: Record<string, string> = {
                      "UTILIZAVEL": "bg-emerald-500/20 text-emerald-400",
                      "NAO PAGO": "bg-red-500/20 text-red-400",
                      "UTILIZADO": "bg-blue-500/20 text-blue-400",
                      "NAO UTILIZAVEL": "bg-amber-500/20 text-amber-400",
                      "VENDA INTERNA": "bg-purple-500/20 text-purple-400",
                    };
                    return (
                      <TableRow key={guia.id} className={idx % 2 === 0 ? "bg-muted/20" : ""}>
                        <TableCell className="text-[11px] px-2 font-mono">{guia.numero_nota}</TableCell>
                        <TableCell className="text-[11px] px-2 text-right font-mono">{formatCurrency(guia.valor_guia)}</TableCell>
                        <TableCell className="text-[11px] px-2 text-right font-mono">
                          {guia.credito_icms_proprio ? formatCurrency(parseFloat(guia.credito_icms_proprio)) : "-"}
                        </TableCell>
                        <TableCell className="text-[11px] px-2 text-right font-mono">
                          {guia.credito_icms_st ? formatCurrency(parseFloat(guia.credito_icms_st)) : "-"}
                        </TableCell>
                        <TableCell className="text-[11px] px-2">{guia.produto || "-"}</TableCell>
                        <TableCell className="text-[11px] px-2">
                          <Badge variant="outline" className={`text-[9px] px-1.5 ${statusColors[statusLabel] || ""}`}>
                            {statusLabel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Observações */}
          {selectedControle && (
            <div className="glass rounded-xl p-4 space-y-2">
              <span className="text-[10px] text-muted-foreground font-medium">Observações</span>
              <Textarea
                value={obsText || selectedControle.observacoes || ""}
                onChange={(e) => setObsText(e.target.value)}
                placeholder="Notas sobre esta competência..."
                className="text-xs min-h-[60px] bg-transparent border-dashed"
                disabled={selectedControle.status === "fechado"}
              />
              {obsText && obsText !== (selectedControle.observacoes || "") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={async () => {
                    await updateControle.mutateAsync({ id: selectedControle.id, observacoes: obsText } as any);
                    toast({ title: "Observações salvas" });
                  }}
                >
                  Salvar
                </Button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function SummaryCard({
  label, value, icon: Icon, color = "text-foreground", highlighted = false
}: {
  label: string; value: string; icon: React.ComponentType<any>; color?: string; highlighted?: boolean;
}) {
  return (
    <div className={`glass rounded-lg px-3 py-2.5 ${highlighted ? "ring-1 ring-primary/30" : ""}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 ${color}`} />
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </div>
      <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}
