import { useState, useMemo } from "react";
import {
  CheckSquare, MessageCircle, DollarSign, Settings, LogOut, Zap,
  ListTodo, Building2, Eye, BarChart3, Users, Package, ShoppingCart,
  Wallet, FileText, PieChart, Send, BookOpen, Bot,
  ChevronRight, Lock, Hexagon, Clock, TrendingUp, Bell,
  Calendar, Target, Layers
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
  description: string;
  accentHsl: string;
  module: AppModule;
  href: string;
  stats: { label: string; value: string; icon: React.ReactNode }[];
  actions: HudAction[];
}

const modules: HudModule[] = [
  {
    id: "taskvault",
    icon: <CheckSquare className="w-6 h-6" />,
    title: "TASKVAULT",
    tagline: "Gestão de tarefas",
    description: "Controle completo de tarefas, projetos e produtividade da equipe com Kanban, timeline e automações.",
    accentHsl: "0 85% 55%",
    module: "taskvault",
    href: "/taskvault",
    stats: [
      { label: "Pendentes", value: "—", icon: <Clock className="w-3 h-3" /> },
      { label: "Empresas", value: "—", icon: <Building2 className="w-3 h-3" /> },
      { label: "Concluídas", value: "—", icon: <Target className="w-3 h-3" /> },
    ],
    actions: [
      { icon: <ListTodo className="w-4 h-4" />, label: "Minhas Tarefas", description: "Kanban e lista de tarefas ativas", href: "/taskvault" },
      { icon: <Building2 className="w-4 h-4" />, label: "Empresas", description: "Cadastro e gestão de empresas", href: "/taskvault" },
      { icon: <Eye className="w-4 h-4" />, label: "Visão Geral", description: "Dashboard com métricas e heatmap", href: "/taskvault" },
      { icon: <BarChart3 className="w-4 h-4" />, label: "Relatórios", description: "Análises de produtividade", href: "/taskvault" },
    ],
  },
  {
    id: "gestao",
    icon: <DollarSign className="w-6 h-6" />,
    title: "GESTÃO",
    tagline: "ERP + Financeiro",
    description: "Sistema integrado de gestão empresarial: financeiro, vendas, compras, estoque e relatórios gerenciais.",
    accentHsl: "210 100% 55%",
    module: "gestao",
    href: "/gestao",
    stats: [
      { label: "Transações", value: "—", icon: <TrendingUp className="w-3 h-3" /> },
      { label: "Clientes", value: "—", icon: <Users className="w-3 h-3" /> },
      { label: "Produtos", value: "—", icon: <Package className="w-3 h-3" /> },
    ],
    actions: [
      { icon: <Wallet className="w-4 h-4" />, label: "Financeiro", description: "Contas, transações e fluxo de caixa", href: "/gestao" },
      { icon: <Users className="w-4 h-4" />, label: "Clientes", description: "Cadastro e histórico de clientes", href: "/gestao" },
      { icon: <Package className="w-4 h-4" />, label: "Produtos", description: "Catálogo e controle de estoque", href: "/gestao" },
      { icon: <ShoppingCart className="w-4 h-4" />, label: "Vendas", description: "Orçamentos, pedidos e faturamento", href: "/gestao" },
      { icon: <FileText className="w-4 h-4" />, label: "Compras", description: "Pedidos de compra e recebimentos", href: "/gestao" },
      { icon: <PieChart className="w-4 h-4" />, label: "Relatórios", description: "Análises e demonstrativos", href: "/gestao" },
    ],
  },
  {
    id: "messenger",
    icon: <MessageCircle className="w-6 h-6" />,
    title: "MESSENGER",
    tagline: "Comunicação",
    description: "Central de comunicação interna e externa com chat, templates e integração com contatos.",
    accentHsl: "25 100% 55%",
    module: "messenger",
    href: "/messenger",
    stats: [
      { label: "Mensagens", value: "—", icon: <Send className="w-3 h-3" /> },
      { label: "Contatos", value: "—", icon: <BookOpen className="w-3 h-3" /> },
      { label: "Templates", value: "—", icon: <Layers className="w-3 h-3" /> },
    ],
    actions: [
      { icon: <Send className="w-4 h-4" />, label: "Conversas", description: "Chat em tempo real", href: "/messenger" },
      { icon: <BookOpen className="w-4 h-4" />, label: "Contatos", description: "Lista de contatos e grupos", href: "/messenger" },
      { icon: <Bot className="w-4 h-4" />, label: "Templates", description: "Modelos de mensagens rápidas", href: "/messenger" },
    ],
  },
];

