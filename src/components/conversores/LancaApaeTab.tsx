import { useState } from "react";
import { FileUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ConversorBase, type ConvertedFile } from "./ConversorBase";
import { useConversoes } from "@/hooks/useConversoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";

const formatosSaida = [
  { value: "txt", label: "TXT" },
  { value: "csv", label: "CSV" },
  { value: "xml", label: "XML" },
];

interface ApaeRecord {
  linha: number;
  codigo: string;
  descricao: string;
  valor: string;
  data: string;
  tipo: string;
}

export function LancaApaeTab() {
  const { empresaAtiva } = useEmpresaAtiva();
  const { criarConversao, atualizarConversao } = useConversoes("apae");

  const [files, setFiles] = useState<File[]>([]);
  const [tipoSaida, setTipoSaida] = useState<string>("txt");
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parseApaeContent = (content: string): ApaeRecord[] => {
    const lines = content.split('\n').filter(l => l.trim());
    const records: ApaeRecord[] = [];

    lines.forEach((line, index) => {
      // Formato APAE típico: posições fixas ou delimitado
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        // Tentativa de parsing posicional
        records.push({
          linha: index + 1,
          codigo: trimmed.substring(0, 10).trim(),
          descricao: trimmed.substring(10, 50).trim(),
          valor: trimmed.substring(50, 65).trim(),
          data: trimmed.substring(65, 75).trim(),
          tipo: trimmed.substring(75, 80).trim() || 'N/D',
        });
      }
    });

    return records;
  };

  const convertToCSV = (records: ApaeRecord[]): string => {
    const headers = ["LINHA", "CODIGO", "DESCRICAO", "VALOR", "DATA", "TIPO"];
    const rows = records.map(r => [
      r.linha, r.codigo, r.descricao, r.valor, r.data, r.tipo
    ].map(v => `"${v}"`).join(";"));
    return [headers.join(";"), ...rows].join("\n");
  };

  const convertToXML = (records: ApaeRecord[]): string => {
    const xmlRows = records.map(r => 
      `  <registro>
    <linha>${r.linha}</linha>
    <codigo>${r.codigo}</codigo>
    <descricao>${r.descricao}</descricao>
    <valor>${r.valor}</valor>
    <data>${r.data}</data>
    <tipo>${r.tipo}</tipo>
  </registro>`
    ).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<apae>\n${xmlRows}\n</apae>`;
  };

  const convertToTXT = (records: ApaeRecord[]): string => {
    return records.map(r => 
      `${r.codigo.padEnd(10)}${r.descricao.padEnd(40)}${r.valor.padStart(15)}${r.data.padEnd(10)}${r.tipo}`
    ).join("\n");
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setError("Selecione pelo menos um arquivo para processar.");
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
              modulo: "apae",
              nomeArquivoOriginal: file.name,
              conteudoOriginal: content,
            });
            conversaoId = conversao.id;
          } catch (err) {
            console.error("Erro ao criar conversão:", err);
          }
        }

        try {
          const records = parseApaeContent(content);
          
          if (records.length === 0) {
            toast.warning(`Arquivo ${file.name} não contém registros válidos.`);
            if (conversaoId && empresaAtiva?.id) {
              await atualizarConversao.mutateAsync({
                id: conversaoId,
                status: "erro",
                mensagemErro: "Arquivo não contém registros válidos",
              });
            }
            continue;
          }

          let convertedContent: string;

          switch (tipoSaida) {
            case "csv":
              convertedContent = convertToCSV(records);
              break;
            case "xml":
              convertedContent = convertToXML(records);
              break;
            case "txt":
            default:
              convertedContent = convertToTXT(records);
          }

          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const convertedFile = {
            name: `${baseName}_processado.${tipoSaida}`,
            type: tipoSaida,
            content: convertedContent,
            size: new Blob([convertedContent]).size,
          };
          results.push(convertedFile);

          if (conversaoId && empresaAtiva?.id) {
            await atualizarConversao.mutateAsync({
              id: conversaoId,
              status: "sucesso",
              totalLinhas: records.length,
              linhasProcessadas: records.length,
              linhasErro: 0,
              conteudoConvertido: convertedContent,
              nomeArquivoConvertido: convertedFile.name,
              metadados: { tipoSaida, totalRegistros: records.length },
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
        toast.success(`${results.length} arquivo(s) processado(s) com sucesso!`);
        setFiles([]);
      }
    } catch (err) {
      setError("Erro ao processar arquivos APAE.");
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
      modulo="apae"
      titulo="Lança APAE"
      descricao="Processe arquivos APAE para lançamento contábil"
      icon={<FileUp className="w-5 h-5 text-indigo-500" />}
      iconColor="text-indigo-500"
      bgColor="bg-indigo-500/10"
      acceptedFiles=".txt,.csv"
      acceptedFormats="Arquivos TXT e CSV no formato APAE"
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
        <Select value={tipoSaida} onValueChange={setTipoSaida}>
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
