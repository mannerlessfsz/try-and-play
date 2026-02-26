import { useState } from "react";
import { useFornecedores } from "@/hooks/useFornecedores";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Truck, Edit, Trash2 } from "lucide-react";
import { FornecedorFormModal } from "./FornecedorFormModal";
import { GlassCard, GlassSectionHeader } from "@/components/gestao/GlassCard";

interface FornecedoresManagerProps {
  empresaId: string;
}

export function FornecedoresManager({ empresaId }: FornecedoresManagerProps) {
  const { fornecedores, isLoading, deleteFornecedor } = useFornecedores(empresaId);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<any>(null);

  const filteredFornecedores = fornecedores.filter(f =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cpf_cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (fornecedor: any) => {
    setEditingFornecedor(fornecedor);
    setShowModal(true);
  };

  const handleDelete = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja excluir o fornecedor "${nome}"?`)) {
      deleteFornecedor.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFornecedor(null);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando fornecedores...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass border-border/30"
          />
        </div>
        <Button className="bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange))]/80 rounded-xl" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <GlassCard accentColor="hsl(var(--orange))">
        <div className="p-5">
          <GlassSectionHeader
            icon={<Truck className="w-4 h-4" style={{ color: "hsl(var(--orange))" }} />}
            title="Fornecedores Cadastrados"
            count={filteredFornecedores.length}
            accentColor="hsl(var(--orange))"
          />
          <div className="mt-4">
            {filteredFornecedores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum fornecedor cadastrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">CNPJ/CPF</TableHead>
                    <TableHead className="text-muted-foreground">Contato</TableHead>
                    <TableHead className="text-muted-foreground">Telefone</TableHead>
                    <TableHead className="text-muted-foreground">Prazo Entrega</TableHead>
                    <TableHead className="text-center text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFornecedores.map((f) => (
                    <TableRow key={f.id} className="border-border/20 hover:bg-foreground/[0.02]">
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{f.cpf_cnpj || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{f.contato_nome || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{f.telefone || f.celular || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {f.prazo_entrega_dias ? `${f.prazo_entrega_dias} dias` : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={f.ativo 
                          ? "bg-[hsl(var(--cyan))]/15 text-[hsl(var(--cyan))] border-[hsl(var(--cyan))]/30" 
                          : "bg-muted text-muted-foreground border-border/30"
                        }>
                          {f.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-foreground/5" onClick={() => handleEdit(f)}>
                            <Edit className="w-4 h-4 text-[hsl(var(--blue))]" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-foreground/5" onClick={() => handleDelete(f.id, f.nome)} disabled={deleteFornecedor.isPending}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </GlassCard>

      <FornecedorFormModal 
        open={showModal} 
        onClose={handleCloseModal} 
        empresaId={empresaId}
        fornecedor={editingFornecedor}
      />
    </div>
  );
}
