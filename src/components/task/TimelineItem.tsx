import { Plus, CheckSquare, MessageSquare, Edit } from "lucide-react";
import { Atividade } from "@/types/task";

const tipoIcons = {
  criacao: <Plus className="w-3 h-3" />,
  conclusao: <CheckSquare className="w-3 h-3" />,
  comentario: <MessageSquare className="w-3 h-3" />,
  edicao: <Edit className="w-3 h-3" />,
};

const tipoColors = {
  criacao: "bg-green-500/20 text-green-400 border-green-500/30",
  conclusao: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  comentario: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  edicao: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export function TimelineItem({ atividade }: { atividade: Atividade }) {
  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className={`p-1.5 rounded-lg border ${tipoColors[atividade.tipo]}`}>
          {tipoIcons[atividade.tipo]}
        </div>
        <div className="w-px h-full bg-foreground/10 group-last:hidden" />
      </div>
      <div className="pb-4">
        <p className="text-sm text-foreground">{atividade.descricao}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{atividade.usuario}</span>
          <span>•</span>
          <span>{atividade.timestamp}</span>
        </div>
      </div>
    </div>
  );
}
