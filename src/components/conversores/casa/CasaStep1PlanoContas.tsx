import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, Upload, Trash2, Search, Loader2, ChevronLeft, ChevronRight, ArrowRight, CheckCircle, Home } from "lucide-react";
import { toast } from "sonner";
import {
  parsePlanoContasFromCsvFile,
  parsePlanoContasFromExcelFile,
  type PlanoContasItem,
} from "@/utils/planoContasParser";
import { useCasaPlanoEmpresa, type CasaPlanoEmpresaItem } from "@/hooks/useCasaPlanoEmpresa";

const ITEMS_PER_PAGE = 100;

export function CasaStep1PlanoContas({ onNext }: { onNext: () => void }) {
  const { planoEmpresa, planoArquivo, loadingPlano, salvarPlano, removerPlano, temPlano } = useCasaPlanoEmpresa();
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const saving = salvarPlano.isPending || removerPlano.isPending;

  const filtrado = useMemo(() => {
    if (!busca.trim()) return planoEmpresa;
    const termo = busca.toLowerCase();
    return planoEmpresa.filter(
      (c) =>
        c.descricao.toLowerCase().includes(termo) ||
        c.codigo.toLowerCase().includes(termo) ||
        (c.classificacao || "").toLowerCase().includes(termo) ||
        (c.cnpj || "").toLowerCase().includes(termo)
    );
  }, [planoEmpresa, busca]);

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

  const handleRemover = async () => {
    await removerPlano.mutateAsync();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      {/* Header Card - Bento style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Home className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversor</p>
              <p className="text-sm font-bold">CASA</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de Contas</p>
              <p className="text-lg font-bold tabular-nums">{loadingPlano ? "..." : planoEmpresa.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${temPlano ? "from-green-500/5" : "from-orange-500/5"} to-transparent pointer-events-none`} />
          <div className="relative flex items-center gap-3">
            <div className={`p-2 rounded-lg ${temPlano ? "bg-green-500/10" : "bg-orange-500/10"}`}>
              <CheckCircle className={`w-5 h-5 ${temPlano ? "text-green-500" : "text-orange-500"}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-semibold">{temPlano ? "Plano carregado" : "Pendente"}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="border shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">Plano de Contas</span>
                {temPlano && <Badge variant="secondary" className="text-[10px]">{planoEmpresa.length} contas</Badge>}
              </div>
              {temPlano && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] max-w-[200px] truncate">{planoArquivo}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleRemover} disabled={saving}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <input ref={inputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleUpload} />

            {!temPlano ? (
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">Carregue o plano de contas da empresa</p>
                <p className="text-xs text-muted-foreground/60 mb-4">Formatos aceitos: .xls, .xlsx, .csv — O plano fica salvo permanentemente.</p>
                <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={loading || saving}>
                  {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                  Carregar Arquivo
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por descrição, código ou classificação..."
                    value={busca}
                    onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <ScrollArea className="max-h-[55vh]">
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
      </motion.div>

      {/* Next button */}
      {temPlano && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end"
        >
          <Button size="sm" onClick={onNext} className="gap-1.5">
            Próximo <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
