import React, { useState } from 'react';
import { 
  Plus, Edit, Trash2, Loader2, CheckCircle, XCircle, 
  FileText, Calendar, Clock, Briefcase, Building2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  useTarefasModelo, 
  TarefaModelo, 
  TarefaModeloFormData,
  REGIMES_TRIBUTARIOS,
  DEPARTAMENTOS,
  PERIODICIDADES,
  PeriodicidadeTipo
} from '@/hooks/useTarefasModelo';
import { Database } from '@/integrations/supabase/types';

type DepartamentoTipo = Database['public']['Enums']['departamento_tipo'];
type RegimeTributario = Database['public']['Enums']['regime_tributario'];

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: 'bg-green-500/20 text-green-500' },
  { value: 'media', label: 'Média', color: 'bg-yellow-500/20 text-yellow-500' },
  { value: 'alta', label: 'Alta', color: 'bg-red-500/20 text-red-500' },
  { value: 'urgente', label: 'Urgente', color: 'bg-purple-500/20 text-purple-500' },
];

const getDepartamentoColor = (dep: DepartamentoTipo) => {
  const colors: Record<DepartamentoTipo, string> = {
    fiscal: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    contabil: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
    departamento_pessoal: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  };
  return colors[dep] || 'bg-gray-500/20 text-gray-500';
};

