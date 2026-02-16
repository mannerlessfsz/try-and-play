import { Trash2, Clock, FileText, Building2, CheckCircle2, Timer, Circle, GripVertical } from "lucide-react";
import { Tarefa } from "@/types/task";
import { motion } from "framer-motion";

interface KanbanCardProps {
  tarefa: Tarefa;
  empresaNome: string;
  onDelete: () => void;
  onStatusChange: (status: Tarefa["status"]) => void;
  index?: number;
}

const prioridadeConfig: Record<string, { color: string; glow: string; label: string }> = {
  baixa: { color: "bg-green-500", glow: "", label: "Baixa" },
  media: { color: "bg-yellow-500", glow: "", label: "Média" },
  alta: { color: "bg-red-500", glow: "shadow-[0_0_8px_rgba(239,68,68,0.3)]", label: "Alta" },
  urgente: { color: "bg-purple-500", glow: "shadow-[0_0_8px_rgba(168,85,247,0.3)]", label: "Urgente" },
};

const statusIcons = {
  pendente: <Circle className="w-3 h-3" />,
  em_andamento: <Timer className="w-3 h-3" />,
  concluida: <CheckCircle2 className="w-3 h-3" />,
};

export function KanbanCard({ tarefa, empresaNome, onDelete, onStatusChange, index = 0 }: KanbanCardProps) {
  const progresso = tarefa.progresso || (tarefa.status === "concluida" ? 100 : tarefa.status === "em_andamento" ? 50 : 0);
  const prio = prioridadeConfig[tarefa.prioridade] || prioridadeConfig.media;
  const isOverdue = tarefa.prazoEntrega && new Date(tarefa.prazoEntrega + "T23:59:59") < new Date() && tarefa.status !== "concluida";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, rotateZ: -1 }}
      animate={{ opacity: 1, x: 0, rotateZ: 0 }}
      exit={{ opacity: 0, scale: 0.9, rotateZ: 2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, delay: index * 0.04 }}
      whileHover={{ 
        y: -4, 
        scale: 1.02,
        rotateZ: 0.5,
        transition: { type: "spring", stiffness: 600, damping: 20 }
      }}
      className={`
        relative rounded-xl border overflow-hidden cursor-pointer group
        ${isOverdue 
          ? "border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 via-card/60 to-card/60" 
          : "border-foreground/6 bg-card/50 hover:border-primary/20"
        }
        ${tarefa.status === "concluida" ? "opacity-50" : ""}
        backdrop-blur-xl transition-colors duration-200
      `}
      style={{
        boxShadow: tarefa.status !== "concluida" ? "0 2px 12px -4px rgba(0,0,0,0.3)" : "none"
      }}
    >
      {/* Top accent stripe */}
      <div className={`h-[2px] ${prio.color} ${prio.glow}`} />

      <div className="p-3 space-y-2.5">
        {/* Title row */}
        <div className="flex items-start gap-2">
          <div className="opacity-0 group-hover:opacity-30 transition-opacity mt-0.5">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
          <h4 className={`font-semibold text-[13px] text-foreground flex-1 leading-snug ${tarefa.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
            {tarefa.titulo}
          </h4>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded-lg transition-all flex-shrink-0"
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>

        {/* Meta chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-foreground/5 text-muted-foreground">
            <Building2 className="w-2.5 h-2.5" />
            {empresaNome}
          </span>
          {tarefa.prazoEntrega && (
            <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md ${isOverdue ? "bg-yellow-500/15 text-yellow-400" : "bg-foreground/5 text-muted-foreground"}`}>
              <Clock className="w-2.5 h-2.5" />
              {new Date(tarefa.prazoEntrega + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
          {tarefa.arquivos && tarefa.arquivos.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-foreground/5 text-muted-foreground">
              <FileText className="w-2.5 h-2.5" />{tarefa.arquivos.length}
            </span>
          )}
        </div>

        {/* Bottom: progress + quick status */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-foreground/6 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progresso}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.04 }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))`
              }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground tabular-nums">{progresso}%</span>

          {/* Status dots - always visible but subtle */}
          <div className="flex items-center gap-1 ml-1">
            {(["pendente", "em_andamento", "concluida"] as const).map(s => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); onStatusChange(s); }}
                className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                  tarefa.status === s
                    ? s === "concluida" ? "bg-green-500/20 text-green-400 scale-110"
                      : s === "em_andamento" ? "bg-blue-500/20 text-blue-400 scale-110"
                        : "bg-foreground/10 text-foreground/40 scale-110"
                    : "text-muted-foreground/15 hover:text-foreground/40 hover:bg-foreground/5"
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
