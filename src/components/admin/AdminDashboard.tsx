import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Building2, 
  Shield, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  FileText,
  CheckSquare,
  Loader2,
  Activity,
  BarChart3,
  PieChart
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DashboardMetric {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

export function AdminDashboard() {
  // Users count
  const { data: usersData } = useQuery({
    queryKey: ['admin-dashboard-users'],
    queryFn: async () => {
      const { count: total } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: active } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('ativo', true);
      return { total: total || 0, active: active || 0 };
    }
  });

  // Empresas count
  const { data: empresasData } = useQuery({
    queryKey: ['admin-dashboard-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_empresas_safe');
      if (error) throw error;
      return { total: (data || []).length };
    }
  });

  // Financial summary (all companies)
  const { data: financialData } = useQuery({
    queryKey: ['admin-dashboard-financial'],
    queryFn: async () => {
      const currentMonth = new Date();
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('tipo, valor, status')
        .gte('data_transacao', firstDay)
        .lte('data_transacao', lastDay);
      
      let receitas = 0;
      let despesas = 0;
      let pendentes = 0;
      
      (transacoes || []).forEach(t => {
        if (t.tipo === 'receita') {
          receitas += Number(t.valor) || 0;
        } else if (t.tipo === 'despesa') {
          despesas += Number(t.valor) || 0;
        }
        if (t.status === 'pendente') {
          pendentes++;
        }
      });
      
      return { receitas, despesas, saldo: receitas - despesas, pendentes };
    }
  });

  // Products and stock
  const { data: productsData } = useQuery({
    queryKey: ['admin-dashboard-products'],
    queryFn: async () => {
      const { count: total } = await supabase.from('produtos').select('*', { count: 'exact', head: true });
      const { data: lowStock } = await supabase
        .from('produtos')
        .select('id')
        .lt('estoque_atual', 10)
        .eq('controla_estoque', true);
      
      return { total: total || 0, lowStock: (lowStock || []).length };
    }
  });

  // Sales data
  const { data: salesData } = useQuery({
    queryKey: ['admin-dashboard-sales'],
    queryFn: async () => {
      const currentMonth = new Date();
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
      
      const { data: vendas } = await supabase
        .from('vendas')
        .select('total, status')
        .gte('data_venda', firstDay);
      
      let totalVendas = 0;
      let countVendas = 0;
      
      (vendas || []).forEach(v => {
        if (v.status === 'concluido') {
          totalVendas += Number(v.total) || 0;
          countVendas++;
        }
      });
      
      return { total: totalVendas, count: countVendas };
    }
  });

  // Tasks summary
  const { data: tasksData } = useQuery({
    queryKey: ['admin-dashboard-tasks'],
    queryFn: async () => {
      const { data: tarefas } = await supabase.from('tarefas').select('status');
      
      const counts = { pendente: 0, em_andamento: 0, concluido: 0 };
      
      (tarefas || []).forEach(t => {
        if (t.status === 'pendente') counts.pendente++;
        else if (t.status === 'em_andamento') counts.em_andamento++;
        else if (t.status === 'concluido') counts.concluido++;
      });
      
      return counts;
    }
  });

  // Resource permissions count
  const { data: permissionsData } = useQuery({
    queryKey: ['admin-dashboard-permissions'],
    queryFn: async () => {
      const { count: resourcePerms } = await supabase.from('user_resource_permissions').select('*', { count: 'exact', head: true });
      const { count: profiles } = await supabase.from('permission_profiles').select('*', { count: 'exact', head: true });
      return { resourcePerms: resourcePerms || 0, profiles: profiles || 0 };
    }
  });

  // Monthly trend data
  const { data: monthlyTrend } = useQuery({
    queryKey: ['admin-dashboard-trend'],
    queryFn: async () => {
      const months: { month: string; receitas: number; despesas: number }[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const { data: transacoes } = await supabase
          .from('transacoes')
          .select('tipo, valor')
          .gte('data_transacao', firstDay)
          .lte('data_transacao', lastDay);
        
        let receitas = 0;
        let despesas = 0;
        
        (transacoes || []).forEach(t => {
          if (t.tipo === 'receita') receitas += Number(t.valor) || 0;
          else if (t.tipo === 'despesa') despesas += Number(t.valor) || 0;
        });
        
        months.push({
          month: date.toLocaleDateString('pt-BR', { month: 'short' }),
          receitas,
          despesas
        });
      }
      
      return months;
    }
  });

  // Users per empresa chart data
  const { data: usersPerEmpresa } = useQuery({
    queryKey: ['admin-dashboard-users-empresa'],
    queryFn: async () => {
      const { data: userEmpresas } = await supabase.from('user_empresas').select('empresa_id');
      const { data: empresas } = await supabase.rpc('get_empresas_safe');
      
      const counts: Record<string, number> = {};
      (userEmpresas || []).forEach(ue => {
        counts[ue.empresa_id] = (counts[ue.empresa_id] || 0) + 1;
      });
      
      return (empresas || []).slice(0, 5).map(e => ({
        name: e.nome.length > 15 ? e.nome.substring(0, 15) + '...' : e.nome,
        usuarios: counts[e.id] || 0
      }));
    }
  });

  // Module usage (permissions per module)
  const { data: moduleUsage } = useQuery({
    queryKey: ['admin-dashboard-module-usage'],
    queryFn: async () => {
      const { data: perms } = await supabase.from('user_resource_permissions').select('module');
      
      const counts: Record<string, number> = {};
      (perms || []).forEach(p => {
        counts[p.module] = (counts[p.module] || 0) + 1;
      });
      
      const moduleLabels: Record<string, string> = {
        financialace: 'Financeiro',
        erp: 'ERP/Gestão',
        taskvault: 'TaskVault',
        conversores: 'Conversores'
      };
      
      return Object.entries(counts).map(([key, value]) => ({
        name: moduleLabels[key] || key,
        value
      }));
    }
  });

  const isLoading = !usersData || !empresasData || !financialData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const metrics: DashboardMetric[] = [
    {
      label: 'Usuários Ativos',
      value: `${usersData.active}/${usersData.total}`,
      icon: <Users className="w-5 h-5" />,
      color: 'text-blue-500',
      change: usersData.total > 0 ? Math.round((usersData.active / usersData.total) * 100) : 0
    },
    {
      label: 'Empresas',
      value: empresasData.total,
      icon: <Building2 className="w-5 h-5" />,
      color: 'text-green-500'
    },
    {
      label: 'Receitas (Mês)',
      value: formatCurrency(financialData.receitas),
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-emerald-500'
    },
    {
      label: 'Despesas (Mês)',
      value: formatCurrency(financialData.despesas),
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'text-red-500'
    },
    {
      label: 'Saldo do Mês',
      value: formatCurrency(financialData.saldo),
      icon: <DollarSign className="w-5 h-5" />,
      color: financialData.saldo >= 0 ? 'text-green-500' : 'text-red-500'
    },
    {
      label: 'Produtos Cadastrados',
      value: productsData?.total || 0,
      icon: <Package className="w-5 h-5" />,
      color: 'text-purple-500'
    },
    {
      label: 'Vendas Concluídas (Mês)',
      value: salesData?.count || 0,
      icon: <FileText className="w-5 h-5" />,
      color: 'text-orange-500'
    },
    {
      label: 'Permissões Configuradas',
      value: permissionsData?.resourcePerms || 0,
      icon: <Shield className="w-5 h-5" />,
      color: 'text-indigo-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Administrativo</h2>
          <p className="text-muted-foreground">Visão geral de todos os módulos do sistema</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Activity className="w-3 h-3" />
          Atualizado agora
        </Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center ${metric.color}`}>
                  {metric.icon}
                </div>
              </div>
              {metric.change !== undefined && (
                <div className="mt-2">
                  <Progress value={metric.change} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{metric.change}% ativos</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" />
              Fluxo Financeiro (6 meses)
            </CardTitle>
            <CardDescription>Receitas vs Despesas por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {monthlyTrend && monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Mês: ${label}`}
                    />
                    <Area type="monotone" dataKey="receitas" stroke="#10b981" fill="url(#colorReceitas)" name="Receitas" />
                    <Area type="monotone" dataKey="despesas" stroke="#ef4444" fill="url(#colorDespesas)" name="Despesas" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Module Usage Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="w-4 h-4" />
              Uso por Módulo
            </CardTitle>
            <CardDescription>Permissões configuradas por módulo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {moduleUsage && moduleUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={moduleUsage}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {moduleUsage.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users per Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" />
              Usuários por Empresa
            </CardTitle>
            <CardDescription>Top 5 empresas com mais usuários</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {usersPerEmpresa && usersPerEmpresa.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usersPerEmpresa} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="usuarios" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="w-4 h-4" />
              Status das Tarefas
            </CardTitle>
            <CardDescription>Distribuição geral das tarefas do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pendentes</span>
                  <span className="font-medium">{tasksData?.pendente || 0}</span>
                </div>
                <Progress value={tasksData ? (tasksData.pendente / Math.max(tasksData.pendente + tasksData.em_andamento + tasksData.concluido, 1)) * 100 : 0} className="h-2 bg-muted" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Em Andamento</span>
                  <span className="font-medium">{tasksData?.em_andamento || 0}</span>
                </div>
                <Progress value={tasksData ? (tasksData.em_andamento / Math.max(tasksData.pendente + tasksData.em_andamento + tasksData.concluido, 1)) * 100 : 0} className="h-2 bg-yellow-100 [&>div]:bg-yellow-500" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Concluídas</span>
                  <span className="font-medium">{tasksData?.concluido || 0}</span>
                </div>
                <Progress value={tasksData ? (tasksData.concluido / Math.max(tasksData.pendente + tasksData.em_andamento + tasksData.concluido, 1)) * 100 : 0} className="h-2 bg-green-100 [&>div]:bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-primary">{permissionsData?.profiles || 0}</p>
          <p className="text-sm text-muted-foreground">Perfis de Permissão</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-orange-500">{financialData.pendentes}</p>
          <p className="text-sm text-muted-foreground">Transações Pendentes</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{productsData?.lowStock || 0}</p>
          <p className="text-sm text-muted-foreground">Produtos Baixo Estoque</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-500">{formatCurrency(salesData?.total || 0)}</p>
          <p className="text-sm text-muted-foreground">Vendas do Mês</p>
        </div>
      </div>
    </div>
  );
}
