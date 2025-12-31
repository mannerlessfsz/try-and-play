import { Plus, CheckSquare, MessageSquare, Edit } from "lucide-react";
import { Atividade } from "@/types/task";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const tipoLabels = {
  criacao: "Criado",
  conclusao: "Concluído",
  comentario: "Comentário",
  edicao: "Editado",
};

function formatTimestamp(dateStr?: string, timestamp?: string): string {
  if (timestamp) return timestamp;
  if (!dateStr) return "";
  
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function TimelineItem({ atividade }: { atividade: Atividade }) {
  const formattedTime = formatTimestamp(atividade.data, atividade.timestamp);
  
  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className={`p-1.5 rounded-lg border ${tipoColors[atividade.tipo]}`}>
          {tipoIcons[atividade.tipo]}
        </div>
        <div className="w-px h-full bg-foreground/10 group-last:hidden" />
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${tipoColors[atividade.tipo]}`}>
            {tipoLabels[atividade.tipo]}
          </span>
        </div>
        <p className="text-xs text-foreground line-clamp-2">{atividade.descricao}</p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
          {atividade.usuario && (
            <>
              <span>{atividade.usuario}</span>
              <span>•</span>
            </>
          )}
          <span>{formattedTime}</span>
        </div>
      </div>
    </div>
  );
}
