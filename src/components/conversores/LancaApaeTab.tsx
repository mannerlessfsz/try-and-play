import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useApaeSessoes, type ApaePlanoContas, type ApaeRelatorioLinha, type ApaeResultado, type ApaeSessaoTipo } from "@/hooks/useApaeSessoes";
import type { DuplicadoCP } from "./apae/ApaeStep4Processamento";
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
  const [duplicadosCP, setDuplicadosCP] = useState<DuplicadoCP[]>([]);

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
                  const isMovCaixa = s.tipo === "movimento_caixa";
                  const accent = isMovCaixa ? "var(--orange)" : "var(--cyan)";
                  const accentFrom = isMovCaixa ? "hsl(var(--orange))" : "hsl(var(--cyan))";
                  const accentTo = isMovCaixa ? "hsl(var(--yellow))" : "hsl(var(--blue))";
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleSelecionarSessao(s.id)}
                      className="group relative glass rounded-xl p-3.5 cursor-pointer transition-all duration-300"
                      style={{
                        borderColor: `hsl(${accent} / 0)`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `hsl(${accent} / 0.4)`; e.currentTarget.style.boxShadow = `0 0 25px hsl(${accent} / 0.1)`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = `hsl(${accent} / 0)`; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden bg-border/50">
                        <motion.div className="h-full" style={{ background: `linear-gradient(to right, ${accentFrom}, ${accentTo})` }} initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.6, delay: idx * 0.05 + 0.2 }} />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isConcluido ? "bg-emerald-500/15 border border-emerald-500/30" : ""}`} style={!isConcluido ? { background: `hsl(${accent} / 0.1)`, border: `1px solid hsl(${accent} / 0.2)` } : undefined}>
                            {isConcluido ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4" style={{ color: `hsl(${accent})` }} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{s.nome_sessao || "Sessão sem nome"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</span>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5" style={{ borderColor: `hsl(${accent} / 0.4)`, color: `hsl(${accent})`, background: `hsl(${accent} / 0.08)` }}>
                                {isMovCaixa ? "Mov. Caixa" : "Contas Pagar"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <span className="text-[10px] font-mono" style={{ color: `hsl(${accent})` }}>{s.passo_atual}/5</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${isConcluido ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : ""}`} style={!isConcluido ? { borderColor: `hsl(${accent} / 0.3)`, color: `hsl(${accent})`, background: `hsl(${accent} / 0.05)` } : undefined}>
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

    const homeCards = [
      {
        id: "plano" as const,
        icon: FileSpreadsheet,
        title: "Plano de Contas",
        description: "Carregar e gerenciar o plano de contas da empresa para processamento APAE",
        color: "hsl(var(--cyan))",
        badge: temPlano
          ? { label: `${planoEmpresa.length} contas`, ok: true }
          : { label: "Não configurado", ok: false },
      },
      {
        id: "contas" as const,
        icon: Building2,
        title: "Configuração de Contas",
        description: "Marcar bancos, aplicações e configurar mapeamentos de relatórios",
        color: "hsl(var(--orange))",
        badge: contasBanco > 0 || contasAplic > 0
          ? { label: `${contasBanco} banco(s) · ${contasAplic} aplic.`, ok: true }
          : { label: temPlano ? "Nenhuma conta marcada" : "Aguardando plano", ok: false },
      },
      {
        id: "sessoes" as const,
        icon: Play,
        title: "Sessões de Lançamento",
        description: "Criar, gerenciar e processar sessões de lançamento de relatórios",
        color: "hsl(var(--blue))",
        badge: sessoes.length > 0
          ? { label: `${sessoes.length} sessão(ões)`, ok: true }
          : { label: "Nenhuma sessão", ok: false },
      },
    ];

    const bentoClasses = [
      "col-span-2 row-span-2",  // large featured
      "col-span-1 row-span-1",  // normal
      "col-span-1 row-span-1",  // normal
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(var(--cyan))] to-[hsl(var(--blue))] flex items-center justify-center shadow-[0_0_30px_hsl(var(--cyan)/0.5)]">
            <Zap className="w-5 h-5 text-background" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Lança APAE</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Configuração e sessões de lançamento</p>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-[140px] md:auto-rows-[160px] gap-3">
          {homeCards.map((card, index) => {
            const Icon = card.icon;
            const sizeClass = bentoClasses[index];
            const isLarge = sizeClass.includes("col-span-2") && sizeClass.includes("row-span-2");

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, type: "spring", stiffness: 200, damping: 20 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubView(card.id)}
                className={`glass rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-[0_0_35px_hsl(var(--cyan)/0.15)] group relative overflow-hidden flex flex-col ${sizeClass}`}
                style={{ borderColor: 'transparent' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = card.color.replace(')', '/0.4)').replace('hsl(', 'hsl(');
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 35px ${card.color.replace(')', '/0.15)').replace('hsl(', 'hsl(')}`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Radial ambient glow */}
                <div
                  className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none"
                  style={{ background: card.color }}
                />

                {/* Bottom progress bar decoration */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{ background: `linear-gradient(90deg, ${card.color}, transparent)` }}
                    initial={{ width: "0%" }}
                    whileInView={{ width: card.badge.ok ? "80%" : "30%" }}
                    transition={{ duration: 1, delay: index * 0.08 + 0.3 }}
                  />
                </div>

                <div className={`relative z-10 flex flex-col h-full ${isLarge ? 'p-6' : 'p-4'}`}>
                  {/* Icon */}
                  <div
                    className={`rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 shrink-0 ${
                      isLarge ? 'w-14 h-14 mb-4' : 'w-10 h-10 mb-3'
                    }`}
                    style={{
                      backgroundColor: card.color.replace(')', '/0.12)').replace('hsl(', 'hsl('),
                      borderColor: card.color.replace(')', '/0.25)').replace('hsl(', 'hsl('),
                    }}
                  >
                    <Icon className={`${isLarge ? 'w-7 h-7' : 'w-5 h-5'}`} style={{ color: card.color }} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-h-0">
                    <p className={`font-bold leading-tight ${isLarge ? 'text-lg' : 'text-sm'}`}>
                      {card.title}
                    </p>
                    <p className={`text-muted-foreground mt-1 ${isLarge ? 'text-xs line-clamp-3' : 'text-[11px] line-clamp-2'}`}>
                      {card.description}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <Badge
                      variant="outline"
                      className={`${isLarge ? 'text-[10px] px-2 py-0.5' : 'text-[9px] px-1.5 py-0'}`}
                      style={card.badge.ok ? {
                        borderColor: 'hsl(var(--emerald, 160 84% 39%) / 0.4)',
                        color: 'hsl(160 84% 60%)',
                        backgroundColor: 'hsl(160 84% 39% / 0.1)',
                      } : {
                        borderColor: 'hsl(var(--muted-foreground) / 0.3)',
                        color: 'hsl(var(--muted-foreground))',
                      }}
                    >
                      {card.badge.ok && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {card.badge.label}
                    </Badge>
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      whileHover={{ x: 2 }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <ArrowLeft className={`rotate-180 text-muted-foreground ${isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
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
              sessaoTipo={sessaoInfo?.tipo || "contas_a_pagar"}
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
              sessaoTipo={sessaoInfo?.tipo || "contas_a_pagar"}
              empresaId={empresaAtiva?.id}
              sessaoId={sessaoAtiva || undefined}
              onDuplicadosFound={setDuplicadosCP}
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
              duplicadosCP={duplicadosCP}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
