import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, Upload, Trash2, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { parsePlanoContasFromCsvFile, parsePlanoContasFromExcelFile, type PlanoContasItem } from "@/utils/planoContasParser";
import { useApaePlanoEmpresa } from "@/hooks/useApaePlanoEmpresa";

const ITEMS_PER_PAGE = 100;

export function ApaeEmpresaPlanoCard() {
  const {
    planoEmpresa, planoArquivo, loadingPlano,
    salvarPlano, removerPlano, temPlano,
  } = useApaePlanoEmpresa();

  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtradoPlano = useMemo(() => {
    if (!busca.trim()) return planoEmpresa;
    const termo = busca.toLowerCase();
    return planoEmpresa.filter(
      (c) =>
        c.descricao.toLowerCase().includes(termo) ||
        c.codigo.toLowerCase().includes(termo) ||
        (c.classificacao || "").toLowerCase().includes(termo)
    );
  }, [planoEmpresa, busca]);

  const totalPaginas = Math.ceil(filtradoPlano.length / ITEMS_PER_PAGE);
  const paginado = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE;
    return filtradoPlano.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [filtradoPlano, pagina]);

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
      if (!items || items.length === 0) throw new Error("Nenhuma conta encontrada.");
      await salvarPlano.mutateAsync({
        contas: items.map((i) => ({ codigo: i.codigo, descricao: i.descricao, classificacao: i.classificacao, cnpj: i.cnpj })),
        nomeArquivo: file.name,
      });
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          Plano de Contas
          {temPlano && <Badge variant="secondary" className="text-[10px]">{planoEmpresa.length} contas</Badge>}
          {planoArquivo && <Badge variant="outline" className="text-[10px]">{planoArquivo}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input ref={inputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleUpload} />

        {!temPlano ? (
          <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Carregue o plano de contas (.xls, .xlsx, .csv)</p>
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
              Carregar Arquivo
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => inputRef.current?.click()} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removerPlano.mutateAsync()}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Buscar conta..." value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} className="pl-8 h-8 text-xs" />
            </div>

            <ScrollArea className="max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20 text-[11px]">Código</TableHead>
                    <TableHead className="text-[11px]">Descrição</TableHead>
                    <TableHead className="w-28 text-[11px]">Classif.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginado.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell className="font-mono text-[11px] py-1">{conta.codigo}</TableCell>
                      <TableCell className="text-xs py-1">{conta.descricao}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground py-1">{conta.classificacao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{filtradoPlano.length} resultado(s) — Pág. {pagina}/{totalPaginas}</span>
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
  );
}
