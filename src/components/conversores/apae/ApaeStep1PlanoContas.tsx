import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Passo 1: Plano de Contas
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Carregue o plano de contas em Excel (.xls, .xlsx) ou CSV
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {planoContas.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">Nenhum plano de contas carregado</p>
              <Button onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Carregar Plano de Contas
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{planoContasArquivo}</Badge>
                  <Badge>{planoContas.length} contas</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                    {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                    Substituir
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onRemoverPlano} disabled={saving}>
                    <Trash2 className="w-4 h-4 mr-1" /> Remover
                  </Button>
                  <input ref={inputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleUpload} />
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conta..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-28">Código</TableHead>
                      <TableHead className="w-32">Classificação</TableHead>
                      <TableHead className="w-36">CNPJ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginado.map((conta) => (
                      <TableRow key={conta.id}>
                        <TableCell className="text-sm">{conta.descricao}</TableCell>
                        <TableCell className="font-mono text-xs">{conta.codigo}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{conta.classificacao}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{conta.cnpj || "00000000000000"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {filtrado.length} resultado(s) — Página {pagina}/{totalPaginas}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
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
          <Button onClick={onNext}>
            Próximo: Contas de Banco <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
