import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Building2, ChevronDown, ChevronRight, User, Activity, Loader2,
  Wallet, Package, Receipt, PieChart, Landmark, Link2, Target,
  Clock, BarChart3, Users, Truck, ShoppingCart, ShoppingBag, FileText,
  LayoutDashboard, LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { TimelineItem } from "@/components/task/TimelineItem";
import { cn } from "@/lib/utils";
import type { Atividade } from "@/types/task";

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
}

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  proOnly?: boolean;
}

interface ModernSidebarProps {
  empresaAtiva: Empresa | null;
  empresasDisponiveis: Empresa[];
  onEmpresaChange: (empresa: Empresa) => void;
  modo: "pro" | "basico";
  onModoChange: (modo: "pro" | "basico") => void;
  atividades: Atividade[];
  atividadesLoading: boolean;
  activeSection: "financeiro" | "gestao";
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSectionChange: (section: "financeiro" | "gestao") => void;
}

const financeiroTabs: TabItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transacoes", label: "Transações", icon: Receipt },
  { id: "categorias", label: "Categorias", icon: PieChart },
  { id: "contas", label: "Contas", icon: Landmark },
  { id: "conciliacao", label: "Conciliação", icon: Link2 },
  { id: "centros_custo", label: "Centros Custo", icon: Building2 },
  { id: "metas", label: "Metas", icon: Target },
  { id: "recorrencias", label: "Recorrências", icon: Clock },
  { id: "relatorios", label: "Relatórios", icon: BarChart3, proOnly: true },
];

const gestaoTabs: TabItem[] = [
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "fornecedores", label: "Fornecedores", icon: Truck },
  { id: "vendas", label: "Vendas", icon: ShoppingCart },
  { id: "compras", label: "Compras", icon: ShoppingBag },
  { id: "estoque", label: "Estoque", icon: Package },
  { id: "orcamentos", label: "Orçamentos", icon: FileText },
];

export function ModernSidebar({
  empresaAtiva,
  empresasDisponiveis,
  onEmpresaChange,
  modo,
  onModoChange,
  atividades,
  atividadesLoading,
  activeSection,
  activeTab,
  onTabChange,
  onSectionChange,
}: ModernSidebarProps) {
  const [financeiroExpanded, setFinanceiroExpanded] = useState(activeSection === "financeiro");
  const [gestaoExpanded, setGestaoExpanded] = useState(activeSection === "gestao");

  const handleSectionClick = (section: "financeiro" | "gestao") => {
    if (section === "financeiro") {
      setFinanceiroExpanded(true);
      setGestaoExpanded(false);
      onSectionChange("financeiro");
      onTabChange("dashboard");
    } else {
      setGestaoExpanded(true);
      setFinanceiroExpanded(false);
      onSectionChange("gestao");
      onTabChange("produtos");
    }
  };

  // Animation variants for menu items
  const itemVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    hover: { 
      x: 4, 
      backgroundColor: "hsl(var(--muted) / 0.5)",
      transition: { duration: 0.2 }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  return (
    <div className="fixed right-0 top-14 bottom-24 w-64 bg-card/40 backdrop-blur-2xl border-l border-foreground/5 flex flex-col z-40 overflow-hidden">
      {/* Header com gradiente sutil */}
      <div className="p-4 bg-gradient-to-b from-blue-500/5 to-transparent">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between h-auto py-3 px-4 bg-card/60 hover:bg-card/80 border border-foreground/5 rounded-xl group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center border border-blue-500/20">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  <p className="font-semibold text-sm truncate max-w-[120px]">{empresaAtiva?.nome || 'Selecione'}</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {empresasDisponiveis.map(empresa => (
              <DropdownMenuItem 
                key={empresa.id}
                onClick={() => onEmpresaChange(empresa)}
                className="flex flex-col items-start py-2"
              >
                <span className="font-medium">{empresa.nome}</span>
                {empresa.cnpj && (
                  <span className="text-xs text-muted-foreground">{empresa.cnpj}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navegação por Seções */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* Financeiro Section */}
        <div className="mb-2">
          <button
            onClick={() => handleSectionClick("financeiro")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
              activeSection === "financeiro" 
                ? "bg-blue-500/15 text-blue-400" 
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                activeSection === "financeiro" 
                  ? "bg-blue-500/20 text-blue-400" 
                  : "bg-muted/50"
              )}>
                <Wallet className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">Financeiro</span>
            </div>
            <ChevronRight className={cn(
              "w-4 h-4 transition-transform",
              financeiroExpanded && "rotate-90"
            )} />
          </button>
          
          {financeiroExpanded && (
            <motion.div 
              className="mt-1 ml-4 pl-4 border-l border-foreground/5 space-y-0.5"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {financeiroTabs
                .filter(tab => !tab.proOnly || modo === "pro")
                .map((tab, index) => (
                  <motion.button
                    key={tab.id}
                    variants={itemVariants}
                    initial="initial"
                    animate="animate"
                    whileHover="hover"
                    transition={{ delay: index * 0.03 }}
                    onClick={() => {
                      onSectionChange("financeiro");
                      onTabChange(tab.id);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm",
                      activeTab === tab.id && activeSection === "financeiro"
                        ? "bg-blue-500/20 text-blue-300 font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <tab.icon className="w-4 h-4" />
                    </motion.div>
                    {tab.label}
                    {tab.proOnly && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">PRO</span>
                    )}
                  </motion.button>
                ))}
            </motion.div>
          )}
        </div>

        {/* Gestão Section */}
        <div className="mb-2">
          <button
            onClick={() => handleSectionClick("gestao")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
              activeSection === "gestao" 
                ? "bg-emerald-500/15 text-emerald-400" 
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                activeSection === "gestao" 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-muted/50"
              )}>
                <Package className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">Gestão</span>
            </div>
            <ChevronRight className={cn(
              "w-4 h-4 transition-transform",
              gestaoExpanded && "rotate-90"
            )} />
          </button>
          
          {gestaoExpanded && (
            <motion.div 
              className="mt-1 ml-4 pl-4 border-l border-foreground/5 space-y-0.5"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {gestaoTabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  variants={itemVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  transition={{ delay: index * 0.03 }}
                  onClick={() => {
                    onSectionChange("gestao");
                    onTabChange(tab.id);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm",
                    activeTab === tab.id && activeSection === "gestao"
                      ? "bg-emerald-500/20 text-emerald-300 font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <tab.icon className="w-4 h-4" />
                  </motion.div>
                  {tab.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Modo Toggle */}
        <div className="mt-4 px-1">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Modo</p>
          <div className="flex gap-1 p-1 bg-card/40 rounded-xl border border-foreground/5">
            <button
              onClick={() => onModoChange("pro")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                modo === "pro" 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              Profissional
            </button>
            <button
              onClick={() => onModoChange("basico")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                modo === "basico" 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="w-3.5 h-3.5" />
              Básico
            </button>
          </div>
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className="border-t border-foreground/5 bg-card/20">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-muted-foreground">Atividades Recentes</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {atividadesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : atividades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhuma atividade
              </p>
            ) : (
              atividades.slice(0, 5).map(atividade => (
                <TimelineItem key={atividade.id} atividade={atividade} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
