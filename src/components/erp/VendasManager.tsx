import { useState, useMemo } from "react";
import { useVendas } from "@/hooks/useVendas";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { VendaFormModal } from "./VendaFormModal";
import { formatCurrency } from "@/lib/formatters";
import { GlassCard, GlassSectionHeader } from "@/components/gestao/GlassCard";

interface VendasManagerProps {
  empresaId: string;
}

const statusColors: Record<string, string> = {
  rascunho: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pendente: "bg-[hsl(var(--yellow))]/20 text-[hsl(var(--yellow))] border-[hsl(var(--yellow))]/30",
  aprovado: "bg-[hsl(var(--blue))]/20 text-[hsl(var(--blue))] border-[hsl(var(--blue))]/30",
  em_andamento: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  concluido: "bg-[hsl(var(--cyan))]/20 text-[hsl(var(--cyan))] border-[hsl(var(--cyan))]/30",
  cancelado: "bg-destructive/20 text-destructive border-destructive/30",
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
            className="pl-10 glass border-border/30"
          />
        </div>
        <Button className="bg-[hsl(var(--cyan))] hover:bg-[hsl(var(--cyan))]/80 text-background rounded-xl" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Venda
        </Button>
      </div>

      <GlassCard accentColor="hsl(var(--cyan))">
        <div className="p-5">
          <GlassSectionHeader
            icon={<ShoppingCart className="w-4 h-4" style={{ color: "hsl(var(--cyan))" }} />}
            title="Vendas"
            count={filteredVendas.length}
            accentColor="hsl(var(--cyan))"
          />
          <div className="mt-4">
            {filteredVendas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma venda registrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nº</TableHead>
                    <TableHead className="text-muted-foreground">Data</TableHead>
                    <TableHead className="text-muted-foreground">Cliente</TableHead>
                    <TableHead className="text-right text-muted-foreground">Total</TableHead>
                    <TableHead className="text-center text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas.map((v) => (
                    <TableRow key={v.id} className="border-border/20 hover:bg-foreground/[0.02]">
                      <TableCell className="font-mono text-muted-foreground">#{v.numero || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(v.data_venda + 'T12:00:00').toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">{v.cliente?.nome || "-"}</TableCell>
                      <TableCell className="text-right font-semibold text-[hsl(var(--cyan))]">
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
          </div>
        </div>
      </GlassCard>

      <VendaFormModal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        empresaId={empresaId} 
      />
    </div>
  );
}
