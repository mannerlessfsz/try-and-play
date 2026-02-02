import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings2, ArrowLeft, ArrowRight, Search, CheckCircle, AlertCircle, 
  ChevronLeft, ChevronRight, Building2
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { type PlanoContasItem } from "@/utils/planoContasParser";
import { type ItauPagamentoItem } from "@/utils/itauReportParser";

const ITEMS_PER_PAGE = 50;

type FiltroStatus = "todos" | "vinculados" | "pendentes";

// Remove acentos e caracteres especiais
const removerAcentos = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C");
};

// Gera histórico formatado
const gerarHistorico = (favorecido: string): string => {
  const textoLimpo = removerAcentos(favorecido).toUpperCase();
  return `REFERENTE PAGAMENTO ${textoLimpo} (CONFORME RELATORIO PAGAMENTOS BANCO NESTE PERIODO)`;
};

export type LancamentoAjustado = {
  id: string;
  data: string;
  contaDebito: string;
  contaDebitoDescricao: string;
  contaCredito: string;
  valor: number;
  historico: string;
  lote: number;
  codigoEmpresa: string;
  favorecidoOriginal: string;
  vinculoAutomatico: boolean;
};

type Props = {
  lancamentosEfetuados: ItauPagamentoItem[];
  planoContas: PlanoContasItem[];
  competenciaMes: string;
  competenciaAno: string;
  onVoltar: () => void;
  onProsseguir: (lancamentos: LancamentoAjustado[], contaCredito: string, codigoEmpresa: string) => void;
};

