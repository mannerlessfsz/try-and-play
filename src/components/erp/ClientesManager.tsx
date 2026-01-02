import { useState, useMemo, useCallback } from "react";
import { useClientes } from "@/hooks/useClientes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Edit, Trash2 } from "lucide-react";
import { ClienteFormModal } from "./ClienteFormModal";

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
            className="pl-10"
          />
        </div>
        <Button className="bg-green-500 hover:bg-green-600" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card className="border-green-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-green-500" />
            Clientes Cadastrados ({filteredClientes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cliente cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {c.tipo_pessoa === "juridica" ? "PJ" : "PF"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.cpf_cnpj || "-"}</TableCell>
                    <TableCell>{c.telefone || c.celular || "-"}</TableCell>
                    <TableCell>
                      {c.cidade && c.estado ? `${c.cidade}/${c.estado}` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.ativo ? "default" : "secondary"}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(c)}
                        >
                          <Edit className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleDelete(c.id, c.nome)}
                          disabled={deleteCliente.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClienteFormModal 
        open={showModal} 
        onClose={handleCloseModal} 
        empresaId={empresaId}
        cliente={editingCliente}
      />
    </div>
  );
}
