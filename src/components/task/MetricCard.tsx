import { forwardRef } from "react";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";

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

const colorClasses: Record<string, { base: string; active: string }> = {
  red: {
    base: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-400",
    active: "from-red-500/40 to-red-600/20 border-red-500 text-red-300 ring-2 ring-red-500/50",
  },
  blue: {
    base: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    active: "from-blue-500/40 to-blue-600/20 border-blue-500 text-blue-300 ring-2 ring-blue-500/50",
  },
  green: {
    base: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    active: "from-green-500/40 to-green-600/20 border-green-500 text-green-300 ring-2 ring-green-500/50",
  },
  yellow: {
    base: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400",
    active: "from-yellow-500/40 to-yellow-600/20 border-yellow-500 text-yellow-300 ring-2 ring-yellow-500/50",
  },
};

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, change, changeType, icon: Icon, color, isActive, onClick }, ref) => {
    const colorStyle = colorClasses[color] || colorClasses.red;
    
    return (
      <div 
        ref={ref}
        onClick={onClick}
        className={`
          relative overflow-hidden rounded-xl border bg-gradient-to-br 
          ${isActive ? colorStyle.active : colorStyle.base}
          px-3 py-2 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
          group cursor-pointer
        `}
      >
        <div className="absolute -right-2 -top-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Icon className="w-16 h-16" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-medium text-muted-foreground">{title}</p>
          <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 text-[10px] ${changeType === "up" ? "text-green-400" : "text-red-400"}`}>
              {changeType === "up" ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              <span>{change}</span>
            </div>
          )}
        </div>
        {isActive && (
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        )}
      </div>
    );
  }
);

MetricCard.displayName = "MetricCard";
