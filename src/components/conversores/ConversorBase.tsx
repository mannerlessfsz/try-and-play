import { useState, useCallback, ReactNode } from "react";
import { 
  Upload, Download, FileText, AlertCircle, CheckCircle2, Loader2, 
  History, RefreshCw, Trash2, Eye, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConversoes, type ConversaoArquivo } from "@/hooks/useConversoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ConvertedFile {
  name: string;
  type: string;
  content: string;
  size: number;
}

interface ConversorBaseProps {
  modulo: string;
  titulo: string;
  descricao: string;
  icon: ReactNode;
  iconColor: string;
  bgColor: string;
  acceptedFiles: string;
  acceptedFormats: string;
  children: ReactNode;
  files: File[];
  setFiles: (files: File[]) => void;
  convertedFiles: ConvertedFile[];
  isConverting: boolean;
  onConvert: () => Promise<void>;
  onDownload: (file: ConvertedFile) => void;
  onDownloadAll?: () => void;
  error: string | null;
  hideOutputCard?: boolean;
}

export function ConversorBase({
  modulo,
  titulo,
  descricao,
  icon,
  iconColor,
  bgColor,
  acceptedFiles,
  acceptedFormats,
  children,
  files,
  setFiles,
  convertedFiles,
  isConverting,
  onConvert,
  onDownload,
  onDownloadAll,
  error,
  hideOutputCard = false,
}: ConversorBaseProps) {
  const { empresaAtiva } = useEmpresaAtiva();
  const { 
    conversoes, 
    isLoading: isLoadingConversoes, 
    deletarConversao,
    getDownloadUrl,
    refetch 
  } = useConversoes(modulo);

  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"converter" | "historico">("converter");
  const [previewConversao, setPreviewConversao] = useState<ConversaoArquivo | null>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles([...files, ...droppedFiles]);
  }, [files, setFiles]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles([...files, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadConversao = async (conversao: ConversaoArquivo, tipo: 'original' | 'convertido') => {
    const path = tipo === 'original' 
      ? conversao.arquivo_original_url 
      : conversao.arquivo_convertido_url;
    
    if (!path) return;

    const url = await getDownloadUrl(path);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const totalHistorico = conversoes.length;
  const totalSucesso = conversoes.filter(c => c.status === "sucesso").length;

  return (
    <div className="space-y-4">
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "converter" | "historico")}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="converter" className="gap-2">
              <Upload className="w-4 h-4" />
              Converter
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="w-4 h-4" />
              Histórico
              {totalHistorico > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {totalHistorico}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          {viewMode === "historico" && (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Atualizar
            </Button>
          )}
        </div>

        <TabsContent value="converter" className="mt-0">
          <div className={`grid grid-cols-1 ${hideOutputCard ? '' : 'lg:grid-cols-2'} gap-4`}>
            {/* Input Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {icon}
                  {titulo}
                </CardTitle>
                <CardDescription className="text-sm">
                  {descricao}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
                    isDragging 
                      ? `${bgColor} border-current scale-[1.01]` 
                      : "hover:border-primary/50 hover:bg-muted/30"
                  }`}
                  onClick={() => document.getElementById(`file-input-${modulo}`)?.click()}
                >
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? iconColor : 'text-muted-foreground'}`} />
                  <p className="text-sm text-muted-foreground mb-1">
                    {isDragging ? "Solte os arquivos aqui..." : "Arraste arquivos ou clique para selecionar"}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {acceptedFormats}
                  </p>
                  <input
                    id={`file-input-${modulo}`}
                    type="file"
                    multiple
                    accept={acceptedFiles}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{files.length} arquivo(s) selecionado(s)</p>
                    <ScrollArea className="max-h-32">
                      <div className="space-y-1">
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{file.name}</span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {formatFileSize(file.size)}
                              </Badge>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0 ml-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Extra options from parent */}
                {children}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={onConvert} 
                  className="w-full" 
                  disabled={files.length === 0 || isConverting || !empresaAtiva}
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Convertendo...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Converter {files.length > 0 && `(${files.length})`}
                    </>
                  )}
                </Button>
                
                {!empresaAtiva && (
                  <p className="text-xs text-center text-yellow-600">
                    Selecione uma empresa para salvar no histórico
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Output Section */}
            {!hideOutputCard && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Download className="w-5 h-5" />
                    Arquivos Convertidos
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Baixe os arquivos convertidos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {convertedFiles.length === 0 ? (
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Os arquivos convertidos aparecerão aqui
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ScrollArea className="max-h-[240px]">
                        <div className="space-y-2">
                          {convertedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                <span className="text-sm truncate">{file.name}</span>
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {formatFileSize(file.size)}
                                </Badge>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => onDownload(file)}
                                className="shrink-0 ml-2"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      {convertedFiles.length > 1 && onDownloadAll && (
                        <Button onClick={onDownloadAll} variant="outline" className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Baixar Todos
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="w-5 h-5" />
                    Histórico de Conversões
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {totalSucesso} de {totalHistorico} conversões realizadas com sucesso
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingConversoes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversoes.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma conversão realizada ainda
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {conversoes.map((conversao) => (
                      <div 
                        key={conversao.id} 
                        className={`p-3 rounded-lg border ${
                          conversao.status === "sucesso" 
                            ? "bg-green-500/5 border-green-500/20" 
                            : conversao.status === "erro"
                            ? "bg-red-500/5 border-red-500/20"
                            : "bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {conversao.status === "sucesso" ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            ) : conversao.status === "erro" ? (
                              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            ) : (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {conversao.nome_arquivo_original}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {format(new Date(conversao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                {conversao.linhas_processadas > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{conversao.linhas_processadas} linhas</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {conversao.status === "erro" && conversao.mensagem_erro && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setPreviewConversao(conversao)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            {conversao.arquivo_convertido_url && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDownloadConversao(conversao, 'convertido')}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={() => deletarConversao.mutate(conversao)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewConversao} onOpenChange={() => setPreviewConversao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Conversão</DialogTitle>
            <DialogDescription>
              {previewConversao?.nome_arquivo_original}
            </DialogDescription>
          </DialogHeader>
          {previewConversao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={previewConversao.status === "sucesso" ? "default" : "destructive"} className="ml-2">
                    {previewConversao.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Total linhas:</span>
                  <span className="ml-2 font-medium">{previewConversao.total_linhas}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Linhas processadas:</span>
                  <span className="ml-2 font-medium">{previewConversao.linhas_processadas}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Erros:</span>
                  <span className="ml-2 font-medium text-red-500">{previewConversao.linhas_erro}</span>
                </div>
              </div>
              {previewConversao.mensagem_erro && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="whitespace-pre-wrap text-xs">
                    {previewConversao.mensagem_erro}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
