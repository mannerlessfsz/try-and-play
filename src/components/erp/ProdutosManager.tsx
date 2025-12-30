import { useState } from "react";
import { useProdutos } from "@/hooks/useProdutos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";

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
            className="pl-10"
          />
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <Card className="border-blue-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-blue-500" />
            Produtos Cadastrados ({filteredProdutos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProdutos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum produto cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Preço Custo</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.map((p) => {
                  const estoqueAtual = p.estoque_atual ?? 0;
                  const estoqueMinimo = p.estoque_minimo ?? 0;
                  const abaixoMinimo = estoqueAtual < estoqueMinimo;
                  
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{p.codigo || "-"}</TableCell>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.preco_custo || 0)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.preco_venda || 0)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {abaixoMinimo && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                          <span className={abaixoMinimo ? "text-yellow-500" : ""}>{estoqueAtual}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.ativo ? "default" : "secondary"}>
                          {p.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
