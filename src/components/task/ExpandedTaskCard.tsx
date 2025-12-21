import { useState, useRef } from "react";
import { Trash2, Clock, User, FileText, Upload, X, ChevronDown, ChevronUp, Flag, Calendar, Building2 } from "lucide-react";
import { Tarefa, TarefaArquivo, prioridadeColors, statusColors } from "@/types/task";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface ExpandedTaskCardProps {
  tarefa: Tarefa;
  empresaNome: string;
  onDelete: () => void;
  onStatusChange: (status: Tarefa["status"]) => void;
  onUpdateArquivos: (arquivos: TarefaArquivo[]) => void;
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
  onUpdateArquivos 
}: ExpandedTaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progresso = tarefa.progresso || (tarefa.status === "concluida" ? 100 : tarefa.status === "em_andamento" ? 50 : 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

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
        tamanho: formatFileSize(file.size),
        tipo: "pdf",
        dataUpload: new Date().toLocaleDateString("pt-BR"),
      });
    }

    if (novosArquivos.length > 0) {
      onUpdateArquivos([...(tarefa.arquivos || []), ...novosArquivos]);
      toast({ title: `${novosArquivos.length} arquivo(s) adicionado(s)` });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (fileId: string) => {
    onUpdateArquivos((tarefa.arquivos || []).filter(a => a.id !== fileId));
    toast({ title: "Arquivo removido" });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-foreground/10 overflow-hidden hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer flex items-start justify-between gap-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${tarefa.prioridade === "alta" ? "bg-red-500 animate-pulse" : tarefa.prioridade === "media" ? "bg-yellow-500" : "bg-green-500"}`} />
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${prioridadeColors[tarefa.prioridade]}`}>
              {tarefa.prioridade === "alta" ? "Urgente" : tarefa.prioridade === "media" ? "Média" : "Baixa"}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusColors[tarefa.status]}`}>
              {statusLabels[tarefa.status]}
            </span>
          </div>
          <h4 className="font-semibold text-foreground mb-1">{tarefa.titulo}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">{tarefa.descricao}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 hover:bg-red-500/20 rounded transition-all text-muted-foreground hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-foreground/10 pt-4">
          {/* Meta Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-red-400" />
              <span className="text-muted-foreground">Empresa:</span>
              <span className="font-medium text-foreground">{empresaNome}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-red-400" />
              <span className="text-muted-foreground">Vencimento:</span>
              <span className="font-medium text-foreground">{tarefa.dataVencimento}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-red-400" />
              <span className="text-muted-foreground">Criado:</span>
              <span className="font-medium text-foreground">{tarefa.criadoEm || "-"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Flag className="w-4 h-4 text-red-400" />
              <span className="text-muted-foreground">Prioridade:</span>
              <span className={`font-medium ${tarefa.prioridade === "alta" ? "text-red-400" : tarefa.prioridade === "media" ? "text-yellow-400" : "text-green-400"}`}>
                {tarefa.prioridade.charAt(0).toUpperCase() + tarefa.prioridade.slice(1)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Progresso da tarefa</span>
              <span className="font-medium">{progresso}%</span>
            </div>
            <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          {/* Status Actions */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center mr-2">Alterar status:</span>
            {(["pendente", "em_andamento", "concluida"] as const).map(status => (
              <Button
                key={status}
                size="sm"
                variant={tarefa.status === status ? "default" : "outline"}
                className={`text-xs ${tarefa.status === status ? "bg-red-500 hover:bg-red-600" : "border-foreground/20 hover:border-red-500/50"}`}
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
                <span className="text-sm font-medium text-foreground">Arquivos PDF</span>
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
              >
                <Upload className="w-3 h-3 mr-1" />
                Upload PDF
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
                      <p className="text-xs text-muted-foreground">{arquivo.tamanho} • {arquivo.dataUpload}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(arquivo.id)}
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
                <p className="text-sm text-muted-foreground">Nenhum arquivo anexado</p>
                <p className="text-xs text-muted-foreground/60">Clique em "Upload PDF" para adicionar arquivos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}