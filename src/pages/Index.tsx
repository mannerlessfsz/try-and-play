import { useState, useMemo } from "react";
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
  description: string;
  href: string;
}

interface HudModule {
  id: string;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  accentHsl: string;
  module: AppModule;
  href: string;
  actions: HudAction[];
}

const modules: HudModule[] = [
  {
    id: "taskvault",
    icon: <CheckSquare className="w-7 h-7" />,
    title: "TASKVAULT",
    tagline: "Gestão de tarefas",
    accentHsl: "0 85% 55%",
    module: "taskvault",
    href: "/taskvault",
    actions: [
      { icon: <ListTodo className="w-5 h-5" />, label: "Tarefas", description: "Kanban e lista", href: "/taskvault" },
      { icon: <Building2 className="w-5 h-5" />, label: "Empresas", description: "Cadastro", href: "/taskvault" },
      { icon: <Eye className="w-5 h-5" />, label: "Visão Geral", description: "Dashboard", href: "/taskvault" },
      { icon: <BarChart3 className="w-5 h-5" />, label: "Relatórios", description: "Análises", href: "/taskvault" },
    ],
  },
  {
    id: "gestao",
    icon: <DollarSign className="w-7 h-7" />,
    title: "GESTÃO",
    tagline: "ERP + Financeiro",
    accentHsl: "210 100% 55%",
    module: "gestao",
    href: "/gestao",
    actions: [
      { icon: <Wallet className="w-5 h-5" />, label: "Financeiro", description: "Contas e fluxo", href: "/gestao" },
      { icon: <Users className="w-5 h-5" />, label: "Clientes", description: "Cadastro", href: "/gestao" },
      { icon: <Package className="w-5 h-5" />, label: "Produtos", description: "Estoque", href: "/gestao" },
      { icon: <ShoppingCart className="w-5 h-5" />, label: "Vendas", description: "Pedidos", href: "/gestao" },
      { icon: <FileText className="w-5 h-5" />, label: "Compras", description: "Fornecedores", href: "/gestao" },
      { icon: <PieChart className="w-5 h-5" />, label: "Relatórios", description: "Análises", href: "/gestao" },
    ],
  },
  {
    id: "messenger",
    icon: <MessageCircle className="w-7 h-7" />,
    title: "MESSENGER",
    tagline: "Comunicação",
    accentHsl: "25 100% 55%",
    module: "messenger",
    href: "/messenger",
    actions: [
      { icon: <Send className="w-5 h-5" />, label: "Conversas", description: "Chat em tempo real", href: "/messenger" },
      { icon: <BookOpen className="w-5 h-5" />, label: "Contatos", description: "Lista e grupos", href: "/messenger" },
      { icon: <Bot className="w-5 h-5" />, label: "Templates", description: "Mensagens rápidas", href: "/messenger" },
    ],
  },
];

const WHEEL_RADIUS = 260;
const ACTION_RADIUS = 160;

