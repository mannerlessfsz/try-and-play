import { useState, useMemo } from "react";
import { 
  FileSpreadsheet, 
  FileText, 
  Receipt, 
  Calculator,
  Zap,
  FileUp,
  Home,
  Crown,
  Lock,
  ArrowRight,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { ConversorFiscal } from "@/components/conversores/ConversorFiscal";
import { ConversorExtrato } from "@/components/conversores/ConversorExtrato";
import { ConversorDocumentos } from "@/components/conversores/ConversorDocumentos";
import ConversorItauSispag from "@/components/conversores/ConversorItauSispag";
import { AjustaSpedHome } from "@/components/conversores/AjustaSpedHome";
import { LancaApaeTab } from "@/components/conversores/LancaApaeTab";
import { ConversorCasaTab } from "@/components/conversores/ConversorCasaTab";
import { ConversorLiderTab } from "@/components/conversores/ConversorLiderTab";
import { motion, AnimatePresence } from "framer-motion";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const conversores = [
  { id: "fiscal", icon: Receipt, title: "Arquivos Fiscais", description: "XML de NF-e, SPED, CT-e — Converta e valide documentos fiscais eletrônicos", category: "fiscal" },
  { id: "extrato", icon: FileSpreadsheet, title: "Extratos Bancários", description: "OFX, PDF para CSV/Excel — Importe e converta extratos de qualquer banco", category: "financeiro" },
  { id: "documentos", icon: FileText, title: "Documentos Gerais", description: "PDF, texto, planilhas — Processamento e conversão de documentos diversos", category: "geral" },
  { id: "itausispag", icon: Calculator, title: "ITAU SISPAG", description: "Remessa para fornecedores — Gere arquivos de pagamento bancário", category: "financeiro" },
  { id: "ajustasped", icon: Zap, title: "Ajusta SPED", description: "Correção de arquivos SPED — Ajuste registros e valide obrigações", category: "fiscal" },
  { id: "lancaapae", icon: FileUp, title: "Lança APAE", description: "Importação de arquivos APAE — Processe relatórios e gere lançamentos", category: "contabil" },
  { id: "casa", icon: Home, title: "Conversor CASA", description: "Arquivos do sistema CASA — Migre dados entre sistemas contábeis", category: "sistemas" },
  { id: "lider", icon: Crown, title: "Conversor LÍDER", description: "Arquivos do sistema LÍDER — Converta lançamentos para importação", category: "sistemas" },
];

type FilterType = "all" | "fiscal" | "financeiro" | "contabil" | "sistemas" | "geral";

const categories: { key: FilterType; label: string; color: string; icon: string }[] = [
  { key: "all", label: "Todos", color: "hsl(var(--cyan))", icon: "✦" },
  { key: "fiscal", label: "Fiscal", color: "hsl(var(--orange))", icon: "◆" },
  { key: "financeiro", label: "Financeiro", color: "hsl(var(--blue))", icon: "●" },
  { key: "contabil", label: "Contábil", color: "hsl(var(--cyan))", icon: "▲" },
  { key: "sistemas", label: "Sistemas", color: "hsl(270 80% 60%)", icon: "■" },
  { key: "geral", label: "Geral", color: "hsl(var(--yellow))", icon: "◇" },
];

const categoryColorMap: Record<string, string> = {
  fiscal: "hsl(var(--orange))",
  financeiro: "hsl(var(--blue))",
  contabil: "hsl(var(--cyan))",
  sistemas: "hsl(270 80% 60%)",
  geral: "hsl(var(--yellow))",
};

const categoryLabelMap: Record<string, string> = {
  fiscal: "Fiscal",
  financeiro: "Financeiro",
  contabil: "Contábil",
  sistemas: "Sistemas",
  geral: "Geral",
};

// Bento layout: define span sizes for visual variety
const bentoSizes = [
  "col-span-2 row-span-2",    // 0: large featured
  "col-span-1 row-span-1",    // 1: normal
  "col-span-1 row-span-2",    // 2: tall
  "col-span-1 row-span-1",    // 3: normal
  "col-span-1 row-span-1",    // 4: normal
  "col-span-2 row-span-1",    // 5: wide
  "col-span-1 row-span-1",    // 6: normal
  "col-span-1 row-span-1",    // 7: normal
];

const Conversores = () => {
  const [activeTab, setActiveTab] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { empresaAtiva } = useEmpresaAtiva();
  const { isAdmin, hasModuleAccessFlexible } = useModulePermissions();

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

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-b border-[hsl(var(--cyan)/0.15)] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-[hsl(var(--cyan))] px-3 py-1.5 rounded-lg transition-all duration-300 group hover:bg-[hsl(var(--cyan)/0.08)] border border-transparent hover:border-[hsl(var(--cyan)/0.2)]"
          >
            <Home className="w-4 h-4 group-hover:scale-110 transition-all duration-300" />
            <span className="font-bold text-sm tracking-wider">VAULT</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[hsl(var(--cyan)/0.08)] border border-[hsl(var(--cyan)/0.2)]">
            <span className="font-bold text-sm text-[hsl(var(--cyan))]">Conversores</span>
          </div>
        </div>
      </div>

      <div className="pt-16 pb-12 px-4 md:px-8 lg:px-12 max-w-[1600px] mx-auto">
        <AnimatePresence mode="wait">
          {!activeTab ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* Hero Header */}
              <div className="flex items-center gap-3.5 mb-8 mt-2">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(var(--cyan))] to-[hsl(var(--blue))] flex items-center justify-center shadow-[0_0_30px_hsl(var(--cyan)/0.5)]">
                  <Sparkles className="w-5 h-5 text-background" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Central de Conversores</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">Ferramentas de conversão e processamento de arquivos</p>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="glass rounded-xl p-2 mb-8 relative overflow-hidden">
                {/* Ambient glow behind active pill */}
                <div className="flex items-center gap-1.5 relative z-10 flex-wrap">
                  {categories.map((cat) => {
                    const isActive = activeFilter === cat.key;
                    const count = cat.key === "all"
                      ? conversores.filter(c => hasConversorAccess(c.id)).length
                      : conversores.filter(c => c.category === cat.key && hasConversorAccess(c.id)).length;

                    return (
                      <button
                        key={cat.key}
                        onClick={() => setActiveFilter(prev => prev === cat.key ? "all" : cat.key)}
                        className="relative px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-300 whitespace-nowrap"
                        style={{
                          color: isActive ? 'hsl(var(--background))' : undefined,
                        }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="conversor-filter-pill"
                            className="absolute inset-0 rounded-lg"
                            style={{
                              background: `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)`,
                              boxShadow: `0 0 20px ${cat.color}80, 0 0 40px ${cat.color}30`,
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className={`relative z-10 flex items-center gap-1.5 ${!isActive ? 'text-muted-foreground hover:text-foreground' : ''}`}>
                          <span className="text-[10px]">{cat.icon}</span>
                          {cat.label}
                          <span className={`text-[10px] font-mono ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                            {count}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bento Grid */}
              {filteredConversores.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[140px] md:auto-rows-[160px] gap-3">
                  {filteredConversores.map((conversor, index) => {
                    const Icon = conversor.icon;
                    const catColor = categoryColorMap[conversor.category] || "hsl(var(--cyan))";
                    const sizeClass = bentoSizes[index % bentoSizes.length];
                    const isLarge = sizeClass.includes("col-span-2") && sizeClass.includes("row-span-2");
                    const isTall = sizeClass.includes("row-span-2") && !sizeClass.includes("col-span-2");
                    const isWide = sizeClass.includes("col-span-2") && !sizeClass.includes("row-span-2");

                    return (
                      <motion.div
                        key={conversor.id}
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06, type: "spring", stiffness: 200, damping: 20 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(conversor.id)}
                        className={`glass rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-[0_0_35px_hsl(var(--cyan)/0.15)] group relative overflow-hidden flex flex-col ${sizeClass}`}
                        style={{ borderColor: 'transparent' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = catColor + '50';
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 35px ${catColor}20`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        }}
                      >
                        {/* Radial ambient glow */}
                        <div
                          className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none"
                          style={{ background: catColor }}
                        />

                        {/* Bottom progress bar decoration */}
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
                          <motion.div
                            className="h-full"
                            style={{ background: `linear-gradient(90deg, ${catColor}, transparent)` }}
                            initial={{ width: "0%" }}
                            whileInView={{ width: "60%" }}
                            transition={{ duration: 1, delay: index * 0.06 + 0.3 }}
                          />
                        </div>

                        <div className={`relative z-10 flex flex-col h-full ${isLarge ? 'p-6' : 'p-4'}`}>
                          {/* Icon */}
                          <div
                            className={`rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 shrink-0 ${
                              isLarge ? 'w-14 h-14 mb-4' : 'w-10 h-10 mb-3'
                            }`}
                            style={{
                              backgroundColor: catColor + '12',
                              borderColor: catColor + '25',
                            }}
                          >
                            <Icon className={`${isLarge ? 'w-7 h-7' : 'w-5 h-5'}`} style={{ color: catColor }} />
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-h-0">
                            <p className={`font-bold leading-tight ${isLarge ? 'text-lg' : 'text-sm'}`}>
                              {conversor.title}
                            </p>
                            <p className={`text-muted-foreground mt-1 ${
                              isLarge ? 'text-xs line-clamp-3' : isTall ? 'text-[11px] line-clamp-4' : 'text-[11px] line-clamp-2'
                            }`}>
                              {conversor.description}
                            </p>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-auto pt-2">
                            <Badge
                              variant="outline"
                              className={`${isLarge ? 'text-[10px] px-2 py-0.5' : 'text-[9px] px-1.5 py-0'}`}
                              style={{
                                borderColor: catColor + '30',
                                color: catColor,
                                backgroundColor: catColor + '08',
                              }}
                            >
                              {categoryLabelMap[conversor.category]}
                            </Badge>
                            <motion.div
                              initial={{ opacity: 0, x: -5 }}
                              whileHover={{ x: 2 }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                              <ArrowRight className={`text-muted-foreground ${isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Blocked converters */}
              {conversoresBloqueados.length > 0 && activeFilter === "all" && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Sem acesso ({conversoresBloqueados.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {conversoresBloqueados.map((conversor, index) => (
                      <motion.div
                        key={conversor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (filteredConversores.length + index) * 0.05 }}
                        className="glass rounded-2xl p-4 cursor-not-allowed opacity-30 grayscale h-[140px] md:h-[160px] flex flex-col"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground">{conversor.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{conversor.description}</p>
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
                <ArrowLeft className="w-3 h-3" />
                Voltar aos conversores
              </Button>

              {activeTab === "fiscal" && <ConversorFiscal />}
              {activeTab === "extrato" && <ConversorExtrato />}
              {activeTab === "documentos" && <ConversorDocumentos />}
              {activeTab === "itausispag" && <ConversorItauSispag />}
              {activeTab === "ajustasped" && <AjustaSpedHome />}
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
