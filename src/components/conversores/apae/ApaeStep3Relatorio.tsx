import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Upload, Trash2, Search, Loader2, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { readExcelFile } from "@/utils/fileParserUtils";
import type { ApaeRelatorioLinha } from "@/hooks/useApaeSessoes";

const ITEMS_PER_PAGE = 20;

interface Props {
  linhas: ApaeRelatorioLinha[];
  relatorioArquivo: string | null;
  onSalvarRelatorio: (linhas: Omit<ApaeRelatorioLinha, "id" | "sessao_id" | "created_at">[], nomeArquivo: string) => Promise<void>;
  onRemoverRelatorio: () => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export function ApaeStep3Relatorio({ linhas, relatorioArquivo, onSalvarRelatorio, onRemoverRelatorio, onNext, onBack, saving }: Props) {
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Agrupa linhas em pares para exibição
  const pares = useMemo(() => {
    const map: Record<number, { dados?: ApaeRelatorioLinha; historico?: ApaeRelatorioLinha }> = {};
    linhas.forEach((l) => {
      if (l.par_id == null) return;
      if (!map[l.par_id]) map[l.par_id] = {};
      if (l.tipo_linha === "dados") map[l.par_id].dados = l;
      else map[l.par_id].historico = l;
    });
    return Object.entries(map)
      .map(([parId, pair]) => ({ parId: Number(parId), ...pair }))
      .sort((a, b) => a.parId - b.parId);
  }, [linhas]);

  const filtrado = useMemo(() => {
    if (!busca.trim()) return pares;
    const termo = busca.toLowerCase();
    return pares.filter((p) => {
      const d = p.dados;
      const h = p.historico;
      return (
        d?.col_b?.toLowerCase().includes(termo) ||
        d?.col_c?.toLowerCase().includes(termo) ||
        h?.col_b?.toLowerCase().includes(termo) ||
        h?.col_c?.toLowerCase().includes(termo)
      );
    });
  }, [pares, busca]);

  const totalPaginas = Math.ceil(filtrado.length / ITEMS_PER_PAGE);
  const paginado = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE;
    return filtrado.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [filtrado, pagina]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const rows = await readExcelFile(file);
      if (rows.length < 3) throw new Error("Arquivo não contém dados suficientes.");

      const resultado: Omit<ApaeRelatorioLinha, "id" | "sessao_id" | "created_at">[] = [];
      let parCounter = 0;

      // Row 0 = header, pares a partir de 1
      for (let i = 1; i < rows.length - 1; i += 2) {
        const oddRow = rows[i];
        const evenRow = rows[i + 1];
        if (!oddRow) continue;

        const col = (row: any[], idx: number) => String(row?.[idx] ?? "").trim() || null;
        parCounter++;

        // Linha de dados (ímpar)
        resultado.push({
          linha_numero: i + 1,
          tipo_linha: "dados",
          par_id: parCounter,
          col_a: col(oddRow, 0),
          col_b: col(oddRow, 1),
          col_c: col(oddRow, 2),
          col_d: col(oddRow, 3),
          col_e: col(oddRow, 4),
          col_f: col(oddRow, 5),
          col_g: col(oddRow, 6),
          col_h: col(oddRow, 7),
          col_i: col(oddRow, 8),
        });

        // Linha de histórico (par)
        if (evenRow) {
          resultado.push({
            linha_numero: i + 2,
            tipo_linha: "historico",
            par_id: parCounter,
            col_a: col(evenRow, 0),
            col_b: col(evenRow, 1),
            col_c: col(evenRow, 2),
            col_d: col(evenRow, 3),
            col_e: col(evenRow, 4),
            col_f: col(evenRow, 5),
            col_g: col(evenRow, 6),
            col_h: col(evenRow, 7),
            col_i: col(evenRow, 8),
          });
        }
      }

      if (resultado.length === 0) throw new Error("Nenhum registro encontrado no arquivo.");

      await onSalvarRelatorio(resultado, file.name);
      setPagina(1);
      setBusca("");
      toast.success(`${Math.floor(resultado.length / 2)} registro(s) importados!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar arquivo");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Passo 3: Relatório Original
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Carregue o relatório de contas a pagar APAE (.xls, .xlsx)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {linhas.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">Nenhum relatório carregado</p>
              <Button onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Carregar Relatório
              </Button>
              <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleUpload} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{relatorioArquivo}</Badge>
                  <Badge>{pares.length} registro(s)</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                    {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                    Substituir
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onRemoverRelatorio} disabled={saving}>
                    <Trash2 className="w-4 h-4 mr-1" /> Remover
                  </Button>
                  <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleUpload} />
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fornecedor, conta..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="max-h-[450px]">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Conta Débito</TableHead>
                        <TableHead>Centro Custo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data Pagto</TableHead>
                        <TableHead>Valor Pago</TableHead>
                        <TableHead className="min-w-[200px]">Histórico (linha par)</TableHead>
                        <TableHead>Conta (par)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginado.map((par) => (
                        <TableRow key={par.parId}>
                          <TableCell className="text-xs text-muted-foreground">{par.parId}</TableCell>
                          <TableCell className="text-sm font-medium max-w-[150px] truncate">{par.dados?.col_b}</TableCell>
                          <TableCell className="text-sm">{par.dados?.col_c}</TableCell>
                          <TableCell className="text-sm">{par.dados?.col_d}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{par.dados?.col_g}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{par.dados?.col_h}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{par.dados?.col_i}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{par.historico?.col_b}</TableCell>
                          <TableCell className="text-xs">{par.historico?.col_c}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {filtrado.length} par(es) — Página {pagina}/{totalPaginas}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={linhas.length === 0}>
          Próximo: Processamento <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
