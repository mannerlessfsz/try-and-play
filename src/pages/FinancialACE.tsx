import { useState, useRef } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { MetricCard } from "@/components/task/MetricCard";
import { TimelineItem } from "@/components/task/TimelineItem";
import { 
  DollarSign, Plus, Edit, Trash2, TrendingUp, TrendingDown,
  CreditCard, Receipt, PieChart, BarChart3, Wallet, Building2,
  User, Calendar, Filter, SortAsc, Search, FileDown, FileUp,
  Settings, ArrowUpRight, ArrowDownRight, Zap, Clock, Tag,
  Activity, List, LayoutGrid, Target, AlertTriangle, Upload,
  FileText, CheckCircle2, XCircle, Link2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Atividade } from "@/types/task";

// Interfaces for financial data
interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  categoria: string;
  data: string;
  status: "pendente" | "confirmado" | "cancelado";
}

interface Categoria {
  id: string;
  nome: string;
  tipo: "receita" | "despesa";
  cor: string;
}

interface ExtratoImportado {
  id: string;
  nome: string;
  tipo: "pdf" | "ofx";
  dataImportacao: string;
  status: "processando" | "concluido" | "erro";
  transacoes: number;
  conciliadas: number;
}

const widgetGroups = [
  {
    id: "actions",
    label: "Ações Rápidas",
    icon: <Zap className="w-5 h-5" />,
    items: [
      { id: "new-receita", label: "Nova Receita", icon: <ArrowUpRight className="w-5 h-5" />, badge: "+" },
      { id: "new-despesa", label: "Nova Despesa", icon: <ArrowDownRight className="w-5 h-5" /> },
      { id: "edit", label: "Editar", icon: <Edit className="w-5 h-5" /> },
      { id: "delete", label: "Excluir", icon: <Trash2 className="w-5 h-5" /> },
    ],
  },
  {
    id: "view",
    label: "Visualização",
    icon: <Filter className="w-5 h-5" />,
    items: [
      { id: "filter", label: "Filtrar", icon: <Filter className="w-5 h-5" /> },
      { id: "sort", label: "Ordenar", icon: <SortAsc className="w-5 h-5" /> },
      { id: "search", label: "Buscar", icon: <Search className="w-5 h-5" /> },
      { id: "calendar", label: "Agenda", icon: <Calendar className="w-5 h-5" /> },
    ],
  },
  {
    id: "organize",
    label: "Organizar",
    icon: <Tag className="w-5 h-5" />,
    items: [
      { id: "categories", label: "Categorias", icon: <PieChart className="w-5 h-5" />, badge: 8 },
      { id: "tags", label: "Tags", icon: <Tag className="w-5 h-5" /> },
      { id: "recurring", label: "Recorrentes", icon: <Clock className="w-5 h-5" /> },
      { id: "goals", label: "Metas", icon: <Target className="w-5 h-5" /> },
    ],
  },
  {
    id: "reports",
    label: "Relatórios",
    icon: <BarChart3 className="w-5 h-5" />,
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutGrid className="w-5 h-5" /> },
      { id: "charts", label: "Gráficos", icon: <BarChart3 className="w-5 h-5" /> },
      { id: "cashflow", label: "Fluxo Caixa", icon: <TrendingUp className="w-5 h-5" /> },
    ],
  },
  {
    id: "extras",
    label: "Extras",
    icon: <Settings className="w-5 h-5" />,
    items: [
      { id: "export", label: "Exportar", icon: <FileDown className="w-5 h-5" /> },
      { id: "import", label: "Importar", icon: <FileUp className="w-5 h-5" /> },
      { id: "settings", label: "Config", icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

type FilterType = "all" | "receitas" | "despesas" | "pendentes";
type ModoFinanceiro = "pro" | "basico";

export default function FinancialACE() {
  const [activeTab, setActiveTab] = useState<"transacoes" | "categorias" | "conciliacao" | "relatorios">("transacoes");
  const [viewMode, setViewMode] = useState<"lista" | "grid">("lista");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [modo, setModo] = useState<ModoFinanceiro>("pro");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [extratosImportados, setExtratosImportados] = useState<ExtratoImportado[]>([
    { id: "1", nome: "extrato_banco_dez2024.ofx", tipo: "ofx", dataImportacao: "2024-12-20", status: "concluido", transacoes: 45, conciliadas: 42 },
    { id: "2", nome: "extrato_cartao_dez.pdf", tipo: "pdf", dataImportacao: "2024-12-18", status: "concluido", transacoes: 23, conciliadas: 20 },
  ]);

  const [transacoes, setTransacoes] = useState<Transacao[]>([
    { id: "1", descricao: "Pagamento Cliente ABC", valor: 5000, tipo: "receita", categoria: "Serviços", data: "2024-12-20", status: "confirmado" },
    { id: "2", descricao: "Aluguel Escritório", valor: 2500, tipo: "despesa", categoria: "Infraestrutura", data: "2024-12-15", status: "confirmado" },
    { id: "3", descricao: "Projeto Website", valor: 8000, tipo: "receita", categoria: "Projetos", data: "2024-12-18", status: "pendente" },
    { id: "4", descricao: "Software Contábil", valor: 350, tipo: "despesa", categoria: "Software", data: "2024-12-10", status: "confirmado" },
    { id: "5", descricao: "Consultoria Fiscal", valor: 3500, tipo: "receita", categoria: "Consultoria", data: "2024-12-22", status: "pendente" },
    { id: "6", descricao: "Internet + Telefone", valor: 280, tipo: "despesa", categoria: "Infraestrutura", data: "2024-12-05", status: "confirmado" },
  ]);

  const [atividades] = useState<Atividade[]>([
    { id: "1", tipo: "criacao", descricao: "Nova receita: Pagamento Cliente ABC", timestamp: "Há 2 horas", usuario: "Sistema" },
    { id: "2", tipo: "conclusao", descricao: "Despesa confirmada: Aluguel", timestamp: "Há 4 horas", usuario: "Ana" },
    { id: "3", tipo: "edicao", descricao: "Meta atualizada: Economia mensal", timestamp: "Há 6 horas", usuario: "Carlos" },
  ]);

  // Calculations
  const totalReceitas = transacoes.filter(t => t.tipo === "receita" && t.status === "confirmado").reduce((acc, t) => acc + t.valor, 0);
  const totalDespesas = transacoes.filter(t => t.tipo === "despesa" && t.status === "confirmado").reduce((acc, t) => acc + t.valor, 0);
  const saldo = totalReceitas - totalDespesas;
  const pendentes = transacoes.filter(t => t.status === "pendente").length;

  const getFilteredTransacoes = () => {
    switch (activeFilter) {
      case "receitas":
        return transacoes.filter(t => t.tipo === "receita");
      case "despesas":
        return transacoes.filter(t => t.tipo === "despesa");
      case "pendentes":
        return transacoes.filter(t => t.status === "pendente");
      default:
        return transacoes;
    }
  };

  const filteredTransacoes = getFilteredTransacoes();

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(prev => prev === filter ? "all" : filter);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension !== 'pdf' && extension !== 'ofx') {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo PDF ou OFX.",
        variant: "destructive",
      });
      return;
    }

    const novoExtrato: ExtratoImportado = {
      id: Date.now().toString(),
      nome: file.name,
      tipo: extension as "pdf" | "ofx",
      dataImportacao: new Date().toISOString().split('T')[0],
      status: "processando",
      transacoes: 0,
      conciliadas: 0,
    };

    setExtratosImportados(prev => [novoExtrato, ...prev]);
    
    // Simulate processing
    setTimeout(() => {
      setExtratosImportados(prev => 
        prev.map(e => 
          e.id === novoExtrato.id 
            ? { ...e, status: "concluido", transacoes: Math.floor(Math.random() * 50) + 10, conciliadas: 0 }
            : e
        )
      );
      toast({
        title: "Extrato importado",
        description: `${file.name} foi processado com sucesso.`,
      });
    }, 2000);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Mode Toggle */}
      <div className="p-3 border-b border-blue-500/20">
        <div className="text-xs font-bold text-blue-400 mb-3">Modo</div>
        <div className="flex gap-2">
          <button
            onClick={() => setModo("pro")}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              modo === "pro" 
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" 
                : "bg-card/50 text-muted-foreground hover:bg-card"
            }`}
          >
            <Building2 className="w-3 h-3 inline mr-1" />
            Pro
          </button>
          <button
            onClick={() => setModo("basico")}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              modo === "basico" 
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" 
                : "bg-card/50 text-muted-foreground hover:bg-card"
            }`}
          >
            <User className="w-3 h-3 inline mr-1" />
            Básico
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="p-3 border-b border-blue-500/20">
        <div className="text-xs font-bold text-blue-400 mb-3">Filtros Rápidos</div>
        <div className="space-y-2">
          <select className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80">
            <option>Todas Categorias</option>
            <option>Serviços</option>
            <option>Infraestrutura</option>
            <option>Projetos</option>
          </select>
          <select className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80">
            <option>Todos Status</option>
            <option>Confirmado</option>
            <option>Pendente</option>
            <option>Cancelado</option>
          </select>
          <input 
            type="month" 
            className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80"
          />
        </div>
      </div>

      {/* Timeline Section */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="text-xs font-bold text-blue-400 mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Atividades Recentes
        </div>
        <div className="space-y-1">
          {atividades.map(atividade => (
            <TimelineItem key={atividade.id} atividade={atividade} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-14 pb-24">
      <WidgetRibbon 
        groups={widgetGroups} 
        title={`FinancialACE ${modo === "pro" ? "Pro" : "Básico"}`}
        accentColor="blue" 
        sidebarContent={sidebarContent}
      />
      
      <div className="p-4 pr-72">
        {/* Dashboard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard 
            title="Saldo Atual" 
            value={formatCurrency(saldo)} 
            change={saldo >= 0 ? "+12% este mês" : "-8% este mês"} 
            changeType={saldo >= 0 ? "up" : "down"} 
            icon={Wallet} 
            color={saldo >= 0 ? "green" : "red"}
            isActive={activeFilter === "all"}
            onClick={() => handleFilterClick("all")}
          />
          <MetricCard 
            title="Receitas" 
            value={formatCurrency(totalReceitas)} 
            change="+15% este mês" 
            changeType="up" 
            icon={TrendingUp} 
            color="green"
            isActive={activeFilter === "receitas"}
            onClick={() => handleFilterClick("receitas")}
          />
          <MetricCard 
            title="Despesas" 
            value={formatCurrency(totalDespesas)} 
            change="+5% este mês" 
            changeType="down" 
            icon={TrendingDown} 
            color="red"
            isActive={activeFilter === "despesas"}
            onClick={() => handleFilterClick("despesas")}
          />
          <MetricCard 
            title="Pendentes" 
            value={pendentes} 
            change="Atenção!" 
            changeType="down" 
            icon={AlertTriangle} 
            color="yellow"
            isActive={activeFilter === "pendentes"}
            onClick={() => handleFilterClick("pendentes")}
          />
        </div>

        {/* Filter indicator */}
        {activeFilter !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtro ativo:</span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {activeFilter === "receitas" ? "Receitas" : activeFilter === "despesas" ? "Despesas" : "Pendentes"}
            </span>
            <button 
              onClick={() => setActiveFilter("all")}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Limpar
            </button>
          </div>
        )}

        {/* Tabs & View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("transacoes")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "transacoes" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
            >
              <Receipt className="w-4 h-4 inline mr-2" />Receitas/Despesas ({filteredTransacoes.length})
            </button>
            <button
              onClick={() => setActiveTab("categorias")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "categorias" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
            >
              <PieChart className="w-4 h-4 inline mr-2" />Categorias
            </button>
            <button
              onClick={() => setActiveTab("conciliacao")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "conciliacao" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
            >
              <Link2 className="w-4 h-4 inline mr-2" />Conciliação
            </button>
            {modo === "pro" && (
              <button
                onClick={() => setActiveTab("relatorios")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "relatorios" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />Relatórios
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-card/50 rounded-lg p-1 border border-foreground/10">
              <button onClick={() => setViewMode("lista")} className={`p-2 rounded-md transition-all ${viewMode === "lista" ? "bg-blue-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-blue-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Nova Transação
            </Button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "transacoes" && (
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-blue-500/10 border-b border-blue-500/20">
                <tr>
                  <th className="text-left p-3 font-medium text-foreground/80">Descrição</th>
                  <th className="text-left p-3 font-medium text-foreground/80">Categoria</th>
                  <th className="text-left p-3 font-medium text-foreground/80">Data</th>
                  <th className="text-left p-3 font-medium text-foreground/80">Status</th>
                  <th className="text-right p-3 font-medium text-foreground/80">Valor</th>
                  <th className="text-center p-3 font-medium text-foreground/80">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {filteredTransacoes.map(transacao => (
                  <tr key={transacao.id} className="hover:bg-foreground/5 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${transacao.tipo === "receita" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                          {transacao.tipo === "receita" ? (
                            <ArrowUpRight className="w-4 h-4 text-green-400" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <span className="font-medium text-foreground">{transacao.descricao}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{transacao.categoria}</td>
                    <td className="p-3 text-muted-foreground">{new Date(transacao.data).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transacao.status === "confirmado" ? "bg-green-500/20 text-green-300" :
                        transacao.status === "pendente" ? "bg-yellow-500/20 text-yellow-300" :
                        "bg-red-500/20 text-red-300"
                      }`}>
                        {transacao.status}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-semibold ${transacao.tipo === "receita" ? "text-green-400" : "text-red-400"}`}>
                      {transacao.tipo === "receita" ? "+" : "-"}{formatCurrency(transacao.valor)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "categorias" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Serviços", "Infraestrutura", "Projetos", "Software", "Consultoria", "Marketing", "Impostos", "Outros"].map((cat, i) => (
              <div key={cat} className="bg-card/30 backdrop-blur-xl rounded-xl border border-blue-500/20 p-4 hover:border-blue-500/40 transition-all cursor-pointer">
                <div className={`w-10 h-10 rounded-lg mb-3 flex items-center justify-center ${
                  i % 2 === 0 ? "bg-blue-500/20" : "bg-cyan-500/20"
                }`}>
                  <PieChart className={`w-5 h-5 ${i % 2 === 0 ? "text-blue-400" : "text-cyan-400"}`} />
                </div>
                <h3 className="font-medium text-foreground">{cat}</h3>
                <p className="text-xs text-muted-foreground mt-1">{Math.floor(Math.random() * 20) + 1} transações</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "conciliacao" && (
          <div className="space-y-6">
            {/* Upload Area */}
            <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 border-dashed p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Importar Extrato Bancário</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Arraste um arquivo ou clique para selecionar. Formatos aceitos: PDF ou OFX
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.ofx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="extrato-upload"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Selecionar Arquivo
                </Button>
              </div>
            </div>

            {/* Imported Files List */}
            {extratosImportados.length > 0 && (
              <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 overflow-hidden">
                <div className="p-4 border-b border-blue-500/20">
                  <h3 className="font-semibold text-foreground">Extratos Importados</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-blue-500/10">
                    <tr>
                      <th className="text-left p-3 font-medium text-foreground/80">Arquivo</th>
                      <th className="text-left p-3 font-medium text-foreground/80">Tipo</th>
                      <th className="text-left p-3 font-medium text-foreground/80">Data Importação</th>
                      <th className="text-left p-3 font-medium text-foreground/80">Status</th>
                      <th className="text-center p-3 font-medium text-foreground/80">Transações</th>
                      <th className="text-center p-3 font-medium text-foreground/80">Conciliadas</th>
                      <th className="text-center p-3 font-medium text-foreground/80">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {extratosImportados.map(extrato => (
                      <tr key={extrato.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              extrato.tipo === "ofx" ? "bg-green-500/20" : "bg-red-500/20"
                            }`}>
                              <FileText className={`w-4 h-4 ${extrato.tipo === "ofx" ? "text-green-400" : "text-red-400"}`} />
                            </div>
                            <span className="font-medium text-foreground">{extrato.nome}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                            extrato.tipo === "ofx" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                          }`}>
                            {extrato.tipo}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(extrato.dataImportacao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                            extrato.status === "concluido" ? "bg-green-500/20 text-green-300" :
                            extrato.status === "processando" ? "bg-yellow-500/20 text-yellow-300" :
                            "bg-red-500/20 text-red-300"
                          }`}>
                            {extrato.status === "concluido" && <CheckCircle2 className="w-3 h-3" />}
                            {extrato.status === "processando" && <Clock className="w-3 h-3 animate-spin" />}
                            {extrato.status === "erro" && <XCircle className="w-3 h-3" />}
                            {extrato.status}
                          </span>
                        </td>
                        <td className="p-3 text-center font-semibold text-foreground">{extrato.transacoes}</td>
                        <td className="p-3 text-center">
                          <span className={`font-semibold ${
                            extrato.conciliadas === extrato.transacoes ? "text-green-400" : "text-yellow-400"
                          }`}>
                            {extrato.conciliadas}/{extrato.transacoes}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                            >
                              <Link2 className="w-4 h-4 mr-1" />
                              Conciliar
                            </Button>
                            <button className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "relatorios" && modo === "pro" && (
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-8 min-h-[40vh]">
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Relatórios Profissionais</h2>
                <p className="text-muted-foreground max-w-md">
                  Gere relatórios detalhados de fluxo de caixa, DRE, balanço patrimonial e muito mais.
                </p>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
