import { useState } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { 
  ListTodo, Plus, Trash2, Edit, CheckSquare, Clock, 
  Calendar, Filter, SortAsc, Search, FileDown, FileUp,
  Settings, Users, Tag, Flag, Star, Bell, Zap, Building2, X, Save,
  TrendingUp, AlertTriangle, Activity, LayoutGrid, List, Columns,
  ArrowUpRight, ArrowDownRight, User, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

// Types
interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
}

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  empresaId: string;
  prioridade: "baixa" | "media" | "alta";
  status: "pendente" | "em_andamento" | "concluida";
  dataVencimento: string;
  progresso?: number;
  criadoEm?: string;
}

interface Atividade {
  id: string;
  tipo: "criacao" | "conclusao" | "comentario" | "edicao";
  descricao: string;
  timestamp: string;
  usuario: string;
}

// Widget Groups
const widgetGroups = [
  {
    id: "actions",
    label: "Ações Rápidas",
    icon: <Zap className="w-5 h-5" />,
    items: [
      { id: "new-task", label: "Nova Tarefa", icon: <Plus className="w-5 h-5" />, badge: "+" },
      { id: "new-empresa", label: "Nova Empresa", icon: <Building2 className="w-5 h-5" /> },
      { id: "edit", label: "Editar", icon: <Edit className="w-5 h-5" /> },
      { id: "delete", label: "Excluir", icon: <Trash2 className="w-5 h-5" /> },
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
      { id: "tags", label: "Tags", icon: <Tag className="w-5 h-5" />, badge: 5 },
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
      { id: "favorite", label: "Favoritos", icon: <Star className="w-5 h-5" />, badge: 3 },
      { id: "notify", label: "Alertas", icon: <Bell className="w-5 h-5" />, badge: 2 },
    ],
  },
  {
    id: "extras",
    label: "Extras",
    icon: <Settings className="w-5 h-5" />,
    items: [
      { id: "export", label: "Exportar", icon: <FileDown className="w-5 h-5" /> },
      { id: "import", label: "Importar", icon: <FileUp className="w-5 h-5" /> },
      { id: "settings", label: "Config", icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon,
  color 
}: { 
  title: string; 
  value: number | string; 
  change?: string;
  changeType?: "up" | "down";
  icon: typeof TrendingUp;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    red: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-400",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400",
  };

  return (
    <div className={`
      relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorClasses[color]}
      p-4 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
      group cursor-pointer
    `}>
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-24 h-24" />
      </div>
      <div className="relative z-10">
        <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {change && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${changeType === "up" ? "text-green-400" : "text-red-400"}`}>
            {changeType === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Kanban Card Component
function KanbanCard({ 
  tarefa, 
  empresaNome,
  onDelete,
  onStatusChange
}: { 
  tarefa: Tarefa;
  empresaNome: string;
  onDelete: () => void;
  onStatusChange: (status: Tarefa["status"]) => void;
}) {
  const prioridadeColors = {
    baixa: "bg-green-500",
    media: "bg-yellow-500",
    alta: "bg-red-500",
  };

  const progresso = tarefa.progresso || (tarefa.status === "concluida" ? 100 : tarefa.status === "em_andamento" ? 50 : 0);

  return (
    <div className="
      bg-card/60 backdrop-blur-xl rounded-xl border border-foreground/10 p-3
      hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10
      transition-all duration-300 cursor-pointer group
    ">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className={`w-2 h-2 rounded-full ${prioridadeColors[tarefa.prioridade]} animate-pulse`} />
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm text-foreground mb-1 line-clamp-2">{tarefa.titulo}</h4>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{tarefa.descricao}</p>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Progresso</span>
          <span>{progresso}%</span>
        </div>
        <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <User className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] text-muted-foreground">{empresaNome}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{tarefa.dataVencimento}</span>
        </div>
      </div>
    </div>
  );
}

// Timeline Item Component
function TimelineItem({ atividade }: { atividade: Atividade }) {
  const tipoIcons = {
    criacao: <Plus className="w-3 h-3" />,
    conclusao: <CheckSquare className="w-3 h-3" />,
    comentario: <MessageSquare className="w-3 h-3" />,
    edicao: <Edit className="w-3 h-3" />,
  };

  const tipoColors = {
    criacao: "bg-green-500/20 text-green-400 border-green-500/30",
    conclusao: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    comentario: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    edicao: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className={`p-1.5 rounded-lg border ${tipoColors[atividade.tipo]}`}>
          {tipoIcons[atividade.tipo]}
        </div>
        <div className="w-px h-full bg-foreground/10 group-last:hidden" />
      </div>
      <div className="pb-4">
        <p className="text-sm text-foreground">{atividade.descricao}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{atividade.usuario}</span>
          <span>•</span>
          <span>{atividade.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

export default function TaskVault() {
  const [activeTab, setActiveTab] = useState<"tarefas" | "empresas">("tarefas");
  const [viewMode, setViewMode] = useState<"lista" | "kanban">("kanban");
  const [showModal, setShowModal] = useState<"tarefa" | "empresa" | null>(null);
  
  // Data
  const [empresas, setEmpresas] = useState<Empresa[]>([
    { id: "1", nome: "Empresa Alpha", cnpj: "12.345.678/0001-90", email: "contato@alpha.com" },
    { id: "2", nome: "Empresa Beta", cnpj: "98.765.432/0001-10", email: "contato@beta.com" },
    { id: "3", nome: "Empresa Gamma", cnpj: "11.222.333/0001-44", email: "contato@gamma.com" },
  ]);
  
  const [tarefas, setTarefas] = useState<Tarefa[]>([
    { id: "1", titulo: "Conferir SPED Fiscal", descricao: "Verificar registros do mês de dezembro", empresaId: "1", prioridade: "alta", status: "pendente", dataVencimento: "2024-12-20", progresso: 0, criadoEm: "2024-12-15" },
    { id: "2", titulo: "Ajustar EFD Contribuições", descricao: "Corrigir PIS/COFINS", empresaId: "2", prioridade: "media", status: "em_andamento", dataVencimento: "2024-12-25", progresso: 65, criadoEm: "2024-12-14" },
    { id: "3", titulo: "Enviar declaração DCTF", descricao: "Declaração mensal de tributos", empresaId: "1", prioridade: "alta", status: "pendente", dataVencimento: "2024-12-22", progresso: 20, criadoEm: "2024-12-16" },
    { id: "4", titulo: "Revisar Bloco K", descricao: "Conferência de estoque", empresaId: "3", prioridade: "baixa", status: "em_andamento", dataVencimento: "2024-12-28", progresso: 45, criadoEm: "2024-12-10" },
    { id: "5", titulo: "Importar NF-e", descricao: "Importar notas do período", empresaId: "2", prioridade: "media", status: "concluida", dataVencimento: "2024-12-18", progresso: 100, criadoEm: "2024-12-12" },
    { id: "6", titulo: "Calcular ICMS ST", descricao: "Cálculo substituição tributária", empresaId: "3", prioridade: "alta", status: "pendente", dataVencimento: "2024-12-21", progresso: 10, criadoEm: "2024-12-17" },
  ]);

  const [atividades] = useState<Atividade[]>([
    { id: "1", tipo: "criacao", descricao: "Nova tarefa criada: Conferir SPED Fiscal", timestamp: "Há 2 horas", usuario: "Sistema" },
    { id: "2", tipo: "conclusao", descricao: "Tarefa concluída: Importar NF-e", timestamp: "Há 4 horas", usuario: "Ana Silva" },
    { id: "3", tipo: "comentario", descricao: "Comentário em: Ajustar EFD", timestamp: "Há 6 horas", usuario: "Carlos" },
    { id: "4", tipo: "edicao", descricao: "Prioridade alterada: Calcular ICMS", timestamp: "Há 1 dia", usuario: "Maria" },
  ]);
  
  // Form states
  const [novaTarefa, setNovaTarefa] = useState<Partial<Tarefa>>({
    prioridade: "media",
    status: "pendente"
  });
  const [novaEmpresa, setNovaEmpresa] = useState<Partial<Empresa>>({});

  // Computed metrics
  const totalTarefas = tarefas.length;
  const tarefasPendentes = tarefas.filter(t => t.status === "pendente").length;
  const tarefasEmAndamento = tarefas.filter(t => t.status === "em_andamento").length;
  const tarefasConcluidas = tarefas.filter(t => t.status === "concluida").length;
  const tarefasUrgentes = tarefas.filter(t => t.prioridade === "alta" && t.status !== "concluida").length;

  const handleSaveTarefa = () => {
    if (!novaTarefa.titulo || !novaTarefa.empresaId) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    const tarefa: Tarefa = {
      id: Date.now().toString(),
      titulo: novaTarefa.titulo || "",
      descricao: novaTarefa.descricao || "",
      empresaId: novaTarefa.empresaId || "",
      prioridade: novaTarefa.prioridade || "media",
      status: novaTarefa.status || "pendente",
      dataVencimento: novaTarefa.dataVencimento || "",
      progresso: 0,
      criadoEm: new Date().toISOString().split("T")[0],
    };
    setTarefas(prev => [...prev, tarefa]);
    setNovaTarefa({ prioridade: "media", status: "pendente" });
    setShowModal(null);
    toast({ title: "Tarefa criada com sucesso!" });
  };

  const handleSaveEmpresa = () => {
    if (!novaEmpresa.nome || !novaEmpresa.cnpj) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    const empresa: Empresa = {
      id: Date.now().toString(),
      nome: novaEmpresa.nome || "",
      cnpj: novaEmpresa.cnpj || "",
      email: novaEmpresa.email || "",
    };
    setEmpresas(prev => [...prev, empresa]);
    setNovaEmpresa({});
    setShowModal(null);
    toast({ title: "Empresa criada com sucesso!" });
  };

  const deleteTarefa = (id: string) => {
    setTarefas(prev => prev.filter(t => t.id !== id));
    toast({ title: "Tarefa excluída" });
  };

  const deleteEmpresa = (id: string) => {
    setEmpresas(prev => prev.filter(e => e.id !== id));
    toast({ title: "Empresa excluída" });
  };

  const updateTarefaStatus = (id: string, status: Tarefa["status"]) => {
    setTarefas(prev => prev.map(t => 
      t.id === id ? { ...t, status, progresso: status === "concluida" ? 100 : status === "em_andamento" ? 50 : t.progresso } : t
    ));
  };

  const getEmpresaNome = (id: string) => empresas.find(e => e.id === id)?.nome || "-";

  const prioridadeColors = {
    baixa: "bg-green-500/20 text-green-300 border-green-500/30",
    media: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    alta: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  const statusColors = {
    pendente: "bg-gray-500/20 text-gray-300",
    em_andamento: "bg-blue-500/20 text-blue-300",
    concluida: "bg-green-500/20 text-green-300",
  };

  // Group tasks by status for Kanban
  const kanbanColumns = {
    pendente: tarefas.filter(t => t.status === "pendente"),
    em_andamento: tarefas.filter(t => t.status === "em_andamento"),
    concluida: tarefas.filter(t => t.status === "concluida"),
  };

  return (
    <div className="min-h-screen bg-background pt-14 pb-24">
      <WidgetRibbon
        groups={widgetGroups}
        title="TaskVault"
        accentColor="magenta"
      />
      
      {/* Main Content */}
      <div className="p-4 max-w-[1600px] mx-auto mr-52">
        {/* Dashboard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard 
            title="Total de Tarefas" 
            value={totalTarefas}
            change="+12% este mês"
            changeType="up"
            icon={ListTodo}
            color="red"
          />
          <MetricCard 
            title="Em Andamento" 
            value={tarefasEmAndamento}
            change="+3 novas"
            changeType="up"
            icon={Activity}
            color="blue"
          />
          <MetricCard 
            title="Concluídas" 
            value={tarefasConcluidas}
            change={`${Math.round((tarefasConcluidas/totalTarefas)*100)}% do total`}
            changeType="up"
            icon={CheckSquare}
            color="green"
          />
          <MetricCard 
            title="Urgentes" 
            value={tarefasUrgentes}
            change="Atenção!"
            changeType="down"
            icon={AlertTriangle}
            color="yellow"
          />
        </div>

        {/* Main Grid: Tasks + Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Tasks Area */}
          <div className="lg:col-span-3">
            {/* Tabs & View Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("tarefas")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === "tarefas" 
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
                      : "bg-card/50 text-muted-foreground hover:bg-card"
                  }`}
                >
                  <ListTodo className="w-4 h-4 inline mr-2" />
                  Tarefas ({tarefas.length})
                </button>
                <button
                  onClick={() => setActiveTab("empresas")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === "empresas" 
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
                      : "bg-card/50 text-muted-foreground hover:bg-card"
                  }`}
                >
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Empresas ({empresas.length})
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {activeTab === "tarefas" && (
                  <div className="flex bg-card/50 rounded-lg p-1 border border-foreground/10">
                    <button
                      onClick={() => setViewMode("kanban")}
                      className={`p-2 rounded-md transition-all ${viewMode === "kanban" ? "bg-red-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Columns className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("lista")}
                      className={`p-2 rounded-md transition-all ${viewMode === "lista" ? "bg-red-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <Button 
                  onClick={() => setShowModal("tarefa")}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" /> Nova Tarefa
                </Button>
                <Button 
                  onClick={() => setShowModal("empresa")}
                  variant="outline"
                  className="border-red-500/50 text-red-300 hover:bg-red-500/20"
                >
                  <Building2 className="w-4 h-4 mr-1" /> Nova Empresa
                </Button>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === "tarefas" ? (
              viewMode === "kanban" ? (
                // Kanban View
                <div className="grid grid-cols-3 gap-4">
                  {/* Pendentes */}
                  <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-red-500/20 p-3">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-foreground/10">
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                      <h3 className="text-sm font-semibold text-foreground">Pendentes</h3>
                      <span className="ml-auto text-xs bg-gray-500/20 px-2 py-0.5 rounded-full text-gray-300">
                        {kanbanColumns.pendente.length}
                      </span>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {kanbanColumns.pendente.map(tarefa => (
                        <KanbanCard 
                          key={tarefa.id}
                          tarefa={tarefa}
                          empresaNome={getEmpresaNome(tarefa.empresaId)}
                          onDelete={() => deleteTarefa(tarefa.id)}
                          onStatusChange={(status) => updateTarefaStatus(tarefa.id, status)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Em Andamento */}
                  <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-3">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-foreground/10">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <h3 className="text-sm font-semibold text-foreground">Em Andamento</h3>
                      <span className="ml-auto text-xs bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-300">
                        {kanbanColumns.em_andamento.length}
                      </span>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {kanbanColumns.em_andamento.map(tarefa => (
                        <KanbanCard 
                          key={tarefa.id}
                          tarefa={tarefa}
                          empresaNome={getEmpresaNome(tarefa.empresaId)}
                          onDelete={() => deleteTarefa(tarefa.id)}
                          onStatusChange={(status) => updateTarefaStatus(tarefa.id, status)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Concluídas */}
                  <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-green-500/20 p-3">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-foreground/10">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <h3 className="text-sm font-semibold text-foreground">Concluídas</h3>
                      <span className="ml-auto text-xs bg-green-500/20 px-2 py-0.5 rounded-full text-green-300">
                        {kanbanColumns.concluida.length}
                      </span>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {kanbanColumns.concluida.map(tarefa => (
                        <KanbanCard 
                          key={tarefa.id}
                          tarefa={tarefa}
                          empresaNome={getEmpresaNome(tarefa.empresaId)}
                          onDelete={() => deleteTarefa(tarefa.id)}
                          onStatusChange={(status) => updateTarefaStatus(tarefa.id, status)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // List View
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
                      {tarefas.map(tarefa => (
                        <tr key={tarefa.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
                          <td className="p-3">
                            <div className="font-medium text-foreground">{tarefa.titulo}</div>
                            <div className="text-xs text-muted-foreground">{tarefa.descricao}</div>
                          </td>
                          <td className="p-3 text-sm text-foreground/80">{getEmpresaNome(tarefa.empresaId)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${prioridadeColors[tarefa.prioridade]}`}>
                              {tarefa.prioridade}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[tarefa.status]}`}>
                              {tarefa.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="w-20">
                              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                <span>{tarefa.progresso || 0}%</span>
                              </div>
                              <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                                  style={{ width: `${tarefa.progresso || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-foreground/80">{tarefa.dataVencimento}</td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => deleteTarefa(tarefa.id)}
                              className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Empresas Table
              <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-red-500/20 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-red-950/50 border-b border-red-500/20">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold text-red-300">Nome</th>
                      <th className="text-left p-3 text-xs font-semibold text-red-300">CNPJ</th>
                      <th className="text-left p-3 text-xs font-semibold text-red-300">Email</th>
                      <th className="text-left p-3 text-xs font-semibold text-red-300">Tarefas</th>
                      <th className="text-right p-3 text-xs font-semibold text-red-300">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empresas.map(empresa => (
                      <tr key={empresa.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                              {empresa.nome.charAt(0)}
                            </div>
                            <span className="font-medium text-foreground">{empresa.nome}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-foreground/80">{empresa.cnpj}</td>
                        <td className="p-3 text-sm text-foreground/80">{empresa.email}</td>
                        <td className="p-3">
                          <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                            {tarefas.filter(t => t.empresaId === empresa.id).length} tarefas
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => deleteEmpresa(empresa.id)}
                            className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Timeline Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-red-500/20 p-4 sticky top-20">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-400" />
                Atividades Recentes
              </h3>
              <div className="space-y-1">
                {atividades.map(atividade => (
                  <TimelineItem key={atividade.id} atividade={atividade} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tarefa */}
      {showModal === "tarefa" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-red-500/20 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Nova Tarefa</h2>
              <button onClick={() => setShowModal(null)} className="p-1 hover:bg-foreground/10 rounded">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-foreground/80">Título *</Label>
                <Input 
                  value={novaTarefa.titulo || ""}
                  onChange={e => setNovaTarefa(prev => ({ ...prev, titulo: e.target.value }))}
                  className="mt-1 bg-background/50 border-foreground/20"
                  placeholder="Nome da tarefa"
                />
              </div>
              
              <div>
                <Label className="text-sm text-foreground/80">Descrição</Label>
                <Textarea 
                  value={novaTarefa.descricao || ""}
                  onChange={e => setNovaTarefa(prev => ({ ...prev, descricao: e.target.value }))}
                  className="mt-1 bg-background/50 border-foreground/20"
                  placeholder="Detalhes da tarefa"
                  rows={2}
                />
              </div>
              
              <div>
                <Label className="text-sm text-foreground/80">Empresa *</Label>
                <Select onValueChange={v => setNovaTarefa(prev => ({ ...prev, empresaId: v }))}>
                  <SelectTrigger className="mt-1 bg-background/50 border-foreground/20">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-foreground/80">Prioridade</Label>
                  <Select 
                    defaultValue="media"
                    onValueChange={v => setNovaTarefa(prev => ({ ...prev, prioridade: v as Tarefa["prioridade"] }))}
                  >
                    <SelectTrigger className="mt-1 bg-background/50 border-foreground/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm text-foreground/80">Vencimento</Label>
                  <Input 
                    type="date"
                    value={novaTarefa.dataVencimento || ""}
                    onChange={e => setNovaTarefa(prev => ({ ...prev, dataVencimento: e.target.value }))}
                    className="mt-1 bg-background/50 border-foreground/20"
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveTarefa} className="w-full bg-red-500 hover:bg-red-600 text-white">
                <Save className="w-4 h-4 mr-2" /> Salvar Tarefa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Empresa */}
      {showModal === "empresa" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-red-500/20 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Nova Empresa</h2>
              <button onClick={() => setShowModal(null)} className="p-1 hover:bg-foreground/10 rounded">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-foreground/80">Nome *</Label>
                <Input 
                  value={novaEmpresa.nome || ""}
                  onChange={e => setNovaEmpresa(prev => ({ ...prev, nome: e.target.value }))}
                  className="mt-1 bg-background/50 border-foreground/20"
                  placeholder="Nome da empresa"
                />
              </div>
              
              <div>
                <Label className="text-sm text-foreground/80">CNPJ *</Label>
                <Input 
                  value={novaEmpresa.cnpj || ""}
                  onChange={e => setNovaEmpresa(prev => ({ ...prev, cnpj: e.target.value }))}
                  className="mt-1 bg-background/50 border-foreground/20"
                  placeholder="00.000.000/0001-00"
                />
              </div>
              
              <div>
                <Label className="text-sm text-foreground/80">Email</Label>
                <Input 
                  type="email"
                  value={novaEmpresa.email || ""}
                  onChange={e => setNovaEmpresa(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 bg-background/50 border-foreground/20"
                  placeholder="contato@empresa.com"
                />
              </div>
              
              <Button onClick={handleSaveEmpresa} className="w-full bg-red-500 hover:bg-red-600 text-white">
                <Save className="w-4 h-4 mr-2" /> Salvar Empresa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
