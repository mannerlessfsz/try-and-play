import { useState } from "react";
import { useProdutos } from "@/hooks/useProdutos";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { GlassCard, GlassSectionHeader } from "@/components/gestao/GlassCard";

interface ProdutosManagerProps {
  empresaId: string;
}

export function ProdutosManager({ empresaId }: ProdutosManagerProps) {
  const { produtos, isLoading } = useProdutos(empresaId);
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando produtos...</div>;
  }

  return (
    <div className="space-y-4">
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
        <Button className="bg-[hsl(var(--blue))] hover:bg-[hsl(var(--blue))]/80 rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <GlassCard accentColor="hsl(var(--blue))">
        <div className="p-5">
          <GlassSectionHeader
            icon={<Package className="w-4 h-4" style={{ color: "hsl(var(--blue))" }} />}
            title="Produtos Cadastrados"
            count={filteredProdutos.length}
            accentColor="hsl(var(--blue))"
          />
          <div className="mt-4">
            {filteredProdutos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum produto cadastrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Código</TableHead>
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-right text-muted-foreground">Preço Custo</TableHead>
                    <TableHead className="text-right text-muted-foreground">Preço Venda</TableHead>
                    <TableHead className="text-center text-muted-foreground">Estoque</TableHead>
                    <TableHead className="text-center text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProdutos.map((p) => {
                    const estoqueAtual = p.estoque_atual ?? 0;
                    const estoqueMinimo = p.estoque_minimo ?? 0;
                    const abaixoMinimo = estoqueAtual < estoqueMinimo;
                    
                    return (
                      <TableRow key={p.id} className="border-border/20 hover:bg-foreground/[0.02]">
                        <TableCell className="font-mono text-sm text-muted-foreground">{p.codigo || "-"}</TableCell>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(p.preco_custo || 0)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.preco_venda || 0)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {abaixoMinimo && <AlertTriangle className="w-3 h-3 text-[hsl(var(--yellow))]" />}
                            <span className={abaixoMinimo ? "text-[hsl(var(--yellow))]" : ""}>{estoqueAtual}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            className={p.ativo 
                              ? "bg-[hsl(var(--cyan))]/15 text-[hsl(var(--cyan))] border-[hsl(var(--cyan))]/30" 
                              : "bg-muted text-muted-foreground border-border/30"
                            }
                          >
                            {p.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
