import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpRight, ArrowDownRight, CreditCard, Loader2, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";

interface ParcelamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (parcelas: ParcelaGerada[]) => Promise<void>;
  categorias: Array<{ id: string; nome: string; tipo: string }>;
  contas: Array<{ id: string; nome: string; banco: string }>;
  clientes: Array<{ id: string; nome: string }>;
}

export interface ParcelaGerada {
  descricao: string;
  valor: number;
  tipo: string;
  status: string;
  data_transacao: string;
  data_vencimento: string;
  categoria_id?: string;
  conta_bancaria_id?: string;
  cliente_id?: string;
  forma_pagamento?: string;
  observacoes?: string;
  competencia_ano: number;
  competencia_mes: number;
  parcela_numero: number;
  parcela_total: number;
  parcelamento_id: string;
}

const FORMAS_PAGAMENTO = [
  "Cartão de Crédito", "Cartão de Débito", "Boleto", "Financiamento", "Empréstimo", "Outro",
];

const MESES = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" }, { value: 4, label: "Abril" },
  { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" }, { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];

const pad2 = (n: number) => String(n).padStart(2, "0");

const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);
};

export function ParcelamentoModal({
  open,
  onOpenChange,
  onConfirm,
  categorias,
  contas,
  clientes,
}: ParcelamentoModalProps) {
  const today = new Date();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showParcelas, setShowParcelas] = useState(false);
  
  const [formData, setFormData] = useState({
    descricao: "",
    valorTotal: 0,
    tipo: "despesa" as "receita" | "despesa",
    numeroParcelas: 2,
    primeiraParcela_mes: today.getMonth() + 1,
    primeiraParcela_ano: today.getFullYear(),
    diaVencimento: today.getDate(),
    categoria_id: "",
    conta_bancaria_id: "",
    cliente_id: "",
    forma_pagamento: "Cartão de Crédito",
    observacoes: "",
  });

  const categoriasDoTipo = categorias.filter(c => c.tipo === formData.tipo);

  // Gerar parcelas preview
  const parcelasPreview = useMemo(() => {
    if (!formData.valorTotal || formData.numeroParcelas < 1) return [];

    const valorParcela = formData.valorTotal / formData.numeroParcelas;
    const parcelas: Array<{ numero: number; mes: number; ano: number; valor: number; dataVencimento: string }> = [];

    let mes = formData.primeiraParcela_mes;
    let ano = formData.primeiraParcela_ano;

    for (let i = 1; i <= formData.numeroParcelas; i++) {
      // Ajustar dia para não ultrapassar o último dia do mês
      const ultimoDiaMes = new Date(ano, mes, 0).getDate();
      const dia = Math.min(formData.diaVencimento, ultimoDiaMes);
      const dataVencimento = `${ano}-${pad2(mes)}-${pad2(dia)}`;

      parcelas.push({
        numero: i,
        mes,
        ano,
        valor: valorParcela,
        dataVencimento,
      });

      // Avançar para próximo mês
      mes++;
      if (mes > 12) {
        mes = 1;
        ano++;
      }
    }

    return parcelas;
  }, [formData.valorTotal, formData.numeroParcelas, formData.primeiraParcela_mes, formData.primeiraParcela_ano, formData.diaVencimento]);

  const valorParcela = formData.valorTotal && formData.numeroParcelas > 0 
    ? formData.valorTotal / formData.numeroParcelas 
    : 0;

  const handleSubmit = async () => {
    if (!formData.descricao || !formData.valorTotal || formData.numeroParcelas < 1) return;

    setIsSubmitting(true);

    try {
      const parcelamentoId = crypto.randomUUID();
      
      const parcelas: ParcelaGerada[] = parcelasPreview.map((p) => ({
        descricao: `${formData.descricao} (${p.numero}/${formData.numeroParcelas})`,
        valor: Number(p.valor.toFixed(2)),
        tipo: formData.tipo,
        status: "pendente",
        data_transacao: p.dataVencimento,
        data_vencimento: p.dataVencimento,
        categoria_id: formData.categoria_id || undefined,
        conta_bancaria_id: formData.conta_bancaria_id || undefined,
        cliente_id: formData.cliente_id || undefined,
        forma_pagamento: formData.forma_pagamento || undefined,
        observacoes: formData.observacoes || undefined,
        competencia_ano: p.ano,
        competencia_mes: p.mes,
        parcela_numero: p.numero,
        parcela_total: formData.numeroParcelas,
        parcelamento_id: parcelamentoId,
      }));

      await onConfirm(parcelas);
      
      // Reset form
      setFormData({
        descricao: "",
        valorTotal: 0,
        tipo: "despesa",
        numeroParcelas: 2,
        primeiraParcela_mes: today.getMonth() + 1,
        primeiraParcela_ano: today.getFullYear(),
        diaVencimento: today.getDate(),
        categoria_id: "",
        conta_bancaria_id: "",
        cliente_id: "",
        forma_pagamento: "Cartão de Crédito",
        observacoes: "",
      });
      setShowParcelas(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar parcelamento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Lançamento Parcelado
          </DialogTitle>
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

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input 
              placeholder="Ex: Compra parcelada loja X" 
              value={formData.descricao} 
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} 
            />
          </div>

          {/* Valor Total e Número de Parcelas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor Total *</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0,00" 
                value={formData.valorTotal || ""} 
                onChange={(e) => setFormData(prev => ({ ...prev, valorTotal: parseFloat(e.target.value) || 0 }))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Nº de Parcelas *</Label>
              <Input 
                type="number" 
                min="1" 
                max="120" 
                value={formData.numeroParcelas} 
                onChange={(e) => setFormData(prev => ({ ...prev, numeroParcelas: Math.min(120, Math.max(1, parseInt(e.target.value) || 1)) }))} 
              />
            </div>
          </div>

          {/* Valor da Parcela Preview */}
          {valorParcela > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-center">
              <span className="text-sm text-muted-foreground">Valor de cada parcela: </span>
              <span className="text-lg font-bold text-blue-400">{formatCurrency(valorParcela)}</span>
            </div>
          )}

          {/* Primeira Parcela */}
          <div className="space-y-2">
            <Label>Primeira Parcela</Label>
            <div className="flex gap-2">
              <Select 
                value={String(formData.primeiraParcela_mes)} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, primeiraParcela_mes: parseInt(v) }))}
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
                value={String(formData.primeiraParcela_ano)} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, primeiraParcela_ano: parseInt(v) }))}
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

          {/* Dia de Vencimento */}
          <div className="space-y-2">
            <Label>Dia de Vencimento</Label>
            <Input 
              type="number" 
              min="1" 
              max="31" 
              value={formData.diaVencimento} 
              onChange={(e) => setFormData(prev => ({ ...prev, diaVencimento: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) }))} 
            />
          </div>

          {/* Categoria e Conta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={formData.categoria_id || "__none__"} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, categoria_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {categoriasDoTipo.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <Select 
                value={formData.conta_bancaria_id || "__none__"} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, conta_bancaria_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {contas.map(conta => (
                    <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cliente e Forma de Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select 
                value={formData.cliente_id || "__none__"} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, cliente_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {clientes.map(cliente => (
                    <SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select 
                value={formData.forma_pagamento} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, forma_pagamento: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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
              placeholder="Notas adicionais..." 
              value={formData.observacoes} 
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} 
              rows={2}
            />
          </div>

          {/* Preview de Parcelas */}
          {parcelasPreview.length > 0 && (
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowParcelas(!showParcelas)}
                className="w-full flex items-center justify-between px-4 py-3 bg-card/30 hover:bg-card/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Visualizar {parcelasPreview.length} parcelas
                  </span>
                </div>
                {showParcelas ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              <AnimatePresence>
                {showParcelas && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="max-h-48 overflow-y-auto divide-y divide-border/30">
                      {parcelasPreview.map((parcela) => (
                        <div key={parcela.numero} className="flex items-center justify-between px-4 py-2 text-sm">
                          <span className="text-muted-foreground">
                            Parcela {parcela.numero}/{formData.numeroParcelas}
                          </span>
                          <span className="text-muted-foreground">
                            {MESES.find(m => m.value === parcela.mes)?.label.slice(0, 3)}/{parcela.ano}
                          </span>
                          <span className="font-medium">{formatCurrency(parcela.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleSubmit}
              disabled={!formData.descricao || !formData.valorTotal || formData.numeroParcelas < 1 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                `Criar ${parcelasPreview.length} Parcelas`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
