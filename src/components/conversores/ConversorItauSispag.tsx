import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, FileSpreadsheet, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  parsePlanoContasFromCsvFile,
  parsePlanoContasFromExcelFile,
  type PlanoContasItem,
} from "@/utils/planoContasParser";

const ITEMS_PER_PAGE = 15;

const ConversorItauSispag = () => {
  const { toast } = useToast();
  
  // Plano de contas (Passo 1)
  const [planoContas, setPlanoContas] = useState<PlanoContasItem[]>([]);
  const [planoContasNome, setPlanoContasNome] = useState<string>("");
  const [loadingPlano, setLoadingPlano] = useState(false);
  const [planoPagina, setPlanoPagina] = useState(1);
  const [planoBusca, setPlanoBusca] = useState("");
  const planoInputRef = useRef<HTMLInputElement>(null);

  // Filtrar e paginar plano de contas
  const planoContasFiltrado = useMemo(() => {
    if (!planoBusca.trim()) return planoContas;
    const termo = planoBusca.toLowerCase();
    return planoContas.filter(
      (c) =>
        c.descricao.toLowerCase().includes(termo) ||
        c.codigo.toLowerCase().includes(termo) ||
        c.classificacao.toLowerCase().includes(termo) ||
        c.cnpj.toLowerCase().includes(termo)
    );
  }, [planoContas, planoBusca]);

  const totalPaginasPlano = Math.ceil(planoContasFiltrado.length / ITEMS_PER_PAGE);
  const planoContasPaginado = useMemo(() => {
    const inicio = (planoPagina - 1) * ITEMS_PER_PAGE;
    return planoContasFiltrado.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [planoContasFiltrado, planoPagina]);

  const handlePlanoContasUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingPlano(true);
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
        throw new Error(
          "Arquivo carregado, mas não encontrei linhas do plano de contas. Verifique se ele contém as colunas Classificação/Código/Descrição/CNPJ (ou envie como XLSX/CSV)."
        );
      }

      setPlanoContas(items);
      setPlanoContasNome(file.name);
      setPlanoPagina(1);
      setPlanoBusca("");
      toast({
        title: "Plano de contas carregado",
        description: `${items.length} contas importadas com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar plano de contas",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoadingPlano(false);
      if (planoInputRef.current) {
        planoInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Passo 1: Plano de Contas */}
      <Card className="border-purple-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Passo 1: Plano de Contas</CardTitle>
              <CardDescription>Carregue o plano de contas (XLS, XLSX ou CSV)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                ref={planoInputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={handlePlanoContasUpload}
                disabled={loadingPlano}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Arquivos suportados: XLS, XLSX ou CSV
              </p>
            </div>
            {planoContas.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setPlanoContas([]);
                  setPlanoContasNome("");
                  setPlanoPagina(1);
                  setPlanoBusca("");
                }}
                title="Remover plano de contas"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>

          {loadingPlano && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando plano de contas...
            </div>
          )}

          {planoContas.length > 0 && (
            <div className="space-y-3">
              {/* Header com info e busca */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">{planoContasNome}</span>
                  <span className="text-xs text-muted-foreground">
                    ({planoContas.length} contas)
                  </span>
                </div>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar código ou descrição..."
                    value={planoBusca}
                    onChange={(e) => {
                      setPlanoBusca(e.target.value);
                      setPlanoPagina(1);
                    }}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Tabela completa paginada */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="text-xs w-28">Código</TableHead>
                      <TableHead className="text-xs w-36">Classificação</TableHead>
                      <TableHead className="text-xs w-36">CNPJ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planoContasPaginado.length > 0 ? (
                      planoContasPaginado.map((conta, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/30">
                          <TableCell className="text-xs py-2">{conta.descricao}</TableCell>
                          <TableCell className="text-xs py-2 font-mono">{conta.codigo}</TableCell>
                          <TableCell className="text-xs py-2 font-mono">{conta.classificacao}</TableCell>
                          <TableCell className="text-xs py-2 font-mono">{conta.cnpj || "00000000000000"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                          Nenhuma conta encontrada para "{planoBusca}"
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPaginasPlano > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {((planoPagina - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(planoPagina * ITEMS_PER_PAGE, planoContasFiltrado.length)} de {planoContasFiltrado.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPlanoPagina(p => Math.max(1, p - 1))}
                      disabled={planoPagina === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      {Array.from({ length: Math.min(5, totalPaginasPlano) }, (_, i) => {
                        let pageNum: number;
                        if (totalPaginasPlano <= 5) {
                          pageNum = i + 1;
                        } else if (planoPagina <= 3) {
                          pageNum = i + 1;
                        } else if (planoPagina >= totalPaginasPlano - 2) {
                          pageNum = totalPaginasPlano - 4 + i;
                        } else {
                          pageNum = planoPagina - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={planoPagina === pageNum ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setPlanoPagina(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPlanoPagina(p => Math.min(totalPaginasPlano, p + 1))}
                      disabled={planoPagina === totalPaginasPlano}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversorItauSispag;
