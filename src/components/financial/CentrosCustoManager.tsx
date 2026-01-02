import { useState } from "react";
import { useCentrosCusto, CentroCustoInput } from "@/hooks/useCentrosCusto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2, Building2 } from "lucide-react";

interface CentrosCustoManagerProps {
  empresaId: string;
}

export function CentrosCustoManager({ empresaId }: CentrosCustoManagerProps) {
  const { centros, isLoading, createCentro, updateCentro, deleteCentro, isCreating, isUpdating } = useCentrosCusto(empresaId);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: "", descricao: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updateCentro({ id: editingId, ...formData }, {
        onSuccess: () => {
          setIsOpen(false);
          setEditingId(null);
          setFormData({ nome: "", descricao: "" });
        }
      });
    } else {
      createCentro({ empresa_id: empresaId, ...formData } as CentroCustoInput, {
        onSuccess: () => {
          setIsOpen(false);
          setFormData({ nome: "", descricao: "" });
        }
      });
    }
  };

  const handleEdit = (centro: { id: string; nome: string; descricao: string | null }) => {
    setEditingId(centro.id);
    setFormData({ nome: centro.nome, descricao: centro.descricao || "" });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente excluir este centro de custo?")) {
      deleteCentro(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Centros de Custo
        </CardTitle>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingId(null);
            setFormData({ nome: "", descricao: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Novo Centro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Administrativo, Comercial, Produção..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {editingId ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {centros.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum centro de custo cadastrado</p>
            <p className="text-sm">Crie centros de custo para organizar suas despesas</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centros.map((centro) => (
                <TableRow key={centro.id}>
                  <TableCell className="font-medium">{centro.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{centro.descricao || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(centro)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(centro.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
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
  );
}
