import React, { useState, useMemo, useCallback } from "react";
import { useClienteTarefas } from "@/hooks/useClienteTarefas";
import { ClienteTaskCard, getTaskStatusColor, STATUS_COLOR_CONFIG, TaskStatusColor } from "@/components/cliente/ClienteTaskCard";
import { Tarefa } from "@/types/task";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTodo, Loader2, Search, X, LayoutList, Columns, GanttChart,
  CheckCircle2, Clock, AlertTriangle, Flame, ChevronLeft, ChevronRight,
  Calendar, Building2, RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

// ── Helpers ──
function getDaysUntilDeadline(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T12:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
function toDateKey(d: Date): string { return d.toISOString().slice(0, 10); }
function isToday(dateStr: string): boolean {
  return new Date(dateStr + "T12:00:00").toDateString() === new Date().toDateString();
}
function isOverdue(dateStr: string): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T12:00:00") < today;
}
function formatDateLabel(dateStr: string): string {
  if (isToday(dateStr)) return "Hoje";
  const d = new Date(dateStr + "T12:00:00");
  const days = getDaysUntilDeadline(dateStr);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Amanhã";
  if (days < 0) return `${Math.abs(days)}d atrás`;
  if (days <= 7) return d.toLocaleDateString("pt-BR", { weekday: "long" });
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

type ViewMode = "timeline" | "lista" | "kanban";
type FilterType = "all" | "pendentes" | "atrasadas" | "concluidas";

export default function ClienteTaskVault() {
  const { user, loading: authLoading } = useAuth();
  const { tarefas, empresaAtiva, loading, marcarConcluida, uploadArquivo, deleteArquivo, refetch } = useClienteTarefas();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("cliente-tv-view");
    if (saved === "timeline" || saved === "lista" || saved === "kanban") return saved;
    return "timeline";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [weekOffset, setWeekOffset] = useState(0);

  const handleSetView = useCallback((v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem("cliente-tv-view", v);
  }, []);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // ── Filtered tasks ──
  const filtered = useMemo(() => {
    let list = tarefas;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.titulo.toLowerCase().includes(q) || t.descricao?.toLowerCase().includes(q));
    }
    switch (activeFilter) {
      case "pendentes": return list.filter(t => t.status !== "concluida");
      case "atrasadas": return list.filter(t => t.prazoEntrega && isOverdue(t.prazoEntrega) && t.status !== "concluida");
      case "concluidas": return list.filter(t => t.status === "concluida");
      default: return list;
    }
  }, [tarefas, searchQuery, activeFilter]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = tarefas.length;
    const done = tarefas.filter(t => t.status === "concluida").length;
    const overdue = tarefas.filter(t => t.prazoEntrega && isOverdue(t.prazoEntrega) && t.status !== "concluida").length;
    const pending = tarefas.filter(t => t.status !== "concluida").length;
    return { total, done, overdue, pending, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tarefas]);

  // ── Color counts ──
  const colorCounts = useMemo(() => {
    const counts: Record<TaskStatusColor, number> = { green: 0, yellow: 0, red: 0, blue: 0, orange: 0 };
    tarefas.forEach(t => { counts[getTaskStatusColor(t)]++; });
    return counts;
  }, [tarefas]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                <ListTodo className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">Minhas Tarefas</h1>
                {empresaAtiva && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="w-3 h-3" />
                    <span>{empresaAtiva.nome}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center rounded-lg border border-border/50 bg-card/50 p-0.5">
                {([
                  { id: "timeline" as const, icon: GanttChart, label: "Timeline" },
                  { id: "lista" as const, icon: LayoutList, label: "Lista" },
                  { id: "kanban" as const, icon: Columns, label: "Kanban" },
                ] as const).map(v => (
                  <button
                    key={v.id}
                    onClick={() => handleSetView(v.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                      ${viewMode === v.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    title={v.label}
                  >
                    <v.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={refetch} className="h-8 w-8 p-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* ── Color legend + Stats ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {(["green", "yellow", "red", "blue", "orange"] as TaskStatusColor[]).map(c => (
            <div key={c} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${STATUS_COLOR_CONFIG[c].bg} ${STATUS_COLOR_CONFIG[c].border} border`}>
              <div className={`w-2 h-2 rounded-full ${STATUS_COLOR_CONFIG[c].dot}`} />
              <span className={STATUS_COLOR_CONFIG[c].text}>{STATUS_COLOR_CONFIG[c].label}</span>
              <span className="text-muted-foreground/60">{colorCounts[c]}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="w-20 h-1.5 bg-foreground/8 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full"
                animate={{ width: `${stats.rate}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{stats.rate}%</span>
          </div>
        </div>

        {/* ── Toolbar ── */}
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
              { id: "pendentes" as const, label: "Pendentes", icon: Clock },
              { id: "atrasadas" as const, label: "Atrasadas", icon: AlertTriangle },
              { id: "concluidas" as const, label: "Concluídas", icon: CheckCircle2 },
            ]).map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(activeFilter === f.id ? "all" : f.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${activeFilter === f.id
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-card/40 text-muted-foreground/60 border border-foreground/8 hover:bg-card/60"}`}
              >
                <f.icon className="w-3 h-3" />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Views ── */}
        {viewMode === "timeline" && (
          <TimelineView
            tarefas={filtered}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            onComplete={marcarConcluida}
            onUpload={uploadArquivo}
            onDeleteArquivo={deleteArquivo}
          />
        )}
        {viewMode === "lista" && (
          <ListView
            tarefas={filtered}
            onComplete={marcarConcluida}
            onUpload={uploadArquivo}
            onDeleteArquivo={deleteArquivo}
          />
        )}
        {viewMode === "kanban" && (
          <KanbanView
            tarefas={filtered}
            onComplete={marcarConcluida}
            onUpload={uploadArquivo}
            onDeleteArquivo={deleteArquivo}
          />
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma tarefa encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// TIMELINE VIEW
// ═══════════════════════════════════════════════════
function TimelineView({ tarefas, weekOffset, setWeekOffset, onComplete, onUpload, onDeleteArquivo }: {
  tarefas: Tarefa[];
  weekOffset: number;
  setWeekOffset: (fn: (w: number) => number) => void;
  onComplete: (id: string, j?: string) => Promise<void>;
  onUpload: (id: string, f: File) => Promise<void>;
  onDeleteArquivo: (id: string, url?: string) => Promise<void>;
}) {
  const groups = useMemo(() => {
    const taskMap: Record<string, Tarefa[]> = {};
    tarefas.forEach(t => {
      const key = t.prazoEntrega || "__no_date__";
      if (!taskMap[key]) taskMap[key] = [];
      taskMap[key].push(t);
    });

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 3 + weekOffset * 7);

    const days: { dateKey: string; tasks: Tarefa[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toDateKey(d);
      days.push({ dateKey: key, tasks: taskMap[key] || [] });
    }

    const windowKeys = new Set(days.map(d => d.dateKey));
    const extraBefore = Object.keys(taskMap).filter(k => k !== "__no_date__" && !windowKeys.has(k) && k < days[0].dateKey).sort();
    const extraAfter = Object.keys(taskMap).filter(k => k !== "__no_date__" && !windowKeys.has(k) && k > days[days.length - 1].dateKey).sort();

    const result = [
      ...extraBefore.map(k => ({ dateKey: k, tasks: taskMap[k] })),
      ...days,
      ...extraAfter.map(k => ({ dateKey: k, tasks: taskMap[k] })),
    ];
    if (taskMap["__no_date__"]?.length) result.push({ dateKey: "__no_date__", tasks: taskMap["__no_date__"] });
    return result;
  }, [tarefas, weekOffset]);

  return (
    <div className="space-y-4">
      {/* Week nav */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg bg-card/60 border border-foreground/8 hover:bg-card text-muted-foreground hover:text-foreground transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => setWeekOffset(() => 0)} className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20">
          <Calendar className="w-3 h-3 inline mr-1" />Hoje
        </button>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg bg-card/60 border border-foreground/8 hover:bg-card text-muted-foreground hover:text-foreground transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-foreground/10 to-transparent" />

        {groups.map((group, idx) => {
          const { dateKey, tasks } = group;
          const noDate = dateKey === "__no_date__";
          const today = !noDate && isToday(dateKey);
          const hasTasks = tasks.length > 0;
          const groupColor = hasTasks
            ? (() => {
                const colors = tasks.map(getTaskStatusColor);
                if (colors.includes("red")) return "red";
                if (colors.includes("yellow")) return "yellow";
                if (colors.includes("green")) return "green";
                return "blue";
              })()
            : "green";

          return (
            <motion.div
              key={dateKey}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.5) }}
              className="relative pl-14 pb-6"
            >
              {/* Dot */}
              <div className={`absolute left-3 top-1 w-5 h-5 rounded-full flex items-center justify-center
                ${today ? "ring-4 ring-primary/20" : ""}
                bg-gradient-to-br ${STATUS_COLOR_CONFIG[groupColor as TaskStatusColor].dot.replace("bg-", "from-")} to-foreground/20`}
              >
                <div className="w-2 h-2 rounded-full bg-white/80" />
              </div>

              {/* Date label */}
              <div className="mb-2">
                <span className={`text-xs font-bold ${today ? "text-primary" : "text-foreground/70"}`}>
                  {noDate ? "Sem prazo" : formatDateLabel(dateKey)}
                </span>
                {!noDate && (
                  <span className="text-[10px] text-muted-foreground/50 ml-2">
                    {new Date(dateKey + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short", weekday: "short" })}
                  </span>
                )}
              </div>

              {/* Task cards */}
              {hasTasks ? (
                <div className="space-y-2">
                  {tasks.map(t => (
                    <ClienteTaskCard key={t.id} tarefa={t} onComplete={onComplete} onUpload={onUpload} onDeleteArquivo={onDeleteArquivo} />
                  ))}
                </div>
              ) : (
                <div className="py-2 text-[11px] text-muted-foreground/40 italic">Nenhuma tarefa</div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// LIST VIEW
// ═══════════════════════════════════════════════════
function ListView({ tarefas, onComplete, onUpload, onDeleteArquivo }: {
  tarefas: Tarefa[];
  onComplete: (id: string, j?: string) => Promise<void>;
  onUpload: (id: string, f: File) => Promise<void>;
  onDeleteArquivo: (id: string, url?: string) => Promise<void>;
}) {
  // Sort: overdue first, then by deadline ascending
  const sorted = useMemo(() => {
    return [...tarefas].sort((a, b) => {
      const aColor = getTaskStatusColor(a);
      const bColor = getTaskStatusColor(b);
      const order: Record<TaskStatusColor, number> = { red: 0, yellow: 1, green: 2, orange: 3, blue: 4 };
      return (order[aColor] ?? 5) - (order[bColor] ?? 5);
    });
  }, [tarefas]);

  return (
    <div className="space-y-2">
      {sorted.map(t => (
        <ClienteTaskCard key={t.id} tarefa={t} onComplete={onComplete} onUpload={onUpload} onDeleteArquivo={onDeleteArquivo} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// KANBAN VIEW
// ═══════════════════════════════════════════════════
function KanbanView({ tarefas, onComplete, onUpload, onDeleteArquivo }: {
  tarefas: Tarefa[];
  onComplete: (id: string, j?: string) => Promise<void>;
  onUpload: (id: string, f: File) => Promise<void>;
  onDeleteArquivo: (id: string, url?: string) => Promise<void>;
}) {
  const columns: { color: TaskStatusColor; label: string; tasks: Tarefa[] }[] = useMemo(() => {
    const groups: Record<TaskStatusColor, Tarefa[]> = { green: [], yellow: [], red: [], blue: [], orange: [] };
    tarefas.forEach(t => { groups[getTaskStatusColor(t)].push(t); });
    return [
      { color: "green" as const, label: "A fazer", tasks: groups.green },
      { color: "yellow" as const, label: "Atenção", tasks: groups.yellow },
      { color: "red" as const, label: "Em atraso", tasks: groups.red },
      { color: "blue" as const, label: "Concluídas", tasks: groups.blue },
      { color: "orange" as const, label: "Justificadas", tasks: groups.orange },
    ].filter(c => c.tasks.length > 0);
  }, [tarefas]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(col => (
        <div key={col.color} className="min-w-[280px] flex-1">
          <div className={`flex items-center gap-2 mb-3 px-1`}>
            <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLOR_CONFIG[col.color].dot}`} />
            <span className={`text-xs font-bold ${STATUS_COLOR_CONFIG[col.color].text}`}>{col.label}</span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">{col.tasks.length}</span>
          </div>
          <div className="space-y-2">
            {col.tasks.map(t => (
              <ClienteTaskCard key={t.id} tarefa={t} onComplete={onComplete} onUpload={onUpload} onDeleteArquivo={onDeleteArquivo} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
