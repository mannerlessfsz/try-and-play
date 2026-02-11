import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApaeSessoes, type ApaePlanoContas, type ApaeRelatorioLinha, type ApaeResultado } from "@/hooks/useApaeSessoes";
import { useApaeBancoAplicacoes } from "@/hooks/useApaeBancoAplicacoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { ApaeWizardSteps, type ApaeStep } from "./apae/ApaeWizardSteps";
import { ApaeStep1PlanoContas } from "./apae/ApaeStep1PlanoContas";
import { ApaeStep2ContasBanco } from "./apae/ApaeStep2ContasBanco";
import { ApaeStep3Relatorio } from "./apae/ApaeStep3Relatorio";
import { ApaeStep4Processamento } from "./apae/ApaeStep4Processamento";
import { ApaeStep5Conferencia } from "./apae/ApaeStep5Conferencia";
import { Plus, FolderOpen, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LancaApaeTab() {
  const { empresaAtiva } = useEmpresaAtiva();
  const {
    sessoes, loadingSessoes,
    criarSessao, atualizarSessao, deletarSessao,
    buscarPlanoContas, salvarPlanoContas, atualizarContaBanco,
    buscarRelatorioLinhas, salvarRelatorioLinhas,
    buscarResultados, salvarResultados,
  } = useApaeSessoes();

  const [sessaoAtiva, setSessaoAtiva] = useState<string | null>(null);
  const [step, setStep] = useState<ApaeStep>(1);
  const [planoContas, setPlanoContas] = useState<ApaePlanoContas[]>([]);
  const [relatorioLinhas, setRelatorioLinhas] = useState<ApaeRelatorioLinha[]>([]);
  const [resultados, setResultados] = useState<ApaeResultado[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const { mapeamentos, loading: loadingMapeamentos, buscar: buscarMapeamentos } = useApaeBancoAplicacoes(sessaoAtiva);

  // Sempre que mudar de sessão, recarrega os mapeamentos (usados no Passo 4)
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
      // mapeamentos são carregados via useEffect acima

      // Determinar passo baseado nos dados
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

  // Selecionar sessão
  const handleSelecionarSessao = (id: string) => {
    setSessaoAtiva(id);
    carregarDadosSessao(id);
  };

  // Criar nova sessão
  const handleNovaSessao = async () => {
    try {
      const sessao = await criarSessao.mutateAsync(undefined);
      setSessaoAtiva(sessao.id);
      setPlanoContas([]);
      setRelatorioLinhas([]);
      setResultados([]);
      setStep(1);
    } catch {}
  };

  // Deletar sessão
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

  // Voltar para lista de sessões
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
      await salvarPlanoContas.mutateAsync({ sessaoId: sessaoAtiva, contas });
      await atualizarSessao.mutateAsync({ id: sessaoAtiva, plano_contas_arquivo: nomeArquivo, passo_atual: 1 });
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

  // handleAutoSugerir removed — user marks manually

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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Lança APAE — Sessões</h3>
          <Button onClick={handleNovaSessao} disabled={criarSessao.isPending}>
            {criarSessao.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Nova Sessão
          </Button>
        </div>

        {loadingSessoes ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessoes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma sessão encontrada. Crie uma nova para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {sessoes.map((s) => (
              <Card key={s.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSelecionarSessao(s.id)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-sm">{s.nome_sessao || "Sessão sem nome"}</p>
                    <p className="text-xs text-muted-foreground">
                      Criada em {new Date(s.created_at).toLocaleDateString("pt-BR")} — Passo {s.passo_atual}/5
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === "concluido" ? "default" : "secondary"}>
                      {s.status === "em_andamento" ? "Em andamento" : s.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDeletarSessao(s.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Tela do wizard
  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleVoltarLista}>
          ← Voltar às sessões
        </Button>
        <span className="text-sm text-muted-foreground">{sessaoInfo?.nome_sessao}</span>
      </div>

      <ApaeWizardSteps current={step} onStepClick={setStep} canGoTo={canGoTo} />

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
        />
      )}

      {step === 5 && (
        <ApaeStep5Conferencia
          resultados={resultados}
          onBack={() => setStep(4)}
        />
      )}
    </div>
  );
}
