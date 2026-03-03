import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Trash2, Building2, TrendingUp, TrendingDown,
  FileText, Plus, Calculator, Download, ChevronDown, ChevronUp,
  ArrowLeft, Users, Layers, GitBranch, BarChart3, Wallet,
  ArrowRight, Loader2, Network, FileUp, CheckCircle, AlertCircle,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

interface GrupoEconomico {
  id: string;
  nome: string;
  descricao: string | null;
  cnpj_holding: string | null;
  created_at: string;
}

interface Investida {
  id: string;
  grupo_id: string;
  nome: string;
  cnpj: string | null;
  percentual_participacao: number;
  tipo_empresa: string;
  ativa: boolean;
}

interface Participacao {
  id: string;
  grupo_id: string;
  id_investidora: string;
  id_investida: string;
  percentual: number;
  data_inicio: string;
  data_fim: string | null;
}

interface ResultadoPeriodo {
  id: string;
  id_empresa: string;
  periodo: string;
  lucro_pre_equivalencia: number;
  dividendos_declarados: number;
}

interface PlSnapshot {
  id: string;
  id_empresa: string;
  periodo: string;
  pl_abertura: number;
  ajuste_equivalencia: number;
  pl_fechamento: number;
  processado: boolean;
}

interface CalculoResponse {
  periodo: string;
  empresas: {
    id: string;
    nome: string;
    tipo: string;
    lucro_pre_equivalencia: number;
    dividendos: number;
    equivalencia: number;
    tipo_resultado: string;
    pl_abertura: number;
    pl_fechamento: number;
  }[];
  valor_socios: {
    socio: string;
    tipo: string;
    empresa: string;
    percentual: number;
    valor_patrimonial: number;
  }[];
  totais: {
    total_equivalencia: number;
    total_receitas: number;
    total_despesas: number;
  };
  matriz: { P: number[][]; dimensao: number };
}

// ============================================================================
// HELPERS
// ============================================================================

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

type StepKey = "empresas" | "participacoes" | "resultados" | "processar" | "relatorio";

