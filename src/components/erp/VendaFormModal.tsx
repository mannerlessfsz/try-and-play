import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { useVendas } from "@/hooks/useVendas";
import { Loader2, Save, X, Plus, Trash2, ShoppingCart } from "lucide-react";

interface VendaFormModalProps {
  open: boolean;
  onClose: () => void;
  empresaId: string;
}

interface VendaItem {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  desconto_valor: number;
  total: number;
}

export function VendaFormModal({ open, onClose, empresaId }: VendaFormModalProps) {
  const { clientes } = useClientes(empresaId);
  const { produtos } = useProdutos(empresaId);
  const { addVenda } = useVendas(empresaId);

  const [clienteId, setClienteId] = useState<string>("");
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split("T")[0]);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [condicaoPagamento, setCondicaoPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [desconto, setDesconto] = useState(0);
  const [frete, setFrete] = useState(0);
  const [items, setItems] = useState<VendaItem[]>([]);

  // Produto selecionado para adicionar
  const [selectedProduto, setSelectedProduto] = useState("");
  const [quantidade, setQuantidade] = useState(1);

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const total = subtotal - desconto + frete;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleAddItem = () => {
    if (!selectedProduto || quantidade <= 0) return;

    const produto = produtos.find((p) => p.id === selectedProduto);
    if (!produto) return;

    const precoUnitario = produto.preco_venda || 0;
    const totalItem = precoUnitario * quantidade;

    setItems([
      ...items,
      {
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade,
        preco_unitario: precoUnitario,
        desconto_valor: 0,
        total: totalItem,
      },
    ]);

    setSelectedProduto("");
    setQuantidade(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) return;

    addVenda.mutate(
      {
        empresa_id: empresaId,
        cliente_id: clienteId || null,
        data_venda: dataVenda,
        forma_pagamento: formaPagamento || null,
        condicao_pagamento: condicaoPagamento || null,
        observacoes: observacoes || null,
        subtotal,
        desconto_valor: desconto,
        frete,
        total,
        status: "pendente",
        itens: items.map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          desconto_valor: item.desconto_valor,
          total: item.total,
        })),
      },
      {
        onSuccess: () => {
          // Reset form
          setClienteId("");
          setDataVenda(new Date().toISOString().split("T")[0]);
          setFormaPagamento("");
          setCondicaoPagamento("");
          setObservacoes("");
          setDesconto(0);
          setFrete(0);
          setItems([]);
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-green-500 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Nova Venda
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cabeçalho */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data da Venda *</Label>
              <Input
                type="date"
                required
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Adicionar Produto */}
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Produto</Label>
                  <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.filter(p => p.ativo).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} - {formatCurrency(p.preco_venda || 0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantidade}
                    onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  />
                </div>
                <Button type="button" onClick={handleAddItem} className="bg-green-500 hover:bg-green-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Itens da Venda */}
          {items.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.produto_nome}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.preco_unitario)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Totais */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Subtotal</Label>
              <Input value={formatCurrency(subtotal)} disabled className="text-right font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={desconto}
                onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Frete (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={frete}
                onChange={(e) => setFrete(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total</Label>
              <Input
                value={formatCurrency(total)}
                disabled
                className="text-right font-mono text-lg font-bold text-green-500"
              />
            </div>
          </div>

          {/* Condição e Observações */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condição de Pagamento</Label>
              <Input
                placeholder="Ex: À vista, 30/60 dias..."
                value={condicaoPagamento}
                onChange={(e) => setCondicaoPagamento(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                placeholder="Observações da venda..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-green-500 hover:bg-green-600"
              disabled={items.length === 0 || addVenda.isPending}
            >
              {addVenda.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Finalizar Venda
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
