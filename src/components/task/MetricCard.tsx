import { forwardRef, useEffect, useState, useRef } from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: string;
  changeType?: "up" | "down";
  icon: LucideIcon;
  color: string;
  isActive?: boolean;
  onClick?: () => void;
}

const colorConfig: Record<string, { gradient: string; active: string; ring: string; glow: string; dot: string; iconBg: string }> = {
  red: {
    gradient: "from-red-500/10 via-red-600/5 to-transparent",
    active: "from-red-500/25 via-red-600/15 to-red-700/5 ring-2 ring-red-500/40",
    ring: "border-red-500/20",
    glow: "shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]",
    dot: "bg-red-500",
    iconBg: "bg-red-500/15 text-red-400",
  },
  blue: {
    gradient: "from-blue-500/10 via-blue-600/5 to-transparent",
    active: "from-blue-500/25 via-blue-600/15 to-blue-700/5 ring-2 ring-blue-500/40",
    ring: "border-blue-500/20",
    glow: "shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]",
    dot: "bg-blue-500",
    iconBg: "bg-blue-500/15 text-blue-400",
  },
  green: {
    gradient: "from-green-500/10 via-green-600/5 to-transparent",
    active: "from-green-500/25 via-green-600/15 to-green-700/5 ring-2 ring-green-500/40",
    ring: "border-green-500/20",
    glow: "shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]",
    dot: "bg-green-500",
    iconBg: "bg-green-500/15 text-green-400",
  },
  yellow: {
    gradient: "from-yellow-500/10 via-yellow-600/5 to-transparent",
    active: "from-yellow-500/25 via-yellow-600/15 to-yellow-700/5 ring-2 ring-yellow-500/40",
    ring: "border-yellow-500/20",
    glow: "shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)]",
    dot: "bg-yellow-500",
    iconBg: "bg-yellow-500/15 text-yellow-400",
  },
};

function useAnimatedCount(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current !== target ? 0 : count;
    prevTarget.current = target;
    if (target === 0) { setCount(0); return; }

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);

  return count;
}

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, change, changeType, icon: Icon, color, isActive, onClick }, ref) => {
    const cfg = colorConfig[color] || colorConfig.red;
    const numericValue = typeof value === "number" ? value : parseInt(String(value)) || 0;
    const animatedValue = useAnimatedCount(numericValue);
    const displayValue = typeof value === "number" ? animatedValue : value;

    return (
      <motion.div
        ref={ref}
        onClick={onClick}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`
          relative overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-xl
          will-change-transform
          ${isActive ? cfg.active : cfg.gradient}
          ${isActive ? cfg.glow : ""}
          ${cfg.ring}
          p-4 cursor-pointer group
        `}
      >
        {/* Subtle mesh background */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_20%_80%,white_1px,transparent_1px),radial-gradient(circle_at_80%_20%,white_1px,transparent_1px)] bg-[length:24px_24px]" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{displayValue}</p>
            {change && (
              <p className={`text-[10px] mt-1 ${changeType === "down" ? "text-red-400" : "text-muted-foreground/60"}`}>
                {change}
              </p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.iconBg} transition-all group-hover:scale-110`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        {/* Bottom accent line */}
        <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${cfg.dot} opacity-30 group-hover:opacity-60 transition-opacity`} />

        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute top-2 right-2 w-2 h-2 rounded-full ${cfg.dot} animate-pulse`}
          />
        )}
      </motion.div>
    );
  }
);

MetricCard.displayName = "MetricCard";
