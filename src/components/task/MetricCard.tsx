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

export function MetricCard({ title, value, change, changeType, icon: Icon, color, isActive, onClick }: MetricCardProps) {
  const colorStyle = colorClasses[color] || colorClasses.red;
  
  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl border bg-gradient-to-br 
        ${isActive ? colorStyle.active : colorStyle.base}
        p-4 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
        group cursor-pointer
      `}
    >
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-24 h-24" />
      </div>
      <div className="relative z-10">
        <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {change && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${changeType === "up" ? "text-green-400" : "text-red-400"}`}>
            {changeType === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{change}</span>
          </div>
        )}
      </div>
      {isActive && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current animate-pulse" />
      )}
    </div>
  );
}
