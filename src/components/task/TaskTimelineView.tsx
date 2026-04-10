import { useState, useMemo, useRef } from "react";
import { Tarefa, prioridadeColors } from "@/types/task";
import {
  Building2, FileText, Trash2, CheckCircle2, Circle, Timer,
  Search, Download, X, ChevronDown, Flame, Clock, Sparkles,
  Calendar, AlertTriangle, ArrowUp, Filter, LayoutList, ChevronLeft, ChevronRight
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

function getDaysUntilDeadline(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T12:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ── Main Component ──
export function TaskTimelineView({ tarefas, getEmpresaNome, onDelete, onStatusChange, onTaskClick, onUploadArquivo, onDeleteArquivo }: TaskTimelineViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  // Current viewing month
  const viewDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const todayKey = toDateKey(new Date());

  const monthLabel = viewDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Filter tasks
  const filteredTarefas = useMemo(() => {
    let list = tarefas;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.titulo.toLowerCase().includes(q) || getEmpresaNome(t.empresaId).toLowerCase().includes(q));
    }
    if (!showCompleted) list = list.filter(t => t.status !== "concluida");
    switch (filterMode) {
      case "pending": list = list.filter(t => t.status === "pendente"); break;
      case "overdue": list = list.filter(t => t.prazoEntrega && isOverdue(t.prazoEntrega) && t.status !== "concluida"); break;
      case "urgent": list = list.filter(t => t.prioridade === "alta" || t.prioridade === "urgente"); break;
    }
    return list;
  }, [tarefas, searchQuery, filterMode, showCompleted, getEmpresaNome]);

  // Build task map for current month
  const taskMap = useMemo(() => {
    const map: Record<string, Tarefa[]> = {};
    const prioOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
    filteredTarefas.forEach(t => {
      const key = t.prazoEntrega || "__no_date__";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => (prioOrder[a.prioridade] ?? 9) - (prioOrder[b.prioridade] ?? 9)));
    return map;
  }, [filteredTarefas]);

  // Generate calendar grid cells
  const calendarCells = useMemo(() => {
    const cells: { dateKey: string | null; day: number; tasks: Tarefa[] }[] = [];
    // Leading empty cells
    for (let i = 0; i < firstDayOfWeek; i++) cells.push({ dateKey: null, day: 0, tasks: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toDateKey(new Date(year, month, d));
      cells.push({ dateKey: key, day: d, tasks: taskMap[key] || [] });
    }
    return cells;
  }, [year, month, daysInMonth, firstDayOfWeek, taskMap]);

  // Stats
  const stats = useMemo(() => {
    const total = tarefas.length;
    const completed = tarefas.filter(t => t.status === "concluida").length;
    const overdue = tarefas.filter(t => t.prazoEntrega && isOverdue(t.prazoEntrega) && t.status !== "concluida").length;
    const inProgress = tarefas.filter(t => t.status === "em_andamento").length;
    return { total, completed, overdue, inProgress, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tarefas]);

  // Tasks for selected date
  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    return taskMap[selectedDate] || [];
  }, [selectedDate, taskMap]);

  // No-date tasks
  const noDateTasks = taskMap["__no_date__"] || [];

  const getTileStyle = (dateKey: string, tasks: Tarefa[]) => {
    const today = isToday(dateKey);
    const hasOverdue = tasks.some(t => t.prazoEntrega && isOverdue(t.prazoEntrega) && t.status !== "concluida");
    const allDone = tasks.length > 0 && tasks.every(t => t.status === "concluida");
    const hasUrgent = tasks.some(t => t.prioridade === "urgente" || t.prioridade === "alta");

    if (today) return "ring-2 ring-primary/50 bg-primary/8";
    if (allDone) return "bg-green-500/8 border-green-500/20";
    if (hasOverdue) return "bg-red-500/8 border-red-500/20";
    if (hasUrgent) return "bg-amber-500/5 border-amber-500/15";
    if (tasks.length > 0) return "bg-card/80 border-foreground/12";
    return "bg-card/30 border-foreground/6";
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

      {/* ─── Month Navigation ─── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="p-2 rounded-lg hover:bg-card/60 text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-bold text-foreground capitalize">{monthLabel}</h2>
          {monthOffset !== 0 && (
            <button
              onClick={() => setMonthOffset(0)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
            >
              Hoje
            </button>
          )}
        </div>
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          className="p-2 rounded-lg hover:bg-card/60 text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ─── Bento Grid Calendar ─── */}
      <div className="rounded-2xl border border-foreground/8 bg-card/40 p-3 backdrop-blur-sm">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {WEEKDAYS.map((wd, i) => (
            <div
              key={wd}
              className={`text-center text-[10px] font-semibold uppercase tracking-wider py-1 ${i === 0 || i === 6 ? "text-muted-foreground/30" : "text-muted-foreground/50"}`}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Day tiles */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell, idx) => {
            if (!cell.dateKey) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const today = isToday(cell.dateKey);
            const selected = selectedDate === cell.dateKey;
            const isWeekend = [0, 6].includes(new Date(cell.dateKey + "T12:00:00").getDay());
            const taskCount = cell.tasks.length;
            const hasOverdueTask = cell.tasks.some(t => t.prazoEntrega && isOverdue(t.prazoEntrega) && t.status !== "concluida");
            const allDone = taskCount > 0 && cell.tasks.every(t => t.status === "concluida");
            const hasUrgent = cell.tasks.some(t => t.prioridade === "urgente");
            const completedCount = cell.tasks.filter(t => t.status === "concluida").length;

            return (
              <motion.button
                key={cell.dateKey}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedDate(prev => prev === cell.dateKey ? null : cell.dateKey!)}
                className={`
                  relative rounded-xl border p-1.5 transition-all duration-200 text-left
                  min-h-[72px] flex flex-col justify-between overflow-hidden
                  ${selected ? "ring-2 ring-primary border-primary/40 bg-primary/10 shadow-lg shadow-primary/10" : getTileStyle(cell.dateKey, cell.tasks)}
                  ${!selected && taskCount > 0 ? "hover:shadow-md hover:border-foreground/20" : "hover:bg-card/50"}
                  ${isWeekend && taskCount === 0 ? "opacity-50" : ""}
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-between">
                  <span className={`
                    text-xs font-bold tabular-nums leading-none
                    ${today ? "text-primary" : selected ? "text-primary" : "text-foreground/70"}
                  `}>
                    {cell.day}
                  </span>
                  {today && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                  {hasOverdueTask && !today && (
                    <Flame className="w-2.5 h-2.5 text-red-500" />
                  )}
                </div>

                {/* Task indicators */}
                {taskCount > 0 ? (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {/* Priority dots row */}
                    <div className="flex items-center gap-0.5 flex-wrap">
                      {cell.tasks.slice(0, 5).map((t, ti) => (
                        <div
                          key={ti}
                          className={`
                            w-2 h-2 rounded-full flex-shrink-0
                            ${t.status === "concluida" ? "bg-green-500/60" : prioridadeDot[t.prioridade]}
                          `}
                        />
                      ))}
                      {taskCount > 5 && (
                        <span className="text-[8px] text-muted-foreground/50 font-medium">+{taskCount - 5}</span>
                      )}
                    </div>

                    {/* Mini progress bar */}
                    {taskCount > 0 && (
                      <div className="w-full h-0.5 bg-foreground/8 rounded-full overflow-hidden mt-0.5">
                        <div
                          className={`h-full rounded-full transition-all ${allDone ? "bg-green-500" : "bg-primary"}`}
                          style={{ width: `${taskCount > 0 ? (completedCount / taskCount) * 100 : 0}%` }}
                        />
                      </div>
                    )}

                    {/* Count badge */}
                    <span className={`
                      text-[9px] font-semibold mt-0.5
                      ${allDone ? "text-green-400" : hasOverdueTask ? "text-red-400" : "text-muted-foreground/50"}
                    `}>
                      {completedCount}/{taskCount}
                    </span>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}

                {/* Urgent glow effect */}
                {hasUrgent && !allDone && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ─── Selected Day Drawer ─── */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm p-4">
              {/* Day header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold
                    ${isToday(selectedDate) ? "bg-primary text-primary-foreground" :
                      isOverdue(selectedDate) ? "bg-red-500/15 text-red-400 border border-red-500/20" :
                      "bg-foreground/10 text-foreground/80"}
                  `}>
                    {new Date(selectedDate + "T12:00:00").getDate()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground capitalize">
                      {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/50">
                      {selectedTasks.length === 0 ? "Nenhuma tarefa agendada" :
                        `${selectedTasks.length} tarefa${selectedTasks.length > 1 ? "s" : ""} · ${selectedTasks.filter(t => t.status === "concluida").length} concluída${selectedTasks.filter(t => t.status === "concluida").length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1.5 rounded-lg hover:bg-foreground/10 text-muted-foreground/40 hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks list */}
              {selectedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/30">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Dia livre</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTasks.map((tarefa, ti) => {
                    const isExpanded = expandedTaskId === tarefa.id;
                    const isDone = tarefa.status === "concluida";
                    const isTaskOverdue = tarefa.prazoEntrega && isOverdue(tarefa.prazoEntrega) && !isDone;

                    return (
                      <motion.div
                        key={tarefa.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: ti * 0.05, duration: 0.3 }}
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
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── No-date tasks ─── */}
      {noDateTasks.length > 0 && !selectedDate && (
        <div className="rounded-2xl border border-foreground/8 bg-card/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            <h3 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Sem prazo definido</h3>
            <span className="text-[10px] text-muted-foreground/40 ml-auto">{noDateTasks.length}</span>
          </div>
          <div className="space-y-1.5">
            {noDateTasks.slice(0, 5).map(t => (
              <div
                key={t.id}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-card/50 border border-foreground/6 hover:bg-card/70 transition-colors cursor-pointer"
                onClick={() => onTaskClick?.(t.id)}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${prioridadeDot[t.prioridade]}`} />
                <span className={`text-xs flex-1 truncate ${t.status === "concluida" ? "line-through text-muted-foreground/50" : "text-foreground/80"}`}>
                  {t.titulo}
                </span>
                <span className="text-[10px] text-muted-foreground/40">{getEmpresaNome(t.empresaId)}</span>
              </div>
            ))}
            {noDateTasks.length > 5 && (
              <p className="text-[10px] text-muted-foreground/30 text-center pt-1">
                +{noDateTasks.length - 5} tarefas sem prazo
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
