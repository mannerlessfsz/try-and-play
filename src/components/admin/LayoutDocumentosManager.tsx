import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, FileCode, ChevronDown, ChevronUp, Loader2, Copy, Eye } from 'lucide-react';

interface LayoutDoc {
  id: string;
  nome: string;
  tipo: string;
  versao: string;
  namespace_pattern: string | null;
  root_element_pattern: string | null;
  ativo: boolean;
  created_at: string;
}

interface LayoutCampo {
  id: string;
  layout_id: string;
  grupo: string;
  campo_destino: string;
  tipo_dado: string;
  caminhos_xpath: string[];
  posicao_inicio: number | null;
  posicao_fim: number | null;
  transformacao: string | null;
  valor_padrao: string | null;
  obrigatorio: boolean;
  ordem: number;
}

const TIPOS_DOC = ['xml', 'txt', 'csv', 'pdf'];
const TIPOS_DADO = ['texto', 'numero', 'data', 'cnpj', 'cpf', 'moeda', 'booleano'];
const GRUPOS = ['ide', 'prestador', 'tomador', 'servico', 'retencoes', 'regime', 'emitente', 'destinatario', 'totais', 'itens', 'contexto', 'registro', 'cabecalho'];

export function LayoutDocumentosManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedLayout, setExpandedLayout] = useState<string | null>(null);
  const [isAddingLayout, setIsAddingLayout] = useState(false);
  const [editingLayout, setEditingLayout] = useState<LayoutDoc | null>(null);
  const [isAddingCampo, setIsAddingCampo] = useState<string | null>(null);
  const [editingCampo, setEditingCampo] = useState<LayoutCampo | null>(null);

  const [layoutForm, setLayoutForm] = useState({
    nome: '', tipo: 'xml', versao: '1.0', namespace_pattern: '', root_element_pattern: '', ativo: true,
  });

  const [campoForm, setCampoForm] = useState({
    grupo: 'ide', campo_destino: '', tipo_dado: 'texto', caminhos_xpath: '',
    posicao_inicio: '', posicao_fim: '', transformacao: '', valor_padrao: '', obrigatorio: false, ordem: 0,
  });

  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ['admin-layouts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('layout_documentos').select('*').order('nome');
      if (error) throw error;
      return data as LayoutDoc[];
    },
  });

  const { data: allCampos = [] } = useQuery({
    queryKey: ['admin-layout-campos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('layout_campos').select('*').order('ordem');
      if (error) throw error;
      return data as LayoutCampo[];
    },
  });

  const getCamposForLayout = (layoutId: string) => allCampos.filter(c => c.layout_id === layoutId);

  // Mutations
  const createLayoutMutation = useMutation({
    mutationFn: async (form: typeof layoutForm) => {
      const { error } = await supabase.from('layout_documentos').insert({
        nome: form.nome, tipo: form.tipo, versao: form.versao, ativo: form.ativo,
        namespace_pattern: form.namespace_pattern || null,
        root_element_pattern: form.root_element_pattern || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-layouts'] });
      setIsAddingLayout(false);
      resetLayoutForm();
      toast({ title: 'Layout criado com sucesso' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateLayoutMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<LayoutDoc> & { id: string }) => {
      const { error } = await supabase.from('layout_documentos').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-layouts'] });
      setEditingLayout(null);
      toast({ title: 'Layout atualizado' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteLayoutMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('layout_campos').delete().eq('layout_id', id);
      const { error } = await supabase.from('layout_documentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-layouts', 'admin-layout-campos'] });
      toast({ title: 'Layout removido' });
    },
  });

  const createCampoMutation = useMutation({
    mutationFn: async ({ layoutId, form }: { layoutId: string; form: typeof campoForm }) => {
      const paths = form.caminhos_xpath.split(',').map(s => s.trim()).filter(Boolean);
      const { error } = await supabase.from('layout_campos').insert({
        layout_id: layoutId, grupo: form.grupo, campo_destino: form.campo_destino,
        tipo_dado: form.tipo_dado, caminhos_xpath: paths,
        posicao_inicio: form.posicao_inicio ? parseInt(form.posicao_inicio) : null,
        posicao_fim: form.posicao_fim ? parseInt(form.posicao_fim) : null,
        transformacao: form.transformacao || null, valor_padrao: form.valor_padrao || null,
        obrigatorio: form.obrigatorio, ordem: form.ordem,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-layout-campos'] });
      setIsAddingCampo(null);
      resetCampoForm();
      toast({ title: 'Campo adicionado' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateCampoMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('layout_campos').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-layout-campos'] });
      setEditingCampo(null);
      toast({ title: 'Campo atualizado' });
    },
  });

  const deleteCampoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('layout_campos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-layout-campos'] });
      toast({ title: 'Campo removido' });
    },
  });

  const duplicateLayoutMutation = useMutation({
    mutationFn: async (sourceLayout: LayoutDoc) => {
      const { data: newLayout, error: layoutErr } = await supabase.from('layout_documentos').insert({
        nome: sourceLayout.nome + ' (cópia)', tipo: sourceLayout.tipo, versao: sourceLayout.versao,
        namespace_pattern: sourceLayout.namespace_pattern, root_element_pattern: sourceLayout.root_element_pattern, ativo: false,
      }).select().single();
      if (layoutErr || !newLayout) throw layoutErr;

      const campos = getCamposForLayout(sourceLayout.id);
      if (campos.length > 0) {
        const newCampos = campos.map(c => ({
          layout_id: newLayout.id, grupo: c.grupo, campo_destino: c.campo_destino,
          tipo_dado: c.tipo_dado, caminhos_xpath: c.caminhos_xpath,
          posicao_inicio: c.posicao_inicio, posicao_fim: c.posicao_fim,
          transformacao: c.transformacao, valor_padrao: c.valor_padrao,
          obrigatorio: c.obrigatorio, ordem: c.ordem,
        }));
        const { error: camposErr } = await supabase.from('layout_campos').insert(newCampos);
        if (camposErr) throw camposErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-layouts', 'admin-layout-campos'] });
      toast({ title: 'Layout duplicado com sucesso' });
    },
  });

  const resetLayoutForm = () => setLayoutForm({ nome: '', tipo: 'xml', versao: '1.0', namespace_pattern: '', root_element_pattern: '', ativo: true });
  const resetCampoForm = () => setCampoForm({ grupo: 'ide', campo_destino: '', tipo_dado: 'texto', caminhos_xpath: '', posicao_inicio: '', posicao_fim: '', transformacao: '', valor_padrao: '', obrigatorio: false, ordem: 0 });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Layouts de Documentos</h3>
          <p className="text-sm text-muted-foreground">{layouts.length} layouts cadastrados • {allCampos.length} campos mapeados</p>
        </div>
        <Dialog open={isAddingLayout} onOpenChange={setIsAddingLayout}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Layout</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Layout de Documento</DialogTitle></DialogHeader>
            <LayoutForm form={layoutForm} setForm={setLayoutForm} onSubmit={() => createLayoutMutation.mutate(layoutForm)} loading={createLayoutMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {layouts.map(layout => {
        const campos = getCamposForLayout(layout.id);
        const isExpanded = expandedLayout === layout.id;
        const grupos = [...new Set(campos.map(c => c.grupo))];

        return (
          <Card key={layout.id} className="overflow-hidden">
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedLayout(isExpanded ? null : layout.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCode className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{layout.nome}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{layout.tipo.toUpperCase()}</Badge>
                      <span>v{layout.versao}</span>
                      <span>•</span>
                      <span>{campos.length} campos</span>
                      {grupos.length > 0 && <span>• {grupos.length} grupos</span>}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={layout.ativo ? 'default' : 'secondary'}>{layout.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); duplicateLayoutMutation.mutate(layout); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation();
                    setEditingLayout(layout);
                    setLayoutForm({
                      nome: layout.nome, tipo: layout.tipo, versao: layout.versao,
                      namespace_pattern: layout.namespace_pattern || '', root_element_pattern: layout.root_element_pattern || '', ativo: layout.ativo,
                    });
                  }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteLayoutMutation.mutate(layout.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                {layout.namespace_pattern && (
                  <p className="text-xs text-muted-foreground mb-2">Namespace: <code className="bg-muted px-1 rounded">{layout.namespace_pattern}</code></p>
                )}
                {layout.root_element_pattern && (
                  <p className="text-xs text-muted-foreground mb-3">Root: <code className="bg-muted px-1 rounded">{layout.root_element_pattern}</code></p>
                )}

                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">Campos Mapeados</h4>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => { setIsAddingCampo(layout.id); resetCampoForm(); }}>
                    <Plus className="w-3 h-3" /> Campo
                  </Button>
                </div>

                {grupos.map(grupo => (
                  <div key={grupo} className="mb-4">
                    <Badge variant="secondary" className="mb-2">{grupo}</Badge>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Campo</TableHead>
                          <TableHead className="w-[80px]">Tipo</TableHead>
                          <TableHead>Caminhos/Tags</TableHead>
                          <TableHead className="w-[80px]">Posição</TableHead>
                          <TableHead className="w-[100px]">Transformação</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campos.filter(c => c.grupo === grupo).sort((a, b) => a.ordem - b.ordem).map(campo => (
                          <TableRow key={campo.id}>
                            <TableCell className="font-mono text-xs">{campo.campo_destino}{campo.obrigatorio && <span className="text-destructive ml-1">*</span>}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{campo.tipo_dado}</Badge></TableCell>
                            <TableCell className="font-mono text-xs max-w-[200px] truncate">{campo.caminhos_xpath.join(', ')}</TableCell>
                            <TableCell className="text-xs">{campo.posicao_inicio != null ? `${campo.posicao_inicio}-${campo.posicao_fim}` : '-'}</TableCell>
                            <TableCell className="text-xs">{campo.transformacao || '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                  setEditingCampo(campo);
                                  setCampoForm({
                                    grupo: campo.grupo, campo_destino: campo.campo_destino, tipo_dado: campo.tipo_dado,
                                    caminhos_xpath: campo.caminhos_xpath.join(', '),
                                    posicao_inicio: campo.posicao_inicio?.toString() || '', posicao_fim: campo.posicao_fim?.toString() || '',
                                    transformacao: campo.transformacao || '', valor_padrao: campo.valor_padrao || '',
                                    obrigatorio: campo.obrigatorio, ordem: campo.ordem,
                                  });
                                }}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteCampoMutation.mutate(campo.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}

                {campos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum campo mapeado. Adicione campos ou use o Assistente de Aprendizado.</p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Edit Layout Dialog */}
      <Dialog open={!!editingLayout} onOpenChange={(open) => !open && setEditingLayout(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Layout</DialogTitle></DialogHeader>
          <LayoutForm form={layoutForm} setForm={setLayoutForm} onSubmit={() => editingLayout && updateLayoutMutation.mutate({ id: editingLayout.id, ...layoutForm, namespace_pattern: layoutForm.namespace_pattern || null, root_element_pattern: layoutForm.root_element_pattern || null })} loading={updateLayoutMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Add/Edit Campo Dialog */}
      <Dialog open={!!isAddingCampo || !!editingCampo} onOpenChange={(open) => { if (!open) { setIsAddingCampo(null); setEditingCampo(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingCampo ? 'Editar Campo' : 'Novo Campo'}</DialogTitle></DialogHeader>
          <CampoForm form={campoForm} setForm={setCampoForm} onSubmit={() => {
            if (editingCampo) {
              const paths = campoForm.caminhos_xpath.split(',').map(s => s.trim()).filter(Boolean);
              updateCampoMutation.mutate({
                id: editingCampo.id, grupo: campoForm.grupo, campo_destino: campoForm.campo_destino,
                tipo_dado: campoForm.tipo_dado, caminhos_xpath: paths,
                posicao_inicio: campoForm.posicao_inicio ? parseInt(campoForm.posicao_inicio) : null,
                posicao_fim: campoForm.posicao_fim ? parseInt(campoForm.posicao_fim) : null,
                transformacao: campoForm.transformacao || null, valor_padrao: campoForm.valor_padrao || null,
                obrigatorio: campoForm.obrigatorio, ordem: campoForm.ordem,
              });
            } else if (isAddingCampo) {
              createCampoMutation.mutate({ layoutId: isAddingCampo, form: campoForm });
            }
          }} loading={createCampoMutation.isPending || updateCampoMutation.isPending} tipo={layouts.find(l => l.id === (isAddingCampo || editingCampo?.layout_id))?.tipo || 'xml'} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LayoutForm({ form, setForm, onSubmit, loading }: { form: any; setForm: any; onSubmit: () => void; loading: boolean }) {
  return (
    <div className="space-y-4">
      <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm((f: any) => ({ ...f, nome: e.target.value }))} placeholder="Ex: NFS-e ABRASF" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Tipo</Label>
          <Select value={form.tipo} onValueChange={v => setForm((f: any) => ({ ...f, tipo: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS_DOC.map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Versão</Label><Input value={form.versao} onChange={e => setForm((f: any) => ({ ...f, versao: e.target.value }))} /></div>
      </div>
      <div><Label>Namespace Pattern (regex)</Label><Input value={form.namespace_pattern} onChange={e => setForm((f: any) => ({ ...f, namespace_pattern: e.target.value }))} placeholder="Ex: nfse\\.goiania\\.go\\.gov\\.br" /></div>
      <div><Label>Root Element Pattern (regex)</Label><Input value={form.root_element_pattern} onChange={e => setForm((f: any) => ({ ...f, root_element_pattern: e.target.value }))} placeholder="Ex: ConsultarNfseResposta|CompNfse" /></div>
      <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={v => setForm((f: any) => ({ ...f, ativo: v }))} /><Label>Ativo</Label></div>
      <Button onClick={onSubmit} disabled={loading || !form.nome} className="w-full">{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar</Button>
    </div>
  );
}

function CampoForm({ form, setForm, onSubmit, loading, tipo }: { form: any; setForm: any; onSubmit: () => void; loading: boolean; tipo: string }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Grupo</Label>
          <Select value={form.grupo} onValueChange={v => setForm((f: any) => ({ ...f, grupo: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{GRUPOS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Campo Destino</Label><Input value={form.campo_destino} onChange={e => setForm((f: any) => ({ ...f, campo_destino: e.target.value }))} placeholder="Ex: cnpj, valor_iss" /></div>
      </div>
      <div><Label>Tipo de Dado</Label>
        <Select value={form.tipo_dado} onValueChange={v => setForm((f: any) => ({ ...f, tipo_dado: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TIPOS_DADO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {(tipo === 'xml') && (
        <div><Label>Caminhos/Tags (separados por vírgula, em ordem de prioridade)</Label>
          <Textarea value={form.caminhos_xpath} onChange={e => setForm((f: any) => ({ ...f, caminhos_xpath: e.target.value }))} placeholder="Ex: Cnpj, CnpjPrestador, cnpj" rows={2} />
        </div>
      )}
      {(tipo === 'txt' || tipo === 'csv') && (
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Posição Início</Label><Input type="number" value={form.posicao_inicio} onChange={e => setForm((f: any) => ({ ...f, posicao_inicio: e.target.value }))} /></div>
          <div><Label>Posição Fim</Label><Input type="number" value={form.posicao_fim} onChange={e => setForm((f: any) => ({ ...f, posicao_fim: e.target.value }))} /></div>
        </div>
      )}
      <div><Label>Transformação (opcional)</Label><Input value={form.transformacao} onChange={e => setForm((f: any) => ({ ...f, transformacao: e.target.value }))} placeholder="Ex: split:;:0 ou regex:(\d+)" /></div>
      <div><Label>Valor Padrão (opcional)</Label><Input value={form.valor_padrao} onChange={e => setForm((f: any) => ({ ...f, valor_padrao: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Ordem</Label><Input type="number" value={form.ordem} onChange={e => setForm((f: any) => ({ ...f, ordem: parseInt(e.target.value) || 0 }))} /></div>
        <div className="flex items-center gap-2 pt-6"><Switch checked={form.obrigatorio} onCheckedChange={v => setForm((f: any) => ({ ...f, obrigatorio: v }))} /><Label>Obrigatório</Label></div>
      </div>
      <Button onClick={onSubmit} disabled={loading || !form.campo_destino} className="w-full">{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar Campo</Button>
    </div>
  );
}
