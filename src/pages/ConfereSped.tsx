import { useState } from "react";
import { RibbonMenu } from "@/components/RibbonMenu";
import { 
  FileCheck, Upload, FileText, Eye, Search, Filter,
  BarChart3, PieChart, TrendingUp, AlertOctagon,
  Download, Printer, Share2, ClipboardList, Table
} from "lucide-react";

const ribbonTabs = [
  {
    id: "arquivo",
    label: "Arquivo",
    icon: <FileText className="w-4 h-4" />,
    items: [
      { id: "open", label: "Abrir SPED", icon: <Upload className="w-6 h-6" /> },
      { id: "compare", label: "Comparar", icon: <FileCheck className="w-6 h-6" /> },
      { id: "export", label: "Exportar", icon: <Download className="w-6 h-6" /> },
      { id: "print", label: "Imprimir", icon: <Printer className="w-6 h-6" /> },
    ],
  },
  {
    id: "conferencia",
    label: "Conferência",
    icon: <ClipboardList className="w-4 h-4" />,
    items: [
      { id: "check", label: "Conferir", icon: <FileCheck className="w-6 h-6" /> },
      { id: "view", label: "Visualizar", icon: <Eye className="w-6 h-6" /> },
      { id: "search", label: "Buscar", icon: <Search className="w-6 h-6" /> },
      { id: "filter", label: "Filtrar", icon: <Filter className="w-6 h-6" /> },
    ],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    icon: <BarChart3 className="w-4 h-4" />,
    items: [
      { id: "summary", label: "Resumo", icon: <Table className="w-6 h-6" /> },
      { id: "chart", label: "Gráficos", icon: <PieChart className="w-6 h-6" /> },
      { id: "trends", label: "Tendências", icon: <TrendingUp className="w-6 h-6" /> },
      { id: "errors", label: "Divergências", icon: <AlertOctagon className="w-6 h-6" /> },
    ],
  },
  {
    id: "compartilhar",
    label: "Compartilhar",
    icon: <Share2 className="w-4 h-4" />,
    items: [
      { id: "share", label: "Compartilhar", icon: <Share2 className="w-6 h-6" /> },
      { id: "export-pdf", label: "PDF", icon: <Download className="w-6 h-6" /> },
    ],
  },
];

export default function ConfereSped() {
  const [activeTab, setActiveTab] = useState("arquivo");

  return (
    <div className="min-h-screen bg-background">
      <RibbonMenu
        tabs={ribbonTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title="ConfereSped"
        accentColor="orange"
      />
      
      {/* Main Content Area */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-orange/20 p-8 min-h-[60vh]">
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-orange/20 flex items-center justify-center animate-pulse-glow">
                  <FileCheck className="w-10 h-10 text-orange" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">ConfereSped</h2>
                <p className="text-muted-foreground max-w-md">
                  Confira e valide arquivos SPED com precisão.
                  Compare múltiplos arquivos e gere relatórios detalhados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
