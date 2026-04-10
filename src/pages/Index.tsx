import { useState, useCallback, useMemo } from "react";
import {
  CheckSquare, MessageCircle, DollarSign, Settings, LogOut, Zap,
  ListTodo, Building2, Eye, BarChart3, Users, Package, ShoppingCart,
  Wallet, FileText, PieChart, Send, BookOpen, Bot,
  ChevronRight, Lock, Layers, Plus, List, Calendar,
  TrendingUp, Target, CreditCard, Tags, Landmark,
  UserPlus, Search, Box, ClipboardList, Truck,
  Receipt, BarChart, MessageSquare, History, UserCheck, FolderPlus, Edit,
  ArrowUpDown, Filter, Download, Upload, Star, Clock, Repeat, Hash, X, ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GradientMesh } from "@/components/GradientMesh";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions, AppModule } from "@/hooks/useModulePermissions";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──
interface WheelItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  accentHsl?: string;
  children?: WheelItem[];
}

interface HudModule {
  id: string;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  accentHsl: string;
  module: AppModule;
  href: string;
  items: WheelItem[];
}

// ── Data ──
const modules: HudModule[] = [
  {
    id: "taskvault", icon: <CheckSquare className="w-7 h-7" />, title: "TASKVAULT", tagline: "Gestão de tarefas",
    accentHsl: "0 85% 55%", module: "taskvault", href: "/taskvault",
    items: [
      { icon: <ListTodo className="w-5 h-5" />, label: "Tarefas", href: "/taskvault", children: [
        { icon: <Layers className="w-4 h-4" />, label: "Kanban", href: "/taskvault", children: [
          { icon: <Filter className="w-3 h-3" />, label: "Filtrar", href: "/taskvault" },
          { icon: <ArrowUpDown className="w-3 h-3" />, label: "Ordenar", href: "/taskvault" },
        ]},
        { icon: <List className="w-4 h-4" />, label: "Lista", href: "/taskvault", children: [
          { icon: <Filter className="w-3 h-3" />, label: "Filtrar", href: "/taskvault" },
          { icon: <Download className="w-3 h-3" />, label: "Exportar", href: "/taskvault" },
        ]},
        { icon: <Plus className="w-4 h-4" />, label: "Criar", href: "/taskvault" },
      ]},
      { icon: <Building2 className="w-5 h-5" />, label: "Empresas", href: "/taskvault", children: [
        { icon: <Plus className="w-4 h-4" />, label: "Cadastrar", href: "/taskvault" },
        { icon: <List className="w-4 h-4" />, label: "Listar", href: "/taskvault" },
      ]},
      { icon: <Eye className="w-5 h-5" />, label: "Visão Geral", href: "/taskvault", children: [
        { icon: <BarChart3 className="w-4 h-4" />, label: "Dashboard", href: "/taskvault", children: [
          { icon: <Clock className="w-3 h-3" />, label: "Hoje", href: "/taskvault" },
          { icon: <Calendar className="w-3 h-3" />, label: "Semana", href: "/taskvault" },
        ]},
        { icon: <Calendar className="w-4 h-4" />, label: "Timeline", href: "/taskvault" },
        { icon: <Target className="w-4 h-4" />, label: "Heatmap", href: "/taskvault" },
      ]},
      { icon: <BarChart3 className="w-5 h-5" />, label: "Relatórios", href: "/taskvault", children: [
        { icon: <TrendingUp className="w-4 h-4" />, label: "Por Status", href: "/taskvault" },
        { icon: <Calendar className="w-4 h-4" />, label: "Por Período", href: "/taskvault" },
      ]},
    ],
  },
  {
    id: "gestao", icon: <DollarSign className="w-7 h-7" />, title: "GESTÃO", tagline: "ERP + Financeiro",
    accentHsl: "210 100% 55%", module: "gestao", href: "/gestao",
    items: [
      { icon: <Wallet className="w-5 h-5" />, label: "Financeiro", href: "/gestao", children: [
        { icon: <Receipt className="w-4 h-4" />, label: "Transações", href: "/gestao", children: [
          { icon: <Plus className="w-3 h-3" />, label: "Nova", href: "/gestao" },
          { icon: <Filter className="w-3 h-3" />, label: "Filtrar", href: "/gestao" },
          { icon: <Download className="w-3 h-3" />, label: "Exportar", href: "/gestao" },
        ]},
        { icon: <Landmark className="w-4 h-4" />, label: "Contas", href: "/gestao", children: [
          { icon: <Plus className="w-3 h-3" />, label: "Nova Conta", href: "/gestao" },
          { icon: <Upload className="w-3 h-3" />, label: "Importar", href: "/gestao" },
        ]},
        { icon: <Tags className="w-4 h-4" />, label: "Categorias", href: "/gestao" },
        { icon: <CreditCard className="w-4 h-4" />, label: "Parcelas", href: "/gestao", children: [
          { icon: <Clock className="w-3 h-3" />, label: "Vencendo", href: "/gestao" },
          { icon: <Star className="w-3 h-3" />, label: "Atrasadas", href: "/gestao" },
        ]},
        { icon: <Repeat className="w-4 h-4" />, label: "Recorrências", href: "/gestao" },
      ]},
      { icon: <Users className="w-5 h-5" />, label: "Clientes", href: "/gestao", children: [
        { icon: <UserPlus className="w-4 h-4" />, label: "Cadastrar", href: "/gestao" },
        { icon: <Search className="w-4 h-4" />, label: "Buscar", href: "/gestao" },
      ]},
      { icon: <Package className="w-5 h-5" />, label: "Produtos", href: "/gestao", children: [
        { icon: <Plus className="w-4 h-4" />, label: "Novo", href: "/gestao" },
        { icon: <Box className="w-4 h-4" />, label: "Estoque", href: "/gestao", children: [
          { icon: <ArrowUpDown className="w-3 h-3" />, label: "Movimentar", href: "/gestao" },
          { icon: <Hash className="w-3 h-3" />, label: "Inventário", href: "/gestao" },
        ]},
      ]},
      { icon: <ShoppingCart className="w-5 h-5" />, label: "Vendas", href: "/gestao", children: [
        { icon: <Plus className="w-4 h-4" />, label: "Nova Venda", href: "/gestao" },
        { icon: <ClipboardList className="w-4 h-4" />, label: "Orçamentos", href: "/gestao" },
      ]},
      { icon: <FileText className="w-5 h-5" />, label: "Compras", href: "/gestao", children: [
        { icon: <Plus className="w-4 h-4" />, label: "Nova Compra", href: "/gestao" },
        { icon: <Truck className="w-4 h-4" />, label: "Fornecedores", href: "/gestao" },
      ]},
      { icon: <PieChart className="w-5 h-5" />, label: "Relatórios", href: "/gestao", children: [
        { icon: <BarChart className="w-4 h-4" />, label: "Fluxo Caixa", href: "/gestao" },
        { icon: <TrendingUp className="w-4 h-4" />, label: "DRE", href: "/gestao" },
      ]},
    ],
  },
  {
    id: "messenger", icon: <MessageCircle className="w-7 h-7" />, title: "MESSENGER", tagline: "Comunicação",
    accentHsl: "25 100% 55%", module: "messenger", href: "/messenger",
    items: [
      { icon: <Send className="w-5 h-5" />, label: "Conversas", href: "/messenger", children: [
        { icon: <MessageSquare className="w-4 h-4" />, label: "Nova", href: "/messenger", children: [
          { icon: <UserCheck className="w-3 h-3" />, label: "Individual", href: "/messenger" },
          { icon: <Users className="w-3 h-3" />, label: "Grupo", href: "/messenger" },
        ]},
        { icon: <History className="w-4 h-4" />, label: "Histórico", href: "/messenger" },
        { icon: <Star className="w-4 h-4" />, label: "Favoritas", href: "/messenger" },
      ]},
      { icon: <BookOpen className="w-5 h-5" />, label: "Contatos", href: "/messenger", children: [
        { icon: <UserCheck className="w-4 h-4" />, label: "Lista", href: "/messenger" },
        { icon: <FolderPlus className="w-4 h-4" />, label: "Grupos", href: "/messenger" },
      ]},
      { icon: <Bot className="w-5 h-5" />, label: "Templates", href: "/messenger", children: [
        { icon: <Plus className="w-4 h-4" />, label: "Criar", href: "/messenger" },
        { icon: <Edit className="w-4 h-4" />, label: "Gerenciar", href: "/messenger" },
      ]},
    ],
  },
];

