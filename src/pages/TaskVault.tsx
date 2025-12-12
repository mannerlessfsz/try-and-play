import { useState } from "react";
import { RibbonMenu } from "@/components/RibbonMenu";
import { 
  ListTodo, Plus, Trash2, Edit, CheckSquare, Clock, 
  Calendar, Filter, SortAsc, Search, FileDown, FileUp,
  Settings, Users, Tag, Flag
} from "lucide-react";

const ribbonTabs = [
  {
    id: "home",
    label: "Início",
    icon: <ListTodo className="w-4 h-4" />,
    items: [
      { id: "new", label: "Nova Tarefa", icon: <Plus className="w-6 h-6" /> },
      { id: "edit", label: "Editar", icon: <Edit className="w-6 h-6" /> },
      { id: "delete", label: "Excluir", icon: <Trash2 className="w-6 h-6" /> },
      { id: "complete", label: "Concluir", icon: <CheckSquare className="w-6 h-6" /> },
    ],
  },
  {
    id: "view",
    label: "Visualizar",
    icon: <Filter className="w-4 h-4" />,
    items: [
      { id: "filter", label: "Filtrar", icon: <Filter className="w-6 h-6" /> },
      { id: "sort", label: "Ordenar", icon: <SortAsc className="w-6 h-6" /> },
      { id: "search", label: "Buscar", icon: <Search className="w-6 h-6" /> },
      { id: "calendar", label: "Calendário", icon: <Calendar className="w-6 h-6" /> },
    ],
  },
  {
    id: "organize",
    label: "Organizar",
    icon: <Tag className="w-4 h-4" />,
    items: [
      { id: "tags", label: "Tags", icon: <Tag className="w-6 h-6" /> },
      { id: "priority", label: "Prioridade", icon: <Flag className="w-6 h-6" /> },
      { id: "deadline", label: "Prazo", icon: <Clock className="w-6 h-6" /> },
      { id: "assign", label: "Atribuir", icon: <Users className="w-6 h-6" /> },
    ],
  },
  {
    id: "data",
    label: "Dados",
    icon: <FileDown className="w-4 h-4" />,
    items: [
      { id: "export", label: "Exportar", icon: <FileDown className="w-6 h-6" /> },
      { id: "import", label: "Importar", icon: <FileUp className="w-6 h-6" /> },
      { id: "settings", label: "Configurar", icon: <Settings className="w-6 h-6" /> },
    ],
  },
];

export default function TaskVault() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen bg-background">
      <RibbonMenu
        tabs={ribbonTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title="TaskVault"
        accentColor="magenta"
      />
      
      {/* Main Content Area */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-magenta/20 p-8 min-h-[60vh]">
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-magenta/20 flex items-center justify-center animate-pulse-glow">
                  <ListTodo className="w-10 h-10 text-magenta" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">TaskVault</h2>
                <p className="text-muted-foreground max-w-md">
                  Gerencie suas tarefas de forma inteligente. 
                  Selecione uma ação no ribbon acima para começar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
