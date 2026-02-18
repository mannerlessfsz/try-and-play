import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Tarefa, prioridadeColors } from "@/types/task";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2, FileText, Trash2, CheckCircle2, Circle, Timer,
  Search, Download, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, X, ChevronDown,
  Flame, Clock, Sparkles
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
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
  pendente: <Circle className="w-3 h-3" />,
  em_andamento: <Timer className="w-3 h-3" />,
  concluida: <CheckCircle2 className="w-3 h-3" />,
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
  urgente: "shadow-purple-500/40",
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

function getDaysOfMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const count = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= count; i++) days.push(toDateKey(new Date(year, month, i)));
  return days;
}

function getWeekDays(refDate: Date): string[] {
  const day = refDate.getDay();
  const start = new Date(refDate);
  start.setDate(start.getDate() - day);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(toDateKey(d));
  }
  return days;
}

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

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

function exportICS(tarefas: Tarefa[], getEmpresaNome: (id: string) => string) {
  const events = tarefas.filter(t => t.prazoEntrega).map(t => {
    const dt = t.prazoEntrega!.replace(/-/g, "");
    return [
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${dt}`,
      `DTEND;VALUE=DATE:${dt}`,
      `SUMMARY:${t.titulo}`,
      `DESCRIPTION:Empresa: ${getEmpresaNome(t.empresaId)} | Status: ${t.status} | Prioridade: ${t.prioridade}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TaskVault//PT", ...events, "END:VCALENDAR"].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "tarefas_timeline.ics"; a.click();
  URL.revokeObjectURL(url);
}

// ── Animated Timeline Node ──
function TimelineNode({ dateStr, tasks, isSelected, isToday: today, side, index, onClick, expandedTaskId, setExpandedTaskId, getEmpresaNome, onDelete, onStatusChange, onUploadArquivo, onDeleteArquivo }: {
  dateStr: string;
  tasks: Tarefa[];
  isSelected: boolean;
  isToday: boolean;
  side: "left" | "right";
  index: number;
  onClick: () => void;
  expandedTaskId: string | null;
  setExpandedTaskId: (id: string | null) => void;
  getEmpresaNome: (id: string) => string;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Tarefa["status"]) => void;
  onUploadArquivo?: (tarefaId: string, file: File) => Promise<void>;
  onDeleteArquivo?: (arquivoId: string, url?: string) => Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const count = tasks.length;
  const allDone = count > 0 && tasks.every(t => t.status === "concluida");
  const hasUrgent = tasks.some(t => t.prioridade === "alta" || t.prioridade === "urgente");
  const overdue = dateStr !== "__no_date__" && isOverdue(dateStr);
  const hasInProgress = tasks.some(t => t.status === "em_andamento");
  const date = dateStr !== "__no_date__" ? new Date(dateStr + "T12:00:00") : null;
  const completionRate = count > 0 ? tasks.filter(t => t.status === "concluida").length / count : 0;

  // Node color
  let nodeColor = "from-foreground/20 to-foreground/10";
  let ringColor = "ring-foreground/15";
  let glowClass = "";
  if (isSelected) { nodeColor = "from-primary to-primary/70"; ringColor = "ring-primary/50"; glowClass = "shadow-[0_0_20px_rgba(var(--primary-rgb,239,68,68),0.4)]"; }
  else if (today) { nodeColor = "from-primary to-primary/60"; ringColor = "ring-primary/40"; glowClass = "shadow-[0_0_15px_rgba(var(--primary-rgb,239,68,68),0.3)]"; }
  else if (allDone) { nodeColor = "from-green-500 to-emerald-600"; ringColor = "ring-green-500/40"; }
  else if (overdue && hasUrgent) { nodeColor = "from-red-500 to-rose-600"; ringColor = "ring-red-500/40"; glowClass = "shadow-[0_0_12px_rgba(239,68,68,0.3)]"; }
  else if (overdue) { nodeColor = "from-amber-500 to-yellow-600"; ringColor = "ring-amber-500/30"; }
  else if (hasInProgress) { nodeColor = "from-blue-500 to-cyan-600"; ringColor = "ring-blue-500/30"; }
  else if (count > 0) { nodeColor = "from-foreground/40 to-foreground/25"; ringColor = "ring-foreground/20"; }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative flex items-start gap-0 ${side === "right" ? "flex-row" : "flex-row-reverse"} mb-2`}
    >
      {/* Card side */}
      <div className={`flex-1 ${side === "right" ? "pr-6" : "pl-6"}`}>
        {count > 0 && (
          <motion.div
            layout
            onClick={onClick}
            className={`
              relative cursor-pointer rounded-2xl border backdrop-blur-md p-3
              transition-all duration-300 group
              ${isSelected
                ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10"
                : "border-foreground/8 bg-card/40 hover:bg-card/60 hover:border-foreground/15 hover:shadow-md"
              }
            `}
          >
            {/* Decorative gradient strip */}
            <div className={`absolute ${side === "right" ? "right-0 top-4 w-1 h-8 rounded-l-full" : "left-0 top-4 w-1 h-8 rounded-r-full"} bg-gradient-to-b ${nodeColor} opacity-60`} />

            {/* Date header */}
            <div className="flex items-center gap-2 mb-2">
              {date && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-foreground/90 leading-none tabular-nums">
                    {date.getDate()}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground/60 tracking-wider leading-none">
                      {date.toLocaleDateString("pt-BR", { weekday: "short" })}
                    </span>
                    <span className="text-[8px] text-muted-foreground/40 leading-tight">
                      {date.toLocaleDateString("pt-BR", { month: "short" })}
                    </span>
                  </div>
                </div>
              )}
              {dateStr === "__no_date__" && (
                <span className="text-xs font-semibold text-muted-foreground/50">Sem prazo</span>
              )}

              <div className="flex items-center gap-1 ml-auto">
                {today && (
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-primary/20 text-primary border border-primary/30 animate-pulse">
                    HOJE
                  </span>
                )}
                {overdue && !allDone && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                    <Flame className="w-2.5 h-2.5" /> ATRASO
                  </span>
                )}
                <span className={`
                  min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold
                  ${allDone ? "bg-green-500/20 text-green-400" : "bg-foreground/10 text-foreground/60"}
                `}>
                  {count}
                </span>
              </div>
            </div>

            {/* Completion arc */}
            {count > 0 && (
              <div className="w-full h-1 rounded-full bg-foreground/5 mb-2 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${allDone ? "from-green-500 to-emerald-400" : "from-primary to-primary/50"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate * 100}%` }}
                  transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                />
              </div>
            )}

            {/* Task preview chips */}
            <div className="space-y-1">
              {tasks.slice(0, isSelected ? tasks.length : 3).map((t) => (
                <TaskChip
                  key={t.id}
                  tarefa={t}
                  getEmpresaNome={getEmpresaNome}
                  isExpanded={expandedTaskId === t.id}
                  onToggle={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onUploadArquivo={onUploadArquivo}
                  onDeleteArquivo={onDeleteArquivo}
                />
              ))}
              {!isSelected && tasks.length > 3 && (
                <p className="text-[9px] text-muted-foreground/40 text-center pt-1">
                  +{tasks.length - 3} tarefa{tasks.length - 3 > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Empty date — subtle indicator */}
        {count === 0 && date && (
          <div className="h-2" />
        )}
      </div>

      {/* Central spine node */}
      <div className="relative flex flex-col items-center z-10 flex-shrink-0" style={{ width: 40 }}>
        <button
          onClick={onClick}
          className={`
            relative rounded-full ring-2 transition-all duration-300 cursor-pointer
            ${ringColor} ${glowClass}
            ${isSelected ? "scale-125" : "hover:scale-110"}
            ${count > 0 ? "w-5 h-5" : "w-2.5 h-2.5"}
          `}
        >
          <div className={`w-full h-full rounded-full bg-gradient-to-br ${nodeColor}`} />
          {/* Orbital dots for priority distribution */}
          {count > 0 && hasUrgent && !isSelected && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-40" />
          )}
          {today && !isSelected && (
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse border border-background" />
          )}
        </button>
      </div>

      {/* Spacer for the other side */}
      <div className="flex-1" />
    </motion.div>
  );
}

