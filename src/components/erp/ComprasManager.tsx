import { useState, useMemo } from "react";
import { useCompras } from "@/hooks/useCompras";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingBag, FileUp, Package, DollarSign, TrendingUp, Eye, Hash, Calendar } from "lucide-react";
import { ImportNFeModal } from "./ImportNFeModal";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { GlassCard, MetricGlassCard, GlassSectionHeader } from "@/components/gestao/GlassCard";
import { motion } from "framer-motion";

interface ComprasManagerProps {
  empresaId: string;
  empresaCnpj?: string | null;
}

const statusColors: Record<string, string> = {
  rascunho: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pendente: "bg-[hsl(var(--yellow))]/20 text-[hsl(var(--yellow))] border-[hsl(var(--yellow))]/30",
  aprovado: "bg-[hsl(var(--blue))]/20 text-[hsl(var(--blue))] border-[hsl(var(--blue))]/30",
  em_andamento: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  concluido: "bg-[hsl(var(--cyan))]/20 text-[hsl(var(--cyan))] border-[hsl(var(--cyan))]/30",
  cancelado: "bg-destructive/20 text-destructive border-destructive/30",
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

  const filteredCompras = useMemo(() => 
    compras.filter(c =>
      c.fornecedor?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numero?.toString().includes(searchTerm)
    ), [compras, searchTerm]);

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
            className="pl-10 glass border-border/30"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-[hsl(var(--cyan))]/30 text-[hsl(var(--cyan))] hover:bg-[hsl(var(--cyan))]/10 rounded-xl"
            onClick={() => setImportModalOpen(true)}
          >
            <FileUp className="w-4 h-4 mr-2" />
            Importar NF-e
          </Button>
          <Button className="bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange))]/80 rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Nova Compra
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricGlassCard
          icon={<DollarSign className="w-5 h-5" style={{ color: "hsl(var(--blue))" }} />}
          label="Total em Compras"
          value={formatCurrency(totalCompras)}
          accentColor="hsl(var(--blue))"
          index={0}
        />
        <MetricGlassCard
          icon={<Package className="w-5 h-5" style={{ color: "hsl(var(--yellow))" }} />}
          label="Pendentes"
          value={comprasPendentes}
          accentColor="hsl(var(--yellow))"
          index={1}
        />
        <MetricGlassCard
          icon={<TrendingUp className="w-5 h-5" style={{ color: "hsl(var(--cyan))" }} />}
          label="Recebidas"
          value={comprasRecebidas}
          accentColor="hsl(var(--cyan))"
          index={2}
        />
      </div>

      {/* Cards de Notas Importadas */}
      {filteredCompras.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Notas Fiscais Importadas ({filteredCompras.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCompras.slice(0, 9).map((compra, index) => (
              <GlassCard key={compra.id} accentColor="hsl(var(--orange))" index={index}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[hsl(var(--orange))]/15 border border-[hsl(var(--orange))]/25">
                        <Hash className="w-3.5 h-3.5" style={{ color: "hsl(var(--orange))" }} />
                      </div>
                      <span className="font-mono font-semibold text-sm">
                        NF-e #{compra.numero || "S/N"}
                      </span>
                    </div>
                    <Badge className={`text-xs ${statusColors[compra.status || "rascunho"]}`}>
                      {statusLabels[compra.status || "rascunho"]}
                    </Badge>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Fornecedor:</span>
                    <p className="font-medium truncate" title={compra.fornecedor?.nome}>
                      {compra.fornecedor?.nome || "Não informado"}
                    </p>
                  </div>

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

                  <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Valor Total:</span>
                    <span className="text-lg font-bold text-destructive">
                      {formatCurrency(compra.total || 0)}
                    </span>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="w-full text-xs hover:bg-foreground/5">
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </GlassCard>
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
      <GlassCard accentColor="hsl(var(--orange))">
        <div className="p-5">
          <GlassSectionHeader
            icon={<ShoppingBag className="w-4 h-4" style={{ color: "hsl(var(--orange))" }} />}
            title="Lista de Compras"
            count={filteredCompras.length}
            accentColor="hsl(var(--orange))"
          />
          <div className="mt-4">
            {filteredCompras.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma compra registrada</p>
                <p className="text-sm mt-1">Importe uma NF-e para começar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nº Nota</TableHead>
                    <TableHead className="text-muted-foreground">Data Emissão</TableHead>
                    <TableHead className="text-muted-foreground">Entrada</TableHead>
                    <TableHead className="text-muted-foreground">Fornecedor</TableHead>
                    <TableHead className="text-right text-muted-foreground">Total</TableHead>
                    <TableHead className="text-center text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompras.map((c) => (
                    <TableRow key={c.id} className="border-border/20 hover:bg-foreground/[0.02] cursor-pointer">
                      <TableCell className="font-mono font-medium">#{c.numero || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(c.data_compra)}</TableCell>
                      <TableCell className="text-muted-foreground">{c.data_entrega_real ? formatDate(c.data_entrega_real) : "-"}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {c.fornecedor?.nome || "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
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
          </div>
        </div>
      </GlassCard>

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
