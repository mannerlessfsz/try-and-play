import { useState, useEffect } from "react";
import { 
  Crown, FileText, Upload, Download, 
  CheckCircle, AlertTriangle, Eye, Trash2,
  FileSpreadsheet, Loader2, History, RefreshCw,
  Check, Edit3, Save, X, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  transformarLancamentos, 
  gerarCSV, 
  gerarTXT, 
  readFileAsText,
  type OutputRow,
  type TransformResult 
} from "@/utils/liderLancamentosParser";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useConversoes, type ConversaoArquivo } from "@/hooks/useConversoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface ArquivoProcessadoLocal {
  id: string;
  nome: string;
  status: "processando" | "sucesso" | "erro";
  resultado?: TransformResult;
  dataProcessamento: string;
  conversaoId?: string;
}

// Lançamento editável com confirmação
interface LancamentoEditavel extends OutputRow {
  id: string;
  confirmado: boolean;
  temErro: boolean;
  erroOriginal?: string;
}

type FluxoStep = "importar" | "revisar" | "corrigir" | "exportar";

export function ConversorLiderTab() {
  const { toast } = useToast();
  const { empresaAtiva } = useEmpresaAtiva();
  const { 
    conversoes, 
    isLoading: isLoadingConversoes, 
    criarConversao, 
    atualizarConversao, 
    deletarConversao,
    getDownloadUrl,
    refetch 
  } = useConversoes("lider");

  // Estado do fluxo
  const [currentStep, setCurrentStep] = useState<FluxoStep>("importar");
  const [arquivoAtual, setArquivoAtual] = useState<ArquivoProcessadoLocal | null>(null);
  const [lancamentosEditaveis, setLancamentosEditaveis] = useState<LancamentoEditavel[]>([]);
  const [todosConfirmados, setTodosConfirmados] = useState(false);
  const [errosCorrigidos, setErrosCorrigidos] = useState(false);

  // Estados existentes
  const [arquivosLocais, setArquivosLocais] = useState<ArquivoProcessadoLocal[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoExportacao, setTipoExportacao] = useState<string>("csv");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewConversao, setPreviewConversao] = useState<ConversaoArquivo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<OutputRow>>({});

  // Calcula se todos foram confirmados e erros corrigidos
  useEffect(() => {
    const semErro = lancamentosEditaveis.filter(l => !l.temErro);
    const confirmados = semErro.every(l => l.confirmado);
    setTodosConfirmados(semErro.length > 0 && confirmados);
    
    const comErro = lancamentosEditaveis.filter(l => l.temErro);
    const corrigidos = comErro.every(l => 
      l.contaDebito && l.contaCredito && l.valor && l.historico
    );
    setErrosCorrigidos(comErro.length === 0 || corrigidos);
  }, [lancamentosEditaveis]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.txt')) {
        setSelectedFile(file);
      } else {
        toast({ 
          title: "Formato inválido", 
          description: "Por favor, selecione um arquivo TXT.",
          variant: "destructive" 
        });
      }
    }
  };

  const processarArquivo = async (file: File) => {
    if (!empresaAtiva?.id) {
      toast({ 
        title: "Erro", 
        description: "Selecione uma empresa ativa.",
        variant: "destructive" 
      });
      return;
    }

    const arquivoId = Date.now().toString();
    
    const novoArquivo: ArquivoProcessadoLocal = {
      id: arquivoId,
      nome: file.name,
      status: "processando",
      dataProcessamento: new Date().toISOString()
    };
    
    setArquivoAtual(novoArquivo);
    setIsProcessing(true);

    try {
      const content = await readFileAsText(file);
      
      // Criar registro no banco
      const conversao = await criarConversao.mutateAsync({
        modulo: "lider",
        nomeArquivoOriginal: file.name,
        conteudoOriginal: content,
      });

      const resultado = transformarLancamentos(content);
      
      // Criar lançamentos editáveis
      const lancamentos: LancamentoEditavel[] = resultado.outputRows.map((row, idx) => ({
        ...row,
        id: `${arquivoId}-${idx}`,
        confirmado: false,
        // Se requerRevisao=true (len=44), marca como erro para forçar revisão do usuário
        temErro: row.requerRevisao === true,
        erroOriginal: row.requerRevisao ? "Registro com prefixo de 44 caracteres (trailer reduzido). Requer revisão manual." : undefined,
      }));

      // Marcar linhas com erros baseados nos erros do parser
      // Os erros normalmente indicam linhas problemáticas
      if (resultado.erros.length > 0) {
        // Adicionar linhas de erro como lançamentos editáveis para correção
        resultado.erros.forEach((erro, idx) => {
          lancamentos.push({
            id: `${arquivoId}-erro-${idx}`,
            data: "",
            contaDebito: "",
            contaCredito: "",
            valor: "",
            historico: "",
            loteFlag: false,
            confirmado: false,
            temErro: true,
            erroOriginal: erro,
          });
        });
      }

      setLancamentosEditaveis(lancamentos);
      
      // Gerar conteúdo convertido
      const conteudoConvertido = tipoExportacao === "csv" 
        ? gerarCSV(resultado.outputRows)
        : gerarTXT(resultado.outputRows);
      
      const nomeConvertido = file.name.replace(/\.[^.]+$/, `_transformado.${tipoExportacao}`);

      // Atualizar registro no banco com o resultado
      await atualizarConversao.mutateAsync({
        id: conversao.id,
        status: resultado.erros.length > 0 ? "erro" : "sucesso",
        totalLinhas: resultado.totalLinhas,
        linhasProcessadas: resultado.outputRows.length,
        linhasErro: resultado.erros.length,
        mensagemErro: resultado.erros.length > 0 ? resultado.erros.join("; ") : undefined,
        metadados: {
          totalLancamentos: resultado.totalLancamentos,
          warnings: resultado.warnings,
          header0100: resultado.header0100,
        },
        conteudoConvertido,
        nomeArquivoConvertido: nomeConvertido,
      });

      const arquivoFinal: ArquivoProcessadoLocal = {
        ...novoArquivo,
        status: "sucesso",
        resultado,
        conversaoId: conversao.id
      };

      setArquivoAtual(arquivoFinal);
      setArquivosLocais(prev => [...prev, arquivoFinal]);

      // Avança para o próximo passo
      if (resultado.erros.length > 0) {
        toast({ 
          title: "Processamento com erros", 
          description: `${resultado.totalLancamentos} lançamentos. ${resultado.erros.length} erros encontrados.`,
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Processamento concluído!", 
          description: `${resultado.totalLancamentos} lançamentos processados. Revise e confirme.`
        });
      }

      // Vai para revisão
      setCurrentStep("revisar");

    } catch (error) {
      setArquivoAtual({
        ...novoArquivo,
        status: "erro",
        resultado: {
          outputRows: [],
          outputLines: [],
          totalLancamentos: 0,
          totalLinhas: 0,
          header0100: null,
          erros: [error instanceof Error ? error.message : "Erro desconhecido ao processar arquivo"],
          warnings: []
        }
      });
      
      toast({ 
        title: "Erro ao processar arquivo", 
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      setSelectedFile(null);
      const input = document.getElementById('lider-file') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  const handleProcessar = async () => {
    if (!selectedFile) {
      toast({ title: "Selecione um arquivo TXT", variant: "destructive" });
      return;
    }
    await processarArquivo(selectedFile);
  };

  const confirmarTodos = () => {
    setLancamentosEditaveis(prev => 
      prev.map(l => l.temErro ? l : { ...l, confirmado: true })
    );
  };

  const toggleConfirmacao = (id: string) => {
    setLancamentosEditaveis(prev => 
      prev.map(l => l.id === id ? { ...l, confirmado: !l.confirmado } : l)
    );
  };

  const startEdit = (lancamento: LancamentoEditavel) => {
    setEditingRowId(lancamento.id);
    setEditValues({
      data: lancamento.data,
      contaDebito: lancamento.contaDebito,
      contaCredito: lancamento.contaCredito,
      valor: lancamento.valor,
      historico: lancamento.historico,
    });
  };

  const saveEdit = (id: string) => {
    setLancamentosEditaveis(prev => 
      prev.map(l => {
        if (l.id === id) {
          const updated = {
            ...l,
            ...editValues,
            temErro: false, // Remove o erro após edição
          };
          return updated;
        }
        return l;
      })
    );
    setEditingRowId(null);
    setEditValues({});
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditValues({});
  };

  const removerLancamentoErro = (id: string) => {
    setLancamentosEditaveis(prev => prev.filter(l => l.id !== id));
  };

  const handleExportar = () => {
    const lancamentosValidos = lancamentosEditaveis.filter(l => !l.temErro || (l.data && l.contaDebito && l.contaCredito && l.valor));
    
    const rows: OutputRow[] = lancamentosValidos.map(l => ({
      data: l.data,
      contaDebito: l.contaDebito,
      contaCredito: l.contaCredito,
      valor: l.valor,
      historico: l.historico,
      loteFlag: l.loteFlag,
    }));

    let content: string;
    let filename: string;
    let mimeType: string;

    if (tipoExportacao === "csv") {
      content = gerarCSV(rows);
      filename = arquivoAtual?.nome.replace(/\.[^.]+$/, '_transformado.csv') || 'transformado.csv';
      mimeType = 'text/csv;charset=utf-8';
    } else {
      content = gerarTXT(rows);
      filename = arquivoAtual?.nome.replace(/\.[^.]+$/, '_transformado.txt') || 'transformado.txt';
      mimeType = 'text/plain;charset=utf-8';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Arquivo exportado!", description: filename });
  };

  const handleDownloadConversao = async (conversao: ConversaoArquivo, tipo: 'original' | 'convertido') => {
    const path = tipo === 'original' 
      ? conversao.arquivo_original_url 
      : conversao.arquivo_convertido_url;
    
    if (!path) {
      toast({ 
        title: "Arquivo não disponível", 
        description: `O arquivo ${tipo} não está disponível para download.`,
        variant: "destructive" 
      });
      return;
    }

    const url = await getDownloadUrl(path);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({ 
        title: "Erro ao gerar download", 
        description: "Não foi possível gerar o link de download.",
        variant: "destructive" 
      });
    }
  };

  const handleRemoverConversao = async (conversao: ConversaoArquivo) => {
    await deletarConversao.mutateAsync(conversao);
  };

  const resetarFluxo = () => {
    setCurrentStep("importar");
    setArquivoAtual(null);
    setLancamentosEditaveis([]);
    setTodosConfirmados(false);
    setErrosCorrigidos(false);
  };

  // Stats
  const lancamentosSemErro = lancamentosEditaveis.filter(l => !l.temErro);
  const lancamentosComErro = lancamentosEditaveis.filter(l => l.temErro);
  const totalConfirmados = lancamentosSemErro.filter(l => l.confirmado).length;

  const totalHistorico = conversoes.length;
  const totalHistoricoSucesso = conversoes.filter(c => c.status === "sucesso").length;

  const steps = [
    { id: "importar", label: "Importar", icon: Upload },
    { id: "revisar", label: "Revisar", icon: Eye },
    { id: "corrigir", label: "Corrigir", icon: Edit3, hidden: lancamentosComErro.length === 0 },
    { id: "exportar", label: "Exportar", icon: Download },
  ].filter(s => !s.hidden);

  const canGoToExport = todosConfirmados && errosCorrigidos;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-violet-500" />
            Conversor LÍDER - Transformador de Lançamentos
          </CardTitle>
          <CardDescription>
            Transforme arquivos TXT de lançamentos contábeis (formato 0100/0200/0300). 
            Agrupa pagamentos, tarifas e descontos automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Steps Indicator */}
          <div className="flex items-center justify-center gap-2 p-4 bg-muted/30 rounded-lg">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isPast = steps.findIndex(s => s.id === currentStep) > idx;
              
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (isPast || isActive) {
                        setCurrentStep(step.id as FluxoStep);
                      }
                    }}
                    disabled={!isPast && !isActive}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive 
                        ? "bg-violet-500 text-white" 
                        : isPast 
                          ? "bg-green-500/20 text-green-600 cursor-pointer hover:bg-green-500/30"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {isPast ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    <span className="font-medium">{step.label}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {currentStep === "importar" && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Arquivos Processados</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{arquivosLocais.length}</p>
                </div>
                <div className="p-4 rounded-lg border bg-blue-500/10 border-blue-500/30">
                  <div className="flex items-center gap-2 text-blue-600">
                    <History className="w-4 h-4" />
                    <span className="text-sm">Histórico Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-blue-600">
                    {isLoadingConversoes ? "..." : `${totalHistoricoSucesso}/${totalHistorico}`}
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="text-sm">Formato Saída</span>
                  </div>
                  <Select value={tipoExportacao} onValueChange={setTipoExportacao}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="txt">TXT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
                  isDragging 
                    ? "border-violet-500 bg-violet-500/10 scale-[1.02]" 
                    : "border-muted-foreground/30 hover:border-violet-500/50 hover:bg-muted/30"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isProcessing && document.getElementById('lider-file')?.click()}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${
                  isDragging ? "text-violet-500" : "text-muted-foreground"
                }`} />
                <p className={`text-lg mb-2 transition-colors ${
                  isDragging ? "text-violet-500 font-medium" : "text-muted-foreground"
                }`}>
                  {isDragging 
                    ? "Solte o arquivo aqui..." 
                    : "Arraste e solte um arquivo TXT ou clique para selecionar"
                  }
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Formato aceito: 0100/0200/0300 - Agrupa PAGTO + TARIFA automaticamente
                </p>
                
                <div className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <Label htmlFor="lider-file" className="sr-only">Arquivo TXT</Label>
                    <Input 
                      id="lider-file" 
                      type="file" 
                      accept=".txt"
                      onChange={handleFileChange}
                      className="max-w-xs"
                      disabled={isProcessing}
                    />
                  </div>
                  <Button 
                    onClick={handleProcessar} 
                    className="bg-violet-500 hover:bg-violet-600"
                    disabled={isProcessing || !selectedFile || !empresaAtiva}
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processando...</>
                    ) : (
                      <><FileSpreadsheet className="w-4 h-4 mr-1" /> Processar</>
                    )}
                  </Button>
                </div>
                {selectedFile && (
                  <p className="text-sm text-violet-500 mt-4 font-medium">
                    ✓ Arquivo selecionado: {selectedFile.name}
                  </p>
                )}
                {!empresaAtiva && (
                  <p className="text-sm text-yellow-500 mt-2">
                    ⚠ Selecione uma empresa para processar arquivos
                  </p>
                )}
              </div>

              {/* Histórico */}
              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico de Conversões
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Atualizar
                  </Button>
                </div>
                {isLoadingConversoes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  </div>
                ) : conversoes.length > 0 ? (
                  <ScrollArea className="max-h-[300px]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">Arquivo</th>
                          <th className="text-center p-3 font-medium">Status</th>
                          <th className="text-center p-3 font-medium">Linhas</th>
                          <th className="text-left p-3 font-medium">Data</th>
                          <th className="text-center p-3 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {conversoes.map(conversao => (
                          <tr key={conversao.id} className="hover:bg-muted/30">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-violet-500" />
                                <span className="font-medium">{conversao.nome_arquivo_original}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                conversao.status === "sucesso" ? "bg-green-500/20 text-green-600" :
                                conversao.status === "erro" ? "bg-red-500/20 text-red-600" :
                                "bg-yellow-500/20 text-yellow-600"
                              }`}>
                                {conversao.status}
                              </span>
                            </td>
                            <td className="p-3 text-center font-medium">
                              {conversao.linhas_processadas?.toLocaleString() || '-'}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(conversao.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => setPreviewConversao(conversao)}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadConversao(conversao, 'convertido')}
                                  disabled={!conversao.arquivo_convertido_url}
                                  title="Download convertido"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => handleRemoverConversao(conversao)}
                                  title="Remover"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma conversão no histórico.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === "revisar" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-violet-500" />
                    Revisar Lançamentos
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Arquivo: <span className="font-medium">{arquivoAtual?.nome}</span> • 
                    {totalConfirmados}/{lancamentosSemErro.length} confirmados
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={resetarFluxo}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={confirmarTodos}
                    disabled={todosConfirmados}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Confirmar Todos
                  </Button>
                  <Button 
                    className="bg-violet-500 hover:bg-violet-600"
                    onClick={() => setCurrentStep(lancamentosComErro.length > 0 ? "corrigir" : "exportar")}
                    disabled={!todosConfirmados}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[500px] border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-center p-2 w-12">
                        <Checkbox 
                          checked={todosConfirmados}
                          onCheckedChange={() => confirmarTodos()}
                        />
                      </th>
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Débito</th>
                      <th className="text-left p-2">Crédito</th>
                      <th className="text-right p-2">Valor</th>
                      <th className="text-left p-2">Histórico</th>
                      <th className="text-center p-2">Lote</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lancamentosSemErro.map((row) => (
                      <tr 
                        key={row.id} 
                        className={`${row.loteFlag ? "bg-violet-500/5" : ""} ${row.confirmado ? "bg-green-500/5" : ""}`}
                      >
                        <td className="p-2 text-center">
                          <Checkbox 
                            checked={row.confirmado}
                            onCheckedChange={() => toggleConfirmacao(row.id)}
                          />
                        </td>
                        <td className="p-2">{row.data}</td>
                        <td className="p-2 font-mono">{row.contaDebito || '-'}</td>
                        <td className="p-2 font-mono">{row.contaCredito || '-'}</td>
                        <td className="p-2 text-right font-mono">{row.valor}</td>
                        <td className="p-2 truncate max-w-[250px]" title={row.historico}>
                          {row.historico}
                        </td>
                        <td className="p-2 text-center">
                          {row.loteFlag && <Badge variant="secondary" className="bg-violet-500/20 text-violet-600">S</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              {lancamentosComErro.length > 0 && (
                <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-red-600">
                      {lancamentosComErro.length} erro(s) encontrado(s)
                    </span>
                    <span className="text-sm text-red-500">
                      - Corrija na próxima etapa para incluir no arquivo final
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === "corrigir" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-orange-500" />
                    Corrigir Erros
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {lancamentosComErro.length} lançamento(s) com erro para corrigir ou remover
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep("revisar")}>
                    Voltar
                  </Button>
                  <Button 
                    className="bg-violet-500 hover:bg-violet-600"
                    onClick={() => setCurrentStep("exportar")}
                    disabled={!errosCorrigidos && lancamentosComErro.length > 0}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {lancamentosComErro.map((erro) => (
                  <div key={erro.id} className="p-4 border border-red-500/30 rounded-lg bg-red-500/5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-red-600">Erro no processamento</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removerLancamentoErro(erro.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Ignorar
                      </Button>
                    </div>
                    
                    <p className="text-sm text-red-600 mb-4 font-mono bg-red-500/10 p-2 rounded">
                      {erro.erroOriginal}
                    </p>

                    {editingRowId === erro.id ? (
                      <div className="grid grid-cols-6 gap-2">
                        <Input 
                          placeholder="Data (dd/mm/aaaa)"
                          value={editValues.data || ""}
                          onChange={(e) => setEditValues(prev => ({ ...prev, data: e.target.value }))}
                        />
                        <Input 
                          placeholder="Conta Débito"
                          value={editValues.contaDebito || ""}
                          onChange={(e) => setEditValues(prev => ({ ...prev, contaDebito: e.target.value }))}
                        />
                        <Input 
                          placeholder="Conta Crédito"
                          value={editValues.contaCredito || ""}
                          onChange={(e) => setEditValues(prev => ({ ...prev, contaCredito: e.target.value }))}
                        />
                        <Input 
                          placeholder="Valor"
                          value={editValues.valor || ""}
                          onChange={(e) => setEditValues(prev => ({ ...prev, valor: e.target.value }))}
                        />
                        <Input 
                          placeholder="Histórico"
                          value={editValues.historico || ""}
                          onChange={(e) => setEditValues(prev => ({ ...prev, historico: e.target.value }))}
                        />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => saveEdit(erro.id)}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => startEdit(erro)}>
                        <Edit3 className="w-4 h-4 mr-1" />
                        Preencher Manualmente
                      </Button>
                    )}
                  </div>
                ))}

                {lancamentosComErro.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-green-600 font-medium">Todos os erros foram resolvidos!</p>
                    <p className="text-sm">Você pode prosseguir para exportar o arquivo.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === "exportar" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Download className="w-5 h-5 text-green-500" />
                    Exportar Arquivo
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Arquivo: <span className="font-medium">{arquivoAtual?.nome}</span>
                  </p>
                </div>
                <Button variant="outline" onClick={() => setCurrentStep(lancamentosComErro.length > 0 ? "corrigir" : "revisar")}>
                  Voltar
                </Button>
              </div>

              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Lançamentos Válidos</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {lancamentosEditaveis.filter(l => !l.temErro || (l.data && l.valor)).length}
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-violet-500/10 border-violet-500/30">
                  <div className="flex items-center gap-2 text-violet-600">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="text-sm">Formato</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-violet-600">{tipoExportacao.toUpperCase()}</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Arquivo Saída</span>
                  </div>
                  <p className="text-sm font-medium mt-1 truncate">
                    {arquivoAtual?.nome.replace(/\.[^.]+$/, `_transformado.${tipoExportacao}`)}
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="border rounded-lg">
                <div className="p-3 border-b bg-muted/50">
                  <h4 className="font-medium">Preview do Arquivo</h4>
                </div>
                <ScrollArea className="h-[300px]">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Débito</th>
                        <th className="text-left p-2">Crédito</th>
                        <th className="text-right p-2">Valor</th>
                        <th className="text-left p-2">Histórico</th>
                        <th className="text-center p-2">Lote</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lancamentosEditaveis
                        .filter(l => !l.temErro || (l.data && l.valor))
                        .map((row) => (
                          <tr key={row.id} className={row.loteFlag ? "bg-violet-500/5" : ""}>
                            <td className="p-2">{row.data}</td>
                            <td className="p-2 font-mono">{row.contaDebito || '-'}</td>
                            <td className="p-2 font-mono">{row.contaCredito || '-'}</td>
                            <td className="p-2 text-right font-mono">{row.valor}</td>
                            <td className="p-2 truncate max-w-[200px]" title={row.historico}>
                              {row.historico}
                            </td>
                            <td className="p-2 text-center">
                              {row.loteFlag && <Badge variant="secondary" className="bg-violet-500/20 text-violet-600">S</Badge>}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              {/* Botões finais */}
              <div className="flex justify-center gap-4">
                <Button 
                  size="lg"
                  className="bg-green-500 hover:bg-green-600"
                  onClick={handleExportar}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Baixar Arquivo {tipoExportacao.toUpperCase()}
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={resetarFluxo}
                >
                  Novo Arquivo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog - Histórico */}
      <Dialog open={!!previewConversao} onOpenChange={() => setPreviewConversao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              {previewConversao?.nome_arquivo_original}
            </DialogTitle>
            <DialogDescription>
              Processado em {previewConversao && new Date(previewConversao.created_at).toLocaleString('pt-BR')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg border">
                <p className="text-muted-foreground">Total de Linhas</p>
                <p className="text-lg font-bold">{previewConversao?.total_linhas || 0}</p>
              </div>
              <div className="p-3 rounded-lg border bg-green-500/10">
                <p className="text-green-600">Processadas</p>
                <p className="text-lg font-bold text-green-600">{previewConversao?.linhas_processadas || 0}</p>
              </div>
              <div className="p-3 rounded-lg border bg-red-500/10">
                <p className="text-red-600">Erros</p>
                <p className="text-lg font-bold text-red-600">{previewConversao?.linhas_erro || 0}</p>
              </div>
            </div>

            {previewConversao?.mensagem_erro && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="text-sm font-medium text-red-600 mb-1">Mensagens de Erro:</p>
                <p className="text-sm text-red-500">{previewConversao.mensagem_erro}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => previewConversao && handleDownloadConversao(previewConversao, 'original')}
              >
                <Download className="w-4 h-4 mr-1" />
                Original
              </Button>
              <Button 
                className="flex-1 bg-violet-500 hover:bg-violet-600"
                onClick={() => previewConversao && handleDownloadConversao(previewConversao, 'convertido')}
                disabled={!previewConversao?.arquivo_convertido_url}
              >
                <Download className="w-4 h-4 mr-1" />
                Convertido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
