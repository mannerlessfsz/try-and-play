import { useState, useMemo } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { MetricCard } from "@/components/task/MetricCard";
import { KanbanCard } from "@/components/task/KanbanCard";
import { ExpandedTaskCard } from "@/components/task/ExpandedTaskCard";
import { TimelineItem } from "@/components/task/TimelineItem";
import { TaskModal } from "@/components/task/TaskModal";
import { TaskSettingsModal } from "@/components/task/TaskSettingsModal";
import { 
  ListTodo, Plus, Trash2, Edit, CheckSquare, Clock, 
  Calendar, Filter, SortAsc, Search, FileDown, FileUp,
  Settings, Users, Tag, Flag, Star, Bell, Zap, Building2,
  AlertTriangle, Activity, List, Columns, Loader2, FileText, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Tarefa, prioridadeColors, statusColors } from "@/types/task";
import { useAtividades } from "@/hooks/useAtividades";
import { useTarefas } from "@/hooks/useTarefas";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useTarefasModelo } from "@/hooks/useTarefasModelo";
import { supabase } from "@/integrations/supabase/client";

type FilterType = "all" | "pendente" | "em_andamento" | "concluida" | "urgente";

export default function TaskVault() {
  const [viewMode, setViewMode] = useState<"lista" | "kanban">("kanban");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string>("modelos");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("all");
  
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
    deleteArquivo
  } = useTarefas();

  // Use persistent activities hook
  const { atividades, addAtividade } = useAtividades("taskvault");

  // Use tarefas modelo hook for generating tasks
  const { tarefasModelo, gerarTarefas, isGenerating } = useTarefasModelo();
  
  const [novaTarefa, setNovaTarefa] = useState<Partial<Tarefa>>({ prioridade: "media", status: "pendente" });

  // Filter tarefas by selected empresa
  const tarefasFiltradas = selectedEmpresaId === "all" 
    ? tarefas 
    : tarefas.filter(t => t.empresaId === selectedEmpresaId);

  const totalTarefas = tarefasFiltradas.length;
  const tarefasPendentes = tarefasFiltradas.filter(t => t.status === "pendente").length;
  const tarefasEmAndamento = tarefasFiltradas.filter(t => t.status === "em_andamento").length;
  const tarefasConcluidas = tarefasFiltradas.filter(t => t.status === "concluida").length;
  const tarefasUrgentes = tarefasFiltradas.filter(t => t.prioridade === "alta" && t.status !== "concluida").length;

  // Filter tasks based on active filter
  const getFilteredTarefas = () => {
    switch (activeFilter) {
      case "pendente":
        return tarefasFiltradas.filter(t => t.status === "pendente");
      case "em_andamento":
        return tarefasFiltradas.filter(t => t.status === "em_andamento");
      case "concluida":
        return tarefasFiltradas.filter(t => t.status === "concluida");
      case "urgente":
        return tarefasFiltradas.filter(t => t.prioridade === "alta" && t.status !== "concluida");
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

  const handleGerarTarefasMes = () => {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const ano = now.getFullYear();
    
    // Generate for all available companies or selected company
    const empresasParaGerar = selectedEmpresaId === "all" 
      ? empresasDisponiveis 
      : empresasDisponiveis.filter(e => e.id === selectedEmpresaId);
    
    empresasParaGerar.forEach(empresa => {
      gerarTarefas({ empresaId: empresa.id, mes, ano });
    });
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

  // Sidebar content with filters and timeline
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Filters Section */}
      <div className="p-3 border-b border-red-500/20">
        <div className="text-xs font-bold text-red-400 mb-3">Filtros Rápidos</div>
        <div className="space-y-2">
          <select 
            value={selectedEmpresaId}
            onChange={(e) => setSelectedEmpresaId(e.target.value)}
            className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80"
          >
            <option value="all">Todas Empresas</option>
            {empresasDisponiveis.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80">
            <option>Todas Prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
          <input 
            type="date" 
            className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80"
            placeholder="Data inicial"
          />
        </div>
      </div>

      {/* Timeline Section */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="text-xs font-bold text-red-400 mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Atividades Recentes
        </div>
        <div className="space-y-1">
          {atividades.map(atividade => (
            <TimelineItem key={atividade.id} atividade={atividade} />
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-24">
      <WidgetRibbon 
        groups={widgetGroups} 
        title="TaskVault" 
        accentColor="magenta" 
        sidebarContent={sidebarContent}
      />
      
      <div className="p-4 pr-72">
        {/* Dashboard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <MetricCard 
            title="Total de Tarefas" 
            value={totalTarefas} 
            change="+12% este mês" 
            changeType="up" 
            icon={ListTodo} 
            color="red"
            isActive={activeFilter === "all"}
            onClick={() => handleFilterClick("all")}
          />
          <MetricCard 
            title="Pendentes" 
            value={tarefasPendentes} 
            change="Aguardando" 
            changeType="down" 
            icon={Clock} 
            color="orange"
            isActive={activeFilter === "pendente"}
            onClick={() => handleFilterClick("pendente")}
          />
          <MetricCard 
            title="Em Andamento" 
            value={tarefasEmAndamento} 
            change="Em progresso" 
            changeType="up" 
            icon={Activity} 
            color="blue"
            isActive={activeFilter === "em_andamento"}
            onClick={() => handleFilterClick("em_andamento")}
          />
          <MetricCard 
            title="Concluídas" 
            value={tarefasConcluidas} 
            change={`${totalTarefas > 0 ? Math.round((tarefasConcluidas/totalTarefas)*100) : 0}% do total`} 
            changeType="up" 
            icon={CheckSquare} 
            color="green"
            isActive={activeFilter === "concluida"}
            onClick={() => handleFilterClick("concluida")}
          />
          <MetricCard 
            title="Urgentes" 
            value={tarefasUrgentes} 
            change="Atenção!" 
            changeType="down" 
            icon={AlertTriangle} 
            color="yellow"
            isActive={activeFilter === "urgente"}
            onClick={() => handleFilterClick("urgente")}
          />
        </div>

        {/* Filter indicator */}
        {activeFilter !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtro ativo:</span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
              {activeFilter === "pendente" ? "Pendentes" : activeFilter === "em_andamento" ? "Em Andamento" : activeFilter === "concluida" ? "Concluídas" : "Urgentes"}
            </span>
            <button 
              onClick={() => setActiveFilter("all")}
              className="text-xs text-red-400 hover:text-red-300 underline"
            >
              Limpar
            </button>
          </div>
        )}

        {/* Selected empresa indicator */}
        {selectedEmpresaId !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Empresa:</span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
              {getEmpresaNome(selectedEmpresaId)}
            </span>
            <button 
              onClick={() => setSelectedEmpresaId("all")}
              className="text-xs text-red-400 hover:text-red-300 underline"
            >
              Ver todas
            </button>
          </div>
        )}

        {/* Header with view controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-foreground">Tarefas</h2>
            <span className="text-sm text-muted-foreground">({filteredTarefas.length})</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-card/50 rounded-lg p-1 border border-foreground/10">
              <button onClick={() => setViewMode("kanban")} className={`p-2 rounded-md transition-all ${viewMode === "kanban" ? "bg-red-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <Columns className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("lista")} className={`p-2 rounded-md transition-all ${viewMode === "lista" ? "bg-red-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            <Button 
              onClick={handleGerarTarefasMes} 
              variant="outline"
              disabled={isGenerating || empresasDisponiveis.length === 0}
              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Calendar className="w-4 h-4 mr-1" />}
              Gerar Tarefas do Mês
            </Button>
            <Button onClick={() => setShowModal(true)} className="bg-red-500 hover:bg-red-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === "kanban" ? (
          <div className={`grid gap-4 ${activeFilter === "all" ? "grid-cols-3" : "grid-cols-1"}`}>
            {activeFilter === "all" ? (
              // Show all 3 columns when "all" filter is active
              (["pendente", "em_andamento", "concluida"] as const).map(status => (
                <div key={status} className={`bg-card/30 backdrop-blur-xl rounded-2xl border p-3 ${status === "pendente" ? "border-red-500/20" : status === "em_andamento" ? "border-blue-500/20" : "border-green-500/20"}`}>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-foreground/10">
                    <div className={`w-2 h-2 rounded-full ${status === "pendente" ? "bg-gray-500" : status === "em_andamento" ? "bg-blue-500 animate-pulse" : "bg-green-500"}`} />
                    <h3 className="text-sm font-semibold text-foreground">{status === "pendente" ? "Pendentes" : status === "em_andamento" ? "Em Andamento" : "Concluídas"}</h3>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${status === "pendente" ? "bg-gray-500/20 text-gray-300" : status === "em_andamento" ? "bg-blue-500/20 text-blue-300" : "bg-green-500/20 text-green-300"}`}>
                      {kanbanColumns[status].length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                    {kanbanColumns[status].map(tarefa => (
                      <KanbanCard key={tarefa.id} tarefa={tarefa} empresaNome={getEmpresaNome(tarefa.empresaId)} onDelete={() => handleDeleteTarefa(tarefa.id)} onStatusChange={(s) => handleUpdateTarefaStatus(tarefa.id, s)} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Show single column with expanded tasks stacked vertically
              <div className={`bg-card/30 backdrop-blur-xl rounded-2xl border p-4 ${
                activeFilter === "em_andamento" ? "border-blue-500/30" : 
                activeFilter === "concluida" ? "border-green-500/30" : 
                "border-yellow-500/30"
              }`}>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-foreground/10">
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
                <div className="space-y-4 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
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
          </div>
        ) : (
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-red-500/20 overflow-hidden">
            <table className="w-full">
              <thead className="bg-red-950/50 border-b border-red-500/20">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Título</th>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Empresa</th>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Prioridade</th>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Status</th>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Progresso</th>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Vencimento</th>
                  <th className="text-right p-3 text-xs font-semibold text-red-300">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTarefas.map(tarefa => (
                  <tr key={tarefa.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
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
                        <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: `${tarefa.progresso || 0}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-foreground/80">{tarefa.dataVencimento}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDeleteTarefa(tarefa.id)} className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
