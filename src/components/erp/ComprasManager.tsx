import { useState } from "react";
import { useCompras } from "@/hooks/useCompras";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingBag, FileUp, Package, Calendar, Hash, DollarSign, TrendingUp, Eye } from "lucide-react";
import { ImportNFeModal } from "./ImportNFeModal";
import { useQueryClient } from "@tanstack/react-query";

interface ComprasManagerProps {
  empresaId: string;
  empresaCnpj?: string | null;
}

const statusColors: Record<string, string> = {
  rascunho: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pendente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  aprovado: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  em_andamento: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  concluido: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelado: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  pendente: "Pendente",
  aprovado: "Aprovado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export function ComprasManager({ empresaId, empresaCnpj }: ComprasManagerProps) {
  const { compras, isLoading, totalCompras, comprasPendentes, comprasRecebidas } = useCompras(empresaId);
  const [searchTerm, setSearchTerm] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR");

  const filteredCompras = compras.filter(c =>
    c.fornecedor?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.numero?.toString().includes(searchTerm)
  );

  const handleImportComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["produtos", empresaId] });
    queryClient.invalidateQueries({ queryKey: ["fornecedores", empresaId] });
    queryClient.invalidateQueries({ queryKey: ["transacoes", empresaId] });
    queryClient.invalidateQueries({ queryKey: ["estoque_movimentos", empresaId] });
    queryClient.invalidateQueries({ queryKey: ["compras", empresaId] });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando compras...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por fornecedor ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-green-500/30 text-green-500 hover:bg-green-500/10"
            onClick={() => setImportModalOpen(true)}
          >
            <FileUp className="w-4 h-4 mr-2" />
            Importar NF-e
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Nova Compra
          </Button>
        </div>
      </div>

      {/* Métricas Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total em Compras</p>
                <p className="text-lg font-bold text-blue-500">{formatCurrency(totalCompras)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Package className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-lg font-bold text-yellow-500">{comprasPendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recebidas</p>
                <p className="text-lg font-bold text-green-500">{comprasRecebidas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Notas Importadas */}
      {filteredCompras.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Notas Fiscais Importadas ({filteredCompras.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCompras.slice(0, 9).map((compra) => (
              <Card 
                key={compra.id} 
                className="border-orange-500/20 hover:border-orange-500/40 transition-colors cursor-pointer group"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header do Card */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-orange-500/20">
                        <Hash className="w-3.5 h-3.5 text-orange-500" />
                      </div>
                      <span className="font-mono font-semibold text-sm">
                        NF-e #{compra.numero || "S/N"}
                      </span>
                    </div>
                    <Badge className={`text-xs ${statusColors[compra.status || "rascunho"]}`}>
                      {statusLabels[compra.status || "rascunho"]}
                    </Badge>
                  </div>

                  {/* Fornecedor */}
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Fornecedor:</span>
                    <p className="font-medium truncate" title={compra.fornecedor?.nome}>
                      {compra.fornecedor?.nome || "Não informado"}
                    </p>
                  </div>

                  {/* Grid de Infos */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Emissão:</span>
                    </div>
                    <span className="font-medium text-right">{formatDate(compra.data_compra)}</span>
                    
                    {compra.data_entrega_real && (
                      <>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Entrada:</span>
                        </div>
                        <span className="font-medium text-right">{formatDate(compra.data_entrega_real)}</span>
                      </>
                    )}
                  </div>

                  {/* Valor Total */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Valor Total:</span>
                    <span className="text-lg font-bold text-red-500">
                      {formatCurrency(compra.total || 0)}
                    </span>
                  </div>

                  {/* Hover Action */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredCompras.length > 9 && (
            <p className="text-xs text-muted-foreground text-center">
              Mostrando 9 de {filteredCompras.length} notas. Use a busca para filtrar.
            </p>
          )}
        </div>
      )}

      {/* Tabela Completa */}
      <Card className="border-orange-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            Lista de Compras ({filteredCompras.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCompras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma compra registrada</p>
              <p className="text-sm mt-1">Importe uma NF-e para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Nota</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompras.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell className="font-mono font-medium">#{c.numero || "-"}</TableCell>
                    <TableCell>{formatDate(c.data_compra)}</TableCell>
                    <TableCell>{c.data_entrega_real ? formatDate(c.data_entrega_real) : "-"}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {c.fornecedor?.nome || "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-500">
                      {formatCurrency(c.total || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusColors[c.status || "rascunho"]}>
                        {statusLabels[c.status || "rascunho"]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ImportNFeModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        empresaId={empresaId}
        empresaCnpj={empresaCnpj}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
