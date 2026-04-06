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
    icon: <CheckSquare className="w-6 h-6" />,
    title: "TASKVAULT",
    tagline: "Gestão de tarefas",
    accentHsl: "0 85% 55%",
    module: "taskvault",
    href: "/taskvault",
    actions: [
      { icon: <ListTodo className="w-4 h-4" />, label: "Tarefas", href: "/taskvault" },
      { icon: <Building2 className="w-4 h-4" />, label: "Empresas", href: "/taskvault" },
      { icon: <Eye className="w-4 h-4" />, label: "Visão Geral", href: "/taskvault" },
      { icon: <BarChart3 className="w-4 h-4" />, label: "Relatórios", href: "/taskvault" },
    ],
  },
  {
    id: "gestao",
    icon: <DollarSign className="w-6 h-6" />,
    title: "GESTÃO",
    tagline: "ERP + Financeiro",
    accentHsl: "210 100% 55%",
    module: "gestao",
    href: "/gestao",
    actions: [
      { icon: <Wallet className="w-4 h-4" />, label: "Financeiro", href: "/gestao" },
      { icon: <Users className="w-4 h-4" />, label: "Clientes", href: "/gestao" },
      { icon: <Package className="w-4 h-4" />, label: "Produtos", href: "/gestao" },
      { icon: <ShoppingCart className="w-4 h-4" />, label: "Vendas", href: "/gestao" },
      { icon: <FileText className="w-4 h-4" />, label: "Compras", href: "/gestao" },
      { icon: <PieChart className="w-4 h-4" />, label: "Relatórios", href: "/gestao" },
    ],
  },
  {
    id: "messenger",
    icon: <MessageCircle className="w-6 h-6" />,
    title: "MESSENGER",
    tagline: "Comunicação",
    accentHsl: "25 100% 55%",
    module: "messenger",
    href: "/messenger",
    actions: [
      { icon: <Send className="w-4 h-4" />, label: "Conversas", href: "/messenger" },
      { icon: <BookOpen className="w-4 h-4" />, label: "Contatos", href: "/messenger" },
      { icon: <Bot className="w-4 h-4" />, label: "Templates", href: "/messenger" },
    ],
  },
];

// Radial positioning: modules are placed around a circle
const WHEEL_RADIUS = 180; // px from center to module nodes
const ACTION_RADIUS = 120; // px from module node to action nodes

