import { useState } from "react";
import { Calculator } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ConversorBase, type ConvertedFile } from "./ConversorBase";
import { useConversoes } from "@/hooks/useConversoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";

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
  const { empresaAtiva } = useEmpresaAtiva();
  const { criarConversao, atualizarConversao } = useConversoes("contabil");

  const [files, setFiles] = useState<File[]>([]);
  const [formatoEntrada, setFormatoEntrada] = useState<string>("csv");
  const [formatoSaida, setFormatoSaida] = useState<string>("csv");
  const [sistemaOrigem, setSistemaOrigem] = useState<string>("padrao");
  const [sistemaDestino, setSistemaDestino] = useState<string>("padrao");
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = (content: string): ContabilEntry[] => {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    const entries: ContabilEntry[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
      
      const entry: ContabilEntry = { conta: '', descricao: '' };
      
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
      e.conta, e.descricao,
      e.saldoAnterior || "0,00", e.debito || "0,00",
      e.credito || "0,00", e.saldoAtual || "0,00",
    ].map(v => `"${v}"`).join(";"));
    return [headers.join(";"), ...rows].join("\n");
  };

  const convertToJSON = (entries: ContabilEntry[]): string => {
    return JSON.stringify({ tipo: "balancete", totalContas: entries.length, contas: entries }, null, 2);
  };

  const convertToSPED = (entries: ContabilEntry[]): string => {
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
        let conversaoId: string | null = null;
        const content = await file.text();

        if (empresaAtiva?.id) {
          try {
            const conversao = await criarConversao.mutateAsync({
              modulo: "contabil",
              nomeArquivoOriginal: file.name,
              conteudoOriginal: content,
            });
            conversaoId = conversao.id;
          } catch (err) {
            console.error("Erro ao criar conversão:", err);
          }
        }

        try {
          const entries = parseCSV(content);
          
          if (entries.length === 0) {
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
          const convertedFile = {
            name: `${baseName}${destSuffix}.${extension}`,
            type: formatoSaida,
            content: convertedContent,
            size: new Blob([convertedContent]).size,
          };
          results.push(convertedFile);

          if (conversaoId && empresaAtiva?.id) {
            await atualizarConversao.mutateAsync({
              id: conversaoId,
              status: "sucesso",
              totalLinhas: entries.length,
              linhasProcessadas: entries.length,
              linhasErro: 0,
              conteudoConvertido: convertedContent,
              nomeArquivoConvertido: convertedFile.name,
              metadados: { sistemaOrigem, sistemaDestino, formatoEntrada, formatoSaida },
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
      modulo="contabil"
      titulo="Dados Contábeis"
      descricao="Converta balancetes, DREs e planos de contas"
      icon={<Calculator className="w-5 h-5 text-purple-500" />}
      iconColor="text-purple-500"
      bgColor="bg-purple-500/10"
      acceptedFiles=".csv,.txt"
      acceptedFormats="CSV e TXT com dados contábeis"
      files={files}
      setFiles={setFiles}
      convertedFiles={convertedFiles}
      isConverting={isConverting}
      onConvert={handleConvert}
      onDownload={downloadFile}
      onDownloadAll={downloadAll}
      error={error}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
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
        <div className="grid grid-cols-2 gap-3">
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
      </div>
    </ConversorBase>
  );
};
