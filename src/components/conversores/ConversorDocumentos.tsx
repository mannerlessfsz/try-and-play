import { useState } from "react";
import { FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ConversorBase, type ConvertedFile } from "./ConversorBase";
import { useConversoes } from "@/hooks/useConversoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { EmpresaExterna } from "@/hooks/useEmpresasExternas";

const formatosSaida = [
  { value: "txt", label: "TXT (Texto puro)" },
  { value: "md", label: "Markdown" },
  { value: "json", label: "JSON (estruturado)" },
];

export const ConversorDocumentos = () => {
  const { empresaAtiva } = useEmpresaAtiva();
  const { criarConversao, atualizarConversao } = useConversoes("documentos");

  const [files, setFiles] = useState<File[]>([]);
  const [formatoSaida, setFormatoSaida] = useState<string>("txt");
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Empresa externa
  const [empresaExternaId, setEmpresaExternaId] = useState<string | undefined>();
  const [empresaExterna, setEmpresaExterna] = useState<EmpresaExterna | undefined>();

  const handleEmpresaExternaChange = (id: string | undefined, empresa?: EmpresaExterna) => {
    setEmpresaExternaId(id);
    setEmpresaExterna(empresa);
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type.startsWith('text/') || 
        file.name.endsWith('.txt') || 
        file.name.endsWith('.csv') ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.xml') ||
        file.name.endsWith('.html') ||
        file.name.endsWith('.md')) {
      return await file.text();
    }
    return `[Arquivo: ${file.name}]\n[Tipo: ${file.type || 'desconhecido'}]\n[Tamanho: ${file.size} bytes]\n\nNota: Este arquivo requer processamento avançado (OCR/AI) para extração de texto.`;
  };

  const convertToMarkdown = (text: string, fileName: string): string => {
    return `# ${fileName}\n\n${text}`;
  };

  const convertToJSON = (text: string, fileName: string): string => {
    const lines = text.split('\n').filter(l => l.trim());
    return JSON.stringify({ fileName, totalLines: lines.length, content: text, lines }, null, 2);
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
        const text = await extractTextFromFile(file);

        if (empresaAtiva?.id) {
          try {
            const conversao = await criarConversao.mutateAsync({
              modulo: "documentos",
              nomeArquivoOriginal: file.name,
              conteudoOriginal: text,
            });
            conversaoId = conversao.id;
          } catch (err) {
            console.error("Erro ao criar conversão:", err);
          }
        }

        try {
          let convertedContent: string;
          let extension: string;

          switch (formatoSaida) {
            case "txt":
              convertedContent = text;
              extension = "txt";
              break;
            case "md":
              convertedContent = convertToMarkdown(text, file.name);
              extension = "md";
              break;
            case "json":
              convertedContent = convertToJSON(text, file.name);
              extension = "json";
              break;
            default:
              convertedContent = text;
              extension = "txt";
          }

          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const convertedFile = {
            name: `${baseName}.${extension}`,
            type: formatoSaida,
            content: convertedContent,
            size: new Blob([convertedContent]).size,
          };
          results.push(convertedFile);

          if (conversaoId && empresaAtiva?.id) {
            const lines = text.split('\n');
            await atualizarConversao.mutateAsync({
              id: conversaoId,
              status: "sucesso",
              totalLinhas: lines.length,
              linhasProcessadas: lines.filter(l => l.trim()).length,
              linhasErro: 0,
              conteudoConvertido: convertedContent,
              nomeArquivoConvertido: convertedFile.name,
              metadados: { formatoSaida },
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
      setError("Erro ao converter arquivos.");
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
      modulo="documentos"
      titulo="Documentos Gerais"
      descricao="Converta documentos de texto para outros formatos"
      icon={<FileText className="w-5 h-5 text-green-500" />}
      iconColor="text-green-500"
      bgColor="bg-green-500/10"
      acceptedFiles=".txt,.csv,.xml,.html,.md,.json"
      acceptedFormats="TXT, CSV, XML, HTML, MD e outros formatos de texto"
      files={files}
      setFiles={setFiles}
      convertedFiles={convertedFiles}
      isConverting={isConverting}
      onConvert={handleConvert}
      onDownload={downloadFile}
      onDownloadAll={downloadAll}
      error={error}
      showEmpresaExterna={true}
      empresaExternaId={empresaExternaId}
      onEmpresaExternaChange={handleEmpresaExternaChange}
    >
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
    </ConversorBase>
  );
};
