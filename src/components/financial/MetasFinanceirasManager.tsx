import { useState } from "react";
import { useMetasFinanceiras, MetaFinanceiraInput } from "@/hooks/useMetasFinanceiras";
import { useCategorias } from "@/hooks/useCategorias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2, Loader2, Target, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetasFinanceirasManagerProps {
  empresaId: string;
}

export function MetasFinanceirasManager({ empresaId }: MetasFinanceirasManagerProps) {
  const { metas, metasAtivas, metasAlcancadas, isLoading, createMeta, updateMeta, deleteMeta, isCreating, isUpdating } = useMetasFinanceiras(empresaId);
  const { categorias } = useCategorias(empresaId);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    tipo: "receita",
    valor_meta: "",
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim: "",
    categoria_id: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const input = {
      empresa_id: empresaId,
      nome: formData.nome,
      descricao: formData.descricao || undefined,
      tipo: formData.tipo,
      valor_meta: parseFloat(formData.valor_meta),
      data_inicio: formData.data_inicio,
      data_fim: formData.data_fim,
      categoria_id: formData.categoria_id || undefined,
    };

    if (editingId) {
      updateMeta({ id: editingId, ...input }, {
        onSuccess: () => {
          setIsOpen(false);
          setEditingId(null);
          resetForm();
        }
      });
    } else {
      createMeta(input as MetaFinanceiraInput, {
        onSuccess: () => {
          setIsOpen(false);
          resetForm();
        }
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      tipo: "receita",
      valor_meta: "",
      data_inicio: format(new Date(), "yyyy-MM-dd"),
      data_fim: "",
      categoria_id: "",
    });
  };

  const handleEdit = (meta: any) => {
    setEditingId(meta.id);
    setFormData({
      nome: meta.nome,
      descricao: meta.descricao || "",
      tipo: meta.tipo,
      valor_meta: meta.valor_meta.toString(),
      data_inicio: meta.data_inicio,
      data_fim: meta.data_fim,
      categoria_id: meta.categoria_id || "",
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente excluir esta meta?")) {
      deleteMeta(id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getProgress = (meta: any) => {
    if (!meta.valor_atual) return 0;
    return Math.min((meta.valor_atual / meta.valor_meta) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Metas Ativas</p>
                <p className="text-2xl font-bold">{metasAtivas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Metas Alcançadas</p>
                <p className="text-2xl font-bold">{metasAlcancadas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">
                  {metas.length > 0 ? Math.round((metasAlcancadas.length / metas.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Metas Financeiras
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingId(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Meta" : "Nova Meta Financeira"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nome da Meta</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Economizar para investimento"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tipo</label>
                    <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Limite de Despesa</SelectItem>
                        <SelectItem value="economia">Economia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Valor Meta</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_meta}
                      onChange={(e) => setFormData({ ...formData, valor_meta: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Data Início</label>
                    <Input
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data Fim</label>
                    <Input
                      type="date"
                      value={formData.data_fim}
                      onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Categoria (opcional)</label>
                  <Select value={formData.categoria_id} onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição opcional..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    {editingId ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {metas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma meta cadastrada</p>
              <p className="text-sm">Defina metas para acompanhar seu progresso financeiro</p>
            </div>
          ) : (
            <div className="space-y-4">
              {metas.map((meta) => {
                const progress = getProgress(meta);
                const isCompleted = progress >= 100;
                const isExpired = new Date(meta.data_fim) < new Date();
                
                return (
                  <div key={meta.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {meta.tipo === "receita" ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <h4 className="font-medium flex items-center gap-2">
                            {meta.nome}
                            {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(meta.data_inicio), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(meta.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                            {meta.categoria && ` • ${meta.categoria.nome}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(meta)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(meta.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{formatCurrency(meta.valor_atual || 0)}</span>
                        <span className="text-muted-foreground">{formatCurrency(meta.valor_meta)}</span>
                      </div>
                      <Progress value={progress} className={isCompleted ? "[&>div]:bg-green-500" : isExpired ? "[&>div]:bg-red-500" : ""} />
                      <p className="text-xs text-muted-foreground text-right">{progress.toFixed(0)}% concluído</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
