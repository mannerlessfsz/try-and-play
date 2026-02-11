import { useState, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
          col_a: col(oddRow, 0), col_b: col(oddRow, 1), col_c: col(oddRow, 2),
          col_d: col(oddRow, 3), col_e: col(oddRow, 4), col_f: col(oddRow, 5),
          col_g: col(oddRow, 6), col_h: col(oddRow, 7), col_i: col(oddRow, 8),
        });

        if (evenRow) {
          resultado.push({
            linha_numero: i + 2,
            tipo_linha: "historico",
            par_id: parCounter,
            col_a: col(evenRow, 0), col_b: col(evenRow, 1), col_c: col(evenRow, 2),
            col_d: col(evenRow, 3), col_e: col(evenRow, 4), col_f: col(evenRow, 5),
            col_g: col(evenRow, 6), col_h: col(evenRow, 7), col_i: col(evenRow, 8),
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
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Relatório</span>
              {linhas.length > 0 && (
                <>
                  <Badge variant="secondary" className="text-[10px]">{ordenadas.length} linhas</Badge>
                  <Badge variant="outline" className="text-[10px]">{new Set(ordenadas.map(l => l.par_id)).size} pares</Badge>
                </>
              )}
            </div>
            {linhas.length > 0 && (
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">{relatorioArquivo}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemoverRelatorio} disabled={saving}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleUpload} />

          {linhas.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Carregue o relatório (.xls, .xlsx)</p>
              <Button size="sm" onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                Carregar Arquivo
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <ScrollArea className="max-h-[60vh]">
                <div className="min-w-[900px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-[11px]">#</TableHead>
                        <TableHead className="w-12 text-[11px]">Tipo</TableHead>
                        <TableHead className="w-8 text-[11px]">Par</TableHead>
                        {["A","B","C","D","E","F","G","H","I"].map(c => (
                          <TableHead key={c} className="text-[11px]">{c}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginado.map((l) => (
                        <TableRow key={l.id} className={l.tipo_linha === "dados" ? "bg-primary/5" : "bg-muted/30"}>
                          <TableCell className="text-[11px] text-muted-foreground font-mono py-1">{l.linha_numero}</TableCell>
                          <TableCell className="py-1">
                            <Badge variant={l.linha_numero % 2 === 0 ? "default" : "outline"} className="text-[9px] px-1 py-0">
                              {l.linha_numero % 2 === 0 ? "Par" : "Ímp"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[11px] font-mono py-1">{l.par_id}</TableCell>
                          <TableCell className="text-[11px] max-w-[90px] truncate py-1">{l.col_a || "—"}</TableCell>
                          <TableCell className="text-[11px] max-w-[100px] truncate py-1">{l.col_b || "—"}</TableCell>
                          <TableCell className="text-[11px] max-w-[90px] truncate py-1">{l.col_c || "—"}</TableCell>
                          <TableCell className="text-[11px] max-w-[90px] truncate py-1">{l.col_d || "—"}</TableCell>
                          <TableCell className="text-[11px] max-w-[70px] truncate py-1">{l.col_e || "—"}</TableCell>
                          <TableCell className="text-[11px] max-w-[70px] truncate py-1">{l.col_f || "—"}</TableCell>
                          <TableCell className="text-[11px] max-w-[70px] truncate py-1">{l.col_g || "—"}</TableCell>
                          <TableCell className="text-[11px] max-w-[70px] truncate py-1">{l.col_h || "—"}</TableCell>
                          <TableCell className="text-[11px] max-w-[70px] truncate py-1">{l.col_i || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {filtrado.length} linha(s) — Pág. {pagina}/{totalPaginas}
                  </span>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Voltar
        </Button>
        <Button size="sm" onClick={onNext} disabled={linhas.length === 0}>
          Próximo <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
