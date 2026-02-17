import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useApaeSessoes, type ApaePlanoContas, type ApaeRelatorioLinha, type ApaeResultado } from "@/hooks/useApaeSessoes";
import { useApaeBancoAplicacoes } from "@/hooks/useApaeBancoAplicacoes";
import { useApaePlanoEmpresa } from "@/hooks/useApaePlanoEmpresa";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { ApaeWizardSteps, type ApaeStep } from "./apae/ApaeWizardSteps";
import { ApaeStep1PlanoContas } from "./apae/ApaeStep1PlanoContas";
import { ApaeStep2ContasBanco } from "./apae/ApaeStep2ContasBanco";
import { ApaeStep3Relatorio } from "./apae/ApaeStep3Relatorio";
import { ApaeStep4Processamento } from "./apae/ApaeStep4Processamento";
import { ApaeStep5Conferencia } from "./apae/ApaeStep5Conferencia";
import { Plus, FolderOpen, Trash2, Loader2, ArrowLeft, CheckCircle2, Clock, Zap, FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function LancaApaeTab() {
  const { empresaAtiva } = useEmpresaAtiva();
  const {
    sessoes, loadingSessoes,
    criarSessao, atualizarSessao, deletarSessao,
    buscarPlanoContas, salvarPlanoContas, atualizarContaBanco,
    buscarRelatorioLinhas, salvarRelatorioLinhas,
    buscarResultados, salvarResultados,
    atualizarResultadoConta, atualizarResultadosLote, atualizarStatusResultados,
  } = useApaeSessoes();

  const { temPlano, planoArquivo, copiarParaSessao, salvarPlano: salvarPlanoEmpresa, removerPlano: removerPlanoEmpresa, planoEmpresa } = useApaePlanoEmpresa();

  const [sessaoAtiva, setSessaoAtiva] = useState<string | null>(null);
  const [step, setStep] = useState<ApaeStep>(1);
  const [planoContas, setPlanoContas] = useState<ApaePlanoContas[]>([]);
  const [relatorioLinhas, setRelatorioLinhas] = useState<ApaeRelatorioLinha[]>([]);
  const [resultados, setResultados] = useState<ApaeResultado[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showPlanoDialog, setShowPlanoDialog] = useState(false);
  const [pendingSessaoId, setPendingSessaoId] = useState<string | null>(null);

  const { mapeamentos, loading: loadingMapeamentos, buscar: buscarMapeamentos } = useApaeBancoAplicacoes(sessaoAtiva);

  useEffect(() => {
    if (!sessaoAtiva) return;
    buscarMapeamentos();
  }, [sessaoAtiva, buscarMapeamentos]);

  const sessaoInfo = sessoes.find((s) => s.id === sessaoAtiva);
  const codigoEmpresa = empresaAtiva?.cnpj || empresaAtiva?.nome || "";

  // Carregar dados da sessão ativa
  const carregarDadosSessao = useCallback(async (sessaoId: string) => {
    setLoadingData(true);
    try {
      const [plano, linhas, res] = await Promise.all([
        buscarPlanoContas(sessaoId),
        buscarRelatorioLinhas(sessaoId),
        buscarResultados(sessaoId),
      ]);
      setPlanoContas(plano);
      setRelatorioLinhas(linhas);
      setResultados(res);

      if (res.length > 0) setStep(5);
      else if (linhas.length > 0) setStep(4);
      else if (plano.some((c) => c.is_banco || c.is_aplicacao)) setStep(3);
      else if (plano.length > 0) setStep(2);
      else setStep(1);
    } catch (err) {
      toast.error("Erro ao carregar dados da sessão");
    } finally {
      setLoadingData(false);
    }
  }, [buscarPlanoContas, buscarRelatorioLinhas, buscarResultados, buscarMapeamentos]);

  const handleSelecionarSessao = (id: string) => {
    setSessaoAtiva(id);
    carregarDadosSessao(id);
  };

  const handleNovaSessao = async () => {
    try {
      const sessao = await criarSessao.mutateAsync(undefined);
      if (temPlano) {
        // Tem plano existente - perguntar se quer reutilizar
        setPendingSessaoId(sessao.id);
        setShowPlanoDialog(true);
      } else {
        // Sem plano - abrir direto no step 1
        setSessaoAtiva(sessao.id);
        setPlanoContas([]);
        setRelatorioLinhas([]);
        setResultados([]);
        setStep(1);
      }
    } catch {}
  };

  const handleUsarPlanoExistente = async () => {
    if (!pendingSessaoId) return;
    setShowPlanoDialog(false);
    setLoadingData(true);
    try {
      await copiarParaSessao(pendingSessaoId);
      await atualizarSessao.mutateAsync({ id: pendingSessaoId, plano_contas_arquivo: planoArquivo, passo_atual: 1 });
      setSessaoAtiva(pendingSessaoId);
      const plano = await buscarPlanoContas(pendingSessaoId);
      setPlanoContas(plano);
      setRelatorioLinhas([]);
      setResultados([]);
      setStep(2); // Pular direto pro step 2
      toast.success("Plano de contas reutilizado!");
    } catch (err) {
      toast.error("Erro ao copiar plano de contas");
    } finally {
      setLoadingData(false);
      setPendingSessaoId(null);
    }
  };

  const handleAtualizarPlano = () => {
    if (!pendingSessaoId) return;
    setShowPlanoDialog(false);
    setSessaoAtiva(pendingSessaoId);
    setPlanoContas([]);
    setRelatorioLinhas([]);
    setResultados([]);
    setStep(1);
    setPendingSessaoId(null);
  };

  const handleDeletarSessao = async (id: string) => {
    await deletarSessao.mutateAsync(id);
    if (sessaoAtiva === id) {
      setSessaoAtiva(null);
      setPlanoContas([]);
      setRelatorioLinhas([]);
      setResultados([]);
      setStep(1);
    }
  };

  const handleVoltarLista = () => {
    setSessaoAtiva(null);
    setPlanoContas([]);
    setRelatorioLinhas([]);
    setResultados([]);
  };

  // Handlers para cada passo
  const handleSalvarPlano = async (contas: { codigo: string; descricao: string; classificacao?: string; cnpj?: string }[], nomeArquivo: string) => {
    if (!sessaoAtiva) return;
    setSaving(true);
    try {
      // Salvar na sessão
      await salvarPlanoContas.mutateAsync({ sessaoId: sessaoAtiva, contas });
      await atualizarSessao.mutateAsync({ id: sessaoAtiva, plano_contas_arquivo: nomeArquivo, passo_atual: 1 });
      // Salvar persistente na empresa
      await salvarPlanoEmpresa.mutateAsync({ contas, nomeArquivo });
      const plano = await buscarPlanoContas(sessaoAtiva);
      setPlanoContas(plano);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoverPlano = async () => {
    if (!sessaoAtiva) return;
    setSaving(true);
    try {
      await salvarPlanoContas.mutateAsync({ sessaoId: sessaoAtiva, contas: [] });
      await atualizarSessao.mutateAsync({ id: sessaoAtiva, plano_contas_arquivo: null });
      setPlanoContas([]);
      setRelatorioLinhas([]);
      setResultados([]);
      setStep(1);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBanco = async (id: string, value: boolean) => {
    await atualizarContaBanco.mutateAsync({ id, is_banco: value });
    setPlanoContas((prev) => prev.map((c) => (c.id === id ? { ...c, is_banco: value } : c)));
  };

  const handleToggleAplicacao = async (id: string, value: boolean) => {
    await atualizarContaBanco.mutateAsync({ id, is_aplicacao: value });
    setPlanoContas((prev) => prev.map((c) => (c.id === id ? { ...c, is_aplicacao: value } : c)));
  };

  const handleSalvarRelatorio = async (linhas: Omit<ApaeRelatorioLinha, "id" | "sessao_id" | "created_at">[], nomeArquivo: string) => {
    if (!sessaoAtiva) return;
    setSaving(true);
    try {
      await salvarRelatorioLinhas.mutateAsync({ sessaoId: sessaoAtiva, linhas });
      await atualizarSessao.mutateAsync({ id: sessaoAtiva, relatorio_arquivo: nomeArquivo, passo_atual: 3 });
      const novasLinhas = await buscarRelatorioLinhas(sessaoAtiva);
      setRelatorioLinhas(novasLinhas);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoverRelatorio = async () => {
    if (!sessaoAtiva) return;
    setSaving(true);
    try {
      await salvarRelatorioLinhas.mutateAsync({ sessaoId: sessaoAtiva, linhas: [] });
      await atualizarSessao.mutateAsync({ id: sessaoAtiva, relatorio_arquivo: null });
      setRelatorioLinhas([]);
      setResultados([]);
    } finally {
      setSaving(false);
    }
  };

  const handleProcessar = async (res: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[]) => {
    if (!sessaoAtiva) return;
    setSaving(true);
    try {
      await salvarResultados.mutateAsync({ sessaoId: sessaoAtiva, resultados: res });
      await atualizarSessao.mutateAsync({ id: sessaoAtiva, passo_atual: 5 });
      const novos = await buscarResultados(sessaoAtiva);
      setResultados(novos);
      toast.success(`${novos.length} lançamento(s) processado(s)!`);
    } finally {
      setSaving(false);
    }
  };

  const canGoTo = (s: ApaeStep): boolean => {
    if (s === 1) return true;
    if (s === 2) return planoContas.length > 0;
    if (s === 3) return planoContas.some((c) => c.is_banco || c.is_aplicacao);
    if (s === 4) return relatorioLinhas.length > 0;
    if (s === 5) return resultados.length > 0;
    return false;
  };

  // Tela de lista de sessões
  if (!sessaoAtiva) {
    return (
      <>
      <div className="space-y-4">
        {/* Header with glow */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--cyan))] to-[hsl(var(--blue))] flex items-center justify-center shadow-[0_0_20px_hsl(var(--cyan)/0.4)]">
                <Zap className="w-4 h-4 text-background" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Lança APAE</h3>
              <p className="text-[10px] text-muted-foreground">Sessões de lançamento</p>
            </div>
          </div>
          <Button
            onClick={handleNovaSessao}
            disabled={criarSessao.isPending}
            size="sm"
            className="bg-gradient-to-r from-[hsl(var(--cyan))] to-[hsl(var(--blue))] text-background hover:opacity-90 shadow-[0_0_15px_hsl(var(--cyan)/0.3)]"
          >
            {criarSessao.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Nova Sessão
          </Button>
        </div>

        {loadingSessoes ? (
          <div className="flex items-center justify-center p-12">
            <div className="relative">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--cyan))]" />
              <div className="absolute inset-0 w-8 h-8 rounded-full animate-ping opacity-20 bg-[hsl(var(--cyan))]" />
            </div>
          </div>
        ) : sessoes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-10 text-center"
          >
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-gradient-to-br from-[hsl(var(--cyan)/0.2)] to-[hsl(var(--blue)/0.1)] flex items-center justify-center border border-[hsl(var(--cyan)/0.2)]">
              <FolderOpen className="w-8 h-8 text-[hsl(var(--cyan)/0.5)]" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma sessão. Crie uma para começar.</p>
          </motion.div>
        ) : (
          <div className="grid gap-2.5">
            <AnimatePresence mode="popLayout">
              {sessoes.map((s, idx) => {
                const isConcluido = s.status === "concluido";
                const progressPercent = (s.passo_atual / 5) * 100;

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleSelecionarSessao(s.id)}
                    className="group relative glass rounded-xl p-3.5 cursor-pointer transition-all duration-300 hover:border-[hsl(var(--cyan)/0.4)] hover:shadow-[0_0_25px_hsl(var(--cyan)/0.1)]"
                  >
                    {/* Progress bar at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden bg-border/50">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[hsl(var(--cyan))] to-[hsl(var(--blue))]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05 + 0.2 }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Status indicator */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isConcluido
                            ? "bg-emerald-500/15 border border-emerald-500/30"
                            : "bg-[hsl(var(--cyan)/0.1)] border border-[hsl(var(--cyan)/0.2)]"
                        }`}>
                          {isConcluido ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-[hsl(var(--cyan))]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{s.nome_sessao || "Sessão sem nome"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(s.created_at).toLocaleDateString("pt-BR")}
                            </span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] font-mono text-[hsl(var(--cyan))]">
                              {s.passo_atual}/5
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 border ${
                            isConcluido
                              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                              : "border-[hsl(var(--cyan)/0.3)] text-[hsl(var(--cyan))] bg-[hsl(var(--cyan)/0.05)]"
                          }`}
                        >
                          {isConcluido ? "Concluída" : "Em andamento"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeletarSessao(s.id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Dialog de reutilização do plano */}
      <Dialog open={showPlanoDialog} onOpenChange={(open) => {
        if (!open) {
          setShowPlanoDialog(false);
          // Se cancelar, deletar a sessão pendente
          if (pendingSessaoId) {
            deletarSessao.mutateAsync(pendingSessaoId);
            setPendingSessaoId(null);
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Plano de Contas Existente
            </DialogTitle>
            <DialogDescription>
              A empresa já possui um plano de contas carregado
              {planoArquivo && <> (<span className="font-mono text-xs">{planoArquivo}</span>)</>}
              {" "}com {planoEmpresa.length} conta(s). O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleAtualizarPlano}
            >
              <RefreshCw className="w-4 h-4" />
              Carregar Novo
            </Button>
            <Button
              className="gap-2"
              onClick={handleUsarPlanoExistente}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Usar Existente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    );
  }

  // Loading
  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--cyan))]" />
          <div className="absolute inset-0 w-10 h-10 rounded-full animate-ping opacity-15 bg-[hsl(var(--cyan))]" />
        </div>
      </div>
    );
  }

  // Wizard view
  return (
    <div className="space-y-3">
      {/* Back button + session info */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={handleVoltarLista}
        >
          <ArrowLeft className="w-3 h-3" />
          Sessões
        </Button>
        <div className="flex items-center gap-2">
          {sessaoInfo?.status === "concluido" && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">Concluída</span>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground font-mono">{sessaoInfo?.nome_sessao}</span>
        </div>
      </div>

      <ApaeWizardSteps current={step} onStepClick={setStep} canGoTo={canGoTo} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {step === 1 && (
            <ApaeStep1PlanoContas
              sessaoId={sessaoAtiva}
              planoContas={planoContas}
              planoContasArquivo={sessaoInfo?.plano_contas_arquivo || null}
              onSalvarPlano={handleSalvarPlano}
              onRemoverPlano={handleRemoverPlano}
              onNext={() => setStep(2)}
              saving={saving}
            />
          )}

          {step === 2 && (
            <ApaeStep2ContasBanco
              sessaoId={sessaoAtiva!}
              planoContas={planoContas}
              onToggleBanco={handleToggleBanco}
              onToggleAplicacao={handleToggleAplicacao}
              onNext={async () => { await buscarMapeamentos(); setStep(3); }}
              onBack={() => setStep(1)}
              saving={saving}
            />
          )}

          {step === 3 && (
            <ApaeStep3Relatorio
              linhas={relatorioLinhas}
              relatorioArquivo={sessaoInfo?.relatorio_arquivo || null}
              onSalvarRelatorio={handleSalvarRelatorio}
              onRemoverRelatorio={handleRemoverRelatorio}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
              saving={saving}
            />
          )}

          {step === 4 && (
            <ApaeStep4Processamento
              linhas={relatorioLinhas}
              planoContas={planoContas}
              mapeamentos={mapeamentos}
              mapeamentosLoading={loadingMapeamentos}
              refreshMapeamentos={buscarMapeamentos}
              codigoEmpresa={codigoEmpresa}
              resultados={resultados}
              onProcessar={handleProcessar}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
              saving={saving}
              onSaveResultadoConta={atualizarResultadoConta}
              onSaveResultadosLote={atualizarResultadosLote}
              onSaveStatusResultados={atualizarStatusResultados}
              onRefreshResultados={async () => {
                if (sessaoAtiva) {
                  const res = await buscarResultados(sessaoAtiva);
                  setResultados(res);
                }
              }}
            />
          )}

          {step === 5 && (
            <ApaeStep5Conferencia
              resultados={resultados}
              codigoEmpresa={codigoEmpresa}
              sessaoStatus={sessaoInfo?.status || "em_andamento"}
              onBack={() => setStep(4)}
              onEncerrarSessao={async () => {
                if (!sessaoAtiva) return;
                await atualizarSessao.mutateAsync({ id: sessaoAtiva, status: "concluido" });
              }}
              onReabrirSessao={async () => {
                if (!sessaoAtiva) return;
                await atualizarSessao.mutateAsync({ id: sessaoAtiva, status: "em_andamento" });
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
