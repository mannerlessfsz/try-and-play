import { useState, useMemo } from "react";
import { useEstoque } from "@/hooks/useEstoque";
import { useProdutos } from "@/hooks/useProdutos";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { GlassCard, MetricGlassCard, GlassSectionHeader } from "@/components/gestao/GlassCard";

interface EstoqueManagerProps {
  empresaId: string;
}

export function EstoqueManager({ empresaId }: EstoqueManagerProps) {
  const { movimentos, isLoading: loadingMovimentos } = useEstoque(empresaId);
  const { produtos, isLoading: loadingProdutos } = useProdutos(empresaId);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"posicao" | "movimentos">("posicao");

  const produtosComEstoque = useMemo(() => 
    produtos.filter(p => p.controla_estoque), [produtos]);
    
  const produtosAbaixoMinimo = useMemo(() => 
    produtosComEstoque.filter(p => (p.estoque_atual ?? 0) < (p.estoque_minimo ?? 0)), 
    [produtosComEstoque]);

  const valorTotalEstoque = useMemo(() => 
    produtosComEstoque.reduce((acc, p) => acc + (p.estoque_atual ?? 0) * (p.preco_custo ?? 0), 0),
    [produtosComEstoque]);

  const filteredProdutos = useMemo(() => 
    produtosComEstoque.filter(p =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [produtosComEstoque, searchTerm]);

  if (loadingProdutos || loadingMovimentos) {
    return <div className="text-center py-8 text-muted-foreground">Carregando estoque...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <MetricGlassCard
          icon={<Package className="w-5 h-5" style={{ color: "hsl(var(--blue))" }} />}
          label="Total em Estoque"
          value={formatCurrency(valorTotalEstoque)}
          accentColor="hsl(var(--blue))"
          index={0}
        />
        <MetricGlassCard
          icon={<Package className="w-5 h-5" style={{ color: "hsl(var(--cyan))" }} />}
          label="Produtos Ativos"
          value={produtosComEstoque.length}
          accentColor="hsl(var(--cyan))"
          index={1}
        />
        <MetricGlassCard
          icon={<AlertTriangle className="w-5 h-5" style={{ color: "hsl(var(--yellow))" }} />}
          label="Abaixo do Mínimo"
          value={produtosAbaixoMinimo.length}
          accentColor="hsl(var(--yellow))"
          index={2}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass border-border/30"
          />
        </div>
        <div className="flex gap-2">
          <div className="glass rounded-xl p-1 flex">
            <button
              onClick={() => setView("posicao")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "posicao" ? "bg-[hsl(var(--blue))]/20 text-[hsl(var(--blue))] border border-[hsl(var(--blue))]/30" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Posição
            </button>
            <button
              onClick={() => setView("movimentos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "movimentos" ? "bg-[hsl(var(--blue))]/20 text-[hsl(var(--blue))] border border-[hsl(var(--blue))]/30" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Movimentos
            </button>
          </div>
          <Button className="bg-[hsl(var(--blue))] hover:bg-[hsl(var(--blue))]/80 rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Novo Movimento
          </Button>
        </div>
      </div>

      {view === "posicao" ? (
        <GlassCard accentColor="hsl(var(--blue))">
          <div className="p-5">
            <GlassSectionHeader
              icon={<Package className="w-4 h-4" style={{ color: "hsl(var(--blue))" }} />}
              title="Posição de Estoque"
              accentColor="hsl(var(--blue))"
            />
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Código</TableHead>
                    <TableHead className="text-muted-foreground">Produto</TableHead>
                    <TableHead className="text-center text-muted-foreground">Estoque Atual</TableHead>
                    <TableHead className="text-center text-muted-foreground">Mínimo</TableHead>
                    <TableHead className="text-right text-muted-foreground">Valor Unit.</TableHead>
                    <TableHead className="text-right text-muted-foreground">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProdutos.map((p) => {
                    const estoqueAtual = p.estoque_atual ?? 0;
                    const estoqueMinimo = p.estoque_minimo ?? 0;
                    const abaixoMinimo = estoqueAtual < estoqueMinimo;
                    const valorTotal = estoqueAtual * (p.preco_custo ?? 0);

                    return (
                      <TableRow key={p.id} className={`border-border/20 hover:bg-foreground/[0.02] ${abaixoMinimo ? "bg-[hsl(var(--yellow))]/[0.03]" : ""}`}>
                        <TableCell className="font-mono text-sm text-muted-foreground">{p.codigo || "-"}</TableCell>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="text-center">
                          <span className={abaixoMinimo ? "text-[hsl(var(--yellow))] font-semibold" : ""}>
                            {estoqueAtual}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{estoqueMinimo}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(p.preco_custo ?? 0)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(valorTotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard accentColor="hsl(var(--blue))">
          <div className="p-5">
            <GlassSectionHeader
              icon={<Package className="w-4 h-4" style={{ color: "hsl(var(--blue))" }} />}
              title="Movimentações de Estoque"
              accentColor="hsl(var(--blue))"
            />
            <div className="mt-4">
              {movimentos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação registrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Data</TableHead>
                      <TableHead className="text-muted-foreground">Tipo</TableHead>
                      <TableHead className="text-muted-foreground">Produto</TableHead>
                      <TableHead className="text-center text-muted-foreground">Quantidade</TableHead>
                      <TableHead className="text-center text-muted-foreground">Saldo Ant.</TableHead>
                      <TableHead className="text-center text-muted-foreground">Saldo Post.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentos.slice(0, 50).map((m) => (
                      <TableRow key={m.id} className="border-border/20 hover:bg-foreground/[0.02]">
                        <TableCell className="text-muted-foreground">{new Date(m.created_at.split('T')[0] + 'T12:00:00').toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              m.tipo === "entrada"
                                ? "bg-[hsl(var(--cyan))]/20 text-[hsl(var(--cyan))]"
                                : m.tipo === "saida"
                                ? "bg-destructive/20 text-destructive"
                                : "bg-[hsl(var(--blue))]/20 text-[hsl(var(--blue))]"
                            }
                          >
                            <span className="flex items-center gap-1">
                              {m.tipo === "entrada" && <ArrowUpRight className="w-3 h-3" />}
                              {m.tipo === "saida" && <ArrowDownRight className="w-3 h-3" />}
                              {m.tipo}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{m.produto?.nome || "-"}</TableCell>
                        <TableCell className="text-center font-semibold">{m.quantidade}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{m.saldo_anterior ?? "-"}</TableCell>
                        <TableCell className="text-center">{m.saldo_posterior ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
