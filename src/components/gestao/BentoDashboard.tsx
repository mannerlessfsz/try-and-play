import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  Activity, AlertTriangle, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { ParcelasAlertaWidget } from "./ParcelasAlertaWidget";
import type { Transacao } from "@/hooks/useTransacoes";
import type { ParcelasAlertaResult } from "@/hooks/useParcelasAlerta";

interface BentoDashboardProps {
  transacoes: Transacao[];
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  pendentes: number;
  parcelasAlerta?: ParcelasAlertaResult;
  onVerTransacoes?: () => void;
}

const COLORS = [
  "hsl(210, 100%, 55%)",
  "hsl(160, 100%, 50%)",
  "hsl(25, 100%, 55%)",
  "hsl(45, 100%, 60%)",
  "hsl(0, 85%, 55%)",
];

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export function BentoDashboard({
  transacoes,
  totalReceitas,
  totalDespesas,
  saldo,
  pendentes,
  parcelasAlerta,
  onVerTransacoes,
}: BentoDashboardProps) {
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { name: string; receitas: number; despesas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("pt-BR", { month: "short" });
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const receitas = transacoes.filter(t => { const d = new Date(t.data_transacao); return t.tipo === "receita" && d.getFullYear() === year && d.getMonth() + 1 === month; }).reduce((a, t) => a + Number(t.valor), 0);
      const despesas = transacoes.filter(t => { const d = new Date(t.data_transacao); return t.tipo === "despesa" && d.getFullYear() === year && d.getMonth() + 1 === month; }).reduce((a, t) => a + Number(t.valor), 0);
      months.push({ name: monthName.charAt(0).toUpperCase() + monthName.slice(1), receitas, despesas });
    }
    return months;
  }, [transacoes]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    transacoes.filter(t => t.tipo === "despesa").forEach(t => {
      const catName = t.categoria?.nome || "Sem categoria";
      categories[catName] = (categories[catName] || 0) + Number(t.valor);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transacoes]);

  const ultimasTransacoes = useMemo(() => transacoes.slice(0, 6), [transacoes]);

  const lucro = totalReceitas - totalDespesas;
  const margem = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
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
    <div className="space-y-4">
      {parcelasAlerta?.hasAlertas && (
        <ParcelasAlertaWidget
          parcelasVencendo={parcelasAlerta.parcelasVencendo}
          parcelasAtrasadas={parcelasAlerta.parcelasAtrasadas}
          totalValorVencendo={parcelasAlerta.totalValorVencendo}
          totalValorAtrasadas={parcelasAlerta.totalValorAtrasadas}
          onVerTransacoes={onVerTransacoes}
        />
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-3 auto-rows-[minmax(0,1fr)]">
        {/* Saldo - tall card */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            "col-span-3 row-span-2 rounded-2xl border p-5 relative overflow-hidden group",
            "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl",
            saldo >= 0 ? "border-blue-500/20" : "border-orange-500/20"
          )}
        >
          <div className={cn(
            "absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-opacity",
            saldo >= 0 ? "bg-blue-500" : "bg-orange-500"
          )} />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                saldo >= 0 ? "bg-blue-500/15" : "bg-orange-500/15"
              )}>
                <Wallet className={cn("w-5 h-5", saldo >= 0 ? "text-blue-400" : "text-orange-400")} />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Saldo Atual</p>
              <p className={cn("text-2xl font-bold mt-1 leading-tight", saldo >= 0 ? "text-blue-400" : "text-orange-400")}>
                {formatCurrency(saldo)}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-foreground/5">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  Margem: {margem.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Receitas */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="col-span-3 rounded-2xl border border-emerald-500/15 p-4 bg-gradient-to-br from-emerald-500/5 to-card/40 backdrop-blur-xl relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-emerald-500 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Receitas</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(totalReceitas)}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </motion.div>

        {/* Despesas */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="col-span-3 rounded-2xl border border-red-500/15 p-4 bg-gradient-to-br from-red-500/5 to-card/40 backdrop-blur-xl relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-red-500 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Despesas</p>
              <p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(totalDespesas)}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
          </div>
        </motion.div>

        {/* Pendentes */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="col-span-3 rounded-2xl border border-amber-500/15 p-4 bg-gradient-to-br from-amber-500/5 to-card/40 backdrop-blur-xl relative overflow-hidden group cursor-pointer"
          onClick={onVerTransacoes}
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-amber-500 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pendentes</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{pendentes}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">aguardando</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </motion.div>

        {/* Area Chart - Fluxo */}
        <motion.div
          custom={4}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="col-span-6 row-span-2 rounded-2xl border border-foreground/5 p-4 bg-card/40 backdrop-blur-xl"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Fluxo Financeiro — 6 meses
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="bentoCR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bentoCD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="receitas" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#bentoCR)" name="Receitas" />
                <Area type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#bentoCD)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Receitas row-span card for Pie */}
        <motion.div
          custom={5}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="col-span-3 row-span-2 rounded-2xl border border-foreground/5 p-4 bg-card/40 backdrop-blur-xl flex flex-col"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Despesas por Categoria
          </p>
          <div className="flex-1 min-h-0">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend formatter={(value) => <span className="text-[10px] text-muted-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            )}
          </div>
        </motion.div>

        {/* Últimas Transações */}
        <motion.div
          custom={6}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="col-span-6 rounded-2xl border border-foreground/5 p-4 bg-card/40 backdrop-blur-xl"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Últimas Transações
          </p>
          <div className="space-y-2">
            {ultimasTransacoes.length > 0 ? (
              ultimasTransacoes.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-foreground/5 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center",
                      t.tipo === "receita" ? "bg-emerald-500/15" : "bg-red-500/15"
                    )}>
                      {t.tipo === "receita"
                        ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                        : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{t.descricao}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(t.data_transacao + "T12:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <span className={cn("text-sm font-semibold", t.tipo === "receita" ? "text-emerald-400" : "text-red-400")}>
                    {t.tipo === "receita" ? "+" : "-"}{formatCurrency(t.valor)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground text-sm py-6">Nenhuma transação</div>
            )}
          </div>
        </motion.div>

        {/* Lucro Card */}
        <motion.div
          custom={7}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            "col-span-3 rounded-2xl border p-4 relative overflow-hidden group",
            "bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-xl",
            lucro >= 0 ? "border-emerald-500/15" : "border-red-500/15"
          )}
        >
          <div className="relative z-10">
            <p className="text-xs text-muted-foreground font-medium">Resultado</p>
            <p className={cn("text-xl font-bold mt-1", lucro >= 0 ? "text-emerald-400" : "text-red-400")}>
              {formatCurrency(lucro)}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              {lucro >= 0
                ? <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                : <ArrowDownRight className="w-3 h-3 text-red-400" />
              }
              <span className="text-[11px] text-muted-foreground">
                {lucro >= 0 ? "Lucro" : "Prejuízo"} no período
              </span>
            </div>
          </div>
        </motion.div>

        {/* Alertas mini */}
        <motion.div
          custom={8}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="col-span-3 rounded-2xl border border-foreground/5 p-4 bg-card/40 backdrop-blur-xl cursor-pointer hover:border-amber-500/20 transition-colors"
          onClick={onVerTransacoes}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alertas</p>
          </div>
          {parcelasAlerta?.hasAlertas ? (
            <div className="space-y-1.5">
              {parcelasAlerta.totalAtrasadas > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-400 text-xs">Atrasadas</span>
                  <span className="font-bold text-red-400">{parcelasAlerta.totalAtrasadas}</span>
                </div>
              )}
              {parcelasAlerta.totalVencendo > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-400 text-xs">Vencendo</span>
                  <span className="font-bold text-amber-400">{parcelasAlerta.totalVencendo}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">✓ Nenhum alerta</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
