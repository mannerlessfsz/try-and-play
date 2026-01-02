import { useState } from "react";
import { useRecorrencias, RecorrenciaInput } from "@/hooks/useRecorrencias";
import { useCategorias } from "@/hooks/useCategorias";
import { useContasBancarias } from "@/hooks/useContasBancarias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Loader2, Clock, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecorrenciasManagerProps {
  empresaId: string;
}

const frequencias = [
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const diasSemana = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export function RecorrenciasManager({ empresaId }: RecorrenciasManagerProps) {
  const { recorrencias, receitas, despesas, totalMensal, isLoading, createRecorrencia, updateRecorrencia, deleteRecorrencia, isCreating, isUpdating } = useRecorrencias(empresaId);
  const { categorias } = useCategorias(empresaId);
  const { contas } = useContasBancarias(empresaId);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    tipo: "despesa",
    frequencia: "mensal",
    dia_vencimento: "1",
    dia_semana: "",
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim: "",
    categoria_id: "",
    conta_bancaria_id: "",
    gerar_automatico: true,
  });

  const calculateProximaGeracao = (dataInicio: string, frequencia: string) => {
    const inicio = new Date(dataInicio);
    const hoje = new Date();
    
    if (inicio > hoje) return dataInicio;
    
    let proxima = new Date(inicio);
    while (proxima <= hoje) {
      switch (frequencia) {
        case "semanal":
          proxima.setDate(proxima.getDate() + 7);
          break;
        case "quinzenal":
          proxima.setDate(proxima.getDate() + 15);
          break;
        case "mensal":
          proxima = addMonths(proxima, 1);
          break;
        case "bimestral":
          proxima = addMonths(proxima, 2);
          break;
        case "trimestral":
          proxima = addMonths(proxima, 3);
          break;
        case "semestral":
          proxima = addMonths(proxima, 6);
          break;
        case "anual":
          proxima = addMonths(proxima, 12);
          break;
      }
    }
    return format(proxima, "yyyy-MM-dd");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const proximaGeracao = calculateProximaGeracao(formData.data_inicio, formData.frequencia);
    
    const input: RecorrenciaInput = {
      empresa_id: empresaId,
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      tipo: formData.tipo,
      frequencia: formData.frequencia,
      dia_vencimento: formData.frequencia !== "semanal" ? parseInt(formData.dia_vencimento) : undefined,
      dia_semana: formData.frequencia === "semanal" ? parseInt(formData.dia_semana) : undefined,
      data_inicio: formData.data_inicio,
      data_fim: formData.data_fim || undefined,
      proxima_geracao: proximaGeracao,
      categoria_id: formData.categoria_id || undefined,
      conta_bancaria_id: formData.conta_bancaria_id || undefined,
      gerar_automatico: formData.gerar_automatico,
    };

    if (editingId) {
      updateRecorrencia({ id: editingId, ...input }, {
        onSuccess: () => {
          setIsOpen(false);
          setEditingId(null);
          resetForm();
        }
      });
    } else {
      createRecorrencia(input, {
        onSuccess: () => {
          setIsOpen(false);
          resetForm();
        }
      });
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: "",
      valor: "",
      tipo: "despesa",
      frequencia: "mensal",
      dia_vencimento: "1",
      dia_semana: "",
      data_inicio: format(new Date(), "yyyy-MM-dd"),
      data_fim: "",
      categoria_id: "",
      conta_bancaria_id: "",
      gerar_automatico: true,
    });
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setFormData({
      descricao: rec.descricao,
      valor: rec.valor.toString(),
      tipo: rec.tipo,
      frequencia: rec.frequencia,
      dia_vencimento: rec.dia_vencimento?.toString() || "1",
      dia_semana: rec.dia_semana?.toString() || "",
      data_inicio: rec.data_inicio,
      data_fim: rec.data_fim || "",
      categoria_id: rec.categoria_id || "",
      conta_bancaria_id: rec.conta_bancaria_id || "",
      gerar_automatico: rec.gerar_automatico,
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente desativar esta recorrência?")) {
      deleteRecorrencia(id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Receitas Recorrentes</p>
                <p className="text-2xl font-bold">{receitas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Despesas Recorrentes</p>
                <p className="text-2xl font-bold">{despesas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Impacto Mensal</p>
                <p className={`text-2xl font-bold ${totalMensal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(totalMensal)}
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
            <Clock className="w-5 h-5" />
            Lançamentos Recorrentes
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
                Nova Recorrência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Recorrência" : "Nova Recorrência"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Aluguel, Internet, Mensalidade..."
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
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Valor</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Frequência</label>
                    <Select value={formData.frequencia} onValueChange={(v) => setFormData({ ...formData, frequencia: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencias.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.frequencia === "semanal" ? (
                    <div>
                      <label className="text-sm font-medium">Dia da Semana</label>
                      <Select value={formData.dia_semana} onValueChange={(v) => setFormData({ ...formData, dia_semana: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {diasSemana.map((d) => (
                            <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium">Dia do Vencimento</label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dia_vencimento}
                        onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                        required
                      />
                    </div>
                  )}
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
                    <label className="text-sm font-medium">Data Fim (opcional)</label>
                    <Input
                      type="date"
                      value={formData.data_fim}
                      onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Categoria</label>
                    <Select value={formData.categoria_id} onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {categorias.filter(c => c.tipo === formData.tipo).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Conta Bancária</label>
                    <Select value={formData.conta_bancaria_id} onValueChange={(v) => setFormData({ ...formData, conta_bancaria_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {contas.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>{conta.nome} - {conta.banco}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.gerar_automatico}
                    onCheckedChange={(v) => setFormData({ ...formData, gerar_automatico: v })}
                  />
                  <label className="text-sm">Gerar lançamentos automaticamente</label>
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
          {recorrencias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma recorrência cadastrada</p>
              <p className="text-sm">Configure lançamentos automáticos para receitas e despesas fixas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Próximo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recorrencias.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rec.descricao}</p>
                        {rec.categoria && (
                          <p className="text-xs text-muted-foreground">{rec.categoria.nome}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rec.tipo === "receita" ? "default" : "destructive"}>
                        {rec.tipo === "receita" ? "Receita" : "Despesa"}
                      </Badge>
                    </TableCell>
                    <TableCell className={rec.tipo === "receita" ? "text-green-500" : "text-red-500"}>
                      {formatCurrency(rec.valor)}
                    </TableCell>
                    <TableCell className="capitalize">{rec.frequencia}</TableCell>
                    <TableCell>
                      {format(new Date(rec.proxima_geracao), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(rec)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(rec.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
