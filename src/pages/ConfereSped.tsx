import { useState } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { MetricCard } from "@/components/task/MetricCard";
import { TimelineItem } from "@/components/task/TimelineItem";
import { 
  FileCheck, Upload, FileText, Eye, Search, Filter,
  BarChart3, PieChart, TrendingUp, AlertOctagon,
  Download, Printer, Share2, ClipboardList, Table,
  CheckCircle, XCircle, AlertTriangle, Clock, Activity,
  List, LayoutGrid, FileSearch, Plus, Edit, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Atividade } from "@/types/task";

interface Conferencia {
  id: string;
  arquivo: string;
  tipo: "ICMS_x_NF" | "PIS_COFINS" | "BLOCO_K" | "BLOCO_H";
  competencia: string;
  status: "conferido" | "divergente" | "pendente";
  divergencias: number;
  totalRegistros: number;
  dataConferencia: string;
}

const widgetGroups = [
  {
    id: "arquivo",
    label: "Arquivo",
    icon: <FileText className="w-5 h-5" />,
    items: [
      { id: "open", label: "Abrir SPED", icon: <Upload className="w-5 h-5" />, badge: "+" },
      { id: "compare", label: "Comparar", icon: <FileCheck className="w-5 h-5" /> },
      { id: "export", label: "Exportar", icon: <Download className="w-5 h-5" /> },
      { id: "print", label: "Imprimir", icon: <Printer className="w-5 h-5" /> },
    ],
  },
  {
    id: "conferencia",
    label: "Conferência",
    icon: <ClipboardList className="w-5 h-5" />,
    items: [
      { id: "check", label: "Conferir", icon: <FileCheck className="w-5 h-5" /> },
      { id: "view", label: "Visualizar", icon: <Eye className="w-5 h-5" /> },
      { id: "search", label: "Buscar", icon: <Search className="w-5 h-5" /> },
      { id: "filter", label: "Filtrar", icon: <Filter className="w-5 h-5" /> },
    ],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    icon: <BarChart3 className="w-5 h-5" />,
    items: [
      { id: "summary", label: "Resumo", icon: <Table className="w-5 h-5" /> },
      { id: "chart", label: "Gráficos", icon: <PieChart className="w-5 h-5" /> },
      { id: "trends", label: "Tendências", icon: <TrendingUp className="w-5 h-5" /> },
      { id: "errors", label: "Divergências", icon: <AlertOctagon className="w-5 h-5" /> },
    ],
  },
  {
    id: "compartilhar",
    label: "Compartilhar",
    icon: <Share2 className="w-5 h-5" />,
    items: [
      { id: "share", label: "Compartilhar", icon: <Share2 className="w-5 h-5" /> },
      { id: "export-pdf", label: "PDF", icon: <Download className="w-5 h-5" /> },
    ],
  },
  {
    id: "extras",
    label: "Extras",
    icon: <Settings className="w-5 h-5" />,
    items: [
      { id: "analyze", label: "Analisar", icon: <FileSearch className="w-5 h-5" /> },
      { id: "settings", label: "Config", icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

type FilterType = "all" | "conferido" | "divergente" | "pendente";

export default function ConfereSped() {
  const [activeTab, setActiveTab] = useState<"conferencias" | "divergencias" | "relatorios">("conferencias");
  const [viewMode, setViewMode] = useState<"lista" | "grid">("lista");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const [conferencias, setConferencias] = useState<Conferencia[]>([
    { id: "1", arquivo: "EFD_ICMS_122024.txt", tipo: "ICMS_x_NF", competencia: "12/2024", status: "conferido", divergencias: 0, totalRegistros: 1250, dataConferencia: "2024-12-20" },
    { id: "2", arquivo: "EFD_CONTRIB_122024.txt", tipo: "PIS_COFINS", competencia: "12/2024", status: "divergente", divergencias: 12, totalRegistros: 890, dataConferencia: "2024-12-19" },
    { id: "3", arquivo: "EFD_ICMS_122024.txt", tipo: "BLOCO_K", competencia: "12/2024", status: "pendente", divergencias: 0, totalRegistros: 450, dataConferencia: "2024-12-18" },
    { id: "4", arquivo: "EFD_ICMS_112024.txt", tipo: "BLOCO_H", competencia: "11/2024", status: "conferido", divergencias: 0, totalRegistros: 320, dataConferencia: "2024-12-17" },
    { id: "5", arquivo: "EFD_CONTRIB_112024.txt", tipo: "PIS_COFINS", competencia: "11/2024", status: "divergente", divergencias: 5, totalRegistros: 780, dataConferencia: "2024-12-16" },
  ]);

  const [atividades] = useState<Atividade[]>([
    { id: "1", tipo: "criacao", descricao: "Nova conferência: ICMS x NF-e", timestamp: "Há 1 hora", usuario: "Sistema" },
    { id: "2", tipo: "conclusao", descricao: "Conferência OK: Bloco H 11/2024", timestamp: "Há 3 horas", usuario: "Ana" },
    { id: "3", tipo: "comentario", descricao: "Divergência encontrada: PIS/COFINS", timestamp: "Há 5 horas", usuario: "Carlos" },
    { id: "4", tipo: "edicao", descricao: "Relatório gerado: Resumo mensal", timestamp: "Há 1 dia", usuario: "Maria" },
  ]);

  // Calculations
  const totalConferencias = conferencias.length;
  const conferenciasConcluidas = conferencias.filter(c => c.status === "conferido").length;
  const conferenciasDivergentes = conferencias.filter(c => c.status === "divergente").length;
  const conferenciasPendentes = conferencias.filter(c => c.status === "pendente").length;
  const totalDivergencias = conferencias.reduce((acc, c) => acc + c.divergencias, 0);

  const getFilteredConferencias = () => {
    switch (activeFilter) {
      case "conferido":
        return conferencias.filter(c => c.status === "conferido");
      case "divergente":
        return conferencias.filter(c => c.status === "divergente");
      case "pendente":
        return conferencias.filter(c => c.status === "pendente");
      default:
        return conferencias;
    }
  };

  const filteredConferencias = getFilteredConferencias();

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(prev => prev === filter ? "all" : filter);
  };

  const getStatusColor = (status: Conferencia["status"]) => {
    switch (status) {
      case "conferido": return "bg-green-500/20 text-green-300";
      case "divergente": return "bg-red-500/20 text-red-300";
      case "pendente": return "bg-yellow-500/20 text-yellow-300";
    }
  };

  const getTipoLabel = (tipo: Conferencia["tipo"]) => {
    switch (tipo) {
      case "ICMS_x_NF": return "ICMS x NF-e";
      case "PIS_COFINS": return "PIS/COFINS";
      case "BLOCO_K": return "Bloco K";
      case "BLOCO_H": return "Bloco H";
    }
  };

  // Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Filters Section */}
      <div className="p-3 border-b border-orange-500/20">
        <div className="text-xs font-bold text-orange-400 mb-3">Filtros Rápidos</div>
        <div className="space-y-2">
          <select className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80">
            <option>Todos Tipos</option>
            <option>ICMS x NF-e</option>
            <option>PIS/COFINS</option>
            <option>Bloco K</option>
            <option>Bloco H</option>
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
        <div className="text-xs font-bold text-orange-400 mb-3 flex items-center gap-2">
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
        title="ConfereSped"
        accentColor="orange" 
        sidebarContent={sidebarContent}
      />
      
      <div className="p-4 pr-72">
        {/* Dashboard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard 
            title="Total Conferências" 
            value={totalConferencias} 
            change={`${conferencias.reduce((acc, c) => acc + c.totalRegistros, 0).toLocaleString()} registros`} 
            changeType="up" 
            icon={FileCheck} 
            color="blue"
            isActive={activeFilter === "all"}
            onClick={() => handleFilterClick("all")}
          />
          <MetricCard 
            title="Conferidas" 
            value={conferenciasConcluidas} 
            change="Sem divergências" 
            changeType="up" 
            icon={CheckCircle} 
            color="green"
            isActive={activeFilter === "conferido"}
            onClick={() => handleFilterClick("conferido")}
          />
          <MetricCard 
            title="Com Divergências" 
            value={conferenciasDivergentes} 
            change={`${totalDivergencias} divergências`} 
            changeType="down" 
            icon={AlertTriangle} 
            color="red"
            isActive={activeFilter === "divergente"}
            onClick={() => handleFilterClick("divergente")}
          />
          <MetricCard 
            title="Pendentes" 
            value={conferenciasPendentes} 
            change="Aguardando análise" 
            changeType="up" 
            icon={Clock} 
            color="yellow"
            isActive={activeFilter === "pendente"}
            onClick={() => handleFilterClick("pendente")}
          />
        </div>

        {/* Filter indicator */}
        {activeFilter !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtro ativo:</span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
              {activeFilter === "conferido" ? "Conferidas" : activeFilter === "divergente" ? "Com Divergências" : "Pendentes"}
            </span>
            <button 
              onClick={() => setActiveFilter("all")}
              className="text-xs text-orange-400 hover:text-orange-300 underline"
            >
              Limpar
            </button>
          </div>
        )}

        {/* Tabs & View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("conferencias")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "conferencias" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
            >
              <FileCheck className="w-4 h-4 inline mr-2" />Conferências ({filteredConferencias.length})
            </button>
            <button
              onClick={() => setActiveTab("divergencias")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "divergencias" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
            >
              <AlertOctagon className="w-4 h-4 inline mr-2" />Divergências ({totalDivergencias})
            </button>
            <button
              onClick={() => setActiveTab("relatorios")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "relatorios" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />Relatórios
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-card/50 rounded-lg p-1 border border-foreground/10">
              <button onClick={() => setViewMode("lista")} className={`p-2 rounded-md transition-all ${viewMode === "lista" ? "bg-orange-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-orange-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <FileCheck className="w-4 h-4 mr-1" /> Nova Conferência
            </Button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "conferencias" && (
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-orange-500/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-orange-500/10 border-b border-orange-500/20">
                <tr>
                  <th className="text-left p-3 font-medium text-foreground/80">Arquivo</th>
                  <th className="text-left p-3 font-medium text-foreground/80">Tipo</th>
                  <th className="text-left p-3 font-medium text-foreground/80">Competência</th>
                  <th className="text-left p-3 font-medium text-foreground/80">Status</th>
                  <th className="text-center p-3 font-medium text-foreground/80">Registros</th>
                  <th className="text-center p-3 font-medium text-foreground/80">Divergências</th>
                  <th className="text-center p-3 font-medium text-foreground/80">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {filteredConferencias.map(conferencia => (
                  <tr key={conferencia.id} className="hover:bg-foreground/5 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <FileCheck className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{conferencia.arquivo}</span>
                          <p className="text-xs text-muted-foreground">{new Date(conferencia.dataConferencia).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300">
                        {getTipoLabel(conferencia.tipo)}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{conferencia.competencia}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conferencia.status)}`}>
                        {conferencia.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-foreground">{conferencia.totalRegistros.toLocaleString()}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-semibold ${conferencia.divergencias > 0 ? "text-red-400" : "text-green-400"}`}>
                        {conferencia.divergencias}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors" title="Visualizar">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors" title="Relatório">
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors" title="Download">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "divergencias" && (
          <div className="grid gap-4">
            {conferencias.filter(c => c.divergencias > 0).map(conferencia => (
              <div key={conferencia.id} className="bg-card/30 backdrop-blur-xl rounded-xl border border-red-500/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <AlertOctagon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{conferencia.arquivo}</h3>
                      <p className="text-xs text-muted-foreground">{getTipoLabel(conferencia.tipo)} • {conferencia.competencia}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                    {conferencia.divergencias} divergências
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: Math.min(conferencia.divergencias, 3) }).map((_, i) => (
                    <div key={i} className="p-2 rounded-lg bg-red-950/30 border border-red-500/20 text-xs">
                      <span className="text-red-300">Divergência {i + 1}:</span>
                      <span className="text-muted-foreground ml-1">
                        {i === 0 ? "Valor ICMS divergente" : i === 1 ? "Base de cálculo incorreta" : "Alíquota não confere"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "relatorios" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { nome: "Resumo Geral", desc: "Visão consolidada das conferências", icon: Table },
              { nome: "Por Tipo", desc: "Análise por tipo de conferência", icon: PieChart },
              { nome: "Tendências", desc: "Evolução das divergências", icon: TrendingUp },
              { nome: "Detalhado", desc: "Relatório completo por arquivo", icon: FileText },
              { nome: "Comparativo", desc: "Compare diferentes períodos", icon: BarChart3 },
              { nome: "Exportar", desc: "Exporte dados em PDF/Excel", icon: Download },
            ].map((relatorio, i) => (
              <div 
                key={relatorio.nome} 
                className="bg-card/30 backdrop-blur-xl rounded-xl border border-orange-500/20 p-4 hover:border-orange-500/40 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <relatorio.icon className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{relatorio.nome}</h3>
                <p className="text-xs text-muted-foreground">{relatorio.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
