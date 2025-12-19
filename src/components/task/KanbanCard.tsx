import { Trash2, Clock, User } from "lucide-react";
import { Tarefa } from "@/types/task";

interface KanbanCardProps {
  tarefa: Tarefa;
  empresaNome: string;
  onDelete: () => void;
  onStatusChange: (status: Tarefa["status"]) => void;
}

const prioridadeColors = {
  baixa: "bg-green-500",
  media: "bg-yellow-500",
  alta: "bg-red-500",
};

export function KanbanCard({ tarefa, empresaNome, onDelete }: KanbanCardProps) {
  const progresso = tarefa.progresso || (tarefa.status === "concluida" ? 100 : tarefa.status === "em_andamento" ? 50 : 0);

  return (
    <div className="
      bg-card/60 backdrop-blur-xl rounded-xl border border-foreground/10 p-3
      hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10
      transition-all duration-300 cursor-pointer group
    ">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-2 h-2 rounded-full ${prioridadeColors[tarefa.prioridade]} animate-pulse`} />
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>

      <h4 className="font-medium text-sm text-foreground mb-1 line-clamp-2">{tarefa.titulo}</h4>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{tarefa.descricao}</p>

      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Progresso</span>
          <span>{progresso}%</span>
        </div>
        <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <User className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] text-muted-foreground">{empresaNome}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{tarefa.dataVencimento}</span>
        </div>
      </div>
    </div>
  );
}
