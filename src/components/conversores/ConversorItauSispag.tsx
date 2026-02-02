import { useState, useRef, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useConversoes } from "@/hooks/useConversoes";
import { 
  Loader2, CheckCircle, FileSpreadsheet, Trash2, ChevronLeft, ChevronRight, 
  Search, Building2, AlertCircle, ArrowRight, ArrowLeft, Settings2, Calendar
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  parsePlanoContasFromCsvFile,
  parsePlanoContasFromExcelFile,
  type PlanoContasItem,
} from "@/utils/planoContasParser";
import {
  parseItauReportFromExcelFile,
  type ItauPagamentoItem,
} from "@/utils/itauReportParser";
import AjustarLancamentosStep from "./AjustarLancamentosStep";

const ITEMS_PER_PAGE = 15;

type Step = 1 | 2 | 3;

const steps = [
  { id: 1, title: "Plano de Contas", description: "Carregue o plano de contas", icon: FileSpreadsheet },
  { id: 2, title: "Relatório do Banco", description: "Importe os pagamentos", icon: Building2 },
  { id: 3, title: "Ajustar Lançamentos", description: "Vincule às contas", icon: Settings2 },
] as const;

const MESES = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

// Gera anos de 2020 até o ano atual + 1
const ANOS = Array.from({ length: new Date().getFullYear() - 2020 + 2 }, (_, i) => (2020 + i).toString());

