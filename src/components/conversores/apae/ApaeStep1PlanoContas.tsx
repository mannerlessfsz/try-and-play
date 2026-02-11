import { useState, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, Upload, Trash2, Search, Loader2, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  parsePlanoContasFromCsvFile,
  parsePlanoContasFromExcelFile,
  type PlanoContasItem,
} from "@/utils/planoContasParser";
import type { ApaePlanoContas } from "@/hooks/useApaeSessoes";

const ITEMS_PER_PAGE = 100;

interface Props {
  sessaoId: string;
  planoContas: ApaePlanoContas[];
  planoContasArquivo: string | null;
  onSalvarPlano: (contas: { codigo: string; descricao: string; classificacao?: string; cnpj?: string }[], nomeArquivo: string) => Promise<void>;
  onRemoverPlano: () => Promise<void>;
  onNext: () => void;
  saving: boolean;
}

export function ApaeStep1PlanoContas({ planoContas, planoContasArquivo, onSalvarPlano, onRemoverPlano, onNext, saving }: Props) {
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtrado = useMemo(() => {
    if (!busca.trim()) return planoContas;
    const termo = busca.toLowerCase();
    return planoContas.filter(
      (c) =>
        c.descricao.toLowerCase().includes(termo) ||
        c.codigo.toLowerCase().includes(termo) ||
        (c.classificacao || "").toLowerCase().includes(termo) ||
        (c.cnpj || "").toLowerCase().includes(termo)
    );
  }, [planoContas, busca]);

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
      const ext = file.name.split(".").pop()?.toLowerCase();
      let items: PlanoContasItem[];

      if (ext === "xls" || ext === "xlsx") {
        items = await parsePlanoContasFromExcelFile(file);
      } else if (ext === "csv") {
        items = await parsePlanoContasFromCsvFile(file);
      } else {
        throw new Error("Formato não suportado. Use XLS, XLSX ou CSV.");
      }

      if (!items || items.length === 0) {
        throw new Error("Nenhuma conta encontrada no arquivo.");
      }

      await onSalvarPlano(
        items.map((i) => ({ codigo: i.codigo, descricao: i.descricao, classificacao: i.classificacao, cnpj: i.cnpj })),
        file.name
      );
      setPagina(1);
      setBusca("");
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
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Plano de Contas</span>
              {planoContas.length > 0 && <Badge variant="secondary" className="text-[10px]">{planoContas.length} contas</Badge>}
            </div>
            {planoContas.length > 0 && (
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">{planoContasArquivo}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemoverPlano} disabled={saving}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          <input ref={inputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleUpload} />

          {planoContas.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Carregue o plano de contas (.xls, .xlsx, .csv)</p>
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
                  placeholder="Buscar conta..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <ScrollArea className="max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="w-24 text-xs">Código</TableHead>
                      <TableHead className="w-28 text-xs">Classif.</TableHead>
                      <TableHead className="w-32 text-xs">CNPJ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginado.map((conta) => (
                      <TableRow key={conta.id}>
                        <TableCell className="text-xs py-1.5">{conta.descricao}</TableCell>
                        <TableCell className="font-mono text-[11px] py-1.5">{conta.codigo}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground py-1.5">{conta.classificacao}</TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground py-1.5">{conta.cnpj || "00000000000000"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {filtrado.length} resultado(s) — Pág. {pagina}/{totalPaginas}
                  </span>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {planoContas.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onNext}>
            Próximo <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
