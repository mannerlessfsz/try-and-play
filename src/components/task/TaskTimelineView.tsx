import { useState, useMemo } from "react";
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
  if (days < 0) return `${Math.abs(days)}d atrás`;
  if (days <= 7) return d.toLocaleDateString("pt-BR", { weekday: "long" });
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
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

// Task status color based on deadline proximity
// Verde = a fazer | Amarelo = 2 dias da entrega | Vermelho = 1+ dia após entrega | Azul = concluída | Laranja = concluída com justificativa
type TaskStatusColor = "green" | "yellow" | "red" | "blue" | "orange";

function getTaskStatusColor(tarefa: Tarefa): TaskStatusColor {
  if (tarefa.status === "concluida") {
    return tarefa.justificativa ? "orange" : "blue";
  }
  if (!tarefa.prazoEntrega) return "green";
  const days = getDaysUntilDeadline(tarefa.prazoEntrega);
  if (days < 0) return "red";
  if (days <= 2) return "yellow";
  return "green";
}

const STATUS_COLOR_STYLES: Record<TaskStatusColor, { gradient: string; bg: string; border: string; text: string; dot: string; label: string }> = {
  green:  { gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-500", dot: "bg-emerald-500", label: "A fazer" },
  yellow: { gradient: "from-amber-400 to-yellow-500",    bg: "bg-amber-500/10",   border: "border-amber-500/25",   text: "text-amber-500",   dot: "bg-amber-500",   label: "Atenção" },
  red:    { gradient: "from-red-500 to-red-600",         bg: "bg-red-500/10",     border: "border-red-500/25",     text: "text-red-500",     dot: "bg-red-500",     label: "Atrasada" },
  blue:   { gradient: "from-blue-500 to-blue-600",       bg: "bg-blue-500/10",    border: "border-blue-500/25",    text: "text-blue-500",    dot: "bg-blue-500",    label: "Concluída" },
  orange: { gradient: "from-orange-500 to-orange-600",   bg: "bg-orange-500/10",  border: "border-orange-500/25",  text: "text-orange-500",  dot: "bg-orange-500",  label: "Justificada" },
};

function getGroupStepColor(tasks: Tarefa[]): string {
  if (tasks.length === 0) return "from-foreground/30 to-foreground/40";
  const colors = tasks.map(getTaskStatusColor);
  if (colors.includes("red")) return STATUS_COLOR_STYLES.red.gradient;
  if (colors.includes("orange")) return STATUS_COLOR_STYLES.orange.gradient;
  if (colors.includes("yellow")) return STATUS_COLOR_STYLES.yellow.gradient;
  if (colors.includes("green")) return STATUS_COLOR_STYLES.green.gradient;
  return STATUS_COLOR_STYLES.blue.gradient;
}

export function TaskTimelineView({ tarefas, getEmpresaNome, onDelete, onStatusChange, onTaskClick, onUploadArquivo, onDeleteArquivo }: TaskTimelineViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

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

  // Always show 7 days minimum
  const timelineGroups = useMemo(() => {
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

    // Add extra dates with tasks outside the 7-day window
    const windowKeys = new Set(days.map(d => d.dateKey));
    const extraDates = Object.keys(taskMap)
      .filter(k => k !== "__no_date__" && !windowKeys.has(k))
      .sort();
    const before = extraDates.filter(k => k < days[0].dateKey).map(k => ({ dateKey: k, tasks: taskMap[k] }));
    const after = extraDates.filter(k => k > days[days.length - 1].dateKey).map(k => ({ dateKey: k, tasks: taskMap[k] }));
    
    const result = [...before, ...days, ...after];
    if (taskMap["__no_date__"]?.length) result.push({ dateKey: "__no_date__", tasks: taskMap["__no_date__"] });
    return result;
  }, [filteredTarefas, weekOffset]);

  const stats = useMemo(() => {
    const total = tarefas.length;
    const completed = tarefas.filter(t => t.status === "concluida").length;
    const overdueCount = tarefas.filter(t => t.prazoEntrega && isOverdue(t.prazoEntrega) && t.status !== "concluida").length;
    const inProgress = tarefas.filter(t => t.status === "em_andamento").length;
    return { total, completed, overdue: overdueCount, inProgress, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tarefas]);

  let stepNumber = 0;

  return (
    <div className="space-y-4">

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

      {/* ─── Week Navigation ─── */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 rounded-lg bg-card/60 border border-foreground/8 hover:bg-card text-muted-foreground hover:text-foreground transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setWeekOffset(0)}
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

      {/* ─── Vertical Timeline (tasks left, empresas right) ─── */}
      <div className="relative">
        {/* Central vertical line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary/40 via-foreground/15 to-foreground/5 rounded-full" />

        <div className="space-y-0">
          {timelineGroups.map((group, groupIdx) => {
            const { dateKey, tasks } = group;
            const today = isToday(dateKey);
            const overdue = dateKey !== "__no_date__" && isOverdue(dateKey);
            const allDone = tasks.length > 0 && tasks.every(t => t.status === "concluida");
            const noDate = dateKey === "__no_date__";
            const isExpanded = expandedDate === dateKey;

            stepNumber++;
            const stepColor = today && tasks.length === 0
              ? "from-primary to-primary"
              : getGroupStepColor(tasks);

            const dateLabel = noDate
              ? "Sem Prazo"
              : today
                ? "HOJE"
                : formatDateLabel(dateKey);

            const fullDate = noDate
              ? ""
              : new Date(dateKey + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "short", day: "numeric", month: "short"
                });

            const completedCount = tasks.filter(t => t.status === "concluida").length;

            // Group tasks by empresa for the right panel
            const empresaMap: Record<string, { nome: string; total: number; done: number; priorities: string[] }> = {};
            tasks.forEach(t => {
              const nome = getEmpresaNome(t.empresaId);
              if (!empresaMap[t.empresaId]) {
                empresaMap[t.empresaId] = { nome, total: 0, done: 0, priorities: [] };
              }
              empresaMap[t.empresaId].total++;
              if (t.status === "concluida") empresaMap[t.empresaId].done++;
              if (!empresaMap[t.empresaId].priorities.includes(t.prioridade)) {
                empresaMap[t.empresaId].priorities.push(t.prioridade);
              }
            });
            const empresas = Object.entries(empresaMap);

            return (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(groupIdx * 0.04, 0.6), duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative flex items-start py-1"
              >
                {/* ── Central dot / step number ── */}
                <div className="absolute left-1/2 -translate-x-1/2 z-20 top-3">
                  <button
                    onClick={() => setExpandedDate(isExpanded ? null : dateKey)}
                    className={`
                      w-8 h-8 rounded-full bg-gradient-to-br ${stepColor}
                      flex items-center justify-center shadow-lg transition-all
                      ${today ? "ring-3 ring-primary/30 animate-pulse-glow" : "ring-2 ring-background"}
                      ${isExpanded ? "scale-125 shadow-xl" : "hover:scale-110"}
                    `}
                  >
                    <span className="text-xs font-bold text-white">
                      {noDate ? "?" : String(stepNumber).padStart(2, "0")}
                    </span>
                  </button>
                </div>

                {/* ── Left side: Tasks ── */}
                <div className="w-[calc(65%-20px)]">
                  <div className="flex justify-end">
                    <CompactDayNode
                      dateKey={dateKey}
                      dateLabel={dateLabel}
                      fullDate={fullDate}
                      tasks={tasks}
                      stepColor={stepColor}
                      today={today}
                      overdue={overdue && !allDone}
                      allDone={allDone}
                      noDate={noDate}
                      completedCount={completedCount}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedDate(isExpanded ? null : dateKey)}
                      expandedTaskId={expandedTaskId}
                      setExpandedTaskId={setExpandedTaskId}
                      getEmpresaNome={getEmpresaNome}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      onUploadArquivo={onUploadArquivo}
                      onDeleteArquivo={onDeleteArquivo}
                      side="left"
                    />
                  </div>
                </div>

                {/* ── Connector arms (both sides) ── */}
                <div className="w-10 flex-shrink-0 relative flex items-start pt-6">
                  <div className="absolute top-[19px] h-0.5 bg-gradient-to-r right-[20px] left-0 from-transparent to-foreground/20" />
                  <div className="absolute top-[19px] h-0.5 bg-gradient-to-r left-[20px] right-0 from-foreground/20 to-transparent" />
                </div>

                {/* ── Right side: Empresas summary ── */}
                <div className="w-[calc(35%-20px)]">
                  <div className="flex justify-start">
                    <div className="w-full ml-0">
                      {empresas.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {empresas.map(([empresaId, info], eIdx) => {
                            const allEmpresaDone = info.done === info.total;
                            const hasUrgent = info.priorities.includes("urgente") || info.priorities.includes("alta");
                            return (
                              <motion.div
                                key={empresaId}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: groupIdx * 0.04 + eIdx * 0.03, duration: 0.3 }}
                                className={`
                                  flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all
                                  ${allEmpresaDone
                                    ? "border-green-500/15 bg-green-500/5 opacity-60"
                                    : hasUrgent
                                      ? "border-red-500/15 bg-red-500/5"
                                      : "border-foreground/8 bg-card/50 hover:bg-card/70"}
                                `}
                              >
                                <div className={`
                                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                                  ${allEmpresaDone
                                    ? "bg-green-500/15"
                                    : hasUrgent
                                      ? "bg-red-500/15"
                                      : "bg-foreground/5"}
                                `}>
                                  <Building2 className={`w-4 h-4 ${
                                    allEmpresaDone ? "text-green-500" : hasUrgent ? "text-red-500" : "text-muted-foreground/50"
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">{info.nome}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground/50">
                                      {info.done}/{info.total} {info.total === 1 ? "tarefa" : "tarefas"}
                                    </span>
                                    <div className="flex gap-0.5">
                                      {info.priorities.map((p, pi) => (
                                        <div key={pi} className={`w-1.5 h-1.5 rounded-full ${prioridadeDot[p]}`} />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                {allEmpresaDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                                {!allEmpresaDone && (
                                  <div className="flex-shrink-0 w-10 h-1 bg-foreground/8 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.round((info.done / info.total) * 100)}%` }} />
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-foreground/6 bg-card/30 mt-1">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground/20" />
                          <span className="text-[10px] text-muted-foreground/25 italic">Nenhuma empresa</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* End cap */}
        <div className="flex justify-center pt-2 pb-4">
          <div className="w-4 h-4 rounded-full bg-foreground/10 ring-2 ring-background" />
        </div>
      </div>

      {timelineGroups.length > 5 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-foreground/60 transition-colors px-3 py-1.5 rounded-full bg-card/40 border border-foreground/8"
          >
            <ArrowUp className="w-3 h-3" /> Voltar ao topo
          </button>
        </div>
      )}
    </div>
  );
}

// ── Compact Day Node (collapsed = mini card, expanded = full tasks) ──
interface CompactDayNodeProps {
  dateKey: string;
  dateLabel: string;
  fullDate: string;
  tasks: Tarefa[];
  stepColor: string;
  today: boolean;
  overdue: boolean;
  allDone: boolean;
  noDate: boolean;
  completedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  expandedTaskId: string | null;
  setExpandedTaskId: (id: string | null) => void;
  getEmpresaNome: (id: string) => string;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Tarefa["status"]) => void;
  onUploadArquivo?: (tarefaId: string, file: File) => Promise<void>;
  onDeleteArquivo?: (arquivoId: string, url?: string) => Promise<void>;
  side: "left" | "right";
}