const Index = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, hasModuleAccessFlexible } = useModulePermissions();
  const { empresaAtiva } = useEmpresaAtiva();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const toggleModule = (id: string) => {
    setExpandedModule(prev => prev === id ? null : id);
  };

  // Calculate positions for modules around the wheel
  const modulePositions = useMemo(() => {
    const count = modules.length;
    // Start from top (-90deg) and distribute evenly
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

  // Calculate positions for action nodes around a module
  const getActionPositions = (moduleIndex: number, actionCount: number) => {
    const moduleAngle = modulePositions[moduleIndex].angleDeg;
    // Spread actions in a fan from the module, oriented outward
    const fanSpread = Math.min(actionCount * 28, 140); // degrees of fan
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
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
            <div className="p-2 rounded-xl bg-gradient-to-br from-magenta/20 to-blue/20 backdrop-blur-xl border border-white/10">
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
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 h-8">
                <Settings className="w-3.5 h-3.5" /> Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 h-8">
              <LogOut className="w-3.5 h-3.5" /> Sair
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Wheel HUD */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="relative" style={{ width: (WHEEL_RADIUS + ACTION_RADIUS + 80) * 2, height: (WHEEL_RADIUS + ACTION_RADIUS + 80) * 2 }}>

          {/* Center Hub */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className="relative">
              {/* Pulsing rings */}
              <motion.div
                className="absolute inset-0 rounded-full border border-magenta/20"
                style={{ margin: -12 }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-blue/15"
                style={{ margin: -20 }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />

              {/* Hub button */}
              <button
                onClick={() => setExpandedModule(null)}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-2xl border border-border/50 flex flex-col items-center justify-center gap-1 hover:border-magenta/40 transition-all duration-300 group"
                style={{
                  boxShadow: '0 0 60px hsl(0 85% 55% / 0.1), 0 0 120px hsl(210 100% 55% / 0.05)',
                }}
              >
                <Hexagon className="w-5 h-5 text-magenta group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-bold tracking-[0.15em] text-muted-foreground uppercase">HUB</span>
              </button>
            </div>
          </motion.div>

          {/* Orbit ring (decorative) */}
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
                    style={{
                      position: 'absolute',
                      top: -1,
                      left: -1,
                      width: 2,
                      height: 2,
                      overflow: 'visible',
                    }}
                  >
                    <motion.line
                      x1={0} y1={0}
                      x2={pos.x} y2={pos.y}
                      stroke={isExpanded ? accent : 'hsl(var(--border))'}
                      strokeWidth={isExpanded ? 1.5 : 0.5}
                      strokeDasharray={isExpanded ? "none" : "4 4"}
                      strokeOpacity={isExpanded ? 0.5 : 0.3}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                    />
                  </svg>
                </motion.div>

                {/* Module Node */}
                <motion.div
                  className="absolute top-1/2 left-1/2 z-10"
                  style={{ x: pos.x, y: pos.y }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    x: pos.x - 36,
                    y: pos.y - 36,
                  }}
                  transition={{ delay: 0.5 + index * 0.12, type: "spring", stiffness: 180, damping: 18 }}
                >
                  <motion.button
                    onClick={() => hasAccess && toggleModule(mod.id)}
                    disabled={!hasAccess}
                    className={`
                      relative w-[72px] h-[72px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all duration-300
                      ${hasAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-30 grayscale'}
                    `}
                    style={{
                      backgroundColor: isExpanded ? `${accent}18` : 'hsl(var(--card) / 0.6)',
                      borderColor: isExpanded ? `${accent}80` : 'hsl(var(--border) / 0.4)',
                      boxShadow: isExpanded
                        ? `0 0 40px ${accent}30, 0 0 80px ${accent}10`
                        : 'none',
                      backdropFilter: 'blur(16px)',
                    }}
                    whileHover={hasAccess ? {
                      scale: 1.12,
                      boxShadow: `0 0 30px ${accent}25`,
                    } : {}}
                    whileTap={hasAccess ? { scale: 0.95 } : {}}
                  >
                    {/* Glow ring on expanded */}
                    {isExpanded && (
                      <motion.div
                        className="absolute -inset-1 rounded-2xl pointer-events-none"
                        style={{ border: `1px solid ${accent}40` }}
                        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}

                    <div style={{ color: hasAccess ? accent : undefined }}>
                      {hasAccess ? mod.icon : <Lock className="w-5 h-5" />}
                    </div>
                    <span
                      className="text-[8px] font-bold tracking-wider"
                      style={{ color: isExpanded ? accent : 'hsl(var(--muted-foreground))' }}
                    >
                      {mod.title.length > 8 ? mod.title.slice(0, 7) + '…' : mod.title}
                    </span>
                  </motion.button>

                  {/* Action Nodes (expanded outward) */}
                  <AnimatePresence>
                    {isExpanded && hasAccess && mod.actions.map((action, actionIdx) => {
                      const aPos = actionPositions[actionIdx];
                      return (
                        <motion.div
                          key={action.label}
                          className="absolute z-10"
                          style={{ top: 36, left: 36 }}
                          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                          animate={{
                            x: aPos.x - 22,
                            y: aPos.y - 22,
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
                            style={{
                              top: 22,
                              left: 22,
                              width: 1,
                              height: 1,
                              overflow: 'visible',
                            }}
                          >
                            <line
                              x1={0} y1={0}
                              x2={-aPos.x} y2={-aPos.y}
                              stroke={accent}
                              strokeWidth={0.8}
                              strokeOpacity={0.25}
                            />
                          </svg>

                          <motion.button
                            onClick={() => navigate(action.href)}
                            className="w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-200 group/action relative"
                            style={{
                              backgroundColor: `${accent}10`,
                              borderColor: `${accent}30`,
                              color: accent,
                            }}
                            whileHover={{
                              scale: 1.2,
                              backgroundColor: `${accent}25`,
                              boxShadow: `0 0 20px ${accent}30`,
                            }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {action.icon}

                            {/* Tooltip label */}
                            <div
                              className="absolute whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-semibold pointer-events-none opacity-0 group-hover/action:opacity-100 transition-opacity duration-200 -top-8"
                              style={{
                                backgroundColor: 'hsl(var(--card))',
                                border: `1px solid ${accent}30`,
                                color: accent,
                              }}
                            >
                              {action.label}
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

          {/* Module info panel (bottom of wheel) */}
          <AnimatePresence>
            {expandedModule && (
              <motion.div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30"
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
                      className="flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-2xl transition-all duration-300 hover:scale-105 group"
                      style={{
                        backgroundColor: 'hsl(var(--card) / 0.7)',
                        borderColor: `${accent}30`,
                        boxShadow: `0 0 30px ${accent}10`,
                      }}
                    >
                      <div style={{ color: accent }}>{mod.icon}</div>
                      <div className="text-left">
                        <p className="text-xs font-bold" style={{ color: accent }}>{mod.title}</p>
                        <p className="text-[10px] text-muted-foreground">{mod.tagline}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
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
