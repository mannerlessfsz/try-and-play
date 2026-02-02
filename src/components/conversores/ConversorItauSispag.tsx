import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useFornecedores } from "@/hooks/useFornecedores";
import { Upload, Download, FileText, Building2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

interface RemessaItem {
  id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  banco: string;
  agencia: string;
  conta: string;
  cpf_cnpj: string;
  valor: number;
  data_pagamento: string;
  selecionado: boolean;
}

const ConversorItauSispag = () => {
  const { toast } = useToast();
  const { empresaAtiva } = useEmpresaAtiva();
  const { fornecedores } = useFornecedores(empresaAtiva?.id);
  
  const [itens, setItens] = useState<RemessaItem[]>([]);
  const [processando, setProcessando] = useState(false);
  const [arquivoGerado, setArquivoGerado] = useState<string | null>(null);
  const [tipoRemessa, setTipoRemessa] = useState<string>("pagamento");
  const [dataRemessa, setDataRemessa] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessando(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      // Parse CSV/TXT com dados de pagamento
      const parsedItems: RemessaItem[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';').map(c => c.trim());
        if (cols.length >= 6) {
          const fornecedorNome = cols[0];
          const fornecedor = fornecedores.find(f => 
            f.nome.toLowerCase().includes(fornecedorNome.toLowerCase()) ||
            f.cpf_cnpj === cols[1]
          );
          
          parsedItems.push({
            id: `item-${i}`,
            fornecedor_id: fornecedor?.id || '',
            fornecedor_nome: fornecedorNome,
            cpf_cnpj: cols[1] || fornecedor?.cpf_cnpj || '',
            banco: cols[2] || '',
            agencia: cols[3] || '',
            conta: cols[4] || '',
            valor: parseFloat(cols[5]?.replace(',', '.') || '0'),
            data_pagamento: cols[6] || dataRemessa,
            selecionado: true,
          });
        }
      }
      
      setItens(parsedItems);
      toast({
        title: "Arquivo importado",
        description: `${parsedItems.length} itens carregados para processamento.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  const toggleItem = (id: string) => {
    setItens(prev => prev.map(item => 
      item.id === id ? { ...item, selecionado: !item.selecionado } : item
    ));
  };

  const toggleAll = (checked: boolean) => {
    setItens(prev => prev.map(item => ({ ...item, selecionado: checked })));
  };

  const formatCNAB = (value: string, length: number, type: 'alpha' | 'num' = 'alpha', padChar = ' '): string => {
    const cleaned = value.replace(/[^\w\s]/g, '').toUpperCase();
    if (type === 'num') {
      return cleaned.replace(/\D/g, '').padStart(length, '0').slice(-length);
    }
    return cleaned.padEnd(length, padChar).slice(0, length);
  };

  const formatValor = (valor: number): string => {
    return Math.round(valor * 100).toString().padStart(15, '0');
  };

  const gerarArquivoSispag = () => {
    const itensSelecionados = itens.filter(i => i.selecionado);
    if (itensSelecionados.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione ao menos um item para gerar a remessa.",
        variant: "destructive",
      });
      return;
    }

    setProcessando(true);
    try {
      const dataAtual = new Date();
      const dataFormatada = format(dataAtual, "ddMMyyyy");
      const horaFormatada = format(dataAtual, "HHmmss");
      const sequencial = "000001";
      
      const lines: string[] = [];
      
      // Header do arquivo (registro 0)
      const headerArquivo = [
        '0',                                    // Tipo registro
        '2',                                    // Operação (2 = Remessa)
        '2',                                    // Literal
        formatCNAB('PAGAMENTOS', 17),          // Serviço
        formatCNAB(empresaAtiva?.cnpj || '', 20, 'num'), // CNPJ empresa
        formatCNAB('341', 3, 'num'),           // Código banco
        formatCNAB('BANCO ITAU SA', 30),       // Nome banco
        dataFormatada,                          // Data geração
        horaFormatada,                          // Hora geração
        sequencial,                             // Sequencial
        formatCNAB('08', 2),                   // Layout
        formatCNAB('', 69),                    // Brancos
      ].join('');
      lines.push(headerArquivo);

      // Header do lote (registro 1)
      const headerLote = [
        '1',                                    // Tipo registro
        formatCNAB('C', 1),                    // Operação
        formatCNAB('20', 2),                   // Tipo pagamento (20 = Fornecedores)
        formatCNAB('01', 2),                   // Forma pagamento (01 = Crédito CC)
        formatCNAB('045', 3),                  // Layout lote
        ' ',                                   // Branco
        formatCNAB(empresaAtiva?.cnpj || '', 14, 'num'), // CNPJ
        formatCNAB('', 20),                    // Convênio
        formatCNAB('0', 5, 'num'),             // Agência
        ' ',                                   // DV agência
        formatCNAB('0', 12, 'num'),            // Conta
        ' ',                                   // DV conta
        ' ',                                   // DV agência/conta
        formatCNAB(empresaAtiva?.nome || '', 30), // Nome empresa
        formatCNAB('', 40),                    // Mensagem 1
        formatCNAB('', 30),                    // Logradouro
        formatCNAB('', 5, 'num'),              // Número
        formatCNAB('', 15),                    // Complemento
        formatCNAB('', 20),                    // Cidade
        formatCNAB('', 5, 'num'),              // CEP
        formatCNAB('', 3, 'num'),              // Complemento CEP
        formatCNAB('', 2),                     // Estado
        formatCNAB('', 8),                     // Brancos
      ].join('');
      lines.push(headerLote);

      // Detalhe (registros 3)
      let sequencialDetalhe = 1;
      let totalValor = 0;

      for (const item of itensSelecionados) {
        const tipoDoc = item.cpf_cnpj.length > 11 ? '2' : '1';
        const dataFormatadaPag = item.data_pagamento.replace(/-/g, '').split('').reverse().join('');
        
        // Segmento A
        const segmentoA = [
          '3',                                  // Tipo registro
          formatCNAB(sequencialDetalhe.toString(), 5, 'num'), // Sequencial
          'A',                                  // Segmento
          formatCNAB('0', 3),                  // Tipo movimento
          formatCNAB(item.banco, 3, 'num'),    // Banco favorecido
          formatCNAB(item.agencia, 5, 'num'),  // Agência
          ' ',                                 // DV agência
          formatCNAB(item.conta, 12, 'num'),   // Conta
          ' ',                                 // DV conta
          ' ',                                 // DV agência/conta
          formatCNAB(item.fornecedor_nome, 30), // Nome favorecido
          formatCNAB('', 20),                  // Número documento
          dataFormatadaPag.slice(0, 8).padStart(8, '0'), // Data pagamento
          formatCNAB('BRL', 3),                // Moeda
          formatCNAB('0', 15, 'num'),          // Quantidade moeda
          formatValor(item.valor),              // Valor pagamento
          formatCNAB('', 20),                  // Número documento banco
          dataFormatadaPag.slice(0, 8).padStart(8, '0'), // Data real
          formatValor(item.valor),              // Valor real
          formatCNAB('', 40),                  // Informação 2
          formatCNAB('', 2),                   // Finalidade DOC/TED
          formatCNAB('', 10),                  // Brancos
          formatCNAB('', 1),                   // Aviso
          formatCNAB('', 10),                  // Códigos
        ].join('');
        lines.push(segmentoA);

        // Segmento B
        const segmentoB = [
          '3',                                  // Tipo registro
          formatCNAB(sequencialDetalhe.toString(), 5, 'num'), // Sequencial
          'B',                                  // Segmento
          formatCNAB('', 3),                   // Brancos
          tipoDoc,                              // Tipo inscrição
          formatCNAB(item.cpf_cnpj, 14, 'num'), // CPF/CNPJ
          formatCNAB('', 30),                  // Logradouro
          formatCNAB('', 5, 'num'),            // Número
          formatCNAB('', 15),                  // Complemento
          formatCNAB('', 15),                  // Bairro
          formatCNAB('', 20),                  // Cidade
          formatCNAB('', 8, 'num'),            // CEP
          formatCNAB('', 2),                   // Estado
          dataFormatadaPag.slice(0, 8).padStart(8, '0'), // Data vencimento
          formatValor(item.valor),              // Valor documento
          formatValor(0),                       // Abatimento
          formatValor(0),                       // Desconto
          formatValor(0),                       // Mora
          formatValor(0),                       // Multa
          formatCNAB('', 15),                  // Código documento
          formatCNAB('', 1),                   // Aviso
          formatCNAB('', 6),                   // Códigos ISPB
        ].join('');
        lines.push(segmentoB);

        totalValor += item.valor;
        sequencialDetalhe++;
      }

      // Trailer do lote (registro 5)
      const trailerLote = [
        '5',                                    // Tipo registro
        formatCNAB('', 9),                     // Brancos
        formatCNAB((sequencialDetalhe + 2).toString(), 6, 'num'), // Quantidade registros
        formatValor(totalValor),                // Somatório valores
        formatCNAB('0', 18, 'num'),            // Quantidade moedas
        formatCNAB('', 171),                   // Brancos
      ].join('');
      lines.push(trailerLote);

      // Trailer do arquivo (registro 9)
      const trailerArquivo = [
        '9',                                    // Tipo registro
        formatCNAB('', 9),                     // Brancos
        formatCNAB('1', 6, 'num'),             // Quantidade lotes
        formatCNAB((lines.length + 1).toString(), 6, 'num'), // Quantidade registros
        formatCNAB('', 6),                     // Brancos
        formatCNAB('', 205),                   // Brancos
      ].join('');
      lines.push(trailerArquivo);

      const conteudo = lines.join('\r\n');
      setArquivoGerado(conteudo);

      toast({
        title: "Arquivo gerado com sucesso!",
        description: `Remessa SISPAG com ${itensSelecionados.length} pagamentos.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar arquivo",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  const downloadArquivo = () => {
    if (!arquivoGerado) return;
    
    const blob = new Blob([arquivoGerado], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `REMESSA_SISPAG_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSelecionado = itens.filter(i => i.selecionado).reduce((sum, i) => sum + i.valor, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Conversor ITAU SISPAG - Fornecedores</CardTitle>
              <CardDescription>Gere arquivos de remessa CNAB para pagamento de fornecedores</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configurações */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Remessa</Label>
              <Select value={tipoRemessa} onValueChange={setTipoRemessa}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagamento">Pagamento a Fornecedores</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data da Remessa</Label>
              <Input 
                type="date" 
                value={dataRemessa} 
                onChange={(e) => setDataRemessa(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Importar Dados</Label>
              <div className="relative">
                <Input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                  disabled={processando}
                />
              </div>
            </div>
          </div>

          {/* Tabela de itens */}
          {itens.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox 
                        checked={itens.every(i => i.selecionado)}
                        onCheckedChange={(checked) => toggleAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Agência</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.id} className={!item.selecionado ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={item.selecionado}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.fornecedor_nome}</TableCell>
                      <TableCell>{item.cpf_cnpj}</TableCell>
                      <TableCell>{item.banco}</TableCell>
                      <TableCell>{item.agencia}</TableCell>
                      <TableCell>{item.conta}</TableCell>
                      <TableCell className="text-right">
                        {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="p-3 bg-muted/50 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {itens.filter(i => i.selecionado).length} de {itens.length} itens selecionados
                </span>
                <span className="font-semibold">
                  Total: {totalSelecionado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3">
            <Button 
              onClick={gerarArquivoSispag} 
              disabled={processando || itens.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {processando ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Gerar Arquivo SISPAG
            </Button>
            
            {arquivoGerado && (
              <Button variant="outline" onClick={downloadArquivo}>
                <Download className="w-4 h-4 mr-2" />
                Baixar Arquivo
              </Button>
            )}
          </div>

          {/* Preview do arquivo */}
          {arquivoGerado && (
            <div className="mt-4">
              <Label className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Arquivo Gerado
              </Label>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-60 overflow-y-auto font-mono">
                {arquivoGerado}
              </pre>
            </div>
          )}

          {/* Instruções */}
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <h4 className="font-medium text-purple-400 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Formato do arquivo de entrada
            </h4>
            <p className="text-sm text-muted-foreground">
              O arquivo CSV/TXT deve conter as colunas separadas por ponto e vírgula (;):
            </p>
            <code className="text-xs bg-background/50 p-2 rounded block mt-2">
              FORNECEDOR;CPF_CNPJ;BANCO;AGENCIA;CONTA;VALOR;DATA_PAGAMENTO
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversorItauSispag;
