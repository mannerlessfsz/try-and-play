import { useState, useMemo, useCallback } from "react";
import {
  CheckSquare, MessageCircle, DollarSign, Settings, LogOut, Zap,
  ListTodo, Building2, Eye, BarChart3, Users, Package, ShoppingCart,
  Wallet, FileText, PieChart, Send, BookOpen, Bot,
  ChevronRight, Lock, Layers, Plus, List, Calendar,
  TrendingUp, Target, CreditCard, Tags, Landmark,
  UserPlus, Search, Box, ClipboardList, Truck,
  Receipt, BarChart, MessageSquare, History, UserCheck, FolderPlus, Edit,
  ArrowUpDown, Filter, Download, Upload, Star, Clock, Repeat, Hash
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GradientMesh } from "@/components/GradientMesh";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions, AppModule } from "@/hooks/useModulePermissions";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──
interface HudLeaf {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface HudSubAction {
  icon: React.ReactNode;
  label: string;
  href: string;
  leaves?: HudLeaf[];
}

interface HudAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  subActions?: HudSubAction[];
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

// ── Data: 4 levels deep ──
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
      {
        icon: <ListTodo className="w-5 h-5" />, label: "Tarefas", description: "Kanban e lista", href: "/taskvault",
        subActions: [
          {
            icon: <Layers className="w-4 h-4" />, label: "Kanban", href: "/taskvault",
            leaves: [
              { icon: <Filter className="w-3 h-3" />, label: "Filtrar", href: "/taskvault" },
              { icon: <ArrowUpDown className="w-3 h-3" />, label: "Ordenar", href: "/taskvault" },
            ],
          },
          {
            icon: <List className="w-4 h-4" />, label: "Lista", href: "/taskvault",
            leaves: [
              { icon: <Filter className="w-3 h-3" />, label: "Filtrar", href: "/taskvault" },
              { icon: <Download className="w-3 h-3" />, label: "Exportar", href: "/taskvault" },
            ],
          },
          { icon: <Plus className="w-4 h-4" />, label: "Criar", href: "/taskvault" },
        ],
      },
      {
        icon: <Building2 className="w-5 h-5" />, label: "Empresas", description: "Cadastro", href: "/taskvault",
        subActions: [
          { icon: <Plus className="w-4 h-4" />, label: "Cadastrar", href: "/taskvault" },
          { icon: <List className="w-4 h-4" />, label: "Listar", href: "/taskvault" },
        ],
      },
      {
        icon: <Eye className="w-5 h-5" />, label: "Visão Geral", description: "Dashboard", href: "/taskvault",
        subActions: [
          {
            icon: <BarChart3 className="w-4 h-4" />, label: "Dashboard", href: "/taskvault",
            leaves: [
              { icon: <Clock className="w-3 h-3" />, label: "Hoje", href: "/taskvault" },
              { icon: <Calendar className="w-3 h-3" />, label: "Semana", href: "/taskvault" },
            ],
          },
          { icon: <Calendar className="w-4 h-4" />, label: "Timeline", href: "/taskvault" },
          { icon: <Target className="w-4 h-4" />, label: "Heatmap", href: "/taskvault" },
        ],
      },
      {
        icon: <BarChart3 className="w-5 h-5" />, label: "Relatórios", description: "Análises", href: "/taskvault",
        subActions: [
          { icon: <TrendingUp className="w-4 h-4" />, label: "Por Status", href: "/taskvault" },
          { icon: <Calendar className="w-4 h-4" />, label: "Por Período", href: "/taskvault" },
        ],
      },
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
      {
        icon: <Wallet className="w-5 h-5" />, label: "Financeiro", description: "Contas e fluxo", href: "/gestao",
        subActions: [
          {
            icon: <Receipt className="w-4 h-4" />, label: "Transações", href: "/gestao",
            leaves: [
              { icon: <Plus className="w-3 h-3" />, label: "Nova", href: "/gestao" },
              { icon: <Filter className="w-3 h-3" />, label: "Filtrar", href: "/gestao" },
              { icon: <Download className="w-3 h-3" />, label: "Exportar", href: "/gestao" },
            ],
          },
          {
            icon: <Landmark className="w-4 h-4" />, label: "Contas", href: "/gestao",
            leaves: [
              { icon: <Plus className="w-3 h-3" />, label: "Nova Conta", href: "/gestao" },
              { icon: <Upload className="w-3 h-3" />, label: "Importar", href: "/gestao" },
            ],
          },
          { icon: <Tags className="w-4 h-4" />, label: "Categorias", href: "/gestao" },
          {
            icon: <CreditCard className="w-4 h-4" />, label: "Parcelas", href: "/gestao",
            leaves: [
              { icon: <Clock className="w-3 h-3" />, label: "Vencendo", href: "/gestao" },
              { icon: <Star className="w-3 h-3" />, label: "Atrasadas", href: "/gestao" },
            ],
          },
          { icon: <Repeat className="w-4 h-4" />, label: "Recorrências", href: "/gestao" },
        ],
      },
      {
        icon: <Users className="w-5 h-5" />, label: "Clientes", description: "Cadastro", href: "/gestao",
        subActions: [
          { icon: <UserPlus className="w-4 h-4" />, label: "Cadastrar", href: "/gestao" },
          { icon: <Search className="w-4 h-4" />, label: "Buscar", href: "/gestao" },
        ],
      },
      {
        icon: <Package className="w-5 h-5" />, label: "Produtos", description: "Estoque", href: "/gestao",
        subActions: [
          { icon: <Plus className="w-4 h-4" />, label: "Novo", href: "/gestao" },
          {
            icon: <Box className="w-4 h-4" />, label: "Estoque", href: "/gestao",
            leaves: [
              { icon: <ArrowUpDown className="w-3 h-3" />, label: "Movimentar", href: "/gestao" },
              { icon: <Hash className="w-3 h-3" />, label: "Inventário", href: "/gestao" },
            ],
          },
        ],
      },
      {
        icon: <ShoppingCart className="w-5 h-5" />, label: "Vendas", description: "Pedidos", href: "/gestao",
        subActions: [
          { icon: <Plus className="w-4 h-4" />, label: "Nova Venda", href: "/gestao" },
          { icon: <ClipboardList className="w-4 h-4" />, label: "Orçamentos", href: "/gestao" },
        ],
      },
      {
        icon: <FileText className="w-5 h-5" />, label: "Compras", description: "Fornecedores", href: "/gestao",
        subActions: [
          { icon: <Plus className="w-4 h-4" />, label: "Nova Compra", href: "/gestao" },
          { icon: <Truck className="w-4 h-4" />, label: "Fornecedores", href: "/gestao" },
        ],
      },
      {
        icon: <PieChart className="w-5 h-5" />, label: "Relatórios", description: "Análises", href: "/gestao",
        subActions: [
          { icon: <BarChart className="w-4 h-4" />, label: "Fluxo Caixa", href: "/gestao" },
          { icon: <TrendingUp className="w-4 h-4" />, label: "DRE", href: "/gestao" },
        ],
      },
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
      {
        icon: <Send className="w-5 h-5" />, label: "Conversas", description: "Chat", href: "/messenger",
        subActions: [
          {
            icon: <MessageSquare className="w-4 h-4" />, label: "Nova", href: "/messenger",
            leaves: [
              { icon: <UserCheck className="w-3 h-3" />, label: "Individual", href: "/messenger" },
              { icon: <Users className="w-3 h-3" />, label: "Grupo", href: "/messenger" },
            ],
          },
          { icon: <History className="w-4 h-4" />, label: "Histórico", href: "/messenger" },
          { icon: <Star className="w-4 h-4" />, label: "Favoritas", href: "/messenger" },
        ],
      },
      {
        icon: <BookOpen className="w-5 h-5" />, label: "Contatos", description: "Lista e grupos", href: "/messenger",
        subActions: [
          { icon: <UserCheck className="w-4 h-4" />, label: "Lista", href: "/messenger" },
          { icon: <FolderPlus className="w-4 h-4" />, label: "Grupos", href: "/messenger" },
        ],
      },
      {
        icon: <Bot className="w-5 h-5" />, label: "Templates", description: "Mensagens rápidas", href: "/messenger",
        subActions: [
          { icon: <Plus className="w-4 h-4" />, label: "Criar", href: "/messenger" },
          { icon: <Edit className="w-4 h-4" />, label: "Gerenciar", href: "/messenger" },
        ],
      },
    ],
  },
];

