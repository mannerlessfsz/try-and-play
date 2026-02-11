import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Upload, Trash2, Search, Loader2, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { parseRazaoContabil, type RazaoLinha } from "@/utils/razaoContabilParser";

const ITEMS_PER_PAGE = 100;

export interface ApaeRazaoLinha {
  id: string;
  sessao_id: string;
  conta_codigo: string;
  conta_descricao: string | null;
  data: string | null;
  historico: string | null;
  cta_c_part: string | null;
  debito: string | null;
  credito: string | null;
  saldo: string | null;
  linha_numero: number;
  created_at: string;
}

interface Props {
  razaoLinhas: ApaeRazaoLinha[];
  razaoArquivo: string | null;
  onSalvarRazao: (linhas: Omit<ApaeRazaoLinha, "id" | "sessao_id" | "created_at">[], nomeArquivo: string) => Promise<void>;
  onRemoverRazao: () => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export function ApaeStep4Razao({ razaoLinhas, razaoArquivo, onSalvarRazao, onRemoverRazao, onNext, onBack, saving }: Props) {
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtrado = useMemo(() => {
    if (!busca.trim()) return razaoLinhas;
    const termo = busca.toLowerCase();
    return razaoLinhas.filter((l) =>
      l.conta_codigo?.toLowerCase().includes(termo) ||
      l.conta_descricao?.toLowerCase().includes(termo) ||
      l.historico?.toLowerCase().includes(termo) ||
      l.cta_c_part?.toLowerCase().includes(termo)
    );
  }, [razaoLinhas, busca]);

  const totalPaginas = Math.ceil(filtrado.length / ITEMS_PER_PAGE);
  const paginado = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE;
    return filtrado.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [filtrado, pagina]);

  const contasUnicas = useMemo(() => new Set(razaoLinhas.map(l => l.conta_codigo)).size, [razaoLinhas]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const parsed = await parseRazaoContabil(file);
      if (parsed.length === 0) throw new Error("Nenhum lançamento encontrado no Razão.");

      const linhas: Omit<ApaeRazaoLinha, "id" | "sessao_id" | "created_at">[] = parsed.map((p) => ({
        conta_codigo: p.conta_codigo,
        conta_descricao: p.conta_descricao || null,
        data: p.data || null,
        historico: p.historico || null,
        cta_c_part: p.cta_c_part || null,
        debito: p.debito || null,
        credito: p.credito || null,
        saldo: p.saldo || null,
        linha_numero: p.linha_numero,
      }));

      await onSalvarRazao(linhas, file.name);
      setPagina(1);
      setBusca("");
      const contas = new Set(parsed.map(p => p.conta_codigo)).size;
      toast.success(`${parsed.length} lançamento(s) importados de ${contas} conta(s)!`);
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
            <BookOpen className="w-5 h-5 text-primary" />
            Passo 4: Razão Contábil (Opcional)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Carregue o Razão para auxiliar na vinculação automática de contas débito quando o fornecedor não é encontrado no Plano de Contas.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {razaoLinhas.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-2">Nenhum Razão carregado</p>
              <p className="text-xs text-muted-foreground mb-4">
                Este passo é opcional. Se não carregar, apenas o Plano de Contas será usado.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Carregar Razão
                </Button>
                <Button variant="outline" onClick={onNext}>
                  Pular <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleUpload} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{razaoArquivo}</Badge>
                  <Badge>{razaoLinhas.length} lançamento(s)</Badge>
                  <Badge variant="outline">{contasUnicas} conta(s)</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                    {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                    Substituir
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onRemoverRazao} disabled={saving}>
                    <Trash2 className="w-4 h-4 mr-1" /> Remover
                  </Button>
                  <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleUpload} />
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por conta, histórico, contrapartida..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="max-h-[70vh]">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Conta</TableHead>
                        <TableHead className="w-20">Data</TableHead>
                        <TableHead>Histórico</TableHead>
                        <TableHead className="w-20">Cta.C.Part.</TableHead>
                        <TableHead className="w-20 text-right">Débito</TableHead>
                        <TableHead className="w-20 text-right">Crédito</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginado.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs font-mono">{l.conta_codigo}</TableCell>
                          <TableCell className="text-xs">{l.data || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[300px] truncate" title={l.historico || ""}>
                            {l.historico || "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{l.cta_c_part || "—"}</TableCell>
                          <TableCell className="text-xs text-right text-emerald-500">{l.debito || ""}</TableCell>
                          <TableCell className="text-xs text-right text-rose-500">{l.credito || ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {filtrado.length} lançamento(s) — Página {pagina}/{totalPaginas}
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
        <Button onClick={onNext}>
          Próximo: Processamento <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