const WHEEL_RADIUS = 200;
const ACTION_RADIUS = 130;

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
    return modules.map((_, i) => {
      const angleDeg = startAngle + (360 / count) * i;
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
    const fanSpread = Math.min(actionCount * 28, 140);
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

  const activeModule = modules.find(m => m.id === expandedModule);

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

          {/* Empresa ativa indicator */}
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

      {/* Main layout: Wheel + Info Panel */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-8 max-w-[1400px] w-full px-4">

          {/* Wheel HUD */}
          <div className="flex-shrink-0 relative" style={{ width: (WHEEL_RADIUS + ACTION_RADIUS + 80) * 2, height: (WHEEL_RADIUS + ACTION_RADIUS + 80) * 2 }}>

            {/* Center Hub */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 rounded-full border border-primary/20"
                  style={{ margin: -12 }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border border-accent/15"
                  style={{ margin: -20 }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                />
                <button
                  onClick={() => setExpandedModule(null)}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-2xl border border-border/50 flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 transition-all duration-300 group"
                  style={{
                    boxShadow: '0 0 60px hsl(var(--primary) / 0.1), 0 0 120px hsl(var(--accent) / 0.05)',
                  }}
                >
                  <Hexagon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] font-bold tracking-[0.15em] text-muted-foreground uppercase">HUB</span>
                  <span className="text-[7px] text-muted-foreground/60">Selecione um módulo</span>
                </button>
              </div>
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
                  {/* Connection line */}
                  <motion.div
                    className="absolute top-1/2 left-1/2 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <svg style={{ position: 'absolute', top: -1, left: -1, width: 2, height: 2, overflow: 'visible' }}>
                      <motion.line
                        x1={0} y1={0} x2={pos.x} y2={pos.y}
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

                  {/* Module Node - larger with more info */}
                  <motion.div
                    className="absolute top-1/2 left-1/2 z-10"
                    style={{ x: pos.x, y: pos.y }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      x: pos.x - 48,
                      y: pos.y - 48,
                    }}
                    transition={{ delay: 0.5 + index * 0.12, type: "spring", stiffness: 180, damping: 18 }}
                  >
                    <motion.button
                      onClick={() => hasAccess && toggleModule(mod.id)}
                      disabled={!hasAccess}
                      className={`
                        relative w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all duration-300
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
                        className="text-[9px] font-bold tracking-wider"
                        style={{ color: isExpanded ? accent : 'hsl(var(--muted-foreground))' }}
                      >
                        {mod.title}
                      </span>
                      <span className="text-[7px] text-muted-foreground/60">{mod.tagline}</span>
                    </motion.button>

                    {/* Action Nodes */}
                    <AnimatePresence>
                      {isExpanded && hasAccess && mod.actions.map((action, actionIdx) => {
                        const aPos = actionPositions[actionIdx];
                        return (
                          <motion.div
                            key={action.label}
                            className="absolute z-10"
                            style={{ top: 48, left: 48 }}
                            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                            animate={{ x: aPos.x - 24, y: aPos.y - 24, scale: 1, opacity: 1 }}
                            exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                            transition={{ delay: actionIdx * 0.06, type: "spring", stiffness: 220, damping: 20 }}
                          >
                            <svg className="absolute pointer-events-none" style={{ top: 24, left: 24, width: 1, height: 1, overflow: 'visible' }}>
                              <line x1={0} y1={0} x2={-aPos.x} y2={-aPos.y} stroke={accent} strokeWidth={0.8} strokeOpacity={0.25} />
                            </svg>
                            <motion.button
                              onClick={() => navigate(action.href)}
                              className="w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-200 group/action relative"
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
                              <div
                                className="absolute whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[10px] font-semibold pointer-events-none opacity-0 group-hover/action:opacity-100 transition-opacity duration-200 -top-10 flex flex-col items-center"
                                style={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: `1px solid ${accent}30`,
                                  color: accent,
                                }}
                              >
                                {action.label}
                                <span className="text-[8px] font-normal text-muted-foreground max-w-[120px] text-center leading-tight">
                                  {action.description}
                                </span>
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
          </div>

          {/* Info Panel (right side) */}
          <AnimatePresence mode="wait">
            {activeModule ? (
              <motion.div
                key={activeModule.id}
                className="flex-1 max-w-md"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="rounded-2xl border backdrop-blur-2xl p-6 space-y-5"
                  style={{
                    backgroundColor: 'hsl(var(--card) / 0.6)',
                    borderColor: `hsl(${activeModule.accentHsl} / 0.2)`,
                    boxShadow: `0 0 60px hsl(${activeModule.accentHsl} / 0.05)`,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="p-3 rounded-xl"
                      style={{
                        backgroundColor: `hsl(${activeModule.accentHsl} / 0.15)`,
                        color: `hsl(${activeModule.accentHsl})`,
                      }}
                    >
                      {activeModule.icon}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: `hsl(${activeModule.accentHsl})` }}>
                        {activeModule.title}
                      </h2>
                      <p className="text-xs text-muted-foreground">{activeModule.tagline}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {activeModule.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {activeModule.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg border p-2.5 text-center"
                        style={{
                          backgroundColor: `hsl(${activeModule.accentHsl} / 0.05)`,
                          borderColor: `hsl(${activeModule.accentHsl} / 0.1)`,
                        }}
                      >
                        <div className="flex items-center justify-center gap-1 mb-1 text-muted-foreground">
                          {stat.icon}
                          <span className="text-[10px] uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <p className="text-lg font-bold" style={{ color: `hsl(${activeModule.accentHsl})` }}>
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions list */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Ações Rápidas</p>
                    {activeModule.actions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => navigate(action.href)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200 hover:scale-[1.02] group/item text-left"
                        style={{
                          backgroundColor: 'hsl(var(--card) / 0.4)',
                          borderColor: 'hsl(var(--border) / 0.3)',
                        }}
                      >
                        <div
                          className="p-1.5 rounded-md"
                          style={{
                            backgroundColor: `hsl(${activeModule.accentHsl} / 0.1)`,
                            color: `hsl(${activeModule.accentHsl})`,
                          }}
                        >
                          {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{action.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{action.description}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover/item:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>

                  {/* Enter module button */}
                  <button
                    onClick={() => navigate(activeModule.href)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      backgroundColor: `hsl(${activeModule.accentHsl})`,
                      color: 'hsl(var(--background))',
                      boxShadow: `0 4px 20px hsl(${activeModule.accentHsl} / 0.3)`,
                    }}
                  >
                    Acessar {activeModule.title}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="welcome"
                className="flex-1 max-w-md"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <div className="rounded-2xl border border-border/20 backdrop-blur-2xl bg-card/40 p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Hexagon className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-bold text-foreground tracking-wide">COMMAND CENTER</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Selecione um módulo na roda para ver suas funcionalidades e acessar rapidamente as ações disponíveis.
                  </p>
                  <div className="space-y-2">
                    {modules.map((mod) => {
                      const hasAccess = hasModuleAccessFlexible(mod.module, empresaAtiva?.id);
                      return (
                        <div
                          key={mod.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border border-border/20 ${hasAccess ? 'opacity-100' : 'opacity-40'}`}
                        >
                          <div style={{ color: `hsl(${mod.accentHsl})` }}>
                            {hasAccess ? mod.icon : <Lock className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{mod.title}</p>
                            <p className="text-[10px] text-muted-foreground">{mod.tagline} · {mod.actions.length} ações</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
