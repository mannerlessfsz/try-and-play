import { useState, useMemo } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
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
  Settings,
  History,
  Download,
  Upload,
  Filter,
  Search,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { ConversorFiscal } from "@/components/conversores/ConversorFiscal";
import { ConversorExtrato } from "@/components/conversores/ConversorExtrato";
import { ConversorDocumentos } from "@/components/conversores/ConversorDocumentos";
import ConversorItauSispag from "@/components/conversores/ConversorItauSispag";
import { AjustaSpedTab } from "@/components/conversores/AjustaSpedTab";
import { LancaApaeTab } from "@/components/conversores/LancaApaeTab";
import { ConversorCasaTab } from "@/components/conversores/ConversorCasaTab";
import { ConversorLiderTab } from "@/components/conversores/ConversorLiderTab";
import { motion, AnimatePresence } from "framer-motion";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useConversoes } from "@/hooks/useConversoes";
import { TimelineItem } from "@/components/task/TimelineItem";
import { useAtividades } from "@/hooks/useAtividades";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const conversores = [
  {
    id: "fiscal",
    icon: Receipt,
    title: "Arquivos Fiscais",
    description: "XML de NF-e, SPED, CT-e",
    category: "fiscal",
  },
  {
    id: "extrato",
    icon: FileSpreadsheet,
    title: "Extratos Bancários",
    description: "OFX, PDF para CSV/Excel",
    category: "financeiro",
  },
  {
    id: "documentos",
    icon: FileText,
    title: "Documentos Gerais",
    description: "PDF, texto, planilhas",
    category: "geral",
  },
  {
    id: "itausispag",
    icon: Calculator,
    title: "ITAU SISPAG",
    description: "Remessa para fornecedores",
    category: "financeiro",
  },
  {
    id: "ajustasped",
    icon: Zap,
    title: "Ajusta SPED",
    description: "Correção de arquivos SPED",
    category: "fiscal",
  },
  {
    id: "lancaapae",
    icon: FileUp,
    title: "Lança APAE",
    description: "Importação de arquivos APAE",
    category: "contabil",
  },
  {
    id: "casa",
    icon: Home,
    title: "Conversor CASA",
    description: "Arquivos do sistema CASA",
    category: "sistemas",
  },
  {
    id: "lider",
    icon: Crown,
    title: "Conversor LÍDER",
    description: "Arquivos do sistema LÍDER",
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

type FilterType = "all" | "fiscal" | "financeiro" | "contabil" | "sistemas" | "geral";

const categoryMeta: Record<string, { label: string; color: string }> = {
  fiscal: { label: "Fiscal", color: "hsl(var(--orange))" },
  financeiro: { label: "Financeiro", color: "hsl(var(--blue))" },
  contabil: { label: "Contábil", color: "hsl(var(--cyan))" },
  sistemas: { label: "Sistemas", color: "hsl(270 80% 60%)" },
  geral: { label: "Geral", color: "hsl(var(--yellow))" },
};

const Conversores = () => {
  const [activeTab, setActiveTab] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { empresaAtiva } = useEmpresaAtiva();
  const { isAdmin, hasModuleAccessFlexible, hasPermissionFlexible } = useModulePermissions();
  const { conversoes } = useConversoes(empresaAtiva?.id);
  const { atividades } = useAtividades("conversores", empresaAtiva?.id);

  const totalConversoes = conversoes?.length || 0;
  const conversoesSucesso = conversoes?.filter(c => c.status === 'sucesso').length || 0;
  const conversoesPendentes = conversoes?.filter(c => c.status === 'pendente' || c.status === 'processando').length || 0;
  const conversoesErro = conversoes?.filter(c => c.status === 'erro').length || 0;

  const hasConversorAccess = (_conversorId: string): boolean => {
    if (isAdmin) return true;
    return hasModuleAccessFlexible('conversores', empresaAtiva?.id);
  };

  const filteredConversores = useMemo(() => {
    const available = conversores.filter(c => hasConversorAccess(c.id));
    if (activeFilter === "all") return available;
    return available.filter(c => c.category === activeFilter);
  }, [activeFilter, isAdmin, empresaAtiva?.id]);

  const conversoresBloqueados = conversores.filter(c => !hasConversorAccess(c.id));

  const countByCategory = (category: string) => {
    return conversores.filter(c => c.category === category && hasConversorAccess(c.id)).length;
  };

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(prev => prev === filter ? "all" : filter);
  };

  // Metrics data
  const metrics = [
    { title: "Total", value: totalConversoes, icon: RefreshCw, gradient: "from-[hsl(var(--cyan))] to-[hsl(var(--blue))]", glow: "hsl(var(--cyan))" },
    { title: "Sucesso", value: conversoesSucesso, icon: CheckCircle, gradient: "from-emerald-400 to-emerald-600", glow: "hsl(160 80% 45%)" },
    { title: "Pendentes", value: conversoesPendentes, icon: Clock, gradient: "from-amber-400 to-amber-600", glow: "hsl(var(--yellow))" },
    { title: "Erros", value: conversoesErro, icon: AlertTriangle, gradient: "from-rose-400 to-rose-600", glow: "hsl(0 80% 55%)" },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 border-b border-[hsl(var(--cyan)/0.15)]">
        <div className="text-[10px] font-bold text-[hsl(var(--cyan))] uppercase tracking-wider mb-2.5">Categorias</div>
        <div className="space-y-1">
          {Object.entries(categoryMeta).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => handleFilterClick(key as FilterType)}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all duration-300 flex items-center justify-between group ${
                activeFilter === key
                  ? 'glass border-[hsl(var(--cyan)/0.4)] shadow-[0_0_15px_hsl(var(--cyan)/0.1)]'
                  : 'hover:bg-[hsl(var(--cyan)/0.05)] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: meta.color,
                    boxShadow: activeFilter === key ? `0 0 8px ${meta.color}` : 'none',
                  }}
                />
                <span className={activeFilter === key ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'}>{meta.label}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{countByCategory(key)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="text-[10px] font-bold text-[hsl(var(--cyan))] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          Atividades
        </div>
        <div className="space-y-1">
          {atividades.length > 0 ? (
            atividades.map(atividade => (
              <TimelineItem key={atividade.id} atividade={atividade} />
            ))
          ) : (
            <div className="glass rounded-lg p-4 text-center">
              <p className="text-[11px] text-muted-foreground">Nenhuma atividade recente</p>
            </div>
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
              transition={{ duration: 0.25 }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[hsl(var(--cyan))] to-[hsl(var(--blue))] flex items-center justify-center shadow-[0_0_25px_hsl(var(--cyan)/0.4)]">
                  <Sparkles className="w-4.5 h-4.5 text-background" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight">Central de Conversores</h2>
                  <p className="text-[11px] text-muted-foreground">Ferramentas de conversão e processamento de arquivos</p>
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-4 gap-2.5 mb-6">
                {metrics.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <motion.div
                      key={m.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="glass rounded-xl p-3 relative overflow-hidden group hover:border-[hsl(var(--cyan)/0.3)] transition-all duration-300"
                    >
                      {/* Ambient glow */}
                      <div
                        className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                        style={{ background: m.glow }}
                      />
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{m.title}</p>
                          <motion.p
                            className="text-xl font-bold mt-0.5"
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.06 + 0.2, type: "spring", stiffness: 300 }}
                          >
                            {m.value}
                          </motion.p>
                        </div>
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.gradient} flex items-center justify-center opacity-80`}>
                          <Icon className="w-4 h-4 text-background" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Active filter indicator */}
              {activeFilter !== "all" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-center gap-2"
                >
                  <Badge
                    variant="outline"
                    className="text-[10px] border-[hsl(var(--cyan)/0.4)] text-[hsl(var(--cyan))] bg-[hsl(var(--cyan)/0.05)] shadow-[0_0_10px_hsl(var(--cyan)/0.1)]"
                  >
                    {categoryMeta[activeFilter]?.label}
                  </Badge>
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="text-[10px] text-[hsl(var(--cyan))] hover:text-[hsl(var(--cyan)/0.7)] underline underline-offset-2"
                  >
                    Limpar filtro
                  </button>
                </motion.div>
              )}

              {/* Conversores Grid */}
              {filteredConversores.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                  {filteredConversores.map((conversor, index) => {
                    const Icon = conversor.icon;
                    const catColor = categoryMeta[conversor.category]?.color || "hsl(var(--cyan))";

                    return (
                      <motion.div
                        key={conversor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(conversor.id)}
                        className="glass rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--cyan)/0.12)] group relative overflow-hidden"
                        style={{
                          borderColor: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = catColor + '40';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                        }}
                      >
                        {/* Radial hover glow */}
                        <div
                          className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none"
                          style={{ background: catColor }}
                        />

                        <div className="relative z-10 space-y-2.5">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-300 group-hover:scale-110"
                            style={{
                              backgroundColor: catColor + '15',
                              borderColor: catColor + '30',
                            }}
                          >
                            <Icon className="w-5 h-5" style={{ color: catColor }} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold leading-tight">{conversor.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{conversor.description}</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0"
                              style={{
                                borderColor: catColor + '30',
                                color: catColor,
                                backgroundColor: catColor + '08',
                              }}
                            >
                              {categoryMeta[conversor.category]?.label}
                            </Badge>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Blocked */}
              {conversoresBloqueados.length > 0 && activeFilter === "all" && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Sem acesso ({conversoresBloqueados.length})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {conversoresBloqueados.map((conversor, index) => (
                      <motion.div
                        key={conversor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (filteredConversores.length + index) * 0.05 }}
                        className="glass rounded-xl p-4 cursor-not-allowed opacity-40 grayscale"
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2.5">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-semibold leading-tight text-muted-foreground">{conversor.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{conversor.description}</p>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("")}
                className="mb-4 h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                ← Voltar aos conversores
              </Button>

              {activeTab === "fiscal" && <ConversorFiscal />}
              {activeTab === "extrato" && <ConversorExtrato />}
              {activeTab === "documentos" && <ConversorDocumentos />}
              {activeTab === "itausispag" && <ConversorItauSispag />}
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
