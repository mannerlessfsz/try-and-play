import { useState, useCallback, useEffect, useRef } from "react";
import { 
  TrendingUp, TrendingDown,
  Wallet, Building2,
  AlertTriangle,
  Package, ShoppingCart, ShoppingBag, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAtividades } from "@/hooks/useAtividades";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useParcelasAlerta } from "@/hooks/useParcelasAlerta";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { ContasBancariasManager } from "@/components/financial/ContasBancariasManager";
import { CategoriasManager } from "@/components/financial/CategoriasManager";
import { TransacoesUnificadasManager } from "@/components/financial/TransacoesUnificadasManager";

import { RelatoriosManager } from "@/components/financial/RelatoriosManager";
import { ProdutosManager } from "@/components/erp/ProdutosManager";
import { ClientesManager } from "@/components/erp/ClientesManager";
import { FornecedoresManager } from "@/components/erp/FornecedoresManager";
import { VendasManager } from "@/components/erp/VendasManager";
import { ComprasManager } from "@/components/erp/ComprasManager";
import { EstoqueManager } from "@/components/erp/EstoqueManager";
import { OrcamentosManager } from "@/components/erp/OrcamentosManager";
import { CentrosCustoManager } from "@/components/financial/CentrosCustoManager";
import { MetasFinanceirasManager } from "@/components/financial/MetasFinanceirasManager";
import { RecorrenciasManager } from "@/components/financial/RecorrenciasManager";
import { useProdutos } from "@/hooks/useProdutos";
import { useVendas } from "@/hooks/useVendas";
import { useCompras } from "@/hooks/useCompras";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { GlassSidebar } from "@/components/gestao/GlassSidebar";
import { ModernMetricCard } from "@/components/gestao/ModernMetricCard";
import { FloatingWidget } from "@/components/gestao/FloatingWidget";
import { AnimatedTabContent } from "@/components/gestao/AnimatedTabContent";
import { FinancialDashboard } from "@/components/gestao/FinancialDashboard";
import { WidgetManager } from "@/components/gestao/WidgetManager";
import { useWidgetPreferences } from "@/hooks/useWidgetPreferences";
import type { Atividade } from "@/types/task";

type FilterType = "all" | "receitas" | "despesas" | "pendentes";
type ModoFinanceiro = "pro" | "basico";

