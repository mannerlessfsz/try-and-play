import { useState } from "react";
import { useCompras } from "@/hooks/useCompras";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingBag, FileUp } from "lucide-react";

interface ComprasManagerProps {
  empresaId: string;
}

const statusColors: Record<string, string> = {
  rascunho: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pendente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  aprovado: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  em_andamento: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  concluido: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelado: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function ComprasManager({ empresaId }: ComprasManagerProps) {
  const { compras, isLoading } = useCompras(empresaId);
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const filteredCompras = compras.filter(c =>
    c.fornecedor?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.numero?.toString().includes(searchTerm)
  );

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando compras...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar compra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10">
            <FileUp className="w-4 h-4 mr-2" />
            Importar NF-e
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Nova Compra
          </Button>
        </div>
      </div>

      <Card className="border-orange-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            Compras ({filteredCompras.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCompras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma compra registrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompras.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono">#{c.numero || "-"}</TableCell>
                    <TableCell>{new Date(c.data_compra).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{c.fornecedor?.nome || "-"}</TableCell>
                    <TableCell className="text-right font-semibold text-red-500">
                      {formatCurrency(c.total || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusColors[c.status || "rascunho"]}>
                        {c.status?.replace("_", " ") || "rascunho"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