const STEPS: { key: StepKey; label: string; icon: any }[] = [
  { key: "empresas", label: "Empresas", icon: Building2 },
  { key: "participacoes", label: "Participações", icon: GitBranch },
  { key: "resultados", label: "Resultados Período", icon: BarChart3 },
  { key: "processar", label: "Processar", icon: Calculator },
  { key: "relatorio", label: "Relatório", icon: Wallet },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function EquivalenciaPatrimonial() {
  // Navigation
  const [view, setView] = useState<"grupos" | "workspace">("grupos");
  const [grupoAtivo, setGrupoAtivo] = useState<GrupoEconomico | null>(null);
  const [step, setStep] = useState<StepKey>("empresas");

  // Data
  const [grupos, setGrupos] = useState<GrupoEconomico[]>([]);
  const [investidas, setInvestidas] = useState<Investida[]>([]);
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [resultadosPeriodo, setResultadosPeriodo] = useState<ResultadoPeriodo[]>([]);
  const [plSnapshots, setPlSnapshots] = useState<PlSnapshot[]>([]);
  const [calculoResult, setCalculoResult] = useState<CalculoResponse | null>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [uploadMode, setUploadMode] = useState<"individual" | "lote">("individual");
  const [uploadEmpresa, setUploadEmpresa] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showNovoGrupo, setShowNovoGrupo] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ nome: "", descricao: "", cnpj: "" });
  const [novaInvestida, setNovaInvestida] = useState({ nome: "", cnpj: "", percentual: "", tipo: "operacional" });
  const [novaParticipacao, setNovaParticipacao] = useState({ investidora: "", investida: "", percentual: "" });
  const [novoResultado, setNovoResultado] = useState({ empresa: "", lucro: "", dividendos: "" });
  const [novoPL, setNovoPL] = useState({ empresa: "", pl_abertura: "" });

  // ============================================================================
  // FETCH
  // ============================================================================

  const fetchGrupos = async () => {
    setLoading(true);
    const { data } = await supabase.from("grupos_economicos").select("*").order("created_at", { ascending: false });
    setGrupos((data as any[]) || []);
    setLoading(false);
  };

  const fetchAll = async (grupoId: string) => {
    const [inv, part] = await Promise.all([
      supabase.from("grupo_investidas").select("*").eq("grupo_id", grupoId).order("nome"),
      supabase.from("eq_participacoes").select("*").eq("grupo_id", grupoId).order("created_at"),
    ]);
    setInvestidas((inv.data as any[]) || []);
    setParticipacoes((part.data as any[]) || []);
  };

  const fetchPeriodoData = async (grupoId: string, per: string) => {
    const ids = investidas.map(i => i.id);
    if (ids.length === 0) return;
    const [res, snap] = await Promise.all([
      supabase.from("eq_resultado_periodo").select("*").eq("periodo", per).in("id_empresa", ids),
      supabase.from("eq_pl_snapshot").select("*").eq("periodo", per).in("id_empresa", ids),
    ]);
    setResultadosPeriodo((res.data as any[]) || []);
    setPlSnapshots((snap.data as any[]) || []);
  };

  useEffect(() => { fetchGrupos(); }, []);

  useEffect(() => {
    if (grupoAtivo && investidas.length > 0) fetchPeriodoData(grupoAtivo.id, periodo);
  }, [periodo, investidas.length]);

  const entrarGrupo = async (grupo: GrupoEconomico) => {
    setGrupoAtivo(grupo);
    setView("workspace");
    setStep("empresas");
    setCalculoResult(null);
    await fetchAll(grupo.id);
  };

  const voltarGrupos = () => {
    setView("grupos");
    setGrupoAtivo(null);
    setInvestidas([]);
    setParticipacoes([]);
    setResultadosPeriodo([]);
    setPlSnapshots([]);
    setCalculoResult(null);
  };

  // ============================================================================
  // CRUD
  // ============================================================================

  const criarGrupo = async () => {
    if (!novoGrupo.nome.trim()) { toast.error("Informe o nome do grupo"); return; }
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("grupos_economicos").insert({
      nome: novoGrupo.nome, descricao: novoGrupo.descricao || null,
      cnpj_holding: novoGrupo.cnpj || null, created_by: user?.user?.id || null,
    });
    if (error) { toast.error("Erro ao criar grupo"); return; }
    toast.success("Grupo criado");
    setNovoGrupo({ nome: "", descricao: "", cnpj: "" });
    setShowNovoGrupo(false);
    fetchGrupos();
  };

  const excluirGrupo = async (id: string) => {
    await supabase.from("grupos_economicos").delete().eq("id", id);
    toast.success("Grupo excluído");
    fetchGrupos();
  };

  const adicionarInvestida = async () => {
    if (!grupoAtivo || !novaInvestida.nome || !novaInvestida.percentual) { toast.error("Preencha nome e percentual"); return; }
    const perc = parseFloat(novaInvestida.percentual);
    if (isNaN(perc) || perc <= 0 || perc > 100) { toast.error("Percentual entre 0 e 100"); return; }
    const { error } = await supabase.from("grupo_investidas").insert({
      grupo_id: grupoAtivo.id, nome: novaInvestida.nome,
      cnpj: novaInvestida.cnpj || null, percentual_participacao: perc,
      tipo_empresa: novaInvestida.tipo,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Empresa adicionada");
    setNovaInvestida({ nome: "", cnpj: "", percentual: "", tipo: "operacional" });
    fetchAll(grupoAtivo.id);
  };

  const removerInvestida = async (id: string) => {
    await supabase.from("grupo_investidas").delete().eq("id", id);
    toast.success("Empresa removida");
    if (grupoAtivo) fetchAll(grupoAtivo.id);
  };

  const adicionarParticipacao = async () => {
    if (!grupoAtivo || !novaParticipacao.investidora || !novaParticipacao.investida || !novaParticipacao.percentual) {
      toast.error("Preencha todos os campos"); return;
    }
    if (novaParticipacao.investidora === novaParticipacao.investida) {
      toast.error("Empresa não pode investir nela mesma"); return;
    }
    const perc = parseFloat(novaParticipacao.percentual);
    if (isNaN(perc) || perc <= 0 || perc > 100) { toast.error("Percentual entre 0 e 100"); return; }
    const { error } = await supabase.from("eq_participacoes").insert({
      grupo_id: grupoAtivo.id, id_investidora: novaParticipacao.investidora,
      id_investida: novaParticipacao.investida, percentual: perc,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Participação registrada");
    setNovaParticipacao({ investidora: "", investida: "", percentual: "" });
    fetchAll(grupoAtivo.id);
  };

  const removerParticipacao = async (id: string) => {
    await supabase.from("eq_participacoes").delete().eq("id", id);
    toast.success("Participação removida");
    if (grupoAtivo) fetchAll(grupoAtivo.id);
  };

  const salvarResultado = async () => {
    if (!novoResultado.empresa || !novoResultado.lucro) { toast.error("Preencha empresa e lucro"); return; }
    const { error } = await supabase.from("eq_resultado_periodo").upsert({
      id_empresa: novoResultado.empresa, periodo,
      lucro_pre_equivalencia: parseFloat(novoResultado.lucro) || 0,
      dividendos_declarados: parseFloat(novoResultado.dividendos) || 0,
    }, { onConflict: "id_empresa,periodo" });
    if (error) { toast.error(error.message); return; }
    toast.success("Resultado salvo");
    setNovoResultado({ empresa: "", lucro: "", dividendos: "" });
    if (grupoAtivo) fetchPeriodoData(grupoAtivo.id, periodo);
  };

  const salvarPLAbertura = async () => {
    if (!novoPL.empresa || !novoPL.pl_abertura) { toast.error("Preencha empresa e PL"); return; }
    const { error } = await supabase.from("eq_pl_snapshot").upsert({
      id_empresa: novoPL.empresa, periodo: periodoAnterior(periodo),
      pl_abertura: 0, ajuste_equivalencia: 0,
      pl_fechamento: parseFloat(novoPL.pl_abertura) || 0,
      processado: true,
    }, { onConflict: "id_empresa,periodo" });
    if (error) { toast.error(error.message); return; }
    toast.success("PL de abertura salvo (como fechamento do período anterior)");
    setNovoPL({ empresa: "", pl_abertura: "" });
    if (grupoAtivo) fetchPeriodoData(grupoAtivo.id, periodo);
  };

  // ============================================================================
  // UPLOAD E PARSING DE BALANCETES
  // ============================================================================

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processarUploadIndividual = async (files: FileList) => {
    if (!uploadEmpresa) { toast.error("Selecione a empresa primeiro"); return; }
    const empresa = investidas.find(i => i.id === uploadEmpresa);
    if (!empresa) return;

    setUploading(true);
    try {
      const fileData = [];
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        fileData.push({
          filename: file.name,
          content_base64: base64,
          empresa_id: empresa.id,
          empresa_nome: empresa.nome,
        });
      }

      const { data, error } = await supabase.functions.invoke("parse-balancete", {
        body: { files: fileData },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setUploadResults(prev => [...prev, ...(data.results || [])]);

      // Auto-populate results for successful extractions
      for (const result of data.results || []) {
        if (result.success && result.data) {
          await autoSaveExtractedData(result.empresa_id, result.data);
        }
      }

      const successCount = (data.results || []).filter((r: any) => r.success).length;
      const failCount = (data.results || []).filter((r: any) => !r.success).length;
      if (successCount > 0) toast.success(`${successCount} arquivo(s) processado(s) com sucesso`);
      if (failCount > 0) toast.error(`${failCount} arquivo(s) com erro`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const processarUploadLote = async (files: FileList) => {
    setUploading(true);
    try {
      const fileData = [];
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        fileData.push({
          filename: file.name,
          content_base64: base64,
        });
      }

      const { data, error } = await supabase.functions.invoke("parse-balancete", {
        body: { files: fileData },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Try to match by CNPJ
      const results = (data.results || []).map((result: any) => {
        if (result.success && result.data?.cnpj) {
          const cnpjLimpo = result.data.cnpj.replace(/\D/g, "");
          const match = investidas.find(i => i.cnpj?.replace(/\D/g, "") === cnpjLimpo);
          if (match) {
            return { ...result, empresa_id: match.id, empresa_nome: match.nome, matched: true };
          }
        }
        return { ...result, matched: false };
      });

      setUploadResults(prev => [...prev, ...results]);

      // Auto-save matched results
      for (const result of results) {
        if (result.success && result.matched && result.empresa_id && result.data) {
          await autoSaveExtractedData(result.empresa_id, result.data);
        }
      }

      const matched = results.filter((r: any) => r.matched && r.success).length;
      const unmatched = results.filter((r: any) => !r.matched && r.success).length;
      if (matched > 0) toast.success(`${matched} balancete(s) vinculado(s) automaticamente por CNPJ`);
      if (unmatched > 0) toast.info(`${unmatched} arquivo(s) sem vínculo automático — vincule manualmente`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar arquivos");
    } finally {
      setUploading(false);
    }
  };

  const autoSaveExtractedData = async (empresaId: string, data: any) => {
    // Save resultado
    await supabase.from("eq_resultado_periodo").upsert({
      id_empresa: empresaId,
      periodo,
      lucro_pre_equivalencia: data.resultado_periodo || 0,
      dividendos_declarados: data.dividendos_declarados || 0,
    }, { onConflict: "id_empresa,periodo" });

    // Save PL as snapshot of previous period (abertura)
    if (data.patrimonio_liquido) {
      await supabase.from("eq_pl_snapshot").upsert({
        id_empresa: empresaId,
        periodo: periodoAnterior(periodo),
        pl_abertura: 0,
        ajuste_equivalencia: 0,
        pl_fechamento: data.patrimonio_liquido,
        processado: true,
      }, { onConflict: "id_empresa,periodo" });
    }

    if (grupoAtivo) fetchPeriodoData(grupoAtivo.id, periodo);
  };

  const vincularResultadoManual = async (resultIndex: number, empresaId: string) => {
    const result = uploadResults[resultIndex];
    if (!result?.success || !result.data) return;

    await autoSaveExtractedData(empresaId, result.data);
    const empresa = investidas.find(i => i.id === empresaId);
    setUploadResults(prev => prev.map((r, i) => i === resultIndex ? { ...r, empresa_id: empresaId, empresa_nome: empresa?.nome, matched: true } : r));
    toast.success(`Dados vinculados a ${empresa?.nome}`);
  };

  // ============================================================================
  // PROCESSAR MOTOR MATRICIAL
  // ============================================================================

  const processarEquivalencia = async () => {
    if (!grupoAtivo) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("calcular-equivalencia", {
        body: { grupo_id: grupoAtivo.id, periodo },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCalculoResult(data);
      setStep("relatorio");
      toast.success("Equivalência calculada com sucesso!");
      fetchPeriodoData(grupoAtivo.id, periodo);
    } catch (err: any) {
      toast.error(err.message || "Erro no processamento");
    } finally {
      setProcessing(false);
    }
  };

  const exportarCSV = () => {
    if (!calculoResult) return;
    const headers = ["Empresa", "Tipo", "Lucro Pré-Eq", "Dividendos", "Equivalência", "Tipo Resultado", "PL Abertura", "PL Fechamento"];
    const rows = calculoResult.empresas.map(e => [e.nome, e.tipo, e.lucro_pre_equivalencia, e.dividendos, e.equivalencia, e.tipo_resultado, e.pl_abertura, e.pl_fechamento].join(";"));
    const csv = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `equivalencia_${grupoAtivo?.nome}_${periodo}.csv`;
    a.click();
    toast.success("CSV exportado");
  };

  const getNome = (id: string) => investidas.find(i => i.id === id)?.nome || "—";

  // ============================================================================
  // RENDER: SELEÇÃO DE GRUPO
  // ============================================================================

  if (view === "grupos") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--orange)/0.15)] border border-[hsl(var(--orange)/0.25)] flex items-center justify-center">
              <Layers className="w-5 h-5 text-[hsl(var(--orange))]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Equivalência Patrimonial</h2>
              <p className="text-xs text-muted-foreground">Selecione ou crie um grupo econômico</p>
            </div>
          </div>
          <Button onClick={() => setShowNovoGrupo(!showNovoGrupo)} className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs">
            <Plus className="w-4 h-4" /> Novo Grupo
          </Button>
        </div>

        <AnimatePresence>
          {showNovoGrupo && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="glass rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold">Criar Grupo Econômico</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input placeholder="Nome do grupo *" value={novoGrupo.nome} onChange={e => setNovoGrupo(p => ({ ...p, nome: e.target.value }))} className="text-sm" />
                  <Input placeholder="CNPJ da holding (opcional)" value={novoGrupo.cnpj} onChange={e => setNovoGrupo(p => ({ ...p, cnpj: e.target.value }))} className="text-sm" />
                  <Input placeholder="Descrição (opcional)" value={novoGrupo.descricao} onChange={e => setNovoGrupo(p => ({ ...p, descricao: e.target.value }))} className="text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={criarGrupo} size="sm" className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs">
                    <Plus className="w-3.5 h-3.5" /> Criar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowNovoGrupo(false)} className="text-xs">Cancelar</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="glass rounded-xl p-8 text-center"><p className="text-sm text-muted-foreground animate-pulse">Carregando...</p></div>
        ) : grupos.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">Nenhum grupo cadastrado</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {grupos.map((grupo, i) => (
              <motion.div key={grupo.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-5 cursor-pointer group hover:shadow-[0_0_30px_hsl(var(--orange)/0.12)] transition-all duration-300 border border-transparent hover:border-[hsl(var(--orange)/0.25)]"
                onClick={() => entrarGrupo(grupo)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--orange)/0.1)] border border-[hsl(var(--orange)/0.2)] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="w-5 h-5 text-[hsl(var(--orange))]" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => { e.stopPropagation(); excluirGrupo(grupo.id); }}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
                <p className="text-sm font-bold mb-1">{grupo.nome}</p>
                {grupo.descricao && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{grupo.descricao}</p>}
                {grupo.cnpj_holding && <Badge variant="outline" className="text-[10px]">{grupo.cnpj_holding}</Badge>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: WORKSPACE
  // ============================================================================

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={voltarGrupos}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--orange)/0.15)] border border-[hsl(var(--orange)/0.25)] flex items-center justify-center">
          <Network className="w-5 h-5 text-[hsl(var(--orange))]" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{grupoAtivo?.nome}</h2>
          <p className="text-xs text-muted-foreground">{grupoAtivo?.cnpj_holding || "Grupo Econômico"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Período:</span>
          <Input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-40 h-8 text-xs" />
        </div>
      </div>

      {/* Steps */}
      <div className="flex gap-1 glass rounded-xl p-1 overflow-x-auto">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = step === s.key;
          const isDisabled = s.key === "relatorio" && !calculoResult;
          return (
            <button key={s.key} onClick={() => !isDisabled && setStep(s.key)} disabled={isDisabled}
              className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}>
              {isActive && <motion.div layoutId="eq-step-v2" className="absolute inset-0 rounded-lg bg-[hsl(var(--orange)/0.15)] border border-[hsl(var(--orange)/0.3)]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
              <span className={`relative z-10 flex items-center gap-1 ${isActive ? "text-[hsl(var(--orange))]" : "text-muted-foreground"}`}>
                <Icon className="w-3.5 h-3.5" /><span className="hidden md:inline">{s.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* === STEP: EMPRESAS === */}
        {step === "empresas" && (
          <motion.div key="empresas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Cadastrar Empresa do Grupo</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Input placeholder="Razão Social *" value={novaInvestida.nome} onChange={e => setNovaInvestida(p => ({ ...p, nome: e.target.value }))} className="text-sm" />
                <Input placeholder="CNPJ" value={novaInvestida.cnpj} onChange={e => setNovaInvestida(p => ({ ...p, cnpj: e.target.value }))} className="text-sm" />
                <Input placeholder="% Capital Social" type="number" value={novaInvestida.percentual} onChange={e => setNovaInvestida(p => ({ ...p, percentual: e.target.value }))} className="text-sm" />
                <Select value={novaInvestida.tipo} onValueChange={v => setNovaInvestida(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="holding">Holding</SelectItem>
                    <SelectItem value="mista">Mista</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={adicionarInvestida} className="gap-1 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
            </div>

            {investidas.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {investidas.map((inv, i) => (
                  <motion.div key={inv.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="glass rounded-xl p-3 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--orange)/0.1)] flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-[hsl(var(--orange))]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{inv.nome}</p>
                        <p className="text-[11px] text-muted-foreground">{inv.cnpj || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{inv.tipo_empresa}</Badge>
                      <Badge className="bg-[hsl(var(--orange)/0.1)] text-[hsl(var(--orange))] border-[hsl(var(--orange)/0.2)] text-[10px]">{fmtPct(inv.percentual_participacao)}</Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removerInvestida(inv.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {investidas.length >= 2 && (
              <Button onClick={() => setStep("participacoes")} className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs">
                Próximo: Participações <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        )}

        {/* === STEP: PARTICIPAÇÕES CRUZADAS === */}
        {step === "participacoes" && (
          <motion.div key="participacoes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Registrar Participação Cruzada</p>
              <p className="text-[11px] text-muted-foreground">Defina qual empresa investe em qual, e o percentual de participação.</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={novaParticipacao.investidora} onValueChange={v => setNovaParticipacao(p => ({ ...p, investidora: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Investidora" /></SelectTrigger>
                  <SelectContent>{investidas.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={novaParticipacao.investida} onValueChange={v => setNovaParticipacao(p => ({ ...p, investida: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Investida" /></SelectTrigger>
                  <SelectContent>{investidas.filter(i => i.id !== novaParticipacao.investidora).map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="% Participação" type="number" value={novaParticipacao.percentual} onChange={e => setNovaParticipacao(p => ({ ...p, percentual: e.target.value }))} className="text-sm" />
                <Button onClick={adicionarParticipacao} className="gap-1 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs">
                  <GitBranch className="w-4 h-4" /> Registrar
                </Button>
              </div>
            </div>

            {participacoes.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <GitBranch className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-sm text-muted-foreground">Nenhuma participação cruzada registrada</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {participacoes.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="glass rounded-xl p-3 flex items-center justify-between group">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-[11px]">{getNome(p.id_investidora)}</Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-[11px]">{getNome(p.id_investida)}</Badge>
                      <Badge className="bg-[hsl(var(--orange)/0.1)] text-[hsl(var(--orange))] border-[hsl(var(--orange)/0.2)] text-[10px]">{fmtPct(p.percentual)}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removerParticipacao(p.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("empresas")} className="text-xs">Voltar</Button>
              <Button onClick={() => setStep("resultados")} className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs">
                Próximo: Resultados <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* === STEP: RESULTADOS DO PERÍODO === */}
        {step === "resultados" && (
          <motion.div key="resultados" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            
            {/* Upload de Balancetes — IA */}
            <div className="glass rounded-xl p-4 space-y-4 border border-[hsl(var(--orange)/0.15)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[hsl(var(--orange))]" />
                <p className="text-sm font-semibold">Importar Balancetes via IA</p>
                <Badge className="bg-[hsl(var(--orange)/0.1)] text-[hsl(var(--orange))] border-[hsl(var(--orange)/0.2)] text-[9px]">Gemini</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Envie balancetes em PDF ou Excel. A IA extrai automaticamente PL, resultado e dividendos.
              </p>

              {/* Mode Toggle */}
              <div className="flex gap-1 bg-foreground/[0.03] rounded-lg p-1">
                <button
                  onClick={() => setUploadMode("individual")}
                  className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    uploadMode === "individual" ? "bg-[hsl(var(--orange)/0.15)] text-[hsl(var(--orange))]" : "text-muted-foreground"
                  }`}
                >
                  <FileUp className="w-3 h-3 inline mr-1" /> Por Empresa
                </button>
                <button
                  onClick={() => setUploadMode("lote")}
                  className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    uploadMode === "lote" ? "bg-[hsl(var(--orange)/0.15)] text-[hsl(var(--orange))]" : "text-muted-foreground"
                  }`}
                >
                  <Upload className="w-3 h-3 inline mr-1" /> Em Lote (CNPJ)
                </button>
              </div>

              {uploadMode === "individual" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select value={uploadEmpresa} onValueChange={setUploadEmpresa}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                    <SelectContent>{investidas.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
                  </Select>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && processarUploadIndividual(e.target.files)}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !uploadEmpresa}
                    className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                    {uploading ? "Processando..." : "Enviar Balancete"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    Envie múltiplos arquivos. O sistema identifica automaticamente cada empresa pelo CNPJ no documento.
                  </p>
                  <input
                    ref={batchFileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && processarUploadLote(e.target.files)}
                  />
                  <Button
                    onClick={() => batchFileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? "Processando..." : "Enviar Balancetes em Lote"}
                  </Button>
                </div>
              )}

              {/* Upload Results */}
              {uploadResults.length > 0 && (
                <div className="space-y-2 mt-3 border-t border-border/30 pt-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">Resultados da Extração</p>
                  {uploadResults.map((result, i) => (
                    <div key={i} className={`rounded-lg p-3 flex items-start gap-3 ${result.success ? "bg-[hsl(var(--cyan)/0.05)] border border-[hsl(var(--cyan)/0.15)]" : "bg-destructive/5 border border-destructive/15"}`}>
                      {result.success ? <CheckCircle className="w-4 h-4 text-[hsl(var(--cyan))] mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{result.filename}</p>
                        {result.success ? (
                          <div className="space-y-1 mt-1">
                            {result.data?.razao_social && <p className="text-[10px] text-muted-foreground">Empresa: {result.data.razao_social}</p>}
                            <div className="flex gap-3 flex-wrap">
                              <span className="text-[10px]">PL: <span className="font-mono font-bold text-[hsl(var(--cyan))]">{fmt(result.data?.patrimonio_liquido || 0)}</span></span>
                              <span className="text-[10px]">Resultado: <span className={`font-mono font-bold ${(result.data?.resultado_periodo || 0) >= 0 ? "text-[hsl(var(--cyan))]" : "text-[hsl(var(--orange))]"}`}>{fmt(result.data?.resultado_periodo || 0)}</span></span>
                              <span className="text-[10px]">Dividendos: <span className="font-mono">{fmt(result.data?.dividendos_declarados || 0)}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[9px] ${result.data?.confianca === "alta" ? "border-[hsl(var(--cyan)/0.3)] text-[hsl(var(--cyan))]" : result.data?.confianca === "media" ? "border-[hsl(var(--orange)/0.3)] text-[hsl(var(--orange))]" : "border-destructive/30 text-destructive"}`}>
                                Confiança: {result.data?.confianca || "—"}
                              </Badge>
                              {result.matched ? (
                                <Badge className="bg-[hsl(var(--cyan)/0.1)] text-[hsl(var(--cyan))] text-[9px]">
                                  <CheckCircle className="w-2.5 h-2.5 mr-1" /> {result.empresa_nome}
                                </Badge>
                              ) : (
                                <Select onValueChange={v => vincularResultadoManual(i, v)}>
                                  <SelectTrigger className="h-5 text-[10px] w-40 border-dashed">
                                    <SelectValue placeholder="Vincular empresa..." />
                                  </SelectTrigger>
                                  <SelectContent>{investidas.map(inv => <SelectItem key={inv.id} value={inv.id} className="text-xs">{inv.nome}</SelectItem>)}</SelectContent>
                                </Select>
                              )}
                            </div>
                            {result.data?.observacoes && <p className="text-[10px] text-muted-foreground italic">{result.data.observacoes}</p>}
                          </div>
                        ) : (
                          <p className="text-[10px] text-destructive">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Entrada manual — Lucro pré-equivalência */}
            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Entrada Manual — Lucro Pré-Equivalência — {periodo}</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={novoResultado.empresa} onValueChange={v => setNovoResultado(p => ({ ...p, empresa: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent>{investidas.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Lucro (R$)" type="number" value={novoResultado.lucro} onChange={e => setNovoResultado(p => ({ ...p, lucro: e.target.value }))} className="text-sm" />
                <Input placeholder="Dividendos (R$)" type="number" value={novoResultado.dividendos} onChange={e => setNovoResultado(p => ({ ...p, dividendos: e.target.value }))} className="text-sm" />
                <Button onClick={salvarResultado} className="gap-1 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs">
                  <BarChart3 className="w-4 h-4" /> Salvar
                </Button>
              </div>
            </div>

            {/* Resultados salvos */}
            {resultadosPeriodo.length > 0 && (
              <div className="grid gap-2">
                {resultadosPeriodo.map(r => (
                  <div key={r.id} className="glass rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm font-medium">{getNome(r.id_empresa)}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Lucro</p>
                        <p className={`text-xs font-mono font-bold ${r.lucro_pre_equivalencia >= 0 ? "text-[hsl(var(--cyan))]" : "text-[hsl(var(--orange))]"}`}>{fmt(r.lucro_pre_equivalencia)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Dividendos</p>
                        <p className="text-xs font-mono">{fmt(r.dividendos_declarados)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PL Abertura */}
            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">PL de Abertura (opcional)</p>
              <p className="text-[11px] text-muted-foreground">Informe o PL inicial se for o primeiro período. Será registrado como fechamento do período anterior.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={novoPL.empresa} onValueChange={v => setNovoPL(p => ({ ...p, empresa: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent>{investidas.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="PL de Abertura (R$)" type="number" value={novoPL.pl_abertura} onChange={e => setNovoPL(p => ({ ...p, pl_abertura: e.target.value }))} className="text-sm" />
                <Button onClick={salvarPLAbertura} variant="outline" className="text-xs gap-1"><Wallet className="w-3.5 h-3.5" /> Salvar PL</Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("participacoes")} className="text-xs">Voltar</Button>
              <Button onClick={() => setStep("processar")} className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs"
                disabled={resultadosPeriodo.length === 0}>
                Próximo: Processar <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* === STEP: PROCESSAR === */}
        {step === "processar" && (
          <motion.div key="processar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-xl p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--orange)/0.15)] border border-[hsl(var(--orange)/0.25)] flex items-center justify-center mx-auto">
                <Calculator className="w-8 h-8 text-[hsl(var(--orange))]" />
              </div>
              <div>
                <h3 className="text-base font-bold">Motor Matricial de Equivalência</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Cálculo: <code className="bg-foreground/5 px-1.5 py-0.5 rounded text-[10px]">(I - P)⁻¹ × P × L</code>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="rounded-lg bg-foreground/[0.03] p-3">
                  <p className="text-[10px] text-muted-foreground">Empresas</p>
                  <p className="text-lg font-bold text-[hsl(var(--orange))]">{investidas.length}</p>
                </div>
                <div className="rounded-lg bg-foreground/[0.03] p-3">
                  <p className="text-[10px] text-muted-foreground">Participações</p>
                  <p className="text-lg font-bold text-[hsl(var(--orange))]">{participacoes.length}</p>
                </div>
                <div className="rounded-lg bg-foreground/[0.03] p-3">
                  <p className="text-[10px] text-muted-foreground">Resultados</p>
                  <p className="text-lg font-bold text-[hsl(var(--orange))]">{resultadosPeriodo.length}</p>
                </div>
              </div>
              <Button onClick={processarEquivalencia} disabled={processing} size="lg"
                className="gap-2 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background">
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                {processing ? "Calculando..." : "Processar Equivalência"}
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => setStep("resultados")} className="text-xs">Voltar</Button>
          </motion.div>
        )}

        {/* === STEP: RELATÓRIO === */}
        {step === "relatorio" && calculoResult && (
          <motion.div key="relatorio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Totais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "Total Receitas", value: calculoResult.totais.total_receitas, icon: TrendingUp, color: "hsl(var(--cyan))" },
                { label: "Total Despesas", value: Math.abs(calculoResult.totais.total_despesas), icon: TrendingDown, color: "hsl(var(--orange))" },
                { label: "Resultado Líquido", value: calculoResult.totais.total_equivalencia, icon: Calculator, color: calculoResult.totais.total_equivalencia >= 0 ? "hsl(var(--cyan))" : "hsl(var(--orange))" },
              ].map(c => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4" style={{ color: c.color }} /><span className="text-xs text-muted-foreground">{c.label}</span></div>
                    <p className="text-lg font-bold font-mono" style={{ color: c.color }}>{fmt(c.value)}</p>
                  </div>
                );
              })}
            </div>

            {/* Por empresa */}
            <div className="space-y-3">
              {calculoResult.empresas.map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[hsl(var(--orange))]" />
                      <span className="text-sm font-bold">{e.nome}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{e.tipo}</Badge>
                    </div>
                    <Badge className={e.tipo_resultado === "receita" ? "bg-[hsl(var(--cyan)/0.15)] text-[hsl(var(--cyan))]" : "bg-[hsl(var(--orange)/0.15)] text-[hsl(var(--orange))]"}>
                      {e.tipo_resultado === "receita" ? "Ganho" : "Perda"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {[
                      { label: "Lucro Pré-Eq", value: e.lucro_pre_equivalencia },
                      { label: "Dividendos", value: e.dividendos },
                      { label: "Equivalência", value: e.equivalencia },
                      { label: "PL Abertura", value: e.pl_abertura },
                      { label: "PL Fechamento", value: e.pl_fechamento },
                    ].map(item => (
                      <div key={item.label} className="rounded-lg bg-foreground/[0.03] p-2">
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className={`text-xs font-mono font-bold ${item.value >= 0 ? "text-[hsl(var(--cyan))]" : "text-[hsl(var(--orange))]"}`}>{fmt(item.value)}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Valor por sócio */}
            {calculoResult.valor_socios.length > 0 && (
              <div className="glass rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-[hsl(var(--orange))]" /> Valor Patrimonial por Sócio</p>
                <div className="grid gap-2">
                  {calculoResult.valor_socios.map((s, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-foreground/[0.03] p-3">
                      <div>
                        <p className="text-sm font-medium">{s.socio} <Badge variant="outline" className="text-[9px] ml-1">{s.tipo}</Badge></p>
                        <p className="text-[11px] text-muted-foreground">{s.empresa} — {fmtPct(s.percentual)}</p>
                      </div>
                      <p className="text-sm font-mono font-bold text-[hsl(var(--cyan))]">{fmt(s.valor_patrimonial)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matriz */}
            {calculoResult.matriz && calculoResult.matriz.dimensao <= 10 && (
              <div className="glass rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2"><Network className="w-4 h-4 text-[hsl(var(--orange))]" /> Matriz P ({calculoResult.matriz.dimensao}×{calculoResult.matriz.dimensao})</p>
                <div className="overflow-x-auto">
                  <table className="text-[10px] font-mono">
                    <thead>
                      <tr>
                        <th className="p-1"></th>
                        {calculoResult.empresas.map(e => <th key={e.id} className="p-1 text-muted-foreground">{e.nome.slice(0, 8)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {calculoResult.matriz.P.map((row, i) => (
                        <tr key={i}>
                          <td className="p-1 text-muted-foreground font-semibold">{calculoResult.empresas[i]?.nome.slice(0, 8)}</td>
                          {row.map((v, j) => (
                            <td key={j} className={`p-1 text-center ${v > 0 ? "text-[hsl(var(--orange))] font-bold" : "text-muted-foreground/40"}`}>
                              {v > 0 ? (v * 100).toFixed(1) + "%" : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("processar")} className="text-xs">Voltar</Button>
              <Button onClick={exportarCSV} variant="outline" className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5" /> Exportar CSV</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// UTILS
// ============================================================================

function periodoAnterior(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}
