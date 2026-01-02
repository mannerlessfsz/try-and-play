import { useState, useMemo } from "react";
import { useTransacoes, TransacaoInput } from "@/hooks/useTransacoes";
import { useCategorias } from "@/hooks/useCategorias";
import { useContasBancarias } from "@/hooks/useContasBancarias";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Edit, Trash2, Receipt, Loader2, ArrowUpRight, ArrowDownRight,
  Calendar, CreditCard, FileText, AlertCircle
} from "lucide-react";

interface TransacoesManagerProps {
  empresaId: string;
  tipoFiltro?: string;
  statusFiltro?: string;
}

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente", color: "yellow" },
  { value: "pago", label: "Pago", color: "green" },
  { value: "cancelado", label: "Cancelado", color: "red" },
];

const FORMAS_PAGAMENTO = [
  "Dinheiro", "PIX", "Cartão de Crédito", "Cartão de Débito", 
  "Boleto", "Transferência", "Cheque", "Outro"
];

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

// Gerar anos disponíveis (ano atual e próximos 2 anos)
const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear + 1, currentYear + 2];
};

export function TransacoesManager({ empresaId, tipoFiltro, statusFiltro }: TransacoesManagerProps) {
  const { toast } = useToast();
  const today = new Date();
  
  // Competência padrão: mês/ano atual
  const [competenciaAno, setCompetenciaAno] = useState(today.getFullYear());
  const [competenciaMes, setCompetenciaMes] = useState(today.getMonth() + 1);
  
  const { transacoes, isLoading, createTransacao, updateTransacao, deleteTransacao, isCreating } = useTransacoes(empresaId, {
    tipo: tipoFiltro,
    status: statusFiltro,
  });
  const { categorias } = useCategorias(empresaId);
  const { contas } = useContasBancarias(empresaId);
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TransacaoInput> & { competencia_ano?: number; competencia_mes?: number }>({
    descricao: "",
    valor: 0,
    tipo: "despesa",
    status: "pendente",
    data_transacao: today.toISOString().split('T')[0],
    categoria_id: "",
    conta_bancaria_id: "",
    forma_pagamento: "",
    observacoes: "",
    competencia_ano: today.getFullYear(),
    competencia_mes: today.getMonth() + 1,
  });

  // Calcular limites de data baseado na competência selecionada
  const dateLimits = useMemo(() => {
    const ano = formData.competencia_ano || today.getFullYear();
    const mes = formData.competencia_mes || (today.getMonth() + 1);
    
    const firstDay = new Date(ano, mes - 1, 1);
    const lastDay = new Date(ano, mes, 0);
    
    // Data mínima é o maior entre: primeiro dia da competência e hoje
    const minDate = firstDay > today ? firstDay : today;
    
    return {
      min: minDate.toISOString().split('T')[0],
      max: lastDay.toISOString().split('T')[0],
      firstDay: firstDay.toISOString().split('T')[0],
      lastDay: lastDay.toISOString().split('T')[0],
    };
  }, [formData.competencia_ano, formData.competencia_mes, today]);

  // Validar se a data está dentro da competência e não é passada
  const isDateValid = useMemo(() => {
    if (!formData.data_transacao) return false;
    const selectedDate = new Date(formData.data_transacao + 'T00:00:00');
    const todayStart = new Date(today.toISOString().split('T')[0] + 'T00:00:00');
    const minDate = new Date(dateLimits.firstDay + 'T00:00:00');
    const maxDate = new Date(dateLimits.lastDay + 'T00:00:00');
    
    return selectedDate >= todayStart && selectedDate >= minDate && selectedDate <= maxDate;
  }, [formData.data_transacao, dateLimits, today]);

  const resetForm = () => {
    setFormData({
      descricao: "",
      valor: 0,
      tipo: "despesa",
      status: "pendente",
      data_transacao: today.toISOString().split('T')[0],
      categoria_id: "",
      conta_bancaria_id: "",
      forma_pagamento: "",
      observacoes: "",
      competencia_ano: competenciaAno,
      competencia_mes: competenciaMes,
    });
    setEditingId(null);
  };

  const handleOpenEdit = (transacao: typeof transacoes[0]) => {
    setFormData({
      descricao: transacao.descricao,
      valor: transacao.valor,
      tipo: transacao.tipo,
      status: transacao.status,
      data_transacao: transacao.data_transacao,
      data_vencimento: transacao.data_vencimento || undefined,
      categoria_id: transacao.categoria_id || "",
      conta_bancaria_id: transacao.conta_bancaria_id || "",
      forma_pagamento: transacao.forma_pagamento || "",
      observacoes: transacao.observacoes || "",
    });
    setEditingId(transacao.id);
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.descricao || !formData.valor) return;

    // Validar data
    if (!isDateValid && !editingId) {
      toast({
        title: "Data inválida",
        description: `A data deve estar dentro da competência ${String(formData.competencia_mes).padStart(2, '0')}/${formData.competencia_ano} e não pode ser uma data passada.`,
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      categoria_id: formData.categoria_id || undefined,
      conta_bancaria_id: formData.conta_bancaria_id || undefined,
      competencia_ano: formData.competencia_ano,
      competencia_mes: formData.competencia_mes,
    };

    if (editingId) {
      updateTransacao({ id: editingId, ...submitData });
    } else {
      createTransacao({ ...submitData, empresa_id: empresaId } as TransacaoInput);
    }
    setIsOpen(false);
    resetForm();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const categoriasDoTipo = categorias.filter(c => c.tipo === formData.tipo);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Seletor de Competência */}
          <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Competência:</span>
            <Select 
              value={String(competenciaMes)} 
              onValueChange={(v) => setCompetenciaMes(parseInt(v))}
            >
              <SelectTrigger className="w-32 h-8 border-0 bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map(mes => (
                  <SelectItem key={mes.value} value={String(mes.value)}>{mes.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">/</span>
            <Select 
              value={String(competenciaAno)} 
              onValueChange={(v) => setCompetenciaAno(parseInt(v))}
            >
              <SelectTrigger className="w-20 h-8 border-0 bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableYears().map(ano => (
                  <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">{transacoes.length} transações</span>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Transação" : "Nova Transação"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Tipo */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tipo: "receita", categoria_id: "" }))}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    formData.tipo === "receita" 
                      ? "bg-green-500 text-white" 
                      : "bg-card/50 text-muted-foreground hover:bg-card border border-foreground/10"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Receita
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tipo: "despesa", categoria_id: "" }))}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    formData.tipo === "despesa" 
                      ? "bg-red-500 text-white" 
                      : "bg-card/50 text-muted-foreground hover:bg-card border border-foreground/10"
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" /> Despesa
                </button>
              </div>

              {/* Descrição e Valor */}
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input
                  placeholder="Ex: Pagamento fornecedor"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.valor}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              {/* Competência */}
              <div className="space-y-2">
                <Label>Competência *</Label>
                <div className="flex gap-2">
                  <Select 
                    value={String(formData.competencia_mes)} 
                    onValueChange={(v) => {
                      const newMes = parseInt(v);
                      setFormData(prev => ({ ...prev, competencia_mes: newMes }));
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map(mes => (
                        <SelectItem key={mes.value} value={String(mes.value)}>{mes.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={String(formData.competencia_ano)} 
                    onValueChange={(v) => {
                      const newAno = parseInt(v);
                      setFormData(prev => ({ ...prev, competencia_ano: newAno }));
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableYears().map(ano => (
                        <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data * <span className="text-xs text-muted-foreground">(dentro da competência)</span></Label>
                  <Input
                    type="date"
                    value={formData.data_transacao}
                    min={dateLimits.min}
                    max={dateLimits.max}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_transacao: e.target.value }))}
                  />
                  {!isDateValid && formData.data_transacao && !editingId && (
                    <div className="flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>Data inválida. Permitido: {new Date(dateLimits.min).toLocaleDateString('pt-BR')} a {new Date(dateLimits.max).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={formData.data_vencimento || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))}
                  />
                </div>
              </div>

              {/* Status e Categoria */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={formData.categoria_id || ""} onValueChange={(v) => setFormData(prev => ({ ...prev, categoria_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriasDoTipo.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Conta e Forma de Pagamento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Conta Bancária</Label>
                  <Select value={formData.conta_bancaria_id || ""} onValueChange={(v) => setFormData(prev => ({ ...prev, conta_bancaria_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>{conta.nome} ({conta.banco})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={formData.forma_pagamento || ""} onValueChange={(v) => setFormData(prev => ({ ...prev, forma_pagamento: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map(forma => (
                        <SelectItem key={forma} value={forma}>{forma}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações adicionais..."
                  value={formData.observacoes || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  rows={2}
                />
              </div>

              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600" 
                onClick={handleSubmit}
                disabled={isCreating || !formData.descricao || !formData.valor}
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? "Salvar Alterações" : "Criar Transação"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {transacoes.length === 0 ? (
        <div className="bg-card/30 backdrop-blur-xl rounded-xl border border-blue-500/20 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-blue-500" />
          </div>
          <h4 className="font-semibold text-foreground mb-2">Nenhuma transação encontrada</h4>
          <p className="text-sm text-muted-foreground mb-4">Comece registrando suas receitas e despesas.</p>
        </div>
      ) : (
        <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-blue-500/10 border-b border-blue-500/20">
              <tr>
                <th className="text-left p-3 font-medium text-foreground/80">Descrição</th>
                <th className="text-left p-3 font-medium text-foreground/80">Categoria</th>
                <th className="text-left p-3 font-medium text-foreground/80">Conta</th>
                <th className="text-left p-3 font-medium text-foreground/80">Data</th>
                <th className="text-left p-3 font-medium text-foreground/80">Status</th>
                <th className="text-right p-3 font-medium text-foreground/80">Valor</th>
                <th className="text-center p-3 font-medium text-foreground/80">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {transacoes.map(transacao => (
                <tr key={transacao.id} className="hover:bg-foreground/5 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${transacao.tipo === "receita" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                        {transacao.tipo === "receita" ? (
                          <ArrowUpRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <span className="font-medium text-foreground">{transacao.descricao}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {transacao.categoria ? (
                      <span 
                        className="px-2 py-1 rounded-full text-xs"
                        style={{ 
                          backgroundColor: `${transacao.categoria.cor}20`,
                          color: transacao.categoria.cor || undefined
                        }}
                      >
                        {transacao.categoria.nome}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {transacao.conta_bancaria ? transacao.conta_bancaria.nome : "-"}
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(transacao.data_transacao).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transacao.status === "pago" ? "bg-green-500/20 text-green-300" :
                      transacao.status === "pendente" ? "bg-yellow-500/20 text-yellow-300" :
                      "bg-red-500/20 text-red-300"
                    }`}>
                      {transacao.status}
                    </span>
                  </td>
                  <td className={`p-3 text-right font-semibold ${transacao.tipo === "receita" ? "text-green-400" : "text-red-400"}`}>
                    {transacao.tipo === "receita" ? "+" : "-"}{formatCurrency(transacao.valor)}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleOpenEdit(transacao)}
                        className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteTransacao(transacao.id)}
                        className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
