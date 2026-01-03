import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModernMetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  color: "blue" | "green" | "red" | "yellow" | "purple" | "emerald";
  isActive?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

const colorVariants = {
  blue: {
    bg: "from-blue-500/10 via-blue-500/5 to-transparent",
    border: "border-blue-500/20",
    activeBorder: "border-blue-500/60",
    icon: "text-blue-400",
    iconBg: "bg-blue-500/15",
    ring: "ring-blue-500/40",
    glow: "shadow-blue-500/10",
  },
  green: {
    bg: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/20",
    activeBorder: "border-emerald-500/60",
    icon: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
    ring: "ring-emerald-500/40",
    glow: "shadow-emerald-500/10",
  },
  red: {
    bg: "from-red-500/10 via-red-500/5 to-transparent",
    border: "border-red-500/20",
    activeBorder: "border-red-500/60",
    icon: "text-red-400",
    iconBg: "bg-red-500/15",
    ring: "ring-red-500/40",
    glow: "shadow-red-500/10",
  },
  yellow: {
    bg: "from-amber-500/10 via-amber-500/5 to-transparent",
    border: "border-amber-500/20",
    activeBorder: "border-amber-500/60",
    icon: "text-amber-400",
    iconBg: "bg-amber-500/15",
    ring: "ring-amber-500/40",
    glow: "shadow-amber-500/10",
  },
  purple: {
    bg: "from-purple-500/10 via-purple-500/5 to-transparent",
    border: "border-purple-500/20",
    activeBorder: "border-purple-500/60",
    icon: "text-purple-400",
    iconBg: "bg-purple-500/15",
    ring: "ring-purple-500/40",
    glow: "shadow-purple-500/10",
  },
  emerald: {
    bg: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/20",
    activeBorder: "border-emerald-500/60",
    icon: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
    ring: "ring-emerald-500/40",
    glow: "shadow-emerald-500/10",
  },
};

export function ModernMetricCard({ 
  title, 
  value, 
  subtitle,
  change, 
  changeType = "neutral", 
  icon: Icon, 
  color, 
  isActive, 
  onClick,
  size = "md"
}: ModernMetricCardProps) {
  const variant = colorVariants[color];
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-xl transition-all duration-300 group text-left w-full",
        variant.bg,
        isActive ? variant.activeBorder : variant.border,
        isActive && `ring-2 ${variant.ring}`,
        "hover:scale-[1.02] hover:shadow-xl",
        variant.glow,
        size === "sm" ? "p-3" : "p-4"
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500">
        <Icon className={cn(size === "sm" ? "w-20 h-20" : "w-24 h-24")} />
      </div>
      
      {/* Active indicator */}
      {isActive && (
        <div className={cn(
          "absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse",
          variant.icon
        )} style={{ backgroundColor: 'currentColor' }} />
      )}
      
      <div className="relative z-10 flex items-start gap-3">
        <div className={cn(
          "rounded-xl flex items-center justify-center flex-shrink-0",
          variant.iconBg,
          size === "sm" ? "w-10 h-10" : "w-12 h-12"
        )}>
          <Icon className={cn(variant.icon, size === "sm" ? "w-5 h-5" : "w-6 h-6")} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <p className={cn(
            "font-bold text-foreground leading-tight mt-0.5",
            size === "sm" ? "text-lg" : "text-xl"
          )}>
            {value}
          </p>
          
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
          
          {change && (
            <div className={cn(
              "flex items-center gap-1 mt-1",
              changeType === "up" ? "text-emerald-400" : 
              changeType === "down" ? "text-red-400" : 
              "text-muted-foreground"
            )}>
              {changeType === "up" && <ArrowUpRight className="w-3 h-3" />}
              {changeType === "down" && <ArrowDownRight className="w-3 h-3" />}
              <span className="text-xs font-medium">{change}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
