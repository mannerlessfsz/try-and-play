import { useState } from "react";
import {
  CheckSquare, MessageCircle, DollarSign, Settings, LogOut, Zap,
  ListTodo, Building2, Eye, BarChart3, Users, Package, ShoppingCart,
  Wallet, FileText, PieChart, Send, BookOpen, Bot,
  ChevronRight, Lock, Hexagon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GradientMesh } from "@/components/GradientMesh";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions, AppModule } from "@/hooks/useModulePermissions";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface HudAction {
  icon: React.ReactNode;
  label: string;
  href: string;
  description?: string;
}

interface HudModule {
  id: string;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  accentVar: string; // CSS var name like --magenta
  accentHsl: string; // raw HSL for inline styles
  module: AppModule;
  href: string;
  actions: HudAction[];
}

const modules: HudModule[] = [
  {
    id: "taskvault",
    icon: <CheckSquare className="w-5 h-5" />,
    title: "TASKVAULT",
    tagline: "Gestão de tarefas",
    accentVar: "--magenta",
    accentHsl: "0 85% 55%",
    module: "taskvault",
    href: "/taskvault",
    actions: [
      { icon: <ListTodo className="w-4 h-4" />, label: "Minhas Tarefas", href: "/taskvault", description: "Kanban e lista de tarefas" },
      { icon: <Building2 className="w-4 h-4" />, label: "Empresas", href: "/taskvault", description: "Gerenciar empresas vinculadas" },
      { icon: <Eye className="w-4 h-4" />, label: "Visão Geral", href: "/taskvault", description: "Dashboard e métricas" },
      { icon: <BarChart3 className="w-4 h-4" />, label: "Relatórios", href: "/taskvault", description: "Produtividade e histórico" },
    ],
  },
  {
    id: "gestao",
    icon: <DollarSign className="w-5 h-5" />,
    title: "GESTÃO",
    tagline: "ERP + Financeiro",
    accentVar: "--blue",
    accentHsl: "210 100% 55%",
    module: "gestao",
    href: "/gestao",
    actions: [
      { icon: <Wallet className="w-4 h-4" />, label: "Financeiro", href: "/gestao", description: "Transações e contas" },
      { icon: <Users className="w-4 h-4" />, label: "Clientes", href: "/gestao", description: "Cadastro e gestão" },
      { icon: <Package className="w-4 h-4" />, label: "Produtos", href: "/gestao", description: "Catálogo e estoque" },
      { icon: <ShoppingCart className="w-4 h-4" />, label: "Vendas", href: "/gestao", description: "Pedidos e orçamentos" },
      { icon: <FileText className="w-4 h-4" />, label: "Compras", href: "/gestao", description: "Pedidos a fornecedores" },
      { icon: <PieChart className="w-4 h-4" />, label: "Relatórios", href: "/gestao", description: "DRE e indicadores" },
    ],
  },
  {
    id: "messenger",
    icon: <MessageCircle className="w-5 h-5" />,
    title: "MESSENGER",
    tagline: "Comunicação integrada",
    accentVar: "--orange",
    accentHsl: "25 100% 55%",
    module: "messenger",
    href: "/messenger",
    actions: [
      { icon: <Send className="w-4 h-4" />, label: "Conversas", href: "/messenger", description: "Chat em tempo real" },
      { icon: <BookOpen className="w-4 h-4" />, label: "Contatos", href: "/messenger", description: "Lista de contatos" },
      { icon: <Bot className="w-4 h-4" />, label: "Templates", href: "/messenger", description: "Modelos de mensagem" },
    ],
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, hasModuleAccessFlexible } = useModulePermissions();
  const { empresaAtiva } = useEmpresaAtiva();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const toggleModule = (id: string) => {
    setExpandedModule(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <GradientMesh />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.012]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Scan line effect */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground) / 0.01) 2px, hsl(var(--foreground) / 0.01) 4px)',
        }}
      />

      {/* Top HUD bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-magenta/20 to-blue/20 backdrop-blur-xl border border-white/10 shadow-lg shadow-magenta/5">
              <Zap className="w-5 h-5 text-magenta fill-magenta" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                VAULT<span className="text-magenta">CORP</span>
              </h1>
              <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase">Command Center</p>
            </div>
          </motion.div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 h-8"
              >
                <Settings className="w-3.5 h-3.5" /> Admin
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 h-8"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main HUD content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-24">
        {/* HUD Title */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-magenta/20 bg-magenta/5 backdrop-blur-xl mb-5"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Hexagon className="w-3.5 h-3.5 text-magenta" />
            <span className="text-xs font-medium text-foreground/80 tracking-wider uppercase">Sistema Operacional</span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-foreground">Selecione o </span>
            <span className="bg-gradient-to-r from-magenta via-blue to-cyan bg-clip-text text-transparent">
              Módulo
            </span>
          </h2>
          <p className="text-muted-foreground text-sm">
            Clique para expandir as opções disponíveis
          </p>
        </motion.div>

        {/* HUD Module List */}
        <div className="w-full max-w-2xl space-y-3">
          {modules.map((mod, index) => {
            const hasAccess = hasModuleAccessFlexible(mod.module, empresaAtiva?.id);
            const isExpanded = expandedModule === mod.id;
            const accentColor = `hsl(${mod.accentHsl})`;

            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1, type: "spring", stiffness: 120, damping: 18 }}
              >
                {/* Module Header */}
                <motion.button
                  onClick={() => hasAccess && toggleModule(mod.id)}
                  disabled={!hasAccess}
                  className={`
                    w-full relative overflow-hidden rounded-xl border transition-all duration-300 text-left
                    ${hasAccess
                      ? 'cursor-pointer hover:bg-card/60'
                      : 'cursor-not-allowed opacity-40 grayscale'
                    }
                    ${isExpanded
                      ? 'bg-card/50 border-opacity-60'
                      : 'bg-card/20 border-border/30 hover:border-border/50'
                    }
                  `}
                  style={{
                    borderColor: isExpanded ? `${accentColor}50` : undefined,
                    boxShadow: isExpanded ? `0 0 40px ${accentColor}15, inset 0 1px 0 ${accentColor}10` : undefined,
                  }}
                  whileHover={hasAccess ? { scale: 1.01 } : {}}
                  whileTap={hasAccess ? { scale: 0.995 } : {}}
                >
                  {/* Accent glow on expanded */}
                  {isExpanded && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        background: `radial-gradient(ellipse 80% 60% at 0% 50%, ${accentColor}12, transparent)`,
                      }}
                    />
                  )}

                  {/* Left accent bar */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                    style={{ backgroundColor: accentColor }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  />

                  <div className="relative z-10 flex items-center gap-4 px-5 py-4">
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300"
                      style={{
                        backgroundColor: `${accentColor}12`,
                        borderColor: `${accentColor}25`,
                        color: accentColor,
                        boxShadow: isExpanded ? `0 0 20px ${accentColor}20` : 'none',
                      }}
                    >
                      {hasAccess ? mod.icon : <Lock className="w-4 h-4" />}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm tracking-wider" style={{ color: isExpanded ? accentColor : undefined }}>
                          {mod.title}
                        </span>
                        {!hasAccess && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Bloqueado
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{mod.tagline}</span>
                    </div>

                    {/* Chevron */}
                    {hasAccess && (
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-muted-foreground"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
                    )}
                  </div>
                </motion.button>

                {/* Expanded Actions */}
                <AnimatePresence>
                  {isExpanded && hasAccess && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-1 pb-2 pl-8 pr-2 space-y-0.5">
                        {mod.actions.map((action, actionIdx) => (
                          <motion.button
                            key={action.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ delay: actionIdx * 0.05, duration: 0.2 }}
                            onClick={() => navigate(action.href)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 group/action hover:bg-card/40"
                            style={{
                              ['--action-accent' as string]: accentColor,
                            }}
                          >
                            {/* Connector line */}
                            <div className="relative flex items-center">
                              <div
                                className="absolute -left-4 top-1/2 w-3 h-px"
                                style={{ backgroundColor: `${accentColor}25` }}
                              />
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center border transition-all duration-200 group-hover/action:scale-110"
                                style={{
                                  backgroundColor: `${accentColor}08`,
                                  borderColor: `${accentColor}20`,
                                  color: `${accentColor}cc`,
                                }}
                              >
                                {action.icon}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground/90 group-hover/action:text-foreground transition-colors">
                                {action.label}
                              </span>
                              {action.description && (
                                <p className="text-[11px] text-muted-foreground/70 truncate">
                                  {action.description}
                                </p>
                              )}
                            </div>

                            <ChevronRight
                              className="w-3 h-3 text-muted-foreground/30 group-hover/action:text-muted-foreground/60 transition-all duration-200 group-hover/action:translate-x-0.5"
                            />
                          </motion.button>
                        ))}

                        {/* "Abrir módulo" footer */}
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: mod.actions.length * 0.05 + 0.1 }}
                          onClick={() => navigate(mod.href)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-1 rounded-lg border border-dashed transition-all duration-200 hover:bg-card/30 text-xs font-medium text-muted-foreground hover:text-foreground"
                          style={{ borderColor: `${accentColor}20` }}
                        >
                          Abrir {mod.title}
                          <ChevronRight className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom fade */}
        <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default Index;
