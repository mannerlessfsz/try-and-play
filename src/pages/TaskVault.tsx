import React, { useState, useMemo, useEffect, useCallback } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { CommandCenter } from "@/components/task/CommandCenter";
import { KanbanCard } from "@/components/task/KanbanCard";
import { ExpandedTaskCard } from "@/components/task/ExpandedTaskCard";
import { AnimatePresence, motion } from "framer-motion";
import { TimelineItem } from "@/components/task/TimelineItem";
import { ActivityPulseFeed } from "@/components/task/ActivityPulseFeed";
import { TaskModal } from "@/components/task/TaskModal";
import { TaskSettingsModal } from "@/components/task/TaskSettingsModal";
import { TaskTimelineView } from "@/components/task/TaskTimelineView";
import { 
  ListTodo, Plus, Trash2, Edit, CheckSquare, Clock, 
  Calendar, Filter, SortAsc, Search, FileDown, FileUp,
  Settings, Users, Tag, Flag, Star, Bell, Zap, Building2,
  AlertTriangle, Activity, List, Columns, Loader2, FileText, Briefcase, RefreshCw,
  GanttChart, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Tarefa, prioridadeColors, statusColors } from "@/types/task";
import { useAtividades } from "@/hooks/useAtividades";
import { useTarefas } from "@/hooks/useTarefas";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useTarefasModelo } from "@/hooks/useTarefasModelo";
import { supabase } from "@/integrations/supabase/client";

type FilterType = "all" | "em_andamento" | "concluida" | "urgente";

