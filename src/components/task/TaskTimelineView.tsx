import { useState, useMemo, useCallback } from "react";
import { Tarefa, prioridadeColors } from "@/types/task";
import {
  Building2, FileText, Trash2, CheckCircle2, Circle, Timer,
  Search, Download, X, ChevronDown, Flame, Clock, Sparkles,
  Calendar, AlertTriangle, ArrowUp, Filter, LayoutList
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExpandedTaskCard } from "@/components/task/ExpandedTaskCard";

interface TaskTimelineViewProps {
  tarefas: Tarefa[];
  getEmpresaNome: (id: string) => string;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Tarefa["status"]) => void;
  onTaskClick?: (tarefaId: string) => void;
  onUploadArquivo?: (tarefaId: string, file: File) => Promise<void>;
  onDeleteArquivo?: (arquivoId: string, url?: string) => Promise<void>;
}

const statusIcons = {
  pendente: <Circle className="w-3.5 h-3.5" />,
  em_andamento: <Timer className="w-3.5 h-3.5" />,
  concluida: <CheckCircle2 className="w-3.5 h-3.5" />,
};

const statusLabels = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const prioridadeDot: Record<string, string> = {
  baixa: "bg-green-500",
  media: "bg-yellow-500",
  alta: "bg-red-500",
  urgente: "bg-purple-500",
};

const prioridadeGlow: Record<string, string> = {
  baixa: "shadow-green-500/20",
  media: "shadow-yellow-500/20",
  alta: "shadow-red-500/30",
  urgente: "shadow-purple-500/30",
};

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isOverdue(dateStr: string): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T12:00:00") < today;
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr + "T12:00:00").toDateString() === new Date().toDateString();
}

function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Date(dateStr + "T12:00:00").toDateString() === tomorrow.toDateString();
}

