import { useState, useMemo } from "react";
import { 
  BarChart3, PieChart, TrendingUp, FileText, Download, 
  DollarSign, Calendar, ArrowUpRight, ArrowDownRight,
  Wallet, Receipt, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTransacoes, Transacao } from "@/hooks/useTransacoes";
import { useCategorias } from "@/hooks/useCategorias";
import { useContasBancarias } from "@/hooks/useContasBancarias";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from "recharts";

interface RelatoriosManagerProps {
  empresaId: string;
}

interface ReportCard {
  id: string;
  nome: string;
  descricao: string;
  icon: React.ElementType;
  color: string;
}

const RELATORIOS: ReportCard[] = [
  { id: "fluxo-caixa", nome: "Fluxo de Caixa", descricao: "Entradas e saídas por período", icon: TrendingUp, color: "blue" },
  { id: "dre", nome: "DRE Simplificada", descricao: "Demonstração de Resultado", icon: FileText, color: "green" },
  { id: "categorias", nome: "Por Categoria", descricao: "Despesas e receitas por categoria", icon: PieChart, color: "purple" },
  { id: "contas", nome: "Por Conta", descricao: "Movimentação por conta bancária", icon: Wallet, color: "cyan" },
  { id: "pendentes", nome: "Pendências", descricao: "Contas a pagar e receber", icon: Receipt, color: "yellow" },
];

