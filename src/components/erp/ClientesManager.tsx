import { useState, useMemo, useCallback } from "react";
import { useClientes } from "@/hooks/useClientes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Edit, Trash2 } from "lucide-react";
import { ClienteFormModal } from "./ClienteFormModal";
import { GlassCard, GlassSectionHeader } from "@/components/gestao/GlassCard";

interface ClientesManagerProps {
  empresaId: string;
}

export function ClientesManager({ empresaId }: ClientesManagerProps) {
  const { clientes, isLoading, deleteCliente } = useClientes(empresaId);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<any>(null);

  const filteredClientes = useMemo(() => 
    clientes.filter(c =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf_cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [clientes, searchTerm]);

  const handleEdit = useCallback((cliente: any) => {
    setEditingCliente(cliente);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback((id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja excluir o cliente "${nome}"?`)) {
      deleteCliente.mutate(id);
    }
  }, [deleteCliente]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingCliente(null);
  }, []);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando clientes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass border-border/30"
          />
        </div>
        <Button className="bg-[hsl(var(--cyan))] hover:bg-[hsl(var(--cyan))]/80 text-background rounded-xl" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <GlassCard accentColor="hsl(var(--cyan))">
        <div className="p-5">
          <GlassSectionHeader
            icon={<Users className="w-4 h-4" style={{ color: "hsl(var(--cyan))" }} />}
            title="Clientes Cadastrados"
            count={filteredClientes.length}
            accentColor="hsl(var(--cyan))"
          />
          <div className="mt-4">
            {filteredClientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente cadastrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-muted-foreground">CPF/CNPJ</TableHead>
                    <TableHead className="text-muted-foreground">Telefone</TableHead>
                    <TableHead className="text-muted-foreground">Cidade/UF</TableHead>
                    <TableHead className="text-center text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((c) => (
                    <TableRow key={c.id} className="border-border/20 hover:bg-foreground/[0.02]">
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border/30 text-muted-foreground">
                          {c.tipo_pessoa === "juridica" ? "PJ" : "PF"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{c.cpf_cnpj || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.telefone || c.celular || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.cidade && c.estado ? `${c.cidade}/${c.estado}` : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={c.ativo 
                          ? "bg-[hsl(var(--cyan))]/15 text-[hsl(var(--cyan))] border-[hsl(var(--cyan))]/30" 
                          : "bg-muted text-muted-foreground border-border/30"
                        }>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-foreground/5" onClick={() => handleEdit(c)}>
                            <Edit className="w-4 h-4 text-[hsl(var(--blue))]" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-foreground/5" onClick={() => handleDelete(c.id, c.nome)} disabled={deleteCliente.isPending}>
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

      <ClienteFormModal 
        open={showModal} 
        onClose={handleCloseModal} 
        empresaId={empresaId}
        cliente={editingCliente}
      />
    </div>
  );
}
