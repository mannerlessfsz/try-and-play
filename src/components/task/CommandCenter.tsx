import { useMemo } from "react";
import { motion } from "framer-motion";
import { ListTodo, Activity, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

interface CommandCenterProps {
  total: number;
  emAndamento: number;
  concluidas: number;
  atrasadas: number;
  activeFilter: string;
  onFilterClick: (filter: string) => void;
}

export function CommandCenter({ total, emAndamento, concluidas, atrasadas, activeFilter, onFilterClick }: CommandCenterProps) {
  const completionRate = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  const segments = useMemo(() => [
    { id: "all", label: "Total", value: total, icon: ListTodo, color: "hsl(var(--primary))", bgClass: "bg-primary/15", textClass: "text-primary", activeClass: "ring-primary/50 bg-primary/20" },
    { id: "em_andamento", label: "Ativas", value: emAndamento, icon: Activity, color: "hsl(210, 100%, 55%)", bgClass: "bg-blue-500/15", textClass: "text-blue-400", activeClass: "ring-blue-500/50 bg-blue-500/20" },
    { id: "concluida", label: "Feitas", value: concluidas, icon: CheckCircle2, color: "hsl(142, 76%, 36%)", bgClass: "bg-green-500/15", textClass: "text-green-400", activeClass: "ring-green-500/50 bg-green-500/20" },
    { id: "urgente", label: "Atraso", value: atrasadas, icon: AlertTriangle, color: "hsl(45, 100%, 60%)", bgClass: "bg-yellow-500/15", textClass: "text-yellow-400", activeClass: "ring-yellow-500/50 bg-yellow-500/20" },
  ], [total, emAndamento, concluidas, atrasadas]);

  return (
    <div className="relative rounded-2xl border border-foreground/8 bg-card/40 backdrop-blur-xl overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

      <div className="relative flex items-center gap-6 p-4">
        {/* Radial completion ring */}
        <div className="relative flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 64 64" className="-rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--foreground) / 0.06)" strokeWidth="3" />
            <motion.circle
              cx="32" cy="32" r="28" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={completionRate}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-bold text-foreground tabular-nums leading-none"
            >
              {completionRate}%
            </motion.span>
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5">concluído</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-foreground/8" />

        {/* Segment buttons */}
        <div className="flex-1 flex items-center gap-2">
          {segments.map((seg, i) => {
            const isActive = activeFilter === seg.id;
            const Icon = seg.icon;
            return (
              <motion.button
                key={seg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => onFilterClick(seg.id)}
                className={`
                  flex-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all
                  ${isActive ? `ring-2 ${seg.activeClass}` : "hover:bg-foreground/5"}
                `}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${seg.bgClass}`}>
                  <Icon className={`w-4 h-4 ${seg.textClass}`} />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none">{seg.label}</p>
                  <motion.p
                    key={seg.value}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-xl font-bold text-foreground tabular-nums leading-tight"
                  >
                    {seg.value}
                  </motion.p>
                </div>
                {/* Mini bar showing proportion */}
                <div className="w-12 h-1 bg-foreground/5 rounded-full overflow-hidden ml-auto hidden lg:block">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: total > 0 ? `${(seg.value / total) * 100}%` : "0%" }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Trend indicator */}
        <div className="hidden xl:flex flex-col items-center gap-1 px-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Ritmo</span>
        </div>
      </div>

      {/* Bottom progress bar showing all segments */}
      <div className="flex h-1">
        {total > 0 ? (
          <>
            <motion.div initial={{ width: 0 }} animate={{ width: `${(concluidas / total) * 100}%` }} transition={{ duration: 0.8 }} className="bg-green-500/60" />
            <motion.div initial={{ width: 0 }} animate={{ width: `${(emAndamento / total) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 }} className="bg-blue-500/60" />
            <motion.div initial={{ width: 0 }} animate={{ width: `${(atrasadas / total) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="bg-yellow-500/60" />
            <div className="flex-1 bg-foreground/5" />
          </>
        ) : (
          <div className="flex-1 bg-foreground/5" />
        )}
      </div>
    </div>
  );
}
