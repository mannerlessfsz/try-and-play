import { useState, useMemo } from "react";
import { useOrcamentos, OrcamentoInput, Orcamento, OrcamentoItem } from "@/hooks/useOrcamentos";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, Search, FileText, Loader2, Edit, Trash2, 
  CheckCircle2, XCircle, Send, Eye, ArrowRight, Package, Download
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateOrcamentoPdf } from "@/utils/generateOrcamentoPdf";
import { useToast } from "@/hooks/use-toast";
import { OrcamentoPreviewModal } from "./OrcamentoPreviewModal";

interface OrcamentosManagerProps {
  empresaId: string;
}

interface ItemForm {
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  total: number;
  produto_id?: string;
}

const statusColors: Record<string, string> = {
  rascunho: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  enviado: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  aprovado: "bg-green-500/20 text-green-400 border-green-500/30",
  recusado: "bg-red-500/20 text-red-400 border-red-500/30",
  expirado: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  convertido: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
  convertido: "Convertido",
};

export function OrcamentosManager({ empresaId }: OrcamentosManagerProps) {
  const { orcamentos, isLoading, addOrcamento, updateStatus, deleteOrcamento, getOrcamentoComItens } = useOrcamentos(empresaId);
  const { clientes } = useClientes(empresaId);
  const { produtos } = useProdutos(empresaId);
  const { empresaAtiva } = useEmpresaAtiva();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [produtoSearchOpen, setProdutoSearchOpen] = useState(false);
  const [produtoSearch, setProdutoSearch] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOrcamento, setPreviewOrcamento] = useState<(Orcamento & { itens?: OrcamentoItem[] }) | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<OrcamentoInput>>({
    titulo: "",
    descricao: "",
    cliente_id: "",
    data_orcamento: new Date().toISOString().split('T')[0],
    data_validade: "",
    condicao_pagamento: "",
    observacoes: "",
  });
  
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [novoItem, setNovoItem] = useState<ItemForm>({
    descricao: "",
    quantidade: 1,
    unidade: "UN",
    valor_unitario: 0,
    total: 0,
  });

  // Filtrar produtos na busca
  const filteredProdutos = useMemo(() => {
    if (!produtoSearch) return produtos.slice(0, 20);
    const search = produtoSearch.toLowerCase();
    return produtos.filter(p => 
      p.nome.toLowerCase().includes(search) ||
      p.codigo?.toLowerCase().includes(search)
    ).slice(0, 20);
  }, [produtos, produtoSearch]);

  // Handler para selecionar produto
  const handleSelectProduto = (produto: typeof produtos[0]) => {
    setNovoItem({
      descricao: produto.nome,
      quantidade: 1,
      unidade: produto.unidade?.codigo || "UN",
      valor_unitario: produto.preco_venda || 0,
      total: produto.preco_venda || 0,
      produto_id: produto.id,
    });
    setProdutoSearchOpen(false);
    setProdutoSearch("");
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const filteredOrcamentos = orcamentos.filter(o =>
    o.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.numero?.toString().includes(searchTerm)
  );

  const calcularTotalItens = () => {
    return itens.reduce((sum, item) => sum + item.total, 0);
  };

  const handleAddItem = () => {
    if (!novoItem.descricao || novoItem.valor_unitario <= 0) return;
    
    const total = novoItem.quantidade * novoItem.valor_unitario;
    setItens([...itens, { ...novoItem, total }]);
    setNovoItem({
      descricao: "",
      quantidade: 1,
      unidade: "UN",
      valor_unitario: 0,
      total: 0,
    });
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formData.titulo) return;
    
    const total = calcularTotalItens();
    
    addOrcamento.mutate({
      empresa_id: empresaId,
      titulo: formData.titulo,
      descricao: formData.descricao,
      cliente_id: formData.cliente_id || null,
      data_orcamento: formData.data_orcamento,
      data_validade: formData.data_validade || null,
      condicao_pagamento: formData.condicao_pagamento,
      observacoes: formData.observacoes,
      subtotal: total,
      total: total,
      itens: itens.map(item => ({
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valor_unitario: item.valor_unitario,
        total: item.total,
      })),
    });
    
    // Reset form
    setFormData({
      titulo: "",
      descricao: "",
      cliente_id: "",
      data_orcamento: new Date().toISOString().split('T')[0],
      data_validade: "",
      condicao_pagamento: "",
      observacoes: "",
    });
    setItens([]);
    setIsOpen(false);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatus.mutate({ id, status: newStatus });
  };

  const handleGeneratePdf = async (orcamentoId: string, fromPreview = false) => {
    if (!empresaAtiva) {
      toast({ title: "Empresa não selecionada", variant: "destructive" });
      return;
    }

    setGeneratingPdf(orcamentoId);
    try {
      const orcamentoCompleto = fromPreview && previewOrcamento 
        ? previewOrcamento 
        : await getOrcamentoComItens(orcamentoId);
      await generateOrcamentoPdf(orcamentoCompleto, {
        nome: empresaAtiva.nome,
        cnpj: empresaAtiva.cnpj,
        email: empresaAtiva.email,
      });
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleOpenPreview = async (orcamentoId: string) => {
    try {
      const orcamentoCompleto = await getOrcamentoComItens(orcamentoId);
      setPreviewOrcamento(orcamentoCompleto);
      setPreviewOpen(true);
    } catch (error) {
      console.error("Erro ao carregar orçamento:", error);
      toast({ title: "Erro ao carregar orçamento", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar orçamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-500 hover:bg-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Título *</Label>
                  <Input
                    placeholder="Ex: Desenvolvimento de Website"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select 
                    value={formData.cliente_id || ""} 
                    onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(cliente => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condição de Pagamento</Label>
                  <Input
                    placeholder="Ex: 50% entrada + 50% na entrega"
                    value={formData.condicao_pagamento || ""}
                    onChange={(e) => setFormData({ ...formData, condicao_pagamento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data do Orçamento</Label>
                  <Input
                    type="date"
                    value={formData.data_orcamento}
                    onChange={(e) => setFormData({ ...formData, data_orcamento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validade</Label>
                  <Input
                    type="date"
                    value={formData.data_validade || ""}
                    onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descrição detalhada do orçamento..."
                    value={formData.descricao || ""}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="border border-foreground/10 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">Itens do Orçamento</h4>
                  <Popover open={produtoSearchOpen} onOpenChange={setProdutoSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Package className="w-4 h-4" />
                        Buscar Produto
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="end">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar por nome ou código..." 
                          value={produtoSearch}
                          onValueChange={setProdutoSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum produto encontrado</CommandEmpty>
                          <CommandGroup heading="Produtos">
                            {filteredProdutos.map((produto) => (
                              <CommandItem
                                key={produto.id}
                                value={produto.nome}
                                onSelect={() => handleSelectProduto(produto)}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <p className="font-medium">{produto.nome}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {produto.codigo && `Cód: ${produto.codigo} • `}
                                      Estoque: {produto.estoque_atual || 0} {produto.unidade?.codigo || 'UN'}
                                    </p>
                                  </div>
                                  <span className="text-sm font-semibold text-purple-400">
                                    {formatCurrency(produto.preco_venda || 0)}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Add Item Form */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      placeholder="Serviço ou item"
                      value={novoItem.descricao}
                      onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value, produto_id: undefined })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min="1"
                      value={novoItem.quantidade}
                      onChange={(e) => setNovoItem({ ...novoItem, quantidade: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Unidade</Label>
                    <Select 
                      value={novoItem.unidade} 
                      onValueChange={(v) => setNovoItem({ ...novoItem, unidade: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UN">UN</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="DIA">DIA</SelectItem>
                        <SelectItem value="MES">MÊS</SelectItem>
                        <SelectItem value="PROJETO">PROJETO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Valor Unit.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={novoItem.valor_unitario || ""}
                      onChange={(e) => setNovoItem({ ...novoItem, valor_unitario: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button 
                      type="button" 
                      size="icon" 
                      onClick={handleAddItem}
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Items List */}
                {itens.length > 0 && (
                  <div className="border border-foreground/10 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-center">Qtd</TableHead>
                          <TableHead className="text-right">Valor Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.descricao}</TableCell>
                            <TableCell className="text-center">{item.quantidade} {item.unidade}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                            <TableCell>
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="p-1 rounded hover:bg-red-500/20 text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-foreground/5">
                          <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                          <TableCell className="text-right font-bold text-purple-400">
                            {formatCurrency(calcularTotalItens())}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações para o cliente..."
                  value={formData.observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={2}
                />
              </div>

              <Button 
                className="w-full bg-purple-500 hover:bg-purple-600" 
                onClick={handleSubmit}
                disabled={!formData.titulo || itens.length === 0 || addOrcamento.isPending}
              >
                {addOrcamento.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar Orçamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-purple-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-purple-500" />
            Orçamentos ({filteredOrcamentos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrcamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum orçamento cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrcamentos.map((o) => (
                  <TableRow key={o.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono">#{o.numero || "-"}</TableCell>
                    <TableCell>{new Date(o.data_orcamento + 'T12:00:00').toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{o.titulo}</TableCell>
                    <TableCell>{o.cliente?.nome || "-"}</TableCell>
                    <TableCell className="text-right font-semibold text-purple-400">
                      {formatCurrency(o.total || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusColors[o.status]}>
                        {statusLabels[o.status] || o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenPreview(o.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleGeneratePdf(o.id)}
                            disabled={generatingPdf === o.id}
                          >
                            {generatingPdf === o.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 mr-2" />
                            )}
                            Gerar PDF
                          </DropdownMenuItem>
                          {o.status === 'rascunho' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(o.id, 'enviado')}>
                              <Send className="w-4 h-4 mr-2" />
                              Marcar como Enviado
                            </DropdownMenuItem>
                          )}
                          {o.status === 'enviado' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(o.id, 'aprovado')}>
                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                Aprovar (Gerar Receita)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(o.id, 'recusado')}>
                                <XCircle className="w-4 h-4 mr-2 text-red-500" />
                                Recusar
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => deleteOrcamento.mutate(o.id)}>
                            <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <OrcamentoPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        orcamento={previewOrcamento}
        empresa={{
          nome: empresaAtiva?.nome || "",
          cnpj: empresaAtiva?.cnpj,
          email: empresaAtiva?.email,
        }}
        onDownload={() => previewOrcamento && handleGeneratePdf(previewOrcamento.id, true)}
        isDownloading={!!generatingPdf}
      />
    </div>
  );
}
