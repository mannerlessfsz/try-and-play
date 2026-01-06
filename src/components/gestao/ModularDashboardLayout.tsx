import { useState, useCallback } from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, X, LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DashboardCard {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  size?: "small" | "medium" | "large";
}

interface ModularDashboardLayoutProps {
  cards: DashboardCard[];
  onReorder?: (newOrder: DashboardCard[]) => void;
  moduleColor?: "blue" | "magenta" | "orange" | "green";
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
}

export function ModularDashboardLayout({
  cards,
  onReorder,
  moduleColor = "blue",
  isEditMode = false,
  onToggleEditMode,
}: ModularDashboardLayoutProps) {
  const [items, setItems] = useState(cards);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const handleReorder = useCallback((newOrder: DashboardCard[]) => {
    setItems(newOrder);
    onReorder?.(newOrder);
  }, [onReorder]);

  const colorMap = {
    blue: {
      gradient: "from-blue/10 to-cyan/5",
      border: "border-blue/20 hover:border-blue/40",
      accent: "text-blue",
      glow: "shadow-blue/10",
    },
    magenta: {
      gradient: "from-magenta/10 to-pink-500/5",
      border: "border-magenta/20 hover:border-magenta/40",
      accent: "text-magenta",
      glow: "shadow-magenta/10",
    },
    orange: {
      gradient: "from-orange/10 to-yellow-500/5",
      border: "border-orange/20 hover:border-orange/40",
      accent: "text-orange",
      glow: "shadow-orange/10",
    },
    green: {
      gradient: "from-green-500/10 to-emerald-500/5",
      border: "border-green-500/20 hover:border-green-500/40",
      accent: "text-green-500",
      glow: "shadow-green-500/10",
    },
  };

  const colors = colorMap[moduleColor];

  const sizeClasses = {
    small: "col-span-1 row-span-1",
    medium: "col-span-1 md:col-span-2 row-span-1",
    large: "col-span-1 md:col-span-2 row-span-2",
  };

  return (
    <div className="relative">
      {/* Edit mode toggle */}
      {onToggleEditMode && (
        <motion.div 
          className="absolute -top-12 right-0 z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleEditMode}
            className={cn(
              "gap-2 backdrop-blur-xl border-white/10",
              isEditMode && "bg-white/10 border-white/20"
            )}
          >
            {isEditMode ? (
              <>
                <Sparkles className="w-4 h-4" />
                Concluir
              </>
            ) : (
              <>
                <LayoutGrid className="w-4 h-4" />
                Personalizar
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* Cards grid */}
      {isEditMode ? (
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {items.map((card) => (
            <Reorder.Item
              key={card.id}
              value={card}
              className={cn(sizeClasses[card.size || "small"])}
            >
              <DashboardCardComponent
                card={card}
                colors={colors}
                isEditMode={isEditMode}
                isHovered={hoveredCard === card.id}
                onHover={(hovered) => setHoveredCard(hovered ? card.id : null)}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((card, index) => (
            <motion.div
              key={card.id}
              className={cn(sizeClasses[card.size || "small"])}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <DashboardCardComponent
                card={card}
                colors={colors}
                isEditMode={isEditMode}
                isHovered={hoveredCard === card.id}
                onHover={(hovered) => setHoveredCard(hovered ? card.id : null)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DashboardCardComponentProps {
  card: DashboardCard;
  colors: {
    gradient: string;
    border: string;
    accent: string;
    glow: string;
  };
  isEditMode: boolean;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
}

function DashboardCardComponent({
  card,
  colors,
  isEditMode,
  isHovered,
  onHover,
}: DashboardCardComponentProps) {
  return (
    <motion.div
      className={cn(
        "relative h-full rounded-2xl border backdrop-blur-xl overflow-hidden",
        "bg-gradient-to-br from-background/80 to-background/40",
        "transition-all duration-300",
        colors.border,
        isEditMode && "cursor-grab active:cursor-grabbing",
        isHovered && "shadow-lg",
        colors.glow
      )}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      whileHover={{ scale: isEditMode ? 1.02 : 1 }}
      layout
    >
      {/* Edit mode overlay */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 z-10 flex items-center justify-center"
          >
            <GripVertical className="w-8 h-8 text-white/50" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-3",
        "border-b border-white/5",
        "bg-gradient-to-r",
        colors.gradient
      )}>
        <div className={colors.accent}>{card.icon}</div>
        <span className="text-sm font-semibold text-foreground">{card.title}</span>
      </div>

      {/* Content */}
      <div className="p-4">
        {card.content}
      </div>

      {/* Corner accent */}
      <div 
        className={cn(
          "absolute bottom-0 right-0 w-16 h-16",
          "bg-gradient-to-tl from-current to-transparent opacity-10",
          "pointer-events-none",
          colors.accent
        )}
      />
    </motion.div>
  );
}
