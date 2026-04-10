import { useState, useCallback } from "react";
import {
  CheckSquare, MessageCircle, DollarSign, Settings, LogOut, Zap,
  ListTodo, Building2, Eye, BarChart3, Users, Package, ShoppingCart,
  Wallet, FileText, PieChart, Send, BookOpen, Bot,
  ChevronRight, Lock, Layers, Plus, List, Calendar,
  TrendingUp, Target, CreditCard, Tags, Landmark,
  UserPlus, Search, Box, ClipboardList, Truck,
  Receipt, BarChart, MessageSquare, History, UserCheck, FolderPlus, Edit,
  ArrowUpDown, Filter, Download, Upload, Star, Clock, Repeat, Hash, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GradientMesh } from "@/components/GradientMesh";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions, AppModule } from "@/hooks/useModulePermissions";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──
interface HudLeaf { icon: React.ReactNode; label: string; href: string; }
interface HudSubAction { icon: React.ReactNode; label: string; href: string; leaves?: HudLeaf[]; }
interface HudAction { icon: React.ReactNode; label: string; description: string; href: string; subActions?: HudSubAction[]; }
interface HudModule {
  id: string; icon: React.ReactNode; title: string; tagline: string;
  accentHsl: string; module: AppModule; href: string;
  restPosition: { x: number; y: number };
  actions: HudAction[];
}

