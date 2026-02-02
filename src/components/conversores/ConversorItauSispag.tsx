import { useState, useRef, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useConversoes } from "@/hooks/useConversoes";
import { Loader2, CheckCircle, FileSpreadsheet, Trash2, ChevronLeft, ChevronRight, Search, Building2, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  parsePlanoContasFromCsvFile,
  parsePlanoContasFromExcelFile,
  type PlanoContasItem,
} from "@/utils/planoContasParser";
import {
  parseItauReportFromExcelFile,
  type ItauPagamentoItem,
} from "@/utils/itauReportParser";

const ITEMS_PER_PAGE = 15;

const ConversorItauSispag = () => {
  const { toast } = useToast();
  const { empresaAtiva } = useEmpresaAtiva();
  const { conversoes, criarConversao, atualizarConversao, deletarConversao, isLoading: loadingConversoes } = useConversoes("itau-sispag");
  
  // Passo 1: Plano de contas
  const [planoContas, setPlanoContas] = useState<PlanoContasItem[]>([]);
  const [planoContasNome, setPlanoContasNome] = useState<string>("");
  const [loadingPlano, setLoadingPlano] = useState(false);
  const [planoPagina, setPlanoPagina] = useState(1);
  const [planoBusca, setPlanoBusca] = useState("");
  const planoInputRef = useRef<HTMLInputElement>(null);

  // Passo 2: Relatório Itaú
  const [relatorioItau, setRelatorioItau] = useState<ItauPagamentoItem[]>([]);
  const [relatorioNome, setRelatorioNome] = useState<string>("");
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const [relatorioPagina, setRelatorioPagina] = useState(1);
  const [relatorioBusca, setRelatorioBusca] = useState("");
  const relatorioInputRef = useRef<HTMLInputElement>(null);

  // Carregar plano de contas salvo
  useEffect(() => {
    const planoSalvo = conversoes.find(c => c.metadados && (c.metadados as any).tipo === "plano-contas");
    if (planoSalvo && planoSalvo.metadados) {
      const meta = planoSalvo.metadados as any;
      if (meta.dados && Array.isArray(meta.dados)) {
        setPlanoContas(meta.dados);
        setPlanoContasNome(planoSalvo.nome_arquivo_original);
      }
    }

    const relatorioSalvo = conversoes.find(c => c.metadados && (c.metadados as any).tipo === "relatorio-itau");
    if (relatorioSalvo && relatorioSalvo.metadados) {
      const meta = relatorioSalvo.metadados as any;
      if (meta.dados && Array.isArray(meta.dados)) {
        setRelatorioItau(meta.dados);
        setRelatorioNome(relatorioSalvo.nome_arquivo_original);
      }
    }
  }, [conversoes]);

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

  // Filtrar e paginar relatório Itaú
  const relatorioFiltrado = useMemo(() => {
    if (!relatorioBusca.trim()) return relatorioItau;
    const termo = relatorioBusca.toLowerCase();
    return relatorioItau.filter(
      (r) =>
        r.favorecido.toLowerCase().includes(termo) ||
        r.cpf_cnpj.includes(termo) ||
        r.tipo_pagamento.toLowerCase().includes(termo)
    );
  }, [relatorioItau, relatorioBusca]);

  const totalPaginasRelatorio = Math.ceil(relatorioFiltrado.length / ITEMS_PER_PAGE);
  const relatorioPaginado = useMemo(() => {
    const inicio = (relatorioPagina - 1) * ITEMS_PER_PAGE;
    return relatorioFiltrado.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [relatorioFiltrado, relatorioPagina]);

  // Upload e persistência do plano de contas
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
          "Arquivo carregado, mas não encontrei linhas do plano de contas. Verifique se ele contém as colunas Classificação/Código/Descrição/CNPJ."
        );
      }

      // Deletar plano anterior se existir
      const planoAnterior = conversoes.find(c => c.metadados && (c.metadados as any).tipo === "plano-contas");
      if (planoAnterior) {
        await deletarConversao.mutateAsync(planoAnterior);
      }

      // Salvar novo plano no banco
      const novaConversao = await criarConversao.mutateAsync({
        modulo: "itau-sispag",
        nomeArquivoOriginal: file.name,
      });

      await atualizarConversao.mutateAsync({
        id: novaConversao.id,
        status: "concluido",
        totalLinhas: items.length,
        linhasProcessadas: items.length,
        metadados: {
          tipo: "plano-contas",
          dados: items,
        },
      });

      setPlanoContas(items);
      setPlanoContasNome(file.name);
      setPlanoPagina(1);
      setPlanoBusca("");
      toast({
        title: "Plano de contas salvo",
        description: `${items.length} contas importadas e salvas com sucesso.`,
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

  // Remover plano de contas
  const handleRemoverPlano = async () => {
    const planoSalvo = conversoes.find(c => c.metadados && (c.metadados as any).tipo === "plano-contas");
    if (planoSalvo) {
      await deletarConversao.mutateAsync(planoSalvo);
    }
    setPlanoContas([]);
    setPlanoContasNome("");
    setPlanoPagina(1);
    setPlanoBusca("");
  };

  // Upload do relatório Itaú
  const handleRelatorioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingRelatorio(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      
      if (ext !== "xls" && ext !== "xlsx") {
        throw new Error("Formato não suportado. O relatório Itaú deve ser XLS ou XLSX.");
      }

      const items = await parseItauReportFromExcelFile(file);

      if (!items || items.length === 0) {
        throw new Error(
          "Arquivo carregado, mas não encontrei pagamentos. Verifique se é um relatório de consulta de pagamentos do Itaú."
        );
      }

      // Deletar relatório anterior se existir
      const relatorioAnterior = conversoes.find(c => c.metadados && (c.metadados as any).tipo === "relatorio-itau");
      if (relatorioAnterior) {
        await deletarConversao.mutateAsync(relatorioAnterior);
      }

      // Salvar novo relatório no banco
      const novaConversao = await criarConversao.mutateAsync({
        modulo: "itau-sispag",
        nomeArquivoOriginal: file.name,
      });

      await atualizarConversao.mutateAsync({
        id: novaConversao.id,
        status: "concluido",
        totalLinhas: items.length,
        linhasProcessadas: items.length,
        metadados: {
          tipo: "relatorio-itau",
          dados: items,
        },
      });

      setRelatorioItau(items);
      setRelatorioNome(file.name);
      setRelatorioPagina(1);
      setRelatorioBusca("");
      toast({
        title: "Relatório Itaú salvo",
        description: `${items.length} pagamentos importados e salvos com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar relatório",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoadingRelatorio(false);
      if (relatorioInputRef.current) {
        relatorioInputRef.current.value = "";
      }
    }
  };

  // Remover relatório Itaú
  const handleRemoverRelatorio = async () => {
    const relatorioSalvo = conversoes.find(c => c.metadados && (c.metadados as any).tipo === "relatorio-itau");
    if (relatorioSalvo) {
      await deletarConversao.mutateAsync(relatorioSalvo);
    }
    setRelatorioItau([]);
    setRelatorioNome("");
    setRelatorioPagina(1);
    setRelatorioBusca("");
  };

  const totalValorRelatorio = useMemo(() => {
    return relatorioItau.reduce((sum, r) => sum + r.valor, 0);
  }, [relatorioItau]);

  const getStatusBadge = (status: string) => {
    if (status.toLowerCase().includes("efetuado") && !status.toLowerCase().includes("não")) {
      return <Badge variant="default" className="bg-green-600 text-xs">Efetuado</Badge>;
    }
    return <Badge variant="destructive" className="text-xs">Não efetuado</Badge>;
  };

  if (loadingConversoes) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              <CardDescription>Carregue o plano de contas (XLS, XLSX ou CSV) - ficará salvo para uso futuro</CardDescription>
            </div>
            {planoContas.length > 0 && (
              <Badge variant="outline" className="border-green-500 text-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Salvo
              </Badge>
            )}
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
                onClick={handleRemoverPlano}
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

      {/* Passo 2: Relatório Itaú */}
      <Card className="border-blue-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Passo 2: Relatório do Banco</CardTitle>
              <CardDescription>Carregue o relatório de consulta de pagamentos do Itaú (XLS ou XLSX)</CardDescription>
            </div>
            {relatorioItau.length > 0 && (
              <Badge variant="outline" className="border-green-500 text-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Salvo
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                ref={relatorioInputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={handleRelatorioUpload}
                disabled={loadingRelatorio}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Arquivos suportados: XLS ou XLSX (Consulta de Pagamentos do Itaú)
              </p>
            </div>
            {relatorioItau.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleRemoverRelatorio}
                title="Remover relatório"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>

          {loadingRelatorio && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando relatório do banco...
            </div>
          )}

          {relatorioItau.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">{relatorioNome}</span>
                  <span className="text-xs text-muted-foreground">
                    ({relatorioItau.length} pagamentos)
                  </span>
                  <span className="text-xs font-semibold text-blue-500">
                    Total: {formatCurrency(totalValorRelatorio)}
                  </span>
                </div>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar favorecido ou CNPJ..."
                    value={relatorioBusca}
                    onChange={(e) => {
                      setRelatorioBusca(e.target.value);
                      setRelatorioPagina(1);
                    }}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Favorecido</TableHead>
                      <TableHead className="text-xs w-32">CPF/CNPJ</TableHead>
                      <TableHead className="text-xs w-36">Tipo</TableHead>
                      <TableHead className="text-xs w-24">Data</TableHead>
                      <TableHead className="text-xs w-28 text-right">Valor</TableHead>
                      <TableHead className="text-xs w-24 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorioPaginado.length > 0 ? (
                      relatorioPaginado.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/30">
                          <TableCell className="text-xs py-2">{item.favorecido}</TableCell>
                          <TableCell className="text-xs py-2 font-mono">{item.cpf_cnpj || "-"}</TableCell>
                          <TableCell className="text-xs py-2">{item.tipo_pagamento}</TableCell>
                          <TableCell className="text-xs py-2">{item.data_pagamento ? formatDate(item.data_pagamento) : "-"}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-mono">{formatCurrency(item.valor)}</TableCell>
                          <TableCell className="text-xs py-2 text-center">{getStatusBadge(item.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-4">
                          Nenhum pagamento encontrado para "{relatorioBusca}"
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPaginasRelatorio > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {((relatorioPagina - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(relatorioPagina * ITEMS_PER_PAGE, relatorioFiltrado.length)} de {relatorioFiltrado.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setRelatorioPagina(p => Math.max(1, p - 1))}
                      disabled={relatorioPagina === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      {Array.from({ length: Math.min(5, totalPaginasRelatorio) }, (_, i) => {
                        let pageNum: number;
                        if (totalPaginasRelatorio <= 5) {
                          pageNum = i + 1;
                        } else if (relatorioPagina <= 3) {
                          pageNum = i + 1;
                        } else if (relatorioPagina >= totalPaginasRelatorio - 2) {
                          pageNum = totalPaginasRelatorio - 4 + i;
                        } else {
                          pageNum = relatorioPagina - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={relatorioPagina === pageNum ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setRelatorioPagina(pageNum)}
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
                      onClick={() => setRelatorioPagina(p => Math.min(totalPaginasRelatorio, p + 1))}
                      disabled={relatorioPagina === totalPaginasRelatorio}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {relatorioItau.length === 0 && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Formato esperado
              </h4>
              <p className="text-sm text-muted-foreground">
                O arquivo deve ser exportado do Itaú (Consulta de Pagamentos - Modalidade Fornecedores) e conter as colunas:
                favorecido/beneficiário, CPF/CNPJ, tipo de pagamento, data do pagamento, valor e status.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversorItauSispag;
