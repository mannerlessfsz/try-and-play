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
  const [isExpanded, setIsExpanded] = useState(false);
  const displayItems = atividades.slice(0, 20);

  if (displayItems.length === 0) return null;

  return (
    <div className="border-t border-foreground/5 pt-3">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-2 group cursor-pointer w-full"
      >
        <div className="relative">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
          Atividade
        </span>
        <span className="text-[9px] text-muted-foreground/60 tabular-nums">{displayItems.length}</span>
        
        {/* Pulse line preview when collapsed */}
        {!isExpanded && (
          <div className="flex-1 flex items-center gap-1 ml-2 overflow-hidden">
            <div className="h-px flex-1 bg-gradient-to-r from-foreground/5 via-foreground/10 to-foreground/5" />
            {displayItems.slice(0, 12).map((a, i) => {
              const config = tipoConfig[a.tipo];
              return (
                <motion.div
                  key={a.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.03, type: "spring", stiffness: 500 }}
                  className={`w-1.5 h-1.5 rounded-full ${config.color} flex-shrink-0`}
                  style={{ opacity: 1 - i * 0.06 }}
                />
              );
            })}
            <div className="h-px flex-1 bg-gradient-to-r from-foreground/10 via-foreground/5 to-transparent" />
          </div>
        )}

        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-muted-foreground/40 text-[10px] ml-auto flex-shrink-0"
        >
          ▾
        </motion.span>
      </button>

      {/* Expanded feed */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {/* Horizontal pulse rail */}
            <div className="relative flex items-center gap-0 py-3 overflow-x-auto scrollbar-thin">
              {/* Connection line */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
              
              {displayItems.map((atividade, index) => {
                const config = tipoConfig[atividade.tipo];
                const Icon = config.icon;
                const isHovered = hoveredId === atividade.id;

                return (
                  <div
                    key={atividade.id}
                    className="relative flex flex-col items-center flex-shrink-0 px-1"
                    onMouseEnter={() => setHoveredId(atividade.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Pulse node */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        delay: index * 0.04,
                        type: "spring",
                        stiffness: 400,
                        damping: 20 
                      }}
                      whileHover={{ scale: 1.6 }}
                      className={`
                        relative z-10 w-5 h-5 rounded-full ${config.color} cursor-pointer
                        flex items-center justify-center
                        ring-2 ${config.ring} ring-offset-1 ring-offset-background
                        transition-shadow duration-200
                        ${isHovered ? "shadow-lg" : ""}
                      `}
                    >
                      <Icon className="w-2.5 h-2.5 text-white" />
                      
                      {/* Ripple effect on newest */}
                      {index === 0 && (
                        <span className={`absolute inset-0 rounded-full ${config.color} animate-ping opacity-30`} />
                      )}
                    </motion.div>

                    {/* Tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 5, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full mt-2 z-50 w-48 bg-card border border-foreground/10 rounded-lg shadow-xl p-2.5 pointer-events-none"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`w-2 h-2 rounded-full ${config.color}`} />
                            <span className="text-[10px] font-semibold text-foreground">{config.label}</span>
                            <span className="text-[9px] text-muted-foreground ml-auto">{formatTime(atividade.data)}</span>
                          </div>
                          <p className="text-[11px] text-foreground/80 leading-snug line-clamp-2">{atividade.descricao}</p>
                          {/* Tooltip arrow */}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-card border-l border-t border-foreground/10 rotate-45" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Latest activity text preview */}
            {displayItems[0] && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${tipoConfig[displayItems[0].tipo].color} animate-pulse`} />
                <span className="truncate">{displayItems[0].descricao}</span>
                <span className="flex-shrink-0 text-muted-foreground/50">{formatTime(displayItems[0].data)}</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
