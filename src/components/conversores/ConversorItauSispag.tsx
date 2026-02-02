import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useFornecedores } from "@/hooks/useFornecedores";
import { Upload, Download, FileText, Building2, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import {
  parsePlanoContasFromCsvFile,
  parsePlanoContasFromExcelFile,
  type PlanoContasItem,
} from "@/utils/planoContasParser";

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
  conta_contabil?: string;
  selecionado: boolean;
}

const ITEMS_PER_PAGE = 15;

const ConversorItauSispag = () => {
  const { toast } = useToast();
  const { empresaAtiva } = useEmpresaAtiva();
  const { fornecedores } = useFornecedores(empresaAtiva?.id);
  
  const [itens, setItens] = useState<RemessaItem[]>([]);
  const [processando, setProcessando] = useState(false);
  const [arquivoGerado, setArquivoGerado] = useState<string | null>(null);
  const [tipoRemessa, setTipoRemessa] = useState<string>("pagamento");
  const [dataRemessa, setDataRemessa] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  // Plano de contas
  const [planoContas, setPlanoContas] = useState<PlanoContasItem[]>([]);
  const [planoContasNome, setPlanoContasNome] = useState<string>("");
  const [loadingPlano, setLoadingPlano] = useState(false);
  const [planoPagina, setPlanoPagina] = useState(1);
  const [planoBusca, setPlanoBusca] = useState("");
  const planoInputRef = useRef<HTMLInputElement>(null);

  // Filtrar e paginar plano de contas
  const planoContasFiltrado = useMemo(() => {
    if (!planoBusca.trim()) return planoContas;
    const termo = planoBusca.toLowerCase();
    return planoContas.filter(
      (c) =>
        c.descricao.toLowerCase().includes(termo) ||
        c.codigo.toLowerCase().includes(termo) ||
        c.classificacao.toLowerCase().includes(termo) ||
        c.cnpj.toLowerCase().includes(termo)
    );
  }, [planoContas, planoBusca]);

  const totalPaginasPlano = Math.ceil(planoContasFiltrado.length / ITEMS_PER_PAGE);
  const planoContasPaginado = useMemo(() => {
    const inicio = (planoPagina - 1) * ITEMS_PER_PAGE;
    return planoContasFiltrado.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [planoContasFiltrado, planoPagina]);

  // parsing do plano de contas está em src/utils/planoContasParser.ts

  const handlePlanoContasUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingPlano(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let items: PlanoContasItem[];

      if (ext === "xls" || ext === "xlsx") {
        items = await parsePlanoContasFromExcelFile(file);
      } else if (ext === "csv") {
        items = await parsePlanoContasFromCsvFile(file);
      } else {
        throw new Error("Formato não suportado. Use XLS, XLSX ou CSV.");
      }

      if (!items || items.length === 0) {
        throw new Error(
          "Arquivo carregado, mas não encontrei linhas do plano de contas. Verifique se ele contém as colunas Classificação/Código/Descrição/CNPJ (ou envie como XLSX/CSV)."
        );
      }

      setPlanoContas(items);
      setPlanoContasNome(file.name);
      setPlanoPagina(1);
      setPlanoBusca("");
      toast({
        title: "Plano de contas carregado",
        description: `${items.length} contas importadas com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar plano de contas",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoadingPlano(false);
      if (planoInputRef.current) {
        planoInputRef.current.value = "";
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessando(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
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
            conta_contabil: cols[7] || '',
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

  const updateItemContaContabil = (id: string, contaContabil: string) => {
    setItens(prev => prev.map(item => 
      item.id === id ? { ...item, conta_contabil: contaContabil } : item
    ));
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
        '0',
        '2',
        '2',
        formatCNAB('PAGAMENTOS', 17),
        formatCNAB(empresaAtiva?.cnpj || '', 20, 'num'),
        formatCNAB('341', 3, 'num'),
        formatCNAB('BANCO ITAU SA', 30),
        dataFormatada,
        horaFormatada,
        sequencial,
        formatCNAB('08', 2),
        formatCNAB('', 69),
      ].join('');
      lines.push(headerArquivo);

      // Header do lote (registro 1)
      const headerLote = [
        '1',
        formatCNAB('C', 1),
        formatCNAB('20', 2),
        formatCNAB('01', 2),
        formatCNAB('045', 3),
        ' ',
        formatCNAB(empresaAtiva?.cnpj || '', 14, 'num'),
        formatCNAB('', 20),
        formatCNAB('0', 5, 'num'),
        ' ',
        formatCNAB('0', 12, 'num'),
        ' ',
        ' ',
        formatCNAB(empresaAtiva?.nome || '', 30),
        formatCNAB('', 40),
        formatCNAB('', 30),
        formatCNAB('', 5, 'num'),
        formatCNAB('', 15),
        formatCNAB('', 20),
        formatCNAB('', 5, 'num'),
        formatCNAB('', 3, 'num'),
        formatCNAB('', 2),
        formatCNAB('', 8),
      ].join('');
      lines.push(headerLote);

      let sequencialDetalhe = 1;
      let totalValor = 0;

      for (const item of itensSelecionados) {
        const tipoDoc = item.cpf_cnpj.length > 11 ? '2' : '1';
        const dataFormatadaPag = item.data_pagamento.replace(/-/g, '').split('').reverse().join('');
        
        // Segmento A
        const segmentoA = [
          '3',
          formatCNAB(sequencialDetalhe.toString(), 5, 'num'),
          'A',
          formatCNAB('0', 3),
          formatCNAB(item.banco, 3, 'num'),
          formatCNAB(item.agencia, 5, 'num'),
          ' ',
          formatCNAB(item.conta, 12, 'num'),
          ' ',
          ' ',
          formatCNAB(item.fornecedor_nome, 30),
          formatCNAB('', 20),
          dataFormatadaPag.slice(0, 8).padStart(8, '0'),
          formatCNAB('BRL', 3),
          formatCNAB('0', 15, 'num'),
          formatValor(item.valor),
          formatCNAB('', 20),
          dataFormatadaPag.slice(0, 8).padStart(8, '0'),
          formatValor(item.valor),
          formatCNAB('', 40),
          formatCNAB('', 2),
          formatCNAB('', 10),
          formatCNAB('', 1),
          formatCNAB('', 10),
        ].join('');
        lines.push(segmentoA);

        // Segmento B
        const segmentoB = [
          '3',
          formatCNAB(sequencialDetalhe.toString(), 5, 'num'),
          'B',
          formatCNAB('', 3),
          tipoDoc,
          formatCNAB(item.cpf_cnpj, 14, 'num'),
          formatCNAB('', 30),
          formatCNAB('', 5, 'num'),
          formatCNAB('', 15),
          formatCNAB('', 15),
          formatCNAB('', 20),
          formatCNAB('', 8, 'num'),
          formatCNAB('', 2),
          dataFormatadaPag.slice(0, 8).padStart(8, '0'),
          formatValor(item.valor),
          formatValor(0),
          formatValor(0),
          formatValor(0),
          formatValor(0),
          formatCNAB('', 15),
          formatCNAB('', 1),
          formatCNAB('', 6),
        ].join('');
        lines.push(segmentoB);

        totalValor += item.valor;
        sequencialDetalhe++;
      }

      // Trailer do lote (registro 5)
      const trailerLote = [
        '5',
        formatCNAB('', 9),
        formatCNAB((sequencialDetalhe + 2).toString(), 6, 'num'),
        formatValor(totalValor),
        formatCNAB('0', 18, 'num'),
        formatCNAB('', 171),
      ].join('');
      lines.push(trailerLote);

      // Trailer do arquivo (registro 9)
      const trailerArquivo = [
        '9',
        formatCNAB('', 9),
        formatCNAB('1', 6, 'num'),
        formatCNAB((lines.length + 1).toString(), 6, 'num'),
        formatCNAB('', 6),
        formatCNAB('', 205),
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
      {/* Card do Plano de Contas */}
      <Card className="border-purple-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Plano de Contas</CardTitle>
              <CardDescription>Carregue o plano de contas para vincular aos pagamentos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                ref={planoInputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={handlePlanoContasUpload}
                disabled={loadingPlano}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Arquivos suportados: XLS, XLSX ou CSV
              </p>
            </div>
            {planoContas.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setPlanoContas([]);
                  setPlanoContasNome("");
                  setPlanoPagina(1);
                  setPlanoBusca("");
                }}
                title="Remover plano de contas"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>

          {loadingPlano && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando plano de contas...
            </div>
          )}

          {planoContas.length > 0 && (
            <div className="space-y-3">
              {/* Header com info e busca */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">{planoContasNome}</span>
                  <span className="text-xs text-muted-foreground">
                    ({planoContas.length} contas)
                  </span>
                </div>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar código ou descrição..."
                    value={planoBusca}
                    onChange={(e) => {
                      setPlanoBusca(e.target.value);
                      setPlanoPagina(1);
                    }}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Tabela completa paginada */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="text-xs w-28">Código</TableHead>
                      <TableHead className="text-xs w-36">Classificação</TableHead>
                      <TableHead className="text-xs w-36">CNPJ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planoContasPaginado.length > 0 ? (
                      planoContasPaginado.map((conta, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/30">
                          <TableCell className="text-xs py-2">{conta.descricao}</TableCell>
                          <TableCell className="text-xs py-2 font-mono">{conta.codigo}</TableCell>
                          <TableCell className="text-xs py-2 font-mono">{conta.classificacao}</TableCell>
                          <TableCell className="text-xs py-2 font-mono">{conta.cnpj || "00000000000000"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                          Nenhuma conta encontrada para "{planoBusca}"
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPaginasPlano > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {((planoPagina - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(planoPagina * ITEMS_PER_PAGE, planoContasFiltrado.length)} de {planoContasFiltrado.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPlanoPagina(p => Math.max(1, p - 1))}
                      disabled={planoPagina === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      {Array.from({ length: Math.min(5, totalPaginasPlano) }, (_, i) => {
                        let pageNum: number;
                        if (totalPaginasPlano <= 5) {
                          pageNum = i + 1;
                        } else if (planoPagina <= 3) {
                          pageNum = i + 1;
                        } else if (planoPagina >= totalPaginasPlano - 2) {
                          pageNum = totalPaginasPlano - 4 + i;
                        } else {
                          pageNum = planoPagina - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={planoPagina === pageNum ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setPlanoPagina(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPlanoPagina(p => Math.min(totalPaginasPlano, p + 1))}
                      disabled={planoPagina === totalPaginasPlano}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Principal */}
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
              <Label>Importar Dados de Pagamento</Label>
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
                    {planoContas.length > 0 && (
                      <TableHead>Conta Contábil</TableHead>
                    )}
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
                      {planoContas.length > 0 && (
                        <TableCell>
                          <Select 
                            value={item.conta_contabil || ""} 
                            onValueChange={(v) => updateItemContaContabil(item.id, v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {planoContas.map((conta, idx) => (
                                <SelectItem key={idx} value={conta.codigo}>
                                  {conta.codigo} - {conta.descricao}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
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
              FORNECEDOR;CPF_CNPJ;BANCO;AGENCIA;CONTA;VALOR;DATA_PAGAMENTO{planoContas.length > 0 ? ";CONTA_CONTABIL" : ""}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversorItauSispag;
