import { useState, useCallback } from "react";
import { Upload, Download, Calculator, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ConvertedFile {
  name: string;
  type: string;
  content: string;
  size: number;
}

interface ContabilEntry {
  conta: string;
  descricao: string;
  saldoAnterior?: string;
  debito?: string;
  credito?: string;
  saldoAtual?: string;
}

const formatosEntrada = [
  { value: "csv", label: "CSV (Planilha)" },
  { value: "txt", label: "TXT (Texto tabulado)" },
];

const formatosSaida = [
  { value: "csv", label: "CSV (Planilha)" },
  { value: "json", label: "JSON" },
  { value: "txt-sped", label: "TXT (Formato SPED)" },
];

const sistemasContabeis = [
  { value: "padrao", label: "Padrão (Genérico)" },
  { value: "dominio", label: "Domínio Sistemas" },
  { value: "questor", label: "Questor" },
  { value: "prosoft", label: "Prosoft" },
  { value: "contmatic", label: "Contmatic" },
];

export const ConversorContabil = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [formatoEntrada, setFormatoEntrada] = useState<string>("csv");
  const [formatoSaida, setFormatoSaida] = useState<string>("csv");
  const [sistemaOrigem, setSistemaOrigem] = useState<string>("padrao");
  const [sistemaDestino, setSistemaDestino] = useState<string>("padrao");
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
    setError(null);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const parseCSV = (content: string): ContabilEntry[] => {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    const entries: ContabilEntry[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
      
      const entry: ContabilEntry = {
        conta: '',
        descricao: '',
      };
      
      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        if (header.includes('conta') || header.includes('codigo')) {
          entry.conta = value;
        } else if (header.includes('descricao') || header.includes('nome')) {
          entry.descricao = value;
        } else if (header.includes('anterior')) {
          entry.saldoAnterior = value;
        } else if (header.includes('debito') || header.includes('débito')) {
          entry.debito = value;
        } else if (header.includes('credito') || header.includes('crédito')) {
          entry.credito = value;
        } else if (header.includes('atual') || header.includes('saldo')) {
          entry.saldoAtual = value;
        }
      });
      
      if (entry.conta || entry.descricao) {
        entries.push(entry);
      }
    }
    
    return entries;
  };

  const convertToCSV = (entries: ContabilEntry[]): string => {
    if (entries.length === 0) return "";
    
    const headers = ["CONTA", "DESCRICAO", "SALDO_ANTERIOR", "DEBITO", "CREDITO", "SALDO_ATUAL"];
    const rows = entries.map(e => [
      e.conta,
      e.descricao,
      e.saldoAnterior || "0,00",
      e.debito || "0,00",
      e.credito || "0,00",
      e.saldoAtual || "0,00",
    ].map(v => `"${v}"`).join(";"));
    
    return [headers.join(";"), ...rows].join("\n");
  };

  const convertToJSON = (entries: ContabilEntry[]): string => {
    return JSON.stringify({
      tipo: "balancete",
      totalContas: entries.length,
      contas: entries,
    }, null, 2);
  };

  const convertToSPED = (entries: ContabilEntry[]): string => {
    // Simplified SPED format (registro I155 - Balancete)
    const lines = entries.map(e => {
      const conta = (e.conta || "").padEnd(20);
      const saldoInicial = (e.saldoAnterior || "0").replace(/\./g, '').replace(',', '').padStart(17, '0');
      const debitos = (e.debito || "0").replace(/\./g, '').replace(',', '').padStart(17, '0');
      const creditos = (e.credito || "0").replace(/\./g, '').replace(',', '').padStart(17, '0');
      const saldoFinal = (e.saldoAtual || "0").replace(/\./g, '').replace(',', '').padStart(17, '0');
      
      return `|I155|${conta}|${saldoInicial}|D|${debitos}|${creditos}|${saldoFinal}|D|`;
    });
    
    return lines.join("\n");
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setError("Selecione pelo menos um arquivo para converter.");
      return;
    }

    setIsConverting(true);
    setError(null);
    setConvertedFiles([]);

    try {
      const results: ConvertedFile[] = [];

      for (const file of files) {
        const content = await file.text();
        const entries = parseCSV(content);
        
        if (entries.length === 0) {
          toast.warning(`Arquivo ${file.name} não contém dados válidos.`);
          continue;
        }

        let convertedContent: string;
        let extension: string;

        switch (formatoSaida) {
          case "csv":
            convertedContent = convertToCSV(entries);
            extension = "csv";
            break;
          case "json":
            convertedContent = convertToJSON(entries);
            extension = "json";
            break;
          case "txt-sped":
            convertedContent = convertToSPED(entries);
            extension = "txt";
            break;
          default:
            convertedContent = convertToCSV(entries);
            extension = "csv";
        }

        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const destSuffix = sistemaDestino !== "padrao" ? `_${sistemaDestino}` : "";
        results.push({
          name: `${baseName}${destSuffix}.${extension}`,
          type: formatoSaida,
          content: convertedContent,
          size: new Blob([convertedContent]).size,
        });
      }

      setConvertedFiles(results);
      
      if (results.length > 0) {
        toast.success(`${results.length} arquivo(s) convertido(s) com sucesso!`);
      }
    } catch (err) {
      setError("Erro ao converter arquivos. Verifique se os arquivos estão no formato correto.");
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadFile = (file: ConvertedFile) => {
    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    convertedFiles.forEach(file => downloadFile(file));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Dados Contábeis de Entrada
          </CardTitle>
          <CardDescription>
            Arraste seus balancetes, DREs ou planos de contas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => document.getElementById("file-input-contabil")?.click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground/70">
              Suporta CSV e TXT com dados contábeis
            </p>
            <input
              id="file-input-contabil"
              type="file"
              multiple
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{files.length} arquivo(s) selecionado(s)</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <Calculator className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {formatFileSize(file.size)}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-destructive hover:text-destructive"
                      onClick={() => removeFile(index)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sistema de origem</label>
              <Select value={sistemaOrigem} onValueChange={setSistemaOrigem}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sistemasContabeis.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sistema de destino</label>
              <Select value={sistemaDestino} onValueChange={setSistemaDestino}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sistemasContabeis.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Formato de entrada</label>
              <Select value={formatoEntrada} onValueChange={setFormatoEntrada}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatosEntrada.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Formato de saída</label>
              <Select value={formatoSaida} onValueChange={setFormatoSaida}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatosSaida.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleConvert} 
            className="w-full" 
            disabled={files.length === 0 || isConverting}
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Convertendo...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Converter Dados
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Output Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Arquivos Convertidos
          </CardTitle>
          <CardDescription>
            Baixe os dados contábeis convertidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {convertedFiles.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Calculator className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Os arquivos convertidos aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {convertedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {formatFileSize(file.size)}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadFile(file)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {convertedFiles.length > 1 && (
                <Button onClick={downloadAll} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Todos
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