const Index = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, hasModuleAccessFlexible } = useModulePermissions();
  const { empresaAtiva } = useEmpresaAtiva();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const toggleModule = (id: string) => {
    setExpandedModule(prev => prev === id ? null : id);
  };

  const modulePositions = useMemo(() => {
    const count = modules.length;
    const startAngle = -90;
    const totalArc = 360;
    return modules.map((_, i) => {
      const angleDeg = startAngle + (totalArc / count) * i;
      const angleRad = (angleDeg * Math.PI) / 180;
      return {
        x: Math.cos(angleRad) * WHEEL_RADIUS,
        y: Math.sin(angleRad) * WHEEL_RADIUS,
        angleDeg,
      };
    });
  }, []);

  const getActionPositions = (moduleIndex: number, actionCount: number) => {
    const moduleAngle = modulePositions[moduleIndex].angleDeg;
    const fanSpread = Math.min(actionCount * 30, 150);
    const startAngle = moduleAngle - fanSpread / 2;

    return Array.from({ length: actionCount }, (_, i) => {
      const angleDeg = actionCount === 1
        ? moduleAngle
        : startAngle + (fanSpread / (actionCount - 1)) * i;
      const angleRad = (angleDeg * Math.PI) / 180;
      return {
        x: Math.cos(angleRad) * ACTION_RADIUS,
        y: Math.sin(angleRad) * ACTION_RADIUS,
      };
    });
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

      {/* Top HUD bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-border/30">
              <Zap className="w-5 h-5 text-primary fill-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                VAULT<span className="text-primary">CORP</span>
              </h1>
              <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase">Command Center</p>
            </div>
          </motion.div>

          {empresaAtiva && (
            <motion.div
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/30 bg-card/40 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{empresaAtiva.nome}</span>
            </motion.div>
          )}

          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 h-8">
                <Settings className="w-3.5 h-3.5" /> Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 h-8">
              <LogOut className="w-3.5 h-3.5" /> Sair
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Wheel HUD */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="relative" style={{ width: (WHEEL_RADIUS + ACTION_RADIUS + 100) * 2, height: (WHEEL_RADIUS + ACTION_RADIUS + 100) * 2 }}>

          {/* Center convergence point */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="w-3 h-3 rounded-full bg-border/30" />
          </motion.div>

          {/* Orbit ring */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-border/20 pointer-events-none"
            style={{ width: WHEEL_RADIUS * 2, height: WHEEL_RADIUS * 2 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          />

          {/* Module Nodes */}
          {modules.map((mod, index) => {
            const pos = modulePositions[index];
            const hasAccess = hasModuleAccessFlexible(mod.module, empresaAtiva?.id);
            const isExpanded = expandedModule === mod.id;
            const accent = `hsl(${mod.accentHsl})`;
            const actionPositions = getActionPositions(index, mod.actions.length);

            return (
              <div key={mod.id}>
                {/* Connection line from center to module */}
                <motion.div
                  className="absolute top-1/2 left-1/2 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <svg
                    style={{ position: 'absolute', top: -1, left: -1, width: 2, height: 2, overflow: 'visible' }}
                  >
                    <motion.line
                      x1={0} y1={0}
                      x2={pos.x} y2={pos.y}
                      stroke={isExpanded ? accent : 'hsl(var(--border))'}
                      strokeWidth={isExpanded ? 2 : 0.8}
                      strokeDasharray={isExpanded ? "none" : "4 4"}
                      strokeOpacity={isExpanded ? 0.5 : 0.3}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                    />
                  </svg>
                </motion.div>

                {/* Module Node — BIGGER */}
                <motion.div
                  className="absolute top-1/2 left-1/2 z-10"
                  style={{ x: pos.x, y: pos.y }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    x: pos.x - 56,
                    y: pos.y - 56,
                  }}
                  transition={{ delay: 0.5 + index * 0.12, type: "spring", stiffness: 180, damping: 18 }}
                >
                  <motion.button
                    onClick={() => hasAccess && toggleModule(mod.id)}
                    disabled={!hasAccess}
                    className={`
                      relative w-28 h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-300
                      ${hasAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-30 grayscale'}
                    `}
                    style={{
                      backgroundColor: isExpanded ? `${accent}18` : 'hsl(var(--card) / 0.6)',
                      borderColor: isExpanded ? `${accent}80` : 'hsl(var(--border) / 0.4)',
                      boxShadow: isExpanded
                        ? `0 0 50px ${accent}30, 0 0 100px ${accent}10`
                        : 'none',
                      backdropFilter: 'blur(16px)',
                    }}
                    whileHover={hasAccess ? {
                      scale: 1.1,
                      boxShadow: `0 0 40px ${accent}25`,
                    } : {}}
                    whileTap={hasAccess ? { scale: 0.95 } : {}}
                  >
                    {/* Glow ring on expanded */}
                    {isExpanded && (
                      <motion.div
                        className="absolute -inset-1.5 rounded-2xl pointer-events-none"
                        style={{ border: `1px solid ${accent}40` }}
                        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}

                    <div style={{ color: hasAccess ? accent : undefined }}>
                      {hasAccess ? mod.icon : <Lock className="w-6 h-6" />}
                    </div>
                    <span
                      className="text-[11px] font-bold tracking-wider"
                      style={{ color: isExpanded ? accent : 'hsl(var(--muted-foreground))' }}
                    >
                      {mod.title}
                    </span>
                    <span className="text-[9px] text-muted-foreground/70 leading-tight text-center px-1">
                      {mod.tagline}
                    </span>
                  </motion.button>

                  {/* Action Nodes (expanded outward) — BIGGER */}
                  <AnimatePresence>
                    {isExpanded && hasAccess && mod.actions.map((action, actionIdx) => {
                      const aPos = actionPositions[actionIdx];
                      return (
                        <motion.div
                          key={action.label}
                          className="absolute z-10"
                          style={{ top: 56, left: 56 }}
                          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                          animate={{
                            x: aPos.x - 32,
                            y: aPos.y - 32,
                            scale: 1,
                            opacity: 1,
                          }}
                          exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                          transition={{
                            delay: actionIdx * 0.06,
                            type: "spring",
                            stiffness: 220,
                            damping: 20,
                          }}
                        >
                          {/* Connection line from module to action */}
                          <svg
                            className="absolute pointer-events-none"
                            style={{ top: 32, left: 32, width: 1, height: 1, overflow: 'visible' }}
                          >
                            <line
                              x1={0} y1={0}
                              x2={-aPos.x} y2={-aPos.y}
                              stroke={accent}
                              strokeWidth={1}
                              strokeOpacity={0.2}
                            />
                          </svg>

                          <motion.button
                            onClick={() => navigate(action.href)}
                            className="w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 group/action relative"
                            style={{
                              backgroundColor: `${accent}10`,
                              borderColor: `${accent}35`,
                              color: accent,
                            }}
                            whileHover={{
                              scale: 1.15,
                              backgroundColor: `${accent}25`,
                              boxShadow: `0 0 25px ${accent}30`,
                            }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {action.icon}
                            <span className="text-[8px] font-semibold tracking-wide" style={{ color: accent }}>
                              {action.label}
                            </span>

                            {/* Tooltip with description */}
                            <div
                              className="absolute whitespace-nowrap px-3 py-2 rounded-lg pointer-events-none opacity-0 group-hover/action:opacity-100 transition-opacity duration-200 -top-12 flex flex-col items-center z-30"
                              style={{
                                backgroundColor: 'hsl(var(--card))',
                                border: `1px solid ${accent}30`,
                                boxShadow: `0 4px 20px hsl(var(--background) / 0.8)`,
                              }}
                            >
                              <span className="text-[11px] font-bold" style={{ color: accent }}>{action.label}</span>
                              <span className="text-[9px] text-muted-foreground">{action.description}</span>
                            </div>
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })}

          {/* Module info panel (inside wheel, bottom center) */}
          <AnimatePresence>
            {expandedModule && (
              <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                {(() => {
                  const mod = modules.find(m => m.id === expandedModule);
                  if (!mod) return null;
                  const accent = `hsl(${mod.accentHsl})`;
                  return (
                    <button
                      onClick={() => navigate(mod.href)}
                      className="flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-2xl transition-all duration-300 hover:scale-105 group"
                      style={{
                        backgroundColor: 'hsl(var(--card) / 0.7)',
                        borderColor: `${accent}30`,
                        boxShadow: `0 0 40px ${accent}10`,
                      }}
                    >
                      <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${accent}15`, color: accent }}>
                        {mod.icon}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold" style={{ color: accent }}>{mod.title}</p>
                        <p className="text-xs text-muted-foreground">{mod.tagline}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{mod.actions.length} ações disponíveis</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <span className="text-xs font-semibold" style={{ color: accent }}>Acessar</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: accent }} />
                      </div>
                    </button>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-[5]" />
    </div>
  );
};

export default Index;
