import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { parseOFX, readFileAsText, OFXTransaction } from "@/utils/ofxParser";
import { ConversorBase, type ConvertedFile } from "./ConversorBase";
import { useConversoes } from "@/hooks/useConversoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";

const formatosSaida = [
  { value: "csv", label: "CSV (Planilha)" },
  { value: "json", label: "JSON" },
  { value: "txt", label: "TXT (Texto)" },
];

export const ConversorExtrato = () => {
  const { empresaAtiva } = useEmpresaAtiva();
  const { criarConversao, atualizarConversao } = useConversoes("extrato");
  
  const [files, setFiles] = useState<File[]>([]);
  const [formatoSaida, setFormatoSaida] = useState<string>("csv");
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        let conversaoId: string | null = null;
        const content = await readFileAsText(file);
        
        // Criar registro no banco se tiver empresa ativa
        if (empresaAtiva?.id) {
          try {
            const conversao = await criarConversao.mutateAsync({
              modulo: "extrato",
              nomeArquivoOriginal: file.name,
              conteudoOriginal: content,
            });
            conversaoId = conversao.id;
          } catch (err) {
            console.error("Erro ao criar conversão:", err);
          }
        }

        try {
          if (file.name.toLowerCase().endsWith('.ofx')) {
            const parsed = parseOFX(content);
            
            if (parsed.transactions.length === 0) {
              toast({ title: "Aviso", description: `Arquivo ${file.name} não contém transações.`, variant: "destructive" });
              if (conversaoId && empresaAtiva?.id) {
                await atualizarConversao.mutateAsync({
                  id: conversaoId,
                  status: "erro",
                  mensagemErro: "Arquivo não contém transações",
                });
              }
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
            const convertedFile = {
              name: `${baseName}.${extension}`,
              type: formatoSaida,
              content: convertedContent,
              size: new Blob([convertedContent]).size,
            };
            results.push(convertedFile);

            // Atualizar conversão com sucesso
            if (conversaoId && empresaAtiva?.id) {
              await atualizarConversao.mutateAsync({
                id: conversaoId,
                status: "sucesso",
                totalLinhas: parsed.transactions.length,
                linhasProcessadas: data.length,
                linhasErro: 0,
                conteudoConvertido: convertedContent,
                nomeArquivoConvertido: convertedFile.name,
                metadados: {
                  banco: parsed.bankId,
                  agencia: parsed.branchId,
                  conta: parsed.accountId,
                  formatoSaida,
                },
              });
            }
          } else {
            toast({ title: "Aviso", description: `Formato de ${file.name} não suportado. Use arquivos OFX.`, variant: "destructive" });
            if (conversaoId && empresaAtiva?.id) {
              await atualizarConversao.mutateAsync({
                id: conversaoId,
                status: "erro",
                mensagemErro: "Formato não suportado. Use arquivos OFX.",
              });
            }
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
        toast({ title: "Sucesso", description: `${results.length} arquivo(s) convertido(s) com sucesso!` });
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
      modulo="extrato"
      titulo="Extratos Bancários"
      descricao="Converta extratos OFX para CSV, JSON ou TXT"
      icon={<FileSpreadsheet className="w-5 h-5 text-blue-500" />}
      iconColor="text-blue-500"
      bgColor="bg-blue-500/10"
      acceptedFiles=".ofx"
      acceptedFormats="Arquivos OFX (Open Financial Exchange)"
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