export function TarefasModeloManager() {
  const { 
    tarefasModelo, 
    isLoading, 
    createTarefaModelo, 
    updateTarefaModelo,
    toggleAtivo,
    deleteTarefaModelo,
    isCreating,
    isUpdating 
  } = useTarefasModelo();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<TarefaModelo | null>(null);
  const [formData, setFormData] = useState<TarefaModeloFormData>({
    titulo: '',
    descricao: '',
    departamento: 'fiscal',
    prioridade: 'media',
    dia_vencimento: undefined,
    prazo_dias: undefined,
    requer_anexo: false,
    justificativa: '',
    periodicidade: 'mensal',
    regimes: [],
  });

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      departamento: 'fiscal',
      prioridade: 'media',
      dia_vencimento: undefined,
      prazo_dias: undefined,
      requer_anexo: false,
      justificativa: '',
      periodicidade: 'mensal',
      regimes: [],
    });
    setEditingModelo(null);
  };

  const handleOpenDialog = (modelo?: TarefaModelo) => {
    if (modelo) {
      setEditingModelo(modelo);
      setFormData({
        titulo: modelo.titulo,
        descricao: modelo.descricao || '',
        departamento: modelo.departamento,
        prioridade: modelo.prioridade,
        dia_vencimento: modelo.dia_vencimento || undefined,
        prazo_dias: modelo.prazo_dias || undefined,
        requer_anexo: modelo.requer_anexo || false,
        justificativa: modelo.justificativa || '',
        periodicidade: modelo.periodicidade || 'mensal',
        regimes: modelo.regimes || [],
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = () => {
    if (!formData.titulo || formData.regimes.length === 0) return;

    if (editingModelo) {
      updateTarefaModelo({ id: editingModelo.id, ...formData });
    } else {
      createTarefaModelo(formData);
    }
    handleCloseDialog();
  };

  const toggleRegime = (regime: RegimeTributario) => {
    setFormData(prev => ({
      ...prev,
      regimes: prev.regimes.includes(regime)
        ? prev.regimes.filter(r => r !== regime)
        : [...prev.regimes, regime]
    }));
  };

  const selectAllRegimes = () => {
    setFormData(prev => ({
      ...prev,
      regimes: REGIMES_TRIBUTARIOS.map(r => r.value)
    }));
  };

  // Group by department
  const groupedModelos = tarefasModelo.reduce((acc, modelo) => {
    const dep = modelo.departamento;
    if (!acc[dep]) acc[dep] = [];
    acc[dep].push(modelo);
    return acc;
  }, {} as Record<DepartamentoTipo, TarefaModelo[]>);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tarefas Modelo</h2>
          <p className="text-sm text-muted-foreground">
            Configure modelos de tarefas recorrentes por departamento e regime tributário
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Tarefa Modelo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{tarefasModelo.length}</div>
            <div className="text-xs text-muted-foreground">Total de Modelos</div>
          </CardContent>
        </Card>
        {DEPARTAMENTOS.map(dep => (
          <Card key={dep.value} className="bg-card/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {groupedModelos[dep.value]?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">{dep.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grouped Tables */}
      {DEPARTAMENTOS.map(dep => {
        const modelos = groupedModelos[dep.value] || [];
        if (modelos.length === 0) return null;

        return (
          <Card key={dep.value} className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge className={getDepartamentoColor(dep.value)}>{dep.label}</Badge>
                <span className="text-sm text-muted-foreground">({modelos.length} tarefas)</span>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Periodicidade</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Regimes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.map(modelo => {
                    const prioridade = PRIORIDADES.find(p => p.value === modelo.prioridade);
                    return (
                      <TableRow key={modelo.id} className={!modelo.ativo ? 'opacity-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{modelo.titulo}</div>
                              {modelo.descricao && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {modelo.descricao}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={prioridade?.color}>{prioridade?.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {PERIODICIDADES.find(p => p.value === modelo.periodicidade)?.label || 'Mensal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {modelo.dia_vencimento ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3" />
                              Dia {modelo.dia_vencimento}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {modelo.prazo_dias ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3" />
                              {modelo.prazo_dias} dias antes
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {modelo.regimes?.slice(0, 2).map(regime => (
                              <Badge key={regime} variant="outline" className="text-xs">
                                {REGIMES_TRIBUTARIOS.find(r => r.value === regime)?.label.split(' ')[0]}
                              </Badge>
                            ))}
                            {(modelo.regimes?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(modelo.regimes?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={modelo.ativo || false}
                            onCheckedChange={(checked) => toggleAtivo({ id: modelo.id, ativo: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(modelo)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Excluir esta tarefa modelo?')) {
                                  deleteTarefaModelo(modelo.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* Empty State */}
      {tarefasModelo.length === 0 && (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhuma tarefa modelo cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie modelos de tarefas para automatizar a criação de tarefas recorrentes
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Tarefa Modelo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModelo ? 'Editar Tarefa Modelo' : 'Nova Tarefa Modelo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Entregar DCTF"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição detalhada da tarefa..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Departamento *</Label>
                <Select
                  value={formData.departamento}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, departamento: value as DepartamentoTipo }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTAMENTOS.map(dep => (
                      <SelectItem key={dep.value} value={dep.value}>{dep.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade *</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map(prio => (
                      <SelectItem key={prio.value} value={prio.value}>{prio.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Periodicidade *</Label>
                <Select
                  value={formData.periodicidade}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, periodicidade: value as PeriodicidadeTipo }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODICIDADES.map(per => (
                      <SelectItem key={per.value} value={per.value}>{per.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dia_vencimento">Dia de Vencimento (1-28)</Label>
                <Input
                  id="dia_vencimento"
                  type="number"
                  min={1}
                  max={28}
                  value={formData.dia_vencimento || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dia_vencimento: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="Ex: 15"
                />
              </div>

              <div>
                <Label htmlFor="prazo_dias">Prazo de Entrega (dias antes)</Label>
                <Input
                  id="prazo_dias"
                  type="number"
                  min={0}
                  value={formData.prazo_dias || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    prazo_dias: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="Ex: 5"
                />
              </div>
            </div>

            {/* Anexo e Justificativa */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.requer_anexo || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requer_anexo: checked }))}
                />
                <Label>Requer anexo de documento</Label>
              </div>

              <div>
                <Label htmlFor="justificativa">Justificativa / Observações</Label>
                <Textarea
                  id="justificativa"
                  value={formData.justificativa}
                  onChange={(e) => setFormData(prev => ({ ...prev, justificativa: e.target.value }))}
                  placeholder="Informações adicionais para o cliente..."
                  rows={2}
                />
              </div>
            </div>

            {/* Regimes Tributários */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Regimes Tributários *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={selectAllRegimes}>
                  Selecionar todos
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {REGIMES_TRIBUTARIOS.map(regime => (
                  <label
                    key={regime.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.regimes.includes(regime.value)
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-muted/20 border-border/50 hover:bg-muted/40'
                    }`}
                  >
                    <Checkbox
                      checked={formData.regimes.includes(regime.value)}
                      onCheckedChange={() => toggleRegime(regime.value)}
                    />
                    <span className="text-sm">{regime.label}</span>
                  </label>
                ))}
              </div>
              {formData.regimes.length === 0 && (
                <p className="text-sm text-destructive">Selecione pelo menos um regime tributário</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.titulo || formData.regimes.length === 0 || isCreating || isUpdating}
            >
              {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingModelo ? 'Salvar Alterações' : 'Criar Tarefa Modelo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
