import { useState, useCallback } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { parseOFX, readFileAsText, OFXTransaction } from "@/utils/ofxParser";

interface ConvertedFile {
  name: string;
  type: string;
  content: string;
  size: number;
}

const formatosSaida = [
  { value: "csv", label: "CSV (Planilha)" },
  { value: "json", label: "JSON" },
  { value: "txt", label: "TXT (Texto)" },
];

export const ConversorExtrato = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [formatoSaida, setFormatoSaida] = useState<string>("csv");
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

  const transactionsToRecords = (transactions: OFXTransaction[], bankInfo: { banco: string; agencia: string; conta: string }): Record<string, string>[] => {
    return transactions.map(t => ({
      banco: bankInfo.banco,
      agencia: bankInfo.agencia,
      conta: bankInfo.conta,
      data: t.date,
      tipo: t.type,
      valor: t.amount.toFixed(2),
      descricao: t.description,
      id: t.id,
    }));
  };

  const convertToCSV = (data: Record<string, string>[]): string => {
    if (data.length === 0) return "";
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(";"),
      ...data.map(row => headers.map(h => `"${(row[h] || "").replace(/"/g, '""')}"`).join(";"))
    ];
    
    return csvRows.join("\n");
  };

  const convertToJSON = (data: Record<string, string>[]): string => {
    return JSON.stringify(data, null, 2);
  };

  const convertToTXT = (data: Record<string, string>[]): string => {
    if (data.length === 0) return "";
    
    const headers = Object.keys(data[0]);
    const lines = data.map(row => 
      headers.map(h => `${h}: ${row[h] || ""}`).join(" | ")
    );
    
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
        const content = await readFileAsText(file);
        
        // Try OFX parsing
        if (file.name.toLowerCase().endsWith('.ofx')) {
          const parsed = parseOFX(content);
          
          if (parsed.transactions.length === 0) {
            toast.warning(`Arquivo ${file.name} não contém transações.`);
            continue;
          }

          const data = transactionsToRecords(parsed.transactions, {
            banco: parsed.bankId,
            agencia: parsed.branchId,
            conta: parsed.accountId,
          });

          let convertedContent: string;
          let extension: string;

          switch (formatoSaida) {
            case "csv":
              convertedContent = convertToCSV(data);
              extension = "csv";
              break;
            case "json":
              convertedContent = convertToJSON(data);
              extension = "json";
              break;
            case "txt":
              convertedContent = convertToTXT(data);
              extension = "txt";
              break;
            default:
              convertedContent = convertToCSV(data);
              extension = "csv";
          }

          const baseName = file.name.replace(/\.[^/.]+$/, "");
          results.push({
            name: `${baseName}.${extension}`,
            type: formatoSaida,
            content: convertedContent,
            size: new Blob([convertedContent]).size,
          });
        } else {
          toast.warning(`Formato de ${file.name} não suportado. Use arquivos OFX.`);
        }
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
            Extratos de Entrada
          </CardTitle>
          <CardDescription>
            Arraste seus arquivos OFX de extrato bancário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => document.getElementById("file-input-extrato")?.click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground/70">
              Suporta arquivos OFX (Open Financial Exchange)
            </p>
            <input
              id="file-input-extrato"
              type="file"
              multiple
              accept=".ofx"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{files.length} arquivo(s) selecionado(s)</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="w-4 h-4 text-muted-foreground shrink-0" />
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

          {/* Format Selection */}
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
                Converter Extratos
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
            Baixe os extratos convertidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {convertedFiles.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
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
