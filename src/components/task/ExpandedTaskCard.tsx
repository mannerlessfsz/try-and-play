import { useState, useRef } from "react";
import { Trash2, Clock, FileText, Upload, X, ChevronDown, ChevronUp, Calendar, Building2, ExternalLink } from "lucide-react";
import { Tarefa, TarefaArquivo, prioridadeColors, statusColors } from "@/types/task";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface ExpandedTaskCardProps {
  tarefa: Tarefa;
  empresaNome: string;
  onDelete: () => void;
  onStatusChange: (status: Tarefa["status"]) => void;
  onUploadArquivo?: (file: File) => Promise<void>;
  onDeleteArquivo?: (arquivoId: string, url?: string) => Promise<void>;
  // Legacy prop for local state management
  onUpdateArquivos?: (arquivos: TarefaArquivo[]) => void;
  defaultExpanded?: boolean;
}

const statusLabels = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
};

export function ExpandedTaskCard({ 
  tarefa, 
  empresaNome, 
  onDelete, 
  onStatusChange,
  onUploadArquivo,
  onDeleteArquivo,
  onUpdateArquivos,
  defaultExpanded = false
}: ExpandedTaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progresso = tarefa.progresso || (tarefa.status === "concluida" ? 100 : tarefa.status === "em_andamento" ? 50 : 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // If we have the new upload handler, use it
    if (onUploadArquivo) {
      setIsUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type !== "application/pdf") {
            toast({ title: "Apenas arquivos PDF são permitidos", variant: "destructive" });
            continue;
          }
          await onUploadArquivo(file);
        }
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
      return;
    }

    // Legacy local state handling
    if (onUpdateArquivos) {
      const novosArquivos: TarefaArquivo[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== "application/pdf") {
          toast({ title: "Apenas arquivos PDF são permitidos", variant: "destructive" });
          continue;
        }
        
        novosArquivos.push({
          id: Date.now().toString() + i,
          nome: file.name,
          tamanho: file.size,
          tipo: "pdf",
          dataUpload: new Date().toLocaleDateString("pt-BR"),
        });
      }

      if (novosArquivos.length > 0) {
        onUpdateArquivos([...(tarefa.arquivos || []), ...novosArquivos]);
        toast({ title: `${novosArquivos.length} arquivo(s) adicionado(s)` });
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = async (arquivo: TarefaArquivo) => {
    if (onDeleteArquivo) {
      await onDeleteArquivo(arquivo.id, arquivo.url);
    } else if (onUpdateArquivos) {
      onUpdateArquivos((tarefa.arquivos || []).filter(a => a.id !== arquivo.id));
      toast({ title: "Arquivo removido" });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="bg-card/90 rounded-lg border border-foreground/10 overflow-hidden hover:border-red-500/30 transition-all duration-200">
      {/* Header - Compact */}
      <div 
        className="px-3 py-2 cursor-pointer flex items-center gap-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Priority indicator */}
        <div className={`w-1.5 h-6 rounded-full flex-shrink-0 ${tarefa.prioridade === "alta" ? "bg-red-500" : tarefa.prioridade === "media" ? "bg-yellow-500" : "bg-green-500"}`} />
        
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${prioridadeColors[tarefa.prioridade]}`}>
            {tarefa.prioridade === "alta" ? "Urgente" : tarefa.prioridade === "media" ? "Média" : "Baixa"}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[tarefa.status]}`}>
            {statusLabels[tarefa.status]}
          </span>
        </div>
        
        {/* Title and description */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground truncate">{tarefa.titulo}</h4>
          <p className="text-[11px] text-muted-foreground truncate">{tarefa.descricao}</p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:bg-red-500/20 rounded transition-all text-muted-foreground hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-foreground/10 pt-3">
          {/* Meta Info - Compact horizontal */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-red-400" />
              <span className="text-muted-foreground">{empresaNome}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-red-400" />
              <span className="text-muted-foreground">{tarefa.dataVencimento || "-"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-red-400" />
              <span className="text-muted-foreground">{tarefa.criadoEm || "-"}</span>
            </div>
            {/* Progress inline */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-muted-foreground">{progresso}%</span>
              <div className="w-16 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
          </div>

          {/* Status Actions - Compact */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Status:</span>
            {(["pendente", "em_andamento", "concluida"] as const).map(status => (
              <Button
                key={status}
                size="sm"
                variant={tarefa.status === status ? "default" : "outline"}
                className={`text-[10px] h-6 px-2 ${tarefa.status === status ? "bg-red-500 hover:bg-red-600" : "border-foreground/20 hover:border-red-500/50"}`}
                onClick={() => onStatusChange(status)}
              >
                {statusLabels[status]}
              </Button>
            ))}
          </div>

          {/* File Upload Section */}
          <div className="border-t border-foreground/10 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-foreground">Documentos Anexados</span>
                {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                    {tarefa.arquivos.length}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-red-500/50 text-red-300 hover:bg-red-500/20"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-3 h-3 mr-1" />
                {isUploading ? "Enviando..." : "Enviar PDF"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* File List */}
            {tarefa.arquivos && tarefa.arquivos.length > 0 ? (
              <div className="space-y-2">
                {tarefa.arquivos.map(arquivo => (
                  <div 
                    key={arquivo.id}
                    className="flex items-center gap-3 p-2 bg-background/50 rounded-lg border border-foreground/10 group"
                  >
                    <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{arquivo.nome}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(arquivo.tamanho)}</p>
                    </div>
                    {arquivo.url && (
                      <a
                        href={arquivo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-blue-500/20 rounded transition-all text-muted-foreground hover:text-blue-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => handleRemoveFile(arquivo)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded transition-all text-muted-foreground hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-foreground/20 rounded-lg">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
                <p className="text-xs text-muted-foreground/60">Clique em "Enviar PDF" para adicionar documentos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