const MESES = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" }, { value: 3, label: "Março" },
  { value: 4, label: "Abril" }, { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" }, { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" }, { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const getColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
    green: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
    cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
    yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  };
  return colors[color] || colors.blue;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function RelatoriosManager({ empresaId }: RelatoriosManagerProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const currentDate = new Date();
  const [mes, setMes] = useState<number>(currentDate.getMonth() + 1);
  const [ano, setAno] = useState<number>(currentDate.getFullYear());

  const anos = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  // Build date range for filtering
  const dataInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(ano, mes, 0).getDate();
  const dataFim = `${ano}-${mes.toString().padStart(2, '0')}-${lastDay}`;

  const { transacoes, isLoading } = useTransacoes(empresaId, { dataInicio, dataFim });
  const { categorias } = useCategorias(empresaId);
  const { contas } = useContasBancarias(empresaId);

  // Calculate metrics
  const metrics = useMemo(() => {
    const receitas = transacoes.filter(t => t.tipo === "receita");
    const despesas = transacoes.filter(t => t.tipo === "despesa");
    
    // Total geral (todas as transações, independente do status)
    const totalReceitas = receitas.reduce((acc, t) => acc + Number(t.valor), 0);
    const totalDespesas = despesas.reduce((acc, t) => acc + Number(t.valor), 0);
    const saldo = totalReceitas - totalDespesas;
    
    // Totais pagos (confirmados)
    const receitasPagas = receitas.filter(t => t.status === "pago").reduce((acc, t) => acc + Number(t.valor), 0);
    const despesasPagas = despesas.filter(t => t.status === "pago").reduce((acc, t) => acc + Number(t.valor), 0);
    
    // Pendentes
    const receitasPendentes = receitas.filter(t => t.status === "pendente").reduce((acc, t) => acc + Number(t.valor), 0);
    const despesasPendentes = despesas.filter(t => t.status === "pendente").reduce((acc, t) => acc + Number(t.valor), 0);

    return { totalReceitas, totalDespesas, saldo, receitasPagas, despesasPagas, receitasPendentes, despesasPendentes, receitas, despesas };
  }, [transacoes]);

  // Categories breakdown
  const categoriaData = useMemo(() => {
    const receitasPorCategoria: Record<string, number> = {};
    const despesasPorCategoria: Record<string, number> = {};

    transacoes.forEach(t => {
      const catNome = t.categoria?.nome || "Sem categoria";
      if (t.tipo === "receita" && t.status === "pago") {
        receitasPorCategoria[catNome] = (receitasPorCategoria[catNome] || 0) + Number(t.valor);
      } else if (t.tipo === "despesa" && t.status === "pago") {
        despesasPorCategoria[catNome] = (despesasPorCategoria[catNome] || 0) + Number(t.valor);
      }
    });

    return {
      receitas: Object.entries(receitasPorCategoria).map(([name, value]) => ({ name, value })),
      despesas: Object.entries(despesasPorCategoria).map(([name, value]) => ({ name, value })),
    };
  }, [transacoes]);

  // Contas breakdown
  const contaData = useMemo(() => {
    const porConta: Record<string, { receitas: number; despesas: number }> = {};

    transacoes.forEach(t => {
      const contaNome = t.conta_bancaria?.nome || "Sem conta";
      if (!porConta[contaNome]) porConta[contaNome] = { receitas: 0, despesas: 0 };
      
      if (t.status === "pago") {
        if (t.tipo === "receita") porConta[contaNome].receitas += Number(t.valor);
        else porConta[contaNome].despesas += Number(t.valor);
      }
    });

    return Object.entries(porConta).map(([name, data]) => ({
      name,
      receitas: data.receitas,
      despesas: data.despesas,
      saldo: data.receitas - data.despesas,
    }));
  }, [transacoes]);

  // Daily cash flow
  const fluxoDiario = useMemo(() => {
    const porDia: Record<string, { receitas: number; despesas: number }> = {};

    transacoes.forEach(t => {
      const dia = t.data_transacao;
      if (!porDia[dia]) porDia[dia] = { receitas: 0, despesas: 0 };
      
      if (t.status === "pago") {
        if (t.tipo === "receita") porDia[dia].receitas += Number(t.valor);
        else porDia[dia].despesas += Number(t.valor);
      }
    });

    return Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, values]) => ({
        data: new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        receitas: values.receitas,
        despesas: values.despesas,
        saldo: values.receitas - values.despesas,
      }));
  }, [transacoes]);

  // Pendencias
  const pendencias = useMemo(() => {
    return transacoes
      .filter(t => t.status === "pendente")
      .sort((a, b) => (a.data_vencimento || a.data_transacao).localeCompare(b.data_vencimento || b.data_transacao));
  }, [transacoes]);

  const selectedReportData = RELATORIOS.find(r => r.id === selectedReport);

  const renderReportContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      );
    }

    if (!selectedReport) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Selecione um Relatório</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Escolha um tipo de relatório na lista à esquerda para visualizar os dados.
          </p>
        </div>
      );
    }

    const colors = getColorClasses(selectedReportData?.color || "blue");
    const Icon = selectedReportData?.icon || BarChart3;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${colors.text}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{selectedReportData?.nome}</h3>
              <p className="text-xs text-muted-foreground">
                {MESES.find(m => m.value === mes)?.label} de {ano}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        {selectedReport === "fluxo-caixa" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-green-500/30 border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-xs font-medium">Entradas</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.totalReceitas)}</p>
                </CardContent>
              </Card>
              <Card className="border-red-500/30 border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <ArrowDownRight className="w-4 h-4" />
                    <span className="text-xs font-medium">Saídas</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.totalDespesas)}</p>
                </CardContent>
              </Card>
              <Card className={`border ${metrics.saldo >= 0 ? 'border-blue-500/30' : 'border-red-500/30'}`}>
                <CardContent className="p-4">
                  <div className={`flex items-center gap-2 ${metrics.saldo >= 0 ? 'text-blue-400' : 'text-red-400'} mb-2`}>
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Saldo</span>
                  </div>
                  <p className={`text-2xl font-bold ${metrics.saldo >= 0 ? 'text-foreground' : 'text-red-400'}`}>
                    {formatCurrency(metrics.saldo)}
                  </p>
                </CardContent>
              </Card>
            </div>
            {fluxoDiario.length > 0 ? (
              <Card className="border-border/30">
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={fluxoDiario}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="data" stroke="#888" fontSize={11} />
                      <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Area type="monotone" dataKey="receitas" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Receitas" />
                      <Area type="monotone" dataKey="despesas" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Despesas" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/30">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nenhuma transação no período selecionado
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {selectedReport === "dre" && (
          <Card className="border-border/30">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="font-medium text-green-400">Receita Bruta</span>
                <span className="text-foreground">{formatCurrency(metrics.totalReceitas)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30 pl-4">
                <span className="text-muted-foreground">(-) Deduções</span>
                <span className="text-red-400">R$ 0,00</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="font-medium text-foreground">Receita Líquida</span>
                <span className="text-foreground">{formatCurrency(metrics.totalReceitas)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30 pl-4">
                <span className="text-muted-foreground">(-) Custos Operacionais</span>
                <span className="text-red-400">{formatCurrency(metrics.totalDespesas)}</span>
              </div>
              <div className="flex justify-between py-3 bg-blue-500/10 rounded-lg px-3 mt-4">
                <span className="font-bold text-blue-400">Resultado Líquido</span>
                <span className={`font-bold ${metrics.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(metrics.saldo)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedReport === "categorias" && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                  Receitas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoriaData.receitas.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie
                        data={categoriaData.receitas}
                        cx="50%" cy="50%"
                        innerRadius={40} outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {categoriaData.receitas.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Nenhuma receita no período
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                  Despesas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoriaData.despesas.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie
                        data={categoriaData.despesas}
                        cx="50%" cy="50%"
                        innerRadius={40} outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {categoriaData.despesas.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Nenhuma despesa no período
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {selectedReport === "contas" && (
          <Card className="border-border/30">
            <CardContent className="p-4">
              {contaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#888" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" stroke="#888" fontSize={11} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhuma movimentação no período
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedReport === "pendentes" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-green-500/30 border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-xs font-medium">A Receber</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.receitasPendentes)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.receitas.filter(t => t.status === "pendente").length} pendências
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-500/30 border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <ArrowDownRight className="w-4 h-4" />
                    <span className="text-xs font-medium">A Pagar</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.despesasPendentes)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.despesas.filter(t => t.status === "pendente").length} pendências
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {pendencias.length > 0 ? (
              <Card className="border-border/30">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-3 font-medium">Descrição</th>
                        <th className="text-left p-3 font-medium">Vencimento</th>
                        <th className="text-left p-3 font-medium">Tipo</th>
                        <th className="text-right p-3 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {pendencias.slice(0, 10).map(t => (
                        <tr key={t.id} className="hover:bg-muted/20">
                          <td className="p-3">{t.descricao}</td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(t.data_vencimento || t.data_transacao).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${t.tipo === 'receita' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {t.tipo === 'receita' ? 'Receber' : 'Pagar'}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-medium ${t.tipo === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(Number(t.valor))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/30">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nenhuma pendência no período
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4">
      {/* Left sidebar - Report cards */}
      <div className="w-48 flex-shrink-0 space-y-2">
        {/* Period selector */}
        <Card className="border-blue-500/20">
          <CardContent className="p-2 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-medium text-blue-400">
              <Calendar className="w-3 h-3" />
              Período
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label.slice(0, 3)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={a.toString()}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Report type cards */}
        {RELATORIOS.map((report) => {
          const colors = getColorClasses(report.color);
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;

          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`w-full p-2 rounded-lg border text-left transition-all ${
                isSelected 
                  ? `${colors.bg} ${colors.border} border-2` 
                  : "bg-card/50 border-border/30 hover:bg-card"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                </div>
                <div>
                  <p className={`text-xs font-medium ${isSelected ? colors.text : 'text-foreground'}`}>
                    {report.nome}
                  </p>
                  <p className="text-[9px] text-muted-foreground leading-tight">
                    {report.descricao}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main content - Report display */}
      <div className="flex-1 bg-card/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-6 min-h-[500px]">
        {renderReportContent()}
      </div>
    </div>
  );
}