function CompactDayNode({
  dateKey, dateLabel, fullDate, tasks, stepColor,
  today, overdue, allDone, noDate, completedCount,
  isExpanded, onToggle,
  expandedTaskId, setExpandedTaskId,
  getEmpresaNome, onDelete, onStatusChange,
  onUploadArquivo, onDeleteArquivo, side,
}: CompactDayNodeProps) {
  const totalCount = tasks.length;

  return (
    <div className={`w-full ${side === "left" ? "mr-0" : "ml-0"}`}>
      <div className={`
        rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer
        ${today ? "border-primary/30" :
          overdue ? "border-red-500/20" :
          allDone ? "border-green-500/20" :
          "border-foreground/10"}
        ${isExpanded ? "shadow-lg" : "shadow-sm hover:shadow-md"}
        bg-card/80 backdrop-blur-sm
      `}>
        {/* ── Compact header (always visible) ── */}
        <button
          onClick={onToggle}
          className={`w-full bg-gradient-to-r ${stepColor} px-4 py-2 flex items-center justify-between`}
        >
          <div className="flex items-center gap-2">
            {today && <Calendar className="w-3.5 h-3.5 text-white/80" />}
            {overdue && <Flame className="w-3.5 h-3.5 text-white/80" />}
            {allDone && totalCount > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-white/80" />}
            <span className="text-sm font-bold text-white uppercase tracking-wide">
              {dateLabel}
            </span>
            {fullDate && (
              <span className="text-[10px] text-white/50 capitalize hidden sm:inline">
                {fullDate}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <span className="text-xs font-semibold text-white/80 bg-white/15 px-2 py-0.5 rounded-full">
                {completedCount}/{totalCount}
              </span>
            )}
            {/* Priority dots summary when collapsed */}
            {!isExpanded && totalCount > 0 && (
              <div className="flex gap-0.5">
                {tasks.slice(0, 5).map((t, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR_STYLES[getTaskStatusColor(t)].dot} ring-1 ring-white/20`} />
                ))}
                {totalCount > 5 && <span className="text-[8px] text-white/50 ml-0.5">+{totalCount - 5}</span>}
              </div>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        {/* ── Expandable tasks area ── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3">
                {totalCount === 0 ? (
                  <p className="text-xs text-muted-foreground/30 italic py-2">Nenhuma tarefa agendada</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((tarefa, tIdx) => {
                      const isTaskExpanded = expandedTaskId === tarefa.id;
                      const isDone = tarefa.status === "concluida";
                      const taskColor = getTaskStatusColor(tarefa);
                      const colorStyle = STATUS_COLOR_STYLES[taskColor];

                      return (
                        <motion.div
                          key={tarefa.id}
                          initial={{ opacity: 0, x: side === "left" ? 10 : -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: tIdx * 0.05, duration: 0.2 }}
                          className={`
                            group relative rounded-lg border transition-all duration-200 overflow-hidden
                            ${isTaskExpanded
                              ? `${colorStyle.border} ${colorStyle.bg}`
                              : `${colorStyle.border} ${colorStyle.bg} hover:shadow-sm`}
                          `}
                        >
                          {/* Status color strip */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorStyle.dot} rounded-l`} />

                          <div
                            className="flex items-start gap-2.5 p-2.5 pl-3 cursor-pointer"
                            onClick={() => setExpandedTaskId(expandedTaskId === tarefa.id ? null : tarefa.id)}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = tarefa.status === "pendente" ? "em_andamento" : tarefa.status === "em_andamento" ? "concluida" : "pendente";
                                onStatusChange(tarefa.id, next);
                              }}
                              className={`
                                mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                                border-current ${colorStyle.text}
                              `}
                            >
                              {isDone && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {tarefa.status === "em_andamento" && <div className={`w-1.5 h-1.5 rounded-full ${colorStyle.dot} animate-pulse`} />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <p className={`text-xs font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {tarefa.titulo}
                                </p>
                                <ChevronDown className={`w-3 h-3 text-muted-foreground/25 flex-shrink-0 transition-transform ${isTaskExpanded ? "rotate-180" : ""}`} />
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {/* Status color badge */}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border} border`}>
                                  {colorStyle.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5 truncate max-w-[120px]">
                                  <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                                  {getEmpresaNome(tarefa.empresaId)}
                                </span>
                                {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                                  <span className="text-[9px] text-muted-foreground/30 flex items-center gap-0.5">
                                    <FileText className="w-2.5 h-2.5" />{tarefa.arquivos.length}
                                  </span>
                                )}
                              </div>
                              {(tarefa.progresso ?? 0) > 0 && !isDone && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <div className="flex-1 max-w-[80px] h-0.5 bg-foreground/8 rounded-full overflow-hidden">
                                    <div className={`h-full ${colorStyle.dot} rounded-full`} style={{ width: `${tarefa.progresso}%` }} />
                                  </div>
                                  <span className="text-[9px] text-muted-foreground/30">{tarefa.progresso}%</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick status hover */}
                          <div className="absolute top-1.5 right-7 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(["pendente", "em_andamento", "concluida"] as const).map(s => (
                              <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); onStatusChange(tarefa.id, s); }}
                                title={statusLabels[s]}
                                className={`p-0.5 rounded transition-all text-xs ${
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

                          <AnimatePresence>
                            {isTaskExpanded && (
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

              {/* Bottom accent */}
              <div className={`h-0.5 bg-gradient-to-r ${stepColor} opacity-30`} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Arrow toward center */}
      <div className={`absolute top-[18px] ${side === "left" ? "right-[calc(50%-20px)]" : "left-[calc(50%-20px)]"}`}>
        <div className={`
          w-3 h-3 rotate-45 border bg-card/80
          ${today ? "border-primary/30" : overdue ? "border-red-500/20" : "border-foreground/10"}
          ${side === "left" ? "border-l-0 border-b-0" : "border-r-0 border-t-0"}
        `} />
      </div>
    </div>
  );
}
