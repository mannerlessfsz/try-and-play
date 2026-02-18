import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, FileText, Package, ChevronRight, RefreshCw, Check, Pencil, X,
  Globe, Cog, ClipboardList, Calendar, Lock, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGuiasPagamentos, type GuiaPagamento } from "@/hooks/useGuiasPagamentos";
import { useNotasEntradaST } from "@/hooks/useNotasEntradaST";
import { useSaldosNotas } from "@/hooks/useSaldosNotas";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MovimentoEstoqueStep } from "./MovimentoEstoqueStep";
import { NotasForaEstadoStep } from "./NotasForaEstadoStep";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const ROW_COLORS = [
  "border-l-4 border-l-blue-500/60",
  "border-l-4 border-l-emerald-500/60",
  "border-l-4 border-l-amber-500/60",
  "border-l-4 border-l-purple-500/60",
  "border-l-4 border-l-rose-500/60",
  "border-l-4 border-l-cyan-500/60",
  "border-l-4 border-l-orange-500/60",
  "border-l-4 border-l-teal-500/60",
  "border-l-4 border-l-pink-500/60",
  "border-l-4 border-l-indigo-500/60",
];

interface Props {
  empresaId?: string;
}

type Step = "notas-utilizaveis" | "movimento-estoque" | "notas-fora-estado" | "processamento" | "relatorio-final";

