import { useState, useMemo } from "react";
import { useEstoque } from "@/hooks/useEstoque";
import { useProdutos } from "@/hooks/useProdutos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

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
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total em Estoque</p>
                <p className="text-lg font-bold">{formatCurrency(valorTotalEstoque)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Produtos Ativos</p>
                <p className="text-lg font-bold">{produtosComEstoque.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Abaixo do Mínimo</p>
                <p className="text-lg font-bold">{produtosAbaixoMinimo.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex bg-card/50 rounded-lg p-1 border border-foreground/10">
            <button
              onClick={() => setView("posicao")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === "posicao" ? "bg-blue-500 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Posição
            </button>
            <button
              onClick={() => setView("movimentos")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === "movimentos" ? "bg-blue-500 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Movimentos
            </button>
          </div>
          <Button className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Novo Movimento
          </Button>
        </div>
      </div>

      {view === "posicao" ? (
        <Card className="border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-blue-500" />
              Posição de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Estoque Atual</TableHead>
                  <TableHead className="text-center">Mínimo</TableHead>
                  <TableHead className="text-right">Valor Unit.</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.map((p) => {
                  const estoqueAtual = p.estoque_atual ?? 0;
                  const estoqueMinimo = p.estoque_minimo ?? 0;
                  const abaixoMinimo = estoqueAtual < estoqueMinimo;
                  const valorTotal = estoqueAtual * (p.preco_custo ?? 0);

                  return (
                    <TableRow key={p.id} className={abaixoMinimo ? "bg-yellow-500/5" : ""}>
                      <TableCell className="font-mono text-sm">{p.codigo || "-"}</TableCell>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-center">
                        <span className={abaixoMinimo ? "text-yellow-500 font-semibold" : ""}>
                          {estoqueAtual}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{estoqueMinimo}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.preco_custo ?? 0)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(valorTotal)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-blue-500" />
              Movimentações de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            {movimentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma movimentação registrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-center">Saldo Ant.</TableHead>
                    <TableHead className="text-center">Saldo Post.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentos.slice(0, 50).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.created_at.split('T')[0] + 'T12:00:00').toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            m.tipo === "entrada"
                              ? "bg-green-500/20 text-green-400"
                              : m.tipo === "saida"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-blue-500/20 text-blue-400"
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
