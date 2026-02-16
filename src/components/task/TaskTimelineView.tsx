import { useMemo, useRef, useEffect } from "react";
import { Tarefa, prioridadeColors, statusColors } from "@/types/task";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Clock, Building2, FileText, Trash2, CheckCircle2, Circle, Timer } from "lucide-react";
import { motion } from "framer-motion";

interface TaskTimelineViewProps {
  tarefas: Tarefa[];
  getEmpresaNome: (id: string) => string;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Tarefa["status"]) => void;
}

const statusIcons = {
  pendente: <Circle className="w-3.5 h-3.5" />,
  em_andamento: <Timer className="w-3.5 h-3.5" />,
  concluida: <CheckCircle2 className="w-3.5 h-3.5" />,
};

const prioridadeDot: Record<string, string> = {
  baixa: "bg-green-500",
  media: "bg-yellow-500",
  alta: "bg-red-500",
  urgente: "bg-purple-500",
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short" });
}

function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T12:00:00");
  return d < today;
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr + "T12:00:00");
  return d.toDateString() === today.toDateString();
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDaysOfMonth(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: string[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(toDateKey(new Date(year, month, i)));
  }
  return days;
}

export function TaskTimelineView({ tarefas, getEmpresaNome, onDelete, onStatusChange }: TaskTimelineViewProps) {
  const todayRef = useRef<HTMLDivElement>(null);

  // Build a map of tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Tarefa[]> = {};
    tarefas.forEach((t) => {
      const key = t.prazoEntrega || "__no_date__";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tarefas]);

  // All days of the current month
  const allDays = useMemo(() => getDaysOfMonth(), []);

  // Tasks without a date
  const noDateTasks = tasksByDate["__no_date__"] || [];

  // Auto-scroll to today on mount
  useEffect(() => {
    setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 300);
  }, []);

  if (tarefas.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Nenhuma tarefa para exibir na timeline
      </div>
    );
  }

  return (
    <div className="relative">
      <ScrollArea className="w-full">
        <div className="flex gap-0 pb-4 min-w-max px-2 pt-2">
          {allDays.map((dateStr, gi) => {
            const overdue = isOverdue(dateStr);
            const today = isToday(dateStr);
            const dayTasks = tasksByDate[dateStr] || [];
            const hasTasks = dayTasks.length > 0;

            return (
              <div key={dateStr} className="flex items-stretch">
                <motion.div
                  ref={today ? todayRef : undefined}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gi * 0.015 }}
                  className={`flex flex-col items-center flex-shrink-0 ${hasTasks ? "w-52" : "w-14"}`}
                >
                  {/* Date header */}
                  <div className="relative flex flex-col items-center mb-3">
                    <div className={`
                      px-2 py-1 rounded-lg text-[11px] font-bold border
                      ${today
                        ? "bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_12px_hsl(var(--destructive)/0.3)]"
                        : overdue && hasTasks
                          ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                          : hasTasks
                            ? "bg-card/60 text-foreground/80 border-foreground/10"
                            : "bg-transparent text-muted-foreground/50 border-transparent"}
                    `}>
                      {formatDateLabel(dateStr)}
                    </div>
                    <span className={`text-[9px] mt-0.5 ${today ? "text-red-400 font-bold" : "text-muted-foreground/50"}`}>
                      {today ? "HOJE" : formatWeekday(dateStr)}
                    </span>
                  </div>

                  {/* Timeline connector */}
                  <div className="relative w-full flex items-center justify-center mb-3">
                    <div className={`absolute inset-x-0 h-px top-1/2 ${today ? "bg-red-500/50" : "bg-foreground/10"}`} />
                    <div className={`
                      relative z-10 rounded-full border-2
                      ${today
                        ? "w-3.5 h-3.5 bg-red-500 border-red-400 shadow-[0_0_8px_hsl(var(--destructive)/0.5)]"
                        : hasTasks
                          ? overdue ? "w-2.5 h-2.5 bg-yellow-500 border-yellow-400" : "w-2.5 h-2.5 bg-foreground/30 border-foreground/40"
                          : "w-1.5 h-1.5 bg-foreground/15 border-foreground/20"}
                    `}>
                      {today && (
                        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                      )}
                    </div>
                  </div>

                  {/* Task cards */}
                  {hasTasks && (
                    <div className="space-y-1.5 px-1.5 w-full">
                      {dayTasks.map((tarefa, ti) => (
                        <motion.div
                          key={tarefa.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: gi * 0.015 + ti * 0.02 }}
                          className={`
                            group relative rounded-lg border p-2 cursor-default
                            bg-card/50 backdrop-blur-sm
                            hover:border-red-500/30 hover:shadow-md hover:shadow-red-500/5
                            transition-all duration-200
                            ${tarefa.status === "concluida" ? "opacity-60" : ""}
                            ${overdue && tarefa.status !== "concluida" ? "border-yellow-500/20" : "border-foreground/10"}
                          `}
                        >
                          <div className="flex items-start gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${prioridadeDot[tarefa.prioridade]}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium leading-tight line-clamp-2 ${tarefa.status === "concluida" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {tarefa.titulo}
                              </p>
                            </div>
                            <button
                              onClick={() => onDelete(tarefa.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded transition-all flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[70%]">
                              <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                              {getEmpresaNome(tarefa.empresaId)}
                            </span>
                            {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <FileText className="w-2.5 h-2.5" />
                                {tarefa.arquivos.length}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 mt-1.5">
                            {(["pendente", "em_andamento", "concluida"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => onStatusChange(tarefa.id, s)}
                                className={`
                                  flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all
                                  ${tarefa.status === s
                                    ? s === "concluida"
                                      ? "bg-green-500/20 text-green-300"
                                      : s === "em_andamento"
                                        ? "bg-blue-500/20 text-blue-300"
                                        : "bg-foreground/10 text-foreground/60"
                                    : "text-muted-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"
                                  }
                                `}
                              >
                                {statusIcons[s]}
                              </button>
                            ))}
                            <div className="flex-1 flex items-center gap-1 ml-auto justify-end">
                              <div className="w-10 h-1 bg-foreground/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all"
                                  style={{ width: `${tarefa.progresso || 0}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-muted-foreground">{tarefa.progresso || 0}%</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            );
          })}

          {/* "Sem prazo" column at the end */}
          {noDateTasks.length > 0 && (
            <div className="flex items-stretch">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center w-52 flex-shrink-0"
              >
                <div className="relative flex flex-col items-center mb-3">
                  <div className="px-2 py-1 rounded-lg text-[11px] font-bold border bg-card/60 text-muted-foreground border-foreground/10">
                    Sem prazo
                  </div>
                  <span className="text-[9px] mt-0.5 text-muted-foreground/50">—</span>
                </div>
                <div className="relative w-full flex items-center justify-center mb-3">
                  <div className="absolute inset-x-0 h-px top-1/2 bg-foreground/10" />
                  <div className="relative z-10 w-2.5 h-2.5 rounded-full border-2 bg-foreground/20 border-foreground/30" />
                </div>
                <div className="space-y-1.5 px-1.5 w-full">
                  {noDateTasks.map((tarefa, ti) => (
                    <motion.div
                      key={tarefa.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + ti * 0.02 }}
                      className="group relative rounded-lg border p-2 cursor-default bg-card/50 backdrop-blur-sm hover:border-red-500/30 hover:shadow-md transition-all duration-200 border-foreground/10"
                    >
                      <div className="flex items-start gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${prioridadeDot[tarefa.prioridade]}`} />
                        <p className="text-xs font-medium leading-tight line-clamp-2 flex-1 min-w-0 text-foreground">{tarefa.titulo}</p>
                        <button onClick={() => onDelete(tarefa.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded transition-all flex-shrink-0">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-1">
                        <Building2 className="w-2.5 h-2.5" />
                        {getEmpresaNome(tarefa.empresaId)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