export function ControlCredICMSST({ empresaId }: Props) {
  const now = new Date();
  const [activeStep, setActiveStep] = useState<Step>("notas-utilizaveis");
  const [syncing, setSyncing] = useState(false);
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set());
  const [saldosAnteriores, setSaldosAnteriores] = useState<Record<string, number>>({});
  const [saldosEditadosManualmente, setSaldosEditadosManualmente] = useState<Set<string>>(new Set());
  const [competenciaMes, setCompetenciaMes] = useState(now.getMonth() + 1);
  const [competenciaAno, setCompetenciaAno] = useState(now.getFullYear());
  const [dadosRestaurados, setDadosRestaurados] = useState(false);
  const [sugestoesAplicadas, setSugestoesAplicadas] = useState(false);
  const [competenciaConfirmada, setCompetenciaConfirmada] = useState(false);

  const queryClient = useQueryClient();
  const { guias, isLoading: isLoadingGuias } = useGuiasPagamentos(empresaId);
  const { notas, isLoading: isLoadingNotas } = useNotasEntradaST(empresaId);
  const { saldos, isLoading: isLoadingSaldosAtuais, sugestoesSaldoAnterior, isLoadingSugestoes, salvarSaldos, salvarConfirmacao } = useSaldosNotas(empresaId, competenciaAno, competenciaMes);

  // Restaurar dados persistidos da competência atual
  useEffect(() => {
    if (!isLoadingSaldosAtuais && saldos.length > 0 && !dadosRestaurados) {
      const saldosRestaurados: Record<string, number> = {};
      const confirmadosRestaurados = new Set<string>();
      saldos.forEach(s => {
        saldosRestaurados[s.guia_id] = s.saldo_remanescente;
        confirmadosRestaurados.add(s.guia_id);
      });
      setSaldosAnteriores(prev => ({ ...saldosRestaurados, ...prev }));
      setConfirmados(confirmadosRestaurados);
      setDadosRestaurados(true);
    } else if (!isLoadingSaldosAtuais && saldos.length === 0 && !dadosRestaurados) {
      setDadosRestaurados(true);
    }
  }, [isLoadingSaldosAtuais, saldos, dadosRestaurados]);

  // Aplicar sugestões do mês anterior APENAS se não há dados persistidos
  useEffect(() => {
    if (dadosRestaurados && saldos.length === 0 && !isLoadingSugestoes && sugestoesSaldoAnterior.size > 0 && !sugestoesAplicadas) {
      const novosSaldos: Record<string, number> = {};
      sugestoesSaldoAnterior.forEach((saldo, guiaId) => {
        novosSaldos[guiaId] = saldo;
      });
      setSaldosAnteriores(prev => ({ ...novosSaldos, ...prev }));
      setSugestoesAplicadas(true);
    }
  }, [dadosRestaurados, saldos.length, isLoadingSugestoes, sugestoesSaldoAnterior, sugestoesAplicadas]);

  // Reset quando muda competência
  useEffect(() => {
    setDadosRestaurados(false);
    setSugestoesAplicadas(false);
    setSaldosAnteriores({});
    setSaldosEditadosManualmente(new Set());
    setConfirmados(new Set());
    setCompetenciaConfirmada(false);
    setActiveStep("notas-utilizaveis");
  }, [competenciaMes, competenciaAno]);

  // Auto-confirmar competência se já existem dados persistidos
  useEffect(() => {
    if (dadosRestaurados && saldos.length > 0 && !competenciaConfirmada) {
      setCompetenciaConfirmada(true);
    }
  }, [dadosRestaurados, saldos.length, competenciaConfirmada]);


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

  const guiasUtilizaveis = useMemo(
    () => guias.filter(g => g.status === "UTILIZAVEL"),
    [guias]
  );

  const notasByNfe = useMemo(() => {
    const map = new Map<string, typeof notas[0]>();
    notas.forEach(n => {
      const key = n.nfe.replace(/^0+/, "");
      map.set(key, n);
    });
    return map;
  }, [notas]);

  const enrichedRows = useMemo(() => {
    return guiasUtilizaveis.map((guia) => {
      const nfeKey = guia.numero_nota.replace(/^0+/, "");
      const nota = notasByNfe.get(nfeKey);
      const quantidade = nota?.quantidade || 0;
      const icmsProprio = parseFloat(String(guia.credito_icms_proprio || "0")) || 0;
      const icmsST = parseFloat(String(guia.credito_icms_st || "0")) || 0;
      const icmsProprioUn = quantidade > 0 ? icmsProprio / quantidade : 0;
      const icmsSTUn = quantidade > 0 ? icmsST / quantidade : 0;
      const saldoAnterior = saldosAnteriores[guia.id] ?? 0;

      const saldoAtual = saldoAnterior > 0 ? quantidade - saldoAnterior : quantidade;

      return {
        guia,
        quantidade,
        saldoAnterior,
        saldoAtual,
        icmsProprio,
        icmsST,
        icmsProprioUn,
        icmsSTUn,
        totalIcmsProprio: icmsProprio,
        totalIcmsST: icmsST,
        chaveNfe: nota?.chave_nfe || null,
      };
    });
  }, [guiasUtilizaveis, notasByNfe, saldosAnteriores, saldosEditadosManualmente]);

  const handleToggleConfirm = useCallback((guiaId: string) => {
    const row = enrichedRows.find(r => r.guia.id === guiaId);
    if (!row) return;
    const isConfirmed = confirmados.has(guiaId);
    
    setConfirmados(prev => {
      const s = new Set(prev);
      if (s.has(guiaId)) s.delete(guiaId); else s.add(guiaId);
      return s;
    });

    salvarConfirmacao.mutate({
      guiaId,
      numeroNota: row.guia.numero_nota,
      saldoAnterior: row.saldoAnterior,
      quantidade: row.quantidade,
      confirmar: !isConfirmed,
    });
  }, [enrichedRows, confirmados, salvarConfirmacao]);

  const handleConfirmAll = useCallback(() => {
    setConfirmados(new Set(enrichedRows.map(r => r.guia.id)));
    // Salvar todas de uma vez
    if (!empresaId) return;
    const items = enrichedRows.map(r => ({
      empresa_id: empresaId,
      guia_id: r.guia.id,
      numero_nota: r.guia.numero_nota,
      competencia_ano: competenciaAno,
      competencia_mes: competenciaMes,
      saldo_remanescente: r.saldoAnterior,
      quantidade_original: r.quantidade,
      quantidade_consumida: 0,
    }));
    salvarSaldos.mutate(items as any);
  }, [enrichedRows, empresaId, competenciaAno, competenciaMes, salvarSaldos]);

  const handleSaldoChange = useCallback((guiaId: string, value: number) => {
    setSaldosAnteriores(prev => ({ ...prev, [guiaId]: value }));
    setSaldosEditadosManualmente(prev => new Set(prev).add(guiaId));
    // Se já está confirmado, atualizar no banco também
    if (confirmados.has(guiaId)) {
      const row = enrichedRows.find(r => r.guia.id === guiaId);
      if (row) {
        salvarConfirmacao.mutate({
          guiaId,
          numeroNota: row.guia.numero_nota,
          saldoAnterior: value,
          quantidade: row.quantidade,
          confirmar: true,
        });
      }
    }
  }, [confirmados, enrichedRows, salvarConfirmacao]);

  const allConfirmed = enrichedRows.length > 0 && enrichedRows.every(r => confirmados.has(r.guia.id));

  const handleAvancarStep2 = useCallback(() => {
    setActiveStep("movimento-estoque");
    toast.success("Avançando para Movimento Estoque");
  }, []);

  const handleAvancarStep3 = useCallback(() => {
    setActiveStep("notas-fora-estado");
    toast.success("Avançando para Notas Fora Estado");
  }, []);

  const handleAvancarStep4 = useCallback(() => {
    setActiveStep("processamento");
    toast.success("Avançando para Processamento");
  }, []);

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
              Controle em 5 passos: Notas Utilizáveis → Mov. Estoque → Fora Estado → Processamento → Relatório
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Competência Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <Select 
              value={String(competenciaMes)} 
              onValueChange={v => setCompetenciaMes(Number(v))}
              disabled={competenciaConfirmada}
            >
              <SelectTrigger className="h-8 w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
                    {String(i + 1).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">/</span>
            <Select 
              value={String(competenciaAno)} 
              onValueChange={v => setCompetenciaAno(Number(v))}
              disabled={competenciaConfirmada}
            >
              <SelectTrigger className="h-8 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {competenciaConfirmada ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => setCompetenciaConfirmada(false)}
            >
              <Pencil className="w-3 h-3" />
              Alterar
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setCompetenciaConfirmada(true)}
            >
              <Check className="w-3 h-3" />
              Confirmar Competência
            </Button>
          )}
          {competenciaConfirmada && sugestoesSaldoAnterior.size > 0 && (
            <Badge variant="outline" className="text-[9px] h-6 bg-blue-500/10 text-blue-400 border-blue-500/30">
              {sugestoesSaldoAnterior.size} sugestão(ões)
            </Badge>
          )}
          {competenciaConfirmada && (
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
          )}
        </div>
      </div>

      {/* Gate: Competência não confirmada */}
      {!competenciaConfirmada ? (
        <div className="glass rounded-xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h4 className="font-semibold text-sm">Selecione e confirme a competência</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Escolha o mês/ano de competência acima e clique em <strong>"Confirmar Competência"</strong> para iniciar o processamento. 
              Não é permitido processar a mesma competência duas vezes.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Após confirmar, a competência ficará travada durante o processamento.</span>
          </div>
        </div>
      ) : (
        <>
          {/* Step Navigation */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] h-7 mr-2">
              {String(competenciaMes).padStart(2, "0")}/{competenciaAno}
            </Badge>
            <StepButton
              label="1. Notas Utilizáveis"
              icon={FileText}
              active={activeStep === "notas-utilizaveis"}
              count={guiasUtilizaveis.length}
              onClick={() => setActiveStep("notas-utilizaveis")}
            />
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <StepButton
              label="2. Mov. Estoque"
              icon={Package}
              active={activeStep === "movimento-estoque"}
              onClick={() => allConfirmed && setActiveStep("movimento-estoque")}
              disabled={!allConfirmed}
            />
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <StepButton
              label="3. Notas Fora Estado"
              icon={Globe}
              active={activeStep === "notas-fora-estado"}
              onClick={() => setActiveStep("notas-fora-estado")}
            />
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <StepButton
              label="4. Processamento"
              icon={Cog}
              active={activeStep === "processamento"}
              onClick={() => setActiveStep("processamento")}
              disabled
            />
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <StepButton
              label="5. Relatório Final"
              icon={ClipboardList}
              active={activeStep === "relatorio-final"}
              onClick={() => setActiveStep("relatorio-final")}
              disabled
            />
          </div>

          {/* Step Content */}
          {activeStep === "notas-utilizaveis" && (
            <NotasUtilizaveisStep
              rows={enrichedRows}
              isLoading={isLoading}
              confirmados={confirmados}
              onToggleConfirm={handleToggleConfirm}
              onConfirmAll={handleConfirmAll}
              onSaldoChange={handleSaldoChange}
              allConfirmed={allConfirmed}
              onAvancar={handleAvancarStep2}
            />
          )}

          {activeStep === "movimento-estoque" && (
            <MovimentoEstoqueStep
              notasUtilizaveis={enrichedRows}
              onAvancar={handleAvancarStep3}
              empresaId={empresaId}
              competenciaAno={competenciaAno}
              competenciaMes={competenciaMes}
              salvarSaldos={salvarSaldos}
            />
          )}

          {activeStep === "notas-fora-estado" && (
            <NotasForaEstadoStep onAvancar={handleAvancarStep4} />
          )}

          {activeStep === "processamento" && (
            <div className="glass rounded-xl p-8 text-center space-y-3">
              <Cog className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Processamento — em breve.</p>
            </div>
          )}

          {activeStep === "relatorio-final" && (
            <div className="glass rounded-xl p-8 text-center space-y-3">
              <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Relatório Final — em breve.</p>
            </div>
          )}
        </>
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

interface NotasStepProps {
  rows: EnrichedRow[];
  isLoading: boolean;
  confirmados: Set<string>;
  onToggleConfirm: (guiaId: string) => void;
  onConfirmAll: () => void;
  onSaldoChange: (guiaId: string, value: number) => void;
  allConfirmed: boolean;
  onAvancar: () => void;
}

function NotasUtilizaveisStep({
  rows, isLoading, confirmados, onToggleConfirm, onConfirmAll, onSaldoChange, allConfirmed, onAvancar,
}: NotasStepProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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

  const confirmedCount = rows.filter(r => confirmados.has(r.guia.id)).length;

  const startEdit = (guiaId: string, currentVal: number) => {
    setEditingId(guiaId);
    setEditValue(String(currentVal));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = (guiaId: string) => {
    const parsed = parseFloat(editValue.replace(",", "."));
    onSaldoChange(guiaId, isNaN(parsed) ? 0 : parsed);
    setEditingId(null);
    setEditValue("");
  };

  return (
    <div className="space-y-3">
      {/* Summary + Confirm All */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            {rows.length} nota(s) utilizável(is)
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${confirmedCount === rows.length ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
            {confirmedCount}/{rows.length} confirmada(s)
          </Badge>
        </div>
        {!allConfirmed && (
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5" onClick={onConfirmAll}>
            <Check className="w-3 h-3" />
            Confirmar todas
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[9px] px-1 w-8">✓</TableHead>
                <TableHead className="text-[9px] px-2 whitespace-nowrap">Nº Nota</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">Qtd Nota</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">Saldo Ant.</TableHead>
                <TableHead className="text-[9px] px-2 w-8"></TableHead>
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
              {rows.map((row, idx) => {
                const colorClass = ROW_COLORS[idx % ROW_COLORS.length];
                const isConfirmed = confirmados.has(row.guia.id);
                const isEditing = editingId === row.guia.id;

                return (
                  <TableRow
                    key={row.guia.id}
                    className={`${colorClass} ${isConfirmed ? "bg-emerald-500/5" : ""}`}
                  >
                    {/* Confirm toggle */}
                    <TableCell className="px-1">
                      <button
                        onClick={() => onToggleConfirm(row.guia.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isConfirmed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-muted-foreground/40 hover:border-foreground"
                        }`}
                      >
                        {isConfirmed && <Check className="w-3 h-3" />}
                      </button>
                    </TableCell>
                    <TableCell className="text-[11px] px-2 font-mono">{row.guia.numero_nota}</TableCell>
                    <TableCell className="text-[11px] px-2 text-right font-mono">{row.quantidade || "-"}</TableCell>
                    <TableCell className="text-[11px] px-2 text-right font-mono">
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") saveEdit(row.guia.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="h-6 w-20 text-[11px] text-right font-mono px-1"
                        />
                      ) : (
                        row.saldoAnterior
                      )}
                    </TableCell>
                    {/* Edit saldo anterior button */}
                    <TableCell className="px-0">
                      {isEditing ? (
                        <div className="flex gap-0.5">
                          <button onClick={() => saveEdit(row.guia.id)} className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-500" title="Salvar">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={cancelEdit} className="p-0.5 rounded hover:bg-destructive/20 text-destructive" title="Cancelar">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(row.guia.id, row.saldoAnterior)}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                          title="Editar Saldo Anterior"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </TableCell>
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Avançar */}
      {allConfirmed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <Button onClick={onAvancar} className="gap-2 text-xs">
            Avançar para Movimento Estoque
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