export default function TaskVault() {
  const [viewMode, setViewMode] = useState<"lista" | "kanban" | "timeline">(() => {
    const saved = localStorage.getItem("taskvault-view-mode");
    if (saved === "lista" || saved === "kanban" || saved === "timeline") return saved;
    return "timeline";
  });
  const [showOnboardTip, setShowOnboardTip] = useState(() => !localStorage.getItem("taskvault-onboard-seen"));
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string>("modelos");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("all");

  // Persist view mode
  const handleSetViewMode = useCallback((mode: "lista" | "kanban" | "timeline") => {
    setViewMode(mode);
    localStorage.setItem("taskvault-view-mode", mode);
  }, []);

  // Keyboard shortcuts: Ctrl+1 = Timeline, Ctrl+2 = Kanban, Ctrl+3 = Lista
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

  // Dismiss onboard tip
  const dismissOnboardTip = useCallback(() => {
    setShowOnboardTip(false);
    localStorage.setItem("taskvault-onboard-seen", "true");
  }, []);
  
  // Use empresas from system
  const { empresasDisponiveis, loading: empresasLoading } = useEmpresaAtiva();
  
  // Use persistent tarefas hook
  const { 
    tarefas, 
    loading: tarefasLoading, 
    addTarefa, 
    updateTarefa, 
    deleteTarefa: deleteTarefaDB,
    uploadArquivo,
    deleteArquivo,
    refetch: refetchTarefas
  } = useTarefas();

  // Use persistent activities hook
  const { atividades, addAtividade } = useAtividades("taskvault");

  // Use tarefas modelo hook for generating tasks
  const { tarefasModelo, gerarTarefas, isGenerating } = useTarefasModelo();
  
  const [novaTarefa, setNovaTarefa] = useState<Partial<Tarefa>>({ prioridade: "media", status: "pendente" });
  const [expandedKanbanId, setExpandedKanbanId] = useState<string | null>(null);

  // Refetch tarefas when component mounts or empresas change
  useEffect(() => {
    refetchTarefas();
  }, [empresasDisponiveis]);

  // Filter tarefas by selected empresa
  const tarefasFiltradas = selectedEmpresaId === "all" 
    ? tarefas 
    : tarefas.filter(t => t.empresaId === selectedEmpresaId);

  const totalTarefas = tarefasFiltradas.length;
  const tarefasConcluidas = tarefasFiltradas.filter(t => t.status === "concluida").length;
  
  // Em Andamento: tarefas não concluídas (pendentes + em_andamento)
  const tarefasEmAndamento = tarefasFiltradas.filter(t => t.status !== "concluida").length;
  
  // Urgentes/Em Atraso: tarefas não concluídas que já passaram do prazo de envio
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const tarefasAtrasadas = tarefasFiltradas.filter(t => {
    if (t.status === "concluida") return false;
    if (!t.prazoEntrega) return false;
    const prazo = new Date(t.prazoEntrega);
    prazo.setHours(0, 0, 0, 0);
    return prazo < hoje;
  }).length;

  // Filter tasks based on active filter
  const getFilteredTarefas = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    switch (activeFilter) {
      case "em_andamento":
        return tarefasFiltradas.filter(t => t.status !== "concluida");
      case "concluida":
        return tarefasFiltradas.filter(t => t.status === "concluida");
      case "urgente":
        return tarefasFiltradas.filter(t => {
          if (t.status === "concluida") return false;
          if (!t.prazoEntrega) return false;
          const prazo = new Date(t.prazoEntrega);
          prazo.setHours(0, 0, 0, 0);
          return prazo < hoje;
        });
      default:
        return tarefasFiltradas;
    }
  };

  const filteredTarefas = getFilteredTarefas();

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(prev => prev === filter ? "all" : filter);
  };

  const logAtividade = async (tipo: "criacao" | "conclusao" | "comentario" | "edicao", descricao: string, tarefaId?: string) => {
    await addAtividade(tipo, descricao, { tarefaId });
  };

  const handleSaveTarefa = async () => {
    if (!novaTarefa.titulo || !novaTarefa.empresaId) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    const tarefaId = await addTarefa({
      titulo: novaTarefa.titulo,
      descricao: novaTarefa.descricao || "",
      empresaId: novaTarefa.empresaId,
      prioridade: novaTarefa.prioridade || "media",
      status: novaTarefa.status || "pendente",
      dataVencimento: novaTarefa.dataVencimento,
      progresso: 0,
      departamento: novaTarefa.departamento,
      contatoId: novaTarefa.contatoId,
    });
    
    if (tarefaId) {
      await logAtividade("criacao", `Nova tarefa criada: ${novaTarefa.titulo}`, tarefaId);
      setNovaTarefa({ prioridade: "media", status: "pendente" });
      setShowModal(false);
      toast({ title: "Tarefa criada com sucesso!" });
    }
  };

  const handleDeleteTarefa = async (id: string) => {
    const tarefa = tarefas.find(t => t.id === id);
    await deleteTarefaDB(id);
    if (tarefa) await logAtividade("edicao", `Tarefa excluída: ${tarefa.titulo}`, id);
    toast({ title: "Tarefa excluída" });
  };

  const sendCompletionEmail = async (tarefa: Tarefa) => {
    if (!tarefa.contatoId || !tarefa.arquivos || tarefa.arquivos.length === 0) {
      return;
    }

    try {
      // Fetch contato info
      const { data: contato } = await supabase
        .from('empresa_contatos')
        .select('nome, email')
        .eq('id', tarefa.contatoId)
        .single();

      if (!contato) {
        console.log("Contato não encontrado para envio de e-mail");
        return;
      }

      const empresa = empresasDisponiveis.find(e => e.id === tarefa.empresaId);
      
      const getDepartamentoLabel = (dep: string) => {
        const labels: Record<string, string> = {
          fiscal: "Fiscal",
          contabil: "Contábil",
          departamento_pessoal: "Depto. Pessoal"
        };
        return labels[dep] || dep;
      };

      const { data, error } = await supabase.functions.invoke('send-task-notification', {
        body: {
          contatoNome: contato.nome,
          contatoEmail: contato.email,
          tarefaTitulo: tarefa.titulo,
          tarefaDescricao: tarefa.descricao,
          empresaNome: empresa?.nome || "Empresa",
          departamento: tarefa.departamento ? getDepartamentoLabel(tarefa.departamento) : undefined,
          arquivos: tarefa.arquivos.map(a => ({
            nome: a.nome,
            url: a.url || '',
            tipo: a.tipo
          }))
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "E-mail enviado",
          description: `Notificação enviada para ${contato.email} com ${tarefa.arquivos.length} documento(s)`,
        });
      }
    } catch (error: any) {
      console.error("Erro ao enviar e-mail de conclusão:", error);
      toast({
        title: "Aviso",
        description: "Tarefa concluída, mas não foi possível enviar o e-mail",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTarefaStatus = async (id: string, status: Tarefa["status"]) => {
    const tarefa = tarefas.find(t => t.id === id);
    await updateTarefa(id, { 
      status, 
      progresso: status === "concluida" ? 100 : status === "em_andamento" ? 50 : tarefa?.progresso || 0 
    });
    if (tarefa && status === "concluida") {
      await logAtividade("conclusao", `Tarefa concluída: ${tarefa.titulo}`, id);
      // Enviar e-mail se tiver contato e arquivos
      await sendCompletionEmail(tarefa);
    }
  };

  const handleUploadArquivo = async (tarefaId: string, file: File) => {
    await uploadArquivo(tarefaId, file);
  };

  const handleDeleteArquivo = async (arquivoId: string, url?: string) => {
    await deleteArquivo(arquivoId, url);
  };

  const handleGerarTarefasMes = async () => {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const ano = now.getFullYear();
    
    // Generate for all available companies or selected company
    const empresasParaGerar = selectedEmpresaId === "all" 
      ? empresasDisponiveis 
      : empresasDisponiveis.filter(e => e.id === selectedEmpresaId);
    
    let totalGeradas = 0;
    for (const empresa of empresasParaGerar) {
      try {
        const { data, error } = await supabase.rpc('gerar_tarefas_empresa', {
          p_empresa_id: empresa.id,
          p_mes: mes,
          p_ano: ano
        });
        if (!error && data) {
          totalGeradas += data;
        }
      } catch (err) {
        console.error(`Erro ao gerar tarefas para ${empresa.nome}:`, err);
      }
    }
    
    if (totalGeradas > 0) {
      toast({ 
        title: "Tarefas geradas", 
        description: `${totalGeradas} nova(s) tarefa(s) criada(s)` 
      });
      refetchTarefas();
    } else {
      toast({ 
        title: "Nenhuma tarefa nova", 
        description: "Todas as tarefas do mês já existem" 
      });
    }
  };

  const getEmpresaNome = (id: string) => empresasDisponiveis.find(e => e.id === id)?.nome || "-";

  const kanbanColumns = {
    pendente: filteredTarefas.filter(t => t.status === "pendente"),
    em_andamento: filteredTarefas.filter(t => t.status === "em_andamento"),
    concluida: filteredTarefas.filter(t => t.status === "concluida"),
  };

  const isLoading = empresasLoading || tarefasLoading;

  // Widget groups with actions
  const widgetGroups = useMemo(() => [
    {
      id: "actions",
      label: "Ações Rápidas",
      icon: <Zap className="w-5 h-5" />,
      items: [
        { id: "new-task", label: "Nova Tarefa", icon: <Plus className="w-5 h-5" />, badge: "+", onClick: () => setShowModal(true) },
        { id: "generate", label: "Gerar Mês", icon: <Calendar className="w-5 h-5" />, onClick: handleGerarTarefasMes },
        { id: "sync", label: "Sincronizar", icon: <RefreshCw className="w-5 h-5" />, onClick: () => refetchTarefas() },
      ],
    },
    {
      id: "view",
      label: "Visualização",
      icon: <Filter className="w-5 h-5" />,
      items: [
        { id: "filter", label: "Filtrar", icon: <Filter className="w-5 h-5" /> },
        { id: "sort", label: "Ordenar", icon: <SortAsc className="w-5 h-5" /> },
        { id: "search", label: "Buscar", icon: <Search className="w-5 h-5" /> },
        { id: "calendar", label: "Agenda", icon: <Calendar className="w-5 h-5" /> },
      ],
    },
    {
      id: "organize",
      label: "Organizar",
      icon: <Tag className="w-5 h-5" />,
      items: [
        { id: "tags", label: "Tags", icon: <Tag className="w-5 h-5" /> },
        { id: "priority", label: "Prioridade", icon: <Flag className="w-5 h-5" /> },
        { id: "deadline", label: "Prazo", icon: <Clock className="w-5 h-5" /> },
        { id: "assign", label: "Atribuir", icon: <Users className="w-5 h-5" /> },
      ],
    },
    {
      id: "status",
      label: "Status",
      icon: <CheckSquare className="w-5 h-5" />,
      items: [
        { id: "complete", label: "Concluir", icon: <CheckSquare className="w-5 h-5" /> },
        { id: "favorite", label: "Favoritos", icon: <Star className="w-5 h-5" /> },
        { id: "notify", label: "Alertas", icon: <Bell className="w-5 h-5" /> },
      ],
    },
    {
      id: "config",
      label: "Configurações",
      icon: <Settings className="w-5 h-5" />,
      items: [
        { id: "modelos", label: "Modelos", icon: <FileText className="w-5 h-5" />, badge: tarefasModelo.length || undefined, onClick: () => { setSettingsInitialTab("modelos"); setShowSettingsModal(true); } },
        { id: "regimes", label: "Regimes", icon: <Building2 className="w-5 h-5" />, onClick: () => { setSettingsInitialTab("regimes"); setShowSettingsModal(true); } },
        { id: "departamentos", label: "Deptos", icon: <Briefcase className="w-5 h-5" />, onClick: () => { setSettingsInitialTab("departamentos"); setShowSettingsModal(true); } },
        { id: "export", label: "Exportar", icon: <FileDown className="w-5 h-5" /> },
      ],
    },
  ], [tarefasModelo.length]);

  const [activityPanelOpen, setActivityPanelOpen] = useState(false);

  // Sidebar content - Expanded Metrics
  const sidebarContent = (
    <div className="p-3">
      <CommandCenter
        total={totalTarefas}
        emAndamento={tarefasEmAndamento}
        concluidas={tarefasConcluidas}
        atrasadas={tarefasAtrasadas}
        activeFilter={activeFilter}
        onFilterClick={handleFilterClick}
        layout="vertical"
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-40" style={{ fontFamily: "'Inter', sans-serif", WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}>
      <WidgetRibbon 
        groups={widgetGroups} 
        title="TaskVault" 
        accentColor="magenta" 
        sidebarContent={sidebarContent}
      />
      
      <div className="p-4 pr-72">
        {/* Unified control frame - glass with ambient glow */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-5 rounded-2xl border border-border/50 bg-card/80 p-5 space-y-4 relative overflow-hidden group/frame"
        >
          {/* Radial ambient glow */}
          <div 
            className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-0 group-hover/frame:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none"
            style={{ background: "hsl(var(--primary))" }}
          />
          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
            <motion.div
              className="h-full"
              style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.3))" }}
              initial={{ width: "0%" }}
              animate={{ width: "60%" }}
              transition={{ duration: 1.2, delay: 0.3 }}
            />
          </div>

          {/* Controls bar */}
          <div className="flex items-center gap-3 relative flex-wrap z-10">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <motion.div 
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
              >
                <ListTodo className="w-4 h-4 text-primary-foreground" />
              </motion.div>
              <div>
                <h2 className="text-base font-semibold text-foreground leading-tight">Tarefas</h2>
                <p className="text-xs text-muted-foreground">{filteredTarefas.length} tarefa{filteredTarefas.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            <select 
              value={selectedEmpresaId}
              onChange={(e) => setSelectedEmpresaId(e.target.value)}
              className="bg-background/50 border border-foreground/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground/80"
            >
              <option value="all">Todas Empresas</option>
              {empresasDisponiveis.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>

            {activeFilter !== "all" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5"
              >
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_hsl(var(--primary)/0.2)]">
                  {activeFilter === "em_andamento" ? "Em Andamento" : activeFilter === "concluida" ? "Concluídas" : "Em Atraso"}
                </span>
                <button onClick={() => setActiveFilter("all")} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">✕</button>
              </motion.div>
            )}

            <div className="flex-1" />

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex glass rounded-xl p-1">
                {([
                  { mode: "timeline" as const, icon: GanttChart, label: "Timeline", shortcut: "⌘1" },
                  { mode: "kanban" as const, icon: Columns, label: "Kanban", shortcut: "⌘2" },
                  { mode: "lista" as const, icon: List, label: "Lista", shortcut: "⌘3" },
                ]).map(({ mode, icon: MIcon, label, shortcut }) => (
                  <button 
                    key={mode} 
                    onClick={() => handleSetViewMode(mode)} 
                    title={`${label} (${shortcut})`}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-sm font-medium ${viewMode === mode ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"}`}
                  >
                    {viewMode === mode && (
                      <motion.div
                        layoutId="taskvault-view-pill"
                        className="absolute inset-0 rounded-lg"
                        style={{
                          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                          boxShadow: "0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--primary) / 0.2)",
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <MIcon className="w-3.5 h-3.5 relative z-10" />
                    <span className="hidden sm:inline relative z-10">{label}</span>
                  </button>
                ))}
              </div>
              <Button 
                size="sm" 
                onClick={() => setShowModal(true)} 
                className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground rounded-xl shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] transition-shadow"
              >
                <Plus className="w-4 h-4 mr-1" /> Nova Tarefa
              </Button>
            </div>

          </div>

        </motion.div>

        {/* Onboard tip - below the frame */}
        <AnimatePresence>
          {showOnboardTip && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }} 
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-card/90 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <GanttChart className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm text-foreground/80">
                  A <strong className="text-primary">Timeline</strong> é a visualização padrão. Use <kbd className="px-1 py-0.5 rounded bg-foreground/10 text-[10px] font-mono">Ctrl+1/2/3</kbd> para alternar entre modos.
                </p>
                <button onClick={dismissOnboardTip} className="ml-auto text-muted-foreground hover:text-foreground text-xs flex-shrink-0">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content based on view mode */}
        {viewMode === "timeline" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 20 }}
            className="glass rounded-2xl p-4 relative overflow-hidden"
            style={{ borderColor: "hsl(var(--primary) / 0.15)" }}
          >
            <div 
              className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full opacity-30 blur-3xl pointer-events-none"
              style={{ background: "hsl(var(--primary) / 0.15)" }}
            />
            <TaskTimelineView
              tarefas={filteredTarefas}
              getEmpresaNome={getEmpresaNome}
              onDelete={handleDeleteTarefa}
              onStatusChange={handleUpdateTarefaStatus}
              onUploadArquivo={handleUploadArquivo}
              onDeleteArquivo={handleDeleteArquivo}
            />
          </motion.div>
        ) : viewMode === "kanban" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`grid gap-4 ${activeFilter === "all" ? "grid-cols-3" : "grid-cols-1"}`}
          >
            {activeFilter === "all" ? (
              (["pendente", "em_andamento", "concluida"] as const).map((status, colIdx) => {
                const colConfig = {
                  pendente: { border: "border-foreground/8", dot: "bg-muted-foreground", label: "Pendentes", badge: "bg-muted text-muted-foreground", glow: "hsl(var(--muted-foreground) / 0.1)" },
                  em_andamento: { border: "border-blue-500/15", dot: "bg-blue-500 animate-pulse", label: "Em Andamento", badge: "bg-blue-500/15 text-blue-400", glow: "hsl(210 100% 55% / 0.1)" },
                  concluida: { border: "border-green-500/15", dot: "bg-green-500", label: "Concluídas", badge: "bg-green-500/15 text-green-400", glow: "hsl(142 76% 36% / 0.1)" },
                };
                const col = colConfig[status];
                return (
                  <motion.div 
                    key={status} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: colIdx * 0.08, type: "spring", stiffness: 200, damping: 20 }}
                    className={`glass rounded-2xl overflow-hidden relative group/col`}
                    style={{ borderColor: `${col.glow.replace('0.1', '0.2')}` }}
                  >
                    {/* Column ambient glow */}
                    <div 
                      className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full opacity-0 group-hover/col:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none"
                      style={{ background: col.glow }}
                    />
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-foreground/5 relative z-10">
                      <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                      <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium ${col.badge}`}>
                        {kanbanColumns[status].length}
                      </span>
                    </div>
                    <div className="p-2 space-y-2">
                      {kanbanColumns[status].map((tarefa, idx) => (
                        <div key={tarefa.id}>
                          <div onClick={() => setExpandedKanbanId(prev => prev === tarefa.id ? null : tarefa.id)} className="cursor-pointer">
                            <KanbanCard tarefa={tarefa} empresaNome={getEmpresaNome(tarefa.empresaId)} onDelete={() => handleDeleteTarefa(tarefa.id)} onStatusChange={(s) => handleUpdateTarefaStatus(tarefa.id, s)} index={idx} />
                          </div>
                          <AnimatePresence>
                            {expandedKanbanId === tarefa.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-1 rounded-xl border border-primary/20 bg-card/90 p-3">
                                  <ExpandedTaskCard
                                    tarefa={tarefa}
                                    empresaNome={getEmpresaNome(tarefa.empresaId)}
                                    onDelete={() => handleDeleteTarefa(tarefa.id)}
                                    onStatusChange={(s) => handleUpdateTarefaStatus(tarefa.id, s)}
                                    onUploadArquivo={(file) => handleUploadArquivo(tarefa.id, file)}
                                    onDeleteArquivo={handleDeleteArquivo}
                                    defaultExpanded
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                      {kanbanColumns[status].length === 0 && (
                        <div className="text-center py-8 text-muted-foreground/40">
                          <p className="text-xs">Nenhuma tarefa</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className={`bg-card/80 rounded-2xl border p-4 ${
                activeFilter === "em_andamento" ? "border-blue-500/20" : 
                activeFilter === "concluida" ? "border-green-500/20" : 
                "border-yellow-500/20"
              }`}>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-foreground/8">
                  <div className={`w-3 h-3 rounded-full ${
                    activeFilter === "em_andamento" ? "bg-blue-500 animate-pulse" : 
                    activeFilter === "concluida" ? "bg-green-500" : 
                    "bg-yellow-500 animate-pulse"
                  }`} />
                  <h3 className="text-lg font-semibold text-foreground">
                    {activeFilter === "em_andamento" ? "Em Andamento" : 
                     activeFilter === "concluida" ? "Concluídas" : 
                     "Tarefas Urgentes"}
                  </h3>
                  <span className={`ml-auto text-sm px-3 py-1 rounded-full ${
                    activeFilter === "em_andamento" ? "bg-blue-500/20 text-blue-300" : 
                    activeFilter === "concluida" ? "bg-green-500/20 text-green-300" : 
                    "bg-yellow-500/20 text-yellow-300"
                  }`}>
                    {filteredTarefas.length} tarefa{filteredTarefas.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-4">
                  {filteredTarefas.map(tarefa => (
                    <ExpandedTaskCard 
                      key={tarefa.id} 
                      tarefa={tarefa} 
                      empresaNome={getEmpresaNome(tarefa.empresaId)} 
                      onDelete={() => handleDeleteTarefa(tarefa.id)} 
                      onStatusChange={(s) => handleUpdateTarefaStatus(tarefa.id, s)}
                      onUploadArquivo={(file) => handleUploadArquivo(tarefa.id, file)}
                      onDeleteArquivo={handleDeleteArquivo}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
            className="glass rounded-2xl overflow-hidden"
          >
            <table className="w-full">
              <thead className="bg-card/60 border-b border-foreground/8">
                <tr>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Prioridade</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progresso</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Vencimento</th>
                  <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTarefas.map(tarefa => (
                  <React.Fragment key={tarefa.id}>
                    <tr 
                      className="border-b border-foreground/5 hover:bg-foreground/3 transition-colors cursor-pointer"
                      onClick={() => setExpandedKanbanId(prev => prev === tarefa.id ? null : tarefa.id)}
                    >
                      <td className="p-3">
                        <div className="font-medium text-foreground">{tarefa.titulo}</div>
                        <div className="text-xs text-muted-foreground">{tarefa.descricao}</div>
                      </td>
                      <td className="p-3 text-sm text-foreground/80">{getEmpresaNome(tarefa.empresaId)}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium border ${prioridadeColors[tarefa.prioridade]}`}>{tarefa.prioridade}</span></td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[tarefa.status]}`}>{tarefa.status.replace("_", " ")}</span></td>
                      <td className="p-3">
                        <div className="w-20">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>{tarefa.progresso || 0}%</span></div>
                          <div className="h-1.5 bg-foreground/8 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full" style={{ width: `${tarefa.progresso || 0}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-foreground/80">{tarefa.dataVencimento}</td>
                      <td className="p-3 text-right">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTarefa(tarefa.id); }} className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedKanbanId === tarefa.id && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 border-b border-primary/20 bg-card/60">
                                <ExpandedTaskCard
                                  tarefa={tarefa}
                                  empresaNome={getEmpresaNome(tarefa.empresaId)}
                                  onDelete={() => handleDeleteTarefa(tarefa.id)}
                                  onStatusChange={(s) => handleUpdateTarefaStatus(tarefa.id, s)}
                                  onUploadArquivo={(file) => handleUploadArquivo(tarefa.id, file)}
                                  onDeleteArquivo={handleDeleteArquivo}
                                  defaultExpanded
                                />
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
          </motion.div>
        )}
      </div>

      {showModal && (
        <TaskModal 
          novaTarefa={novaTarefa} 
          setNovaTarefa={setNovaTarefa} 
          empresas={empresasDisponiveis.map(e => ({ id: e.id, nome: e.nome, cnpj: e.cnpj || "", email: e.email || "" }))} 
          onSave={handleSaveTarefa} 
          onClose={() => setShowModal(false)} 
        />
      )}

      <TaskSettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        initialTab={settingsInitialTab}
      />

      {/* ─── Bottom Activity Panel ─── */}
      <div className="fixed bottom-0 left-0 right-64 z-30 transition-all duration-300 ease-out">
        {/* Toggle bar */}
        <button
          onClick={() => setActivityPanelOpen(prev => !prev)}
          className="w-full flex items-center gap-2 px-4 py-2.5 glass border-t border-foreground/10 hover:bg-card/60 transition-all duration-300 relative overflow-hidden group/activity"
        >
          {/* Subtle glow on hover */}
          <div 
            className="absolute inset-0 opacity-0 group-hover/activity:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 20% 50%, hsl(var(--primary) / 0.08), transparent 60%)" }}
          />
          <div className="relative z-10 flex items-center gap-2 w-full">
            <div className="relative">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_6px_hsl(142_76%_36%/0.6)]" style={{ background: "hsl(142, 76%, 36%)" }} />
            </div>
            <span className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">
              Atividade Recente
            </span>
            <span className="text-[9px] text-muted-foreground/50 tabular-nums">
              {atividades.length}
            </span>
            <div className="ml-auto">
              <motion.div
                animate={{ rotate: activityPanelOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </motion.div>
            </div>
          </div>
        </button>

        {/* Expandable content */}
        <AnimatePresence>
          {activityPanelOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 220 }}
              exit={{ height: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden glass border-t border-foreground/5 relative"
            >
              <div 
                className="absolute top-0 left-0 right-0 h-16 pointer-events-none opacity-40"
                style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.1), transparent 70%)" }}
              />
              <div className="h-full overflow-y-auto p-3 relative z-10">
                <ActivityPulseFeed atividades={atividades} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
