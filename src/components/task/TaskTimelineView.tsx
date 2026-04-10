import { useState, useMemo, useRef, useEffect } from "react";
import { Tarefa, prioridadeColors } from "@/types/task";
import {
  Building2, FileText, CheckCircle2, Circle, Timer,
  Search, Download, X, ChevronDown, Flame, Sparkles,
  Calendar, AlertTriangle, ArrowUp, LayoutList,
  ChevronLeft, ChevronRight
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

function getDayOfWeek(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function getDayNum(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDate();
}

function getMonthLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
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

const NODE_COLORS = [
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-violet-500 to-purple-500",
  "from-cyan-500 to-blue-500",
  "from-orange-500 to-amber-500",
];

// ── Main Component ──
export function TaskTimelineView({ tarefas, getEmpresaNome, onDelete, onStatusChange, onTaskClick, onUploadArquivo, onDeleteArquivo }: TaskTimelineViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Build timeline days (always show at least 7 centered on today + offset)
  const timelineDays = useMemo(() => {
    const taskMap: Record<string, Tarefa[]> = {};
    const prioOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
    filteredTarefas.forEach(t => {
      const key = t.prazoEntrega || "__no_date__";
      if (!taskMap[key]) taskMap[key] = [];
      taskMap[key].push(t);
    });
    Object.values(taskMap).forEach(arr => arr.sort((a, b) => (prioOrder[a.prioridade] ?? 9) - (prioOrder[b.prioridade] ?? 9)));

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 3 + weekOffset * 7);

    const days: { dateKey: string; tasks: Tarefa[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = toDateKey(d);
      days.push({ dateKey: key, tasks: taskMap[key] || [] });
    }

    return { days, noDateTasks: taskMap["__no_date__"] || [] };
  }, [filteredTarefas, weekOffset]);

  const stats = useMemo(() => {
    const total = tarefas.length;
    const completed = tarefas.filter(t => t.status === "concluida").length;
    const overdueCount = tarefas.filter(t => t.prazoEntrega && isOverdue(t.prazoEntrega) && t.status !== "concluida").length;
    const inProgress = tarefas.filter(t => t.status === "em_andamento").length;
    return { total, completed, overdue: overdueCount, inProgress, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tarefas]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    if (selectedDate === "__no_date__") return timelineDays.noDateTasks;
    const day = timelineDays.days.find(d => d.dateKey === selectedDate);
    return day?.tasks || [];
  }, [selectedDate, timelineDays]);

  // Auto-select today on mount
  useEffect(() => {
    const todayKey = toDateKey(new Date());
    const hasToday = timelineDays.days.some(d => d.dateKey === todayKey);
    if (hasToday && !selectedDate) {
      setSelectedDate(todayKey);
    }
  }, []);

  const goToToday = () => {
    setWeekOffset(0);
    setSelectedDate(toDateKey(new Date()));
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

      {/* ─── Horizontal Timeline Strip ─── */}
      <div className="relative">
        {/* Navigation arrows + today button */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg bg-card/60 border border-foreground/8 hover:bg-card text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={goToToday}
            className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
          >
            <Calendar className="w-3 h-3 inline mr-1" />
            Hoje
          </button>

          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1.5 rounded-lg bg-card/60 border border-foreground/8 hover:bg-card text-muted-foreground hover:text-foreground transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline nodes */}
        <div className="relative" ref={scrollRef}>
          {/* Horizontal connector line */}
          <div className="absolute top-[28px] left-[7%] right-[7%] h-0.5 bg-gradient-to-r from-foreground/5 via-foreground/15 to-foreground/5 rounded-full" />

          <div className="grid grid-cols-7 gap-1">
            {timelineDays.days.map((day, idx) => {
              const today = isToday(day.dateKey);
              const overdue = isOverdue(day.dateKey);
              const hasTasks = day.tasks.length > 0;
              const completedAll = hasTasks && day.tasks.every(t => t.status === "concluida");
              const hasOverdueTasks = hasTasks && day.tasks.some(t => t.status !== "concluida") && overdue;
              const isSelected = selectedDate === day.dateKey;
              const taskCount = day.tasks.length;
              const doneCount = day.tasks.filter(t => t.status === "concluida").length;
              const colorIdx = idx % NODE_COLORS.length;

              // Node color logic
              const nodeGradient = hasOverdueTasks
                ? "from-red-500 to-red-600"
                : completedAll
                  ? "from-green-500 to-green-600"
                  : today
                    ? "from-primary to-primary"
                    : hasTasks
                      ? NODE_COLORS[colorIdx]
                      : "";

              // Show month label on first day or month change
              const showMonth = idx === 0 || getDayNum(day.dateKey) === 1;

              return (
                <button
                  key={day.dateKey}
                  onClick={() => setSelectedDate(isSelected ? null : day.dateKey)}
                  className="flex flex-col items-center group relative"
                >
                  {/* Day of week */}
                  <span className={`text-[10px] font-medium mb-1.5 capitalize transition-colors ${
                    today ? "text-primary" : isSelected ? "text-foreground" : "text-muted-foreground/50"
                  }`}>
                    {getDayOfWeek(day.dateKey)}
                  </span>

                  {/* Central node */}
                  <div className={`
                    relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer
                    ${isSelected
                      ? hasTasks
                        ? `bg-gradient-to-br ${nodeGradient} shadow-lg scale-110 ring-2 ring-background`
                        : "bg-primary/20 ring-2 ring-primary/40 scale-110"
                      : hasTasks
                        ? `bg-gradient-to-br ${nodeGradient} shadow-md hover:scale-105 hover:shadow-lg`
                        : "bg-card/60 border border-foreground/10 hover:border-foreground/20 hover:bg-card/80"
                    }
                    ${today && !isSelected ? "ring-2 ring-primary/40" : ""}
                  `}>
                    {/* Day number */}
                    <span className={`text-base font-bold leading-none ${
                      hasTasks || isSelected ? "text-white" : "text-foreground/60"
                    }`}>
                      {getDayNum(day.dateKey)}
                    </span>

                    {/* Task count badge */}
                    {hasTasks && (
                      <span className={`text-[9px] font-semibold leading-none mt-0.5 ${
                        hasTasks ? "text-white/70" : "text-muted-foreground/40"
                      }`}>
                        {doneCount}/{taskCount}
                      </span>
                    )}

                    {/* Today indicator dot */}
                    {today && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background animate-pulse" />
                    )}

                    {/* Priority dots row */}
                    {hasTasks && !isSelected && (
                      <div className="absolute -bottom-1 flex gap-0.5">
                        {day.tasks.slice(0, 4).map((t, ti) => (
                          <div key={ti} className={`w-1.5 h-1.5 rounded-full ${prioridadeDot[t.prioridade]} ring-1 ring-background`} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Month label */}
                  {showMonth && (
                    <span className="text-[9px] text-muted-foreground/40 mt-1.5 uppercase font-semibold tracking-wider">
                      {getMonthLabel(day.dateKey)}
                    </span>
                  )}
                  {!showMonth && <span className="h-[18px]" />}

                  {/* Selection indicator triangle */}
                  {isSelected && (
                    <motion.div
                      layoutId="timeline-arrow"
                      className="mt-1"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-primary/60" />
                    </motion.div>
                  )}
                  {!isSelected && <div className="h-[10px]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* No-date tasks indicator */}
        {timelineDays.noDateTasks.length > 0 && (
          <div className="flex justify-center mt-2">
            <button
              onClick={() => setSelectedDate(selectedDate === "__no_date__" ? null : "__no_date__")}
              className={`
                text-xs px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5
                ${selectedDate === "__no_date__"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-card/50 text-muted-foreground/50 border border-foreground/8 hover:text-foreground/70"
                }
              `}
            >
              <AlertTriangle className="w-3 h-3" />
              {timelineDays.noDateTasks.length} sem prazo
            </button>
          </div>
        )}
      </div>

      {/* ─── Expanded Day Panel ─── */}
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
            <div className="rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-sm overflow-hidden">
              {/* Day header */}
              <div className="px-5 py-3 border-b border-foreground/8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedDate !== "__no_date__" ? (
                    <>
                      <div className="text-2xl font-bold text-foreground">
                        {getDayNum(selectedDate)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground capitalize">
                          {isToday(selectedDate) ? "Hoje" : new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" })}
                        </span>
                        <span className="text-[11px] text-muted-foreground/50 capitalize">
                          {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-semibold text-foreground">Tarefas sem prazo definido</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedTasks.length > 0 && (
                    <span className="text-xs text-muted-foreground/50 bg-foreground/5 px-2 py-1 rounded-md">
                      {selectedTasks.filter(t => t.status === "concluida").length}/{selectedTasks.length} concluídas
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-1 rounded-md hover:bg-foreground/5 text-muted-foreground/40 hover:text-foreground/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tasks list */}
              <div className="p-4">
                {selectedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground/40">Nenhuma tarefa para este dia</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedTasks.map((tarefa, tIdx) => {
                      const isExpanded = expandedTaskId === tarefa.id;
                      const isDone = tarefa.status === "concluida";
                      const isTaskOverdue = tarefa.prazoEntrega && isOverdue(tarefa.prazoEntrega) && !isDone;

                      return (
                        <motion.div
                          key={tarefa.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: tIdx * 0.05, duration: 0.25 }}
                          className={`
                            group relative rounded-xl border transition-all duration-200 overflow-hidden
                            ${isDone ? "opacity-50" : ""}
                            ${isExpanded
                              ? "border-primary/30 bg-primary/5 shadow-sm"
                              : isTaskOverdue
                                ? "border-red-500/15 bg-red-500/5 hover:border-red-500/25"
                                : "border-foreground/6 bg-foreground/3 hover:border-foreground/12 hover:bg-foreground/5"}
                          `}
                        >
                          {/* Priority strip */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${prioridadeDot[tarefa.prioridade]}`} />

                          <div
                            className="flex items-start gap-3 p-3 pl-4 cursor-pointer"
                            onClick={() => setExpandedTaskId(expandedTaskId === tarefa.id ? null : tarefa.id)}
                          >
                            {/* Status toggle */}
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
                                    : "border-foreground/20 hover:border-primary"}
                              `}
                            >
                              {isDone && <CheckCircle2 className="w-3 h-3" />}
                              {tarefa.status === "em_andamento" && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {tarefa.titulo}
                                </p>
                                <ChevronDown className={`w-4 h-4 text-muted-foreground/25 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1 truncate max-w-[150px]">
                                  <Building2 className="w-3 h-3 flex-shrink-0" />
                                  {getEmpresaNome(tarefa.empresaId)}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${prioridadeColors[tarefa.prioridade]}`}>
                                  {prioridadeLabels[tarefa.prioridade]}
                                </span>
                                {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground/30 flex items-center gap-0.5">
                                    <FileText className="w-3 h-3" />{tarefa.arquivos.length}
                                  </span>
                                )}
                              </div>
                              {(tarefa.progresso ?? 0) > 0 && !isDone && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex-1 max-w-[100px] h-1 bg-foreground/8 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${tarefa.progresso}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground/30">{tarefa.progresso}%</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick status on hover */}
                          <div className="absolute top-2 right-8 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(["pendente", "em_andamento", "concluida"] as const).map(s => (
                              <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); onStatusChange(tarefa.id, s); }}
                                title={statusLabels[s]}
                                className={`p-1 rounded transition-all text-xs ${
                                  tarefa.status === s
                                    ? s === "concluida" ? "bg-green-500/20 text-green-400"
                                      : s === "em_andamento" ? "bg-blue-500/20 text-blue-400"
                                        : "bg-foreground/10 text-foreground/60"
                                    : "text-muted-foreground/20 hover:text-foreground/50 hover:bg-foreground/5"
                                }`}
                              >
                                {statusIcons[s]}
                              </button>
                            ))}
                          </div>

                          {/* Expanded detail */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="overflow-hidden border-t border-foreground/6"
                              >
                                <div className="p-3">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