// ── SVG Segment for the wheel ──
function WheelSegment({
  index, total, innerR, outerR, isSelected, isHovered, accent, icon, label,
  onSelect, onHover, onLeave,
}: {
  index: number; total: number; innerR: number; outerR: number;
  isSelected: boolean; isHovered: boolean; accent: string;
  icon: React.ReactNode; label: string;
  onSelect: () => void; onHover: () => void; onLeave: () => void;
}) {
  const gap = 0.02; // radians gap between segments
  const anglePerItem = (2 * Math.PI) / total;
  const startAngle = anglePerItem * index - Math.PI / 2 + gap / 2;
  const endAngle = startAngle + anglePerItem - gap;

  const midAngle = (startAngle + endAngle) / 2;
  const iconR = (innerR + outerR) / 2;
  const iconX = Math.cos(midAngle) * iconR;
  const iconY = Math.sin(midAngle) * iconR;
  const labelR = iconR + 2;

  // Arc path
  const x1 = Math.cos(startAngle) * innerR;
  const y1 = Math.sin(startAngle) * innerR;
  const x2 = Math.cos(startAngle) * outerR;
  const y2 = Math.sin(startAngle) * outerR;
  const x3 = Math.cos(endAngle) * outerR;
  const y3 = Math.sin(endAngle) * outerR;
  const x4 = Math.cos(endAngle) * innerR;
  const y4 = Math.sin(endAngle) * innerR;
  const largeArc = anglePerItem - gap > Math.PI ? 1 : 0;

  const d = [
    `M ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x3} ${y3}`,
    `L ${x4} ${y4}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1} ${y1}`,
    "Z",
  ].join(" ");

  const fillOpacity = isSelected ? 0.35 : isHovered ? 0.2 : 0.08;
  const strokeOpacity = isSelected ? 0.9 : isHovered ? 0.6 : 0.25;

  return (
    <g className="cursor-pointer" onClick={onSelect} onMouseEnter={onHover} onMouseLeave={onLeave}>
      <motion.path
        d={d}
        fill={accent}
        stroke={accent}
        strokeWidth={isSelected ? 2.5 : 1.5}
        initial={{ fillOpacity: 0, strokeOpacity: 0 }}
        animate={{ fillOpacity, strokeOpacity }}
        transition={{ duration: 0.25 }}
      />
      {/* Icon */}
      <foreignObject
        x={iconX - 16} y={iconY - 20} width={32} height={28}
        className="pointer-events-none"
      >
        <div className="w-full h-full flex items-center justify-center" style={{ color: isSelected || isHovered ? accent : `${accent}` }}>
          {icon}
        </div>
      </foreignObject>
      {/* Label */}
      <text
        x={iconX} y={iconY + 16}
        textAnchor="middle"
        className="pointer-events-none select-none"
        style={{
          fill: isSelected ? accent : `${accent}cc`,
          fontSize: isSelected ? "9px" : "8px",
          fontWeight: isSelected ? 700 : 600,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </text>
      {/* Selected glow */}
      {isSelected && (
        <motion.path
          d={d}
          fill="none"
          stroke={accent}
          strokeWidth={1}
          initial={{ strokeOpacity: 0 }}
          animate={{ strokeOpacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ filter: `drop-shadow(0 0 8px ${accent})` }}
        />
      )}
    </g>
  );
}

// ── Main Weapon Wheel component ──
function WeaponWheel({
  items, accent, onSelect, selectedIndex, onBack, depth,
}: {
  items: WheelItem[];
  accent: string;
  onSelect: (index: number) => void;
  selectedIndex: number | null;
  onBack?: () => void;
  depth: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Scale wheel based on depth
  const sizes = [
    { inner: 80, outer: 180 },  // depth 0: modules
    { inner: 70, outer: 165 },  // depth 1: actions
    { inner: 60, outer: 145 },  // depth 2: sub-actions
    { inner: 50, outer: 125 },  // depth 3: leaves
  ];
  const { inner, outer } = sizes[Math.min(depth, 3)];
  const svgSize = (outer + 30) * 2;

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
    >
      <svg
        width={svgSize} height={svgSize}
        viewBox={`${-svgSize / 2} ${-svgSize / 2} ${svgSize} ${svgSize}`}
        className="drop-shadow-2xl"
      >
        {/* Background ring glow */}
        <defs>
          <radialGradient id={`wheel-glow-${depth}`}>
            <stop offset="0%" stopColor={accent} stopOpacity="0.05" />
            <stop offset="60%" stopColor={accent} stopOpacity="0.02" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={0} cy={0} r={outer + 20} fill={`url(#wheel-glow-${depth})`} />

        {/* Inner ring border */}
        <circle cx={0} cy={0} r={inner} fill="none" stroke={accent} strokeWidth={0.5} strokeOpacity={0.15} />
        {/* Outer ring border */}
        <circle cx={0} cy={0} r={outer} fill="none" stroke={accent} strokeWidth={0.5} strokeOpacity={0.15} />

        {/* Segments */}
        {items.map((item, i) => (
          <WheelSegment
            key={`${item.label}-${i}`}
            index={i}
            total={items.length}
            innerR={inner}
            outerR={outer}
            isSelected={selectedIndex === i}
            isHovered={hoveredIndex === i}
            accent={accent}
            icon={item.icon}
            label={item.label}
            onSelect={() => onSelect(i)}
            onHover={() => setHoveredIndex(i)}
            onLeave={() => setHoveredIndex(null)}
          />
        ))}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-1">
          {onBack && (
            <motion.button
              className="pointer-events-auto w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-xl transition-colors hover:bg-foreground/10"
              style={{ borderColor: `${accent}40`, color: accent }}
              onClick={onBack}
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          )}
          {selectedIndex !== null && items[selectedIndex]?.children && (
            <motion.div
              className="pointer-events-none mt-1"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border" style={{ color: accent, borderColor: `${accent}30`, background: `${accent}10` }}>
                {items[selectedIndex].children!.length} opções
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──
const Index = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, hasModuleAccessFlexible } = useModulePermissions();
  const { empresaAtiva } = useEmpresaAtiva();

  // Navigation stack: each entry is { items, selectedIndex, accentHsl, title }
  type NavLevel = { items: WheelItem[]; selected: number | null; title: string };
  const [activeModule, setActiveModule] = useState<HudModule | null>(null);
  const [navStack, setNavStack] = useState<NavLevel[]>([]);

  const accent = activeModule ? `hsl(${activeModule.accentHsl})` : "hsl(var(--primary))";

  const openModule = useCallback((mod: HudModule) => {
    setActiveModule(mod);
    setNavStack([{ items: mod.items, selected: null, title: mod.title }]);
  }, []);

  const closeWheel = useCallback(() => {
    setActiveModule(null);
    setNavStack([]);
  }, []);

  const goBack = useCallback(() => {
    if (navStack.length <= 1) {
      closeWheel();
    } else {
      setNavStack(prev => prev.slice(0, -1));
    }
  }, [navStack.length, closeWheel]);

  const selectItem = useCallback((index: number) => {
    setNavStack(prev => {
      const current = prev[prev.length - 1];
      const item = current.items[index];
      if (item.children && item.children.length > 0) {
        // Drill down
        const updated = [...prev];
        updated[updated.length - 1] = { ...current, selected: index };
        return [...updated, { items: item.children, selected: null, title: item.label }];
      } else {
        // Navigate
        navigate(item.href);
        return prev;
      }
    });
  }, [navigate]);

  const currentLevel = navStack.length > 0 ? navStack[navStack.length - 1] : null;

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    if (!activeModule || navStack.length === 0) return [];
    return [activeModule.title, ...navStack.slice(0, -1).map(l => {
      if (l.selected !== null) return l.items[l.selected].label;
      return null;
    }).filter(Boolean)];
  }, [activeModule, navStack]);

  // Module wheel items for the initial ring
  const moduleWheelItems: WheelItem[] = useMemo(() => {
    return modules.map(m => ({
      icon: m.icon,
      label: m.title,
      href: m.href,
      accentHsl: m.accentHsl,
      children: m.items,
    }));
  }, []);

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

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!activeModule ? (
            /* ── Module selection: 3 cards ── */
            <motion.div
              key="module-cards"
              className="flex items-center gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              {modules.map((mod, mIdx) => {
                const hasAccess = hasModuleAccessFlexible(mod.module, empresaAtiva?.id);
                const a = `hsl(${mod.accentHsl})`;
                return (
                  <motion.button
                    key={mod.id}
                    onClick={() => hasAccess && openModule(mod)}
                    disabled={!hasAccess}
                    className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 transition-colors duration-300 ${hasAccess ? "cursor-pointer" : "cursor-not-allowed opacity-30 grayscale"}`}
                    style={{
                      width: 160, height: 160,
                      backgroundColor: "hsl(0 0% 6% / 0.97)",
                      borderColor: `${a}50`,
                      backdropFilter: "blur(24px)",
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 + mIdx * 0.12, type: "spring", stiffness: 180, damping: 18 }}
                    whileHover={hasAccess ? { scale: 1.08, borderColor: `${a}90`, boxShadow: `0 0 60px ${a}25` } : {}}
                    whileTap={hasAccess ? { scale: 0.95 } : {}}
                  >
                    {/* Glow */}
                    <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `radial-gradient(circle at center, ${a}10 0%, transparent 70%)` }} />
                    <div style={{ color: hasAccess ? a : undefined }}>{hasAccess ? mod.icon : <Lock className="w-7 h-7" />}</div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-sm font-bold tracking-wider" style={{ color: a }}>{mod.title}</span>
                      <span className="text-[10px] text-foreground/60">{mod.tagline}</span>
                    </div>
                    {hasAccess && (
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: a }}>
                        <span className="text-[9px] font-bold text-black">{mod.items.length}</span>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            /* ── Weapon Wheel ── */
            <motion.div
              key="weapon-wheel"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Breadcrumb */}
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-xl"
                style={{ borderColor: `${accent}30`, background: `${accent}08` }}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {breadcrumb.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <ChevronRight className="w-3 h-3" style={{ color: `${accent}60` }} />}
                    <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: i === breadcrumb.length - 1 ? accent : `${accent}80` }}>
                      {crumb}
                    </span>
                  </span>
                ))}
              </motion.div>

              {/* The wheel */}
              {currentLevel && (
                <WeaponWheel
                  key={navStack.length}
                  items={currentLevel.items}
                  accent={accent}
                  selectedIndex={currentLevel.selected}
                  onSelect={selectItem}
                  onBack={goBack}
                  depth={navStack.length - 1}
                />
              )}

              {/* Acessar button */}
              <motion.button
                onClick={() => navigate(activeModule.href)}
                className="flex items-center gap-2 px-6 py-3 rounded-full border backdrop-blur-xl hover:scale-105 transition-transform"
                style={{ backgroundColor: "hsl(0 0% 6% / 0.95)", borderColor: `${accent}50`, color: accent }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="text-sm font-bold">Acessar {activeModule.title}</span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Backdrop overlay when wheel is open */}
      <AnimatePresence>
        {activeModule && (
          <motion.div
            className="fixed inset-0 z-[4]"
            style={{ backgroundColor: "hsl(0 0% 0% / 0.6)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeWheel}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-[5]" />
    </div>
  );
};

export default Index;
