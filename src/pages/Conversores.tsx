import { useState } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { MetricCard } from "@/components/task/MetricCard";
import { 
  FileSpreadsheet, 
  FileText, 
  Receipt, 
  Calculator,
  RefreshCw,
  Zap,
  FileUp,
  Home,
  Crown,
  Lock,
  Plus,
  Settings,
  History,
  Download,
  Upload,
  Filter,
  Search,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { ConversorFiscal } from "@/components/conversores/ConversorFiscal";
import { ConversorExtrato } from "@/components/conversores/ConversorExtrato";
import { ConversorDocumentos } from "@/components/conversores/ConversorDocumentos";
import { ConversorContabil } from "@/components/conversores/ConversorContabil";
import { AjustaSpedTab } from "@/components/conversores/AjustaSpedTab";
import { LancaApaeTab } from "@/components/conversores/LancaApaeTab";
import { ConversorCasaTab } from "@/components/conversores/ConversorCasaTab";
import { ConversorLiderTab } from "@/components/conversores/ConversorLiderTab";
import { motion, AnimatePresence } from "framer-motion";
import { useMyResourcePermissions } from "@/hooks/useResourcePermissions";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { usePermissions } from "@/hooks/usePermissions";
import { useConversoes } from "@/hooks/useConversoes";
import { TimelineItem } from "@/components/task/TimelineItem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAtividades } from "@/hooks/useAtividades";

const conversores = [
  {
    id: "fiscal",
    icon: Receipt,
    title: "Arquivos Fiscais",
    description: "XML de NF-e, SPED, CT-e",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    category: "fiscal",
  },
  {
    id: "extrato",
    icon: FileSpreadsheet,
    title: "Extratos Bancários",
    description: "OFX, PDF para CSV/Excel",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    category: "financeiro",
  },
  {
    id: "documentos",
    icon: FileText,
    title: "Documentos Gerais",
    description: "PDF, texto, planilhas",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    category: "geral",
  },
  {
    id: "contabil",
    icon: Calculator,
    title: "Dados Contábeis",
    description: "Balancete, DRE, plano de contas",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    category: "contabil",
  },
  {
    id: "ajustasped",
    icon: Zap,
    title: "Ajusta SPED",
    description: "Correção de arquivos SPED",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    category: "fiscal",
  },
  {
    id: "lancaapae",
    icon: FileUp,
    title: "Lança APAE",
    description: "Importação de arquivos APAE",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    category: "contabil",
  },
  {
    id: "casa",
    icon: Home,
    title: "Conversor CASA",
    description: "Arquivos do sistema CASA",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    category: "sistemas",
  },
  {
    id: "lider",
    icon: Crown,
    title: "Conversor LÍDER",
    description: "Arquivos do sistema LÍDER",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
    category: "sistemas",
  },
];

const widgetGroups = [
  {
    id: "actions",
    label: "Ações Rápidas",
    icon: <Zap className="w-5 h-5" />,
    items: [
      { id: "upload", label: "Enviar Arquivo", icon: <Upload className="w-5 h-5" />, badge: "+" },
      { id: "download", label: "Baixar", icon: <Download className="w-5 h-5" /> },
      { id: "history", label: "Histórico", icon: <History className="w-5 h-5" /> },
    ],
  },
  {
    id: "view",
    label: "Visualização",
    icon: <Filter className="w-5 h-5" />,
    items: [
      { id: "filter", label: "Filtrar", icon: <Filter className="w-5 h-5" /> },
      { id: "search", label: "Buscar", icon: <Search className="w-5 h-5" /> },
    ],
  },
  {
    id: "extras",
    label: "Extras",
    icon: <Settings className="w-5 h-5" />,
    items: [
      { id: "settings", label: "Config", icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

type FilterType = "all" | "fiscal" | "financeiro" | "contabil" | "sistemas";

const Conversores = () => {
  const [activeTab, setActiveTab] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { empresaAtiva, loading: empresaLoading, empresasDisponiveis } = useEmpresaAtiva();
  const { isAdmin } = usePermissions();
  
  // Determinar o empresaId para permissões:
  // - undefined: ainda carregando empresas (aguardar)
  // - null: usuário não tem empresas vinculadas (standalone)
  // - string: usar empresa ativa
  const permissionEmpresaId = empresaLoading 
    ? undefined 
    : (empresasDisponiveis.length === 0 ? null : empresaAtiva?.id);
  
  const { hasResourcePermission, isLoading: permissionsLoading } = useMyResourcePermissions(permissionEmpresaId);
  const { conversoes } = useConversoes(empresaAtiva?.id);
  
  // Use persistent activities hook
  const { atividades, loading: atividadesLoading } = useAtividades("conversores", empresaAtiva?.id);
  // Stats from conversoes
  const totalConversoes = conversoes?.length || 0;
  const conversoesSucesso = conversoes?.filter(c => c.status === 'sucesso').length || 0;
  const conversoesPendentes = conversoes?.filter(c => c.status === 'pendente' || c.status === 'processando').length || 0;
  const conversoesErro = conversoes?.filter(c => c.status === 'erro').length || 0;

  // Função para verificar se usuário tem acesso a um conversor
  // Admin tem acesso total; demais verificam permissões (com ou sem empresa)
  const hasConversorAccess = (conversorId: string): boolean => {
    if (isAdmin) return true;
    return hasResourcePermission('conversores', conversorId, 'can_view');
  };

  // Filtrar conversores por categoria
  const getFilteredConversores = () => {
    const available = conversores.filter(c => hasConversorAccess(c.id));
    if (activeFilter === "all") return available;
    return available.filter(c => c.category === activeFilter);
  };

  const filteredConversores = getFilteredConversores();
  const conversoresBloqueados = conversores.filter(c => !hasConversorAccess(c.id));

  // Contagem por categoria
  const countByCategory = (category: string) => {
    return conversores.filter(c => c.category === category && hasConversorAccess(c.id)).length;
  };

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(prev => prev === filter ? "all" : filter);
  };

  // Sidebar content with filters and timeline
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Filters Section */}
      <div className="p-3 border-b border-cyan-500/20">
        <div className="text-xs font-bold text-cyan-400 mb-3">Categorias</div>
        <div className="space-y-2">
          {["fiscal", "financeiro", "contabil", "sistemas"].map(cat => (
            <button
              key={cat}
              onClick={() => handleFilterClick(cat as FilterType)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-all ${
                activeFilter === cat 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)} ({countByCategory(cat)})
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Section */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="text-xs font-bold text-cyan-400 mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Atividades Recentes
        </div>
        <div className="space-y-1">
          {atividades.length > 0 ? (
            atividades.map(atividade => (
              <TimelineItem key={atividade.id} atividade={atividade} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma atividade recente</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-14 pb-28">
      <WidgetRibbon 
        groups={widgetGroups} 
        title="Conversores" 
        accentColor="cyan" 
        sidebarContent={sidebarContent}
      />
      
      <div className="p-4 pr-72">
        <AnimatePresence mode="wait">
          {!activeTab ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Dashboard Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <MetricCard 
                  title="Total Conversões" 
                  value={totalConversoes} 
                  change="Este mês" 
                  changeType="up" 
                  icon={RefreshCw} 
                  color="blue"
                  isActive={activeFilter === "all"}
                  onClick={() => handleFilterClick("all")}
                />
                <MetricCard 
                  title="Sucesso" 
                  value={conversoesSucesso} 
                  change={`${totalConversoes > 0 ? Math.round((conversoesSucesso/totalConversoes)*100) : 0}% do total`}
                  changeType="up" 
                  icon={CheckCircle} 
                  color="green"
                />
                <MetricCard 
                  title="Pendentes" 
                  value={conversoesPendentes} 
                  change="Aguardando" 
                  changeType="up" 
                  icon={Clock} 
                  color="yellow"
                />
                <MetricCard 
                  title="Com Erro" 
                  value={conversoesErro} 
                  change={conversoesErro > 0 ? "Atenção!" : "OK"}
                  changeType={conversoesErro > 0 ? "down" : "up"} 
                  icon={AlertTriangle} 
                  color="red"
                />
              </div>

              {/* Filter indicator */}
              {activeFilter !== "all" && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filtro ativo:</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
                  </span>
                  <button 
                    onClick={() => setActiveFilter("all")}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Limpar
                  </button>
                </div>
              )}

              {/* Conversores Grid */}
              {filteredConversores.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                  {filteredConversores.map((conversor, index) => {
                    const Icon = conversor.icon;
                    
                    return (
                      <motion.div
                        key={conversor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group border ${conversor.borderColor} hover:border-current bg-card/50 backdrop-blur-sm`}
                          onClick={() => setActiveTab(conversor.id)}
                        >
                          <CardHeader className="p-3 pb-2">
                            <div className={`w-10 h-10 rounded-lg ${conversor.bgColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                              <Icon className={`w-5 h-5 ${conversor.color}`} />
                            </div>
                            <CardTitle className="text-sm font-semibold leading-tight">
                              {conversor.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <CardDescription className="text-xs line-clamp-2">
                              {conversor.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Bloqueados */}
              {conversoresBloqueados.length > 0 && activeFilter === "all" && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Sem acesso ({conversoresBloqueados.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {conversoresBloqueados.map((conversor, index) => (
                      <motion.div
                        key={conversor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (filteredConversores.length + index) * 0.05 }}
                      >
                        <Card className="cursor-not-allowed opacity-50 grayscale border border-muted">
                          <CardHeader className="p-3 pb-2">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-sm font-semibold leading-tight text-muted-foreground">
                              {conversor.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <CardDescription className="text-xs line-clamp-2">
                              {conversor.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Back button */}
              <button
                onClick={() => setActiveTab("")}
                className="mb-4 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
              >
                ← Voltar aos conversores
              </button>
              
              {activeTab === "fiscal" && <ConversorFiscal />}
              {activeTab === "extrato" && <ConversorExtrato />}
              {activeTab === "documentos" && <ConversorDocumentos />}
              {activeTab === "contabil" && <ConversorContabil />}
              {activeTab === "ajustasped" && <AjustaSpedTab />}
              {activeTab === "lancaapae" && <LancaApaeTab />}
              {activeTab === "casa" && <ConversorCasaTab />}
              {activeTab === "lider" && <ConversorLiderTab />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Conversores;
