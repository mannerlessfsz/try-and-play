import { useState } from "react";
import { RibbonMenu } from "@/components/RibbonMenu";
import { 
  DollarSign, Plus, Edit, Trash2, Users, Calendar,
  LayoutGrid, List, TrendingUp, PieChart, CreditCard,
  Receipt, FileText, Settings, Building2, User, BarChart3
} from "lucide-react";

const ribbonTabs = [
  {
    id: "financeiro",
    label: "Financeiro",
    icon: <DollarSign className="w-4 h-4" />,
    items: [
      { id: "new-transaction", label: "Nova Transação", icon: <Plus className="w-6 h-6" /> },
      { id: "edit", label: "Editar", icon: <Edit className="w-6 h-6" /> },
      { id: "delete", label: "Excluir", icon: <Trash2 className="w-6 h-6" /> },
      { id: "categories", label: "Categorias", icon: <PieChart className="w-6 h-6" /> },
    ],
  },
  {
    id: "visualizacao",
    label: "Visualização",
    icon: <LayoutGrid className="w-4 h-4" />,
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutGrid className="w-6 h-6" /> },
      { id: "list", label: "Lista", icon: <List className="w-6 h-6" /> },
      { id: "charts", label: "Gráficos", icon: <BarChart3 className="w-6 h-6" /> },
      { id: "calendar", label: "Calendário", icon: <Calendar className="w-6 h-6" /> },
    ],
  },
  {
    id: "profissional",
    label: "Profissional",
    icon: <Building2 className="w-4 h-4" />,
    items: [
      { id: "invoices", label: "Faturas", icon: <Receipt className="w-6 h-6" /> },
      { id: "reports", label: "Relatórios", icon: <FileText className="w-6 h-6" /> },
      { id: "cashflow", label: "Fluxo de Caixa", icon: <TrendingUp className="w-6 h-6" /> },
      { id: "clients", label: "Clientes", icon: <Users className="w-6 h-6" /> },
    ],
  },
  {
    id: "pessoal",
    label: "Pessoal",
    icon: <User className="w-4 h-4" />,
    items: [
      { id: "budget", label: "Orçamento", icon: <CreditCard className="w-6 h-6" /> },
      { id: "goals", label: "Metas", icon: <TrendingUp className="w-6 h-6" /> },
      { id: "expenses", label: "Despesas", icon: <Receipt className="w-6 h-6" /> },
      { id: "settings", label: "Configurar", icon: <Settings className="w-6 h-6" /> },
    ],
  },
];

export default function FinancialACE() {
  const [activeTab, setActiveTab] = useState("financeiro");

  return (
    <div className="min-h-screen bg-background">
      <RibbonMenu
        tabs={ribbonTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title="FinancialACE"
        accentColor="green"
      />
      
      {/* Main Content Area */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-green-500/20 p-8 min-h-[60vh]">
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-green-500/20 flex items-center justify-center animate-pulse-glow">
                  <DollarSign className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">FinancialACE</h2>
                <p className="text-muted-foreground max-w-md">
                  Gerencie suas finanças de forma profissional ou pessoal.
                  Controle fluxo de caixa, orçamentos e metas financeiras.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                    <Building2 className="w-8 h-8 text-green-500 mb-3" />
                    <h3 className="text-lg font-semibold text-foreground">Modo Profissional</h3>
                    <h3 className="text-lg font-semibold text-foreground">Modo Profissional</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Faturas, relatórios fiscais, fluxo de caixa empresarial e gestão de clientes.
                    </p>
                  </div>
                  <div className="p-6 rounded-xl bg-gradient-to-br from-cyan/10 to-cyan/5 border border-cyan/20">
                    <User className="w-8 h-8 text-cyan mb-3" />
                    <h3 className="text-lg font-semibold text-foreground">Modo Pessoal</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Orçamento familiar, metas de economia, controle de despesas diárias.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
