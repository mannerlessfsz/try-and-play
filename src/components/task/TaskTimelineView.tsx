import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Tarefa, prioridadeColors } from "@/types/task";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Building2, FileText, Trash2, CheckCircle2, Circle, Timer,
  Search, Download, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, X, ChevronDown,
  Flame, Clock, Sparkles
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

function formatDay(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").getDate().toString();
}

function formatWeekday(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" });
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

// ── SVG Arc for completion ──
function CompletionRing({ rate, size = 40, stroke = 2.5, urgencyHue }: { rate: number; size?: number; stroke?: number; urgencyHue?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - rate);
  const gradId = `ring-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={size} height={size} className="absolute inset-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-foreground/[0.04]" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#${gradId})`} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, delay: 0.15, ease: "easeOut" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={urgencyHue || "hsl(var(--primary))"} />
          <stop offset="100%" stopColor={urgencyHue ? `${urgencyHue}66` : "hsl(var(--primary) / 0.4)"} />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Urgency helpers
function getDaysUntilDeadline(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T12:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyData(dateStr: string, tasksByDate: Record<string, Tarefa[]>) {
  const tasks = tasksByDate[dateStr] || [];
  const incomplete = tasks.filter(t => t.status !== "concluida");
  if (incomplete.length === 0) return { level: "none" as const, color: "rgba(255,255,255,0.04)", hue: "", label: "" };

  const diffDays = getDaysUntilDeadline(dateStr);

  if (diffDays < 0) return { level: "overdue" as const, color: "rgba(239,68,68,0.7)", hue: "#ef4444", label: "Atrasado" };
  if (diffDays <= 2) return { level: "critical" as const, color: "rgba(245,158,11,0.6)", hue: "#f59e0b", label: `${diffDays}d` };
  if (diffDays <= 4) return { level: "warning" as const, color: "rgba(34,197,94,0.5)", hue: "#22c55e", label: `${diffDays}d` };
  if (diffDays <= 7) return { level: "safe" as const, color: "rgba(59,130,246,0.4)", hue: "#3b82f6", label: `${diffDays}d` };
  return { level: "none" as const, color: "rgba(255,255,255,0.04)", hue: "", label: "" };
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
  const [userManuallySelected, setUserManuallySelected] = useState(false);
  const todayRef = useRef<HTMLButtonElement>(null);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Tarefa[]> = {};
    tarefas.forEach((t) => {
      const key = t.prazoEntrega || "__no_date__";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tarefas]);

  // Auto-select most relevant date
  const autoSelectedDate = useMemo(() => {
    const todayKey = toDateKey(now);
    const relevantDates: string[] = [];
    Object.entries(tasksByDate).forEach(([dateStr, tasks]) => {
      if (dateStr === "__no_date__") return;
      if (tasks.some(t => t.status !== "concluida")) relevantDates.push(dateStr);
    });
    if (relevantDates.length === 0) return null;
    relevantDates.sort();
    const overdue = relevantDates.filter(d => d < todayKey);
    const upcoming = relevantDates.filter(d => d >= todayKey);
    if (overdue.length > 0) return overdue[0];
    if (upcoming.length > 0) return upcoming[0];
    return null;
  }, [tasksByDate]);

  useEffect(() => {
    if (!userManuallySelected && autoSelectedDate) setSelectedDate(autoSelectedDate);
  }, [autoSelectedDate, userManuallySelected]);

  useEffect(() => { setUserManuallySelected(false); }, [currentMonth, currentYear, weekRef]);

  useEffect(() => {
    setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 100);
  }, [viewMode, currentMonth, currentYear]);

  const days = useMemo(() =>
    viewMode === "month" ? getDaysOfMonth(currentYear, currentMonth) : getWeekDays(weekRef),
    [viewMode, currentYear, currentMonth, weekRef]
  );

  const noDateTasks = tasksByDate["__no_date__"] || [];

  const filterTask = useCallback((t: Tarefa) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.titulo.toLowerCase().includes(q) || getEmpresaNome(t.empresaId).toLowerCase().includes(q);
  }, [searchQuery, getEmpresaNome]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    const list = selectedDate === "__no_date__" ? noDateTasks : (tasksByDate[selectedDate] || []);
    return list.filter(filterTask);
  }, [selectedDate, tasksByDate, noDateTasks, filterTask]);

  useEffect(() => {
    if (!userManuallySelected && autoSelectedDate && viewMode === "month") {
      const d = new Date(autoSelectedDate + "T12:00:00");
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [autoSelectedDate, userManuallySelected, viewMode, currentYear, currentMonth]);

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
    setUserManuallySelected(true);
  };

  // Node visual config
  const getNodeStyle = (dateStr: string) => {
    const tasks = tasksByDate[dateStr] || [];
    const selected = selectedDate === dateStr;
    const today = isToday(dateStr);
    const count = tasks.length;
    const allDone = count > 0 && tasks.every(t => t.status === "concluida");
    const hasUrgent = tasks.some(t => t.prioridade === "alta" || t.prioridade === "urgente");
    const hasInProgress = tasks.some(t => t.status === "em_andamento");
    const overdue = isOverdue(dateStr);
    const isWeekend = [0, 6].includes(new Date(dateStr + "T12:00:00").getDay());
    const completionRate = count > 0 ? tasks.filter(t => t.status === "concluida").length / count : 0;

    let bg = "bg-foreground/15";
    let ring = "ring-foreground/10";
    let glow = "";
    let textColor = isWeekend ? "text-muted-foreground/30" : "text-muted-foreground/50";
    let numColor = isWeekend ? "text-muted-foreground/25" : "text-muted-foreground/40";

    if (selected) { bg = "bg-primary"; ring = "ring-primary/50"; glow = "shadow-[0_0_16px_hsl(var(--primary)/0.4)]"; textColor = "text-primary"; numColor = "text-primary"; }
    else if (today && count === 0) { bg = "bg-primary/60"; ring = "ring-primary/40"; glow = "shadow-[0_0_10px_hsl(var(--primary)/0.25)]"; textColor = "text-primary/70"; numColor = "text-primary/80"; }
    else if (today) { bg = "bg-primary"; ring = "ring-primary/40"; glow = "shadow-[0_0_10px_hsl(var(--primary)/0.3)]"; textColor = "text-primary"; numColor = "text-primary"; }
    else if (allDone) { bg = "bg-green-500"; ring = "ring-green-500/40"; textColor = "text-green-400"; numColor = "text-green-400"; }
    else if (overdue && hasUrgent) { bg = "bg-red-500"; ring = "ring-red-500/40"; glow = "shadow-[0_0_10px_rgba(239,68,68,0.25)]"; textColor = "text-red-400"; numColor = "text-red-400"; }
    else if (overdue) { bg = "bg-amber-500"; ring = "ring-amber-500/30"; textColor = "text-amber-400"; numColor = "text-amber-400"; }
    else if (hasInProgress) { bg = "bg-blue-500"; ring = "ring-blue-500/30"; textColor = "text-blue-400"; numColor = "text-blue-400"; }
    else if (count > 0) { bg = "bg-foreground/40"; ring = "ring-foreground/20"; textColor = "text-foreground/70"; numColor = "text-foreground/60"; }

    return { bg, ring, glow, textColor, numColor, count, allDone, hasUrgent, overdue, today, isWeekend, completionRate, hasInProgress };
  };

  // Stats
  const totalTasks = tarefas.length;
  const completedTasks = tarefas.filter(t => t.status === "concluida").length;

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

        <div className="flex items-center gap-2 ml-auto text-[10px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/60 border border-foreground/8">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-foreground/70 font-medium">{totalTasks}</span>
            <span className="text-muted-foreground/40">|</span>
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className="text-green-400/80 font-medium">{completedTasks}</span>
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

      {/* ─── Vertical Bar Timeline ─── */}
      <ScrollArea className="w-full">
        <div className="relative min-w-max" style={{ paddingTop: 120, paddingBottom: 120 }}>
          {/* Central horizontal axis line */}
          <div
            className="absolute left-0 right-0 h-[3px] rounded-full"
            style={{ top: "50%", transform: "translateY(-50%)", background: "linear-gradient(90deg, transparent 0%, hsl(var(--foreground) / 0.12) 5%, hsl(var(--foreground) / 0.12) 95%, transparent 100%)" }}
          />

          <div className="flex items-center relative">
            {days.map((dateStr, dayIdx) => {
              const style = getNodeStyle(dateStr);
              const urgency = getUrgencyData(dateStr, tasksByDate);
              const tasks = tasksByDate[dateStr] || [];
              const isTop = dayIdx % 2 === 0; // Alternate top/bottom
              const isWeekStart = new Date(dateStr + "T12:00:00").getDay() === 0;
              const colW = viewMode === "week" ? 140 : 72;

              // Vertical bar color based on urgency
              const barColors: Record<string, string> = {
                overdue: "from-red-500 to-red-600",
                critical: "from-amber-400 to-amber-500",
                warning: "from-green-400 to-green-500",
                safe: "from-blue-400 to-blue-500",
                none: style.count > 0 && style.allDone ? "from-green-400 to-green-500" : "from-foreground/15 to-foreground/10",
              };
              const barColor = barColors[urgency.level] || barColors.none;

              // Icon for the node
              const nodeIcon = style.count === 0 ? null
                : style.allDone ? <CheckCircle2 className="w-3.5 h-3.5" />
                : urgency.level === "overdue" ? <Flame className="w-3.5 h-3.5" />
                : style.hasInProgress ? <Timer className="w-3.5 h-3.5" />
                : <FileText className="w-3.5 h-3.5" />;

              return (
                <div
                  key={dateStr}
                  className="relative flex flex-col items-center"
                  style={{ width: colW, minWidth: colW, flexShrink: 0, height: 240 }}
                >
                  {/* Week separator */}
                  {isWeekStart && dayIdx > 0 && viewMode === "month" && (
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-foreground/[0.06] z-10" />
                  )}

                  {/* ── Top section (card or empty) ── */}
                  <div className="flex flex-col items-center justify-end" style={{ height: 100, position: "relative" }}>
                    {isTop && style.count > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: dayIdx * 0.02, duration: 0.3 }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[calc(100%-8px)]"
                      >
                        <button
                          onClick={() => { setUserManuallySelected(true); setSelectedDate(prev => prev === dateStr ? null : dateStr); }}
                          className={`
                            w-full rounded-lg border p-2 text-left transition-all duration-200 group/card cursor-pointer
                            ${selectedDate === dateStr
                              ? "border-primary/40 bg-primary/10 shadow-lg shadow-primary/10"
                              : "border-foreground/8 bg-card/60 backdrop-blur-sm hover:border-foreground/20 hover:bg-card/80 hover:shadow-md hover:shadow-foreground/5"
                            }
                          `}
                        >
                          {/* Task preview lines */}
                          {tasks.slice(0, 2).map((t, ti) => (
                            <div key={t.id} className="flex items-center gap-1 mb-0.5">
                              <div className={`w-1 h-1 rounded-full flex-shrink-0 ${prioridadeDot[t.prioridade]}`} />
                              <span className={`text-[8px] leading-tight truncate ${t.status === "concluida" ? "line-through text-muted-foreground/50" : "text-foreground/70"}`}>
                                {t.titulo}
                              </span>
                            </div>
                          ))}
                          {tasks.length > 2 && (
                            <span className="text-[7px] text-muted-foreground/40">+{tasks.length - 2} mais</span>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </div>

                  {/* ── Central node area (axis crossing) ── */}
                  <div className="relative flex flex-col items-center" style={{ height: 40 }}>
                    {/* Vertical bar */}
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-gradient-to-b ${barColor} transition-all duration-500`}
                      style={{
                        height: style.count > 0 ? (isTop ? 28 : 28) : 10,
                        top: isTop ? -28 : "auto",
                        bottom: !isTop ? -28 : "auto",
                      }}
                    />

                    {/* Node circle on axis */}
                    <button
                      ref={style.today ? todayRef : undefined}
                      onClick={() => { setUserManuallySelected(true); setSelectedDate(prev => prev === dateStr ? null : dateStr); }}
                      className={`
                        relative z-20 flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer
                        hover:brightness-125
                        ${style.count > 0 ? "w-8 h-8" : "w-4 h-4"}
                        ${selectedDate === dateStr
                          ? "ring-2 ring-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                          : style.count > 0 ? `ring-2 ${style.ring}` : "ring-1 ring-foreground/10"
                        }
                        ${style.glow}
                      `}
                      style={{
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        ...(style.count > 0 && urgency.hue ? {
                          boxShadow: `0 0 12px ${urgency.hue}33, 0 0 24px ${urgency.hue}15`,
                        } : {}),
                      }}
                    >
                      <div className={`w-full h-full rounded-full ${style.bg} flex items-center justify-center text-primary-foreground transition-colors duration-300`}>
                        {nodeIcon}
                      </div>
                      {/* Today beacon */}
                      {style.today && selectedDate !== dateStr && (
                        <>
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse border border-background" />
                          <span className="absolute inset-[-4px] rounded-full border border-primary/30 animate-pulse" />
                        </>
                      )}
                    </button>

                    {/* Date label — positioned on opposite side of card */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
                      style={{ [isTop ? "bottom" : "top"]: -36 }}
                    >
                      <span className={`text-sm font-black tabular-nums leading-none ${selectedDate === dateStr ? "text-primary" : style.numColor} transition-colors`}>
                        {formatDay(dateStr)}
                      </span>
                      <span className={`text-[8px] font-semibold uppercase tracking-wider mt-0.5 ${style.textColor} transition-colors`}>
                        {formatWeekday(dateStr)}
                      </span>
                    </div>
                  </div>

                  {/* ── Bottom section (card or empty) ── */}
                  <div className="flex flex-col items-center justify-start" style={{ height: 100, position: "relative" }}>
                    {!isTop && style.count > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: dayIdx * 0.02, duration: 0.3 }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-8px)]"
                      >
                        <button
                          onClick={() => { setUserManuallySelected(true); setSelectedDate(prev => prev === dateStr ? null : dateStr); }}
                          className={`
                            w-full rounded-lg border p-2 text-left transition-all duration-200 group/card cursor-pointer
                            ${selectedDate === dateStr
                              ? "border-primary/40 bg-primary/10 shadow-lg shadow-primary/10"
                              : "border-foreground/8 bg-card/60 backdrop-blur-sm hover:border-foreground/20 hover:bg-card/80 hover:shadow-md hover:shadow-foreground/5"
                            }
                          `}
                        >
                          {tasks.slice(0, 2).map((t, ti) => (
                            <div key={t.id} className="flex items-center gap-1 mb-0.5">
                              <div className={`w-1 h-1 rounded-full flex-shrink-0 ${prioridadeDot[t.prioridade]}`} />
                              <span className={`text-[8px] leading-tight truncate ${t.status === "concluida" ? "line-through text-muted-foreground/50" : "text-foreground/70"}`}>
                                {t.titulo}
                              </span>
                            </div>
                          ))}
                          {tasks.length > 2 && (
                            <span className="text-[7px] text-muted-foreground/40">+{tasks.length - 2} mais</span>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* No-date node */}
            {noDateTasks.length > 0 && (
              <div className="relative flex flex-col items-center" style={{ width: 72, minWidth: 72, flexShrink: 0, height: 240 }}>
                <div style={{ height: 100 }} />
                <div className="relative flex flex-col items-center" style={{ height: 40 }}>
                  <motion.button
                    onClick={() => { setUserManuallySelected(true); setSelectedDate(prev => prev === "__no_date__" ? null : "__no_date__"); }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative z-20 w-6 h-6 rounded-full ring-2 transition-all duration-300 cursor-pointer flex items-center justify-center
                      ${selectedDate === "__no_date__" ? "ring-primary/50 shadow-[0_0_14px_hsl(var(--primary)/0.4)]" : "ring-foreground/12"}
                    `}
                    style={{ position: "absolute", top: "50%", transform: "translateY(-50%)" }}
                  >
                    <div className={`w-full h-full rounded-full ${selectedDate === "__no_date__" ? "bg-primary" : "bg-foreground/20"} flex items-center justify-center`}>
                      <span className="text-[8px] font-bold text-primary-foreground">{noDateTasks.length}</span>
                    </div>
                  </motion.button>
                  <div className="absolute bottom-[-36px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-sm font-black text-muted-foreground/30 leading-none">—</span>
                    <span className="text-[8px] font-semibold uppercase tracking-wider mt-0.5 text-muted-foreground/25">s/d</span>
                  </div>
                </div>
                <div style={{ height: 100 }} />
              </div>
            )}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* ─── Expanded Task Panel for selected date ─── */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-foreground/10 bg-card/30 backdrop-blur-md p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {selectedDate !== "__no_date__" && (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-foreground tabular-nums leading-none">
                        {new Date(selectedDate + "T12:00:00").getDate()}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-wider leading-none">
                          {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" })}
                        </span>
                        <span className="text-[9px] text-muted-foreground/40 capitalize">
                          {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { month: "long" })}
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedDate === "__no_date__" && (
                    <span className="text-sm font-bold text-foreground">Tarefas sem prazo</span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                    {selectedTasks.length} tarefa{selectedTasks.length !== 1 ? "s" : ""}
                  </span>
                  {selectedDate !== "__no_date__" && isOverdue(selectedDate) && selectedTasks.some(t => t.status !== "concluida") && (
                    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">
                      <Flame className="w-2.5 h-2.5" /> Atrasado
                    </span>
                  )}
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {selectedTasks.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/40">
                    {searchQuery ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa nesta data"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedTasks.map((tarefa, ti) => {
                    const isExpanded = expandedTaskId === tarefa.id;
                    return (
                      <motion.div
                        key={tarefa.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: ti * 0.04, duration: 0.25 }}
                        className={`
                          rounded-xl border transition-all overflow-hidden
                          ${tarefa.status === "concluida" ? "opacity-50" : ""}
                          ${isExpanded ? "border-primary/30 bg-card/70 shadow-md shadow-primary/5" : "border-foreground/8 bg-card/40 hover:border-foreground/15 hover:bg-card/60"}
                          ${selectedDate !== "__no_date__" && isOverdue(selectedDate) && tarefa.status !== "concluida" ? "border-amber-500/15" : ""}
                        `}
                      >
                        {/* Compact row */}
                        <div
                          className="flex items-center gap-2.5 p-2.5 cursor-pointer group"
                          onClick={() => setExpandedTaskId(prev => prev === tarefa.id ? null : tarefa.id)}
                        >
                          <div className={`w-1 h-8 rounded-full flex-shrink-0 ${prioridadeDot[tarefa.prioridade]}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${tarefa.status === "concluida" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {tarefa.titulo}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 truncate">
                                <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                                {getEmpresaNome(tarefa.empresaId)}
                              </span>
                              {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                                  <FileText className="w-2.5 h-2.5" />{tarefa.arquivos.length}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(["pendente", "em_andamento", "concluida"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); onStatusChange(tarefa.id, s); }}
                                className={`p-1 rounded transition-all ${
                                  tarefa.status === s
                                    ? s === "concluida" ? "bg-green-500/20 text-green-300"
                                      : s === "em_andamento" ? "bg-blue-500/20 text-blue-300"
                                        : "bg-foreground/10 text-foreground/60"
                                    : "text-muted-foreground/25 hover:text-foreground/50 hover:bg-foreground/5"
                                }`}
                              >
                                {statusIcons[s]}
                              </button>
                            ))}
                          </div>
                          <div className="w-10 h-1 bg-foreground/8 rounded-full overflow-hidden flex-shrink-0">
                            <motion.div
                              className="h-full bg-gradient-to-r from-primary to-primary/50 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${tarefa.progresso || 0}%` }}
                              transition={{ duration: 0.5, delay: ti * 0.05 }}
                            />
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/30 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>

                        {/* Expanded content */}
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
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
