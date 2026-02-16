import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckSquare, MessageSquare, Edit, Activity } from "lucide-react";
import { Atividade } from "@/types/task";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityPulseFeedProps {
  atividades: Atividade[];
}

const tipoConfig = {
  criacao: { icon: Plus, color: "bg-green-500", ring: "ring-green-500/30", label: "Criação" },
  conclusao: { icon: CheckSquare, color: "bg-blue-500", ring: "ring-blue-500/30", label: "Conclusão" },
  comentario: { icon: MessageSquare, color: "bg-yellow-500", ring: "ring-yellow-500/30", label: "Comentário" },
  edicao: { icon: Edit, color: "bg-purple-500", ring: "ring-purple-500/30", label: "Edição" },
};

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function ActivityPulseFeed({ atividades }: ActivityPulseFeedProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const displayItems = atividades.slice(0, 20);

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground/40">
        <Activity className="w-5 h-5 mx-auto mb-2 opacity-40" />
        <p className="text-[10px]">Nenhuma atividade</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        </div>
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
          Atividade Recente
        </span>
        <span className="text-[9px] text-muted-foreground/60 tabular-nums ml-auto">
          {displayItems.length}
        </span>
      </div>

      {/* Vertical timeline */}
      <div className="relative space-y-0">
        {/* Connection line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/20 via-foreground/10 to-transparent" />

        {displayItems.map((atividade, index) => {
          const config = tipoConfig[atividade.tipo];
          const Icon = config.icon;
          const isHovered = hoveredId === atividade.id;

          return (
            <motion.div
              key={atividade.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              className={`
                relative flex items-start gap-2.5 py-1.5 px-1 rounded-lg
                transition-all duration-150 cursor-default
                ${isHovered ? "bg-foreground/5" : ""}
              `}
              onMouseEnter={() => setHoveredId(atividade.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Pulse node */}
              <div className="relative z-10 flex-shrink-0 mt-0.5">
                <motion.div
                  whileHover={{ scale: 1.3 }}
                  className={`
                    w-[18px] h-[18px] rounded-full ${config.color}
                    flex items-center justify-center
                    ring-2 ${config.ring} ring-offset-1 ring-offset-card
                  `}
                >
                  <Icon className="w-2 h-2 text-white" />
                  {index === 0 && (
                    <span className={`absolute inset-0 rounded-full ${config.color} animate-ping opacity-30`} />
                  )}
                </motion.div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground/80 leading-snug line-clamp-2">
                  {atividade.descricao}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-medium text-muted-foreground/60">
                    {config.label}
                  </span>
                  <span className="text-[8px] text-muted-foreground/40">•</span>
                  <span className="text-[9px] text-muted-foreground/50 tabular-nums">
                    {formatTime(atividade.data)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