// ── Data ──
const modules: HudModule[] = [
  {
    id: "taskvault", icon: <CheckSquare className="w-8 h-8" />, title: "TASKVAULT", tagline: "Gestão de tarefas",
    accentHsl: "0 85% 55%", module: "taskvault", href: "/taskvault",
    restPosition: { x: 20, y: 50 },
    actions: [
      { icon: <ListTodo className="w-5 h-5" />, label: "Tarefas", description: "Kanban e lista", href: "/taskvault",
        subActions: [
          { icon: <Layers className="w-4 h-4" />, label: "Kanban", href: "/taskvault", leaves: [{ icon: <Filter className="w-3 h-3" />, label: "Filtrar", href: "/taskvault" }, { icon: <ArrowUpDown className="w-3 h-3" />, label: "Ordenar", href: "/taskvault" }] },
          { icon: <List className="w-4 h-4" />, label: "Lista", href: "/taskvault", leaves: [{ icon: <Filter className="w-3 h-3" />, label: "Filtrar", href: "/taskvault" }, { icon: <Download className="w-3 h-3" />, label: "Exportar", href: "/taskvault" }] },
          { icon: <Plus className="w-4 h-4" />, label: "Criar", href: "/taskvault" },
        ],
      },
      { icon: <Building2 className="w-5 h-5" />, label: "Empresas", description: "Cadastro", href: "/taskvault",
        subActions: [{ icon: <Plus className="w-4 h-4" />, label: "Cadastrar", href: "/taskvault" }, { icon: <List className="w-4 h-4" />, label: "Listar", href: "/taskvault" }],
      },
      { icon: <Eye className="w-5 h-5" />, label: "Visão Geral", description: "Dashboard", href: "/taskvault",
        subActions: [
          { icon: <BarChart3 className="w-4 h-4" />, label: "Dashboard", href: "/taskvault", leaves: [{ icon: <Clock className="w-3 h-3" />, label: "Hoje", href: "/taskvault" }, { icon: <Calendar className="w-3 h-3" />, label: "Semana", href: "/taskvault" }] },
          { icon: <Calendar className="w-4 h-4" />, label: "Timeline", href: "/taskvault" },
          { icon: <Target className="w-4 h-4" />, label: "Heatmap", href: "/taskvault" },
        ],
      },
      { icon: <BarChart3 className="w-5 h-5" />, label: "Relatórios", description: "Análises", href: "/taskvault",
        subActions: [{ icon: <TrendingUp className="w-4 h-4" />, label: "Por Status", href: "/taskvault" }, { icon: <Calendar className="w-4 h-4" />, label: "Por Período", href: "/taskvault" }],
      },
    ],
  },
  {
    id: "gestao", icon: <DollarSign className="w-8 h-8" />, title: "GESTÃO", tagline: "ERP + Financeiro",
    accentHsl: "210 100% 55%", module: "gestao", href: "/gestao",
    restPosition: { x: 50, y: 50 },
    actions: [
      { icon: <Wallet className="w-5 h-5" />, label: "Financeiro", description: "Contas e fluxo", href: "/gestao",
        subActions: [
          { icon: <Receipt className="w-4 h-4" />, label: "Transações", href: "/gestao", leaves: [{ icon: <Plus className="w-3 h-3" />, label: "Nova", href: "/gestao" }, { icon: <Filter className="w-3 h-3" />, label: "Filtrar", href: "/gestao" }, { icon: <Download className="w-3 h-3" />, label: "Exportar", href: "/gestao" }] },
          { icon: <Landmark className="w-4 h-4" />, label: "Contas", href: "/gestao", leaves: [{ icon: <Plus className="w-3 h-3" />, label: "Nova Conta", href: "/gestao" }, { icon: <Upload className="w-3 h-3" />, label: "Importar", href: "/gestao" }] },
          { icon: <Tags className="w-4 h-4" />, label: "Categorias", href: "/gestao" },
          { icon: <CreditCard className="w-4 h-4" />, label: "Parcelas", href: "/gestao", leaves: [{ icon: <Clock className="w-3 h-3" />, label: "Vencendo", href: "/gestao" }, { icon: <Star className="w-3 h-3" />, label: "Atrasadas", href: "/gestao" }] },
          { icon: <Repeat className="w-4 h-4" />, label: "Recorrências", href: "/gestao" },
        ],
      },
      { icon: <Users className="w-5 h-5" />, label: "Clientes", description: "Cadastro", href: "/gestao",
        subActions: [{ icon: <UserPlus className="w-4 h-4" />, label: "Cadastrar", href: "/gestao" }, { icon: <Search className="w-4 h-4" />, label: "Buscar", href: "/gestao" }],
      },
      { icon: <Package className="w-5 h-5" />, label: "Produtos", description: "Estoque", href: "/gestao",
        subActions: [{ icon: <Plus className="w-4 h-4" />, label: "Novo", href: "/gestao" }, { icon: <Box className="w-4 h-4" />, label: "Estoque", href: "/gestao", leaves: [{ icon: <ArrowUpDown className="w-3 h-3" />, label: "Movimentar", href: "/gestao" }, { icon: <Hash className="w-3 h-3" />, label: "Inventário", href: "/gestao" }] }],
      },
      { icon: <ShoppingCart className="w-5 h-5" />, label: "Vendas", description: "Pedidos", href: "/gestao",
        subActions: [{ icon: <Plus className="w-4 h-4" />, label: "Nova Venda", href: "/gestao" }, { icon: <ClipboardList className="w-4 h-4" />, label: "Orçamentos", href: "/gestao" }],
      },
      { icon: <FileText className="w-5 h-5" />, label: "Compras", description: "Fornecedores", href: "/gestao",
        subActions: [{ icon: <Plus className="w-4 h-4" />, label: "Nova Compra", href: "/gestao" }, { icon: <Truck className="w-4 h-4" />, label: "Fornecedores", href: "/gestao" }],
      },
      { icon: <PieChart className="w-5 h-5" />, label: "Relatórios", description: "Análises", href: "/gestao",
        subActions: [{ icon: <BarChart className="w-4 h-4" />, label: "Fluxo Caixa", href: "/gestao" }, { icon: <TrendingUp className="w-4 h-4" />, label: "DRE", href: "/gestao" }],
      },
    ],
  },
  {
    id: "messenger", icon: <MessageCircle className="w-8 h-8" />, title: "MESSENGER", tagline: "Comunicação",
    accentHsl: "25 100% 55%", module: "messenger", href: "/messenger",
    restPosition: { x: 80, y: 50 },
    actions: [
      { icon: <Send className="w-5 h-5" />, label: "Conversas", description: "Chat", href: "/messenger",
        subActions: [
          { icon: <MessageSquare className="w-4 h-4" />, label: "Nova", href: "/messenger", leaves: [{ icon: <UserCheck className="w-3 h-3" />, label: "Individual", href: "/messenger" }, { icon: <Users className="w-3 h-3" />, label: "Grupo", href: "/messenger" }] },
          { icon: <History className="w-4 h-4" />, label: "Histórico", href: "/messenger" },
          { icon: <Star className="w-4 h-4" />, label: "Favoritas", href: "/messenger" },
        ],
      },
      { icon: <BookOpen className="w-5 h-5" />, label: "Contatos", description: "Lista e grupos", href: "/messenger",
        subActions: [{ icon: <UserCheck className="w-4 h-4" />, label: "Lista", href: "/messenger" }, { icon: <FolderPlus className="w-4 h-4" />, label: "Grupos", href: "/messenger" }],
      },
      { icon: <Bot className="w-5 h-5" />, label: "Templates", description: "Mensagens rápidas", href: "/messenger",
        subActions: [{ icon: <Plus className="w-4 h-4" />, label: "Criar", href: "/messenger" }, { icon: <Edit className="w-4 h-4" />, label: "Gerenciar", href: "/messenger" }],
      },
    ],
  },
];