const AjustarLancamentosStep = ({
  lancamentosEfetuados,
  planoContas,
  competenciaMes,
  competenciaAno,
  onVoltar,
  onProsseguir,
}: Props) => {
  const { toast } = useToast();
  
  // Estado global
  const [contaCredito, setContaCredito] = useState("");
  const [codigoEmpresa, setCodigoEmpresa] = useState("");
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  
  // Estado dos lançamentos ajustados
  const [lancamentosAjustados, setLancamentosAjustados] = useState<Map<string, string>>(() => new Map());

  // Busca conta no plano de contas pelo favorecido
  const buscarContaPorFavorecido = useCallback((favorecido: string, cnpj: string): PlanoContasItem | null => {
    const termoFavorecido = favorecido.toLowerCase().trim();
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    
    // Primeiro tenta buscar por CNPJ
    if (cnpjLimpo.length >= 11) {
      const porCnpj = planoContas.find(c => {
        const cnpjConta = c.cnpj.replace(/\D/g, "");
        return cnpjConta === cnpjLimpo;
      });
      if (porCnpj) return porCnpj;
    }
    
    // Depois tenta buscar por nome/descrição
    const porNome = planoContas.find(c => {
      const descricao = c.descricao.toLowerCase();
      return descricao.includes(termoFavorecido) || termoFavorecido.includes(descricao);
    });
    if (porNome) return porNome;
    
    // Busca parcial mais flexível
    const palavras = termoFavorecido.split(/\s+/).filter(p => p.length > 3);
    for (const palavra of palavras) {
      const parcial = planoContas.find(c => c.descricao.toLowerCase().includes(palavra));
      if (parcial) return parcial;
    }
    
    return null;
  }, [planoContas]);

  // Gera os lançamentos processados
  const lancamentosProcessados = useMemo(() => {
    return lancamentosEfetuados.map((item, index) => {
      const id = `${item.favorecido}-${item.data_pagamento}-${item.valor}-${index}`;
      const contaEncontrada = buscarContaPorFavorecido(item.favorecido, item.cpf_cnpj);
      const contaManual = lancamentosAjustados.get(id);
      
      const contaFinal = contaManual || contaEncontrada?.codigo || "";
      const descricaoFinal = contaManual 
        ? planoContas.find(c => c.codigo === contaManual)?.descricao || ""
        : contaEncontrada?.descricao || "";
      
      return {
        id,
        data: item.data_pagamento,
        contaDebito: contaFinal,
        contaDebitoDescricao: descricaoFinal,
        contaCredito: contaCredito,
        valor: item.valor,
        historico: gerarHistorico(item.favorecido),
        lote: index + 1,
        codigoEmpresa: codigoEmpresa,
        favorecidoOriginal: item.favorecido,
        vinculoAutomatico: !contaManual && !!contaEncontrada,
      } as LancamentoAjustado;
    });
  }, [lancamentosEfetuados, planoContas, contaCredito, codigoEmpresa, lancamentosAjustados, buscarContaPorFavorecido]);

  // Filtrar por status e busca
  const lancamentosFiltrados = useMemo(() => {
    let resultado = lancamentosProcessados;
    
    // Filtro por status
    if (filtroStatus === "vinculados") {
      resultado = resultado.filter(l => l.contaDebito);
    } else if (filtroStatus === "pendentes") {
      resultado = resultado.filter(l => !l.contaDebito);
    }
    
    // Filtro por busca
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      resultado = resultado.filter(
        (l) =>
          l.favorecidoOriginal.toLowerCase().includes(termo) ||
          l.contaDebito.includes(termo) ||
          l.contaDebitoDescricao.toLowerCase().includes(termo)
      );
    }
    
    return resultado;
  }, [lancamentosProcessados, busca, filtroStatus]);

  // Handler para clicar nos cards de filtro
  const handleFiltroClick = (novoFiltro: FiltroStatus) => {
    setFiltroStatus(prev => prev === novoFiltro ? "todos" : novoFiltro);
    setPagina(1);
  };

  const totalPaginas = Math.ceil(lancamentosFiltrados.length / ITEMS_PER_PAGE);
  const lancamentosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE;
    return lancamentosFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [lancamentosFiltrados, pagina]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    const vinculados = lancamentosProcessados.filter(l => l.contaDebito).length;
    const naoVinculados = lancamentosProcessados.length - vinculados;
    const valorTotal = lancamentosProcessados.reduce((sum, l) => sum + l.valor, 0);
    const valorVinculado = lancamentosProcessados.filter(l => l.contaDebito).reduce((sum, l) => sum + l.valor, 0);
    return { vinculados, naoVinculados, valorTotal, valorVinculado };
  }, [lancamentosProcessados]);

  // Atualizar conta débito manualmente
  const handleContaDebitoChange = (id: string, codigo: string) => {
    setLancamentosAjustados(prev => {
      const novo = new Map(prev);
      if (codigo) {
        novo.set(id, codigo);
      } else {
        novo.delete(id);
      }
      return novo;
    });
  };

  // Prosseguir para o Passo 4
  const handleProsseguir = () => {
    if (!codigoEmpresa.trim()) {
      toast({
        title: "Código da empresa obrigatório",
        description: "Preencha o código da empresa antes de prosseguir.",
        variant: "destructive",
      });
      return;
    }

    if (!contaCredito.trim()) {
      toast({
        title: "Conta crédito obrigatória",
        description: "Selecione a conta a crédito antes de prosseguir.",
        variant: "destructive",
      });
      return;
    }

    const naoVinculados = lancamentosProcessados.filter(l => !l.contaDebito);
    if (naoVinculados.length > 0) {
      toast({
        title: "Existem lançamentos sem vínculo",
        description: `${naoVinculados.length} lançamentos ainda não têm conta débito definida.`,
        variant: "destructive",
      });
      return;
    }

    onProsseguir(lancamentosProcessados, contaCredito, codigoEmpresa);
  };

  const MESES_LABEL: Record<string, string> = {
    "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
    "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
    "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
  };

  return (
    <Card className="border-amber-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Ajustar Lançamentos</CardTitle>
            <CardDescription>
              Competência: {MESES_LABEL[competenciaMes]}/{competenciaAno} • 
              Apenas lançamentos com status "Efetuado"
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            {lancamentosEfetuados.length} pagamentos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configurações Globais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Código da Empresa
            </Label>
            <Input
              placeholder="Ex: 001"
              value={codigoEmpresa}
              onChange={(e) => setCodigoEmpresa(e.target.value)}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">Será usado em todas as linhas</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Conta a Crédito (Banco)</Label>
            <Select value={contaCredito} onValueChange={setContaCredito}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione a conta do banco" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {planoContas.map((conta) => (
                  <SelectItem key={conta.codigo} value={conta.codigo}>
                    <span className="font-mono text-xs mr-2">{conta.codigo}</span>
                    <span className="text-xs">{conta.descricao}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Conta que sai o dinheiro (banco)</p>
          </div>
        </div>

        {/* Resumo com filtros clicáveis */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">Total Lançamentos</p>
            <p className="text-lg font-semibold">{lancamentosProcessados.length}</p>
          </div>
          <div 
            onClick={() => handleFiltroClick("vinculados")}
            className={cn(
              "p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02]",
              filtroStatus === "vinculados" 
                ? "bg-green-500/20 border-green-500 ring-2 ring-green-500/50" 
                : "bg-green-500/10 border-green-500/20 hover:border-green-500/40"
            )}
          >
            <p className="text-xs text-green-400">Vinculados</p>
            <p className="text-lg font-semibold text-green-500">{estatisticas.vinculados}</p>
            {filtroStatus === "vinculados" && (
              <p className="text-[10px] text-green-400 mt-1">✓ Filtro ativo</p>
            )}
          </div>
          <div 
            onClick={() => handleFiltroClick("pendentes")}
            className={cn(
              "p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02]",
              filtroStatus === "pendentes"
                ? "bg-red-500/20 border-red-500 ring-2 ring-red-500/50"
                : estatisticas.naoVinculados > 0 
                  ? "bg-red-500/10 border-red-500/20 hover:border-red-500/40" 
                  : "bg-muted/30 hover:bg-muted/50"
            )}
          >
            <p className={cn("text-xs", estatisticas.naoVinculados > 0 ? "text-red-400" : "text-muted-foreground")}>
              Pendentes
            </p>
            <p className={cn("text-lg font-semibold", estatisticas.naoVinculados > 0 && "text-red-500")}>
              {estatisticas.naoVinculados}
            </p>
            {filtroStatus === "pendentes" && (
              <p className="text-[10px] text-red-400 mt-1">✓ Filtro ativo</p>
            )}
          </div>
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground">Valor Total</p>
            <p className="text-lg font-semibold">{formatCurrency(estatisticas.valorTotal)}</p>
          </div>
        </div>

        {/* Indicador de filtro ativo */}
        {filtroStatus !== "todos" && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className={cn(
              filtroStatus === "vinculados" ? "border-green-500 text-green-500" : "border-red-500 text-red-500"
            )}>
              Mostrando: {filtroStatus === "vinculados" ? "Vinculados" : "Pendentes"}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setFiltroStatus("todos")}
              className="h-6 text-xs"
            >
              Limpar filtro
            </Button>
          </div>
        )}

        {/* Status message */}
        <div className="flex items-center justify-end text-xs text-muted-foreground">
          {estatisticas.naoVinculados > 0 ? (
            <span className="text-red-500">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Vincule todas as contas para prosseguir
            </span>
          ) : !contaCredito ? (
            <span className="text-amber-500">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Selecione a conta crédito
            </span>
          ) : !codigoEmpresa ? (
            <span className="text-amber-500">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Preencha o código da empresa
            </span>
          ) : (
            <span className="text-green-500">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Pronto para prosseguir
            </span>
          )}
        </div>
        {/* Busca */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar favorecido ou conta..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs w-10">#</TableHead>
                <TableHead className="text-xs w-24">Data</TableHead>
                <TableHead className="text-xs">Favorecido</TableHead>
                <TableHead className="text-xs w-48">Conta Débito</TableHead>
                <TableHead className="text-xs w-24 text-right">Valor</TableHead>
                <TableHead className="text-xs w-20 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentosPaginados.length > 0 ? (
                lancamentosPaginados.map((item) => (
                  <TableRow key={item.id} className={cn(
                    "hover:bg-muted/30",
                    !item.contaDebito && "bg-red-500/5"
                  )}>
                    <TableCell className="text-xs py-2 font-mono text-muted-foreground">
                      {item.lote}
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      {item.data ? formatDate(item.data) : "-"}
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      <div>
                        <p className="font-medium truncate max-w-[200px]" title={item.favorecidoOriginal}>
                          {item.favorecidoOriginal}
                        </p>
                        <p className="text-muted-foreground text-[10px] truncate max-w-[280px]" title={item.historico}>
                          {item.historico}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      <Select 
                        value={item.contaDebito} 
                        onValueChange={(v) => handleContaDebitoChange(item.id, v)}
                      >
                        <SelectTrigger className={cn(
                          "h-8 text-xs",
                          !item.contaDebito && "border-red-500 bg-red-500/10"
                        )}>
                          <SelectValue placeholder="Selecionar conta..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {planoContas.map((conta) => (
                            <SelectItem key={conta.codigo} value={conta.codigo}>
                              <span className="font-mono text-xs mr-2">{conta.codigo}</span>
                              <span className="text-xs truncate">{conta.descricao}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.contaDebitoDescricao && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {item.contaDebitoDescricao}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right font-mono">
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-center">
                      {item.contaDebito ? (
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          item.vinculoAutomatico 
                            ? "border-blue-500 text-blue-500" 
                            : "border-green-500 text-green-500"
                        )}>
                          {item.vinculoAutomatico ? "Auto" : "Manual"}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    {lancamentosEfetuados.length === 0 
                      ? "Nenhum lançamento com status 'Efetuado' encontrado"
                      : "Nenhum resultado para a busca"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {((pagina - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(pagina * ITEMS_PER_PAGE, lancamentosFiltrados.length)} de {lancamentosFiltrados.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2 text-sm">{pagina}/{totalPaginas}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar: Relatório do Banco
          </Button>
          <Button 
            onClick={handleProsseguir} 
            disabled={estatisticas.naoVinculados > 0 || !contaCredito || !codigoEmpresa}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Próximo: Gerar CSV
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AjustarLancamentosStep;