// ── Task Chip ──
function TaskChip({ tarefa, getEmpresaNome, isExpanded, onToggle, onDelete, onStatusChange, onUploadArquivo, onDeleteArquivo }: {
  tarefa: Tarefa;
  getEmpresaNome: (id: string) => string;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Tarefa["status"]) => void;
  onUploadArquivo?: (tarefaId: string, file: File) => Promise<void>;
  onDeleteArquivo?: (arquivoId: string, url?: string) => Promise<void>;
}) {
  return (
    <motion.div
      layout
      className={`
        rounded-xl border transition-all overflow-hidden
        ${tarefa.status === "concluida" ? "opacity-50" : ""}
        ${isExpanded
          ? "border-primary/30 bg-primary/5 shadow-md shadow-primary/5"
          : `border-foreground/6 bg-background/40 hover:border-foreground/12 ${prioridadeGlow[tarefa.prioridade]} hover:shadow-md`
        }
      `}
    >
      <div
        className="flex items-center gap-2 p-2 cursor-pointer group"
        onClick={onToggle}
      >
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${prioridadeDot[tarefa.prioridade]}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-medium truncate leading-snug ${tarefa.status === "concluida" ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {tarefa.titulo}
          </p>
          <span className="text-[9px] text-muted-foreground/60 flex items-center gap-0.5 truncate">
            <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
            {getEmpresaNome(tarefa.empresaId)}
          </span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {(["pendente", "em_andamento", "concluida"] as const).map((s) => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); onStatusChange(tarefa.id, s); }}
              className={`p-0.5 rounded transition-all ${
                tarefa.status === s
                  ? s === "concluida" ? "text-green-400"
                    : s === "em_andamento" ? "text-blue-400"
                      : "text-foreground/50"
                  : "text-muted-foreground/20 hover:text-foreground/50"
              }`}
            >
              {statusIcons[s]}
            </button>
          ))}
        </div>
        {/* Tiny progress arc */}
        <div className="w-8 h-1 rounded-full bg-foreground/5 overflow-hidden flex-shrink-0">
          <div className="h-full bg-gradient-to-r from-primary/80 to-primary/40 rounded-full transition-all" style={{ width: `${tarefa.progresso || 0}%` }} />
        </div>
        <ChevronDown className={`w-3 h-3 text-muted-foreground/30 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-foreground/8"
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
}

// ── Main Component ──
export function TaskTimelineView({ tarefas, getEmpresaNome, onDelete, onStatusChange, onTaskClick, onUploadArquivo, onDeleteArquivo }: TaskTimelineViewProps) {
  const now = new Date();
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [weekRef, setWeekRef] = useState(now);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Tarefa[]> = {};
    tarefas.forEach((t) => {
      const key = t.prazoEntrega || "__no_date__";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tarefas]);

  const days = useMemo(() =>
    viewMode === "month" ? getDaysOfMonth(currentYear, currentMonth) : getWeekDays(weekRef),
    [viewMode, currentYear, currentMonth, weekRef]
  );

  // Filter to only dates with tasks + today
  const relevantDates = useMemo(() => {
    const todayKey = toDateKey(now);
    const dates = days.filter(d => (tasksByDate[d] && tasksByDate[d].length > 0) || isToday(d));
    // Add no-date at end if exists
    if (tasksByDate["__no_date__"]?.length) dates.push("__no_date__");
    return dates;
  }, [days, tasksByDate]);

  // Search filter
  const filterTask = useCallback((t: Tarefa) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.titulo.toLowerCase().includes(q) || getEmpresaNome(t.empresaId).toLowerCase().includes(q);
  }, [searchQuery, getEmpresaNome]);

  const filteredTasksByDate = useMemo(() => {
    const map: Record<string, Tarefa[]> = {};
    for (const [key, tasks] of Object.entries(tasksByDate)) {
      const filtered = tasks.filter(filterTask);
      if (filtered.length > 0) map[key] = filtered;
    }
    return map;
  }, [tasksByDate, filterTask]);

  // Dates to show in the vertical timeline
  const visibleDates = useMemo(() => {
    if (searchQuery) {
      return Object.keys(filteredTasksByDate).sort();
    }
    return relevantDates;
  }, [searchQuery, filteredTasksByDate, relevantDates]);

  const noDateTasks = filteredTasksByDate["__no_date__"] || [];

  const goNext = () => {
    if (viewMode === "month") {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
      else setCurrentMonth(m => m + 1);
    } else {
      const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d);
    }
    setSelectedDate(null);
  };
  const goPrev = () => {
    if (viewMode === "month") {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
      else setCurrentMonth(m => m - 1);
    } else {
      const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d);
    }
    setSelectedDate(null);
  };
  const goToday = () => {
    const n = new Date();
    setCurrentYear(n.getFullYear()); setCurrentMonth(n.getMonth()); setWeekRef(n);
    setSelectedDate(toDateKey(n));
  };

  // Stats
  const totalInView = visibleDates.reduce((sum, d) => sum + (filteredTasksByDate[d]?.length || 0), 0);
  const completedInView = visibleDates.reduce((sum, d) => {
    return sum + (filteredTasksByDate[d]?.filter(t => t.status === "concluida").length || 0);
  }, 0);

  return (
    <div className="space-y-3">
      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button onClick={goToday} className="text-xs font-semibold text-foreground/80 hover:text-foreground px-2 min-w-[140px] text-center capitalize">
            {viewMode === "month"
              ? formatMonthLabel(currentYear, currentMonth)
              : `${new Date(days[0] + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${new Date(days[6] + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
            }
          </button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex bg-card/50 rounded-md p-0.5 border border-foreground/10">
          <button onClick={() => { setViewMode("month"); setSelectedDate(null); }} className={`px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1 ${viewMode === "month" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarDays className="w-3 h-3" /> Mês
          </button>
          <button onClick={() => { setViewMode("week"); setSelectedDate(null); }} className={`px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1 ${viewMode === "week" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarRange className="w-3 h-3" /> Semana
          </button>
        </div>

        <div className="relative flex-1 max-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefa..."
            className="h-7 pl-7 pr-7 text-xs bg-card/50 border-foreground/10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Stats pill */}
        <div className="flex items-center gap-2 ml-auto text-[10px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/60 border border-foreground/8">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-foreground/70 font-medium">{totalInView}</span>
            <span className="text-muted-foreground/40">|</span>
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className="text-green-400/80 font-medium">{completedInView}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => exportCSV(tarefas, getEmpresaNome)}>
              <Download className="w-3 h-3" /> CSV
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => exportICS(tarefas, getEmpresaNome)}>
              <Download className="w-3 h-3" /> ICS
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Vertical Flowing Timeline ─── */}
      <div className="relative">
        {/* Central spine — glowing animated gradient line */}
        {visibleDates.length > 0 && (
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px">
            <div className="w-full h-full bg-gradient-to-b from-primary/30 via-foreground/10 to-transparent" />
            {/* Animated pulse traveling down */}
            <motion.div
              className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-primary/40 to-transparent"
              animate={{ top: ["0%", "100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.4 }}
            />
          </div>
        )}

        {/* Timeline nodes */}
        <div className="relative py-4">
          {visibleDates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-card/50 border border-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground/50 font-medium">
                {searchQuery ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa neste período"}
              </p>
              <p className="text-[10px] text-muted-foreground/30 mt-1">
                {searchQuery ? "Tente outro termo de busca" : "As tarefas aparecerão aqui ao serem criadas"}
              </p>
            </motion.div>
          ) : (
            visibleDates.map((dateStr, i) => {
              const tasks = filteredTasksByDate[dateStr] || [];
              const side: "left" | "right" = i % 2 === 0 ? "left" : "right";

              // For dates with no tasks (like today with no tasks), show a minimal node
              if (tasks.length === 0 && isToday(dateStr)) {
                return (
                  <motion.div
                    key={dateStr}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative flex items-center justify-center mb-2"
                  >
                    <div className="relative z-10 w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary/60 ring-2 ring-primary/40 shadow-[0_0_12px_rgba(var(--primary-rgb,239,68,68),0.3)]">
                      <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse border border-background" />
                    </div>
                    <span className="absolute left-1/2 -translate-x-1/2 mt-10 text-[8px] font-bold text-primary/60 uppercase tracking-widest">
                      Hoje
                    </span>
                  </motion.div>
                );
              }

              if (tasks.length === 0) return null;

              return (
                <TimelineNode
                  key={dateStr}
                  dateStr={dateStr}
                  tasks={tasks}
                  isSelected={selectedDate === dateStr}
                  isToday={dateStr !== "__no_date__" && isToday(dateStr)}
                  side={side}
                  index={i}
                  onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
                  expandedTaskId={selectedDate === dateStr ? expandedTaskId : null}
                  setExpandedTaskId={setExpandedTaskId}
                  getEmpresaNome={getEmpresaNome}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onUploadArquivo={onUploadArquivo}
                  onDeleteArquivo={onDeleteArquivo}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