// ── Layout constants ──
const WHEEL_RADIUS = 110;
const ACTION_RADIUS = 200;
const SUB_ACTION_RADIUS = 90;
const LEAF_RADIUS = 70;

const Index = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, hasModuleAccessFlexible } = useModulePermissions();
  const { empresaAtiva } = useEmpresaAtiva();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  const handleBackgroundClick = useCallback(() => {
    setExpandedModule(null);
    setExpandedAction(null);
    setExpandedSub(null);
  }, []);

  const toggleModule = useCallback((id: string) => {
    setExpandedModule(prev => prev === id ? null : id);
    setExpandedAction(null);
    setExpandedSub(null);
  }, []);

  const toggleAction = useCallback((actionKey: string) => {
    setExpandedAction(prev => prev === actionKey ? null : actionKey);
    setExpandedSub(null);
  }, []);

  const toggleSub = useCallback((subKey: string) => {
    setExpandedSub(prev => prev === subKey ? null : subKey);
  }, []);

  const modulePositions = useMemo(() => {
    const count = modules.length;
    const startAngle = -90;
    return modules.map((_, i) => {
      const angleDeg = startAngle + (360 / count) * i;
      const angleRad = (angleDeg * Math.PI) / 180;
      return { x: Math.cos(angleRad) * WHEEL_RADIUS, y: Math.sin(angleRad) * WHEEL_RADIUS, angleDeg };
    });
  }, []);

  const getActionPositions = (moduleIndex: number, actionCount: number) => {
    const moduleAngle = modulePositions[moduleIndex].angleDeg;
    const fanSpread = Math.min(actionCount * 20, 100);
    const startAngle = moduleAngle - fanSpread / 2;
    return Array.from({ length: actionCount }, (_, i) => {
      const angleDeg = actionCount === 1 ? moduleAngle : startAngle + (fanSpread / (actionCount - 1)) * i;
      const angleRad = (angleDeg * Math.PI) / 180;
      return { x: Math.cos(angleRad) * ACTION_RADIUS, y: Math.sin(angleRad) * ACTION_RADIUS, angleDeg };
    });
  };

  const getFanPositions = (parentAngle: number, count: number, radius: number, spreadPerItem: number, maxSpread: number) => {
    const fanSpread = Math.min(count * spreadPerItem, maxSpread);
    const startAngle = parentAngle - fanSpread / 2;
    return Array.from({ length: count }, (_, i) => {
      const angleDeg = count === 1 ? parentAngle : startAngle + (fanSpread / (count - 1)) * i;
      const angleRad = (angleDeg * Math.PI) / 180;
      return { x: Math.cos(angleRad) * radius, y: Math.sin(angleRad) * radius, angleDeg };
    });
  };

  const totalR = WHEEL_RADIUS + ACTION_RADIUS + SUB_ACTION_RADIUS + LEAF_RADIUS + 120;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" onClick={handleBackgroundClick}>
      <GradientMesh />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.012]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
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
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: totalR * 2,
            height: totalR * 2,
            background: `
              radial-gradient(circle, hsl(0 0% 100% / 0.05) 0%, transparent 50%),
              radial-gradient(circle, hsl(0 85% 55% / 0.04) 0%, transparent 35%),
              radial-gradient(circle at 30% 70%, hsl(210 100% 55% / 0.04) 0%, transparent 35%),
              radial-gradient(circle at 70% 70%, hsl(25 100% 55% / 0.04) 0%, transparent 35%)
            `,
            filter: 'blur(30px)',
          }}
        />
        <div className="relative" style={{ width: totalR * 2, height: totalR * 2 }}>

          {/* Center dot */}
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

            const MOD_HALF = 64; // half of 128px module node

            return (
              <div key={mod.id}>
                {/* Line center → module */}
                <motion.div className="absolute top-1/2 left-1/2 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + index * 0.1 }}>
                  <svg style={{ position: 'absolute', top: -1, left: -1, width: 2, height: 2, overflow: 'visible' }}>
                    <motion.line x1={0} y1={0} x2={pos.x} y2={pos.y} stroke={accent} strokeWidth={isExpanded ? 2 : 1} strokeDasharray={isExpanded ? "none" : "4 4"} strokeOpacity={isExpanded ? 0.5 : 0.2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }} />
                  </svg>
                </motion.div>

                {/* Module Node */}
                <motion.div
                  className="absolute top-1/2 left-1/2 z-10"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, x: pos.x - MOD_HALF, y: pos.y - MOD_HALF }}
                  transition={{ delay: 0.5 + index * 0.12, type: "spring", stiffness: 180, damping: 18 }}
                >
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); hasAccess && toggleModule(mod.id); }}
                    disabled={!hasAccess}
                    className={`relative flex flex-col items-center justify-center gap-1.5 transition-all duration-300 rounded-2xl border-2 ${hasAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-30 grayscale'}`}
                    style={{
                      width: MOD_HALF * 2, height: MOD_HALF * 2,
                      backgroundColor: isExpanded ? 'hsl(0 0% 8% / 0.98)' : 'hsl(0 0% 6% / 0.97)',
                      borderColor: isExpanded ? `${accent}90` : `${accent}50`,
                      boxShadow: isExpanded ? `0 0 50px ${accent}30, inset 0 0 30px hsl(0 0% 100% / 0.04)` : `0 0 20px ${accent}10`,
                      backdropFilter: 'blur(24px)',
                    }}
                    whileHover={hasAccess ? { scale: 1.08, boxShadow: `0 0 40px ${accent}25` } : {}}
                    whileTap={hasAccess ? { scale: 0.95 } : {}}
                  >
                    {isExpanded && (
                      <motion.div className="absolute -inset-1.5 rounded-2xl pointer-events-none" style={{ border: `1px solid ${accent}40` }} animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
                    )}
                    <div style={{ color: hasAccess ? accent : undefined }}>{hasAccess ? mod.icon : <Lock className="w-6 h-6" />}</div>
                    <span className="text-sm font-bold tracking-wider" style={{ color: accent }}>{mod.title}</span>
                    <span className="text-[10px] text-foreground/70 leading-tight text-center px-2">{mod.tagline}</span>
                  </motion.button>

                  {/* ── Level 2: Actions ── */}
                  <AnimatePresence>
                    {isExpanded && hasAccess && mod.actions.map((action, aIdx) => {
                      const aPos = actionPositions[aIdx];
                      const actionKey = `${mod.id}-${action.label}`;
                      const isActionExp = expandedAction === actionKey;
                      const hasSubs = action.subActions && action.subActions.length > 0;
                      const subPositions = hasSubs ? getFanPositions(aPos.angleDeg, action.subActions!.length, SUB_ACTION_RADIUS, 18, 70) : [];
                      const A_HALF = 34;

                      return (
                        <motion.div
                          key={action.label}
                          className="absolute z-10"
                          style={{ top: MOD_HALF, left: MOD_HALF }}
                          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                          animate={{ x: aPos.x - A_HALF, y: aPos.y - A_HALF, scale: 1, opacity: 1 }}
                          exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                          transition={{ delay: aIdx * 0.05, type: "spring", stiffness: 220, damping: 20 }}
                        >
                          {/* Line module → action */}
                          <svg className="absolute pointer-events-none" style={{ top: A_HALF, left: A_HALF, width: 1, height: 1, overflow: 'visible' }}>
                            <line x1={0} y1={0} x2={-aPos.x} y2={-aPos.y} stroke={accent} strokeWidth={1} strokeOpacity={0.3} />
                          </svg>

                          <motion.button
                            onClick={(e) => { e.stopPropagation(); hasSubs ? toggleAction(actionKey) : navigate(action.href); }}
                            className="rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 group/action relative"
                            style={{
                              width: A_HALF * 2, height: A_HALF * 2,
                              backgroundColor: isActionExp ? `${accent}22` : 'hsl(0 0% 5% / 0.97)',
                              borderColor: isActionExp ? `${accent}90` : `${accent}60`,
                              color: accent,
                            }}
                            whileHover={{ scale: 1.12, backgroundColor: `${accent}25`, boxShadow: `0 0 25px ${accent}30` }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {isActionExp && (
                              <motion.div className="absolute -inset-1 rounded-xl pointer-events-none" style={{ border: `1px solid ${accent}40` }} animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }} />
                            )}
                            {action.icon}
                            <span className="text-[10px] font-bold tracking-wide" style={{ color: accent }}>{action.label}</span>
                            {hasSubs && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
                                <span className="text-[8px] font-bold text-black">{action.subActions!.length}</span>
                              </div>
                            )}
                            {/* Tooltip */}
                            <div className="absolute whitespace-nowrap px-2 py-1.5 rounded-lg pointer-events-none opacity-0 group-hover/action:opacity-100 transition-opacity duration-200 -top-10 z-30" style={{ backgroundColor: 'hsl(0 0% 8% / 0.95)', border: `1px solid ${accent}30` }}>
                              <span className="text-[10px] font-bold" style={{ color: accent }}>{action.label}</span>
                            </div>
                          </motion.button>

                          {/* ── Level 3: Sub-actions ── */}
                          <AnimatePresence>
                            {isActionExp && hasSubs && action.subActions!.map((sub, sIdx) => {
                              const sPos = subPositions[sIdx];
                              const subKey = `${actionKey}-${sub.label}`;
                              const isSubExp = expandedSub === subKey;
                              const hasLeaves = sub.leaves && sub.leaves.length > 0;
                              const leafPositions = hasLeaves ? getFanPositions(sPos.angleDeg, sub.leaves!.length, LEAF_RADIUS, 22, 60) : [];
                              const S_HALF = 24;

                              return (
                                <motion.div
                                  key={sub.label}
                                  className="absolute z-20"
                                  style={{ top: A_HALF, left: A_HALF }}
                                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                  animate={{ x: sPos.x - S_HALF, y: sPos.y - S_HALF, scale: 1, opacity: 1 }}
                                  exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                  transition={{ delay: sIdx * 0.04, type: "spring", stiffness: 260, damping: 22 }}
                                >
                                  {/* Line action → sub */}
                                  <svg className="absolute pointer-events-none" style={{ top: S_HALF, left: S_HALF, width: 1, height: 1, overflow: 'visible' }}>
                                    <line x1={0} y1={0} x2={-sPos.x} y2={-sPos.y} stroke={accent} strokeWidth={0.8} strokeOpacity={0.25} strokeDasharray="2 3" />
                                  </svg>

                                  <motion.button
                                    onClick={(e) => { e.stopPropagation(); hasLeaves ? toggleSub(subKey) : navigate(sub.href); }}
                                    className="rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all duration-200 group/sub relative"
                                    style={{
                                      width: S_HALF * 2, height: S_HALF * 2,
                                      backgroundColor: isSubExp ? `${accent}22` : 'hsl(0 0% 4% / 0.97)',
                                      borderColor: isSubExp ? `${accent}70` : `${accent}45`,
                                      color: accent,
                                    }}
                                    whileHover={{ scale: 1.15, backgroundColor: `${accent}30`, boxShadow: `0 0 18px ${accent}30` }}
                                    whileTap={{ scale: 0.85 }}
                                  >
                                    {isSubExp && (
                                      <motion.div className="absolute -inset-0.5 rounded-lg pointer-events-none" style={{ border: `1px solid ${accent}35` }} animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
                                    )}
                                    {sub.icon}
                                    <span className="text-[8px] font-bold tracking-wide leading-none" style={{ color: accent }}>{sub.label}</span>
                                    {hasLeaves && (
                                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
                                        <span className="text-[7px] font-bold text-black">{sub.leaves!.length}</span>
                                      </div>
                                    )}
                                  </motion.button>

                                  {/* ── Level 4: Leaves ── */}
                                  <AnimatePresence>
                                    {isSubExp && hasLeaves && sub.leaves!.map((leaf, lIdx) => {
                                      const lPos = leafPositions[lIdx];
                                      const L_HALF = 18;
                                      return (
                                        <motion.div
                                          key={leaf.label}
                                          className="absolute z-30"
                                          style={{ top: S_HALF, left: S_HALF }}
                                          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                          animate={{ x: lPos.x - L_HALF, y: lPos.y - L_HALF, scale: 1, opacity: 1 }}
                                          exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                          transition={{ delay: lIdx * 0.03, type: "spring", stiffness: 300, damping: 24 }}
                                        >
                                          {/* Line sub → leaf */}
                                          <svg className="absolute pointer-events-none" style={{ top: L_HALF, left: L_HALF, width: 1, height: 1, overflow: 'visible' }}>
                                            <line x1={0} y1={0} x2={-lPos.x} y2={-lPos.y} stroke={accent} strokeWidth={0.6} strokeOpacity={0.2} strokeDasharray="1 2" />
                                          </svg>

                                          <motion.button
                                            onClick={(e) => { e.stopPropagation(); navigate(leaf.href); }}
                                            className="rounded-md border flex flex-col items-center justify-center gap-0 transition-all duration-200 group/leaf relative"
                                            style={{
                                              width: L_HALF * 2, height: L_HALF * 2,
                                              backgroundColor: 'hsl(0 0% 3% / 0.97)',
                                              borderColor: `${accent}40`,
                                              color: accent,
                                            }}
                                            whileHover={{ scale: 1.2, backgroundColor: `${accent}35`, boxShadow: `0 0 15px ${accent}30` }}
                                            whileTap={{ scale: 0.85 }}
                                          >
                                            {leaf.icon}
                                            <span className="text-[7px] font-bold leading-none mt-0.5" style={{ color: accent }}>{leaf.label}</span>
                                            {/* Tooltip */}
                                            <div className="absolute whitespace-nowrap px-1.5 py-0.5 rounded pointer-events-none opacity-0 group-hover/leaf:opacity-100 transition-opacity duration-200 -top-6 z-40" style={{ backgroundColor: 'hsl(0 0% 6% / 0.95)', border: `1px solid ${accent}20` }}>
                                              <span className="text-[9px] font-semibold" style={{ color: accent }}>{leaf.label}</span>
                                            </div>
                                          </motion.button>
                                        </motion.div>
                                      );
                                    })}
                                  </AnimatePresence>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })}

          {/* Module info panel */}
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
                      onClick={(e) => { e.stopPropagation(); navigate(mod.href); }}
                      className="flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-2xl transition-all duration-300 hover:scale-105 group"
                      style={{ backgroundColor: 'hsl(0 0% 10% / 0.95)', borderColor: `${accent}40`, boxShadow: `0 0 40px ${accent}15` }}
                    >
                      <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${accent}15`, color: accent }}>{mod.icon}</div>
                      <div className="text-left">
                        <p className="text-sm font-bold" style={{ color: accent }}>{mod.title}</p>
                        <p className="text-xs text-muted-foreground">{mod.tagline}</p>
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
