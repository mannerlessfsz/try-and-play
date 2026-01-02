import { useState, useMemo } from "react";
import { useVendas } from "@/hooks/useVendas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { VendaFormModal } from "./VendaFormModal";
import { formatCurrency } from "@/lib/formatters";

interface VendasManagerProps {
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

export function VendasManager({ empresaId }: VendasManagerProps) {
  const { vendas, isLoading } = useVendas(empresaId);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filteredVendas = useMemo(() => 
    vendas.filter(v =>
      v.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.numero?.toString().includes(searchTerm)
    ), [vendas, searchTerm]);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando vendas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar venda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="bg-green-500 hover:bg-green-600" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Venda
        </Button>
      </div>

      <Card className="border-green-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="w-5 h-5 text-green-500" />
            Vendas ({filteredVendas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVendas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma venda registrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendas.map((v) => (
                  <TableRow key={v.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono">#{v.numero || "-"}</TableCell>
                    <TableCell>{new Date(v.data_venda).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{v.cliente?.nome || "-"}</TableCell>
                    <TableCell className="text-right font-semibold text-green-500">
                      {formatCurrency(v.total || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusColors[v.status || "rascunho"]}>
                        {v.status?.replace("_", " ") || "rascunho"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VendaFormModal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        empresaId={empresaId} 
      />
    </div>
  );
}
