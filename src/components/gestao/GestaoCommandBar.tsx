import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Receipt, PieChart, Landmark, Target, Clock, BarChart3,
  Package, Users, Truck, ShoppingCart, ShoppingBag, FileText, Building2,
  Wallet, ChevronDown, LogOut, Home, LucideIcon, Layers
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface GestaoCommandBarProps {
  activeTab: string;
  activeSection: "financeiro" | "gestao";
  onTabChange: (tab: string) => void;
  onSectionChange: (section: "financeiro" | "gestao") => void;
}

const financeiroTabs: TabItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transacoes", label: "Transações", icon: Receipt },
  { id: "contas", label: "Contas", icon: Landmark },
  { id: "categorias", label: "Categorias", icon: PieChart },
  { id: "metas", label: "Metas", icon: Target },
  { id: "recorrencias", label: "Recorrências", icon: Clock },
  { id: "relatorios", label: "Relatórios", icon: BarChart3 },
];

const gestaoTabs: TabItem[] = [
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "fornecedores", label: "Fornecedores", icon: Truck },
  { id: "vendas", label: "Vendas", icon: ShoppingCart },
  { id: "compras", label: "Compras", icon: ShoppingBag },
  { id: "estoque", label: "Estoque", icon: Layers },
  { id: "orcamentos", label: "Orçamentos", icon: FileText },
];

export function GestaoCommandBar({
  activeTab,
  activeSection,
  onTabChange,
  onSectionChange,
}: GestaoCommandBarProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const tabs = activeSection === "financeiro" ? financeiroTabs : gestaoTabs;

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSectionSwitch = (section: "financeiro" | "gestao") => {
    onSectionChange(section);
    onTabChange(section === "financeiro" ? "transacoes" : "produtos");
  };

  return (
    <div className="sticky top-0 z-40">
      {/* Top Bar */}
      <div className="relative bg-card/90 backdrop-blur-xl border-b border-[hsl(var(--cyan)/0.15)]">
        {/* Ambient gradient */}
        <div
          className={cn(
            "absolute inset-0 opacity-40 pointer-events-none",
            activeSection === "financeiro"
              ? "bg-gradient-to-r from-blue-500/10 via-transparent to-transparent"
              : "bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent"
          )}
        />

        <div className="relative flex items-center h-14 px-4 gap-3">
          {/* Back to dashboard */}
          <motion.button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Home className="w-4.5 h-4.5" />
          </motion.button>

          {/* Section Segmented Control */}
          <div className="relative flex items-center p-1 rounded-xl bg-foreground/5 border border-foreground/5">
            <motion.div
              className={cn(
                "absolute top-1 bottom-1 rounded-lg",
                activeSection === "financeiro"
                  ? "bg-blue-500/20 border border-blue-500/30"
                  : "bg-emerald-500/20 border border-emerald-500/30"
              )}
              layoutId="section-indicator"
              style={{
                left: activeSection === "financeiro" ? 4 : "50%",
                width: "calc(50% - 4px)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
            <button
              onClick={() => handleSectionSwitch("financeiro")}
              className={cn(
                "relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                activeSection === "financeiro"
                  ? "text-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Wallet className="w-4 h-4" />
              Financeiro
            </button>
            <button
              onClick={() => handleSectionSwitch("gestao")}
              className={cn(
                "relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                activeSection === "gestao"
                  ? "text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Package className="w-4 h-4" />
              Gestão
            </button>
          </div>

          {/* Vertical Separator */}
          <div className="w-px h-6 bg-foreground/10" />

          {/* Tab Pills */}
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
            <AnimatePresence mode="popLayout">
              {tabs.map((tab, index) => {
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? activeSection === "financeiro"
                          ? "text-blue-300"
                          : "text-emerald-300"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                    )}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-tab-pill"
                        className={cn(
                          "absolute inset-0 rounded-lg",
                          activeSection === "financeiro"
                            ? "bg-blue-500/15 border border-blue-500/20"
                            : "bg-emerald-500/15 border border-emerald-500/20"
                        )}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <tab.icon className="relative z-10 w-3.5 h-3.5" />
                    <span className="relative z-10">{tab.label}</span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </nav>

          {/* User Avatar */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-foreground/5 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
          )}
        </div>

        {/* Bottom active line */}
        <motion.div
          className={cn(
            "absolute bottom-0 h-px",
            activeSection === "financeiro"
              ? "bg-gradient-to-r from-blue-500/60 via-blue-400/30 to-transparent"
              : "bg-gradient-to-r from-emerald-500/60 via-emerald-400/30 to-transparent"
          )}
          initial={{ width: "0%" }}
          animate={{ width: "60%" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
