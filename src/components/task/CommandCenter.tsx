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
  layout?: "horizontal" | "vertical";
}

export function CommandCenter({ total, emAndamento, concluidas, atrasadas, activeFilter, onFilterClick, layout = "horizontal" }: CommandCenterProps) {
  const completionRate = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  const segments = useMemo(() => [
    { id: "all", label: "Total", value: total, icon: ListTodo, color: "hsl(var(--primary))", bgClass: "bg-primary/15", textClass: "text-primary", activeClass: "ring-primary/50 bg-primary/20" },
    { id: "em_andamento", label: "Ativas", value: emAndamento, icon: Activity, color: "hsl(210, 100%, 55%)", bgClass: "bg-blue-500/15", textClass: "text-blue-400", activeClass: "ring-blue-500/50 bg-blue-500/20" },
    { id: "concluida", label: "Feitas", value: concluidas, icon: CheckCircle2, color: "hsl(142, 76%, 36%)", bgClass: "bg-green-500/15", textClass: "text-green-400", activeClass: "ring-green-500/50 bg-green-500/20" },
    { id: "urgente", label: "Atraso", value: atrasadas, icon: AlertTriangle, color: "hsl(45, 100%, 60%)", bgClass: "bg-yellow-500/15", textClass: "text-yellow-400", activeClass: "ring-yellow-500/50 bg-yellow-500/20" },
  ], [total, emAndamento, concluidas, atrasadas]);

  if (layout === "vertical") {
    return (
      <div className="space-y-4">
        {/* Header label */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_12px_hsl(var(--primary)/0.4)]">
            <TrendingUp className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Métricas</span>
        </div>

        {/* Radial completion ring - larger */}
        <div className="flex justify-center py-2">
          <div className="relative">
            <svg width="96" height="96" viewBox="0 0 64 64" className="-rotate-90">
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-bold text-foreground tabular-nums leading-none"
              >
                {completionRate}%
              </motion.span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">concluído</span>
            </div>
          </div>
        </div>

        {/* Segment cards - expanded vertical */}
        <div className="space-y-1.5">
          {segments.map((seg, i) => {
            const isActive = activeFilter === seg.id;
            const Icon = seg.icon;
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <motion.button
                key={seg.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => onFilterClick(seg.id)}
                className={`
                  w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 relative overflow-hidden group/seg
                  ${isActive ? `ring-1 ${seg.activeClass}` : "hover:bg-foreground/5"}
                `}
                style={isActive ? {
                  boxShadow: `0 0 20px ${seg.color.replace(')', ' / 0.15)').replace('hsl(', 'hsl(')}`,
                } : undefined}
              >
                {/* Ambient glow on hover */}
                <div 
                  className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-0 group-hover/seg:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none"
                  style={{ background: seg.color }}
                />
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${seg.bgClass} border transition-all duration-300 relative z-10`}
                  style={{ borderColor: `${seg.color.replace(')', ' / 0.25)').replace('hsl(', 'hsl(')}` }}
                >
                  <Icon className={`w-4 h-4 ${seg.textClass}`} />
                </div>
                <div className="text-left min-w-0 flex-1 relative z-10">
                  <p className="text-xs text-muted-foreground leading-none mb-0.5">{seg.label}</p>
                  <div className="flex items-baseline gap-1.5">
                    <p
                      className="text-xl font-bold text-foreground tabular-nums leading-tight"
                    >
                      {seg.value}
                    </p>
                    <span className="text-[11px] text-muted-foreground/60">{pct}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-10 h-1.5 bg-foreground/5 rounded-full overflow-hidden flex-shrink-0 relative z-10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: total > 0 ? `${pct}%` : "0%" }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Bottom stacked progress bar */}
        <div className="flex h-1.5 rounded-full overflow-hidden">
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

  // Original horizontal layout
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold text-foreground tabular-nums leading-none"
            >
              {completionRate}%
            </motion.span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">concluído</span>
          </div>
        </div>

        <div className="w-px h-12 bg-foreground/8" />

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
                  <p className="text-xs text-muted-foreground leading-none">{seg.label}</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">
                    {seg.value}
                  </p>
                </div>
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

        <div className="hidden xl:flex flex-col items-center gap-1 px-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Ritmo</span>
        </div>
      </div>

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
