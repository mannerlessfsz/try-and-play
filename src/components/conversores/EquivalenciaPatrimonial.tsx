import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Trash2, Building2, TrendingUp, TrendingDown,
  FileText, Plus, Calculator, Download, ChevronDown, ChevronUp,
  FolderOpen, ArrowLeft, Edit2, Users, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
}

interface Balanco {
  id: string;
  investida_id: string;
  periodo: string;
  patrimonio_liquido: number;
  ativo_total: number;
  passivo_total: number;
  capital_social: number;
  reservas: number;
  lucros_prejuizos: number;
  arquivo_nome: string | null;
  created_at: string;
}

interface ResultadoEquivalencia {
  investidaId: string;
  investidaNome: string;
  percentual: number;
  plAnterior: number;
  plAtual: number;
  variacaoPL: number;
  resultadoEquivalencia: number;
  tipo: "ganho" | "perda";
}

// ============================================================================
// HELPERS
// ============================================================================

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ============================================================================
// COMPONENT
// ============================================================================

export function EquivalenciaPatrimonial() {
  // --- state: navigation ---
  const [view, setView] = useState<"grupos" | "workspace">("grupos");
  const [grupoAtivo, setGrupoAtivo] = useState<GrupoEconomico | null>(null);
  const [step, setStep] = useState<"investidas" | "importar" | "resultados">("investidas");

  // --- state: data ---
  const [grupos, setGrupos] = useState<GrupoEconomico[]>([]);
  const [investidas, setInvestidas] = useState<Investida[]>([]);
  const [balancos, setBalancos] = useState<Balanco[]>([]);
  const [resultados, setResultados] = useState<ResultadoEquivalencia[]>([]);

  // --- state: ui ---
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedBalanco, setExpandedBalanco] = useState<string | null>(null);
  const [novoGrupo, setNovoGrupo] = useState({ nome: "", descricao: "", cnpj: "" });
  const [showNovoGrupo, setShowNovoGrupo] = useState(false);
  const [novaInvestida, setNovaInvestida] = useState({ nome: "", cnpj: "", percentual: "" });

  // ============================================================================
  // FETCH
  // ============================================================================

  const fetchGrupos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("grupos_economicos")
      .select("*")
      .order("created_at", { ascending: false });
    setGrupos((data as GrupoEconomico[]) || []);
    setLoading(false);
  };

  const fetchInvestidas = async (grupoId: string) => {
    const { data } = await supabase
      .from("grupo_investidas")
      .select("*")
      .eq("grupo_id", grupoId)
      .order("nome");
    setInvestidas((data as Investida[]) || []);
  };

  const fetchBalancos = async (grupoId: string) => {
    const { data: invs } = await supabase
      .from("grupo_investidas")
      .select("id")
      .eq("grupo_id", grupoId);
    if (!invs || invs.length === 0) { setBalancos([]); return; }
    const ids = invs.map((i: any) => i.id);
    const { data } = await supabase
      .from("grupo_balancos")
      .select("*")
      .in("investida_id", ids)
      .order("created_at");
    setBalancos((data as Balanco[]) || []);
  };

  useEffect(() => { fetchGrupos(); }, []);

  const entrarGrupo = async (grupo: GrupoEconomico) => {
    setGrupoAtivo(grupo);
    setView("workspace");
    setStep("investidas");
    setResultados([]);
    await Promise.all([fetchInvestidas(grupo.id), fetchBalancos(grupo.id)]);
  };

  const voltarGrupos = () => {
    setView("grupos");
    setGrupoAtivo(null);
    setInvestidas([]);
    setBalancos([]);
    setResultados([]);
  };

  // ============================================================================
  // CRUD: Grupos
  // ============================================================================

  const criarGrupo = async () => {
    if (!novoGrupo.nome.trim()) { toast.error("Informe o nome do grupo"); return; }
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("grupos_economicos").insert({
      nome: novoGrupo.nome,
      descricao: novoGrupo.descricao || null,
      cnpj_holding: novoGrupo.cnpj || null,
      created_by: user?.user?.id || null,
    });
    if (error) { toast.error("Erro ao criar grupo"); return; }
    toast.success("Grupo criado");
    setNovoGrupo({ nome: "", descricao: "", cnpj: "" });
    setShowNovoGrupo(false);
    fetchGrupos();
  };

  const excluirGrupo = async (id: string) => {
    const { error } = await supabase.from("grupos_economicos").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Grupo excluído");
    fetchGrupos();
  };

  // ============================================================================
  // CRUD: Investidas
  // ============================================================================

  const adicionarInvestida = async () => {
    if (!grupoAtivo || !novaInvestida.nome || !novaInvestida.percentual) {
      toast.error("Preencha nome e percentual"); return;
    }
    const perc = parseFloat(novaInvestida.percentual);
    if (isNaN(perc) || perc <= 0 || perc > 100) { toast.error("Percentual entre 0 e 100"); return; }
    const { error } = await supabase.from("grupo_investidas").insert({
      grupo_id: grupoAtivo.id,
      nome: novaInvestida.nome,
      cnpj: novaInvestida.cnpj || null,
      percentual_participacao: perc,
    });
    if (error) { toast.error("Erro ao adicionar investida"); return; }
    toast.success("Investida adicionada");
    setNovaInvestida({ nome: "", cnpj: "", percentual: "" });
    fetchInvestidas(grupoAtivo.id);
  };

  const removerInvestida = async (id: string) => {
    const { error } = await supabase.from("grupo_investidas").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Investida removida");
    if (grupoAtivo) {
      fetchInvestidas(grupoAtivo.id);
      fetchBalancos(grupoAtivo.id);
    }
  };

  // ============================================================================
  // IMPORT
  // ============================================================================

  const processarArquivo = useCallback(async (file: File, investidaId: string) => {
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("parse-fiscal", {
        body: {
          fileBase64: base64,
          fileName: file.name,
          tipo: "balanco_patrimonial",
          promptOverride: `Analise este arquivo de Balanço Patrimonial e extraia os seguintes dados em JSON:
{
  "periodo": "MM/AAAA ou descrição do período",
  "patrimonio_liquido": number,
  "ativo_total": number,
  "passivo_total": number,
  "capital_social": number,
  "reservas": number,
  "lucros_prejuizos": number
}
Retorne APENAS o JSON, sem markdown. Se não encontrar algum valor, use 0.`,
        },
      });
      if (error) throw error;

      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      const info = parsed.notas?.[0] || parsed;

      const { error: insertErr } = await supabase.from("grupo_balancos").insert({
        investida_id: investidaId,
        periodo: info.periodo || "Não identificado",
        patrimonio_liquido: parseFloat(info.patrimonio_liquido) || 0,
        ativo_total: parseFloat(info.ativo_total) || 0,
        passivo_total: parseFloat(info.passivo_total) || 0,
        capital_social: parseFloat(info.capital_social) || 0,
        reservas: parseFloat(info.reservas) || 0,
        lucros_prejuizos: parseFloat(info.lucros_prejuizos) || 0,
        arquivo_nome: file.name,
      });
      if (insertErr) throw insertErr;

      toast.success("Balanço importado com sucesso");
      if (grupoAtivo) fetchBalancos(grupoAtivo.id);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar: " + (err.message || "Tente novamente"));
    } finally {
      setIsProcessing(false);
    }
  }, [grupoAtivo]);

  // ============================================================================
  // CÁLCULO
  // ============================================================================

  const calcularEquivalencia = () => {
    const results: ResultadoEquivalencia[] = [];
    for (const inv of investidas) {
      const bals = balancos
        .filter((b) => b.investida_id === inv.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      if (bals.length < 2) continue;
      const anterior = bals[bals.length - 2];
      const atual = bals[bals.length - 1];
      const variacao = atual.patrimonio_liquido - anterior.patrimonio_liquido;
      const resultado = variacao * (inv.percentual_participacao / 100);
      results.push({
        investidaId: inv.id,
        investidaNome: inv.nome,
        percentual: inv.percentual_participacao,
        plAnterior: anterior.patrimonio_liquido,
        plAtual: atual.patrimonio_liquido,
        variacaoPL: variacao,
        resultadoEquivalencia: resultado,
        tipo: resultado >= 0 ? "ganho" : "perda",
      });
    }
    if (results.length === 0) {
      toast.error("Importe pelo menos 2 balanços por investida");
      return;
    }
    setResultados(results);
    setStep("resultados");
    toast.success("Cálculo realizado");
  };

  const exportarCSV = () => {
    const headers = ["Investida", "% Participação", "PL Anterior", "PL Atual", "Variação PL", "Resultado Equivalência", "Tipo"];
    const rows = resultados.map((r) => [r.investidaNome, r.percentual.toFixed(2), r.plAnterior.toFixed(2), r.plAtual.toFixed(2), r.variacaoPL.toFixed(2), r.resultadoEquivalencia.toFixed(2), r.tipo === "ganho" ? "Ganho" : "Perda"]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equivalencia_${grupoAtivo?.nome || "grupo"}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  // ============================================================================
  // RENDER: SELEÇÃO DE GRUPO
  // ============================================================================

  if (view === "grupos") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--orange)/0.15)] border border-[hsl(var(--orange)/0.25)] flex items-center justify-center">
              <Layers className="w-5 h-5 text-[hsl(var(--orange))]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Equivalência Patrimonial</h2>
              <p className="text-xs text-muted-foreground">Selecione ou crie um grupo econômico para trabalhar</p>
            </div>
          </div>
          <Button
            onClick={() => setShowNovoGrupo(!showNovoGrupo)}
            className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs"
          >
            <Plus className="w-4 h-4" /> Novo Grupo
          </Button>
        </div>

        {/* Form novo grupo */}
        <AnimatePresence>
          {showNovoGrupo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold">Criar Grupo Econômico</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input placeholder="Nome do grupo *" value={novoGrupo.nome} onChange={(e) => setNovoGrupo((p) => ({ ...p, nome: e.target.value }))} className="text-sm" />
                  <Input placeholder="CNPJ da holding (opcional)" value={novoGrupo.cnpj} onChange={(e) => setNovoGrupo((p) => ({ ...p, cnpj: e.target.value }))} className="text-sm" />
                  <Input placeholder="Descrição (opcional)" value={novoGrupo.descricao} onChange={(e) => setNovoGrupo((p) => ({ ...p, descricao: e.target.value }))} className="text-sm" />
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

        {/* Lista de grupos */}
        {loading ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground animate-pulse">Carregando grupos...</p>
          </div>
        ) : grupos.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">Nenhum grupo econômico cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">Crie um grupo para começar a trabalhar</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {grupos.map((grupo, i) => (
              <motion.div
                key={grupo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-5 cursor-pointer group hover:shadow-[0_0_30px_hsl(var(--orange)/0.12)] transition-all duration-300 border border-transparent hover:border-[hsl(var(--orange)/0.25)]"
                onClick={() => entrarGrupo(grupo)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--orange)/0.1)] border border-[hsl(var(--orange)/0.2)] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="w-5 h-5 text-[hsl(var(--orange))]" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); excluirGrupo(grupo.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
                <p className="text-sm font-bold mb-1">{grupo.nome}</p>
                {grupo.descricao && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{grupo.descricao}</p>}
                <div className="flex items-center gap-2 mt-auto">
                  {grupo.cnpj_holding && (
                    <Badge variant="outline" className="text-[10px]">{grupo.cnpj_holding}</Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    {new Date(grupo.created_at).toLocaleDateString("pt-BR")}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: WORKSPACE DO GRUPO
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={voltarGrupos}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--orange)/0.15)] border border-[hsl(var(--orange)/0.25)] flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-[hsl(var(--orange))]" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{grupoAtivo?.nome}</h2>
          <p className="text-xs text-muted-foreground">Equivalência Patrimonial — {grupoAtivo?.cnpj_holding || "Sem CNPJ holding"}</p>
        </div>
      </div>

      {/* Steps Navigation */}
      <div className="flex gap-1 glass rounded-xl p-1.5">
        {([
          { key: "investidas", label: "Investidas", icon: Users },
          { key: "importar", label: "Importar Balanços", icon: Upload },
          { key: "resultados", label: "Resultados", icon: Calculator },
        ] as const).map((s) => {
          const Icon = s.icon;
          const isActive = step === s.key;
          const isDisabled =
            (s.key === "importar" && investidas.length === 0) ||
            (s.key === "resultados" && resultados.length === 0);
          return (
            <button
              key={s.key}
              onClick={() => !isDisabled && setStep(s.key)}
              disabled={isDisabled}
              className={`relative flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {isActive && (
                <motion.div layoutId="eq-step" className="absolute inset-0 rounded-lg bg-[hsl(var(--orange)/0.15)] border border-[hsl(var(--orange)/0.3)]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
              <span className={`relative z-10 flex items-center gap-1.5 ${isActive ? "text-[hsl(var(--orange))]" : "text-muted-foreground"}`}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Investidas */}
        {step === "investidas" && (
          <motion.div key="investidas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Adicionar Empresa Investida</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input placeholder="Razão Social" value={novaInvestida.nome} onChange={(e) => setNovaInvestida((p) => ({ ...p, nome: e.target.value }))} className="text-sm" />
                <Input placeholder="CNPJ (opcional)" value={novaInvestida.cnpj} onChange={(e) => setNovaInvestida((p) => ({ ...p, cnpj: e.target.value }))} className="text-sm" />
                <Input placeholder="% Participação" type="number" min="0.01" max="100" step="0.01" value={novaInvestida.percentual} onChange={(e) => setNovaInvestida((p) => ({ ...p, percentual: e.target.value }))} className="text-sm" />
                <Button onClick={adicionarInvestida} className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
            </div>

            {investidas.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">Nenhuma investida cadastrada neste grupo</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {investidas.map((inv, i) => (
                  <motion.div key={inv.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-xl p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[hsl(var(--orange)/0.1)] flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-[hsl(var(--orange))]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{inv.nome}</p>
                        <p className="text-xs text-muted-foreground">{inv.cnpj || "CNPJ não informado"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[hsl(var(--orange))] border-[hsl(var(--orange)/0.3)] bg-[hsl(var(--orange)/0.08)]">
                        {inv.percentual_participacao}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {balancos.filter((b) => b.investida_id === inv.id).length} balanço(s)
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removerInvestida(inv.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {investidas.length > 0 && (
              <Button onClick={() => setStep("importar")} className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background">
                Próximo: Importar Balanços <Upload className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        )}

        {/* STEP 2: Importar Balanços */}
        {step === "importar" && (
          <motion.div key="importar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importe pelo menos <strong>2 balanços</strong> por investida (anterior e atual) para calcular a equivalência.
            </p>

            {investidas.map((inv) => {
              const bals = balancos.filter((b) => b.investida_id === inv.id);
              return (
                <div key={inv.id} className="glass rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[hsl(var(--orange))]" />
                      <span className="text-sm font-semibold">{inv.nome}</span>
                      <Badge variant="outline" className="text-[10px]">{inv.percentual_participacao}%</Badge>
                    </div>
                    <label className="cursor-pointer">
                      <input type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processarArquivo(f, inv.id); e.target.value = ""; }} disabled={isProcessing} />
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--orange)/0.12)] text-[hsl(var(--orange))] border border-[hsl(var(--orange)/0.25)] hover:bg-[hsl(var(--orange)/0.2)] transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        {isProcessing ? "Processando..." : "Importar PDF/Excel"}
                      </div>
                    </label>
                  </div>

                  {bals.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum balanço importado</p>
                  ) : (
                    <div className="space-y-2">
                      {bals.map((b) => (
                        <div key={b.id} className="rounded-lg bg-foreground/[0.03] border border-border/50 overflow-hidden">
                          <button onClick={() => setExpandedBalanco(expandedBalanco === b.id ? null : b.id)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-foreground/[0.02] transition-colors">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium">{b.arquivo_nome || "Arquivo"}</span>
                              <Badge variant="secondary" className="text-[10px]">{b.periodo}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-semibold">{fmt(b.patrimonio_liquido)}</span>
                              {expandedBalanco === b.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </div>
                          </button>
                          <AnimatePresence>
                            {expandedBalanco === b.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-3 pb-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {[
                                    { label: "Ativo Total", value: b.ativo_total },
                                    { label: "Passivo Total", value: b.passivo_total },
                                    { label: "Capital Social", value: b.capital_social },
                                    { label: "Reservas", value: b.reservas },
                                    { label: "Lucros/Prejuízos", value: b.lucros_prejuizos },
                                    { label: "Patrimônio Líquido", value: b.patrimonio_liquido },
                                  ].map((item) => (
                                    <div key={item.label} className="rounded-lg bg-background/50 p-2">
                                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                                      <p className="text-xs font-mono font-semibold">{fmt(item.value)}</p>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("investidas")} className="text-xs">Voltar</Button>
              <Button
                onClick={calcularEquivalencia}
                disabled={investidas.some((inv) => balancos.filter((b) => b.investida_id === inv.id).length < 2)}
                className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs"
              >
                <Calculator className="w-4 h-4" /> Calcular Equivalência
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Resultados */}
        {step === "resultados" && (
          <motion.div key="resultados" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "Total Ganhos", value: resultados.filter((r) => r.tipo === "ganho").reduce((s, r) => s + r.resultadoEquivalencia, 0), icon: TrendingUp, color: "hsl(var(--cyan))" },
                { label: "Total Perdas", value: resultados.filter((r) => r.tipo === "perda").reduce((s, r) => s + Math.abs(r.resultadoEquivalencia), 0), icon: TrendingDown, color: "hsl(var(--orange))" },
                { label: "Resultado Líquido", value: resultados.reduce((s, r) => s + r.resultadoEquivalencia, 0), icon: Calculator, color: resultados.reduce((s, r) => s + r.resultadoEquivalencia, 0) >= 0 ? "hsl(var(--cyan))" : "hsl(var(--orange))" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" style={{ color: card.color }} />
                      <span className="text-xs text-muted-foreground">{card.label}</span>
                    </div>
                    <p className="text-lg font-bold font-mono" style={{ color: card.color }}>{fmt(card.value)}</p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              {resultados.map((r, i) => (
                <motion.div key={r.investidaId} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[hsl(var(--orange))]" />
                      <span className="text-sm font-semibold">{r.investidaNome}</span>
                      <Badge variant="outline" className="text-[10px]">{r.percentual}%</Badge>
                    </div>
                    <Badge className={r.tipo === "ganho" ? "bg-[hsl(var(--cyan)/0.15)] text-[hsl(var(--cyan))] border-[hsl(var(--cyan)/0.3)]" : "bg-[hsl(var(--orange)/0.15)] text-[hsl(var(--orange))] border-[hsl(var(--orange)/0.3)]"}>
                      {r.tipo === "ganho" ? "Ganho" : "Perda"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "PL Anterior", value: r.plAnterior },
                      { label: "PL Atual", value: r.plAtual },
                      { label: "Variação PL", value: r.variacaoPL },
                      { label: "Resultado Equivalência", value: r.resultadoEquivalencia },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-foreground/[0.03] p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">{item.label}</p>
                        <p className={`text-sm font-mono font-bold ${item.value >= 0 ? "text-[hsl(var(--cyan))]" : "text-[hsl(var(--orange))]"}`}>{fmt(item.value)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 rounded-lg bg-foreground/[0.02] border border-border/30">
                    <p className="text-[10px] text-muted-foreground">
                      Cálculo: ({fmt(r.plAtual)} - {fmt(r.plAnterior)}) × {r.percentual}% = <strong className="text-foreground">{fmt(r.resultadoEquivalencia)}</strong>
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("importar")} className="text-xs">Voltar</Button>
              <Button onClick={exportarCSV} className="gap-1.5 text-xs" variant="outline">
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
