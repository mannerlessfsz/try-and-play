import { useState } from "react";
import { useFornecedores } from "@/hooks/useFornecedores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Truck } from "lucide-react";
import { FornecedorFormModal } from "./FornecedorFormModal";

interface FornecedoresManagerProps {
  empresaId: string;
}

export function FornecedoresManager({ empresaId }: FornecedoresManagerProps) {
  const { fornecedores, isLoading } = useFornecedores(empresaId);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filteredFornecedores = fornecedores.filter(f =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cpf_cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            className="pl-10"
          />
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <Card className="border-orange-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="w-5 h-5 text-orange-500" />
            Fornecedores Cadastrados ({filteredFornecedores.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFornecedores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum fornecedor cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Prazo Entrega</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFornecedores.map((f) => (
                  <TableRow key={f.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell className="font-mono text-sm">{f.cpf_cnpj || "-"}</TableCell>
                    <TableCell>{f.contato_nome || "-"}</TableCell>
                    <TableCell>{f.telefone || f.celular || "-"}</TableCell>
                    <TableCell>
                      {f.prazo_entrega_dias ? `${f.prazo_entrega_dias} dias` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={f.ativo ? "default" : "secondary"}>
                        {f.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FornecedorFormModal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        empresaId={empresaId} 
      />
    </div>
  );
}
