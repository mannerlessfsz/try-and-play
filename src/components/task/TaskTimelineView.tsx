import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Tarefa } from "@/types/task";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Building2, FileText, Trash2, CheckCircle2, Circle, Timer,
  Search, Download, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, X, ChevronDown
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

// ── Component ──

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

  // Auto-select the most relevant date: overdue incomplete tasks or next upcoming
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

  // Apply auto-selection when user hasn't manually selected
  useEffect(() => {
    if (!userManuallySelected && autoSelectedDate) {
      setSelectedDate(autoSelectedDate);
    }
  }, [autoSelectedDate, userManuallySelected]);

  // Reset manual selection when navigating months/weeks
  useEffect(() => {
    setUserManuallySelected(false);
  }, [currentMonth, currentYear, weekRef]);

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

  // Navigate to auto-selected date's month if it's not currently visible
  useEffect(() => {
    if (!userManuallySelected && autoSelectedDate && viewMode === "month") {
      const d = new Date(autoSelectedDate + "T12:00:00");
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [autoSelectedDate, userManuallySelected, viewMode, currentYear, currentMonth]);

  const getNodeColor = (dateStr: string) => {
    const tasks = tasksByDate[dateStr] || [];
    const selected = selectedDate === dateStr;
    const today = isToday(dateStr);
    const count = tasks.length;
    const allDone = count > 0 && tasks.every(t => t.status === "concluida");
    const hasUrgent = tasks.some(t => t.prioridade === "alta" || t.prioridade === "urgente");
    const hasInProgress = tasks.some(t => t.status === "em_andamento");
    const overdue = isOverdue(dateStr);

    if (selected) return { ring: "ring-red-500", bg: "bg-red-500", text: "text-red-300", glow: "shadow-[0_0_12px_rgba(239,68,68,0.5)]" };
    if (today) return { ring: "ring-red-400", bg: "bg-red-400", text: "text-red-300", glow: "shadow-[0_0_8px_rgba(239,68,68,0.3)]" };
    if (count === 0) return { ring: "ring-foreground/10", bg: "bg-foreground/20", text: "text-muted-foreground/40", glow: "" };
    if (allDone) return { ring: "ring-green-500", bg: "bg-green-500", text: "text-green-300", glow: "" };
    if (overdue && hasUrgent) return { ring: "ring-red-500/60", bg: "bg-red-500/80", text: "text-red-400", glow: "" };
    if (overdue) return { ring: "ring-yellow-500/60", bg: "bg-yellow-500/80", text: "text-yellow-400", glow: "" };
    if (hasInProgress) return { ring: "ring-blue-500/60", bg: "bg-blue-500", text: "text-blue-300", glow: "" };
    return { ring: "ring-foreground/20", bg: "bg-foreground/40", text: "text-foreground/60", glow: "" };
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button onClick={goToday} className="text-xs font-semibold text-foreground/80 hover:text-foreground px-2 min-w-[140px] text-center">
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
          <button onClick={() => { setViewMode("month"); setSelectedDate(null); }} className={`px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1 ${viewMode === "month" ? "bg-red-500/20 text-red-300" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarDays className="w-3 h-3" /> Mês
          </button>
          <button onClick={() => { setViewMode("week"); setSelectedDate(null); }} className={`px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1 ${viewMode === "week" ? "bg-red-500/20 text-red-300" : "text-muted-foreground hover:text-foreground"}`}>
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

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => exportCSV(tarefas, getEmpresaNome)}>
            <Download className="w-3 h-3" /> CSV
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => exportICS(tarefas, getEmpresaNome)}>
            <Download className="w-3 h-3" /> ICS
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="w-full">
        <div className="relative px-2 pb-4 min-w-max">
          {/* Horizontal line */}
          <div className="absolute left-0 right-0 top-[52px] h-[2px] bg-foreground/10 rounded-full" />

          <div className="flex items-start">
            {days.map((dateStr, i) => {
              const tasks = tasksByDate[dateStr] || [];
              const count = tasks.length;
              const today = isToday(dateStr);
              const selected = selectedDate === dateStr;
              const colors = getNodeColor(dateStr);
              const isWeekend = [0, 6].includes(new Date(dateStr + "T12:00:00").getDay());

              return (
                <div key={dateStr} className="flex flex-col items-center" style={{ width: viewMode === "week" ? "calc(100% / 7)" : 52, minWidth: viewMode === "week" ? 100 : 52, flexShrink: 0 }}>
                  {/* Day label */}
                  <span className={`text-[11px] leading-none mb-2 ${isWeekend ? "text-muted-foreground/30" : "text-muted-foreground/60"}`}>
                    {formatWeekday(dateStr)}
                  </span>

                  {/* Day number */}
                  <span className={`text-sm font-bold leading-none mb-2.5 ${colors.text}`}>
                    {formatDay(dateStr)}
                  </span>

                  {/* Node */}
                  <button
                    ref={today ? todayRef : undefined}
                    onClick={() => { setUserManuallySelected(true); setSelectedDate(prev => prev === dateStr ? null : dateStr); }}
                    className={`
                      relative z-10 rounded-full ring-2 transition-all duration-200 cursor-pointer hover:scale-125
                      ${colors.ring} ${colors.glow}
                      ${selected ? "scale-[1.3]" : ""}
                      ${count > 0 ? "w-5 h-5" : "w-3 h-3"}
                    `}
                  >
                    <div className={`w-full h-full rounded-full ${colors.bg}`} />
                    {today && !selected && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>

                  {/* Task count badge */}
                  {count > 0 && (
                    <span className={`mt-2 text-[10px] font-bold ${colors.text}`}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}

            {/* No-date node */}
            {noDateTasks.length > 0 && (
              <div className="flex flex-col items-center" style={{ width: 50, minWidth: 50, flexShrink: 0 }}>
                <span className="text-[9px] leading-none mb-1 text-muted-foreground/40">s/d</span>
                <span className="text-[11px] font-bold leading-none mb-1.5 text-muted-foreground/60">—</span>
                <button
                  onClick={() => { setUserManuallySelected(true); setSelectedDate(prev => prev === "__no_date__" ? null : "__no_date__"); }}
                  className={`
                    relative z-10 w-3.5 h-3.5 rounded-full ring-2 transition-all duration-200 cursor-pointer hover:scale-125
                    ${selectedDate === "__no_date__" ? "ring-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] scale-125" : "ring-foreground/20"}
                  `}
                >
                  <div className={`w-full h-full rounded-full ${selectedDate === "__no_date__" ? "bg-red-500" : "bg-foreground/30"}`} />
                </button>
                <span className={`mt-1 text-[8px] font-bold ${selectedDate === "__no_date__" ? "text-red-300" : "text-muted-foreground/60"}`}>
                  {noDateTasks.length}
                </span>
              </div>
            )}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Expanded task list for selected date */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-foreground/10 bg-card/30 backdrop-blur-sm p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {selectedDate === "__no_date__"
                      ? "Tarefas sem prazo"
                      : new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300">{selectedTasks.length}</span>
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-foreground/10 rounded">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {selectedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {searchQuery ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa nesta data"}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {selectedTasks.map((tarefa, ti) => {
                    const isExpanded = expandedTaskId === tarefa.id;
                    return (
                      <motion.div
                        key={tarefa.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: ti * 0.03 }}
                        className={`
                          rounded-lg border transition-all overflow-hidden
                          ${tarefa.status === "concluida" ? "opacity-60" : ""}
                          ${isExpanded ? "border-primary/30 bg-card/70" : "border-foreground/10 bg-card/50 hover:border-primary/20"}
                          ${selectedDate !== "__no_date__" && isOverdue(selectedDate) && tarefa.status !== "concluida" ? "border-yellow-500/20" : ""}
                        `}
                      >
                        {/* Compact row - always visible */}
                        <div
                          className="flex items-center gap-2 p-2 cursor-pointer group"
                          onClick={() => setExpandedTaskId(prev => prev === tarefa.id ? null : tarefa.id)}
                        >
                          <div className={`w-1 h-8 rounded-full flex-shrink-0 ${prioridadeDot[tarefa.prioridade]}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${tarefa.status === "concluida" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {tarefa.titulo}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                                <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                                {getEmpresaNome(tarefa.empresaId)}
                              </span>
                              {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <FileText className="w-2.5 h-2.5" />{tarefa.arquivos.length}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {(["pendente", "em_andamento", "concluida"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); onStatusChange(tarefa.id, s); }}
                                className={`p-1 rounded transition-all ${
                                  tarefa.status === s
                                    ? s === "concluida" ? "bg-green-500/20 text-green-300"
                                      : s === "em_andamento" ? "bg-blue-500/20 text-blue-300"
                                        : "bg-foreground/10 text-foreground/60"
                                    : "text-muted-foreground/30 hover:text-foreground/60 hover:bg-foreground/5"
                                }`}
                              >
                                {statusIcons[s]}
                              </button>
                            ))}
                          </div>
                          <div className="w-10 h-1 bg-foreground/10 rounded-full overflow-hidden flex-shrink-0">
                            <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full" style={{ width: `${tarefa.progresso || 0}%` }} />
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-foreground/10"
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
