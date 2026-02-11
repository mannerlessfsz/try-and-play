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

const ITEMS_PER_PAGE = 100;

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

  // Exibir todas as linhas na ordem original, sem agrupar
  const ordenadas = useMemo(
    () => [...linhas].sort((a, b) => a.linha_numero - b.linha_numero),
    [linhas]
  );

  const filtrado = useMemo(() => {
    if (!busca.trim()) return ordenadas;
    const termo = busca.toLowerCase();
    return ordenadas.filter((l) =>
      l.col_a?.toLowerCase().includes(termo) ||
      l.col_b?.toLowerCase().includes(termo) ||
      l.col_c?.toLowerCase().includes(termo) ||
      l.col_d?.toLowerCase().includes(termo) ||
      l.col_e?.toLowerCase().includes(termo) ||
      l.col_f?.toLowerCase().includes(termo) ||
      l.col_g?.toLowerCase().includes(termo) ||
      l.col_h?.toLowerCase().includes(termo) ||
      l.col_i?.toLowerCase().includes(termo)
    );
  }, [ordenadas, busca]);

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
      toast.success(`${resultado.length} linha(s) importadas (${Math.floor(resultado.length / 2)} pares)!`);
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
            Passo 3: Relatório Original (Leitura Bruta)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualize exatamente como o relatório foi lido. O processamento será feito no Passo 4.
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
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{relatorioArquivo}</Badge>
                  <Badge>{ordenadas.length} linha(s)</Badge>
                  <Badge variant="outline">{new Set(ordenadas.map(l => l.par_id)).size} par(es)</Badge>
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
                  placeholder="Buscar em qualquer coluna..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="max-h-[70vh]">
                <div className="min-w-[900px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Linha</TableHead>
                        <TableHead className="w-14">Tipo</TableHead>
                        <TableHead className="w-10">Par</TableHead>
                        <TableHead>Col A</TableHead>
                        <TableHead>Col B</TableHead>
                        <TableHead>Col C</TableHead>
                        <TableHead>Col D</TableHead>
                        <TableHead>Col E</TableHead>
                        <TableHead>Col F</TableHead>
                        <TableHead>Col G</TableHead>
                        <TableHead>Col H</TableHead>
                        <TableHead>Col I</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginado.map((l) => (
                        <TableRow
                          key={l.id}
                          className={l.tipo_linha === "dados" ? "bg-primary/5" : "bg-muted/30"}
                        >
                          <TableCell className="text-xs text-muted-foreground font-mono">{l.linha_numero}</TableCell>
                          <TableCell>
                            <Badge variant={l.tipo_linha === "dados" ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                              {l.tipo_linha === "dados" ? "Ímpar" : "Par"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{l.par_id}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{l.col_a || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{l.col_b || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{l.col_c || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{l.col_d || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[80px] truncate">{l.col_e || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[80px] truncate">{l.col_f || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[80px] truncate">{l.col_g || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[80px] truncate">{l.col_h || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[80px] truncate">{l.col_i || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {filtrado.length} linha(s) — Página {pagina}/{totalPaginas}
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
