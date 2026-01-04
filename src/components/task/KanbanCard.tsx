import { Trash2, Clock } from "lucide-react";
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
      bg-card/60 backdrop-blur-xl rounded-lg border border-foreground/10 p-2
      hover:border-red-500/30 hover:shadow-md hover:shadow-red-500/10
      transition-all duration-200 cursor-pointer group
    ">
      <div className="flex items-center gap-2">
        {/* Priority indicator */}
        <div className={`w-1.5 h-8 rounded-full ${prioridadeColors[tarefa.prioridade]} flex-shrink-0`} />
        
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm text-foreground truncate flex-1">{tarefa.titulo}</h4>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{progresso}%</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground truncate">{empresaNome}</span>
            {tarefa.dataVencimento && (
              <>
                <span className="text-[10px] text-muted-foreground">•</span>
                <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{tarefa.dataVencimento}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress bar mini */}
        <div className="w-12 h-1 bg-foreground/10 rounded-full overflow-hidden flex-shrink-0">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
            style={{ width: `${progresso}%` }}
          />
        </div>

        {/* Delete button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all flex-shrink-0"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>
    </div>
  );
}
