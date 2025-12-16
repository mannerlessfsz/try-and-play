import { useState } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { 
  ListTodo, Plus, Trash2, Edit, CheckSquare, Clock, 
  Calendar, Filter, SortAsc, Search, FileDown, FileUp,
  Settings, Users, Tag, Flag, Star, Bell, Zap
} from "lucide-react";

const widgetGroups = [
  {
    id: "actions",
    label: "Ações Rápidas",
    icon: <Zap className="w-4 h-4" />,
    items: [
      { id: "new", label: "Nova", icon: <Plus className="w-5 h-5" />, badge: "+" },
      { id: "edit", label: "Editar", icon: <Edit className="w-5 h-5" /> },
      { id: "delete", label: "Excluir", icon: <Trash2 className="w-5 h-5" /> },
      { id: "complete", label: "Concluir", icon: <CheckSquare className="w-5 h-5" /> },
    ],
  },
  {
    id: "view",
    label: "Visualização",
    icon: <Filter className="w-4 h-4" />,
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
    icon: <Tag className="w-4 h-4" />,
    items: [
      { id: "tags", label: "Tags", icon: <Tag className="w-5 h-5" />, badge: 5 },
      { id: "priority", label: "Prioridade", icon: <Flag className="w-5 h-5" /> },
      { id: "deadline", label: "Prazo", icon: <Clock className="w-5 h-5" /> },
      { id: "assign", label: "Atribuir", icon: <Users className="w-5 h-5" /> },
    ],
  },
  {
    id: "extras",
    label: "Extras",
    icon: <Star className="w-4 h-4" />,
    items: [
      { id: "favorite", label: "Favoritos", icon: <Star className="w-5 h-5" />, badge: 3 },
      { id: "notify", label: "Alertas", icon: <Bell className="w-5 h-5" />, badge: 2 },
      { id: "export", label: "Exportar", icon: <FileDown className="w-5 h-5" /> },
      { id: "import", label: "Importar", icon: <FileUp className="w-5 h-5" /> },
    ],
  },
  {
    id: "settings",
    label: "Configurações",
    icon: <Settings className="w-4 h-4" />,
    items: [
      { id: "general", label: "Geral", icon: <Settings className="w-5 h-5" /> },
      { id: "users", label: "Usuários", icon: <Users className="w-5 h-5" /> },
    ],
  },
];

export default function TaskVault() {
  return (
    <div className="min-h-screen bg-background pt-12 pb-32">
      <WidgetRibbon
        groups={widgetGroups}
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
                  Use os widgets abaixo para começar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}