export default function FinancialACE() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "transacoes" | "categorias" | "contas" | "relatorios" | "produtos" | "clientes" | "fornecedores" | "vendas" | "compras" | "estoque" | "orcamentos" | "centros_custo" | "metas" | "recorrencias">("dashboard");
  const [activeSection, setActiveSection] = useState<"financeiro" | "gestao">("financeiro");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [modo, setModo] = useState<ModoFinanceiro>("pro");
  const { empresaAtiva, empresasDisponiveis, setEmpresaAtiva, loading: empresaLoading } = useEmpresaAtiva();
  const { toast } = useToast();
  const alertaShown = useRef(false);

  // Use real activities hook with module filter
  const { atividades, addAtividade, loading: atividadesLoading } = useAtividades("gestao", empresaAtiva?.id);

  // Use real transacoes hook for metrics
  const { totalReceitas, totalDespesas, saldo, pendentes, transacoes } = useTransacoes(empresaAtiva?.id);
  
  // Hook para alertas de parcelas
  const parcelasAlerta = useParcelasAlerta(empresaAtiva?.id);
  
  // ERP hooks
  const { produtos } = useProdutos(empresaAtiva?.id);
  const { totalVendas } = useVendas(empresaAtiva?.id);
  const { totalCompras } = useCompras(empresaAtiva?.id);
  const { orcamentosAbertos } = useOrcamentos(empresaAtiva?.id);
  
  // Widget preferences
  const { activeWidgets, isWidgetActive } = useWidgetPreferences(empresaAtiva?.id);

  // Alerta ao entrar no módulo
  useEffect(() => {
    if (alertaShown.current) return;
    if (parcelasAlerta.loading || !parcelasAlerta.hasAlertas) return;
    
    alertaShown.current = true;
    
    const { totalAtrasadas, totalVencendo, totalValorAtrasadas, totalValorVencendo } = parcelasAlerta;
    
    if (totalAtrasadas > 0) {
      toast({
        title: `⚠️ ${totalAtrasadas} parcela${totalAtrasadas > 1 ? 's' : ''} atrasada${totalAtrasadas > 1 ? 's' : ''}`,
        description: `Total em atraso: ${formatCurrencyUtil(totalValorAtrasadas)}`,
        variant: "destructive",
        duration: 8000,
      });
    } else if (totalVencendo > 0) {
      toast({
        title: `📅 ${totalVencendo} parcela${totalVencendo > 1 ? 's' : ''} vencendo em breve`,
        description: `Total: ${formatCurrencyUtil(totalValorVencendo)} nos próximos 7 dias`,
        duration: 6000,
      });
    }
  }, [parcelasAlerta.loading, parcelasAlerta.hasAlertas, parcelasAlerta.totalAtrasadas, parcelasAlerta.totalVencendo, toast]);

  const handleFilterClick = useCallback((filter: FilterType) => {
    setActiveFilter(prev => prev === filter ? "all" : filter);
  }, []);

  // Use shared formatter
  const formatCurrency = formatCurrencyUtil;

  // Convert atividades to proper type for sidebar
  const atividadesForSidebar: Atividade[] = atividades;


  // Show message if no empresa selected
  if (!empresaLoading && !empresaAtiva) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma empresa selecionada</h2>
            <p className="text-muted-foreground mb-6">
              Para usar o GESTÃO, você precisa estar vinculado a uma empresa. 
              Entre em contato com o administrador para associar seu usuário a uma empresa.
            </p>
            {empresasDisponiveis.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Selecione uma empresa:</p>
                {empresasDisponiveis.map(empresa => (
                  <Button 
                    key={empresa.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setEmpresaAtiva(empresa)}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    {empresa.nome}
                    {empresa.cnpj && <span className="ml-2 text-xs text-muted-foreground">({empresa.cnpj})</span>}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      {/* Glass Sidebar Premium */}
      <GlassSidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as typeof activeTab);
          // Update section based on tab
          const gestaoTabs = ["produtos", "clientes", "fornecedores", "vendas", "compras", "estoque", "orcamentos"];
          setActiveSection(gestaoTabs.includes(tab) ? "gestao" : "financeiro");
        }}
        moduleColor="blue"
      />

      {/* Widget Manager - Botão de configuração */}
      <WidgetManager empresaId={empresaAtiva?.id} />

      {/* Dynamic Floating Widgets - positioned bottom-left, left to right */}
      {(() => {
        let widgetIndex = 0;
        return (
          <>
            {isWidgetActive("resumo_financeiro") && (
              <FloatingWidget
                id="resumo-financeiro"
                title="Resumo Rápido"
                icon={<Wallet className="w-4 h-4" />}
                defaultPosition={{ x: 20, y: 20 }}
                moduleColor="green"
                index={widgetIndex++}
                onClick={() => setActiveTab("transacoes")}
              >
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Saldo</span>
                    <span className={cn("font-bold", saldo >= 0 ? "text-green-400" : "text-red-400")}>
                      {formatCurrency(saldo)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Receitas</span>
                    <span className="text-green-400">{formatCurrency(totalReceitas)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Despesas</span>
                    <span className="text-red-400">{formatCurrency(totalDespesas)}</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-xs text-muted-foreground text-center">
                    Clique para ver transações
                  </div>
                </div>
              </FloatingWidget>
            )}

            {isWidgetActive("alertas_vencimento") && (
              <FloatingWidget
                id="alertas-parcelas"
                title="Alertas de Vencimento"
                icon={<AlertTriangle className="w-4 h-4" />}
                defaultPosition={{ x: 20, y: 20 }}
                moduleColor="orange"
                index={widgetIndex++}
                onClick={() => {
                  setActiveTab("transacoes");
                  setActiveFilter("pendentes");
                }}
              >
                <div className="space-y-2">
                  {parcelasAlerta.hasAlertas ? (
                    <>
                      {parcelasAlerta.totalAtrasadas > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-red-400">Atrasadas</span>
                          <span className="font-bold text-red-400">{parcelasAlerta.totalAtrasadas}</span>
                        </div>
                      )}
                      {parcelasAlerta.totalVencendo > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-yellow-400">Vencendo em 7 dias</span>
                          <span className="font-bold text-yellow-400">{parcelasAlerta.totalVencendo}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-center text-muted-foreground py-1">
                      ✓ Nenhum vencimento próximo
                    </div>
                  )}
                  <div className="pt-2 border-t border-white/10 text-xs text-muted-foreground text-center">
                    Clique para ver pendentes
                  </div>
                </div>
              </FloatingWidget>
            )}

            {isWidgetActive("metricas_vendas") && (
              <FloatingWidget
                id="metricas-vendas"
                title="Métricas de Vendas"
                icon={<TrendingUp className="w-4 h-4" />}
                defaultPosition={{ x: 20, y: 20 }}
                moduleColor="blue"
                index={widgetIndex++}
                onClick={() => setActiveTab("vendas")}
              >
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Vendas</span>
                    <span className="font-bold text-blue">{formatCurrency(totalVendas)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Orçamentos</span>
                    <span className="text-cyan">{orcamentosAbertos}</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-xs text-muted-foreground text-center">
                    Clique para ver vendas
                  </div>
                </div>
              </FloatingWidget>
            )}

            {isWidgetActive("estoque_critico") && (
              <FloatingWidget
                id="estoque-critico"
                title="Estoque Crítico"
                icon={<Package className="w-4 h-4" />}
                defaultPosition={{ x: 20, y: 20 }}
                moduleColor="magenta"
                index={widgetIndex++}
                onClick={() => setActiveTab("produtos")}
              >
                <div className="space-y-2 text-sm">
                  {(() => {
                    const produtosCriticos = produtos?.filter(p => 
                      p.controla_estoque && 
                      p.estoque_minimo && 
                      (p.estoque_atual || 0) <= p.estoque_minimo
                    ) || [];
                    
                    if (produtosCriticos.length === 0) {
                      return (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          ✓ Nenhum produto com estoque crítico
                        </p>
                      );
                    }
                    
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Produtos críticos</span>
                          <span className="font-bold text-magenta">{produtosCriticos.length}</span>
                        </div>
                        {produtosCriticos.slice(0, 3).map(p => (
                          <div key={p.id} className="flex items-center justify-between text-xs">
                            <span className="truncate max-w-[140px]">{p.nome}</span>
                            <span className="text-red-400">{p.estoque_atual || 0}</span>
                          </div>
                        ))}
                        {produtosCriticos.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{produtosCriticos.length - 3} mais...
                          </p>
                        )}
                      </>
                    );
                  })()}
                  <div className="pt-2 border-t border-white/10 text-xs text-muted-foreground text-center">
                    Clique para ver produtos
                  </div>
                </div>
              </FloatingWidget>
            )}
          </>
        );
      })()}
      
      {/* Main Content - adjusted for right sidebar */}
      <div className="pt-4 pb-8 pr-[280px] pl-6 transition-all duration-300">

        {/* Dashboard Metrics - Only show on transacoes or produtos tabs */}
        {(activeTab === "transacoes" || activeTab === "produtos") && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {activeSection === "financeiro" ? (
              <>
                <ModernMetricCard 
                  title="Saldo Atual" 
                  value={formatCurrency(saldo)} 
                  change={saldo >= 0 ? "+12% este mês" : "-8% este mês"} 
                  changeType={saldo >= 0 ? "up" : "down"} 
                  icon={Wallet} 
                  color={saldo >= 0 ? "green" : "red"}
                  isActive={activeFilter === "all"}
                  onClick={() => handleFilterClick("all")}
                />
                <ModernMetricCard 
                  title="Receitas" 
                  value={formatCurrency(totalReceitas)} 
                  change="+15% este mês" 
                  changeType="up" 
                  icon={TrendingUp} 
                  color="green"
                  isActive={activeFilter === "receitas"}
                  onClick={() => handleFilterClick("receitas")}
                />
                <ModernMetricCard 
                  title="Despesas" 
                  value={formatCurrency(totalDespesas)} 
                  change="+5% este mês" 
                  changeType="down" 
                  icon={TrendingDown} 
                  color="red"
                  isActive={activeFilter === "despesas"}
                  onClick={() => handleFilterClick("despesas")}
                />
                <ModernMetricCard 
                  title="Pendentes" 
                  value={String(pendentes)} 
                  subtitle="Transações aguardando" 
                  icon={AlertTriangle} 
                  color="yellow"
                  isActive={activeFilter === "pendentes"}
                  onClick={() => handleFilterClick("pendentes")}
                />
              </>
            ) : (
              <>
                <ModernMetricCard 
                  title="Produtos" 
                  value={String(produtos?.length || 0)} 
                  subtitle="cadastrados"
                  icon={Package} 
                  color="emerald"
                />
                <ModernMetricCard 
                  title="Vendas" 
                  value={formatCurrency(totalVendas || 0)} 
                  subtitle="no período"
                  icon={ShoppingCart} 
                  color="blue"
                />
                <ModernMetricCard 
                  title="Compras" 
                  value={formatCurrency(totalCompras || 0)} 
                  subtitle="no período"
                  icon={ShoppingBag} 
                  color="purple"
                />
                <ModernMetricCard 
                  title="Orçamentos" 
                  value={String(orcamentosAbertos || 0)} 
                  subtitle="em aberto"
                  icon={FileText} 
                  color="yellow"
                />
              </>
            )}
          </div>
        )}

        {/* Filter indicator */}
        {activeFilter !== "all" && activeSection === "financeiro" && activeTab !== "dashboard" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtro ativo:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {activeFilter === "receitas" ? "Receitas" : activeFilter === "despesas" ? "Despesas" : "Pendentes"}
            </span>
            <button 
              onClick={() => setActiveFilter("all")}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Limpar filtro
            </button>
          </div>
        )}

        {/* Content - with animated transitions */}
        <AnimatedTabContent tabKey={activeTab}>
          {/* Dashboard */}
          {activeTab === "dashboard" && empresaAtiva && (
            <FinancialDashboard
              transacoes={transacoes}
              totalReceitas={totalReceitas}
              totalDespesas={totalDespesas}
              saldo={saldo}
              pendentes={pendentes}
              parcelasAlerta={parcelasAlerta}
              onVerTransacoes={() => {
                setActiveTab("transacoes");
                setActiveFilter("pendentes");
              }}
            />
          )}

          {/* Content - Financeiro */}
          {activeTab === "transacoes" && empresaAtiva && (
            <TransacoesUnificadasManager 
              empresaId={empresaAtiva.id}
              empresaCnpj={empresaAtiva.cnpj}
              tipoFiltro={activeFilter === "receitas" ? "receita" : activeFilter === "despesas" ? "despesa" : undefined}
              statusFiltro={activeFilter === "pendentes" ? "pendente" : undefined}
            />
          )}

          {activeTab === "categorias" && empresaAtiva && (
            <CategoriasManager empresaId={empresaAtiva.id} />
          )}

          {activeTab === "contas" && empresaAtiva && (
            <ContasBancariasManager empresaId={empresaAtiva.id} />
          )}

          {activeTab === "centros_custo" && empresaAtiva && (
            <CentrosCustoManager empresaId={empresaAtiva.id} />
          )}

          {activeTab === "metas" && empresaAtiva && (
            <MetasFinanceirasManager empresaId={empresaAtiva.id} />
          )}

          {activeTab === "recorrencias" && empresaAtiva && (
            <RecorrenciasManager empresaId={empresaAtiva.id} />
          )}

          {/* Content - Gestão */}
          {activeTab === "produtos" && empresaAtiva && (
            <ProdutosManager empresaId={empresaAtiva.id} />
          )}

          {activeTab === "clientes" && empresaAtiva && (
            <ClientesManager empresaId={empresaAtiva.id} />
          )}

          {activeTab === "fornecedores" && empresaAtiva && (
            <FornecedoresManager empresaId={empresaAtiva.id} />
          )}

          {activeTab === "vendas" && empresaAtiva && (
            <VendasManager empresaId={empresaAtiva.id} />
          )}

          {activeTab === "compras" && empresaAtiva && (
            <ComprasManager empresaId={empresaAtiva.id} empresaCnpj={empresaAtiva.cnpj} />
          )}

          {activeTab === "estoque" && empresaAtiva && (
            <EstoqueManager empresaId={empresaAtiva.id} />
          )}

          {activeTab === "orcamentos" && empresaAtiva && (
            <OrcamentosManager empresaId={empresaAtiva.id} />
          )}
        </AnimatedTabContent>

        {activeTab === "relatorios" && modo === "pro" && empresaAtiva && (
          <RelatoriosManager empresaId={empresaAtiva.id} />
        )}
      </div>
    </div>
  );
}
