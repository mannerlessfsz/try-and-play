import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useApaeSessoes, type ApaePlanoContas, type ApaeRelatorioLinha, type ApaeResultado, type ApaeSessaoTipo } from "@/hooks/useApaeSessoes";
import { useApaeBancoAplicacoes } from "@/hooks/useApaeBancoAplicacoes";
import { useApaePlanoEmpresa } from "@/hooks/useApaePlanoEmpresa";
import { useApaeBancoAplicacoesEmpresa } from "@/hooks/useApaeBancoAplicacoesEmpresa";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { ApaeWizardSteps, type ApaeStep } from "./apae/ApaeWizardSteps";
import { ApaeEmpresaPlanoCard } from "./apae/ApaeEmpresaPlanoCard";
import { ApaeEmpresaContasCard } from "./apae/ApaeEmpresaContasCard";
import { ApaeStep3Relatorio } from "./apae/ApaeStep3Relatorio";
import { ApaeStep4Processamento } from "./apae/ApaeStep4Processamento";
import { ApaeStep5Conferencia } from "./apae/ApaeStep5Conferencia";
import { Plus, FolderOpen, Trash2, Loader2, ArrowLeft, CheckCircle2, Clock, Zap, RefreshCw, FileSpreadsheet, Building2, Play } from "lucide-react";
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

  const { temPlano, planoArquivo, copiarParaSessao, planoEmpresa } = useApaePlanoEmpresa();
  const { mapeamentos: mapeamentosEmpresa, buscar: buscarMapeamentosEmpresa, copiarParaSessao: copiarMapeamentosParaSessao, temMapeamentos } = useApaeBancoAplicacoesEmpresa();

  const [sessaoAtiva, setSessaoAtiva] = useState<string | null>(null);
  const [step, setStep] = useState<ApaeStep>(3);
  const [subView, setSubView] = useState<"home" | "plano" | "contas" | "sessoes">("home");
  const [planoContas, setPlanoContas] = useState<ApaePlanoContas[]>([]);
  const [relatorioLinhas, setRelatorioLinhas] = useState<ApaeRelatorioLinha[]>([]);
  const [resultados, setResultados] = useState<ApaeResultado[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Dialog de nova sessão
  const [showNovaDialog, setShowNovaDialog] = useState(false);
  const [wantUpdatePlano, setWantUpdatePlano] = useState(false);
  const [wantUpdateBancos, setWantUpdateBancos] = useState(false);
  const [tipoSessao, setTipoSessao] = useState<ApaeSessaoTipo>("contas_a_pagar");

  const { mapeamentos, loading: loadingMapeamentos, buscar: buscarMapeamentos } = useApaeBancoAplicacoes(sessaoAtiva);

  useEffect(() => {
    if (!sessaoAtiva) return;
    buscarMapeamentos();
  }, [sessaoAtiva, buscarMapeamentos]);

  useEffect(() => {
    buscarMapeamentosEmpresa();
  }, [buscarMapeamentosEmpresa]);

  const sessaoInfo = sessoes.find((s) => s.id === sessaoAtiva);
  const codigoEmpresa = empresaAtiva?.cnpj || empresaAtiva?.nome || "";

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

      // Sessão agora começa no step 3
      if (res.length > 0) setStep(5);
      else if (linhas.length > 0) setStep(4);
      else setStep(3);
    } catch (err) {
      toast.error("Erro ao carregar dados da sessão");
    } finally {
      setLoadingData(false);
    }
  }, [buscarPlanoContas, buscarRelatorioLinhas, buscarResultados]);

  const handleSelecionarSessao = (id: string) => {
    setSessaoAtiva(id);
    carregarDadosSessao(id);
  };

  const handleNovaSessao = () => {
    if (!temPlano) {
      toast.error("Configure o plano de contas da empresa antes de criar uma sessão.");
      return;
    }
    setWantUpdatePlano(false);
    setWantUpdateBancos(false);
    setTipoSessao("contas_a_pagar");
    setShowNovaDialog(true);
  };

  const handleConfirmarNovaSessao = async () => {
    setShowNovaDialog(false);
    setLoadingData(true);
    try {
      const sessao = await criarSessao.mutateAsync({ tipo: tipoSessao });

      if (wantUpdatePlano) {
        await deletarSessao.mutateAsync(sessao.id);
        setLoadingData(false);
        setSubView("plano");
        toast.info("Atualize o plano de contas e depois crie a sessão novamente.");
        return;
      }

      if (wantUpdateBancos) {
        await deletarSessao.mutateAsync(sessao.id);
        setLoadingData(false);
        setSubView("contas");
        toast.info("Atualize as contas e depois crie a sessão novamente.");
        return;
      }

      // Copiar plano e mapeamentos da empresa para a sessão
      await copiarParaSessao(sessao.id);
      await copiarMapeamentosParaSessao(sessao.id);
      await atualizarSessao.mutateAsync({ id: sessao.id, plano_contas_arquivo: planoArquivo, passo_atual: 3 });

      setSessaoAtiva(sessao.id);
      const plano = await buscarPlanoContas(sessao.id);
      setPlanoContas(plano);
      setRelatorioLinhas([]);
      setResultados([]);
      setStep(3);
      toast.success("Sessão criada com configuração da empresa!");
    } catch (err) {
      toast.error("Erro ao criar sessão");
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeletarSessao = async (id: string) => {
    await deletarSessao.mutateAsync(id);
    if (sessaoAtiva === id) {
      setSessaoAtiva(null);
      setPlanoContas([]);
      setRelatorioLinhas([]);
      setResultados([]);
      setStep(3);
    }
  };

  const handleVoltarLista = () => {
    setSessaoAtiva(null);
    setPlanoContas([]);
    setRelatorioLinhas([]);
    setResultados([]);
    setSubView("sessoes");
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
    if (s === 3) return true;
    if (s === 4) return relatorioLinhas.length > 0;
    if (s === 5) return resultados.length > 0;
    return false;
  };

  // Tela de lista de sessões com config
  // Sub-view: Plano de Contas
  if (!sessaoAtiva && subView === "plano") {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setSubView("home")}>
          <ArrowLeft className="w-3 h-3" /> Voltar
        </Button>
        <ApaeEmpresaPlanoCard />
      </div>
    );
  }

  // Sub-view: Configuração de Contas
  if (!sessaoAtiva && subView === "contas") {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setSubView("home")}>
          <ArrowLeft className="w-3 h-3" /> Voltar
        </Button>
        <ApaeEmpresaContasCard />
      </div>
    );
  }

  // Sub-view: Sessões
  if (!sessaoAtiva && subView === "sessoes") {
    return (
      <>
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setSubView("home")}>
            <ArrowLeft className="w-3 h-3" /> Voltar
          </Button>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Sessões de Lançamento</h3>
            <Button
              onClick={handleNovaSessao}
              disabled={criarSessao.isPending || !temPlano}
              size="sm"
              className="bg-gradient-to-r from-[hsl(var(--cyan))] to-[hsl(var(--blue))] text-background hover:opacity-90 shadow-[0_0_15px_hsl(var(--cyan)/0.3)]"
            >
              {criarSessao.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              Nova Sessão
            </Button>
          </div>

          {!temPlano && (
            <p className="text-xs text-muted-foreground italic">Configure o plano de contas e as contas antes de criar sessões.</p>
          )}

          {loadingSessoes ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--cyan))]" />
            </div>
          ) : sessoes.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-10 text-center">
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
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden bg-border/50">
                        <motion.div className="h-full bg-gradient-to-r from-[hsl(var(--cyan))] to-[hsl(var(--blue))]" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.6, delay: idx * 0.05 + 0.2 }} />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isConcluido ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-[hsl(var(--cyan)/0.1)] border border-[hsl(var(--cyan)/0.2)]"}`}>
                            {isConcluido ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-[hsl(var(--cyan))]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{s.nome_sessao || "Sessão sem nome"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</span>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                {s.tipo === "movimento_caixa" ? "Mov. Caixa" : "Contas Pagar"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <span className="text-[10px] font-mono text-[hsl(var(--cyan))]">{s.passo_atual}/5</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${isConcluido ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-[hsl(var(--cyan)/0.3)] text-[hsl(var(--cyan))] bg-[hsl(var(--cyan)/0.05)]"}`}>
                            {isConcluido ? "Concluída" : "Em andamento"}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeletarSessao(s.id); }}>
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

        {/* Dialog de nova sessão */}
        <Dialog open={showNovaDialog} onOpenChange={setShowNovaDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Nova Sessão de Lançamento
              </DialogTitle>
              <DialogDescription>
                A sessão será criada usando a configuração atual da empresa (plano de contas com {planoEmpresa.length} conta(s) e {mapeamentosEmpresa.length} mapeamento(s) de banco).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Tipo de sessão</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTipoSessao("contas_a_pagar")}
                    className={`p-3 rounded-lg border text-left transition-all ${tipoSessao === "contas_a_pagar" ? "border-[hsl(var(--cyan))] bg-[hsl(var(--cyan)/0.05)] shadow-[0_0_10px_hsl(var(--cyan)/0.15)]" : "border-border hover:border-muted-foreground/40"}`}
                  >
                    <p className="text-xs font-semibold">Contas a Pagar</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Relatório padrão de contas a pagar</p>
                  </button>
                  <button
                    onClick={() => setTipoSessao("movimento_caixa")}
                    className={`p-3 rounded-lg border text-left transition-all ${tipoSessao === "movimento_caixa" ? "border-[hsl(var(--cyan))] bg-[hsl(var(--cyan)/0.05)] shadow-[0_0_10px_hsl(var(--cyan)/0.15)]" : "border-border hover:border-muted-foreground/40"}`}
                  >
                    <p className="text-xs font-semibold">Movimento Caixa</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Relatório de movimento de caixa</p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Deseja atualizar algo antes?</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={wantUpdatePlano} onCheckedChange={(v) => setWantUpdatePlano(!!v)} />
                  <span className="text-sm">Atualizar o plano de contas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={wantUpdateBancos} onCheckedChange={(v) => setWantUpdateBancos(!!v)} />
                  <span className="text-sm">Reconfirmar contas de banco/aplicação</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNovaDialog(false)}>Cancelar</Button>
              <Button onClick={handleConfirmarNovaSessao} className="gap-2">
                {wantUpdatePlano || wantUpdateBancos ? (
                  <><RefreshCw className="w-4 h-4" /> Ir para Configuração</>
                ) : (
                  <><Plus className="w-4 h-4" /> Criar Sessão</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Home: 3 clickable cards
  if (!sessaoAtiva) {
    const contasBanco = planoEmpresa.filter(c => c.is_banco).length;
    const contasAplic = planoEmpresa.filter(c => c.is_aplicacao).length;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--cyan))] to-[hsl(var(--blue))] flex items-center justify-center shadow-[0_0_20px_hsl(var(--cyan)/0.4)]">
            <Zap className="w-4 h-4 text-background" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Lança APAE</h3>
            <p className="text-[10px] text-muted-foreground">Configuração e sessões de lançamento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Plano de Contas */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSubView("plano")}
            className="glass rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-[hsl(var(--cyan)/0.4)] hover:shadow-[0_0_25px_hsl(var(--cyan)/0.1)] space-y-3"
          >
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--cyan)/0.1)] border border-[hsl(var(--cyan)/0.2)] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-[hsl(var(--cyan))]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Plano de Contas</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Carregar e gerenciar o plano de contas da empresa</p>
            </div>
            {temPlano ? (
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                <CheckCircle2 className="w-3 h-3 mr-1" /> {planoEmpresa.length} contas
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                Não configurado
              </Badge>
            )}
          </motion.div>

          {/* Card 2: Configuração de Contas */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSubView("contas")}
            className="glass rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-[hsl(var(--cyan)/0.4)] hover:shadow-[0_0_25px_hsl(var(--cyan)/0.1)] space-y-3"
          >
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--cyan)/0.1)] border border-[hsl(var(--cyan)/0.2)] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[hsl(var(--cyan))]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Configuração de Contas</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Marcar bancos, aplicações e mapeamentos</p>
            </div>
            {contasBanco > 0 || contasAplic > 0 ? (
              <div className="flex gap-1.5">
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                  {contasBanco} banco(s)
                </Badge>
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                  {contasAplic} aplic.
                </Badge>
              </div>
            ) : (
              <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                {temPlano ? "Nenhuma conta marcada" : "Aguardando plano"}
              </Badge>
            )}
          </motion.div>

          {/* Card 3: Sessões */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSubView("sessoes")}
            className="glass rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-[hsl(var(--cyan)/0.4)] hover:shadow-[0_0_25px_hsl(var(--cyan)/0.1)] space-y-3"
          >
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--cyan)/0.1)] border border-[hsl(var(--cyan)/0.2)] flex items-center justify-center">
              <Play className="w-5 h-5 text-[hsl(var(--cyan))]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Sessões</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Criar e gerenciar sessões de lançamento</p>
            </div>
            {sessoes.length > 0 ? (
              <Badge variant="outline" className="text-[10px] border-[hsl(var(--cyan)/0.3)] text-[hsl(var(--cyan))] bg-[hsl(var(--cyan)/0.05)]">
                {sessoes.length} sessão(ões)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                Nenhuma sessão
              </Badge>
            )}
          </motion.div>
        </div>
      </div>
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

  // Wizard view (only steps 3-5)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleVoltarLista}>
          <ArrowLeft className="w-3 h-3" /> Sessões
        </Button>
        <div className="flex items-center gap-2">
          {sessaoInfo?.status === "concluido" && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">Concluída</span>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground font-mono">{sessaoInfo?.nome_sessao}</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {sessaoInfo?.tipo === "movimento_caixa" ? "Mov. Caixa" : "Contas Pagar"}
          </Badge>
        </div>
      </div>

      <ApaeWizardSteps current={step} onStepClick={setStep} canGoTo={canGoTo} />

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {step === 3 && (
            <ApaeStep3Relatorio
              linhas={relatorioLinhas}
              relatorioArquivo={sessaoInfo?.relatorio_arquivo || null}
              onSalvarRelatorio={handleSalvarRelatorio}
              onRemoverRelatorio={handleRemoverRelatorio}
              onNext={() => setStep(4)}
              onBack={handleVoltarLista}
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
