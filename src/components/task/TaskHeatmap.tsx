import { useMemo } from "react";
import { Tarefa } from "@/types/task";

interface TaskHeatmapProps {
  tarefas: Tarefa[];
  layout?: "horizontal" | "vertical";
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function TaskHeatmap({ tarefas, layout = "horizontal" }: TaskHeatmapProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(now);

  const { days, maxCount } = useMemo(() => {
    const taskMap: Record<string, number> = {};
    tarefas.forEach(t => {
      if (t.prazoEntrega) {
        taskMap[t.prazoEntrega] = (taskMap[t.prazoEntrega] || 0) + 1;
      }
    });

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const key = toDateKey(new Date(year, month, i + 1));
      return { key, count: taskMap[key] || 0, day: i + 1 };
    });

    const maxCount = Math.max(1, ...days.map(d => d.count));
    return { days, maxCount };
  }, [tarefas, year, month, daysInMonth]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long" });

  if (layout === "vertical") {
    // Grid layout for vertical sidebar
    return (
      <div>
        <span className="text-[9px] text-muted-foreground capitalize block mb-1.5 font-semibold tracking-wider uppercase">{monthLabel}</span>
        <div className="grid grid-cols-7 gap-[2px]">
          {days.map(d => {
            const isToday = d.key === todayKey;
            const intensity = d.count / maxCount;
            const opacity = d.count === 0 ? 0.06 : 0.15 + intensity * 0.7;
            const isOverdue = d.key < todayKey && d.count > 0;

            return (
              <div
                key={d.key}
                className={`
                  aspect-square rounded-[2px] transition-all relative group cursor-default
                  ${isToday ? "ring-1 ring-primary/60" : ""}
                `}
                style={{
                  backgroundColor: d.count === 0
                    ? `hsl(var(--foreground) / ${opacity})`
                    : isOverdue
                      ? `hsl(45, 100%, 60%, ${opacity})`
                      : `hsl(var(--primary) / ${opacity})`
                }}
                title={`${d.day}: ${d.count} tarefa${d.count !== 1 ? "s" : ""}`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded bg-card border border-foreground/10 text-[8px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  {d.day}: {d.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Original horizontal layout
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-muted-foreground capitalize whitespace-nowrap">{monthLabel}</span>
      <div className="flex gap-[2px] flex-1">
        {days.map(d => {
          const isToday = d.key === todayKey;
          const intensity = d.count / maxCount;
          const opacity = d.count === 0 ? 0.06 : 0.15 + intensity * 0.7;
          const isOverdue = d.key < todayKey && d.count > 0;

          return (
            <div
              key={d.key}
              className={`
                flex-1 h-4 rounded-[2px] transition-all relative group cursor-default
                ${isToday ? "ring-1 ring-primary/60" : ""}
              `}
              style={{
                backgroundColor: d.count === 0
                  ? `hsl(var(--foreground) / ${opacity})`
                  : isOverdue
                    ? `hsl(45, 100%, 60%, ${opacity})`
                    : `hsl(var(--primary) / ${opacity})`
              }}
              title={`${d.day}: ${d.count} tarefa${d.count !== 1 ? "s" : ""}`}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded bg-card border border-foreground/10 text-[8px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                {d.day}: {d.count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
