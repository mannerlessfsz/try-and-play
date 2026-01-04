import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tarefa, Empresa, DepartamentoTipo } from "@/types/task";
import { useEmpresaContatos } from "@/hooks/useEmpresaContatos";
import { useEffect } from "react";

interface TaskModalProps {
  novaTarefa: Partial<Tarefa>;
  setNovaTarefa: React.Dispatch<React.SetStateAction<Partial<Tarefa>>>;
  empresas: Empresa[];
  onSave: () => void;
  onClose: () => void;
}

const DEPARTAMENTOS: { id: DepartamentoTipo; label: string }[] = [
  { id: 'fiscal', label: 'Fiscal' },
  { id: 'contabil', label: 'Contábil' },
  { id: 'departamento_pessoal', label: 'Depto. Pessoal' },
];

export function TaskModal({ novaTarefa, setNovaTarefa, empresas, onSave, onClose }: TaskModalProps) {
  const { contatos, loading: contatosLoading } = useEmpresaContatos(novaTarefa.empresaId);
  
  // Filter contatos by selected departamento
  const contatosFiltrados = novaTarefa.departamento 
    ? contatos.filter(c => c.departamentos.includes(novaTarefa.departamento!))
    : contatos;

  // Reset contato when empresa or departamento changes
  useEffect(() => {
    if (novaTarefa.contatoId) {
      const contatoExists = contatosFiltrados.find(c => c.id === novaTarefa.contatoId);
      if (!contatoExists) {
        setNovaTarefa(prev => ({ ...prev, contatoId: undefined }));
      }
    }
  }, [novaTarefa.empresaId, novaTarefa.departamento, contatosFiltrados]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-red-500/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-red-500/20 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Nova Tarefa</h2>
          <button onClick={onClose} className="p-1 hover:bg-foreground/10 rounded">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Nome/Título */}
          <div>
            <Label className="text-sm text-foreground/80">Nome da Tarefa *</Label>
            <Input 
              value={novaTarefa.titulo || ""}
              onChange={e => setNovaTarefa(prev => ({ ...prev, titulo: e.target.value }))}
              className="mt-1 bg-background/50 border-foreground/20"
              placeholder="Ex: Entregar DCTF referente 01/2025"
            />
          </div>

          {/* Empresa */}
          <div>
            <Label className="text-sm text-foreground/80">Empresa *</Label>
            <Select 
              value={novaTarefa.empresaId || ""}
              onValueChange={v => setNovaTarefa(prev => ({ ...prev, empresaId: v, contatoId: undefined }))}
            >
              <SelectTrigger className="mt-1 bg-background/50 border-foreground/20">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Departamento e Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-foreground/80">Departamento</Label>
              <Select 
                value={novaTarefa.departamento || "_none"}
                onValueChange={v => setNovaTarefa(prev => ({ 
                  ...prev, 
                  departamento: v === "_none" ? undefined : v as DepartamentoTipo, 
                  contatoId: undefined 
                }))}
              >
                <SelectTrigger className="mt-1 bg-background/50 border-foreground/20">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Todos</SelectItem>
                  {DEPARTAMENTOS.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm text-foreground/80">Contato</Label>
              <Select 
                value={novaTarefa.contatoId || "_none"}
                onValueChange={v => setNovaTarefa(prev => ({ ...prev, contatoId: v === "_none" ? undefined : v }))}
                disabled={!novaTarefa.empresaId || contatosLoading}
              >
                <SelectTrigger className="mt-1 bg-background/50 border-foreground/20">
                  <SelectValue placeholder={contatosLoading ? "Carregando..." : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {contatosFiltrados.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prazo Entrega e Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-foreground/80">Prazo para Entrega</Label>
              <Input 
                type="date"
                value={novaTarefa.prazoEntrega || ""}
                onChange={e => setNovaTarefa(prev => ({ ...prev, prazoEntrega: e.target.value }))}
                className="mt-1 bg-background/50 border-foreground/20"
              />
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

          {/* Requer Anexo */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 border border-foreground/10 rounded-lg">
            <Checkbox 
              id="requer-anexo"
              checked={novaTarefa.requerAnexo ?? false}
              onCheckedChange={(checked) => setNovaTarefa(prev => ({ 
                ...prev, 
                requerAnexo: checked === true 
              }))}
            />
            <label 
              htmlFor="requer-anexo" 
              className="text-sm text-foreground/80 cursor-pointer flex-1"
            >
              Esta tarefa requer anexo de documento?
            </label>
          </div>

          {/* Justificativa */}
          <div>
            <Label className="text-sm text-foreground/80">Justificativa</Label>
            <Textarea 
              value={novaTarefa.justificativa || ""}
              onChange={e => setNovaTarefa(prev => ({ ...prev, justificativa: e.target.value }))}
              className="mt-1 bg-background/50 border-foreground/20"
              placeholder="Motivo ou descrição adicional da tarefa"
              rows={2}
            />
          </div>

          {/* Envio Automático */}
          <div className="space-y-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox 
                id="envio-automatico"
                checked={novaTarefa.envioAutomatico ?? false}
                onCheckedChange={(checked) => setNovaTarefa(prev => ({ 
                  ...prev, 
                  envioAutomatico: checked === true,
                  dataEnvioAutomatico: checked === true ? prev.dataEnvioAutomatico : undefined
                }))}
              />
              <label 
                htmlFor="envio-automatico" 
                className="text-sm text-foreground/80 cursor-pointer flex-1"
              >
                Enviar e-mail automaticamente ao concluir?
              </label>
            </div>
            
            {novaTarefa.envioAutomatico && (
              <div>
                <Label className="text-sm text-foreground/80">Data programada para envio</Label>
                <Input 
                  type="date"
                  value={novaTarefa.dataEnvioAutomatico || ""}
                  onChange={e => setNovaTarefa(prev => ({ ...prev, dataEnvioAutomatico: e.target.value }))}
                  className="mt-1 bg-background/50 border-foreground/20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O e-mail será enviado na data especificada, se a tarefa estiver concluída e com anexos.
                </p>
              </div>
            )}
          </div>

          {/* Prioridade */}
          <div>
            <Label className="text-sm text-foreground/80">Prioridade</Label>
            <Select 
              value={novaTarefa.prioridade || "media"}
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
          
          <Button 
            onClick={onSave} 
            className="w-full bg-red-500 hover:bg-red-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" /> Salvar Tarefa
          </Button>
        </div>
      </div>
    </div>
  );
}
