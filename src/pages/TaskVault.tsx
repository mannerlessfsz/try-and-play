import { useState } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { 
  ListTodo, Plus, Trash2, Edit, CheckSquare, Clock, 
  Calendar, Filter, SortAsc, Search, FileDown, FileUp,
  Settings, Users, Tag, Flag, Star, Bell, Zap, Building2, X, Save
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

export default function TaskVault() {
  const [activeTab, setActiveTab] = useState<"tarefas" | "empresas">("tarefas");
  const [showModal, setShowModal] = useState<"tarefa" | "empresa" | null>(null);
  
  // Data
  const [empresas, setEmpresas] = useState<Empresa[]>([
    { id: "1", nome: "Empresa Alpha", cnpj: "12.345.678/0001-90", email: "contato@alpha.com" },
    { id: "2", nome: "Empresa Beta", cnpj: "98.765.432/0001-10", email: "contato@beta.com" },
  ]);
  
  const [tarefas, setTarefas] = useState<Tarefa[]>([
    { id: "1", titulo: "Conferir SPED Fiscal", descricao: "Verificar registros do mês", empresaId: "1", prioridade: "alta", status: "pendente", dataVencimento: "2024-12-20" },
    { id: "2", titulo: "Ajustar EFD Contribuições", descricao: "Corrigir PIS/COFINS", empresaId: "2", prioridade: "media", status: "em_andamento", dataVencimento: "2024-12-25" },
  ]);
  
  // Form states
  const [novaTarefa, setNovaTarefa] = useState<Partial<Tarefa>>({
    prioridade: "media",
    status: "pendente"
  });
  const [novaEmpresa, setNovaEmpresa] = useState<Partial<Empresa>>({});

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

  return (
    <div className="min-h-screen bg-background pt-14 pb-24">
      <WidgetRibbon
        groups={widgetGroups}
        title="TaskVault"
        accentColor="magenta"
      />
      
      {/* Main Content */}
      <div className="p-4 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
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
          
          <div className="ml-auto flex gap-2">
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
        <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-red-500/20 overflow-hidden">
          {activeTab === "tarefas" ? (
            <table className="w-full">
              <thead className="bg-red-950/50 border-b border-red-500/20">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Título</th>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Empresa</th>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Prioridade</th>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Status</th>
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
          ) : (
            <table className="w-full">
              <thead className="bg-red-950/50 border-b border-red-500/20">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Nome</th>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">CNPJ</th>
                  <th className="text-left p-3 text-xs font-semibold text-red-300">Email</th>
                  <th className="text-right p-3 text-xs font-semibold text-red-300">Ações</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map(empresa => (
                  <tr key={empresa.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
                    <td className="p-3 font-medium text-foreground">{empresa.nome}</td>
                    <td className="p-3 text-sm text-foreground/80">{empresa.cnpj}</td>
                    <td className="p-3 text-sm text-foreground/80">{empresa.email}</td>
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
          )}
        </div>
      </div>

      {/* Modal Tarefa */}
      {showModal === "tarefa" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-red-500/20">
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
          <div className="bg-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-red-500/20">
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
