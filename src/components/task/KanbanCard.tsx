import { Trash2, Clock, FileText, Building2, CheckCircle2, Timer, Circle } from "lucide-react";
import { Tarefa } from "@/types/task";
import { motion } from "framer-motion";

interface KanbanCardProps {
  tarefa: Tarefa;
  empresaNome: string;
  onDelete: () => void;
  onStatusChange: (status: Tarefa["status"]) => void;
}

const prioridadeConfig: Record<string, { color: string; label: string; pulse?: boolean }> = {
  baixa: { color: "bg-green-500", label: "Baixa" },
  media: { color: "bg-yellow-500", label: "Média" },
  alta: { color: "bg-red-500", label: "Alta", pulse: true },
  urgente: { color: "bg-purple-500", label: "Urgente", pulse: true },
};

const statusIcons = {
  pendente: <Circle className="w-3 h-3" />,
  em_andamento: <Timer className="w-3 h-3" />,
  concluida: <CheckCircle2 className="w-3 h-3" />,
};

export function KanbanCard({ tarefa, empresaNome, onDelete, onStatusChange }: KanbanCardProps) {
  const progresso = tarefa.progresso || (tarefa.status === "concluida" ? 100 : tarefa.status === "em_andamento" ? 50 : 0);
  const prio = prioridadeConfig[tarefa.prioridade] || prioridadeConfig.media;
  const isOverdue = tarefa.prazoEntrega && new Date(tarefa.prazoEntrega + "T23:59:59") < new Date() && tarefa.status !== "concluida";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`
        relative bg-card/60 backdrop-blur-xl rounded-xl border p-3
        hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer group
        ${isOverdue ? "border-yellow-500/30 bg-yellow-500/5" : "border-foreground/8 hover:border-primary/30"}
        ${tarefa.status === "concluida" ? "opacity-60" : ""}
      `}
    >
      {/* Priority line */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${prio.color} ${prio.pulse ? "animate-pulse" : ""}`} />

      <div className="pl-2.5 space-y-2">
        {/* Title row */}
        <div className="flex items-start gap-2">
          <h4 className={`font-medium text-sm text-foreground flex-1 leading-snug ${tarefa.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
            {tarefa.titulo}
          </h4>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded-lg transition-all flex-shrink-0"
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
            {empresaNome}
          </span>
          {tarefa.prazoEntrega && (
            <span className={`flex items-center gap-1 flex-shrink-0 ${isOverdue ? "text-yellow-400 font-medium" : ""}`}>
              <Clock className="w-2.5 h-2.5" />
              {new Date(tarefa.prazoEntrega + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
          {tarefa.arquivos && tarefa.arquivos.length > 0 && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <FileText className="w-2.5 h-2.5" />{tarefa.arquivos.length}
            </span>
          )}
        </div>

        {/* Bottom: progress + status quick actions */}
        <div className="flex items-center gap-2">
          {/* Progress */}
          <div className="flex-1 h-1 bg-foreground/8 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progresso}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            />
          </div>
          <span className="text-[9px] text-muted-foreground tabular-nums w-7 text-right">{progresso}%</span>

          {/* Mini status toggle */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {(["pendente", "em_andamento", "concluida"] as const).map(s => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); onStatusChange(s); }}
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
        </div>
      </div>
    </motion.div>
  );
}