const ConversorItauSispag = () => {
  const { toast } = useToast();
  const { empresaAtiva } = useEmpresaAtiva();
  const { conversoes, criarConversao, atualizarConversao, deletarConversao, isLoading: loadingConversoes } = useConversoes("itau-sispag");
  
  const [currentStep, setCurrentStep] = useState<Step>(1);

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
  
  // Competência
  const currentDate = new Date();
  const [competenciaMes, setCompetenciaMes] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, "0"));
  const [competenciaAno, setCompetenciaAno] = useState<string>(String(currentDate.getFullYear()));

  // Carregar dados salvos
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

  // Função para verificar se a data está dentro da competência
  const isDataDentroCompetencia = (dataStr: string): boolean => {
    if (!dataStr) return false;
    const [ano, mes] = dataStr.split("-");
    return ano === competenciaAno && mes === competenciaMes;
  };

  // Separar lançamentos por competência
  const { lancamentosDentro, lancamentosForaCompetencia } = useMemo(() => {
    const dentro: ItauPagamentoItem[] = [];
    const fora: ItauPagamentoItem[] = [];
    
    relatorioItau.forEach(item => {
      if (isDataDentroCompetencia(item.data_pagamento)) {
        dentro.push(item);
      } else {
        fora.push(item);
      }
    });
    
    return { lancamentosDentro: dentro, lancamentosForaCompetencia: fora };
  }, [relatorioItau, competenciaMes, competenciaAno]);

  // Filtrar apenas lançamentos com status "efetuado" para o Passo 3
  const lancamentosEfetuados = useMemo(() => {
    return lancamentosDentro.filter(item => {
      const status = item.status.toLowerCase();
      return status.includes("efetuado") && !status.includes("não");
    });
  }, [lancamentosDentro]);

  // Agrupar lançamentos fora da competência por mês/ano
  const lancamentosForaAgrupados = useMemo(() => {
    const grupos: Record<string, { competencia: string; items: ItauPagamentoItem[]; total: number }> = {};
    
    lancamentosForaCompetencia.forEach(item => {
      if (!item.data_pagamento) return;
      const [ano, mes] = item.data_pagamento.split("-");
      const key = `${ano}-${mes}`;
      const mesNome = MESES.find(m => m.value === mes)?.label || mes;
      
      if (!grupos[key]) {
        grupos[key] = { competencia: `${mesNome}/${ano}`, items: [], total: 0 };
      }
      grupos[key].items.push(item);
      grupos[key].total += item.valor;
    });
    
    return Object.values(grupos).sort((a, b) => {
      const [mesA, anoA] = a.competencia.split("/");
      const [mesB, anoB] = b.competencia.split("/");
      if (anoA !== anoB) return anoB.localeCompare(anoA);
      return mesB.localeCompare(mesA);
    });
  }, [lancamentosForaCompetencia]);

  // Filtrar e paginar relatório Itaú (somente dentro da competência)
  const relatorioFiltrado = useMemo(() => {
    const base = lancamentosDentro;
    if (!relatorioBusca.trim()) return base;
    const termo = relatorioBusca.toLowerCase();
    return base.filter(
      (r) =>
        r.favorecido.toLowerCase().includes(termo) ||
        r.cpf_cnpj.includes(termo) ||
        r.tipo_pagamento.toLowerCase().includes(termo)
    );
  }, [lancamentosDentro, relatorioBusca]);

  const totalPaginasRelatorio = Math.ceil(relatorioFiltrado.length / ITEMS_PER_PAGE);
  const relatorioPaginado = useMemo(() => {
    const inicio = (relatorioPagina - 1) * ITEMS_PER_PAGE;
    return relatorioFiltrado.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [relatorioFiltrado, relatorioPagina]);

  // Upload do plano de contas
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
        throw new Error("Arquivo carregado, mas não encontrei linhas do plano de contas.");
      }

      const planoAnterior = conversoes.find(c => c.metadados && (c.metadados as any).tipo === "plano-contas");
      if (planoAnterior) {
        await deletarConversao.mutateAsync(planoAnterior);
      }

      const novaConversao = await criarConversao.mutateAsync({
        modulo: "itau-sispag",
        nomeArquivoOriginal: file.name,
      });

      await atualizarConversao.mutateAsync({
        id: novaConversao.id,
        status: "concluido",
        totalLinhas: items.length,
        linhasProcessadas: items.length,
        metadados: { tipo: "plano-contas", dados: items },
      });

      setPlanoContas(items);
      setPlanoContasNome(file.name);
      setPlanoPagina(1);
      setPlanoBusca("");
      toast({
        title: "Plano de contas salvo",
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
      if (planoInputRef.current) planoInputRef.current.value = "";
    }
  };

  const handleRemoverPlano = async () => {
    const planoSalvo = conversoes.find(c => c.metadados && (c.metadados as any).tipo === "plano-contas");
    if (planoSalvo) await deletarConversao.mutateAsync(planoSalvo);
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
        throw new Error("Arquivo carregado, mas não encontrei pagamentos.");
      }

      const relatorioAnterior = conversoes.find(c => c.metadados && (c.metadados as any).tipo === "relatorio-itau");
      if (relatorioAnterior) await deletarConversao.mutateAsync(relatorioAnterior);

      const novaConversao = await criarConversao.mutateAsync({
        modulo: "itau-sispag",
        nomeArquivoOriginal: file.name,
      });

      await atualizarConversao.mutateAsync({
        id: novaConversao.id,
        status: "concluido",
        totalLinhas: items.length,
        linhasProcessadas: items.length,
        metadados: { tipo: "relatorio-itau", dados: items },
      });

      setRelatorioItau(items);
      setRelatorioNome(file.name);
      setRelatorioPagina(1);
      setRelatorioBusca("");
      toast({
        title: "Relatório Itaú salvo",
        description: `${items.length} pagamentos importados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar relatório",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoadingRelatorio(false);
      if (relatorioInputRef.current) relatorioInputRef.current.value = "";
    }
  };

  const handleRemoverRelatorio = async () => {
    const relatorioSalvo = conversoes.find(c => c.metadados && (c.metadados as any).tipo === "relatorio-itau");
    if (relatorioSalvo) await deletarConversao.mutateAsync(relatorioSalvo);
    setRelatorioItau([]);
    setRelatorioNome("");
    setRelatorioPagina(1);
    setRelatorioBusca("");
  };

  const totalValorRelatorio = useMemo(() => relatorioItau.reduce((sum, r) => sum + r.valor, 0), [relatorioItau]);
  const totalValorCompetencia = useMemo(() => lancamentosDentro.reduce((sum, r) => sum + r.valor, 0), [lancamentosDentro]);
  const totalValorFora = useMemo(() => lancamentosForaCompetencia.reduce((sum, r) => sum + r.valor, 0), [lancamentosForaCompetencia]);

  const getStatusBadge = (status: string) => {
    if (status.toLowerCase().includes("efetuado") && !status.toLowerCase().includes("não")) {
      return <Badge variant="default" className="bg-green-600 text-xs">Efetuado</Badge>;
    }
    return <Badge variant="destructive" className="text-xs">Não efetuado</Badge>;
  };

  const canProceedToStep = (step: Step): boolean => {
    if (step === 2) return planoContas.length > 0;
    if (step === 3) return planoContas.length > 0 && lancamentosEfetuados.length > 0;
    return true;
  };

  const goToStep = (step: Step) => {
    if (canProceedToStep(step)) setCurrentStep(step);
  };

  if (loadingConversoes) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stepper Header */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = 
              (step.id === 1 && planoContas.length > 0) ||
              (step.id === 2 && relatorioItau.length > 0);
            const isAccessible = canProceedToStep(step.id as Step);

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => goToStep(step.id as Step)}
                  disabled={!isAccessible}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                    isActive && "bg-primary text-primary-foreground shadow-lg scale-105",
                    !isActive && isCompleted && "bg-green-500/20 text-green-500 hover:bg-green-500/30",
                    !isActive && !isCompleted && isAccessible && "bg-muted hover:bg-muted/80",
                    !isAccessible && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isActive && "bg-primary-foreground/20",
                    !isActive && isCompleted && "bg-green-500/20",
                    !isActive && !isCompleted && "bg-background"
                  )}>
                    {isCompleted && !isActive ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs opacity-70">{step.description}</p>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <ArrowRight className={cn(
                    "w-5 h-5 mx-2",
                    isCompleted ? "text-green-500" : "text-muted-foreground/30"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Plano de Contas */}
      {currentStep === 1 && (
        <Card className="border-purple-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Plano de Contas</CardTitle>
                <CardDescription>Carregue o plano de contas (XLS, XLSX ou CSV) - ficará salvo permanentemente</CardDescription>
              </div>
              {planoContas.length > 0 && (
                <Badge variant="outline" className="border-green-500 text-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Carregado
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
                <p className="text-xs text-muted-foreground mt-1">Arquivos suportados: XLS, XLSX ou CSV</p>
              </div>
              {planoContas.length > 0 && (
                <Button variant="ghost" size="icon" onClick={handleRemoverPlano} title="Remover">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>

            {loadingPlano && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando...
              </div>
            )}

            {planoContas.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">{planoContasNome}</span>
                    <span className="text-xs text-muted-foreground">({planoContas.length} contas)</span>
                  </div>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={planoBusca}
                      onChange={(e) => { setPlanoBusca(e.target.value); setPlanoPagina(1); }}
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
                            Nenhuma conta encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {totalPaginasPlano > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      {((planoPagina - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(planoPagina * ITEMS_PER_PAGE, planoContasFiltrado.length)} de {planoContasFiltrado.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPlanoPagina(p => Math.max(1, p - 1))} disabled={planoPagina === 1}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="px-2 text-sm">{planoPagina}/{totalPaginasPlano}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPlanoPagina(p => Math.min(totalPaginasPlano, p + 1))} disabled={planoPagina === totalPaginasPlano}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => goToStep(2)} disabled={!canProceedToStep(2)}>
                Próximo: Relatório do Banco
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Relatório Itaú */}
      {currentStep === 2 && (
        <Card className="border-blue-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Relatório do Banco</CardTitle>
                <CardDescription>Carregue o relatório de consulta de pagamentos do Itaú (XLS ou XLSX)</CardDescription>
              </div>
              {relatorioItau.length > 0 && (
                <Badge variant="outline" className="border-green-500 text-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Carregado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Competência Selector */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-400" />
                <Label className="font-medium text-blue-400">Competência</Label>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 max-w-[160px]">
                  <Select value={competenciaMes} onValueChange={setCompetenciaMes}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map(mes => (
                        <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 max-w-[120px]">
                  <Select value={competenciaAno} onValueChange={setCompetenciaAno}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {ANOS.map(ano => (
                        <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-sm text-muted-foreground">
                  Período: 01/{competenciaMes}/{competenciaAno} a {new Date(Number(competenciaAno), Number(competenciaMes), 0).getDate()}/{competenciaMes}/{competenciaAno}
                </span>
              </div>
            </div>

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
                <p className="text-xs text-muted-foreground mt-1">Arquivos suportados: XLS ou XLSX</p>
              </div>
              {relatorioItau.length > 0 && (
                <Button variant="ghost" size="icon" onClick={handleRemoverRelatorio} title="Remover">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>

            {loadingRelatorio && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando...
              </div>
            )}

            {relatorioItau.length > 0 && (
              <div className="space-y-4">
                {/* Resumo por Competência */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Total do Arquivo</p>
                    <p className="text-lg font-semibold">{formatCurrency(totalValorRelatorio)}</p>
                    <p className="text-xs text-muted-foreground">{relatorioItau.length} lançamentos</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-xs text-green-400">Competência {MESES.find(m => m.value === competenciaMes)?.label}/{competenciaAno}</p>
                    <p className="text-lg font-semibold text-green-500">{formatCurrency(totalValorCompetencia)}</p>
                    <p className="text-xs text-green-400">{lancamentosDentro.length} lançamentos</p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-blue-400">Efetuados (para Ajuste)</p>
                    <p className="text-lg font-semibold text-blue-500">{lancamentosEfetuados.length}</p>
                    <p className="text-xs text-blue-400">serão processados</p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    lancamentosForaCompetencia.length > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-muted/30"
                  )}>
                    <p className={cn("text-xs", lancamentosForaCompetencia.length > 0 ? "text-amber-400" : "text-muted-foreground")}>
                      Fora da Competência
                    </p>
                    <p className={cn("text-lg font-semibold", lancamentosForaCompetencia.length > 0 && "text-amber-500")}>
                      {formatCurrency(totalValorFora)}
                    </p>
                    <p className={cn("text-xs", lancamentosForaCompetencia.length > 0 ? "text-amber-400" : "text-muted-foreground")}>
                      {lancamentosForaCompetencia.length} lançamentos
                    </p>
                  </div>
                </div>

                {/* Alerta de Lançamentos Fora da Competência */}
                {lancamentosForaCompetencia.length > 0 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <h4 className="font-medium text-amber-400 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Lançamentos fora da competência selecionada
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Foram encontrados {lancamentosForaCompetencia.length} lançamentos com datas fora de {MESES.find(m => m.value === competenciaMes)?.label}/{competenciaAno}. 
                      Esses lançamentos devem ser processados em suas respectivas competências.
                    </p>
                    <div className="space-y-2">
                      {lancamentosForaAgrupados.map(grupo => (
                        <div key={grupo.competencia} className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span className="text-sm font-medium">{grupo.competencia}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">{grupo.items.length} lançamentos</span>
                            <span className="text-sm font-semibold text-amber-500">{formatCurrency(grupo.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabela de Lançamentos da Competência */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Lançamentos de {MESES.find(m => m.value === competenciaMes)?.label}/{competenciaAno}
                      </span>
                      <Badge variant="secondary" className="text-xs">{lancamentosDentro.length}</Badge>
                    </div>
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={relatorioBusca}
                        onChange={(e) => { setRelatorioBusca(e.target.value); setRelatorioPagina(1); }}
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
                              {lancamentosDentro.length === 0 
                                ? `Nenhum lançamento na competência ${MESES.find(m => m.value === competenciaMes)?.label}/${competenciaAno}`
                                : "Nenhum resultado para a busca"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPaginasRelatorio > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">
                        {((relatorioPagina - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(relatorioPagina * ITEMS_PER_PAGE, relatorioFiltrado.length)} de {relatorioFiltrado.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRelatorioPagina(p => Math.max(1, p - 1))} disabled={relatorioPagina === 1}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="px-2 text-sm">{relatorioPagina}/{totalPaginasRelatorio}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRelatorioPagina(p => Math.min(totalPaginasRelatorio, p + 1))} disabled={relatorioPagina === totalPaginasRelatorio}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {relatorioItau.length === 0 && (
              <div className="p-4 bg-muted/30 border border-dashed rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  Formato esperado
                </h4>
                <p className="text-sm text-muted-foreground">
                  O arquivo deve ser exportado do Itaú (Consulta de Pagamentos - Modalidade Fornecedores).
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => goToStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar: Plano de Contas
              </Button>
              <Button onClick={() => goToStep(3)} disabled={!canProceedToStep(3) || lancamentosEfetuados.length === 0}>
                Próximo: Ajustar Lançamentos ({lancamentosEfetuados.length} efetuados)
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Ajustar Lançamentos */}
      {currentStep === 3 && (
        <AjustarLancamentosStep
          lancamentosEfetuados={lancamentosEfetuados}
          planoContas={planoContas}
          competenciaMes={competenciaMes}
          competenciaAno={competenciaAno}
          onVoltar={() => goToStep(2)}
        />
      )}
    </div>
  );
};

export default ConversorItauSispag;
