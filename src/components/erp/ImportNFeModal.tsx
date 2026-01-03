import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileUp, Loader2, Package, Truck, Receipt, AlertTriangle, 
  CheckCircle2, XCircle, FileText
} from "lucide-react";

interface NFeProduto {
  codigo: string;
  nome: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  selected: boolean;
}

interface NFeData {
  numero: string;
  serie: string;
  data_emissao: string;
  chave_acesso: string;
  natureza_operacao: string;
  emitente: {
    cnpj: string;
    nome: string;
    nome_fantasia: string | null;
    endereco: string | null;
    cidade: string | null;
    uf: string | null;
  };
  destinatario: {
    cnpj: string;
    nome: string;
    endereco: string | null;
    cidade: string | null;
    uf: string | null;
  };
  produtos: NFeProduto[];
  total_produtos: number;
  total_nfe: number;
  forma_pagamento: string | null;
}

interface ImportNFeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  empresaCnpj?: string | null;
  onImportComplete: () => void;
}

type ImportStep = "upload" | "preview" | "importing" | "complete";

// Normalize CNPJ for comparison (remove punctuation)
function normalizeCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  return cnpj.replace(/[^\d]/g, '');
}

export function ImportNFeModal({ open, onOpenChange, empresaId, empresaCnpj, onImportComplete }: ImportNFeModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<ImportStep>("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [nfeData, setNfeData] = useState<NFeData | null>(null);
  const [createFornecedor, setCreateFornecedor] = useState(true);
  const [createContaPagar, setCreateContaPagar] = useState(true);
  const [importResult, setImportResult] = useState<{
    produtos: number;
    fornecedor: boolean;
    contaPagar: boolean;
    errors: string[];
  } | null>(null);

  const resetModal = () => {
    setStep("upload");
    setNfeData(null);
    setIsProcessing(false);
    setImportResult(null);
    setCreateFornecedor(true);
    setCreateContaPagar(true);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension !== 'xml' && extension !== 'pdf') {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo XML ou PDF de NF-e.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('parse-nfe', {
        body: formData,
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Falha ao processar NF-e');

      const nfeResult = data.data;

      // Validate CNPJ - the NF-e destinatário must match the active company
      if (empresaCnpj) {
        const cnpjEmpresa = normalizeCnpj(empresaCnpj);
        const cnpjDestinatario = normalizeCnpj(nfeResult.destinatario?.cnpj);
        
        if (cnpjDestinatario && cnpjEmpresa && cnpjDestinatario !== cnpjEmpresa) {
          toast({
            title: "CNPJ não confere",
            description: `Esta NF-e foi emitida para o CNPJ ${nfeResult.destinatario.cnpj}, mas a empresa ativa possui CNPJ ${empresaCnpj}. Selecione a empresa correta.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Add selected flag to products
      const produtos = (nfeResult.produtos || []).map((p: any) => ({
        ...p,
        selected: true,
      }));

      setNfeData({ ...nfeResult, produtos });
      setStep("preview");

      toast({
        title: "NF-e processada",
        description: `${produtos.length} produtos encontrados na nota ${nfeResult.numero}`,
      });
    } catch (error) {
      console.error('Error processing NF-e:', error);
      toast({
        title: "Erro ao processar NF-e",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleProductSelection = (index: number) => {
    if (!nfeData) return;
    const produtos = [...nfeData.produtos];
    produtos[index].selected = !produtos[index].selected;
    setNfeData({ ...nfeData, produtos });
  };

  const toggleAllProducts = (selected: boolean) => {
    if (!nfeData) return;
    const produtos = nfeData.produtos.map(p => ({ ...p, selected }));
    setNfeData({ ...nfeData, produtos });
  };

  const handleImport = async () => {
    if (!nfeData) return;

    setStep("importing");
    const errors: string[] = [];
    let produtosImportados = 0;
    let fornecedorCriado = false;
    let contaPagarCriada = false;
    let compraCriada = false;

    try {
      // 1. Create or find supplier
      let fornecedorId: string | null = null;
      
      if (createFornecedor && nfeData.emitente.cnpj) {
        // Check if supplier already exists
        const { data: existingFornecedor } = await supabase
          .from('fornecedores')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('cpf_cnpj', nfeData.emitente.cnpj)
          .maybeSingle();

        if (existingFornecedor) {
          fornecedorId = existingFornecedor.id;
        } else {
          // Create new supplier
          const { data: newFornecedor, error: fornecedorError } = await supabase
            .from('fornecedores')
            .insert({
              empresa_id: empresaId,
              nome: nfeData.emitente.nome,
              nome_fantasia: nfeData.emitente.nome_fantasia,
              cpf_cnpj: nfeData.emitente.cnpj,
              tipo_pessoa: 'juridica',
              endereco: nfeData.emitente.endereco,
              cidade: nfeData.emitente.cidade,
              estado: nfeData.emitente.uf,
            })
            .select('id')
            .single();

          if (fornecedorError) {
            errors.push(`Erro ao criar fornecedor: ${fornecedorError.message}`);
          } else {
            fornecedorId = newFornecedor.id;
            fornecedorCriado = true;
          }
        }
      }

      // 2. Create compra (purchase) record
      let compraId: string | null = null;
      const selectedProducts = nfeData.produtos.filter(p => p.selected);
      const subtotal = selectedProducts.reduce((sum, p) => sum + p.valor_total, 0);

      const { data: compraData, error: compraError } = await supabase
        .from('compras')
        .insert({
          empresa_id: empresaId,
          fornecedor_id: fornecedorId,
          numero: parseInt(nfeData.numero) || null,
          data_compra: nfeData.data_emissao || new Date().toISOString().split('T')[0],
          data_entrega_real: new Date().toISOString().split('T')[0],
          status: 'concluido',
          subtotal: subtotal,
          total: nfeData.total_nfe,
          forma_pagamento: nfeData.forma_pagamento,
          observacoes: `Chave de acesso: ${nfeData.chave_acesso || 'N/A'}`,
        })
        .select('id')
        .single();

      if (compraError) {
        errors.push(`Erro ao criar compra: ${compraError.message}`);
      } else {
        compraId = compraData.id;
        compraCriada = true;
      }

      // 3. Create products and compra_itens
      for (const produto of selectedProducts) {
        // Check if product already exists by code
        const { data: existingProduto } = await supabase
          .from('produtos')
          .select('id, estoque_atual')
          .eq('empresa_id', empresaId)
          .eq('codigo', produto.codigo)
          .maybeSingle();

        let produtoId: string;

        if (existingProduto) {
          produtoId = existingProduto.id;
          // Update stock
          const novoEstoque = (existingProduto.estoque_atual || 0) + produto.quantidade;
          const { error: updateError } = await supabase
            .from('produtos')
            .update({ 
              estoque_atual: novoEstoque,
              preco_custo: produto.valor_unitario,
            })
            .eq('id', existingProduto.id);

          if (updateError) {
            errors.push(`Erro ao atualizar ${produto.nome}: ${updateError.message}`);
          } else {
            // Create stock movement
            await supabase.from('estoque_movimentos').insert({
              empresa_id: empresaId,
              produto_id: existingProduto.id,
              tipo: 'entrada',
              quantidade: produto.quantidade,
              custo_unitario: produto.valor_unitario,
              custo_total: produto.valor_total,
              saldo_anterior: existingProduto.estoque_atual || 0,
              saldo_posterior: novoEstoque,
              documento_tipo: 'nfe',
              observacao: `NF-e ${nfeData.numero}`,
            });
            produtosImportados++;
          }
        } else {
          // Create new product
          const { data: newProduto, error: produtoError } = await supabase
            .from('produtos')
            .insert({
              empresa_id: empresaId,
              codigo: produto.codigo,
              nome: produto.nome,
              ncm: produto.ncm,
              preco_custo: produto.valor_unitario,
              preco_venda: produto.valor_unitario * 1.3, // 30% markup default
              estoque_atual: produto.quantidade,
              controla_estoque: true,
            })
            .select('id')
            .single();

          if (produtoError) {
            errors.push(`Erro ao criar ${produto.nome}: ${produtoError.message}`);
            continue;
          } else {
            produtoId = newProduto.id;
            // Create stock movement
            await supabase.from('estoque_movimentos').insert({
              empresa_id: empresaId,
              produto_id: newProduto.id,
              tipo: 'entrada',
              quantidade: produto.quantidade,
              custo_unitario: produto.valor_unitario,
              custo_total: produto.valor_total,
              saldo_anterior: 0,
              saldo_posterior: produto.quantidade,
              documento_tipo: 'nfe',
              observacao: `NF-e ${nfeData.numero}`,
            });
            produtosImportados++;
          }
        }

        // Create compra_item linking product to compra
        if (compraId && produtoId!) {
          await supabase.from('compra_itens').insert({
            compra_id: compraId,
            produto_id: produtoId!,
            quantidade: produto.quantidade,
            preco_unitario: produto.valor_unitario,
            total: produto.valor_total,
          });
        }
      }

      // 4. Create accounts payable (despesa)
      if (createContaPagar && nfeData.total_nfe > 0) {
        const { error: transacaoError } = await supabase
          .from('transacoes')
          .insert({
            empresa_id: empresaId,
            tipo: 'despesa',
            descricao: `NF-e ${nfeData.numero} - ${nfeData.emitente.nome}`,
            valor: nfeData.total_nfe,
            data_transacao: nfeData.data_emissao || new Date().toISOString().split('T')[0],
            data_vencimento: nfeData.data_emissao || new Date().toISOString().split('T')[0],
            status: 'pendente',
            numero_documento: nfeData.chave_acesso || `NFE-${nfeData.numero}`,
            observacoes: `Importado automaticamente da NF-e ${nfeData.numero}`,
            forma_pagamento: nfeData.forma_pagamento,
          });

        if (transacaoError) {
          errors.push(`Erro ao criar conta a pagar: ${transacaoError.message}`);
        } else {
          contaPagarCriada = true;
        }
      }

      setImportResult({
        produtos: produtosImportados,
        fornecedor: fornecedorCriado,
        contaPagar: contaPagarCriada,
        errors,
      });
      setStep("complete");

    } catch (error) {
      console.error('Error importing NF-e:', error);
      setImportResult({
        produtos: produtosImportados,
        fornecedor: fornecedorCriado,
        contaPagar: contaPagarCriada,
        errors: [...errors, error instanceof Error ? error.message : 'Erro desconhecido'],
      });
      setStep("complete");
    }
  };

  const handleClose = () => {
    if (step === "complete") {
      onImportComplete();
    }
    resetModal();
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const selectedCount = nfeData?.produtos.filter(p => p.selected).length || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-500" />
            Importar NF-e
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-green-500/30 rounded-xl p-8 text-center hover:border-green-500/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
                  <p className="text-foreground font-medium">Processando NF-e...</p>
                  <p className="text-sm text-muted-foreground">Extraindo dados da nota fiscal</p>
                </div>
              ) : (
                <>
                  <FileUp className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">Arraste ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground">Formatos aceitos: XML ou PDF de NF-e</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && nfeData && (
          <div className="space-y-4">
            {/* NF-e Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-card/50 rounded-lg border border-foreground/10">
              <div>
                <p className="text-xs text-muted-foreground">NF-e</p>
                <p className="font-semibold text-foreground">#{nfeData.numero} (Série {nfeData.serie})</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data Emissão</p>
                <p className="font-semibold text-foreground">
                  {nfeData.data_emissao ? new Date(nfeData.data_emissao.split('T')[0] + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Emitente</p>
                <p className="font-semibold text-foreground">{nfeData.emitente.nome}</p>
                <p className="text-xs text-muted-foreground">CNPJ: {nfeData.emitente.cnpj}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Produtos</p>
                <p className="font-semibold text-foreground">{formatCurrency(nfeData.total_produtos)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total NF-e</p>
                <p className="font-semibold text-green-500">{formatCurrency(nfeData.total_nfe)}</p>
              </div>
            </div>

            {/* Options */}
            <div className="flex gap-4 p-3 bg-card/30 rounded-lg border border-foreground/10">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={createFornecedor} 
                  onCheckedChange={(checked) => setCreateFornecedor(!!checked)} 
                />
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Criar/atualizar fornecedor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={createContaPagar} 
                  onCheckedChange={(checked) => setCreateContaPagar(!!checked)} 
                />
                <Receipt className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Criar conta a pagar</span>
              </label>
            </div>

            {/* Products */}
            <div className="border border-foreground/10 rounded-lg overflow-hidden">
              <div className="p-3 bg-card/50 border-b border-foreground/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-foreground">Produtos ({selectedCount}/{nfeData.produtos.length} selecionados)</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleAllProducts(true)}>
                    Selecionar todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleAllProducts(false)}>
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-card/30 sticky top-0">
                    <tr>
                      <th className="text-left p-2 w-10"></th>
                      <th className="text-left p-2">Código</th>
                      <th className="text-left p-2">Produto</th>
                      <th className="text-center p-2">Qtd</th>
                      <th className="text-right p-2">Valor Unit.</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {nfeData.produtos.map((produto, index) => (
                      <tr 
                        key={index} 
                        className={`hover:bg-foreground/5 cursor-pointer ${!produto.selected ? 'opacity-50' : ''}`}
                        onClick={() => toggleProductSelection(index)}
                      >
                        <td className="p-2">
                          <Checkbox checked={produto.selected} />
                        </td>
                        <td className="p-2 text-muted-foreground">{produto.codigo}</td>
                        <td className="p-2 font-medium text-foreground">{produto.nome}</td>
                        <td className="p-2 text-center">{produto.quantidade} {produto.unidade}</td>
                        <td className="p-2 text-right text-muted-foreground">{formatCurrency(produto.valor_unitario)}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(produto.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetModal}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <Package className="w-4 h-4 mr-2" />
                Importar {selectedCount} produtos
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
            <p className="text-foreground font-medium">Importando dados...</p>
            <p className="text-sm text-muted-foreground">Criando produtos, estoque e contas a pagar</p>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && importResult && (
          <div className="space-y-4">
            <div className={`p-6 rounded-lg text-center ${importResult.errors.length === 0 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
              {importResult.errors.length === 0 ? (
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              ) : (
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              )}
              <p className="text-lg font-semibold text-foreground mb-2">
                {importResult.errors.length === 0 ? 'Importação concluída!' : 'Importação concluída com avisos'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-card/50 rounded-lg text-center">
                <Package className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{importResult.produtos}</p>
                <p className="text-xs text-muted-foreground">Produtos importados</p>
              </div>
              <div className="p-3 bg-card/50 rounded-lg text-center">
                <Truck className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{importResult.fornecedor ? '1' : '0'}</p>
                <p className="text-xs text-muted-foreground">Fornecedor criado</p>
              </div>
              <div className="p-3 bg-card/50 rounded-lg text-center">
                <Receipt className="w-6 h-6 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{importResult.contaPagar ? '1' : '0'}</p>
                <p className="text-xs text-muted-foreground">Conta a pagar</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm font-medium text-red-400 mb-2">Erros encontrados:</p>
                <ul className="text-xs text-red-300 space-y-1">
                  {importResult.errors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
