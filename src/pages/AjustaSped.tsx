import { useState } from "react";
import { RibbonMenu } from "@/components/RibbonMenu";
import { 
  FileText, Upload, Download, Play, Pause, RotateCcw,
  Settings, Eye, CheckCircle, AlertTriangle, FileSearch,
  Wrench, Zap, Save, FolderOpen
} from "lucide-react";

const ribbonTabs = [
  {
    id: "arquivo",
    label: "Arquivo",
    icon: <FileText className="w-4 h-4" />,
    items: [
      { id: "open", label: "Abrir SPED", icon: <FolderOpen className="w-6 h-6" /> },
      { id: "save", label: "Salvar", icon: <Save className="w-6 h-6" /> },
      { id: "import", label: "Importar", icon: <Upload className="w-6 h-6" /> },
      { id: "export", label: "Exportar", icon: <Download className="w-6 h-6" /> },
    ],
  },
  {
    id: "ajustes",
    label: "Ajustes",
    icon: <Wrench className="w-4 h-4" />,
    items: [
      { id: "auto", label: "Auto Ajuste", icon: <Zap className="w-6 h-6" /> },
      { id: "manual", label: "Manual", icon: <Wrench className="w-6 h-6" /> },
      { id: "undo", label: "Desfazer", icon: <RotateCcw className="w-6 h-6" /> },
      { id: "settings", label: "Regras", icon: <Settings className="w-6 h-6" /> },
    ],
  },
  {
    id: "validacao",
    label: "Validação",
    icon: <CheckCircle className="w-4 h-4" />,
    items: [
      { id: "validate", label: "Validar", icon: <CheckCircle className="w-6 h-6" /> },
      { id: "errors", label: "Erros", icon: <AlertTriangle className="w-6 h-6" /> },
      { id: "preview", label: "Visualizar", icon: <Eye className="w-6 h-6" /> },
      { id: "analyze", label: "Analisar", icon: <FileSearch className="w-6 h-6" /> },
    ],
  },
  {
    id: "processo",
    label: "Processo",
    icon: <Play className="w-4 h-4" />,
    items: [
      { id: "start", label: "Iniciar", icon: <Play className="w-6 h-6" /> },
      { id: "pause", label: "Pausar", icon: <Pause className="w-6 h-6" /> },
      { id: "stop", label: "Parar", icon: <RotateCcw className="w-6 h-6" /> },
    ],
  },
];

export default function AjustaSped() {
  const [activeTab, setActiveTab] = useState("arquivo");

  return (
    <div className="min-h-screen bg-background">
      <RibbonMenu
        tabs={ribbonTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title="AjustaSped"
        accentColor="cyan"
      />
      
      {/* Main Content Area */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-cyan/20 p-8 min-h-[60vh]">
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-cyan/20 flex items-center justify-center animate-pulse-glow">
                  <FileText className="w-10 h-10 text-cyan" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">AjustaSped</h2>
                <p className="text-muted-foreground max-w-md">
                  Ajuste arquivos SPED automaticamente.
                  Carregue um arquivo para começar os ajustes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
