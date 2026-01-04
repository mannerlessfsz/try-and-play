import { useState } from "react";
import { Plus, Trash2, Edit, Mail, Phone, Briefcase, Save, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmpresaContatos, EmpresaContato } from "@/hooks/useEmpresaContatos";
import { Database } from "@/integrations/supabase/types";

type DepartamentoTipo = Database['public']['Enums']['departamento_tipo'];

const DEPARTAMENTOS: { id: DepartamentoTipo; label: string; color: string }[] = [
  { id: 'fiscal', label: 'Fiscal', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'contabil', label: 'Contábil', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { id: 'departamento_pessoal', label: 'Depto. Pessoal', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
];

interface EmpresaContatosManagerProps {
  empresaId: string;
}

export function EmpresaContatosManager({ empresaId }: EmpresaContatosManagerProps) {
  const { contatos, loading, addContato, updateContato, deleteContato } = useEmpresaContatos(empresaId);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
    departamentos: [] as DepartamentoTipo[],
  });

  const resetForm = () => {
    setFormData({ nome: '', email: '', telefone: '', cargo: '', departamentos: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (contato: EmpresaContato) => {
    setFormData({
      nome: contato.nome,
      email: contato.email,
      telefone: contato.telefone || '',
      cargo: contato.cargo || '',
      departamentos: contato.departamentos,
    });
    setEditingId(contato.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.email) return;

    if (editingId) {
      await updateContato(editingId, formData);
    } else {
      await addContato(formData);
    }
    resetForm();
  };

  const toggleDepartamento = (dept: DepartamentoTipo) => {
    setFormData(prev => ({
      ...prev,
      departamentos: prev.departamentos.includes(dept)
        ? prev.departamentos.filter(d => d !== dept)
        : [...prev.departamentos, dept],
    }));
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando contatos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Contatos da Empresa</h3>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
            <Plus className="w-4 h-4" /> Novo Contato
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">{editingId ? 'Editar Contato' : 'Novo Contato'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input
                  value={formData.nome}
                  onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">E-mail *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@empresa.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={e => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Cargo</Label>
                <Input
                  value={formData.cargo}
                  onChange={e => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                  placeholder="Cargo na empresa"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Departamentos</Label>
              <div className="flex gap-3">
                {DEPARTAMENTOS.map(dept => (
                  <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.departamentos.includes(dept.id)}
                      onCheckedChange={() => toggleDepartamento(dept.id)}
                    />
                    <span className="text-sm">{dept.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!formData.nome || !formData.email}>
                <Save className="w-4 h-4 mr-1" /> Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {contatos.length === 0 && !showForm ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum contato cadastrado</p>
          <p className="text-xs">Adicione contatos para vincular às tarefas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contatos.map(contato => (
            <Card key={contato.id} className={`${!contato.ativo ? 'opacity-50' : ''}`}>
              <CardContent className="p-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{contato.nome}</span>
                    {contato.cargo && (
                      <span className="text-xs text-muted-foreground">• {contato.cargo}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {contato.email}
                    </span>
                    {contato.telefone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {contato.telefone}
                      </span>
                    )}
                  </div>
                  {contato.departamentos.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {contato.departamentos.map(dept => {
                        const deptInfo = DEPARTAMENTOS.find(d => d.id === dept);
                        return (
                          <Badge key={dept} variant="outline" className={`text-xs ${deptInfo?.color}`}>
                            {deptInfo?.label}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(contato)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteContato(contato.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
