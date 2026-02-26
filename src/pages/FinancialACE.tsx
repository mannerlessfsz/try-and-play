import { useState, useCallback, useEffect, useRef } from "react";
import { Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useParcelasAlerta } from "@/hooks/useParcelasAlerta";
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
import { GestaoCommandBar } from "@/components/gestao/GestaoCommandBar";
import { AnimatedTabContent } from "@/components/gestao/AnimatedTabContent";
import { BentoDashboard } from "@/components/gestao/BentoDashboard";

type FilterType = "all" | "receitas" | "despesas" | "pendentes";

export default function FinancialACE() {
  const [activeTab, setActiveTab] = useState("transacoes");
  const [activeSection, setActiveSection] = useState<"financeiro" | "gestao">("financeiro");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { empresaAtiva, empresasDisponiveis, setEmpresaAtiva, loading: empresaLoading } = useEmpresaAtiva();
  const { toast } = useToast();
  const alertaShown = useRef(false);

  const { totalReceitas, totalDespesas, saldo, pendentes, transacoes } = useTransacoes(empresaAtiva?.id);
  const parcelasAlerta = useParcelasAlerta(empresaAtiva?.id);

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

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const gestaoTabs = ["produtos", "clientes", "fornecedores", "vendas", "compras", "estoque", "orcamentos"];
    setActiveSection(gestaoTabs.includes(tab) ? "gestao" : "financeiro");
  }, []);

  if (!empresaLoading && !empresaAtiva) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl max-w-md w-full p-8 text-center relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[hsl(var(--blue))] opacity-10 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[hsl(var(--blue))]/15 border border-[hsl(var(--blue))]/25 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8" style={{ color: "hsl(var(--blue))" }} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma empresa selecionada</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Para usar o GESTÃO, você precisa estar vinculado a uma empresa.
            </p>
            {empresasDisponiveis.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Selecione uma empresa:</p>
                {empresasDisponiveis.map(empresa => (
                  <Button
                    key={empresa.id}
                    variant="outline"
                    className="w-full justify-start glass border-border/30 hover:border-[hsl(var(--blue))]/40 rounded-xl"
                    onClick={() => setEmpresaAtiva(empresa)}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    {empresa.nome}
                    {empresa.cnpj && <span className="ml-2 text-xs text-muted-foreground">({empresa.cnpj})</span>}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Command Bar */}
      <GestaoCommandBar
        activeTab={activeTab}
        activeSection={activeSection}
        onTabChange={handleTabChange}
        onSectionChange={setActiveSection}
      />

      {/* Full-width content — widened to match Conversores */}
      <div className="px-4 md:px-8 lg:px-12 py-5 max-w-[1600px] mx-auto">
        {/* Filter indicator */}
        {activeFilter !== "all" && activeSection === "financeiro" && activeTab !== "dashboard" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtro ativo:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(var(--blue))]/20 text-[hsl(var(--blue))] border border-[hsl(var(--blue))]/30">
              {activeFilter === "receitas" ? "Receitas" : activeFilter === "despesas" ? "Despesas" : "Pendentes"}
            </span>
            <button
              onClick={() => setActiveFilter("all")}
              className="text-xs text-[hsl(var(--blue))] hover:text-[hsl(var(--blue))]/80 underline"
            >
              Limpar filtro
            </button>
          </div>
        )}

        <AnimatedTabContent tabKey={activeTab}>
          {activeTab === "dashboard" && empresaAtiva && (
            <BentoDashboard
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

        {activeTab === "relatorios" && empresaAtiva && (
          <RelatoriosManager empresaId={empresaAtiva.id} />
        )}
      </div>
    </div>
  );
}
