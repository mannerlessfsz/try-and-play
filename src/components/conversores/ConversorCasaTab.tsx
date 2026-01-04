import { useState } from "react";
import { Home } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ConversorBase, type ConvertedFile } from "./ConversorBase";
import { useConversoes } from "@/hooks/useConversoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";

const formatosSaida = [
  { value: "csv", label: "CSV" },
  { value: "txt", label: "TXT" },
  { value: "xml", label: "XML" },
  { value: "json", label: "JSON" },
];

export function ConversorCasaTab() {
  const { empresaAtiva } = useEmpresaAtiva();
  const { criarConversao, atualizarConversao } = useConversoes("casa");

  const [files, setFiles] = useState<File[]>([]);
  const [tipoDestino, setTipoDestino] = useState<string>("csv");
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parseContent = (content: string): Record<string, string>[] => {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];

    // Tentar detectar delimitador
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
    
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));
    const data: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header || `col_${idx}`] = values[idx] || '';
      });
      data.push(row);
    }

    return data;
  };

  const convertToCSV = (data: Record<string, string>[]): string => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const rows = [
      headers.join(";"),
      ...data.map(row => headers.map(h => `"${(row[h] || "").replace(/"/g, '""')}"`).join(";"))
    ];
    return rows.join("\n");
  };

  const convertToJSON = (data: Record<string, string>[]): string => {
    return JSON.stringify(data, null, 2);
  };

  const convertToXML = (data: Record<string, string>[]): string => {
    const xmlRows = data.map(row => {
      const fields = Object.entries(row)
        .map(([key, value]) => `    <${key}>${value}</${key}>`)
        .join('\n');
      return `  <registro>\n${fields}\n  </registro>`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<dados>\n${xmlRows}\n</dados>`;
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
        let conversaoId: string | null = null;
        const content = await file.text();

        if (empresaAtiva?.id) {
          try {
            const conversao = await criarConversao.mutateAsync({
              modulo: "casa",
              nomeArquivoOriginal: file.name,
              conteudoOriginal: content,
            });
            conversaoId = conversao.id;
          } catch (err) {
            console.error("Erro ao criar conversão:", err);
          }
        }

        try {
          const data = parseContent(content);
          
          if (data.length === 0) {
            toast.warning(`Arquivo ${file.name} não contém dados válidos.`);
            if (conversaoId && empresaAtiva?.id) {
              await atualizarConversao.mutateAsync({
                id: conversaoId,
                status: "erro",
                mensagemErro: "Arquivo não contém dados válidos",
              });
            }
            continue;
          }

          let convertedContent: string;

          switch (tipoDestino) {
            case "csv":
              convertedContent = convertToCSV(data);
              break;
            case "json":
              convertedContent = convertToJSON(data);
              break;
            case "xml":
              convertedContent = convertToXML(data);
              break;
            case "txt":
              convertedContent = convertToTXT(data);
              break;
            default:
              convertedContent = convertToCSV(data);
          }

          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const convertedFile = {
            name: `${baseName}.${tipoDestino}`,
            type: tipoDestino,
            content: convertedContent,
            size: new Blob([convertedContent]).size,
          };
          results.push(convertedFile);

          if (conversaoId && empresaAtiva?.id) {
            await atualizarConversao.mutateAsync({
              id: conversaoId,
              status: "sucesso",
              totalLinhas: data.length,
              linhasProcessadas: data.length,
              linhasErro: 0,
              conteudoConvertido: convertedContent,
              nomeArquivoConvertido: convertedFile.name,
              metadados: { tipoDestino },
            });
          }
        } catch (err) {
          if (conversaoId && empresaAtiva?.id) {
            await atualizarConversao.mutateAsync({
              id: conversaoId,
              status: "erro",
              mensagemErro: err instanceof Error ? err.message : "Erro desconhecido",
            });
          }
          throw err;
        }
      }

      setConvertedFiles(results);
      
      if (results.length > 0) {
        toast.success(`${results.length} arquivo(s) convertido(s) com sucesso!`);
        setFiles([]);
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

  return (
    <ConversorBase
      modulo="casa"
      titulo="Conversor CASA"
      descricao="Converta arquivos do sistema CASA para diferentes formatos"
      icon={<Home className="w-5 h-5 text-amber-500" />}
      iconColor="text-amber-500"
      bgColor="bg-amber-500/10"
      acceptedFiles=".txt,.csv,.xml,.dat"
      acceptedFormats="Arquivos TXT, CSV, XML e DAT do sistema CASA"
      files={files}
      setFiles={setFiles}
      convertedFiles={convertedFiles}
      isConverting={isConverting}
      onConvert={handleConvert}
      onDownload={downloadFile}
      onDownloadAll={downloadAll}
      error={error}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">Formato de saída</label>
        <Select value={tipoDestino} onValueChange={setTipoDestino}>
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
    </ConversorBase>
  );
}
