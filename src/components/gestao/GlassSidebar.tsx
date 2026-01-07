import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  DollarSign, 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  BarChart3, 
  ChevronLeft,
  Wallet,
  FileText,
  Target,
  RefreshCw,
  CreditCard,
  Building2,
  LogOut,
  ChevronDown,
  Settings2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WidgetManagerPanel } from "./WidgetManagerPanel";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
  onClick?: () => void;
}

interface GlassSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  moduleColor?: string;
  empresaId?: string;
}

export function GlassSidebar({ activeTab, onTabChange, moduleColor = "blue", empresaId }: GlassSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colorMap: Record<string, string> = {
    blue: "from-blue/20 to-cyan/10 border-blue/30 hover:border-blue/50",
    magenta: "from-magenta/20 to-pink-500/10 border-magenta/30 hover:border-magenta/50",
    orange: "from-orange/20 to-yellow-500/10 border-orange/30 hover:border-orange/50",
    green: "from-green-500/20 to-emerald-500/10 border-green-500/30 hover:border-green-500/50",
  };

  const activeColorMap: Record<string, string> = {
    blue: "bg-blue/20 border-blue/50 text-blue",
    magenta: "bg-magenta/20 border-magenta/50 text-magenta",
    orange: "bg-orange/20 border-orange/50 text-orange",
    green: "bg-green-500/20 border-green-500/50 text-green-500",
  };

  const navItems: NavItem[] = [
    { id: "home", label: "Dashboard", icon: <Home className="w-5 h-5" />, onClick: () => navigate("/dashboard") },
    { id: "divider-1", label: "", icon: <></>, section: "Financeiro" },
    { id: "transacoes", label: "Transações", icon: <Wallet className="w-5 h-5" /> },
    { id: "contas", label: "Contas Bancárias", icon: <CreditCard className="w-5 h-5" /> },
    { id: "categorias", label: "Categorias", icon: <FileText className="w-5 h-5" /> },
    { id: "relatorios", label: "Relatórios", icon: <BarChart3 className="w-5 h-5" /> },
    { id: "metas", label: "Metas", icon: <Target className="w-5 h-5" /> },
    { id: "recorrencias", label: "Recorrências", icon: <RefreshCw className="w-5 h-5" /> },
    { id: "divider-2", label: "", icon: <></>, section: "Gestão" },
    { id: "produtos", label: "Produtos", icon: <Package className="w-5 h-5" /> },
    { id: "clientes", label: "Clientes", icon: <Users className="w-5 h-5" /> },
    { id: "fornecedores", label: "Fornecedores", icon: <Building2 className="w-5 h-5" /> },
    { id: "vendas", label: "Vendas", icon: <TrendingUp className="w-5 h-5" /> },
    { id: "compras", label: "Compras", icon: <ShoppingCart className="w-5 h-5" /> },
    { id: "estoque", label: "Estoque", icon: <Package className="w-5 h-5" /> },
  ];

  const sidebarVariants = {
    expanded: { width: 260 },
    collapsed: { width: 72 },
  };

  const itemVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -10 },
  };

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        className={cn(
          "fixed right-0 top-0 bottom-0 z-40 flex flex-col",
          "bg-gradient-to-b from-background/80 via-background/60 to-background/80",
          "backdrop-blur-2xl border-l border-white/10",
          "shadow-2xl shadow-black/20"
        )}
        variants={sidebarVariants}
        animate={isExpanded ? "expanded" : "collapsed"}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <motion.div 
            className="flex items-center gap-3"
            animate={{ justifyContent: isExpanded ? "flex-start" : "center" }}
          >
            <motion.div 
              className={cn(
                "p-2.5 rounded-xl bg-gradient-to-br",
                colorMap[moduleColor]
              )}
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <DollarSign className="w-5 h-5 text-foreground" />
            </motion.div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="font-bold text-foreground tracking-tight">GESTÃO</h2>
                  <p className="text-[10px] text-muted-foreground tracking-wider">FINANCIAL & ERP</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          <div className="space-y-1">
            {navItems.map((item) => {
              if (item.section) {
                return (
                  <AnimatePresence key={item.id}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pt-4 pb-2 px-3"
                      >
                        <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                          {item.section}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                );
              }

              const isActive = activeTab === item.id;
              const content = (
                <motion.button
                  onClick={item.onClick || (() => onTabChange(item.id))}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
                    "transition-all duration-200",
                    "border border-transparent",
                    isActive 
                      ? activeColorMap[moduleColor]
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  whileHover={{ x: isExpanded ? -4 : 0, scale: isExpanded ? 1 : 1.1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    animate={{ 
                      rotate: isActive ? [0, -10, 10, 0] : 0,
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    {item.icon}
                  </motion.div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span
                        variants={itemVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );

              if (!isExpanded) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side="left" className="bg-background/90 backdrop-blur-xl border-white/10">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.id}>{content}</div>;
            })}

            {/* Widget Manager Button */}
            <div className="pt-4 pb-2 px-3">
              {isExpanded && (
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                  Configurações
                </span>
              )}
            </div>
            <WidgetManagerPanel empresaId={empresaId} isExpanded={isExpanded} />
          </div>
        </nav>

        {/* User Profile Section */}
        {user && (
          <div className="p-3 border-t border-white/5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-xl",
                    "hover:bg-white/5 transition-colors",
                    "border border-transparent hover:border-white/10"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-xs font-medium text-foreground leading-none truncate">{displayName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isExpanded && <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Collapse toggle */}
        <div className="p-3 border-t border-white/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-center hover:bg-white/5"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          </Button>
        </div>

        {/* Decorative gradient line on left edge */}
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-px",
            "bg-gradient-to-b from-transparent via-primary/40 to-transparent"
          )}
        />
        
        {/* Secondary accent line */}
        <div 
          className={cn(
            "absolute left-1 top-1/4 bottom-1/4 w-px",
            "bg-gradient-to-b from-transparent via-accent/30 to-transparent"
          )}
        />
      </motion.aside>
    </TooltipProvider>
  );
}
