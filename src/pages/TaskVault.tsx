import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ModulePageWrapper } from "@/components/ModulePageWrapper";
import { KanbanCard } from "@/components/task/KanbanCard";
import { ExpandedTaskCard } from "@/components/task/ExpandedTaskCard";
import { AnimatePresence, motion } from "framer-motion";
import { ActivityPulseFeed } from "@/components/task/ActivityPulseFeed";
import { TaskModal } from "@/components/task/TaskModal";
import { TaskSettingsModal } from "@/components/task/TaskSettingsModal";
import { TaskTimelineView } from "@/components/task/TaskTimelineView";
import { 
  ListTodo, Plus, Trash2, CheckCircle2,
  Calendar, Settings, Activity, List, Columns, Loader2, FileText,
  GanttChart, TrendingUp, Flame,
  Timer, Search, X, ChevronLeft, ChevronRight, CalendarRange, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Tarefa, prioridadeColors, statusColors } from "@/types/task";
import { useAtividades } from "@/hooks/useAtividades";
import { useTarefas } from "@/hooks/useTarefas";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useTarefasModelo } from "@/hooks/useTarefasModelo";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

type FilterType = "all" | "em_andamento" | "concluida" | "urgente";

export default function TaskVault() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"lista" | "kanban" | "timeline">(() => {
    const saved = localStorage.getItem("taskvault-view-mode");
    if (saved === "lista" || saved === "kanban" || saved === "timeline") return saved;
    return "timeline";
  });
  const [showOnboardTip, setShowOnboardTip] = useState(() => !localStorage.getItem("taskvault-onboard-seen"));
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab] = useState("modelos");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleSetViewMode = useCallback((mode: "lista" | "kanban" | "timeline") => {
    setViewMode(mode);
    localStorage.setItem("taskvault-view-mode", mode);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "1") { e.preventDefault(); handleSetViewMode("timeline"); }
      else if (e.key === "2") { e.preventDefault(); handleSetViewMode("kanban"); }
      else if (e.key === "3") { e.preventDefault(); handleSetViewMode("lista"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSetViewMode]);

  const dismissOnboardTip = useCallback(() => {
    setShowOnboardTip(false);
    localStorage.setItem("taskvault-onboard-seen", "true");
  }, []);
  
  const { empresasDisponiveis, loading: empresasLoading } = useEmpresaAtiva();
  const { tarefas, loading: tarefasLoading, addTarefa, updateTarefa, deleteTarefa: deleteTarefaDB, uploadArquivo, deleteArquivo, refetch: refetchTarefas } = useTarefas();
  const { atividades, addAtividade } = useAtividades("taskvault");
  const { gerarTarefas, isGenerating } = useTarefasModelo();
  
  const [novaTarefa, setNovaTarefa] = useState<Partial<Tarefa>>({ prioridade: "media", status: "pendente" });
  const [expandedKanbanId, setExpandedKanbanId] = useState<string | null>(null);

  // Removed: empresasDisponiveis triggers on every render due to new array ref from react-query
  // useTarefas already fetches on mount via its own useEffect

  const tarefasFiltradas = useMemo(
    () => selectedEmpresaId === "all" ? tarefas : tarefas.filter(t => t.empresaId === selectedEmpresaId),
    [tarefas, selectedEmpresaId]
  );

  const stats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const total = tarefasFiltradas.length;
    const done = tarefasFiltradas.filter(t => t.status === "concluida").length;
    const active = tarefasFiltradas.filter(t => t.status !== "concluida").length;
    const overdue = tarefasFiltradas.filter(t => {
      if (t.status === "concluida" || !t.prazoEntrega) return false;
      const p = new Date(t.prazoEntrega); p.setHours(0,0,0,0);
      return p < hoje;
    }).length;
    return { total, done, active, overdue, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tarefasFiltradas]);

  const filteredTarefas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let list = tarefasFiltradas;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.titulo.toLowerCase().includes(q) || t.descricao?.toLowerCase().includes(q));
    }
    // Date range filter (for kanban/lista; timeline handles its own)
    if (dateRange?.from && dateRange?.to && viewMode !== "timeline") {
      const from = new Date(dateRange.from); from.setHours(0,0,0,0);
      const to = new Date(dateRange.to); to.setHours(23,59,59,999);
      list = list.filter(t => {
        if (!t.prazoEntrega) return false;
        const d = new Date(t.prazoEntrega + "T12:00:00");
        return d >= from && d <= to;
      });
    }
    switch (activeFilter) {
      case "em_andamento": return list.filter(t => t.status !== "concluida");
      case "concluida": return list.filter(t => t.status === "concluida");
      case "urgente": return list.filter(t => {
        if (t.status === "concluida" || !t.prazoEntrega) return false;
        const p = new Date(t.prazoEntrega); p.setHours(0,0,0,0);
        return p < hoje;
      });
      default: return list;
    }
  }, [tarefasFiltradas, searchQuery, activeFilter, dateRange, viewMode]);

  const handleFilterClick = useCallback((filter: FilterType) => {
    setActiveFilter(prev => prev === filter ? "all" : filter);
  }, []);

  const logAtividade = useCallback(async (tipo: "criacao" | "conclusao" | "comentario" | "edicao", descricao: string, tarefaId?: string) => {
    await addAtividade(tipo, descricao, { tarefaId });
  }, [addAtividade]);

  const handleSaveTarefa = useCallback(async () => {
    if (!novaTarefa.titulo || !novaTarefa.empresaId) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    const tarefaId = await addTarefa({
      titulo: novaTarefa.titulo, descricao: novaTarefa.descricao || "",
      empresaId: novaTarefa.empresaId, prioridade: novaTarefa.prioridade || "media",
      status: novaTarefa.status || "pendente", dataVencimento: novaTarefa.dataVencimento,
      progresso: 0, departamento: novaTarefa.departamento, contatoId: novaTarefa.contatoId,
    });
    if (tarefaId) {
      await logAtividade("criacao", `Nova tarefa criada: ${novaTarefa.titulo}`, tarefaId);
      setNovaTarefa({ prioridade: "media", status: "pendente" });
      setShowModal(false);
      toast({ title: "Tarefa criada com sucesso!" });
    }
  }, [novaTarefa, addTarefa, logAtividade]);

  const handleDeleteTarefa = useCallback(async (id: string) => {
    const tarefa = tarefas.find(t => t.id === id);
    await deleteTarefaDB(id);
    if (tarefa) await logAtividade("edicao", `Tarefa excluída: ${tarefa.titulo}`, id);
    toast({ title: "Tarefa excluída" });
  }, [tarefas, deleteTarefaDB, logAtividade]);

  const sendCompletionEmail = useCallback(async (tarefa: Tarefa) => {
    if (!tarefa.contatoId || !tarefa.arquivos || tarefa.arquivos.length === 0) return;
    try {
      const { data: contato } = await supabase.from('empresa_contatos').select('nome, email').eq('id', tarefa.contatoId).single();
      if (!contato) return;
      const empresa = empresasDisponiveis.find(e => e.id === tarefa.empresaId);
      const getDepartamentoLabel = (dep: string) => ({ fiscal: "Fiscal", contabil: "Contábil", departamento_pessoal: "Depto. Pessoal" }[dep] || dep);
      const { error } = await supabase.functions.invoke('send-task-notification', {
        body: { contatoNome: contato.nome, contatoEmail: contato.email, tarefaTitulo: tarefa.titulo, tarefaDescricao: tarefa.descricao, empresaNome: empresa?.nome || "Empresa", departamento: tarefa.departamento ? getDepartamentoLabel(tarefa.departamento) : undefined, arquivos: tarefa.arquivos.map(a => ({ nome: a.nome, url: a.url || '', tipo: a.tipo })) }
      });
      if (error) throw error;
      toast({ title: "E-mail enviado", description: `Notificação enviada para ${contato.email}` });
    } catch {
      toast({ title: "Aviso", description: "Tarefa concluída, mas não foi possível enviar o e-mail", variant: "destructive" });
    }
  }, [empresasDisponiveis]);

  const handleUpdateTarefaStatus = useCallback(async (id: string, status: Tarefa["status"]) => {
    const tarefa = tarefas.find(t => t.id === id);
    await updateTarefa(id, { status, progresso: status === "concluida" ? 100 : status === "em_andamento" ? 50 : tarefa?.progresso || 0 });
    if (tarefa && status === "concluida") {
      await logAtividade("conclusao", `Tarefa concluída: ${tarefa.titulo}`, id);
      await sendCompletionEmail(tarefa);
    }
  }, [tarefas, updateTarefa, logAtividade, sendCompletionEmail]);

  const handleUploadArquivo = useCallback(async (tarefaId: string, file: File) => { await uploadArquivo(tarefaId, file); }, [uploadArquivo]);
  const handleDeleteArquivo = useCallback(async (arquivoId: string, url?: string) => { await deleteArquivo(arquivoId, url); }, [deleteArquivo]);

  const handleGerarTarefasMes = useCallback(async () => {
    const now = new Date();
    const empresasParaGerar = selectedEmpresaId === "all" ? empresasDisponiveis : empresasDisponiveis.filter(e => e.id === selectedEmpresaId);
    let totalGeradas = 0;
    for (const empresa of empresasParaGerar) {
      try {
        const { data, error } = await supabase.rpc('gerar_tarefas_empresa', { p_empresa_id: empresa.id, p_mes: now.getMonth() + 1, p_ano: now.getFullYear() });
        if (!error && data) totalGeradas += data;
      } catch {}
    }
    if (totalGeradas > 0) { toast({ title: "Tarefas geradas", description: `${totalGeradas} nova(s)` }); refetchTarefas(); }
    else toast({ title: "Nenhuma tarefa nova", description: "Todas já existem" });
  }, [selectedEmpresaId, empresasDisponiveis, refetchTarefas]);

  const getEmpresaNome = useCallback((id: string) => empresasDisponiveis.find(e => e.id === id)?.nome || "-", [empresasDisponiveis]);

  const kanbanColumns = useMemo(() => ({
    pendente: filteredTarefas.filter(t => t.status === "pendente"),
    em_andamento: filteredTarefas.filter(t => t.status === "em_andamento"),
    concluida: filteredTarefas.filter(t => t.status === "concluida"),
  }), [filteredTarefas]);

  const isLoading = empresasLoading || tarefasLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground text-sm">Carregando TaskVault...</span>
        </div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 22;
  const strokeDashoffset = circumference - (stats.rate / 100) * circumference;

  const metricSegments = [
    { id: "all" as FilterType, label: "Total", value: stats.total, icon: ListTodo, color: "hsl(var(--primary))" },
    { id: "em_andamento" as FilterType, label: "Ativas", value: stats.active, icon: Timer, color: "hsl(210, 100%, 55%)" },
    { id: "concluida" as FilterType, label: "Feitas", value: stats.done, icon: CheckCircle2, color: "hsl(142, 76%, 36%)" },
    { id: "urgente" as FilterType, label: "Atraso", value: stats.overdue, icon: Flame, color: "hsl(0, 84%, 60%)" },
  ];

  return (
    <ModulePageWrapper module="taskvault">
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>

      <div className="max-w-[1600px] mx-auto px-6 py-6 flex gap-5">
        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* ═══ HERO HEADER ═══ */}
          <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card/40">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20" style={{ background: "hsl(var(--primary))" }} />
              <div className="absolute -top-16 right-1/4 w-64 h-64 rounded-full blur-[100px] opacity-10" style={{ background: "hsl(var(--primary))" }} />
            </div>
            <div className="relative px-5 py-4">
              <div className="flex items-center gap-5">
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all border border-border/40 hover:border-border flex-shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Menu</span>
                </button>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.4)] relative">
                    <ListTodo className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">TaskVault</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Central de tarefas e entregas</p>
                  </div>
                </div>
                <div className="w-px h-10 bg-border/30 flex-shrink-0" />
                <div className="relative flex-shrink-0">
                  <svg width="44" height="44" viewBox="0 0 48 48" className="-rotate-90">
                    <circle cx="24" cy="24" r="22" fill="none" stroke="hsl(var(--foreground) / 0.06)" strokeWidth="2.5" />
                    <motion.circle cx="24" cy="24" r="22" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset }} transition={{ duration: 1.2, ease: "easeOut" }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-foreground tabular-nums">{stats.rate}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  {metricSegments.map((seg) => {
                    const isActive = activeFilter === seg.id;
                    const Icon = seg.icon;
                    return (
                      <button
                        key={seg.id}
                        onClick={() => handleFilterClick(seg.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 group/metric
                          ${isActive 
                            ? "bg-primary/15 border border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.15)]" 
                            : "bg-card/60 border border-border/40 hover:border-border hover:bg-card/80"}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-primary/20" : "bg-foreground/5 group-hover/metric:bg-foreground/8"}`}>
                          <Icon className="w-3.5 h-3.5" style={{ color: seg.color }} />
                        </div>
                        <div className="text-left">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 leading-none mb-0.5">{seg.label}</p>
                          <p className="text-base font-bold text-foreground tabular-nums leading-none">{seg.value}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                    <TrendingUp className="w-3 h-3" /> Progresso
                  </div>
                  <div className="w-28 h-1.5 rounded-full overflow-hidden flex bg-foreground/5">
                    {stats.total > 0 && (
                      <>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.done / stats.total) * 100}%` }} transition={{ duration: 0.8 }} className="bg-green-500/70 h-full" />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.active / stats.total) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 }} className="bg-blue-500/50 h-full" />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.overdue / stats.total) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="bg-red-500/50 h-full" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ TOOLBAR ═══ */}
          <div className="rounded-2xl border border-border/30 bg-card/40 px-5 py-3 flex items-center gap-3">
            <select 
              value={selectedEmpresaId}
              onChange={(e) => setSelectedEmpresaId(e.target.value)}
              className="bg-card/60 border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground/80 focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="all">Todas Empresas</option>
              {empresasDisponiveis.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar tarefas..." className="h-9 pl-9 pr-8 text-sm bg-card/50 border-border/50 rounded-xl" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            {activeFilter !== "all" && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/25">
                  {activeFilter === "em_andamento" ? "Em Andamento" : activeFilter === "concluida" ? "Concluídas" : "Em Atraso"}
                </span>
                <button onClick={() => setActiveFilter("all")} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
              </motion.div>
            )}
            {viewMode !== "timeline" && (
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/50 bg-card/60 text-sm font-medium text-primary hover:bg-card/80 transition-all">
                    <CalendarRange className="w-3.5 h-3.5" />
                    {dateRange?.from ? (
                      <span>
                        {format(dateRange.from, "dd MMM", { locale: ptBR })}
                        {dateRange.to ? ` – ${format(dateRange.to, "dd MMM", { locale: ptBR })}` : ""}
                      </span>
                    ) : (
                      <span>Período</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center" sideOffset={8}>
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Selecione o período</span>
                      <div className="flex items-center gap-2">
                        {dateRange?.from && (
                          <button
                            onClick={() => setDateRange(undefined)}
                            className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded bg-muted/50"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                    </div>
                    <CalendarPicker
                      mode="range"
                      selected={dateRange}
                      onSelect={(range, selectedDay) => {
                        if (!dateRange?.from || (dateRange.from && dateRange.to)) {
                          setDateRange({ from: selectedDay, to: undefined });
                        } else {
                          const from = dateRange.from;
                          const to = selectedDay;
                          if (from > to) {
                            setDateRange({ from: to, to: from });
                          } else {
                            setDateRange({ from, to });
                          }
                          setDatePickerOpen(false);
                        }
                      }}
                      numberOfMonths={1}
                      today={undefined as unknown as Date}
                      defaultMonth={new Date()}
                      locale={ptBR}
                      className={cn("p-0 pointer-events-auto")}
                      classNames={{
                        caption_label: "text-sm font-medium cursor-pointer hover:text-primary transition-colors",
                      }}
                      components={{
                        CaptionLabel: ({ displayMonth }: { displayMonth: Date }) => {
                          const monthName = format(displayMonth, "LLLL yyyy", { locale: ptBR });
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const firstDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
                                const lastDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0);
                                setDateRange({ from: firstDay, to: lastDay });
                                setDatePickerOpen(false);
                              }}
                              className="text-sm font-medium capitalize hover:text-primary hover:underline transition-colors"
                              title={`Selecionar ${monthName} inteiro`}
                            >
                              {monthName}
                            </button>
                          );
                        },
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground/50 text-center">
                      Clique no nome do mês para selecionar o mês inteiro
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/taskvault/cadastro")} className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10">
              <FileText className="w-3.5 h-3.5" />
              Cadastro
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/taskvault/documentos")} className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10">
              <FileText className="w-3.5 h-3.5" />
              Documentos
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-card/50 p-1">
              {([
                { mode: "timeline" as const, icon: GanttChart, label: "Timeline", shortcut: "⌘1" },
                { mode: "kanban" as const, icon: Columns, label: "Kanban", shortcut: "⌘2" },
                { mode: "lista" as const, icon: List, label: "Lista", shortcut: "⌘3" },
              ]).map(({ mode, icon: MIcon, label, shortcut }) => (
                <button 
                  key={mode} 
                  onClick={() => handleSetViewMode(mode)} 
                  title={`${label} (${shortcut})`}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${viewMode === mode ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {viewMode === mode && (
                    <motion.div layoutId="taskvault-view-pill" className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary to-primary/70 shadow-[0_0_15px_hsl(var(--primary)/0.4)]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <MIcon className="w-3.5 h-3.5 relative z-10" />
                  <span className="hidden sm:inline relative z-10">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ═══ VIEW CONTENT ═══ */}
          <div className="flex-1 min-h-0">
        {/* Onboard tip */}
        <AnimatePresence>
          {showOnboardTip && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
              <div className="bg-card/80 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <GanttChart className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm text-foreground/80">
                  A <strong className="text-primary">Timeline</strong> é a visualização padrão. Use <kbd className="px-1 py-0.5 rounded bg-foreground/10 text-[10px] font-mono">Ctrl+1/2/3</kbd> para alternar.
                </p>
                <button onClick={dismissOnboardTip} className="ml-auto text-muted-foreground hover:text-foreground text-xs">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Views */}
        {viewMode === "timeline" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
            className="rounded-2xl border border-border/30 bg-card/40 p-5 relative overflow-hidden"
          >
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "hsl(var(--primary) / 0.2)" }} />
            <TaskTimelineView
              tarefas={filteredTarefas}
              getEmpresaNome={getEmpresaNome}
              onDelete={handleDeleteTarefa}
              onStatusChange={handleUpdateTarefaStatus}
              onUploadArquivo={handleUploadArquivo}
              onDeleteArquivo={handleDeleteArquivo}
            />
          </motion.div>
        )}

        {viewMode === "kanban" && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`grid gap-5 ${activeFilter === "all" ? "grid-cols-3" : "grid-cols-1"}`}>
            {activeFilter === "all" ? (
              (["pendente", "em_andamento", "concluida"] as const).map((status, colIdx) => {
                const colConfig = {
                  pendente: { dot: "bg-muted-foreground", label: "Pendentes", badge: "bg-muted/50 text-muted-foreground", glowColor: "var(--muted-foreground)" },
                  em_andamento: { dot: "bg-blue-500 animate-pulse", label: "Em Andamento", badge: "bg-blue-500/15 text-blue-400", glowColor: "hsl(210 100% 55%)" },
                  concluida: { dot: "bg-green-500", label: "Concluídas", badge: "bg-green-500/15 text-green-400", glowColor: "hsl(142 76% 36%)" },
                };
                const col = colConfig[status];
                return (
                  <motion.div 
                    key={status} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: colIdx * 0.08 }}
                    className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden relative group/col"
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full opacity-0 group-hover/col:opacity-60 transition-opacity duration-700 blur-3xl pointer-events-none" style={{ background: col.glowColor, opacity: 0.08 }} />
                    <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/20">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                      <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium ${col.badge}`}>{kanbanColumns[status].length}</span>
                    </div>
                    <div className="p-3 space-y-2.5">
                      {kanbanColumns[status].map((tarefa, idx) => (
                        <div key={tarefa.id}>
                          <div onClick={() => setExpandedKanbanId(prev => prev === tarefa.id ? null : tarefa.id)} className="cursor-pointer">
                            <KanbanCard tarefa={tarefa} empresaNome={getEmpresaNome(tarefa.empresaId)} onDelete={() => handleDeleteTarefa(tarefa.id)} onStatusChange={(s) => handleUpdateTarefaStatus(tarefa.id, s)} index={idx} />
                          </div>
                          <AnimatePresence>
                            {expandedKanbanId === tarefa.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="mt-1.5 rounded-xl border border-primary/20 bg-card/80 p-3">
                                  <ExpandedTaskCard tarefa={tarefa} empresaNome={getEmpresaNome(tarefa.empresaId)} onDelete={() => handleDeleteTarefa(tarefa.id)} onStatusChange={(s) => handleUpdateTarefaStatus(tarefa.id, s)} onUploadArquivo={(file) => handleUploadArquivo(tarefa.id, file)} onDeleteArquivo={handleDeleteArquivo} defaultExpanded />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                      {kanbanColumns[status].length === 0 && (
                        <div className="text-center py-10 text-muted-foreground/30">
                          <p className="text-xs">Nenhuma tarefa</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
                <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border/20">
                  <div className={`w-3 h-3 rounded-full ${activeFilter === "em_andamento" ? "bg-blue-500 animate-pulse" : activeFilter === "concluida" ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                  <h3 className="text-lg font-semibold text-foreground">
                    {activeFilter === "em_andamento" ? "Em Andamento" : activeFilter === "concluida" ? "Concluídas" : "Tarefas Urgentes"}
                  </h3>
                  <span className="ml-auto text-sm px-3 py-1 rounded-full bg-primary/10 text-primary">{filteredTarefas.length}</span>
                </div>
                <div className="space-y-3">
                  {filteredTarefas.map(tarefa => (
                    <ExpandedTaskCard key={tarefa.id} tarefa={tarefa} empresaNome={getEmpresaNome(tarefa.empresaId)} onDelete={() => handleDeleteTarefa(tarefa.id)} onStatusChange={(s) => handleUpdateTarefaStatus(tarefa.id, s)} onUploadArquivo={(file) => handleUploadArquivo(tarefa.id, file)} onDeleteArquivo={handleDeleteArquivo} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {viewMode === "lista" && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden">
            <table className="w-full">
              <thead className="bg-card/60 border-b border-border/20">
                <tr>
                  <th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                  <th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                  <th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Prioridade</th>
                  <th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progresso</th>
                  <th className="text-left p-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Vencimento</th>
                  <th className="text-right p-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTarefas.map(tarefa => (
                  <React.Fragment key={tarefa.id}>
                    <tr className="border-b border-border/10 hover:bg-foreground/[0.02] transition-colors cursor-pointer" onClick={() => setExpandedKanbanId(prev => prev === tarefa.id ? null : tarefa.id)}>
                      <td className="p-3.5">
                        <div className="font-medium text-foreground text-sm">{tarefa.titulo}</div>
                        {tarefa.descricao && <div className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">{tarefa.descricao}</div>}
                      </td>
                      <td className="p-3.5 text-sm text-foreground/70">{getEmpresaNome(tarefa.empresaId)}</td>
                      <td className="p-3.5"><span className={`px-2 py-1 rounded-lg text-xs font-medium border ${prioridadeColors[tarefa.prioridade]}`}>{tarefa.prioridade}</span></td>
                      <td className="p-3.5"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors[tarefa.status]}`}>{tarefa.status.replace("_", " ")}</span></td>
                      <td className="p-3.5">
                        <div className="w-20">
                          <div className="h-1.5 bg-foreground/6 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all" style={{ width: `${tarefa.progresso || 0}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground/50 mt-0.5 block">{tarefa.progresso || 0}%</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-sm text-foreground/70">{tarefa.dataVencimento || "-"}</td>
                      <td className="p-3.5 text-right">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTarefa(tarefa.id); }} className="p-1.5 rounded-lg hover:bg-destructive/15 text-destructive/60 hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedKanbanId === tarefa.id && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="p-4 border-b border-primary/15 bg-card/60">
                                <ExpandedTaskCard tarefa={tarefa} empresaNome={getEmpresaNome(tarefa.empresaId)} onDelete={() => handleDeleteTarefa(tarefa.id)} onStatusChange={(s) => handleUpdateTarefaStatus(tarefa.id, s)} onUploadArquivo={(file) => handleUploadArquivo(tarefa.id, file)} onDeleteArquivo={handleDeleteArquivo} defaultExpanded />
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {filteredTarefas.length === 0 && (
              <div className="text-center py-16 text-muted-foreground/40">
                <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma tarefa encontrada</p>
              </div>
            )}
          </motion.div>
        )}
        </div>
        </div>

        {/* Activity sidebar */}
        <div className="w-72 flex-shrink-0 hidden xl:flex flex-col gap-5 self-stretch">
          <div className="flex-1 rounded-2xl border border-border/30 bg-card/40 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 flex-shrink-0">
              <div className="relative">
                <Activity className="w-4 h-4 text-primary" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Atividade Recente</span>
              <span className="ml-auto text-[10px] text-muted-foreground/40 tabular-nums">{atividades.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <ActivityPulseFeed atividades={atividades} />
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <TaskModal novaTarefa={novaTarefa} setNovaTarefa={setNovaTarefa} empresas={empresasDisponiveis.map(e => ({ id: e.id, nome: e.nome, cnpj: e.cnpj || "", email: e.email || "" }))} onSave={handleSaveTarefa} onClose={() => setShowModal(false)} />
      )}
      <TaskSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} initialTab={settingsInitialTab} />

    </div>
    </ModulePageWrapper>
  );
}