// ── Orbit helper: distributes N items in a 360° circle ──
function orbit(count: number, radius: number, offsetDeg = -90) {
  const step = 360 / count;
  return Array.from({ length: count }, (_, i) => {
    const deg = offsetDeg + step * i;
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius, deg };
  });
}

// ── Radii per level (distance from PARENT, not from center) ──
const R1 = 180; // actions from module
const R2 = 110; // sub-actions from action
const R3 = 80;  // leaves from sub-action

const Index = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, hasModuleAccessFlexible } = useModulePermissions();
  const { empresaAtiva } = useEmpresaAtiva();
  const [focusedModule, setFocusedModule] = useState<string | null>(null);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  const closeFocus = useCallback(() => { setFocusedModule(null); setExpandedAction(null); setExpandedSub(null); }, []);
  const openModule = useCallback((id: string) => { setFocusedModule(id); setExpandedAction(null); setExpandedSub(null); }, []);
  const toggleAction = useCallback((k: string) => { setExpandedAction(p => p === k ? null : k); setExpandedSub(null); }, []);
  const toggleSub = useCallback((k: string) => { setExpandedSub(p => p === k ? null : k); }, []);

  const focusedMod = focusedModule ? modules.find(m => m.id === focusedModule) : null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <GradientMesh />

      {/* Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.012]" style={{ backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

      {/* Top bar */}
      <motion.div className="fixed top-0 left-0 right-0 z-50 px-4 py-3" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-border/30">
              <Zap className="w-5 h-5 text-primary fill-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">VAULT<span className="text-primary">CORP</span></h1>
              <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase">Command Center</p>
            </div>
          </motion.div>
          {empresaAtiva && (
            <motion.div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/30 bg-card/40 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{empresaAtiva.nome}</span>
            </motion.div>
          )}
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 h-8">
                <Settings className="w-3.5 h-3.5" /> Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 h-8">
              <LogOut className="w-3.5 h-3.5" /> Sair
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ══════════════ MODULE CARDS (resting state) ══════════════ */}
      <div className="relative z-10 w-full h-screen flex items-center justify-center">
        {/* Inter-module lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {!focusedModule && modules.map((m, i) =>
            modules.slice(i + 1).map(o => (
              <line key={`${m.id}-${o.id}`} x1={`${m.restPosition.x}%`} y1={`${m.restPosition.y}%`} x2={`${o.restPosition.x}%`} y2={`${o.restPosition.y}%`} stroke="hsl(var(--border))" strokeWidth={0.5} strokeOpacity={0.15} strokeDasharray="6 6" />
            ))
          )}
        </svg>

        {modules.map((mod, mIdx) => {
          const hasAccess = hasModuleAccessFlexible(mod.module, empresaAtiva?.id);
          const accent = `hsl(${mod.accentHsl})`;
          const isFocused = focusedModule === mod.id;
          const isHidden = focusedModule !== null && !isFocused;
          const MOD = 140;

          return (
            <motion.div
              key={mod.id}
              className="absolute"
              style={{ zIndex: isFocused ? 30 : 5 }}
              animate={{
                left: isFocused ? "50%" : `${mod.restPosition.x}%`,
                top: isFocused ? "50%" : `${mod.restPosition.y}%`,
                opacity: isHidden ? 0.15 : 1,
                scale: isHidden ? 0.7 : 1,
              }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            >
              <div style={{ transform: "translate(-50%, -50%)", position: "relative" }}>
                {/* Orbit guide rings (visible when focused) */}
                {isFocused && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none">
                    <div className="absolute rounded-full border border-dashed" style={{ width: R1 * 2, height: R1 * 2, left: MOD / 2 - R1, top: MOD / 2 - R1, borderColor: `${accent}15` }} />
                  </motion.div>
                )}

                {/* Glow */}
                <div className="absolute pointer-events-none" style={{ width: 500, height: 500, left: MOD / 2 - 250, top: MOD / 2 - 250, background: `radial-gradient(circle, ${accent}${isFocused ? "12" : "06"} 0%, transparent 60%)`, filter: "blur(40px)" }} />

                {/* Module button */}
                <motion.button
                  onClick={(e) => { e.stopPropagation(); if (!hasAccess) return; isFocused ? closeFocus() : openModule(mod.id); }}
                  disabled={!hasAccess}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 transition-colors duration-300 ${hasAccess ? "cursor-pointer" : "cursor-not-allowed opacity-30 grayscale"}`}
                  style={{
                    width: MOD, height: MOD,
                    backgroundColor: isFocused ? "hsl(0 0% 8% / 0.98)" : "hsl(0 0% 6% / 0.97)",
                    borderColor: isFocused ? `${accent}90` : `${accent}50`,
                    boxShadow: isFocused ? `0 0 80px ${accent}30, inset 0 0 30px hsl(0 0% 100% / 0.04)` : `0 0 20px ${accent}10`,
                    backdropFilter: "blur(24px)",
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + mIdx * 0.15, type: "spring", stiffness: 180, damping: 18 }}
                  whileHover={hasAccess && !isFocused ? { scale: 1.06, boxShadow: `0 0 50px ${accent}30` } : {}}
                >
                  {isFocused && <motion.div className="absolute -inset-2 rounded-2xl pointer-events-none" style={{ border: `1px solid ${accent}30` }} animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }} />}
                  <div style={{ color: hasAccess ? accent : undefined }}>{hasAccess ? mod.icon : <Lock className="w-7 h-7" />}</div>
                  <span className="text-sm font-bold tracking-wider" style={{ color: accent }}>{mod.title}</span>
                  <span className="text-[10px] text-foreground/70 leading-tight text-center px-2">{mod.tagline}</span>
                </motion.button>

                {/* Close button */}
                {isFocused && (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); closeFocus(); }}
                    className="absolute -top-3 -right-3 w-7 h-7 rounded-full border flex items-center justify-center z-40"
                    style={{ backgroundColor: "hsl(0 0% 6% / 0.95)", borderColor: `${accent}50`, color: accent }}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                )}

                {/* "Acessar" button */}
                {isFocused && (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); navigate(mod.href); }}
                    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full border backdrop-blur-xl hover:scale-105 transition-transform z-40"
                    style={{ top: MOD + 12, backgroundColor: "hsl(0 0% 6% / 0.95)", borderColor: `${accent}50`, color: accent }}
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="text-xs font-bold whitespace-nowrap">Acessar {mod.title}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </motion.button>
                )}

                {/* ═══ LEVEL 2: ACTIONS (orbit around module) ═══ */}
                <AnimatePresence>
                  {isFocused && hasAccess && (() => {
                    const actionPositions = orbit(mod.actions.length, R1);
                    return mod.actions.map((action, aIdx) => {
                      const aPos = actionPositions[aIdx];
                      const aKey = `${mod.id}-${action.label}`;
                      const aExp = expandedAction === aKey;
                      const hasSubs = action.subActions && action.subActions.length > 0;
                      const A = 72;

                      return (
                        <motion.div
                          key={action.label}
                          className="absolute z-20"
                          style={{ top: MOD / 2, left: MOD / 2 }}
                          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                          animate={{ x: aPos.x - A / 2, y: aPos.y - A / 2, scale: 1, opacity: 1 }}
                          exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                          transition={{ delay: aIdx * 0.06, type: "spring", stiffness: 200, damping: 18 }}
                        >
                          {/* Line: module → action */}
                          <svg className="absolute pointer-events-none" style={{ top: A / 2, left: A / 2, width: 1, height: 1, overflow: "visible" }}>
                            <line x1={0} y1={0} x2={-aPos.x} y2={-aPos.y} stroke={accent} strokeWidth={1.2} strokeOpacity={0.3} />
                          </svg>

                          <motion.button
                            onClick={(e) => { e.stopPropagation(); hasSubs ? toggleAction(aKey) : navigate(action.href); }}
                            className="rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 group/action relative"
                            style={{
                              width: A, height: A,
                              backgroundColor: aExp ? `${accent}20` : "hsl(0 0% 5% / 0.97)",
                              borderColor: aExp ? `${accent}90` : `${accent}55`,
                              color: accent,
                            }}
                            whileHover={{ scale: 1.1, boxShadow: `0 0 25px ${accent}30` }}
                            whileTap={{ scale: 0.92 }}
                          >
                            {aExp && <motion.div className="absolute -inset-1 rounded-xl pointer-events-none" style={{ border: `1px solid ${accent}35` }} animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }} />}
                            {action.icon}
                            <span className="text-[10px] font-bold tracking-wide" style={{ color: accent }}>{action.label}</span>
                            {hasSubs && (
                              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
                                <span className="text-[8px] font-bold text-black">{action.subActions!.length}</span>
                              </div>
                            )}
                            <div className="absolute whitespace-nowrap px-2 py-1 rounded-lg pointer-events-none opacity-0 group-hover/action:opacity-100 transition-opacity duration-200 -top-9 z-30" style={{ backgroundColor: "hsl(0 0% 5% / 0.97)", border: `1px solid ${accent}30` }}>
                              <span className="text-[10px] font-bold" style={{ color: accent }}>{action.description}</span>
                            </div>
                          </motion.button>

                          {/* ═══ LEVEL 3: SUB-ACTIONS (orbit around THIS action) ═══ */}
                          <AnimatePresence>
                            {aExp && hasSubs && (() => {
                              const subPositions = orbit(action.subActions!.length, R2, aPos.deg - 60);
                              return action.subActions!.map((sub, sIdx) => {
                                const sPos = subPositions[sIdx];
                                const sKey = `${aKey}-${sub.label}`;
                                const sExp = expandedSub === sKey;
                                const hasLeaves = sub.leaves && sub.leaves.length > 0;
                                const S = 56;

                                return (
                                  <motion.div
                                    key={sub.label}
                                    className="absolute z-30"
                                    style={{ top: A / 2, left: A / 2 }}
                                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                    animate={{ x: sPos.x - S / 2, y: sPos.y - S / 2, scale: 1, opacity: 1 }}
                                    exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                    transition={{ delay: sIdx * 0.04, type: "spring", stiffness: 240, damping: 20 }}
                                  >
                                    {/* Line: action → sub */}
                                    <svg className="absolute pointer-events-none" style={{ top: S / 2, left: S / 2, width: 1, height: 1, overflow: "visible" }}>
                                      <line x1={0} y1={0} x2={-sPos.x} y2={-sPos.y} stroke={accent} strokeWidth={0.8} strokeOpacity={0.25} strokeDasharray="3 3" />
                                    </svg>

                                    <motion.button
                                      onClick={(e) => { e.stopPropagation(); hasLeaves ? toggleSub(sKey) : navigate(sub.href); }}
                                      className="rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative"
                                      style={{
                                        width: S, height: S,
                                        backgroundColor: sExp ? `${accent}20` : "hsl(0 0% 4% / 0.97)",
                                        borderColor: sExp ? `${accent}70` : `${accent}40`,
                                        color: accent,
                                      }}
                                      whileHover={{ scale: 1.12, boxShadow: `0 0 18px ${accent}30` }}
                                      whileTap={{ scale: 0.88 }}
                                    >
                                      {sExp && <motion.div className="absolute -inset-0.5 rounded-lg pointer-events-none" style={{ border: `1px solid ${accent}30` }} animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} />}
                                      {sub.icon}
                                      <span className="text-[8px] font-bold tracking-wide leading-none" style={{ color: accent }}>{sub.label}</span>
                                      {hasLeaves && (
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
                                          <span className="text-[7px] font-bold text-black">{sub.leaves!.length}</span>
                                        </div>
                                      )}
                                    </motion.button>

                                    {/* ═══ LEVEL 4: LEAVES (orbit around THIS sub-action) ═══ */}
                                    <AnimatePresence>
                                      {sExp && hasLeaves && (() => {
                                        const leafPositions = orbit(sub.leaves!.length, R3, sPos.deg - 45);
                                        return sub.leaves!.map((leaf, lIdx) => {
                                          const lPos = leafPositions[lIdx];
                                          const L = 44;
                                          return (
                                            <motion.div
                                              key={leaf.label}
                                              className="absolute z-40"
                                              style={{ top: S / 2, left: S / 2 }}
                                              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                              animate={{ x: lPos.x - L / 2, y: lPos.y - L / 2, scale: 1, opacity: 1 }}
                                              exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                              transition={{ delay: lIdx * 0.03, type: "spring", stiffness: 280, damping: 22 }}
                                            >
                                              <svg className="absolute pointer-events-none" style={{ top: L / 2, left: L / 2, width: 1, height: 1, overflow: "visible" }}>
                                                <line x1={0} y1={0} x2={-lPos.x} y2={-lPos.y} stroke={accent} strokeWidth={0.6} strokeOpacity={0.2} strokeDasharray="2 2" />
                                              </svg>
                                              <motion.button
                                                onClick={(e) => { e.stopPropagation(); navigate(leaf.href); }}
                                                className="rounded-md border flex flex-col items-center justify-center gap-0 transition-all duration-200 group/leaf relative"
                                                style={{
                                                  width: L, height: L,
                                                  backgroundColor: "hsl(0 0% 3% / 0.97)",
                                                  borderColor: `${accent}35`,
                                                  color: accent,
                                                }}
                                                whileHover={{ scale: 1.15, backgroundColor: `${accent}30`, boxShadow: `0 0 15px ${accent}30` }}
                                                whileTap={{ scale: 0.88 }}
                                              >
                                                {leaf.icon}
                                                <span className="text-[7px] font-bold leading-none mt-0.5" style={{ color: accent }}>{leaf.label}</span>
                                                <div className="absolute whitespace-nowrap px-1.5 py-0.5 rounded pointer-events-none opacity-0 group-hover/leaf:opacity-100 transition-opacity duration-200 -top-6 z-50" style={{ backgroundColor: "hsl(0 0% 4% / 0.97)", border: `1px solid ${accent}25` }}>
                                                  <span className="text-[9px] font-semibold" style={{ color: accent }}>{leaf.label}</span>
                                                </div>
                                              </motion.button>
                                            </motion.div>
                                          );
                                        });
                                      })()}
                                    </AnimatePresence>
                                  </motion.div>
                                );
                              });
                            })()}
                          </AnimatePresence>
                        </motion.div>
                      );
                    });
                  })()}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Backdrop overlay when focused */}
      <AnimatePresence>
        {focusedModule && (
          <motion.div
            className="fixed inset-0 z-[4]"
            style={{ backgroundColor: "hsl(0 0% 0% / 0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeFocus}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-[5]" />
    </div>
  );
};

export default Index;
