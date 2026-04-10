import { useState, useCallback, useMemo } from "react";
import {
  CheckSquare, MessageCircle, DollarSign, Settings, LogOut, Zap,
  ListTodo, Building2, Eye, BarChart3, Users, Package, ShoppingCart,
  Wallet, FileText, PieChart, Send, BookOpen, Bot,
  ChevronRight, Lock, Layers, Plus, List, Calendar,
  TrendingUp, Target, CreditCard, Tags, Landmark,
  UserPlus, Search, Box, ClipboardList, Truck,
  Receipt, BarChart, MessageSquare, History, UserCheck, FolderPlus, Edit,
  ArrowUpDown, Filter, Download, Upload, Star, Clock, Repeat, Hash, ArrowLeft
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
  children?: WheelItem[];
}

interface HudModule {
  id: string; icon: React.ReactNode; title: string; tagline: string;
  accentHsl: string; module: AppModule; href: string;
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
          { icon: <Filter className="w-3.5 h-3.5" />, label: "Filtrar", href: "/taskvault" },
          { icon: <ArrowUpDown className="w-3.5 h-3.5" />, label: "Ordenar", href: "/taskvault" },
        ]},
        { icon: <List className="w-4 h-4" />, label: "Lista", href: "/taskvault", children: [
          { icon: <Filter className="w-3.5 h-3.5" />, label: "Filtrar", href: "/taskvault" },
          { icon: <Download className="w-3.5 h-3.5" />, label: "Exportar", href: "/taskvault" },
        ]},
        { icon: <Plus className="w-4 h-4" />, label: "Criar", href: "/taskvault" },
      ]},
      { icon: <Building2 className="w-5 h-5" />, label: "Empresas", href: "/taskvault", children: [
        { icon: <Plus className="w-4 h-4" />, label: "Cadastrar", href: "/taskvault" },
        { icon: <List className="w-4 h-4" />, label: "Listar", href: "/taskvault" },
      ]},
      { icon: <Eye className="w-5 h-5" />, label: "Visão Geral", href: "/taskvault", children: [
        { icon: <BarChart3 className="w-4 h-4" />, label: "Dashboard", href: "/taskvault", children: [
          { icon: <Clock className="w-3.5 h-3.5" />, label: "Hoje", href: "/taskvault" },
          { icon: <Calendar className="w-3.5 h-3.5" />, label: "Semana", href: "/taskvault" },
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
          { icon: <Plus className="w-3.5 h-3.5" />, label: "Nova", href: "/gestao" },
          { icon: <Filter className="w-3.5 h-3.5" />, label: "Filtrar", href: "/gestao" },
          { icon: <Download className="w-3.5 h-3.5" />, label: "Exportar", href: "/gestao" },
        ]},
        { icon: <Landmark className="w-4 h-4" />, label: "Contas", href: "/gestao", children: [
          { icon: <Plus className="w-3.5 h-3.5" />, label: "Nova Conta", href: "/gestao" },
          { icon: <Upload className="w-3.5 h-3.5" />, label: "Importar", href: "/gestao" },
        ]},
        { icon: <Tags className="w-4 h-4" />, label: "Categorias", href: "/gestao" },
        { icon: <CreditCard className="w-4 h-4" />, label: "Parcelas", href: "/gestao", children: [
          { icon: <Clock className="w-3.5 h-3.5" />, label: "Vencendo", href: "/gestao" },
          { icon: <Star className="w-3.5 h-3.5" />, label: "Atrasadas", href: "/gestao" },
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
          { icon: <ArrowUpDown className="w-3.5 h-3.5" />, label: "Movimentar", href: "/gestao" },
          { icon: <Hash className="w-3.5 h-3.5" />, label: "Inventário", href: "/gestao" },
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
          { icon: <UserCheck className="w-3.5 h-3.5" />, label: "Individual", href: "/messenger" },
          { icon: <Users className="w-3.5 h-3.5" />, label: "Grupo", href: "/messenger" },
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

// ── Ring radii ──
const RING_INNER = [85, 195, 290, 370];
const RING_OUTER = [180, 275, 360, 430];

// ── Arc path builder ──
function arcPath(startAngle: number, endAngle: number, innerR: number, outerR: number) {
  const x1 = Math.cos(startAngle) * innerR;
  const y1 = Math.sin(startAngle) * innerR;
  const x2 = Math.cos(startAngle) * outerR;
  const y2 = Math.sin(startAngle) * outerR;
  const x3 = Math.cos(endAngle) * outerR;
  const y3 = Math.sin(endAngle) * outerR;
  const x4 = Math.cos(endAngle) * innerR;
  const y4 = Math.sin(endAngle) * innerR;
  const span = endAngle - startAngle;
  const largeArc = span > Math.PI ? 1 : 0;
  return [
    `M ${x1} ${y1}`, `L ${x2} ${y2}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x3} ${y3}`,
    `L ${x4} ${y4}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1} ${y1}`, "Z",
  ].join(" ");
}

// ── SVG Segment ──
function WheelSegment({
  startAngle, endAngle, innerR, outerR, isSelected, isHovered, accent, icon, label,
  hasChildren, onSelect, onHover, onLeave, depth,
}: {
  startAngle: number; endAngle: number; innerR: number; outerR: number;
  isSelected: boolean; isHovered: boolean; accent: string;
  icon: React.ReactNode; label: string; hasChildren: boolean;
  onSelect: () => void; onHover: () => void; onLeave: () => void;
  depth: number;
}) {
  const midAngle = (startAngle + endAngle) / 2;
  const iconR = (innerR + outerR) / 2;
  const iconX = Math.cos(midAngle) * iconR;
  const iconY = Math.sin(midAngle) * iconR;

  const d = arcPath(startAngle, endAngle, innerR, outerR);

  const baseOpacities = [0.12, 0.09, 0.07, 0.05];
  const baseFill = baseOpacities[Math.min(depth, 3)];
  const fillOpacity = isSelected ? 0.45 : isHovered ? 0.28 : baseFill;
  const strokeOpacity = isSelected ? 1 : isHovered ? 0.7 : 0.3;

  const fontSize = depth === 0 ? 12 : depth === 1 ? 11 : 10;
  const iconSize = depth === 0 ? 22 : depth === 1 ? 18 : 15;

  return (
    <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect(); }} onMouseEnter={onHover} onMouseLeave={onLeave}>
      {/* Dark bg */}
      <path d={d} fill="hsl(0 0% 4%)" fillOpacity={0.88} />
      {/* Color overlay */}
      <motion.path
        d={d} fill={accent} stroke={accent}
        strokeWidth={isSelected ? 2.5 : 1.5}
        initial={{ fillOpacity: 0, strokeOpacity: 0 }}
        animate={{ fillOpacity, strokeOpacity }}
        transition={{ duration: 0.2 }}
      />
      {/* Icon */}
      <foreignObject
        x={iconX - iconSize / 2} y={iconY - iconSize / 2 - 5}
        width={iconSize} height={iconSize}
        className="pointer-events-none"
      >
        <div className="w-full h-full flex items-center justify-center text-white" style={{ opacity: isSelected || isHovered ? 1 : 0.85 }}>
          {icon}
        </div>
      </foreignObject>
      {/* Label - always white */}
      <text
        x={iconX} y={iconY + iconSize / 2 + 2}
        textAnchor="middle"
        className="pointer-events-none select-none"
        style={{
          fill: "#ffffff",
          fontSize: `${fontSize}px`,
          fontWeight: isSelected ? 800 : 600,
          letterSpacing: "0.04em",
          opacity: isSelected ? 1 : isHovered ? 0.95 : 0.75,
          textShadow: "0 1px 6px rgba(0,0,0,0.9)",
        }}
      >
        {label}
      </text>
      {/* Has-children dot */}
      {hasChildren && !isSelected && (
        <circle cx={iconX + iconSize / 2 + 3} cy={iconY - iconSize / 2 - 3} r={3.5} fill={accent} fillOpacity={0.9} />
      )}
      {/* Selected glow */}
      {isSelected && (
        <motion.path
          d={d} fill="none" stroke={accent} strokeWidth={1.5}
          initial={{ strokeOpacity: 0 }}
          animate={{ strokeOpacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ filter: `drop-shadow(0 0 12px ${accent})` }}
        />
      )}
    </g>
  );
}

// ── Ring data with parent angle info ──
interface RingData {
  items: WheelItem[];
  selectedIndex: number | null;
  depth: number;
  parentMidAngle: number | null; // null = full ring, number = partial arc centered here
}

// ── Multi-ring Wheel ──
function MultiRingWheel({
  rings, accent, onSelect, onBack, centerIcon, centerLabel,
}: {
  rings: RingData[];
  accent: string;
  onSelect: (depth: number, index: number) => void;
  onBack: () => void;
  centerIcon?: React.ReactNode;
  centerLabel?: string;
}) {
  const [hovered, setHovered] = useState<{ depth: number; index: number } | null>(null);

  const maxOuter = rings.length > 0 ? RING_OUTER[Math.min(rings.length - 1, 3)] : 180;
  const svgSize = (maxOuter + 50) * 2;

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
    >
      <svg
        width={svgSize} height={svgSize}
        viewBox={`${-svgSize / 2} ${-svgSize / 2} ${svgSize} ${svgSize}`}
        onClick={onBack}
      >
        {/* Clickable background to catch empty area clicks */}
        <rect x={-svgSize / 2} y={-svgSize / 2} width={svgSize} height={svgSize} fill="transparent" />
        {/* Ring guide circles - only for full rings (depth 0 & 1) */}
        {rings.slice(0, 2).map((_, rIdx) => {
          const innerR = RING_INNER[rIdx];
          const outerR = RING_OUTER[rIdx];
          return (
            <g key={`ring-border-${rIdx}`}>
              <circle cx={0} cy={0} r={innerR} fill="none" stroke={accent} strokeWidth={0.5} strokeOpacity={0.1} />
              <circle cx={0} cy={0} r={outerR} fill="none" stroke={accent} strokeWidth={0.5} strokeOpacity={0.1} />
            </g>
          );
        })}

        {/* Render rings */}
        {rings.map((ring, rIdx) => {
          const innerR = RING_INNER[Math.min(rIdx, 3)];
          const outerR = RING_OUTER[Math.min(rIdx, 3)];
          const isPartial = ring.parentMidAngle !== null;
          const count = ring.items.length;
          const gap = 0.03;

          // For partial rings: each item gets ~0.5 rad, centered on parent angle
          const itemArc = isPartial ? 0.5 : (2 * Math.PI) / count;
          const totalSpan = isPartial ? count * itemArc : 2 * Math.PI;
          const arcStart = isPartial
            ? (ring.parentMidAngle! - totalSpan / 2)
            : -Math.PI / 2;

          return (
            <g key={`ring-${rIdx}`}>
              {/* Partial ring arc guide */}
              {isPartial && (
                <path
                  d={arcPath(arcStart, arcStart + totalSpan, innerR, outerR)}
                  fill="none" stroke={accent} strokeWidth={0.5} strokeOpacity={0.15}
                  strokeDasharray="4 4"
                />
              )}
              <AnimatePresence>
                {ring.items.map((item, i) => {
                  const segStart = arcStart + i * itemArc + gap / 2;
                  const segEnd = arcStart + (i + 1) * itemArc - gap / 2;
                  return (
                    <motion.g
                      key={`${rIdx}-${item.label}-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <WheelSegment
                        startAngle={segStart}
                        endAngle={segEnd}
                        innerR={innerR}
                        outerR={outerR}
                        isSelected={ring.selectedIndex === i}
                        isHovered={hovered?.depth === rIdx && hovered?.index === i}
                        accent={accent}
                        icon={item.icon}
                        label={item.label}
                        hasChildren={!!(item.children && item.children.length > 0)}
                        onSelect={() => onSelect(rIdx, i)}
                        onHover={() => setHovered({ depth: rIdx, index: i })}
                        onLeave={() => setHovered(null)}
                        depth={rIdx}
                      />
                    </motion.g>
                  );
                })}
              </AnimatePresence>
            </g>
          );
        })}
      </svg>

      {/* Center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-2">
          {centerIcon && (
            <div className="w-14 h-14 rounded-full flex items-center justify-center border-2" style={{ borderColor: `${accent}60`, color: accent, background: `${accent}15` }}>
              {centerIcon}
            </div>
          )}
          {centerLabel && (
            <span className="text-xs font-bold tracking-widest uppercase text-white" style={{ textShadow: `0 0 20px ${accent}` }}>
              {centerLabel}
            </span>
          )}
          <motion.button
            className="pointer-events-auto w-8 h-8 rounded-full border flex items-center justify-center backdrop-blur-xl transition-colors hover:bg-foreground/10 mt-1"
            style={{ borderColor: `${accent}40`, color: accent }}
            onClick={onBack}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </motion.button>
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

  const [activeModule, setActiveModule] = useState<HudModule | null>(null);
  const [selections, setSelections] = useState<(number | null)[]>([]);

  const accent = activeModule ? `hsl(${activeModule.accentHsl})` : "hsl(var(--primary))";

  const openModule = useCallback((mod: HudModule) => {
    setActiveModule(mod);
    setSelections([]);
  }, []);

  const closeWheel = useCallback(() => {
    setActiveModule(null);
    setSelections([]);
  }, []);

  // Build rings with parent angle info
  const rings: RingData[] = useMemo(() => {
    if (!activeModule) return [];
    const result: RingData[] = [];
    let currentItems: WheelItem[] = activeModule.items;

    // Ring 0: full circle
    result.push({ items: currentItems, selectedIndex: selections[0] ?? null, depth: 0, parentMidAngle: null });

    for (let d = 0; d < selections.length; d++) {
      const sel = selections[d];
      if (sel === null || sel === undefined) break;
      const item = currentItems[sel];
      if (!item?.children || item.children.length === 0) break;

      // Calculate parent's mid angle
      const parentRing = result[d];
      const parentCount = parentRing.items.length;
      let parentMidAngle: number | null = null;

      if (parentRing.parentMidAngle !== null) {
        // Parent was partial: reconstruct its angle
        const pItemArc = 0.5;
        const pTotalSpan = parentCount * pItemArc;
        const pArcStart = parentRing.parentMidAngle - pTotalSpan / 2;
        parentMidAngle = pArcStart + sel * pItemArc + pItemArc / 2;
      } else {
        // Parent was full ring
        const anglePerItem = (2 * Math.PI) / parentCount;
        parentMidAngle = -Math.PI / 2 + anglePerItem * sel + anglePerItem / 2;
      }

      currentItems = item.children;
      const isPartial = d >= 1; // depth 2+ = partial
      result.push({
        items: currentItems,
        selectedIndex: selections[d + 1] ?? null,
        depth: d + 1,
        parentMidAngle: isPartial ? parentMidAngle : null,
      });
    }
    return result;
  }, [activeModule, selections]);

  const handleSelect = useCallback((depth: number, index: number) => {
    setSelections(prev => {
      const item = rings[depth]?.items[index];
      if (!item) return prev;
      if (prev[depth] === index) return prev.slice(0, depth);
      if (item.children && item.children.length > 0) {
        const next = prev.slice(0, depth);
        next[depth] = index;
        return next;
      }
      navigate(item.href);
      return prev;
    });
  }, [rings, navigate]);

  const handleBack = useCallback(() => {
    if (selections.length === 0) closeWheel();
    else setSelections(prev => prev.slice(0, -1));
  }, [selections.length, closeWheel]);

  const breadcrumb = useMemo(() => {
    if (!activeModule) return [];
    const crumbs = [activeModule.title];
    let items = activeModule.items;
    for (const sel of selections) {
      if (sel === null || sel === undefined) break;
      const item = items[sel];
      if (!item) break;
      crumbs.push(item.label);
      if (item.children) items = item.children;
      else break;
    }
    return crumbs;
  }, [activeModule, selections]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <GradientMesh />
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

      {/* ══════════ MAIN ══════════ */}
      <div
        className="relative z-10 w-full min-h-screen flex items-center justify-center"
        onClick={activeModule ? handleBack : undefined}
      >
        <AnimatePresence mode="wait">
          {!activeModule ? (
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
                      width: 170, height: 170,
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
                    <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `radial-gradient(circle at center, ${a}10 0%, transparent 70%)` }} />
                    <div style={{ color: hasAccess ? a : undefined }}>{hasAccess ? mod.icon : <Lock className="w-7 h-7" />}</div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-sm font-bold tracking-wider" style={{ color: a }}>{mod.title}</span>
                      <span className="text-[11px] text-foreground/60">{mod.tagline}</span>
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
            <motion.div
              key="weapon-wheel"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              {/* Breadcrumb */}
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-xl"
                style={{ borderColor: `${accent}30`, background: "hsl(0 0% 4% / 0.8)" }}
                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
              >
                {breadcrumb.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <ChevronRight className="w-3 h-3" style={{ color: `${accent}60` }} />}
                    <span className="text-xs font-bold tracking-wider uppercase" style={{ color: i === breadcrumb.length - 1 ? "#fff" : "#ffffff99" }}>
                      {crumb}
                    </span>
                  </span>
                ))}
              </motion.div>

              <MultiRingWheel
                rings={rings}
                accent={accent}
                onSelect={handleSelect}
                onBack={handleBack}
                centerIcon={activeModule.icon}
                centerLabel={activeModule.title}
              />

              <motion.button
                onClick={() => navigate(activeModule.href)}
                className="flex items-center gap-2 px-6 py-3 rounded-full border backdrop-blur-xl hover:scale-105 transition-transform"
                style={{ backgroundColor: "hsl(0 0% 6% / 0.95)", borderColor: `${accent}50`, color: accent }}
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              >
                <span className="text-sm font-bold">Acessar {activeModule.title}</span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {activeModule && (
          <motion.div
            className="fixed inset-0 z-[4]"
            style={{ backgroundColor: "hsl(0 0% 0% / 0.65)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleBack}
          />
        )}
      </AnimatePresence>
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-[5]" />
    </div>
  );
};

export default Index;
