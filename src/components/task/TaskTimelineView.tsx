import { useState, useMemo, useCallback } from "react";
import { Tarefa } from "@/types/task";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Building2, FileText, Trash2, CheckCircle2, Circle, Timer,
  Search, Download, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TaskTimelineViewProps {
  tarefas: Tarefa[];
  getEmpresaNome: (id: string) => string;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Tarefa["status"]) => void;
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

// ── Export helpers ──

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

export function TaskTimelineView({ tarefas, getEmpresaNome, onDelete, onStatusChange }: TaskTimelineViewProps) {
  const now = new Date();
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [weekRef, setWeekRef] = useState(now);

  // Task map
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

  const noDateTasks = tasksByDate["__no_date__"] || [];

  // Search filter
  const filterTask = useCallback((t: Tarefa) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.titulo.toLowerCase().includes(q) || getEmpresaNome(t.empresaId).toLowerCase().includes(q);
  }, [searchQuery, getEmpresaNome]);

  // Selected day tasks
  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    const list = selectedDate === "__no_date__" ? noDateTasks : (tasksByDate[selectedDate] || []);
    return list.filter(filterTask);
  }, [selectedDate, tasksByDate, noDateTasks, filterTask]);

  // Navigate
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

  // Color logic for date cells
  const getCellStyle = (dateStr: string, taskCount: number) => {
    const today = isToday(dateStr);
    const overdue = isOverdue(dateStr);
    const selected = selectedDate === dateStr;
    const tasks = tasksByDate[dateStr] || [];
    const hasUrgent = tasks.some(t => t.prioridade === "alta" || t.prioridade === "urgente");
    const allDone = tasks.length > 0 && tasks.every(t => t.status === "concluida");
    const hasInProgress = tasks.some(t => t.status === "em_andamento");

    if (selected) return "bg-red-500/25 border-red-500/60 text-red-200 shadow-[0_0_10px_hsl(var(--destructive)/0.2)]";
    if (today) return "bg-red-500/15 border-red-500/40 text-red-300";
    if (taskCount === 0) return "bg-transparent border-foreground/5 text-muted-foreground/40";
    if (allDone) return "bg-green-500/15 border-green-500/30 text-green-300";
    if (overdue && hasUrgent) return "bg-red-500/10 border-red-500/25 text-red-400";
    if (overdue) return "bg-yellow-500/10 border-yellow-500/25 text-yellow-400";
    if (hasInProgress) return "bg-blue-500/10 border-blue-500/25 text-blue-300";
    return "bg-foreground/5 border-foreground/10 text-foreground/70";
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Navigation */}
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

        {/* View toggle */}
        <div className="flex bg-card/50 rounded-md p-0.5 border border-foreground/10">
          <button onClick={() => { setViewMode("month"); setSelectedDate(null); }} className={`px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1 ${viewMode === "month" ? "bg-red-500/20 text-red-300" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarDays className="w-3 h-3" /> Mês
          </button>
          <button onClick={() => { setViewMode("week"); setSelectedDate(null); }} className={`px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1 ${viewMode === "week" ? "bg-red-500/20 text-red-300" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarRange className="w-3 h-3" /> Semana
          </button>
        </div>

        {/* Search */}
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

        {/* Export */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => exportCSV(tarefas, getEmpresaNome)}>
            <Download className="w-3 h-3" /> CSV
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => exportICS(tarefas, getEmpresaNome)}>
            <Download className="w-3 h-3" /> ICS
          </Button>
        </div>
      </div>

      {/* Date strip */}
      <ScrollArea className="w-full">
        <div className={`flex gap-1.5 pb-2 ${viewMode === "week" ? "" : "min-w-max"}`}>
          {days.map((dateStr) => {
            const dayTasks = tasksByDate[dateStr] || [];
            const count = dayTasks.length;
            const today = isToday(dateStr);
            const selected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
                className={`
                  relative flex flex-col items-center rounded-lg border px-2 py-1.5 transition-all
                  ${viewMode === "week" ? "flex-1 min-w-[80px]" : "w-[42px] flex-shrink-0"}
                  ${getCellStyle(dateStr, count)}
                  hover:scale-105 hover:shadow-sm
                `}
              >
                <span className="text-[9px] leading-none">{formatWeekday(dateStr)}</span>
                <span className={`text-sm font-bold leading-tight ${today ? "text-red-400" : ""}`}>{formatDay(dateStr)}</span>
                {count > 0 && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      dayTasks.every(t => t.status === "concluida") ? "bg-green-500" :
                      dayTasks.some(t => t.prioridade === "alta" || t.prioridade === "urgente") ? "bg-red-500" :
                      dayTasks.some(t => t.status === "em_andamento") ? "bg-blue-500" : "bg-foreground/30"
                    }`} />
                    <span className="text-[8px] font-medium">{count}</span>
                  </div>
                )}
                {today && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}

          {/* No-date pill */}
          {noDateTasks.length > 0 && (
            <button
              onClick={() => setSelectedDate(prev => prev === "__no_date__" ? null : "__no_date__")}
              className={`
                flex flex-col items-center rounded-lg border px-3 py-1.5 transition-all flex-shrink-0
                ${selectedDate === "__no_date__" ? "bg-red-500/25 border-red-500/60 text-red-200" : "bg-foreground/5 border-foreground/10 text-muted-foreground"}
                hover:scale-105
              `}
            >
              <span className="text-[9px]">s/d</span>
              <span className="text-sm font-bold">{noDateTasks.length}</span>
            </button>
          )}
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
              {/* Header */}
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
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                  {selectedTasks.map((tarefa, ti) => (
                    <motion.div
                      key={tarefa.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: ti * 0.03 }}
                      className={`
                        group flex items-center gap-2 rounded-lg border p-2
                        bg-card/50 hover:border-red-500/30 transition-all
                        ${tarefa.status === "concluida" ? "opacity-60" : ""}
                        ${selectedDate !== "__no_date__" && isOverdue(selectedDate) && tarefa.status !== "concluida" ? "border-yellow-500/20" : "border-foreground/10"}
                      `}
                    >
                      {/* Priority */}
                      <div className={`w-1 h-8 rounded-full flex-shrink-0 ${prioridadeDot[tarefa.prioridade]}`} />

                      {/* Content */}
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

                      {/* Status buttons */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {(["pendente", "em_andamento", "concluida"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => onStatusChange(tarefa.id, s)}
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

                      {/* Progress mini */}
                      <div className="w-10 h-1 bg-foreground/10 rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: `${tarefa.progresso || 0}%` }} />
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => onDelete(tarefa.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
