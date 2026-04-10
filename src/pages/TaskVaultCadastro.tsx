import React, { useState, useMemo } from "react";
import { ModulePageWrapper } from "@/components/ModulePageWrapper";
import { useNavigate } from "react-router-dom";
import {
  Plus, Edit, Trash2, Loader2, FileText, Calendar, Clock,
  ArrowLeft, Search, Filter, Sparkles, Building2, CheckCircle2,
  ChevronDown, ChevronRight, ToggleLeft, ToggleRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import {
  useTarefasModelo,
  TarefaModelo,
  TarefaModeloFormData,
  REGIMES_TRIBUTARIOS,
  DEPARTAMENTOS,
  PERIODICIDADES,
  PeriodicidadeTipo
} from "@/hooks/useTarefasModelo";
import { Database } from "@/integrations/supabase/types";
import { SUGGESTED_TASKS } from "@/constants/suggestedTasks";
import { toast } from "@/hooks/use-toast";

type DepartamentoTipo = Database["public"]["Enums"]["departamento_tipo"];
type RegimeTributario = Database["public"]["Enums"]["regime_tributario"];

const PRIORIDADES = [
  { value: "baixa", label: "Baixa", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  { value: "media", label: "Média", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  { value: "alta", label: "Alta", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  { value: "urgente", label: "Urgente", color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
];

const DEP_COLORS: Record<DepartamentoTipo, string> = {
  fiscal: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  contabil: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  departamento_pessoal: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

const REGIME_COLORS: Record<string, string> = {
  mei: "bg-teal-500/15 text-teal-400",
  simples_nacional: "bg-sky-500/15 text-sky-400",
  lucro_presumido: "bg-violet-500/15 text-violet-400",
  lucro_real: "bg-rose-500/15 text-rose-400",
  nano_empreendedor: "bg-lime-500/15 text-lime-400",
};

export default function TaskVaultCadastro() {
  const navigate = useNavigate();
  const {
    tarefasModelo,
    isLoading,
    createTarefaModelo,
    updateTarefaModelo,
    toggleAtivo,
    deleteTarefaModelo,
    isCreating,
    isUpdating,
  } = useTarefasModelo();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<TarefaModelo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartamento, setFilterDepartamento] = useState<string>("all");
  const [filterRegime, setFilterRegime] = useState<string>("all");
  const [expandedDeps, setExpandedDeps] = useState<Set<string>>(new Set(["fiscal", "contabil", "departamento_pessoal"]));
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [formData, setFormData] = useState<TarefaModeloFormData>({
    titulo: "",
    descricao: "",
    departamento: "fiscal",
    prioridade: "media",
    dia_vencimento: undefined,
    prazo_dias: undefined,
    requer_anexo: false,
    justificativa: "",
    periodicidade: "mensal",
    regimes: [],
  });

  const resetForm = () => {
    setFormData({
      titulo: "", descricao: "", departamento: "fiscal", prioridade: "media",
      dia_vencimento: undefined, prazo_dias: undefined, requer_anexo: false,
      justificativa: "", periodicidade: "mensal", regimes: [],
    });
    setEditingModelo(null);
  };

  const handleOpenDialog = (modelo?: TarefaModelo) => {
    if (modelo) {
      setEditingModelo(modelo);
      setFormData({
        titulo: modelo.titulo,
        descricao: modelo.descricao || "",
        departamento: modelo.departamento,
        prioridade: modelo.prioridade,
        dia_vencimento: modelo.dia_vencimento || undefined,
        prazo_dias: modelo.prazo_dias || undefined,
        requer_anexo: modelo.requer_anexo || false,
        justificativa: modelo.justificativa || "",
        periodicidade: modelo.periodicidade || "mensal",
        regimes: modelo.regimes || [],
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.titulo || formData.regimes.length === 0) {
      toast({ title: "Preencha o título e selecione pelo menos um regime", variant: "destructive" });
      return;
    }
    if (editingModelo) {
      updateTarefaModelo({ id: editingModelo.id, ...formData });
    } else {
      createTarefaModelo(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const toggleRegime = (regime: RegimeTributario) => {
    setFormData(prev => ({
      ...prev,
      regimes: prev.regimes.includes(regime)
        ? prev.regimes.filter(r => r !== regime)
        : [...prev.regimes, regime],
    }));
  };

  const handleImportSuggestions = (regime: string) => {
    const suggestions = SUGGESTED_TASKS.filter(t => t.regimes.includes(regime as RegimeTributario));
    const existingTitles = new Set(tarefasModelo.map(m => m.titulo.toLowerCase()));
    let count = 0;
    suggestions.forEach(s => {
      if (!existingTitles.has(s.titulo.toLowerCase())) {
        createTarefaModelo(s);
        existingTitles.add(s.titulo.toLowerCase());
        count++;
      }
    });
    toast({
      title: count > 0 ? `${count} tarefas importadas!` : "Todas as tarefas já existem",
      description: count > 0 ? "As tarefas sugeridas foram adicionadas ao cadastro" : "Nenhuma tarefa nova para importar",
    });
    setShowSuggestions(false);
  };

  const toggleDep = (dep: string) => {
    setExpandedDeps(prev => {
      const n = new Set(prev);
      if (n.has(dep)) n.delete(dep); else n.add(dep);
      return n;
    });
  };

  // Filter logic
  const filtered = useMemo(() => {
    return tarefasModelo.filter(m => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!m.titulo.toLowerCase().includes(q) && !m.descricao?.toLowerCase().includes(q)) return false;
      }
      if (filterDepartamento !== "all" && m.departamento !== filterDepartamento) return false;
      if (filterRegime !== "all" && !m.regimes?.includes(filterRegime as RegimeTributario)) return false;
      return true;
    });
  }, [tarefasModelo, searchQuery, filterDepartamento, filterRegime]);

  const grouped = useMemo(() => {
    const g: Record<string, TarefaModelo[]> = {};
    DEPARTAMENTOS.forEach(d => { g[d.value] = []; });
    filtered.forEach(m => {
      if (g[m.departamento]) g[m.departamento].push(m);
    });
    return g;
  }, [filtered]);

  const stats = useMemo(() => ({
    total: tarefasModelo.length,
    ativas: tarefasModelo.filter(m => m.ativo).length,
    fiscal: tarefasModelo.filter(m => m.departamento === "fiscal").length,
    contabil: tarefasModelo.filter(m => m.departamento === "contabil").length,
    dp: tarefasModelo.filter(m => m.departamento === "departamento_pessoal").length,
  }), [tarefasModelo]);

  if (isLoading) {
    return (
      <ModulePageWrapper module="taskvault">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ModulePageWrapper>
    );
  }

  return (
    <ModulePageWrapper module="taskvault">
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/taskvault")} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Cadastro de Tarefas</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie os modelos de tarefas que alimentam a timeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSuggestions(true)}
              className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
            >
              <Sparkles className="w-4 h-4" />
              Importar Sugestões
            </Button>
            <Button onClick={() => handleOpenDialog()} className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, icon: FileText, color: "text-foreground" },
            { label: "Ativas", value: stats.ativas, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Fiscal", value: stats.fiscal, icon: Building2, color: "text-blue-400" },
            { label: "Contábil", value: stats.contabil, icon: Building2, color: "text-emerald-400" },
            { label: "Depto. Pessoal", value: stats.dp, icon: Building2, color: "text-orange-400" },
          ].map((s, i) => (
            <Card key={i} className="bg-card/40 border-border/30 rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card/40 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-transparent border-none"
            />
          </div>
          <Select value={filterDepartamento} onValueChange={setFilterDepartamento}>
            <SelectTrigger className="w-48 bg-transparent border-border/30">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Departamentos</SelectItem>
              {DEPARTAMENTOS.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterRegime} onValueChange={setFilterRegime}>
            <SelectTrigger className="w-52 bg-transparent border-border/30">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Regime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Regimes</SelectItem>
              {REGIMES_TRIBUTARIOS.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task Groups */}
        <div className="space-y-4">
          {DEPARTAMENTOS.map(dep => {
            const items = grouped[dep.value] || [];
            const isExpanded = expandedDeps.has(dep.value);

            return (
              <motion.div
                key={dep.value}
                layout
                className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden"
              >
                {/* Department header */}
                <button
                  onClick={() => toggleDep(dep.value)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={DEP_COLORS[dep.value as DepartamentoTipo]}>{dep.label}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {items.length} tarefa{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                {/* Items */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {items.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                          Nenhuma tarefa neste departamento
                        </div>
                      ) : (
                        <div className="divide-y divide-border/20">
                          {items.map(modelo => {
                            const prio = PRIORIDADES.find(p => p.value === modelo.prioridade);
                            return (
                              <div
                                key={modelo.id}
                                className={`flex items-center gap-4 px-5 py-3 hover:bg-accent/5 transition-colors ${!modelo.ativo ? "opacity-40" : ""}`}
                              >
                                {/* Title & desc */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">{modelo.titulo}</span>
                                    {modelo.requer_anexo && (
                                      <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                    )}
                                  </div>
                                  {modelo.descricao && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{modelo.descricao}</p>
                                  )}
                                </div>

                                {/* Priority */}
                                <Badge variant="outline" className={`text-xs ${prio?.color}`}>{prio?.label}</Badge>

                                {/* Periodicity */}
                                <Badge variant="outline" className="text-xs">
                                  {PERIODICIDADES.find(p => p.value === modelo.periodicidade)?.label}
                                </Badge>

                                {/* Due day */}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground w-16">
                                  <Calendar className="w-3 h-3" />
                                  {modelo.dia_vencimento ? `Dia ${modelo.dia_vencimento}` : "—"}
                                </div>

                                {/* Regimes */}
                                <div className="flex gap-1 w-40">
                                  {modelo.regimes?.slice(0, 3).map(r => (
                                    <Badge key={r} variant="outline" className={`text-[10px] px-1.5 ${REGIME_COLORS[r] || ""}`}>
                                      {REGIMES_TRIBUTARIOS.find(rt => rt.value === r)?.label.split(" - ")[0].split(" ")[0]}
                                    </Badge>
                                  ))}
                                  {(modelo.regimes?.length || 0) > 3 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5">+{(modelo.regimes?.length || 0) - 3}</Badge>
                                  )}
                                </div>

                                {/* Toggle */}
                                <Switch
                                  checked={modelo.ativo || false}
                                  onCheckedChange={checked => toggleAtivo({ id: modelo.id, ativo: checked })}
                                />

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(modelo)}>
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (confirm("Excluir esta tarefa modelo?")) deleteTarefaModelo(modelo.id);
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Empty state */}
        {tarefasModelo.length === 0 && (
          <Card className="bg-card/40 border-border/30 rounded-2xl">
            <CardContent className="py-16 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa cadastrada</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Comece importando tarefas sugeridas por regime tributário ou crie manualmente
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => setShowSuggestions(true)} className="gap-2 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                  Importar Sugestões
                </Button>
                <Button onClick={() => handleOpenDialog()} className="gap-2 rounded-xl">
                  <Plus className="w-4 h-4" />
                  Criar Manualmente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggestions Dialog */}
        <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Importar Tarefas Sugeridas
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Selecione um regime tributário para importar todas as obrigações acessórias correspondentes.
              Tarefas já existentes serão ignoradas automaticamente.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {[
                { regime: "mei", label: "MEI", desc: "DAS-MEI, DASN-SIMEI, Relatório Receitas", count: SUGGESTED_TASKS.filter(t => t.regimes.includes("mei")).length },
                { regime: "simples_nacional", label: "Simples Nacional", desc: "PGDAS-D, DEFIS, DESTDA, eSocial...", count: SUGGESTED_TASKS.filter(t => t.regimes.includes("simples_nacional")).length },
                { regime: "lucro_presumido", label: "Lucro Presumido", desc: "DCTF, EFD, ECF, SPED, eSocial...", count: SUGGESTED_TASKS.filter(t => t.regimes.includes("lucro_presumido")).length },
                { regime: "lucro_real", label: "Lucro Real", desc: "ECD, ECF, Lalur, SPED Fiscal...", count: SUGGESTED_TASKS.filter(t => t.regimes.includes("lucro_real")).length },
              ].map(item => (
                <button
                  key={item.regime}
                  onClick={() => handleImportSuggestions(item.regime)}
                  className="flex flex-col items-start gap-2 p-5 rounded-xl border border-border/30 bg-card/60 hover:bg-primary/5 hover:border-primary/30 transition-all text-left"
                >
                  <Badge className={REGIME_COLORS[item.regime]}>{item.label}</Badge>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                  <span className="text-xs font-medium text-primary">{item.count} tarefas</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingModelo ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Título *</Label>
                  <Input value={formData.titulo} onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Entregar DCTF" />
                </div>
                <div className="col-span-2">
                  <Label>Descrição</Label>
                  <Textarea value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} rows={2} placeholder="Descrição detalhada..." />
                </div>
                <div>
                  <Label>Departamento *</Label>
                  <Select value={formData.departamento} onValueChange={v => setFormData(p => ({ ...p, departamento: v as DepartamentoTipo }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTAMENTOS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade *</Label>
                  <Select value={formData.prioridade} onValueChange={v => setFormData(p => ({ ...p, prioridade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Periodicidade *</Label>
                  <Select value={formData.periodicidade} onValueChange={v => setFormData(p => ({ ...p, periodicidade: v as PeriodicidadeTipo }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIODICIDADES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dia Vencimento (1-28)</Label>
                  <Input type="number" min={1} max={28} value={formData.dia_vencimento || ""} onChange={e => setFormData(p => ({ ...p, dia_vencimento: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="Ex: 15" />
                </div>
                <div>
                  <Label>Prazo (dias antes)</Label>
                  <Input type="number" min={0} value={formData.prazo_dias || ""} onChange={e => setFormData(p => ({ ...p, prazo_dias: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="Ex: 5" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={formData.requer_anexo || false} onCheckedChange={c => setFormData(p => ({ ...p, requer_anexo: c }))} />
                  <Label>Requer Anexo</Label>
                </div>
              </div>

              {/* Regimes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Regimes Tributários *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(p => ({ ...p, regimes: REGIMES_TRIBUTARIOS.map(r => r.value) }))}
                    className="text-xs"
                  >
                    Selecionar Todos
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {REGIMES_TRIBUTARIOS.map(r => (
                    <label key={r.value} className="flex items-center gap-2 p-2 rounded-lg border border-border/20 hover:bg-accent/5 cursor-pointer">
                      <Checkbox
                        checked={formData.regimes.includes(r.value)}
                        onCheckedChange={() => toggleRegime(r.value)}
                      />
                      <span className="text-sm">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingModelo ? "Salvar" : "Criar Tarefa"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ModulePageWrapper>
  );
}
