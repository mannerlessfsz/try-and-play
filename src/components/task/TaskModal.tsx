import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tarefa, Empresa } from "@/types/task";

interface TaskModalProps {
  novaTarefa: Partial<Tarefa>;
  setNovaTarefa: React.Dispatch<React.SetStateAction<Partial<Tarefa>>>;
  empresas: Empresa[];
  onSave: () => void;
  onClose: () => void;
}

export function TaskModal({ novaTarefa, setNovaTarefa, empresas, onSave, onClose }: TaskModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-red-500/20 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Nova Tarefa</h2>
          <button onClick={onClose} className="p-1 hover:bg-foreground/10 rounded">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-foreground/80">Título *</Label>
            <Input 
              value={novaTarefa.titulo || ""}
              onChange={e => setNovaTarefa(prev => ({ ...prev, titulo: e.target.value }))}
              className="mt-1 bg-background/50 border-foreground/20"
              placeholder="Nome da tarefa"
            />
          </div>
          
          <div>
            <Label className="text-sm text-foreground/80">Descrição</Label>
            <Textarea 
              value={novaTarefa.descricao || ""}
              onChange={e => setNovaTarefa(prev => ({ ...prev, descricao: e.target.value }))}
              className="mt-1 bg-background/50 border-foreground/20"
              placeholder="Detalhes da tarefa"
              rows={2}
            />
          </div>
          
          <div>
            <Label className="text-sm text-foreground/80">Empresa *</Label>
            <Select onValueChange={v => setNovaTarefa(prev => ({ ...prev, empresaId: v }))}>
              <SelectTrigger className="mt-1 bg-background/50 border-foreground/20">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-foreground/80">Prioridade</Label>
              <Select 
                defaultValue="media"
                onValueChange={v => setNovaTarefa(prev => ({ ...prev, prioridade: v as Tarefa["prioridade"] }))}
              >
                <SelectTrigger className="mt-1 bg-background/50 border-foreground/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm text-foreground/80">Vencimento</Label>
              <Input 
                type="date"
                value={novaTarefa.dataVencimento || ""}
                onChange={e => setNovaTarefa(prev => ({ ...prev, dataVencimento: e.target.value }))}
                className="mt-1 bg-background/50 border-foreground/20"
              />
            </div>
          </div>
          
          <Button onClick={onSave} className="w-full bg-red-500 hover:bg-red-600 text-white">
            <Save className="w-4 h-4 mr-2" /> Salvar Tarefa
          </Button>
        </div>
      </div>
    </div>
  );
}
