import { useState } from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { ConversorBase, type ConvertedFile } from "./ConversorBase";
import { useConversoes } from "@/hooks/useConversoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { readExcelFile } from "@/utils/fileParserUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

/** Remove acentos, cedilhas e converte para maiúsculas */
function toUpperNoAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
}

export interface ApaeProcessedRecord {
  linha: number;
  fornecedor: string;
  contaDebito: string;
  centroCusto: string;
  nDoc: string;
  vencimento: string;
  valor: string;
  dataPagto: string;
  valorPago: string;
  historicoOriginal: string;
  historicoConcatenado: string;
}

export function LancaApaeTab() {
  const { empresaAtiva } = useEmpresaAtiva();
  const { criarConversao, atualizarConversao } = useConversoes("apae");

  const [files, setFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processedRecords, setProcessedRecords] = useState<ApaeProcessedRecord[]>([]);

  const parseApaeExcel = async (file: File): Promise<ApaeProcessedRecord[]> => {
    const rows = await readExcelFile(file);
    if (rows.length < 3) return []; // header + at least one pair

    const records: ApaeProcessedRecord[] = [];
    // Row 0 = header. Pairs start at index 1 (odd=data, even=history)
    // Columns (0-based): A=0 SITUAÇÃO, B=1 FORNECEDOR, C=2 CONTA DÉBITO,
    //   D=3 CENTRO DE CUSTO, E=4 N° DOC, F=5 VENCIMENTO, G=6 VALOR,
    //   H=7 DATA PAGTO, I=8 VALOR PAGO

    for (let i = 1; i < rows.length - 1; i += 2) {
      const oddRow = rows[i];     // data row
      const evenRow = rows[i + 1]; // history row

      if (!oddRow) continue;

      const col = (row: any[], idx: number) => String(row?.[idx] ?? "").trim();

      const bOdd = col(oddRow, 1);   // FORNECEDOR
      const bEven = col(evenRow, 1);  // HISTÓRICO TÍTULO...
      const cEven = col(evenRow, 2);  // CONTA DÉBITO (even)
      const dOdd = col(oddRow, 3);    // CENTRO DE CUSTO
      const eEven = col(evenRow, 4);  // N° DOC (even)

      // Build histórico concatenado
      const parts: string[] = [bOdd, bEven];
      if (eEven) parts.push(eEven);
      parts.push(`(CENTRO ${dOdd})`);
      parts.push(`PAGO EM ${cEven}`);

      const historicoConcatenado = toUpperNoAccents(parts.join(" "));

      records.push({
        linha: i + 1, // 1-based line in file (skipping header)
        fornecedor: col(oddRow, 1),
        contaDebito: col(oddRow, 2),
        centroCusto: dOdd,
        nDoc: col(oddRow, 4),
        vencimento: col(oddRow, 5),
        valor: col(oddRow, 6),
        dataPagto: col(oddRow, 7),
        valorPago: col(oddRow, 8),
        historicoOriginal: bEven,
        historicoConcatenado,
      });
    }

    return records;
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setError("Selecione pelo menos um arquivo para processar.");
      return;
    }

    setIsConverting(true);
    setError(null);
    setProcessedRecords([]);
    setConvertedFiles([]);

    try {
      let allRecords: ApaeProcessedRecord[] = [];

      for (const file of files) {
        let conversaoId: string | null = null;

        if (empresaAtiva?.id) {
          try {
            const conversao = await criarConversao.mutateAsync({
              modulo: "apae",
              nomeArquivoOriginal: file.name,
            });
            conversaoId = conversao.id;
          } catch (err) {
            console.error("Erro ao criar conversão:", err);
          }
        }

        try {
          const records = await parseApaeExcel(file);

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

          allRecords = [...allRecords, ...records];

          if (conversaoId && empresaAtiva?.id) {
            await atualizarConversao.mutateAsync({
              id: conversaoId,
              status: "sucesso",
              totalLinhas: records.length,
              linhasProcessadas: records.length,
              linhasErro: 0,
              metadados: { totalRegistros: records.length },
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

      setProcessedRecords(allRecords);

      if (allRecords.length > 0) {
        toast.success(`${allRecords.length} registro(s) processado(s) com sucesso!`);
        setFiles([]);
      }
    } catch (err) {
      setError("Erro ao processar arquivo APAE.");
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

  return (
    <div className="space-y-4">
      <ConversorBase
        modulo="apae"
        titulo="Lança APAE"
        descricao="Processe arquivos de Contas a Pagar para lançamento contábil"
        icon={<FileUp className="w-5 h-5 text-indigo-500" />}
        iconColor="text-indigo-500"
        bgColor="bg-indigo-500/10"
        acceptedFiles=".xlsx,.xls,.csv"
        acceptedFormats="Arquivos Excel (.xlsx, .xls) ou CSV"
        files={files}
        setFiles={setFiles}
        convertedFiles={convertedFiles}
        isConverting={isConverting}
        onConvert={handleConvert}
        onDownload={downloadFile}
        error={error}
        hideOutputCard={true}
      >
        {/* No extra options needed for now */}
        <></>
      </ConversorBase>

      {/* Preview dos dados processados */}
      {processedRecords.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="w-5 h-5 text-indigo-500" />
              Dados Processados
              <Badge variant="secondary" className="ml-2">
                {processedRecords.length} registro(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px] w-full">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data Pagto</TableHead>
                      <TableHead className="min-w-[400px]">Histórico Gerado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedRecords.map((record, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground text-xs">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">
                          {record.fornecedor}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {record.valorPago || record.valor}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {record.dataPagto}
                        </TableCell>
                        <TableCell className="text-xs font-mono break-all">
                          {record.historicoConcatenado}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
