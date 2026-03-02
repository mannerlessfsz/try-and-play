import { useState, useCallback } from "react";
import { Receipt, Upload, FileText, Loader2, Trash2, Building2, Wrench, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { detectAndParseXml, NotaFiscal, NotaServico, NotaComercio } from "@/utils/notaFiscalParser";
import { NotaServicoCard } from "./fiscal/NotaServicoCard";
import { NotaComercioCard } from "./fiscal/NotaComercioCard";

type Segmento = "servico" | "comercio";

export const ConversorFiscal = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segmento, setSegmento] = useState<Segmento>("servico");

  const [notasServico, setNotasServico] = useState<NotaServico[]>([]);
  const [notasComercio, setNotasComercio] = useState<NotaComercio[]>([]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
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

  const processFiles = async () => {
    if (files.length === 0) {
      setError("Selecione pelo menos um arquivo XML.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    const servicos: NotaServico[] = [];
    const comercios: NotaComercio[] = [];
    let errCount = 0;

    for (const file of files) {
      try {
        const content = await file.text();
        const nota = detectAndParseXml(content);

        if (!nota) {
          errCount++;
          console.warn(`Não foi possível parsear: ${file.name}`);
          continue;
        }

        if (nota.tipo === "servico") {
          servicos.push(nota);
        } else {
          comercios.push(nota);
        }
      } catch (err) {
        errCount++;
        console.error(`Erro ao processar ${file.name}:`, err);
      }
    }

    setNotasServico(prev => [...prev, ...servicos]);
    setNotasComercio(prev => [...prev, ...comercios]);

    const total = servicos.length + comercios.length;
    if (total > 0) {
      toast.success(`${total} nota(s) processada(s) com sucesso!`);
      if (servicos.length > 0 && comercios.length === 0) setSegmento("servico");
      if (comercios.length > 0 && servicos.length === 0) setSegmento("comercio");
      setFiles([]);
    }
    if (errCount > 0) {
      toast.warning(`${errCount} arquivo(s) não puderam ser processados.`);
    }
    if (total === 0 && errCount > 0) {
      setError("Nenhum arquivo pôde ser processado. Verifique se são XMLs válidos de NF-e ou NFS-e.");
    }

    setIsProcessing(false);
  };

  const clearAll = () => {
    setNotasServico([]);
    setNotasComercio([]);
    setFiles([]);
    setError(null);
  };

  const totalNotas = notasServico.length + notasComercio.length;
  const activeNotas = segmento === "servico" ? notasServico : notasComercio;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--orange))] to-[hsl(var(--yellow))] flex items-center justify-center shadow-[0_0_25px_hsl(var(--orange)/0.4)]">
          <Receipt className="w-5 h-5 text-background" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Arquivos Fiscais</h2>
          <p className="text-xs text-muted-foreground">Leia notas fiscais de serviço e comércio — XML</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="glass rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: "hsl(var(--orange) / 0.08)" }} />
        
        <div className="relative z-10 space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
              isDragging 
                ? "bg-[hsl(var(--orange)/0.1)] border-[hsl(var(--orange)/0.5)] scale-[1.01]" 
                : "border-foreground/10 hover:border-[hsl(var(--orange)/0.3)] hover:bg-foreground/[0.02]"
            }`}
            onClick={() => document.getElementById("file-input-fiscal-new")?.click()}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? "text-[hsl(var(--orange))]" : "text-muted-foreground"}`} />
            <p className="text-sm text-muted-foreground mb-1">
              {isDragging ? "Solte os arquivos aqui..." : "Arraste arquivos XML ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground/60">NF-e (Comércio) e NFS-e (Serviço)</p>
            <input
              id="file-input-fiscal-new"
              type="file"
              multiple
              accept=".xml"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{files.length} arquivo(s) selecionado(s)</p>
              <ScrollArea className="max-h-28">
                <div className="space-y-1">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-foreground/[0.03] border border-foreground/5 text-sm">
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate">{file.name}</span>
                        <Badge variant="outline" className="text-[9px] shrink-0">{formatFileSize(file.size)}</Badge>
                      </div>
                      <button onClick={() => removeFile(index)} className="p-1 rounded hover:bg-destructive/10 text-destructive shrink-0 ml-2">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={processFiles}
            disabled={files.length === 0 || isProcessing}
            className="w-full bg-gradient-to-r from-[hsl(var(--orange))] to-[hsl(var(--yellow))] text-background hover:opacity-90"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
            ) : (
              <><Wrench className="w-4 h-4 mr-2" /> Processar {files.length > 0 && `(${files.length})`}</>
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {totalNotas > 0 && (
        <div className="space-y-4">
          {/* Segment Switcher */}
          <div className="flex items-center justify-between">
            <div className="glass rounded-xl p-1 flex items-center gap-1">
              <button
                onClick={() => setSegmento("servico")}
                className={`relative px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300`}
              >
                {segmento === "servico" && (
                  <motion.div
                    layoutId="fiscal-segment"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--cyan) / 0.8))",
                      boxShadow: "0 0 20px hsl(var(--cyan) / 0.4)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 ${segmento === "servico" ? "text-background" : "text-muted-foreground"}`}>
                  <Building2 className="w-3.5 h-3.5" />
                  Serviço
                  {notasServico.length > 0 && (
                    <Badge variant={segmento === "servico" ? "secondary" : "outline"} className="text-[9px] px-1 py-0 h-4">
                      {notasServico.length}
                    </Badge>
                  )}
                </span>
              </button>

              <button
                onClick={() => setSegmento("comercio")}
                className={`relative px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300`}
              >
                {segmento === "comercio" && (
                  <motion.div
                    layoutId="fiscal-segment"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--orange)), hsl(var(--orange) / 0.8))",
                      boxShadow: "0 0 20px hsl(var(--orange) / 0.4)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 ${segmento === "comercio" ? "text-background" : "text-muted-foreground"}`}>
                  <Receipt className="w-3.5 h-3.5" />
                  Comércio
                  {notasComercio.length > 0 && (
                    <Badge variant={segmento === "comercio" ? "secondary" : "outline"} className="text-[9px] px-1 py-0 h-4">
                      {notasComercio.length}
                    </Badge>
                  )}
                </span>
              </button>
            </div>

            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground h-7 gap-1.5">
              <Trash2 className="w-3 h-3" /> Limpar tudo
            </Button>
          </div>

          {/* Cards Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={segmento}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeNotas.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma nota de {segmento === "servico" ? "serviço" : "comércio"} processada
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Importe XMLs de {segmento === "servico" ? "NFS-e" : "NF-e"} para visualizar
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {segmento === "servico"
                    ? notasServico.map((nota, i) => <NotaServicoCard key={i} nota={nota} index={i} />)
                    : notasComercio.map((nota, i) => <NotaComercioCard key={i} nota={nota} index={i} />)
                  }
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