function getDaysUntilDeadline(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T12:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateLabel(dateStr: string): string {
  if (isToday(dateStr)) return "Hoje";
  if (isTomorrow(dateStr)) return "Amanhã";
  const d = new Date(dateStr + "T12:00:00");
  const days = getDaysUntilDeadline(dateStr);
  if (days < 0) return `${Math.abs(days)} dia${Math.abs(days) > 1 ? "s" : ""} atrás`;
  if (days <= 7) return d.toLocaleDateString("pt-BR", { weekday: "long" });
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

type FilterMode = "all" | "pending" | "overdue" | "urgent";

function exportCSV(tarefas: Tarefa[], getEmpresaNome: (id: string) => string) {
  const header = "Título,Empresa,Prioridade,Status,Prazo Entrega,Progresso";
  const rows = tarefas.map(t =>
    [t.titulo, getEmpresaNome(t.empresaId), t.prioridade, t.status, t.prazoEntrega || "", `${t.progresso || 0}%`]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "tarefas_timeline.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ──
export function TaskTimelineView({ tarefas, getEmpresaNome, onDelete, onStatusChange, onTaskClick, onUploadArquivo, onDeleteArquivo }: TaskTimelineViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showCompleted, setShowCompleted] = useState(true);

  // Filter tasks
  const filteredTarefas = useMemo(() => {
    let list = tarefas;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.titulo.toLowerCase().includes(q) || getEmpresaNome(t.empresaId).toLowerCase().includes(q));
    }

    if (!showCompleted) {
      list = list.filter(t => t.status !== "concluida");
    }

    switch (filterMode) {
      case "pending": list = list.filter(t => t.status === "pendente"); break;
      case "overdue": list = list.filter(t => t.prazoEntrega && isOverdue(t.prazoEntrega) && t.status !== "concluida"); break;
      case "urgent": list = list.filter(t => t.prioridade === "alta" || t.prioridade === "urgente"); break;
    }

    return list;
  }, [tarefas, searchQuery, filterMode, showCompleted, getEmpresaNome]);

  // Generate a fixed 30-day window (7 past + today + 22 future) and merge tasks into it
  const groupedByDate = useMemo(() => {
    // Build task map
    const taskMap: Record<string, Tarefa[]> = {};
    filteredTarefas.forEach(t => {
      const key = t.prazoEntrega || "__no_date__";
      if (!taskMap[key]) taskMap[key] = [];
      taskMap[key].push(t);
    });

    // Sort tasks within each group by priority
    const prioOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
    Object.values(taskMap).forEach(arr => arr.sort((a, b) => (prioOrder[a.prioridade] ?? 9) - (prioOrder[b.prioridade] ?? 9)));

    // Generate 30-day calendar window
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 7);

    const calendarDays: { dateKey: string; tasks: Tarefa[] }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = toDateKey(d);
      calendarDays.push({ dateKey: key, tasks: taskMap[key] || [] });
    }

    // Add any task dates outside the window (overdue beyond 7 days)
    const windowStart = calendarDays[0].dateKey;
    const windowEnd = calendarDays[calendarDays.length - 1].dateKey;
    const extraDates = Object.keys(taskMap)
      .filter(k => k !== "__no_date__" && (k < windowStart || k > windowEnd))
      .sort();

    const beforeWindow = extraDates.filter(k => k < windowStart).map(k => ({ dateKey: k, tasks: taskMap[k] }));
    const afterWindow = extraDates.filter(k => k > windowEnd).map(k => ({ dateKey: k, tasks: taskMap[k] }));

    const result = [...beforeWindow, ...calendarDays, ...afterWindow];

    // Add no-date tasks at the end
    if (taskMap["__no_date__"]?.length) {
      result.push({ dateKey: "__no_date__", tasks: taskMap["__no_date__"] });
    }

    return result;
  }, [filteredTarefas]);

  // Stats
  const stats = useMemo(() => {
    const total = tarefas.length;
    const completed = tarefas.filter(t => t.status === "concluida").length;
    const overdue = tarefas.filter(t => t.prazoEntrega && isOverdue(t.prazoEntrega) && t.status !== "concluida").length;
    const inProgress = tarefas.filter(t => t.status === "em_andamento").length;
    return { total, completed, overdue, inProgress, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tarefas]);

  const getDateGroupStyle = (dateKey: string, tasks: Tarefa[]) => {
    if (dateKey === "__no_date__") return { accent: "border-muted-foreground/20", dot: "bg-muted-foreground/40", line: "from-muted-foreground/20 via-muted-foreground/10 to-transparent", badge: "bg-muted/50 text-muted-foreground" };
    const allDone = tasks.every(t => t.status === "concluida");
    if (allDone) return { accent: "border-green-500/40", dot: "bg-green-500", line: "from-green-500/30 via-green-500/10 to-transparent", badge: "bg-green-500/15 text-green-400" };
    if (isOverdue(dateKey)) return { accent: "border-red-500/40", dot: "bg-red-500", line: "from-red-500/30 via-red-500/10 to-transparent", badge: "bg-red-500/15 text-red-400" };
    if (isToday(dateKey)) return { accent: "border-primary/40", dot: "bg-primary", line: "from-primary/30 via-primary/10 to-transparent", badge: "bg-primary/15 text-primary" };
    if (isTomorrow(dateKey)) return { accent: "border-amber-500/30", dot: "bg-amber-500", line: "from-amber-500/20 via-amber-500/10 to-transparent", badge: "bg-amber-500/15 text-amber-400" };
    return { accent: "border-foreground/15", dot: "bg-foreground/30", line: "from-foreground/15 via-foreground/5 to-transparent", badge: "bg-foreground/10 text-foreground/60" };
  };

  return (
    <div className="space-y-4">
      {/* ─── Stats Bar ─── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/60 border border-foreground/8">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground">{stats.total}</span>
              <span className="text-muted-foreground/60">total</span>
            </div>
            <div className="w-px h-4 bg-foreground/10" />
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="font-semibold text-green-400">{stats.completed}</span>
            </div>
            <div className="w-px h-4 bg-foreground/10" />
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-semibold text-blue-400">{stats.inProgress}</span>
            </div>
            {stats.overdue > 0 && (
              <>
                <div className="w-px h-4 bg-foreground/10" />
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span className="font-semibold text-red-400">{stats.overdue}</span>
                </div>
              </>
            )}
          </div>
          {/* Progress mini-bar */}
          <div className="w-20 h-1.5 bg-foreground/8 rounded-full overflow-hidden ml-2">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.rate}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground/50">{stats.rate}%</span>
        </div>
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefas..."
            className="h-9 pl-9 pr-8 text-sm bg-card/50 border-foreground/10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5">
          {([
            { id: "all" as const, label: "Todas", icon: LayoutList },
            { id: "pending" as const, label: "Pendentes", icon: Circle },
            { id: "overdue" as const, label: "Atrasadas", icon: AlertTriangle },
            { id: "urgent" as const, label: "Urgentes", icon: ArrowUp },
          ]).map(f => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              className={`
                flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filterMode === f.id
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-card/40 text-muted-foreground/60 border border-foreground/8 hover:bg-card/60 hover:text-foreground/70"}
              `}
            >
              <f.icon className="w-3 h-3" />
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowCompleted(v => !v)}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${showCompleted ? "text-muted-foreground/50 hover:text-foreground/70" : "text-primary bg-primary/10"}`}
          >
            {showCompleted ? "Ocultar concluídas" : "Mostrar concluídas"}
          </button>
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground/60" onClick={() => exportCSV(tarefas, getEmpresaNome)}>
            <Download className="w-3 h-3" /> CSV
          </Button>
        </div>
      </div>

      {/* ─── Vertical Timeline Feed ─── */}
      <div className="relative pl-8 md:pl-12">
        {/* Vertical line */}
        <div className="absolute left-[15px] md:left-[23px] top-0 bottom-0 w-px bg-gradient-to-b from-foreground/15 via-foreground/8 to-transparent" />

        <div className="space-y-1">
            {groupedByDate.map(({ dateKey, tasks }, groupIdx) => {
              const style = getDateGroupStyle(dateKey, tasks);
              const dateLabel = dateKey === "__no_date__" ? "Sem prazo" : formatDateLabel(dateKey);
              const fullDate = dateKey === "__no_date__" ? "Tarefas sem data definida" : formatFullDate(dateKey);
              const days = dateKey !== "__no_date__" ? getDaysUntilDeadline(dateKey) : null;
              const completedCount = tasks.filter(t => t.status === "concluida").length;
              const totalCount = tasks.length;
              const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

              return (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIdx * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {/* Date Header with dot on timeline */}
                  <div className="relative flex items-center gap-3 mb-3">
                    {/* Timeline dot */}
                    <div className="absolute -left-8 md:-left-12 flex items-center justify-center">
                      <div className={`w-3 h-3 rounded-full ${style.dot} ring-4 ring-background z-10`} />
                      {isToday(dateKey) && (
                        <div className="absolute w-6 h-6 rounded-full bg-primary/20 animate-ping" />
                      )}
                    </div>

                    {/* Date label */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-foreground capitalize">{dateLabel}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                        {completedCount}/{totalCount}
                      </span>
                      {dateKey !== "__no_date__" && isOverdue(dateKey) && tasks.some(t => t.status !== "concluida") && (
                        <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold">
                          <Flame className="w-2.5 h-2.5" /> Atrasado
                        </span>
                      )}
                      {dateKey !== "__no_date__" && isToday(dateKey) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold animate-pulse">
                          HOJE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 capitalize hidden sm:inline">{fullDate}</span>
                  </div>

                  {/* Completion progress for the group */}
                  {totalCount > 1 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 max-w-[200px] h-1 bg-foreground/8 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            completionRate === 100 ? "bg-green-500" :
                            dateKey !== "__no_date__" && isOverdue(dateKey) ? "bg-red-500" :
                            "bg-primary"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${completionRate}%` }}
                          transition={{ duration: 0.6, delay: groupIdx * 0.05 + 0.2 }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground/40 font-medium">{completionRate}%</span>
                    </div>
                  )}

                  {/* Task Cards */}
                  <div className="space-y-2">
                    {tasks.map((tarefa, ti) => {
                      const isExpanded = expandedTaskId === tarefa.id;
                      const isDone = tarefa.status === "concluida";
                      const isTaskOverdue = tarefa.prazoEntrega && isOverdue(tarefa.prazoEntrega) && !isDone;

                      return (
                        <motion.div
                          key={tarefa.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: groupIdx * 0.05 + ti * 0.03, duration: 0.3 }}
                          className={`
                            group relative rounded-xl border transition-all duration-200 overflow-hidden
                            ${isDone ? "opacity-60" : ""}
                            ${isExpanded
                              ? "border-primary/30 bg-card/90 shadow-lg shadow-primary/5"
                              : isTaskOverdue
                                ? "border-red-500/20 bg-card/70 hover:border-red-500/30 hover:bg-card/80 hover:shadow-md"
                                : "border-foreground/8 bg-card/60 hover:border-foreground/15 hover:bg-card/80 hover:shadow-md hover:shadow-foreground/5"
                            }
                          `}
                        >
                          {/* Priority accent strip */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${prioridadeDot[tarefa.prioridade]} rounded-l-xl`} />

                          {/* Card body */}
                          <div
                            className="flex items-start gap-3 p-3.5 pl-4 cursor-pointer"
                            onClick={() => setExpandedTaskId(prev => prev === tarefa.id ? null : tarefa.id)}
                          >
                            {/* Status button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = tarefa.status === "pendente" ? "em_andamento" : tarefa.status === "em_andamento" ? "concluida" : "pendente";
                                onStatusChange(tarefa.id, next);
                              }}
                              className={`
                                mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                ${isDone
                                  ? "border-green-500 bg-green-500 text-white"
                                  : tarefa.status === "em_andamento"
                                    ? "border-blue-500 bg-blue-500/20"
                                    : "border-foreground/20 hover:border-primary"
                                }
                              `}
                            >
                              {isDone && <CheckCircle2 className="w-3 h-3" />}
                              {tarefa.status === "em_andamento" && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {tarefa.titulo}
                                </p>
                                <ChevronDown className={`w-4 h-4 text-muted-foreground/30 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </div>

                              {/* Meta row */}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs text-muted-foreground/50 flex items-center gap-1 truncate max-w-[160px]">
                                  <Building2 className="w-3 h-3 flex-shrink-0" />
                                  {getEmpresaNome(tarefa.empresaId)}
                                </span>

                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${prioridadeColors[tarefa.prioridade]}`}>
                                  {prioridadeLabels[tarefa.prioridade]}
                                </span>

                                {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5">
                                    <FileText className="w-3 h-3" />{tarefa.arquivos.length}
                                  </span>
                                )}

                                {tarefa.responsavel && (
                                  <span className="text-[10px] text-muted-foreground/40 truncate max-w-[100px]">
                                    @{tarefa.responsavel}
                                  </span>
                                )}
                              </div>

                              {/* Progress bar */}
                              {(tarefa.progresso ?? 0) > 0 && !isDone && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex-1 max-w-[120px] h-1 bg-foreground/8 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-primary rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${tarefa.progresso}%` }}
                                      transition={{ duration: 0.5, delay: 0.1 }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground/40 font-medium">{tarefa.progresso}%</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick actions on hover */}
                          <div className="absolute top-2.5 right-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(["pendente", "em_andamento", "concluida"] as const).map(s => (
                              <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); onStatusChange(tarefa.id, s); }}
                                title={statusLabels[s]}
                                className={`p-1 rounded-md transition-all text-xs ${
                                  tarefa.status === s
                                    ? s === "concluida" ? "bg-green-500/20 text-green-400"
                                      : s === "em_andamento" ? "bg-blue-500/20 text-blue-400"
                                        : "bg-foreground/10 text-foreground/60"
                                    : "text-muted-foreground/25 hover:text-foreground/60 hover:bg-foreground/5"
                                }`}
                              >
                                {statusIcons[s]}
                              </button>
                            ))}
                          </div>

                          {/* Expanded content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="overflow-hidden border-t border-foreground/8"
                              >
                                <div className="p-4">
                                  <ExpandedTaskCard
                                    tarefa={tarefa}
                                    empresaNome={getEmpresaNome(tarefa.empresaId)}
                                    onDelete={() => onDelete(tarefa.id)}
                                    onStatusChange={(s) => onStatusChange(tarefa.id, s)}
                                    onUploadArquivo={onUploadArquivo ? (file) => onUploadArquivo(tarefa.id, file) : undefined}
                                    onDeleteArquivo={onDeleteArquivo}
                                    defaultExpanded
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Scroll to top button */}
          {groupedByDate.length > 5 && (
            <div className="flex justify-center pt-6">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-foreground/60 transition-colors px-3 py-1.5 rounded-full bg-card/40 border border-foreground/8"
              >
                <ArrowUp className="w-3 h-3" />
                Voltar ao topo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
