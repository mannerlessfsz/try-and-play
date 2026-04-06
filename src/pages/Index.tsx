import { useState } from "react";
import {
  CheckSquare, MessageCircle, DollarSign, Settings, LogOut, Zap,
  ListTodo, Building2, Eye, BarChart3, Users, Package, ShoppingCart,
  Wallet, FileText, PieChart, Send, BookOpen, Bot,
  ChevronRight, Lock, Hexagon, Clock, TrendingUp, Target, Layers
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
    icon: <CheckSquare className="w-8 h-8" />,
    title: "TASKVAULT",
    tagline: "Gestão de tarefas e projetos",
    description: "Controle completo de tarefas, projetos e produtividade da equipe com Kanban, timeline e automações.",
    accentHsl: "0 85% 55%",
    module: "taskvault",
    href: "/taskvault",
    stats: [
      { label: "Pendentes", value: "—", icon: <Clock className="w-3.5 h-3.5" /> },
      { label: "Empresas", value: "—", icon: <Building2 className="w-3.5 h-3.5" /> },
      { label: "Concluídas", value: "—", icon: <Target className="w-3.5 h-3.5" /> },
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
    icon: <DollarSign className="w-8 h-8" />,
    title: "GESTÃO",
    tagline: "ERP + Financeiro integrado",
    description: "Sistema integrado de gestão: financeiro, vendas, compras, estoque e relatórios gerenciais.",
    accentHsl: "210 100% 55%",
    module: "gestao",
    href: "/gestao",
    stats: [
      { label: "Transações", value: "—", icon: <TrendingUp className="w-3.5 h-3.5" /> },
      { label: "Clientes", value: "—", icon: <Users className="w-3.5 h-3.5" /> },
      { label: "Produtos", value: "—", icon: <Package className="w-3.5 h-3.5" /> },
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
    icon: <MessageCircle className="w-8 h-8" />,
    title: "MESSENGER",
    tagline: "Comunicação unificada",
    description: "Central de comunicação interna e externa com chat em tempo real, templates e integração com contatos.",
    accentHsl: "25 100% 55%",
    module: "messenger",
    href: "/messenger",
    stats: [
      { label: "Mensagens", value: "—", icon: <Send className="w-3.5 h-3.5" /> },
      { label: "Contatos", value: "—", icon: <BookOpen className="w-3.5 h-3.5" /> },
      { label: "Templates", value: "—", icon: <Layers className="w-3.5 h-3.5" /> },
    ],
    actions: [
      { icon: <Send className="w-4 h-4" />, label: "Conversas", description: "Chat em tempo real", href: "/messenger" },
      { icon: <BookOpen className="w-4 h-4" />, label: "Contatos", description: "Lista de contatos e grupos", href: "/messenger" },
      { icon: <Bot className="w-4 h-4" />, label: "Templates", description: "Modelos de mensagens rápidas", href: "/messenger" },
    ],
  },
];

// Layout: 3 large cards arranged in a triangular/radial pattern around a center hub
const Index = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, hasModuleAccessFlexible } = useModulePermissions();
  const { empresaAtiva } = useEmpresaAtiva();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const toggleModule = (id: string) => {
    setExpandedModule(prev => prev === id ? null : id);
  };

  // Positions around center — top, bottom-left, bottom-right
  const positions = [
    { x: 0, y: -280 },      // top
    { x: -320, y: 180 },    // bottom-left
    { x: 320, y: 180 },     // bottom-right
  ];

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

      {/* HUD Wheel */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="relative" style={{ width: 900, height: 700 }}>

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
                style={{ margin: -16 }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-accent/15"
                style={{ margin: -28 }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
              <button
                onClick={() => setExpandedModule(null)}
                className="w-28 h-28 rounded-full bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-2xl border border-border/50 flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 transition-all duration-300 group"
                style={{
                  boxShadow: '0 0 80px hsl(var(--primary) / 0.12), 0 0 160px hsl(var(--accent) / 0.06)',
                }}
              >
                <Hexagon className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase">HUB</span>
              </button>
            </div>
          </motion.div>

          {/* Connection lines from center */}
          {modules.map((mod, index) => {
            const pos = positions[index];
            const isExpanded = expandedModule === mod.id;
            const accent = `hsl(${mod.accentHsl})`;
            return (
              <motion.svg
                key={`line-${mod.id}`}
                className="absolute top-1/2 left-1/2 pointer-events-none"
                style={{ width: 1, height: 1, overflow: 'visible' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <motion.line
                  x1={0} y1={0}
                  x2={pos.x} y2={pos.y}
                  stroke={isExpanded ? accent : 'hsl(var(--border))'}
                  strokeWidth={isExpanded ? 2 : 0.8}
                  strokeDasharray={isExpanded ? "none" : "6 6"}
                  strokeOpacity={isExpanded ? 0.5 : 0.25}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                />
              </motion.svg>
            );
          })}

          {/* Module Cards - large, info-rich */}
          {modules.map((mod, index) => {
            const pos = positions[index];
            const hasAccess = hasModuleAccessFlexible(mod.module, empresaAtiva?.id);
            const isExpanded = expandedModule === mod.id;
            const accent = `hsl(${mod.accentHsl})`;

            return (
              <motion.div
                key={mod.id}
                className="absolute top-1/2 left-1/2 z-10"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  x: pos.x - (isExpanded ? 180 : 120),
                  y: pos.y - (isExpanded ? 200 : 80),
                }}
                style={{
                  x: pos.x - (isExpanded ? 180 : 120),
                  y: pos.y - (isExpanded ? 200 : 80),
                }}
                transition={{ delay: 0.5 + index * 0.12, type: "spring", stiffness: 150, damping: 20 }}
              >
                <motion.div
                  layout
                  onClick={() => hasAccess && toggleModule(mod.id)}
                  className={`
                    relative rounded-2xl border-2 backdrop-blur-2xl overflow-hidden transition-colors duration-300
                    ${hasAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-30 grayscale'}
                  `}
                  style={{
                    width: isExpanded ? 360 : 240,
                    backgroundColor: isExpanded ? `${accent}08` : 'hsl(var(--card) / 0.6)',
                    borderColor: isExpanded ? `${accent}60` : 'hsl(var(--border) / 0.3)',
                    boxShadow: isExpanded
                      ? `0 0 60px ${accent}20, 0 0 120px ${accent}08, inset 0 1px 0 ${accent}15`
                      : `0 0 20px hsl(var(--background) / 0.5)`,
                  }}
                  whileHover={hasAccess && !isExpanded ? {
                    scale: 1.05,
                    boxShadow: `0 0 40px ${accent}20`,
                  } : {}}
                  transition={{ layout: { duration: 0.35, type: "spring", stiffness: 200, damping: 25 } }}
                >
                  {/* Glow bar top */}
                  {isExpanded && (
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}

                  {/* Card Header */}
                  <div className="p-4 flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl flex-shrink-0"
                      style={{
                        backgroundColor: `${accent}15`,
                        color: hasAccess ? accent : 'hsl(var(--muted-foreground))',
                      }}
                    >
                      {hasAccess ? mod.icon : <Lock className="w-8 h-8" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold tracking-wider" style={{ color: hasAccess ? accent : 'hsl(var(--muted-foreground))' }}>
                        {mod.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">{mod.tagline}</p>
                    </div>
                    {hasAccess && (
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    )}
                  </div>

                  {/* Stats row - always visible */}
                  {hasAccess && (
                    <div className="px-4 pb-3 flex gap-2">
                      {mod.stats.map((stat) => (
                        <div
                          key={stat.label}
                          className="flex-1 rounded-lg px-2 py-1.5 text-center"
                          style={{
                            backgroundColor: `${accent}08`,
                            border: `1px solid ${accent}12`,
                          }}
                        >
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                            {stat.icon}
                          </div>
                          <p className="text-xs font-bold" style={{ color: accent }}>{stat.value}</p>
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && hasAccess && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        {/* Description */}
                        <div className="px-4 pb-3">
                          <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                        </div>

                        {/* Separator */}
                        <div className="mx-4 h-px" style={{ backgroundColor: `${accent}15` }} />

                        {/* Actions list */}
                        <div className="p-3 space-y-1">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1.5">Ações Rápidas</p>
                          {mod.actions.map((action) => (
                            <button
                              key={action.label}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(action.href);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-[1.02] group/item text-left"
                              style={{
                                backgroundColor: 'hsl(var(--card) / 0.3)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${accent}12`;
                                e.currentTarget.style.boxShadow = `0 0 15px ${accent}10`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'hsl(var(--card) / 0.3)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div
                                className="p-1.5 rounded-md flex-shrink-0"
                                style={{
                                  backgroundColor: `${accent}10`,
                                  color: accent,
                                }}
                              >
                                {action.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-foreground">{action.label}</p>
                                <p className="text-[9px] text-muted-foreground truncate">{action.description}</p>
                              </div>
                              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 transition-all" />
                            </button>
                          ))}
                        </div>

                        {/* Enter module button */}
                        <div className="p-3 pt-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(mod.href);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all duration-300 hover:scale-[1.02]"
                            style={{
                              backgroundColor: accent,
                              color: 'hsl(var(--background))',
                              boxShadow: `0 4px 20px ${accent}40`,
                            }}
                          >
                            Acessar {mod.title}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-[5]" />
    </div>
  );
};

export default Index;
