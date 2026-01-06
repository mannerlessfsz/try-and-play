import { useState } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { GripVertical, X, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingWidgetProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  moduleColor?: "blue" | "magenta" | "orange" | "green";
  onClose?: () => void;
  className?: string;
}

export function FloatingWidget({
  id,
  title,
  icon,
  children,
  defaultPosition = { x: 20, y: 20 },
  moduleColor = "blue",
  onClose,
  className,
}: FloatingWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(defaultPosition);
  const dragControls = useDragControls();

  const colorMap = {
    blue: "from-blue/20 to-cyan/10 border-blue/30 shadow-blue/10",
    magenta: "from-magenta/20 to-pink-500/10 border-magenta/30 shadow-magenta/10",
    orange: "from-orange/20 to-yellow-500/10 border-orange/30 shadow-orange/10",
    green: "from-green-500/20 to-emerald-500/10 border-green-500/30 shadow-green-500/10",
  };

  const accentMap = {
    blue: "text-blue",
    magenta: "text-magenta",
    orange: "text-orange",
    green: "text-green-500",
  };

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.1}
      initial={{ opacity: 0, scale: 0.9, ...defaultPosition }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        height: isMinimized ? "auto" : "auto",
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "fixed z-50 min-w-[200px] max-w-[320px]",
        "rounded-2xl border backdrop-blur-2xl",
        "bg-gradient-to-br from-background/90 to-background/70",
        "shadow-2xl",
        colorMap[moduleColor],
        className
      )}
      style={{ 
        top: defaultPosition.y, 
        right: defaultPosition.x,
        left: "auto",
      }}
    >
      {/* Header with drag handle */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing",
          "border-b border-white/5",
          "bg-gradient-to-r from-white/5 to-transparent",
          "rounded-t-2xl"
        )}
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground/50" />
        <div className={cn("flex-shrink-0", accentMap[moduleColor])}>
          {icon}
        </div>
        <span className="flex-1 text-sm font-medium text-foreground truncate">
          {title}
        </span>
        <div className="flex items-center gap-1">
          <motion.button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isMinimized ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </motion.button>
          {onClose && (
            <motion.button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative corner accent */}
      <div 
        className={cn(
          "absolute -bottom-px -right-px w-8 h-8",
          "bg-gradient-to-tl from-current to-transparent opacity-20",
          "rounded-br-2xl pointer-events-none",
          accentMap[moduleColor]
        )}
      />
    </motion.div>
  );
}
