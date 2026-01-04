import { useState, useEffect } from "react";
import { 
  Crown, FileText, Upload, Download, 
  CheckCircle, AlertTriangle, Eye, Trash2,
  FileSpreadsheet, Loader2, History, RefreshCw
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

interface ArquivoProcessadoLocal {
  id: string;
  nome: string;
  status: "processando" | "sucesso" | "erro";
  resultado?: TransformResult;
  dataProcessamento: string;
  conversaoId?: string; // ID no banco
}

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

  const [arquivosLocais, setArquivosLocais] = useState<ArquivoProcessadoLocal[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoExportacao, setTipoExportacao] = useState<string>("csv");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewArquivo, setPreviewArquivo] = useState<ArquivoProcessadoLocal | null>(null);
  const [previewConversao, setPreviewConversao] = useState<ConversaoArquivo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"atual" | "historico">("atual");

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
    
    setArquivosLocais(prev => [...prev, {
      id: arquivoId,
      nome: file.name,
      status: "processando",
      dataProcessamento: new Date().toISOString()
    }]);
    
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

      setArquivosLocais(prev => prev.map(a => 
        a.id === arquivoId 
          ? { ...a, status: "sucesso" as const, resultado, conversaoId: conversao.id }
          : a
      ));

      const errosCount = resultado.erros.length;
      const warningsCount = resultado.warnings.length;
      
      if (errosCount > 0) {
        toast({ 
          title: "Processamento com erros", 
          description: `${resultado.totalLancamentos} lançamentos. ${errosCount} erros encontrados.`,
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Processamento concluído!", 
          description: `${resultado.totalLancamentos} lançamentos processados. ${resultado.outputRows.length} linhas geradas.${warningsCount > 0 ? ` ${warningsCount} avisos.` : ''} Salvo no histórico.`
        });
      }
    } catch (error) {
      setArquivosLocais(prev => prev.map(a => 
        a.id === arquivoId 
          ? { 
              ...a, 
              status: "erro" as const,
              resultado: {
                outputRows: [],
                outputLines: [],
                totalLancamentos: 0,
                totalLinhas: 0,
                header0100: null,
                erros: [error instanceof Error ? error.message : "Erro desconhecido ao processar arquivo"],
                warnings: []
              }
            }
          : a
      ));
      
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

  const handleExportar = (arquivo: ArquivoProcessadoLocal) => {
    if (!arquivo.resultado) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (tipoExportacao === "csv") {
      content = gerarCSV(arquivo.resultado.outputRows);
      filename = arquivo.nome.replace(/\.[^.]+$/, '_transformado.csv');
      mimeType = 'text/csv;charset=utf-8';
    } else {
      content = gerarTXT(arquivo.resultado.outputRows);
      filename = arquivo.nome.replace(/\.[^.]+$/, '_transformado.txt');
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

  const handleRemover = (id: string) => {
    setArquivosLocais(prev => prev.filter(a => a.id !== id));
  };

  const handleRemoverConversao = async (conversao: ConversaoArquivo) => {
    await deletarConversao.mutateAsync(conversao);
  };

  const totalProcessados = arquivosLocais.filter(a => a.status === "sucesso").length;
  const totalLancamentos = arquivosLocais.reduce((acc, a) => 
    acc + (a.resultado?.totalLancamentos || 0), 0
  );
  const totalLinhasGeradas = arquivosLocais.reduce((acc, a) => 
    acc + (a.resultado?.outputRows.length || 0), 0
  );

  // Stats do histórico
  const totalHistorico = conversoes.length;
  const totalHistoricoSucesso = conversoes.filter(c => c.status === "sucesso").length;

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
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span className="text-sm">Sessão Atual</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalProcessados}</p>
            </div>
            <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Lançamentos</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">{totalLancamentos.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg border bg-violet-500/10 border-violet-500/30">
              <div className="flex items-center gap-2 text-violet-600">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-sm">Linhas Geradas</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-violet-600">{totalLinhasGeradas.toLocaleString()}</p>
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
          </div>

          {/* Upload Area with Drag & Drop */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
              isDragging 
                ? "border-violet-500 bg-violet-500/10 scale-[1.02]" 
                : "border-muted-foreground/30 hover:border-violet-500/50 hover:bg-muted/30"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isProcessing && document.getElementById('lider-file')?.click()}
          >
            <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${
              isDragging ? "text-violet-500" : "text-muted-foreground"
            }`} />
            <p className={`text-sm mb-1 transition-colors ${
              isDragging ? "text-violet-500 font-medium" : "text-muted-foreground"
            }`}>
              {isDragging 
                ? "Solte o arquivo aqui..." 
                : "Arraste e solte um arquivo TXT ou clique para selecionar"
              }
            </p>
            <p className="text-xs text-muted-foreground mb-3">
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
              <Select value={tipoExportacao} onValueChange={setTipoExportacao}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                </SelectContent>
              </Select>
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
              <p className="text-sm text-violet-500 mt-3 font-medium">
                ✓ Arquivo selecionado: {selectedFile.name}
              </p>
            )}
            {!empresaAtiva && (
              <p className="text-sm text-yellow-500 mt-2">
                ⚠ Selecione uma empresa para processar arquivos
              </p>
            )}
          </div>

          {/* Tabs: Sessão Atual vs Histórico */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "atual" | "historico")}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="atual">
                  <FileText className="w-4 h-4 mr-1" />
                  Sessão Atual ({arquivosLocais.length})
                </TabsTrigger>
                <TabsTrigger value="historico">
                  <History className="w-4 h-4 mr-1" />
                  Histórico ({totalHistorico})
                </TabsTrigger>
              </TabsList>
              {viewMode === "historico" && (
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Atualizar
                </Button>
              )}
            </div>

            <TabsContent value="atual">
              {arquivosLocais.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Arquivo</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-center p-3 font-medium">Lançamentos</th>
                        <th className="text-center p-3 font-medium">Linhas Geradas</th>
                        <th className="text-center p-3 font-medium">Erros/Avisos</th>
                        <th className="text-left p-3 font-medium">Processado em</th>
                        <th className="text-center p-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {arquivosLocais.map(arquivo => (
                        <tr key={arquivo.id} className="hover:bg-muted/30">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-violet-500" />
                              <span className="font-medium">{arquivo.nome}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              arquivo.status === "sucesso" ? "bg-green-500/20 text-green-600" :
                              arquivo.status === "erro" ? "bg-red-500/20 text-red-600" :
                              "bg-yellow-500/20 text-yellow-600"
                            }`}>
                              {arquivo.status === "processando" && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
                              {arquivo.status}
                            </span>
                          </td>
                          <td className="p-3 text-center font-medium">
                            {arquivo.resultado?.totalLancamentos?.toLocaleString() || '-'}
                          </td>
                          <td className="p-3 text-center font-medium text-violet-600">
                            {arquivo.resultado?.outputRows.length?.toLocaleString() || '-'}
                          </td>
                          <td className="p-3 text-center">
                            {arquivo.resultado && (
                              <div className="flex items-center justify-center gap-2">
                                {arquivo.resultado.erros.length > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-600 text-xs">
                                    {arquivo.resultado.erros.length} erros
                                  </span>
                                )}
                                {arquivo.resultado.warnings.length > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-600 text-xs">
                                    {arquivo.resultado.warnings.length} avisos
                                  </span>
                                )}
                                {arquivo.resultado.erros.length === 0 && arquivo.resultado.warnings.length === 0 && (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(arquivo.dataProcessamento).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => setPreviewArquivo(arquivo)}
                                disabled={arquivo.status === "processando"}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleExportar(arquivo)}
                                disabled={arquivo.status !== "sucesso"}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500"
                                onClick={() => handleRemover(arquivo.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum arquivo processado nesta sessão.</p>
                  <p className="text-sm">Selecione um arquivo TXT para começar.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico">
              {isLoadingConversoes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : conversoes.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Arquivo Original</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-center p-3 font-medium">Linhas</th>
                        <th className="text-center p-3 font-medium">Processadas</th>
                        <th className="text-center p-3 font-medium">Erros</th>
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
                            {conversao.total_linhas?.toLocaleString() || '-'}
                          </td>
                          <td className="p-3 text-center font-medium text-violet-600">
                            {conversao.linhas_processadas?.toLocaleString() || '-'}
                          </td>
                          <td className="p-3 text-center">
                            {conversao.linhas_erro > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-600 text-xs">
                                {conversao.linhas_erro}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
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
                                title="Remover do histórico"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma conversão no histórico.</p>
                  <p className="text-sm">Os arquivos processados serão salvos aqui automaticamente.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Dialog - Arquivos Locais */}
      <Dialog open={!!previewArquivo} onOpenChange={() => setPreviewArquivo(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-500" />
              {previewArquivo?.nome}
            </DialogTitle>
            <DialogDescription>
              {previewArquivo?.resultado?.totalLancamentos} lançamentos → {previewArquivo?.resultado?.outputRows.length} linhas
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="dados" className="w-full">
            <TabsList>
              <TabsTrigger value="dados">Dados Transformados</TabsTrigger>
              <TabsTrigger value="avisos">
                Avisos ({previewArquivo?.resultado?.warnings.length || 0})
              </TabsTrigger>
              <TabsTrigger value="erros">
                Erros ({previewArquivo?.resultado?.erros.length || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dados">
              <ScrollArea className="h-[400px] border rounded-lg">
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
                    {previewArquivo?.resultado?.outputRows.map((row, idx) => (
                      <tr key={idx} className={row.loteFlag ? "bg-violet-500/5" : ""}>
                        <td className="p-2">{row.data}</td>
                        <td className="p-2 font-mono">{row.contaDebito || '-'}</td>
                        <td className="p-2 font-mono">{row.contaCredito || '-'}</td>
                        <td className="p-2 text-right font-mono">{row.valor}</td>
                        <td className="p-2 truncate max-w-[200px]" title={row.historico}>
                          {row.historico}
                        </td>
                        <td className="p-2 text-center">
                          {row.loteFlag && <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-600 rounded text-xs">S</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="avisos">
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                {previewArquivo?.resultado?.warnings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum aviso</p>
                ) : (
                  <ul className="space-y-2">
                    {previewArquivo?.resultado?.warnings.map((w, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="erros">
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                {previewArquivo?.resultado?.erros.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum erro</p>
                ) : (
                  <ul className="space-y-2">
                    {previewArquivo?.resultado?.erros.map((e, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPreviewArquivo(null)}>
              Fechar
            </Button>
            <Button 
              className="bg-violet-500 hover:bg-violet-600"
              onClick={() => previewArquivo && handleExportar(previewArquivo)}
            >
              <Download className="w-4 h-4 mr-1" /> Exportar {tipoExportacao.toUpperCase()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                <p className="text-sm font-medium text-red-600 mb-1">Mensagem de Erro:</p>
                <p className="text-sm text-red-600">{previewConversao.mensagem_erro}</p>
              </div>
            )}

            {previewConversao?.metadados && Object.keys(previewConversao.metadados).length > 0 && (
              <div className="p-3 rounded-lg border">
                <p className="text-sm font-medium mb-2">Metadados:</p>
                <pre className="text-xs text-muted-foreground bg-muted/30 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(previewConversao.metadados, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPreviewConversao(null)}>
              Fechar
            </Button>
            <Button 
              variant="outline"
              onClick={() => previewConversao && handleDownloadConversao(previewConversao, 'original')}
              disabled={!previewConversao?.arquivo_original_url}
            >
              <Download className="w-4 h-4 mr-1" /> Original
            </Button>
            <Button 
              className="bg-violet-500 hover:bg-violet-600"
              onClick={() => previewConversao && handleDownloadConversao(previewConversao, 'convertido')}
              disabled={!previewConversao?.arquivo_convertido_url}
            >
              <Download className="w-4 h-4 mr-1" /> Convertido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
