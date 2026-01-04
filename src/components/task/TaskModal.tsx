import { X, Save, Mail, Loader2 } from "lucide-react";
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
import { useEmpresaContatos, EmpresaContato } from "@/hooks/useEmpresaContatos";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [notificarContato, setNotificarContato] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const { toast } = useToast();
  
  // Filter contatos by selected departamento
  const contatosFiltrados = novaTarefa.departamento 
    ? contatos.filter(c => c.departamentos.includes(novaTarefa.departamento!))
    : contatos;

  // Get selected contato
  const contatoSelecionado = contatos.find(c => c.id === novaTarefa.contatoId);

  // Reset contato when empresa or departamento changes
  useEffect(() => {
    if (novaTarefa.contatoId) {
      const contatoExists = contatosFiltrados.find(c => c.id === novaTarefa.contatoId);
      if (!contatoExists) {
        setNovaTarefa(prev => ({ ...prev, contatoId: undefined }));
        setNotificarContato(false);
      }
    }
  }, [novaTarefa.empresaId, novaTarefa.departamento, contatosFiltrados]);

  // Reset notification when contato changes
  useEffect(() => {
    if (!novaTarefa.contatoId) {
      setNotificarContato(false);
    }
  }, [novaTarefa.contatoId]);

  const getDepartamentoLabel = (dep: string) => {
    const labels: Record<string, string> = {
      fiscal: "Fiscal",
      contabil: "Contábil",
      departamento_pessoal: "Depto. Pessoal"
    };
    return labels[dep] || dep;
  };

  const sendNotification = async () => {
    if (!contatoSelecionado || !novaTarefa.titulo) return;

    const empresaSelecionada = empresas.find(e => e.id === novaTarefa.empresaId);

    setEnviandoEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-task-notification', {
        body: {
          contatoNome: contatoSelecionado.nome,
          contatoEmail: contatoSelecionado.email,
          tarefaTitulo: novaTarefa.titulo,
          tarefaDescricao: novaTarefa.descricao,
          empresaNome: empresaSelecionada?.nome || "Empresa",
          departamento: novaTarefa.departamento ? getDepartamentoLabel(novaTarefa.departamento) : undefined,
          prioridade: novaTarefa.prioridade || "media",
          dataVencimento: novaTarefa.dataVencimento,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Notificação enviada",
          description: `E-mail enviado para ${contatoSelecionado.email}`,
        });
      } else {
        throw new Error(data?.error || "Erro ao enviar e-mail");
      }
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast({
        title: "Erro ao enviar notificação",
        description: error.message || "Não foi possível enviar o e-mail",
        variant: "destructive",
      });
    } finally {
      setEnviandoEmail(false);
    }
  };

  const handleSave = async () => {
    if (notificarContato && contatoSelecionado) {
      await sendNotification();
    }
    onSave();
  };

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
            <Select 
              value={novaTarefa.empresaId || ""}
              onValueChange={v => setNovaTarefa(prev => ({ ...prev, empresaId: v, contatoId: undefined }))}
            >
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
              <Label className="text-sm text-foreground/80">Departamento</Label>
              <Select 
                value={novaTarefa.departamento || ""}
                onValueChange={v => setNovaTarefa(prev => ({ ...prev, departamento: v as DepartamentoTipo, contatoId: undefined }))}
              >
                <SelectTrigger className="mt-1 bg-background/50 border-foreground/20">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {DEPARTAMENTOS.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm text-foreground/80">Contato</Label>
              <Select 
                value={novaTarefa.contatoId || ""}
                onValueChange={v => setNovaTarefa(prev => ({ ...prev, contatoId: v || undefined }))}
                disabled={!novaTarefa.empresaId || contatosLoading}
              >
                <SelectTrigger className="mt-1 bg-background/50 border-foreground/20">
                  <SelectValue placeholder={contatosLoading ? "Carregando..." : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {contatosFiltrados.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          {/* Email notification option */}
          {contatoSelecionado && (
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Checkbox 
                id="notificar-contato"
                checked={notificarContato}
                onCheckedChange={(checked) => setNotificarContato(checked === true)}
              />
              <label 
                htmlFor="notificar-contato" 
                className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer flex-1"
              >
                <Mail className="w-4 h-4 text-blue-400" />
                <span>
                  Notificar <strong>{contatoSelecionado.nome}</strong> por e-mail
                </span>
              </label>
            </div>
          )}
          
          <Button 
            onClick={handleSave} 
            disabled={enviandoEmail}
            className="w-full bg-red-500 hover:bg-red-600 text-white"
          >
            {enviandoEmail ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Salvar Tarefa
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
