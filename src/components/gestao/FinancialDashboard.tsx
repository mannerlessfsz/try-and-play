import { useMemo } from "react";
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { ParcelasAlertaWidget } from "./ParcelasAlertaWidget";
import type { Transacao } from "@/hooks/useTransacoes";
import type { ParcelasAlertaResult } from "@/hooks/useParcelasAlerta";

interface FinancialDashboardProps {
  transacoes: Transacao[];
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  pendentes: number;
  parcelasAlerta?: ParcelasAlertaResult;
  onVerTransacoes?: () => void;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function FinancialDashboard({
  transacoes,
  totalReceitas,
  totalDespesas,
  saldo,
  pendentes,
  parcelasAlerta,
  onVerTransacoes,
}: FinancialDashboardProps) {
  // Dados para gráfico de área (últimos 6 meses)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { name: string; receitas: number; despesas: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const receitas = transacoes
        .filter(t => {
          const tDate = new Date(t.data_transacao);
          return t.tipo === "receita" && 
                 tDate.getFullYear() === year && 
                 tDate.getMonth() + 1 === month;
        })
        .reduce((acc, t) => acc + Number(t.valor), 0);
      
      const despesas = transacoes
        .filter(t => {
          const tDate = new Date(t.data_transacao);
          return t.tipo === "despesa" && 
                 tDate.getFullYear() === year && 
                 tDate.getMonth() + 1 === month;
        })
        .reduce((acc, t) => acc + Number(t.valor), 0);
      
      months.push({ 
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1), 
        receitas, 
        despesas 
      });
    }
    
    return months;
  }, [transacoes]);

  // Dados para gráfico de pizza (por categoria)
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    
    transacoes
      .filter(t => t.tipo === "despesa")
      .forEach(t => {
        const catName = t.categoria?.nome || "Sem categoria";
        categories[catName] = (categories[catName] || 0) + Number(t.valor);
      });
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transacoes]);

  // Dados para gráfico de barras semanal
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: { name: string; valor: number }[] = [];
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const valor = transacoes
        .filter(t => {
          const tDate = new Date(t.data_transacao);
          return tDate >= weekStart && tDate <= weekEnd;
        })
        .reduce((acc, t) => {
          if (t.tipo === "receita") return acc + Number(t.valor);
          return acc - Number(t.valor);
        }, 0);
      
      weeks.push({ 
        name: `Sem ${4 - i}`, 
        valor 
      });
    }
    
    return weeks;
  }, [transacoes]);

  // Últimas transações
  const ultimasTransacoes = useMemo(() => {
    return transacoes.slice(0, 5);
  }, [transacoes]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-xl border border-border rounded-lg p-3 shadow-xl">
          <p className="text-sm font-medium text-foreground mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Alertas de Parcelas - Exibe antes dos cards se houver alertas */}
      {parcelasAlerta?.hasAlertas && (
        <ParcelasAlertaWidget
          parcelasVencendo={parcelasAlerta.parcelasVencendo}
          parcelasAtrasadas={parcelasAlerta.parcelasAtrasadas}
          totalValorVencendo={parcelasAlerta.totalValorVencendo}
          totalValorAtrasadas={parcelasAlerta.totalValorAtrasadas}
          onVerTransacoes={onVerTransacoes}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="text-xl font-bold text-green-400">{formatCurrency(totalReceitas)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(totalDespesas)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${saldo >= 0 ? 'from-blue-500/10 to-blue-600/5 border-blue-500/20' : 'from-orange-500/10 to-orange-600/5 border-orange-500/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-xl font-bold ${saldo >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                  {formatCurrency(saldo)}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${saldo >= 0 ? 'bg-blue-500/20' : 'bg-orange-500/20'}`}>
                <Wallet className={`w-5 h-5 ${saldo >= 0 ? 'text-blue-400' : 'text-orange-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold text-yellow-400">{pendentes}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <span className="text-lg">⏳</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Chart - Monthly Trend */}
        <Card className="bg-card/50 backdrop-blur-xl border-foreground/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fluxo Financeiro (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="receitas" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorReceitas)" 
                    name="Receitas"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="despesas" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorDespesas)" 
                    name="Despesas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Categories */}
        <Card className="bg-card/50 backdrop-blur-xl border-foreground/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend 
                      formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full text-center text-muted-foreground text-sm">
                  Sem dados de categorias
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Bar Chart */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-xl border-foreground/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resultado Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="valor" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Resultado"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-card/50 backdrop-blur-xl border-foreground/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Últimas Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ultimasTransacoes.length > 0 ? (
                ultimasTransacoes.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-foreground/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        t.tipo === "receita" ? "bg-green-500/20" : "bg-red-500/20"
                      }`}>
                        {t.tipo === "receita" ? (
                          <ArrowUpRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                          {t.descricao}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.data_transacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      t.tipo === "receita" ? "text-green-400" : "text-red-400"
                    }`}>
                      {t.tipo === "receita" ? "+" : "-"}{formatCurrency(t.valor)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Nenhuma transação
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
