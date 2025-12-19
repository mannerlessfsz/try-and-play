import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: string;
  changeType?: "up" | "down";
  icon: LucideIcon;
  color: string;
}

const colorClasses: Record<string, string> = {
  red: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-400",
  blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
  green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
  yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400",
};

export function MetricCard({ title, value, change, changeType, icon: Icon, color }: MetricCardProps) {
  return (
    <div className={`
      relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorClasses[color]}
      p-4 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
      group cursor-pointer
    `}>
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
    </div>
  );
}
