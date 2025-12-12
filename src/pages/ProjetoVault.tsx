import { useState } from "react";
import { RibbonMenu } from "@/components/RibbonMenu";
import { 
  FolderKanban, Plus, Edit, Trash2, Users, Calendar,
  LayoutGrid, List, Kanban, GanttChart, Target,
  Clock, Flag, MessageSquare, Paperclip, Settings
} from "lucide-react";

const ribbonTabs = [
  {
    id: "projeto",
    label: "Projeto",
    icon: <FolderKanban className="w-4 h-4" />,
    items: [
      { id: "new", label: "Novo Projeto", icon: <Plus className="w-6 h-6" /> },
      { id: "edit", label: "Editar", icon: <Edit className="w-6 h-6" /> },
      { id: "delete", label: "Excluir", icon: <Trash2 className="w-6 h-6" /> },
      { id: "team", label: "Equipe", icon: <Users className="w-6 h-6" /> },
    ],
  },
  {
    id: "visualizacao",
    label: "Visualização",
    icon: <LayoutGrid className="w-4 h-4" />,
    items: [
      { id: "grid", label: "Grade", icon: <LayoutGrid className="w-6 h-6" /> },
      { id: "list", label: "Lista", icon: <List className="w-6 h-6" /> },
      { id: "kanban", label: "Kanban", icon: <Kanban className="w-6 h-6" /> },
      { id: "gantt", label: "Gantt", icon: <GanttChart className="w-6 h-6" /> },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    icon: <Target className="w-4 h-4" />,
    items: [
      { id: "milestones", label: "Marcos", icon: <Target className="w-6 h-6" /> },
      { id: "timeline", label: "Timeline", icon: <Clock className="w-6 h-6" /> },
      { id: "priority", label: "Prioridade", icon: <Flag className="w-6 h-6" /> },
      { id: "calendar", label: "Calendário", icon: <Calendar className="w-6 h-6" /> },
    ],
  },
  {
    id: "colaboracao",
    label: "Colaboração",
    icon: <MessageSquare className="w-4 h-4" />,
    items: [
      { id: "comments", label: "Comentários", icon: <MessageSquare className="w-6 h-6" /> },
      { id: "attachments", label: "Anexos", icon: <Paperclip className="w-6 h-6" /> },
      { id: "settings", label: "Configurar", icon: <Settings className="w-6 h-6" /> },
    ],
  },
];

export default function ProjetoVault() {
  const [activeTab, setActiveTab] = useState("projeto");

  return (
    <div className="min-h-screen bg-background">
      <RibbonMenu
        tabs={ribbonTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title="ProjetoVault"
        accentColor="blue"
      />
      
      {/* Main Content Area */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-blue/20 p-8 min-h-[60vh]">
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-blue/20 flex items-center justify-center animate-pulse-glow">
                  <FolderKanban className="w-10 h-10 text-blue" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">ProjetoVault</h2>
                <p className="text-muted-foreground max-w-md">
                  Gerencie seus projetos com visões Kanban, Gantt e mais.
                  Crie um novo projeto para começar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
