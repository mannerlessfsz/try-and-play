import { useState } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { MetricCard } from "@/components/task/MetricCard";
import { TimelineItem } from "@/components/task/TimelineItem";
import { 
  FileText, Upload, Download, Play, Pause, RotateCcw,
  Settings, Eye, CheckCircle, AlertTriangle, FileSearch,
  Wrench, Zap, Save, FolderOpen, Filter, SortAsc, Search,
  FileDown, FileUp, Activity, List, LayoutGrid, Clock,
  XCircle, CheckSquare, FileWarning, Plus, Edit, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAtividades } from "@/hooks/useAtividades";

interface ArquivoSped {
  id: string;
  nome: string;
  tipo: "EFD_ICMS" | "EFD_CONTRIB" | "ECF" | "ECD";
  competencia: string;
  status: "pendente" | "processando" | "ajustado" | "erro";
  erros: number;
  ajustes: number;
  dataUpload: string;
}

const widgetGroups = [
  {
    id: "arquivo",
    label: "Arquivo",
    icon: <FileText className="w-5 h-5" />,
    items: [
      { id: "open", label: "Abrir SPED", icon: <FolderOpen className="w-5 h-5" />, badge: "+" },
      { id: "save", label: "Salvar", icon: <Save className="w-5 h-5" /> },
      { id: "import", label: "Importar", icon: <Upload className="w-5 h-5" /> },
      { id: "export", label: "Exportar", icon: <Download className="w-5 h-5" /> },
    ],
  },
  {
    id: "ajustes",
    label: "Ajustes",
    icon: <Wrench className="w-5 h-5" />,
    items: [
      { id: "auto", label: "Auto Ajuste", icon: <Zap className="w-5 h-5" /> },
      { id: "manual", label: "Manual", icon: <Wrench className="w-5 h-5" /> },
      { id: "undo", label: "Desfazer", icon: <RotateCcw className="w-5 h-5" /> },
      { id: "settings", label: "Regras", icon: <Settings className="w-5 h-5" /> },
    ],
  },
  {
    id: "validacao",
    label: "Validação",
    icon: <CheckCircle className="w-5 h-5" />,
    items: [
      { id: "validate", label: "Validar", icon: <CheckCircle className="w-5 h-5" /> },
      { id: "errors", label: "Erros", icon: <AlertTriangle className="w-5 h-5" /> },
      { id: "preview", label: "Visualizar", icon: <Eye className="w-5 h-5" /> },
      { id: "analyze", label: "Analisar", icon: <FileSearch className="w-5 h-5" /> },
    ],
  },
  {
    id: "processo",
    label: "Processo",
    icon: <Play className="w-5 h-5" />,
    items: [
      { id: "start", label: "Iniciar", icon: <Play className="w-5 h-5" /> },
      { id: "pause", label: "Pausar", icon: <Pause className="w-5 h-5" /> },
      { id: "stop", label: "Parar", icon: <RotateCcw className="w-5 h-5" /> },
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

type FilterType = "all" | "pendente" | "ajustado" | "erro";

export default function AjustaSped() {
  const [activeTab, setActiveTab] = useState<"arquivos" | "erros" | "historico">("arquivos");
  const [viewMode, setViewMode] = useState<"lista" | "grid">("lista");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const [arquivos, setArquivos] = useState<ArquivoSped[]>([
    { id: "1", nome: "EFD_ICMS_122024.txt", tipo: "EFD_ICMS", competencia: "12/2024", status: "pendente", erros: 15, ajustes: 0, dataUpload: "2024-12-20" },
    { id: "2", nome: "EFD_CONTRIB_122024.txt", tipo: "EFD_CONTRIB", competencia: "12/2024", status: "processando", erros: 8, ajustes: 3, dataUpload: "2024-12-19" },
    { id: "3", nome: "ECF_2024.txt", tipo: "ECF", competencia: "2024", status: "ajustado", erros: 0, ajustes: 42, dataUpload: "2024-12-18" },
    { id: "4", nome: "ECD_2024.txt", tipo: "ECD", competencia: "2024", status: "erro", erros: 25, ajustes: 10, dataUpload: "2024-12-17" },
    { id: "5", nome: "EFD_ICMS_112024.txt", tipo: "EFD_ICMS", competencia: "11/2024", status: "ajustado", erros: 0, ajustes: 18, dataUpload: "2024-12-15" },
  ]);

  // Use persistent activities hook
  const { atividades, addAtividade, loading: atividadesLoading } = useAtividades("ajustasped");

  // Calculations
  const totalArquivos = arquivos.length;
  const arquivosPendentes = arquivos.filter(a => a.status === "pendente").length;
  const arquivosAjustados = arquivos.filter(a => a.status === "ajustado").length;
  const arquivosComErro = arquivos.filter(a => a.status === "erro").length;
  const totalErros = arquivos.reduce((acc, a) => acc + a.erros, 0);

  const getFilteredArquivos = () => {
    switch (activeFilter) {
      case "pendente":
        return arquivos.filter(a => a.status === "pendente" || a.status === "processando");
      case "ajustado":
        return arquivos.filter(a => a.status === "ajustado");
      case "erro":
        return arquivos.filter(a => a.status === "erro");
      default:
        return arquivos;
    }
  };

  const filteredArquivos = getFilteredArquivos();

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(prev => prev === filter ? "all" : filter);
  };

  const getStatusColor = (status: ArquivoSped["status"]) => {
    switch (status) {
      case "pendente": return "bg-gray-500/20 text-gray-300";
      case "processando": return "bg-blue-500/20 text-blue-300";
      case "ajustado": return "bg-green-500/20 text-green-300";
      case "erro": return "bg-red-500/20 text-red-300";
    }
  };

  const getTipoColor = (tipo: ArquivoSped["tipo"]) => {
    switch (tipo) {
      case "EFD_ICMS": return "bg-cyan-500/20 text-cyan-300";
      case "EFD_CONTRIB": return "bg-purple-500/20 text-purple-300";
      case "ECF": return "bg-orange-500/20 text-orange-300";
      case "ECD": return "bg-pink-500/20 text-pink-300";
    }
  };

  // Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Filters Section */}
      <div className="p-3 border-b border-cyan-500/20">
        <div className="text-xs font-bold text-cyan-400 mb-3">Filtros Rápidos</div>
        <div className="space-y-2">
          <select className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80">
            <option>Todos Tipos</option>
            <option>EFD ICMS/IPI</option>
            <option>EFD Contribuições</option>
            <option>ECF</option>
            <option>ECD</option>
          </select>
          <select className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80">
            <option>Todas Competências</option>
            <option>12/2024</option>
            <option>11/2024</option>
            <option>10/2024</option>
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
        <div className="text-xs font-bold text-cyan-400 mb-3 flex items-center gap-2">
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

  return (
    <div className="min-h-screen bg-background pt-14 pb-24">
      <WidgetRibbon 
        groups={widgetGroups} 
        title="AjustaSped"
        accentColor="cyan" 
        sidebarContent={sidebarContent}
      />
      
      <div className="p-4 pr-72">
        {/* Dashboard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard 
            title="Total Arquivos" 
            value={totalArquivos} 
            change={`${totalErros} erros encontrados`} 
            changeType="up" 
            icon={FileText} 
            color="blue"
            isActive={activeFilter === "all"}
            onClick={() => handleFilterClick("all")}
          />
          <MetricCard 
            title="Pendentes" 
            value={arquivosPendentes} 
            change="Aguardando processamento" 
            changeType="up" 
            icon={Clock} 
            color="yellow"
            isActive={activeFilter === "pendente"}
            onClick={() => handleFilterClick("pendente")}
          />
          <MetricCard 
            title="Ajustados" 
            value={arquivosAjustados} 
            change="Prontos para envio" 
            changeType="up" 
            icon={CheckSquare} 
            color="green"
            isActive={activeFilter === "ajustado"}
            onClick={() => handleFilterClick("ajustado")}
          />
          <MetricCard 
            title="Com Erros" 
            value={arquivosComErro} 
            change="Requer atenção!" 
            changeType="down" 
            icon={XCircle} 
            color="red"
            isActive={activeFilter === "erro"}
            onClick={() => handleFilterClick("erro")}
          />
        </div>

        {/* Filter indicator */}
        {activeFilter !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtro ativo:</span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {activeFilter === "pendente" ? "Pendentes" : activeFilter === "ajustado" ? "Ajustados" : "Com Erros"}
            </span>
            <button 
              onClick={() => setActiveFilter("all")}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline"
            >
              Limpar
            </button>
          </div>
        )}

        {/* Tabs & View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("arquivos")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "arquivos" ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
            >
              <FileText className="w-4 h-4 inline mr-2" />Arquivos ({filteredArquivos.length})
            </button>
            <button
              onClick={() => setActiveTab("erros")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "erros" ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />Erros ({totalErros})
            </button>
            <button
              onClick={() => setActiveTab("historico")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "historico" ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
            >
              <Clock className="w-4 h-4 inline mr-2" />Histórico
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-card/50 rounded-lg p-1 border border-foreground/10">
              <button onClick={() => setViewMode("lista")} className={`p-2 rounded-md transition-all ${viewMode === "lista" ? "bg-cyan-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-cyan-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Upload className="w-4 h-4 mr-1" /> Importar SPED
            </Button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "arquivos" && (
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cyan-500/10 border-b border-cyan-500/20">
                <tr>
                  <th className="text-left p-3 font-medium text-foreground/80">Arquivo</th>
                  <th className="text-left p-3 font-medium text-foreground/80">Tipo</th>
                  <th className="text-left p-3 font-medium text-foreground/80">Competência</th>
                  <th className="text-left p-3 font-medium text-foreground/80">Status</th>
                  <th className="text-center p-3 font-medium text-foreground/80">Erros</th>
                  <th className="text-center p-3 font-medium text-foreground/80">Ajustes</th>
                  <th className="text-center p-3 font-medium text-foreground/80">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {filteredArquivos.map(arquivo => (
                  <tr key={arquivo.id} className="hover:bg-foreground/5 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{arquivo.nome}</span>
                          <p className="text-xs text-muted-foreground">{new Date(arquivo.dataUpload).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(arquivo.tipo)}`}>
                        {arquivo.tipo.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{arquivo.competencia}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(arquivo.status)}`}>
                        {arquivo.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-semibold ${arquivo.erros > 0 ? "text-red-400" : "text-green-400"}`}>
                        {arquivo.erros}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-cyan-400">{arquivo.ajustes}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors" title="Processar">
                          <Play className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors" title="Visualizar">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "erros" && (
          <div className="grid gap-4">
            {arquivos.filter(a => a.erros > 0).map(arquivo => (
              <div key={arquivo.id} className="bg-card/30 backdrop-blur-xl rounded-xl border border-red-500/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <FileWarning className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{arquivo.nome}</h3>
                      <p className="text-xs text-muted-foreground">{arquivo.tipo} • {arquivo.competencia}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                    {arquivo.erros} erros
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: Math.min(arquivo.erros, 3) }).map((_, i) => (
                    <div key={i} className="p-2 rounded-lg bg-red-950/30 border border-red-500/20 text-xs">
                      <span className="text-red-300">Erro {i + 1}:</span>
                      <span className="text-muted-foreground ml-1">Registro inválido na linha {100 + i * 50}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "historico" && (
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-6">
            <div className="space-y-4">
              {atividades.map((atividade, index) => (
                <div key={atividade.id} className="flex items-start gap-4">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      atividade.tipo === "criacao" ? "bg-green-500/20" :
                      atividade.tipo === "conclusao" ? "bg-blue-500/20" :
                      atividade.tipo === "edicao" ? "bg-yellow-500/20" :
                      "bg-purple-500/20"
                    }`}>
                      {atividade.tipo === "criacao" && <Plus className="w-4 h-4 text-green-400" />}
                      {atividade.tipo === "conclusao" && <CheckCircle className="w-4 h-4 text-blue-400" />}
                      {atividade.tipo === "edicao" && <Edit className="w-4 h-4 text-yellow-400" />}
                      {atividade.tipo === "comentario" && <AlertTriangle className="w-4 h-4 text-purple-400" />}
                    </div>
                    {index < atividades.length - 1 && (
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-8 bg-foreground/10" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{atividade.descricao}</p>
                    <p className="text-xs text-muted-foreground mt-1">{atividade.timestamp} • {atividade.usuario}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
