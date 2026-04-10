import React, { useState, useRef } from "react";
import { Tarefa } from "@/types/task";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Upload, FileText, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Trash2, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Color system based on deadline proximity
export type TaskStatusColor = "green" | "yellow" | "red" | "blue" | "orange";

function getDaysUntilDeadline(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T12:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTaskStatusColor(tarefa: Tarefa): TaskStatusColor {
  if (tarefa.status === "concluida") {
    return tarefa.justificativa ? "orange" : "blue";
  }
  if (!tarefa.prazoEntrega) return "green";
  const days = getDaysUntilDeadline(tarefa.prazoEntrega);
  if (days < 0) return "red";
  if (days <= 2) return "yellow";
  return "green";
}

export const STATUS_COLOR_CONFIG: Record<TaskStatusColor, {
  bg: string; border: string; text: string; dot: string; label: string; accent: string;
}> = {
  green:  { bg: "bg-emerald-500/8",  border: "border-emerald-500/20", text: "text-emerald-500", dot: "bg-emerald-500", label: "A fazer",      accent: "from-emerald-500/20 to-transparent" },
  yellow: { bg: "bg-amber-500/8",    border: "border-amber-500/20",   text: "text-amber-500",   dot: "bg-amber-500",   label: "Atenção",      accent: "from-amber-500/20 to-transparent" },
  red:    { bg: "bg-red-500/8",      border: "border-red-500/20",     text: "text-red-500",     dot: "bg-red-500",     label: "Em atraso",    accent: "from-red-500/20 to-transparent" },
  blue:   { bg: "bg-blue-500/8",     border: "border-blue-500/20",    text: "text-blue-500",    dot: "bg-blue-500",    label: "Concluída",    accent: "from-blue-500/20 to-transparent" },
  orange: { bg: "bg-orange-500/8",   border: "border-orange-500/20",  text: "text-orange-500",  dot: "bg-orange-500",  label: "Justificada",  accent: "from-orange-500/20 to-transparent" },
};

interface ClienteTaskCardProps {
  tarefa: Tarefa;
  onComplete: (id: string, justificativa?: string) => Promise<void>;
  onUpload: (tarefaId: string, file: File) => Promise<void>;
  onDeleteArquivo: (arquivoId: string, url?: string) => Promise<void>;
}

export function ClienteTaskCard({ tarefa, onComplete, onUpload, onDeleteArquivo }: ClienteTaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showJustificativa, setShowJustificativa] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const color = getTaskStatusColor(tarefa);
  const config = STATUS_COLOR_CONFIG[color];
  const isConcluida = tarefa.status === "concluida";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onUpload(tarefa.id, file);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleComplete = async () => {
    if (showJustificativa && justificativa.trim()) {
      await onComplete(tarefa.id, justificativa.trim());
      setShowJustificativa(false);
      setJustificativa("");
    } else {
      await onComplete(tarefa.id);
    }
  };

  const prazoLabel = tarefa.prazoEntrega
    ? (() => {
        const days = getDaysUntilDeadline(tarefa.prazoEntrega!);
        if (days < 0) return `${Math.abs(days)}d em atraso`;
        if (days === 0) return "Vence hoje";
        if (days === 1) return "Vence amanhã";
        return `${days}d restantes`;
      })()
    : "Sem prazo";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden transition-all`}
    >
      {/* Top accent bar */}
      <div className={`h-1 bg-gradient-to-r ${config.accent}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${config.dot}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.text}`}>
                {config.label}
              </span>
            </div>
            <h3 className={`text-sm font-semibold text-foreground ${isConcluida ? "line-through opacity-60" : ""}`}>
              {tarefa.titulo}
            </h3>
            {tarefa.descricao && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tarefa.descricao}</p>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg hover:bg-foreground/5 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{prazoLabel}</span>
          </div>
          {tarefa.departamento && (
            <span className="px-1.5 py-0.5 rounded bg-foreground/5 text-[10px]">
              {tarefa.departamento === "fiscal" ? "Fiscal" : tarefa.departamento === "contabil" ? "Contábil" : "Depto. Pessoal"}
            </span>
          )}
          {tarefa.arquivos && tarefa.arquivos.length > 0 && (
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{tarefa.arquivos.length} arquivo(s)</span>
            </div>
          )}
          {tarefa.requerAnexo && !isConcluida && (
            <div className="flex items-center gap-1 text-amber-500">
              <AlertTriangle className="w-3 h-3" />
              <span>Requer anexo</span>
            </div>
          )}
        </div>

        {/* Expanded area */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3 pt-3 border-t border-foreground/5">
                {/* Arquivos list */}
                {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Documentos</span>
                    {tarefa.arquivos.map(a => (
                      <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-foreground/3">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs truncate">{a.nome}</span>
                        </div>
                        {!isConcluida && (
                          <button
                            onClick={() => onDeleteArquivo(a.id, a.url)}
                            className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload */}
                {!isConcluida && (
                  <div>
                    <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-full text-xs h-8 gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? "Enviando..." : "Enviar documento"}
                    </Button>
                  </div>
                )}

                {/* Justificativa for completion */}
                {!isConcluida && showJustificativa && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Motivo da conclusão fora do prazo..."
                      value={justificativa}
                      onChange={e => setJustificativa(e.target.value)}
                      className="text-xs min-h-[60px] bg-foreground/3"
                    />
                  </div>
                )}

                {/* Justificativa display */}
                {isConcluida && tarefa.justificativa && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/15">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">{tarefa.justificativa}</p>
                  </div>
                )}

                {/* Actions */}
                {!isConcluida && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleComplete}
                      className="flex-1 text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Concluir tarefa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowJustificativa(!showJustificativa)}
                      className={`text-xs h-8 gap-1 ${showJustificativa ? "border-orange-500/30 text-orange-500" : ""}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {showJustificativa ? "Cancelar" : "Justificar"}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
