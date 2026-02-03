import { useState } from "react";
import { Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ConversorBase, type ConvertedFile } from "./ConversorBase";
import { useConversoes } from "@/hooks/useConversoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { EmpresaExterna } from "@/hooks/useEmpresasExternas";

const formatosEntrada = [
  { value: "xml-nfe", label: "XML NF-e" },
  { value: "xml-cte", label: "XML CT-e" },
  { value: "sped-fiscal", label: "SPED Fiscal" },
  { value: "sped-contribuicoes", label: "SPED Contribuições" },
];

const formatosSaida = [
  { value: "csv", label: "CSV (Planilha)" },
  { value: "json", label: "JSON" },
  { value: "txt", label: "TXT (Texto)" },
];

export const ConversorFiscal = () => {
  const { empresaAtiva } = useEmpresaAtiva();
  const { criarConversao, atualizarConversao } = useConversoes("fiscal");

  const [files, setFiles] = useState<File[]>([]);
  const [formatoEntrada, setFormatoEntrada] = useState<string>("");
  const [formatoSaida, setFormatoSaida] = useState<string>("csv");
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

  const parseXMLToData = (xmlContent: string): Record<string, string>[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, "text/xml");
    
    const nfeProc = doc.querySelector("nfeProc") || doc.querySelector("NFe");
    if (nfeProc) {
      const ide = doc.querySelector("ide");
      const emit = doc.querySelector("emit");
      const dest = doc.querySelector("dest");
      
      const items: Record<string, string>[] = [];
      const dets = doc.querySelectorAll("det");
      
      dets.forEach((det, index) => {
        const prod = det.querySelector("prod");
        items.push({
          numero_nfe: ide?.querySelector("nNF")?.textContent || "",
          serie: ide?.querySelector("serie")?.textContent || "",
          data_emissao: ide?.querySelector("dhEmi")?.textContent?.split("T")[0] || "",
          cnpj_emitente: emit?.querySelector("CNPJ")?.textContent || "",
          nome_emitente: emit?.querySelector("xNome")?.textContent || "",
          cnpj_destinatario: dest?.querySelector("CNPJ")?.textContent || dest?.querySelector("CPF")?.textContent || "",
          nome_destinatario: dest?.querySelector("xNome")?.textContent || "",
          item_numero: String(index + 1),
          codigo_produto: prod?.querySelector("cProd")?.textContent || "",
          descricao_produto: prod?.querySelector("xProd")?.textContent || "",
          ncm: prod?.querySelector("NCM")?.textContent || "",
          cfop: prod?.querySelector("CFOP")?.textContent || "",
          unidade: prod?.querySelector("uCom")?.textContent || "",
          quantidade: prod?.querySelector("qCom")?.textContent || "",
          valor_unitario: prod?.querySelector("vUnCom")?.textContent || "",
          valor_total: prod?.querySelector("vProd")?.textContent || "",
        });
      });
      
      return items;
    }
    
    return [];
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
        let conversaoId: string | null = null;
        const content = await file.text();

        if (empresaAtiva?.id) {
          try {
            const conversao = await criarConversao.mutateAsync({
              modulo: "fiscal",
              nomeArquivoOriginal: file.name,
              conteudoOriginal: content,
            });
            conversaoId = conversao.id;
          } catch (err) {
            console.error("Erro ao criar conversão:", err);
          }
        }

        try {
          const data = parseXMLToData(content);
          
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
          const convertedFile = {
            name: `${baseName}.${extension}`,
            type: formatoSaida,
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
              metadados: { formatoEntrada, formatoSaida },
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
      modulo="fiscal"
      titulo="Arquivos Fiscais"
      descricao="Converta XML de NF-e, CT-e ou SPED"
      icon={<Receipt className="w-5 h-5 text-orange-500" />}
      iconColor="text-orange-500"
      bgColor="bg-orange-500/10"
      acceptedFiles=".xml,.txt"
      acceptedFormats="XML (NF-e, CT-e) e arquivos SPED"
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Formato de entrada</label>
          <Select value={formatoEntrada} onValueChange={setFormatoEntrada}>
            <SelectTrigger>
              <SelectValue placeholder="Auto-detectar" />
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
    </ConversorBase>
  );
};
