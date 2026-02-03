import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, ArrowLeft, FileText, CheckCircle, 
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { type LancamentoAjustado } from "./AjustarLancamentosStep";

const ITEMS_PER_PAGE = 20;

type Props = {
  lancamentos: LancamentoAjustado[];
  contaCredito: string;
  codigoEmpresa: string;
  competenciaMes: string;
  competenciaAno: string;
  onVoltar: () => void;
  onExportConfirmed?: () => void;
};

const MESES_LABEL: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

const ExportarCsvStep = ({
  lancamentos,
  contaCredito,
  codigoEmpresa,
  competenciaMes,
  competenciaAno,
  onVoltar,
  onExportConfirmed,
}: Props) => {
  const { toast } = useToast();
  const [pagina, setPagina] = useState(1);
  const [exportado, setExportado] = useState(false);

  const totalPaginas = Math.ceil(lancamentos.length / ITEMS_PER_PAGE);
  const lancamentosPaginados = lancamentos.slice(
    (pagina - 1) * ITEMS_PER_PAGE, 
    pagina * ITEMS_PER_PAGE
  );

  const valorTotal = lancamentos.reduce((sum, l) => sum + l.valor, 0);

  const handleExportar = () => {
    const headers = ["DATA", "CONTA_DEBITO", "CONTA_CREDITO", "VALOR", "HISTORICO", "LOTE", "CODIGO_EMPRESA"];
    const rows = lancamentos.map(l => [
      l.data,
      l.contaDebito,
      contaCredito,
      l.valor.toFixed(2).replace(".", ","),
      `"${l.historico}"`,
      l.lote.toString(),
      codigoEmpresa,
    ]);

    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lancamentos_ajustados_${competenciaMes}_${competenciaAno}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportado(true);
    toast({
      title: "Arquivo exportado com sucesso",
      description: `${lancamentos.length} lançamentos exportados para CSV.`,
    });

    // Notificar que a competência foi confirmada
    onExportConfirmed?.();
  };

  return (
    <Card className="border-emerald-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Download className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Exportar para CSV</CardTitle>
            <CardDescription>
              Competência: {MESES_LABEL[competenciaMes]}/{competenciaAno} • 
              Revise os lançamentos antes de exportar
            </CardDescription>
          </div>
          {exportado && (
            <Badge variant="outline" className="border-green-500 text-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Exportado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo Final */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <p className="text-xs text-emerald-400">Total Lançamentos</p>
            <p className="text-xl font-bold text-emerald-500">{lancamentos.length}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">Valor Total</p>
            <p className="text-xl font-bold">{formatCurrency(valorTotal)}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">Conta Crédito</p>
            <p className="text-sm font-mono font-medium truncate">{contaCredito}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">Código Empresa</p>
            <p className="text-sm font-mono font-medium">{codigoEmpresa}</p>
          </div>
        </div>

        {/* Preview do CSV */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium text-sm">Preview do arquivo CSV</h4>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-500/10">
                  <TableHead className="text-xs">DATA</TableHead>
                  <TableHead className="text-xs">CONTA_DEBITO</TableHead>
                  <TableHead className="text-xs">CONTA_CREDITO</TableHead>
                  <TableHead className="text-xs text-right">VALOR</TableHead>
                  <TableHead className="text-xs">HISTORICO</TableHead>
                  <TableHead className="text-xs text-center">LOTE</TableHead>
                  <TableHead className="text-xs text-center">COD_EMPRESA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosPaginados.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs py-2 font-mono">
                      {item.data ? formatDate(item.data) : "-"}
                    </TableCell>
                    <TableCell className="text-xs py-2 font-mono">
                      {item.contaDebito}
                    </TableCell>
                    <TableCell className="text-xs py-2 font-mono">
                      {contaCredito}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right font-mono">
                      {item.valor.toFixed(2).replace(".", ",")}
                    </TableCell>
                    <TableCell className="text-xs py-2 max-w-[200px]">
                      <p className="truncate text-[10px]" title={item.historico}>
                        {item.historico}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs py-2 text-center font-mono">
                      {item.lote}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-center font-mono">
                      {codigoEmpresa}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {((pagina - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(pagina * ITEMS_PER_PAGE, lancamentos.length)} de {lancamentos.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2 text-sm">{pagina}/{totalPaginas}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar: Ajustar Lançamentos
          </Button>
          <Button 
            onClick={handleExportar}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportado ? "Exportar Novamente" : "Baixar CSV"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExportarCsvStep;
