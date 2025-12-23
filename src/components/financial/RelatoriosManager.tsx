import { useState } from "react";
import { 
  BarChart3, PieChart, TrendingUp, FileText, Download, 
  DollarSign, Calendar, ArrowUpRight, ArrowDownRight,
  Building2, Wallet, Receipt, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  { 
    id: "fluxo-caixa", 
    nome: "Fluxo de Caixa", 
    descricao: "Entradas e saídas por período",
    icon: TrendingUp,
    color: "blue"
  },
  { 
    id: "dre", 
    nome: "DRE Simplificada", 
    descricao: "Demonstração de Resultado",
    icon: FileText,
    color: "green"
  },
  { 
    id: "categorias", 
    nome: "Por Categoria", 
    descricao: "Despesas e receitas por categoria",
    icon: PieChart,
    color: "purple"
  },
  { 
    id: "contas", 
    nome: "Por Conta", 
    descricao: "Movimentação por conta bancária",
    icon: Wallet,
    color: "cyan"
  },
  { 
    id: "pendentes", 
    nome: "Pendências", 
    descricao: "Contas a pagar e receber",
    icon: Receipt,
    color: "yellow"
  },
  { 
    id: "metas", 
    nome: "Metas", 
    descricao: "Acompanhamento de metas",
    icon: Target,
    color: "pink"
  },
];

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const getColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
    green: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
    cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
    yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
    pink: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30" },
  };
  return colors[color] || colors.blue;
};

export function RelatoriosManager({ empresaId }: RelatoriosManagerProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const currentDate = new Date();
  const [mes, setMes] = useState<number>(currentDate.getMonth() + 1);
  const [ano, setAno] = useState<number>(currentDate.getFullYear());

  const anos = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
  const selectedReportData = RELATORIOS.find(r => r.id === selectedReport);

  const renderReportContent = () => {
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

    // Mock data for demonstration
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
              <Card className={`${colors.border} border`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-xs font-medium">Entradas</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">R$ 0,00</p>
                </CardContent>
              </Card>
              <Card className={`${colors.border} border`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <ArrowDownRight className="w-4 h-4" />
                    <span className="text-xs font-medium">Saídas</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">R$ 0,00</p>
                </CardContent>
              </Card>
              <Card className={`${colors.border} border`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Saldo</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">R$ 0,00</p>
                </CardContent>
              </Card>
            </div>
            <Card className="border-border/30">
              <CardContent className="p-6">
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  <p>Gráfico de fluxo de caixa será exibido aqui</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedReport === "dre" && (
          <Card className="border-border/30">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="font-medium text-green-400">Receita Bruta</span>
                <span className="text-foreground">R$ 0,00</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30 pl-4">
                <span className="text-muted-foreground">(-) Deduções</span>
                <span className="text-red-400">R$ 0,00</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="font-medium text-foreground">Receita Líquida</span>
                <span className="text-foreground">R$ 0,00</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30 pl-4">
                <span className="text-muted-foreground">(-) Custos</span>
                <span className="text-red-400">R$ 0,00</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="font-medium text-foreground">Lucro Bruto</span>
                <span className="text-foreground">R$ 0,00</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30 pl-4">
                <span className="text-muted-foreground">(-) Despesas Operacionais</span>
                <span className="text-red-400">R$ 0,00</span>
              </div>
              <div className="flex justify-between py-3 bg-blue-500/10 rounded-lg px-3">
                <span className="font-bold text-blue-400">Resultado Líquido</span>
                <span className="font-bold text-blue-400">R$ 0,00</span>
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
              <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Nenhuma receita no período</p>
              </CardContent>
            </Card>
            <Card className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                  Despesas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Nenhuma despesa no período</p>
              </CardContent>
            </Card>
          </div>
        )}

        {(selectedReport === "contas" || selectedReport === "pendentes" || selectedReport === "metas") && (
          <Card className="border-border/30">
            <CardContent className="p-6">
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <p>Dados do relatório serão exibidos aqui</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4">
      {/* Left sidebar - Report cards */}
      <div className="w-56 flex-shrink-0 space-y-3">
        {/* Period selector */}
        <Card className="border-blue-500/20">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-400">
              <Calendar className="w-3 h-3" />
              Período
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                <SelectTrigger className="h-8 text-xs">
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
                <SelectTrigger className="h-8 text-xs">
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
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                isSelected 
                  ? `${colors.bg} ${colors.border} border-2` 
                  : "bg-card/50 border-border/30 hover:bg-card"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <div>
                  <p className={`text-xs font-medium ${isSelected ? colors.text : 'text-foreground'}`}>
                    {report.nome}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
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
