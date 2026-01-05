import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Loader2, 
  MessageSquare, 
  Code, 
  Calendar,
  FileCode,
  Save,
  X
} from 'lucide-react';

interface Prompt {
  id: string;
  data: string;
  titulo: string;
  conteudo: string;
  created_at: string;
  updated_at: string;
}

interface Logica {
  id: string;
  modulo: string;
  nome_logica: string;
  versao: string;
  descricao: string | null;
  codigo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const MODULOS = [
  'conversores',
  'financialace',
  'taskvault',
  'erp',
  'admin',
  'auth',
  'geral'
];

export const CreationEditionManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State para Prompts
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [newPrompt, setNewPrompt] = useState({ titulo: '', conteudo: '', data: new Date().toISOString().split('T')[0] });
  
  // State para Lógicas
  const [isAddingLogica, setIsAddingLogica] = useState(false);
  const [editingLogica, setEditingLogica] = useState<Logica | null>(null);
  const [newLogica, setNewLogica] = useState({ 
    modulo: '', 
    nome_logica: '', 
    versao: '1.0.0', 
    descricao: '', 
    codigo: '' 
  });
  const [filtroModulo, setFiltroModulo] = useState<string>('todos');

  // Queries
  const { data: prompts = [], isLoading: loadingPrompts } = useQuery({
    queryKey: ['admin-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_prompts')
        .select('*')
        .order('data', { ascending: false });
      if (error) throw error;
      return data as Prompt[];
    }
  });

  const { data: logicas = [], isLoading: loadingLogicas } = useQuery({
    queryKey: ['admin-logicas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_logicas')
        .select('*')
        .order('modulo')
        .order('nome_logica')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Logica[];
    }
  });

  // Mutations para Prompts
  const createPromptMutation = useMutation({
    mutationFn: async (prompt: typeof newPrompt) => {
      const { error } = await supabase
        .from('admin_prompts')
        .insert([prompt]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prompts'] });
      setNewPrompt({ titulo: '', conteudo: '', data: new Date().toISOString().split('T')[0] });
      setIsAddingPrompt(false);
      toast({ title: 'Prompt salvo com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar prompt', variant: 'destructive' });
    }
  });

  const updatePromptMutation = useMutation({
    mutationFn: async (prompt: Prompt) => {
      const { error } = await supabase
        .from('admin_prompts')
        .update({ titulo: prompt.titulo, conteudo: prompt.conteudo, data: prompt.data })
        .eq('id', prompt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prompts'] });
      setEditingPrompt(null);
      toast({ title: 'Prompt atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admin_prompts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prompts'] });
      toast({ title: 'Prompt removido!' });
    }
  });

  // Mutations para Lógicas
  const createLogicaMutation = useMutation({
    mutationFn: async (logica: typeof newLogica) => {
      const { error } = await supabase
        .from('admin_logicas')
        .insert([logica]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-logicas'] });
      setNewLogica({ modulo: '', nome_logica: '', versao: '1.0.0', descricao: '', codigo: '' });
      setIsAddingLogica(false);
      toast({ title: 'Lógica salva com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar lógica', variant: 'destructive' });
    }
  });

  const updateLogicaMutation = useMutation({
    mutationFn: async (logica: Logica) => {
      const { error } = await supabase
        .from('admin_logicas')
        .update({ 
          modulo: logica.modulo, 
          nome_logica: logica.nome_logica, 
          versao: logica.versao,
          descricao: logica.descricao,
          codigo: logica.codigo,
          ativo: logica.ativo
        })
        .eq('id', logica.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-logicas'] });
      setEditingLogica(null);
      toast({ title: 'Lógica atualizada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  });

  const deleteLogicaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admin_logicas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-logicas'] });
      toast({ title: 'Lógica removida!' });
    }
  });

  // Agrupar prompts por data
  const promptsByDate = prompts.reduce((acc, prompt) => {
    const dateKey = prompt.data;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(prompt);
    return acc;
  }, {} as Record<string, Prompt[]>);

  // Agrupar lógicas por módulo
  const logicasFiltradas = filtroModulo === 'todos' 
    ? logicas 
    : logicas.filter(l => l.modulo === filtroModulo);

  const logicasByModulo = logicasFiltradas.reduce((acc, logica) => {
    if (!acc[logica.modulo]) acc[logica.modulo] = [];
    acc[logica.modulo].push(logica);
    return acc;
  }, {} as Record<string, Logica[]>);

  return (
    <Tabs defaultValue="prompts" className="space-y-4">
      <TabsList>
        <TabsTrigger value="prompts" className="gap-2">
          <MessageSquare className="w-4 h-4" /> Prompts
        </TabsTrigger>
        <TabsTrigger value="logicas" className="gap-2">
          <Code className="w-4 h-4" /> Lógicas Programadas
        </TabsTrigger>
      </TabsList>

      {/* === PROMPTS TAB === */}
      <TabsContent value="prompts">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Registro de Prompts
              </CardTitle>
              <CardDescription>Conversas e instruções organizadas por dia</CardDescription>
            </div>
            <Dialog open={isAddingPrompt} onOpenChange={setIsAddingPrompt}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Novo Prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Adicionar Prompt</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={newPrompt.data}
                        onChange={(e) => setNewPrompt(prev => ({ ...prev, data: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={newPrompt.titulo}
                        onChange={(e) => setNewPrompt(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Título do prompt"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Conteúdo</Label>
                    <Textarea
                      value={newPrompt.conteudo}
                      onChange={(e) => setNewPrompt(prev => ({ ...prev, conteudo: e.target.value }))}
                      placeholder="Conteúdo da conversa/instrução..."
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </div>
                  <Button 
                    onClick={() => createPromptMutation.mutate(newPrompt)}
                    disabled={!newPrompt.titulo || !newPrompt.conteudo || createPromptMutation.isPending}
                    className="w-full"
                  >
                    {createPromptMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    <Save className="w-4 h-4 mr-2" /> Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingPrompts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : Object.keys(promptsByDate).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum prompt registrado</p>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(promptsByDate).map(([date, dayPrompts]) => (
                  <AccordionItem key={date} value={date} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {format(new Date(date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        <Badge variant="secondary">{dayPrompts.length} registro(s)</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {dayPrompts.map(prompt => (
                          <div key={prompt.id} className="border rounded-lg p-4 bg-card">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">{prompt.titulo}</h4>
                              <div className="flex gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => setEditingPrompt(prompt)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => deletePromptMutation.mutate(prompt.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/50 p-3 rounded max-h-[200px] overflow-y-auto">
                              {prompt.conteudo}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Edit Prompt Dialog */}
        <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Prompt</DialogTitle>
            </DialogHeader>
            {editingPrompt && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={editingPrompt.data}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, data: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={editingPrompt.titulo}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, titulo: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={editingPrompt.conteudo}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, conteudo: e.target.value })}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>
                <Button 
                  onClick={() => updatePromptMutation.mutate(editingPrompt)}
                  disabled={updatePromptMutation.isPending}
                  className="w-full"
                >
                  {updatePromptMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* === LÓGICAS TAB === */}
      <TabsContent value="logicas">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5" /> Lógicas Programadas
              </CardTitle>
              <CardDescription>Códigos organizados por módulo, lógica e versão</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filtroModulo} onValueChange={setFiltroModulo}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {MODULOS.map(mod => (
                    <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isAddingLogica} onOpenChange={setIsAddingLogica}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" /> Nova Lógica
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Adicionar Lógica</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Módulo</Label>
                        <Select 
                          value={newLogica.modulo} 
                          onValueChange={(v) => setNewLogica(prev => ({ ...prev, modulo: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {MODULOS.map(mod => (
                              <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nome da Lógica</Label>
                        <Input
                          value={newLogica.nome_logica}
                          onChange={(e) => setNewLogica(prev => ({ ...prev, nome_logica: e.target.value }))}
                          placeholder="Ex: parser-lider"
                        />
                      </div>
                      <div>
                        <Label>Versão</Label>
                        <Input
                          value={newLogica.versao}
                          onChange={(e) => setNewLogica(prev => ({ ...prev, versao: e.target.value }))}
                          placeholder="1.0.0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={newLogica.descricao}
                        onChange={(e) => setNewLogica(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Breve descrição da lógica"
                      />
                    </div>
                    <div>
                      <Label>Código</Label>
                      <Textarea
                        value={newLogica.codigo}
                        onChange={(e) => setNewLogica(prev => ({ ...prev, codigo: e.target.value }))}
                        placeholder="Cole o código aqui..."
                        className="min-h-[350px] font-mono text-sm"
                      />
                    </div>
                    <Button 
                      onClick={() => createLogicaMutation.mutate(newLogica)}
                      disabled={!newLogica.modulo || !newLogica.nome_logica || !newLogica.codigo || createLogicaMutation.isPending}
                      className="w-full"
                    >
                      {createLogicaMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      <Save className="w-4 h-4 mr-2" /> Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLogicas ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : Object.keys(logicasByModulo).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma lógica registrada</p>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(logicasByModulo).map(([modulo, modLogicas]) => (
                  <AccordionItem key={modulo} value={modulo} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Code className="w-4 h-4 text-primary" />
                        <span className="font-medium uppercase">{modulo}</span>
                        <Badge variant="secondary">{modLogicas.length} lógica(s)</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {modLogicas.map(logica => (
                          <div key={logica.id} className="border rounded-lg p-4 bg-card">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{logica.nome_logica}</h4>
                                  <Badge variant="outline">v{logica.versao}</Badge>
                                  {!logica.ativo && <Badge variant="destructive">Inativo</Badge>}
                                </div>
                                {logica.descricao && (
                                  <p className="text-sm text-muted-foreground mt-1">{logica.descricao}</p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => setEditingLogica(logica)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => deleteLogicaMutation.mutate(logica.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/50 p-3 rounded max-h-[250px] overflow-y-auto font-mono">
                              {logica.codigo}
                            </pre>
                            <p className="text-xs text-muted-foreground mt-2">
                              Criado em: {format(new Date(logica.created_at), "dd/MM/yyyy HH:mm")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Edit Logica Dialog */}
        <Dialog open={!!editingLogica} onOpenChange={() => setEditingLogica(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Lógica</DialogTitle>
            </DialogHeader>
            {editingLogica && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Módulo</Label>
                    <Select 
                      value={editingLogica.modulo} 
                      onValueChange={(v) => setEditingLogica({ ...editingLogica, modulo: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODULOS.map(mod => (
                          <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nome da Lógica</Label>
                    <Input
                      value={editingLogica.nome_logica}
                      onChange={(e) => setEditingLogica({ ...editingLogica, nome_logica: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Versão</Label>
                    <Input
                      value={editingLogica.versao}
                      onChange={(e) => setEditingLogica({ ...editingLogica, versao: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={editingLogica.descricao || ''}
                    onChange={(e) => setEditingLogica({ ...editingLogica, descricao: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Código</Label>
                  <Textarea
                    value={editingLogica.codigo}
                    onChange={(e) => setEditingLogica({ ...editingLogica, codigo: e.target.value })}
                    className="min-h-[350px] font-mono text-sm"
                  />
                </div>
                <Button 
                  onClick={() => updateLogicaMutation.mutate(editingLogica)}
                  disabled={updateLogicaMutation.isPending}
                  className="w-full"
                >
                  {updateLogicaMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
};

export default CreationEditionManager;
