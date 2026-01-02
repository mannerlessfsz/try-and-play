import { useState } from "react";
import { Building2, Plus, Pencil, Users, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmpresas } from "@/hooks/useEmpresas";
import { EmpresaWizard } from "./EmpresaWizard";
import { EmpresaUsersManager } from "./EmpresaUsersManager";
import { Empresa } from "@/types/task";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function EmpresaCadastroCard() {
  const { empresas, loading: isLoading, refetch, deleteEmpresa } = useEmpresas();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Empresa | null>(null);

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setIsWizardOpen(true);
  };

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    setEditingEmpresa(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteEmpresa(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Cadastro de Empresas</h3>
              <p className="text-xs text-muted-foreground">
                {isLoading ? 'Carregando...' : `${empresas?.length || 0} empresas cadastradas`}
              </p>
            </div>
          </div>

          <Button size="sm" className="gap-2" onClick={() => setIsWizardOpen(true)}>
            <Plus className="w-4 h-4" />
            Nova Empresa
          </Button>
        </div>

        {/* Lista de empresas */}
        {!isLoading && empresas && empresas.length > 0 && (
          <div className="space-y-2 mt-4 border-t border-border/30 pt-4">
            {empresas.map((empresa) => (
              <Collapsible
                key={empresa.id}
                open={expandedEmpresa === empresa.id}
                onOpenChange={(open) => setExpandedEmpresa(open ? empresa.id : null)}
              >
                <div className="rounded-lg border border-border/30 bg-background/50 overflow-hidden">
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{empresa.nome}</p>
                        {empresa.cnpj && (
                          <p className="text-xs text-muted-foreground">{empresa.cnpj}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(empresa)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(empresa)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {expandedEmpresa === empresa.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="border-t border-border/30 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Usuários e Permissões</span>
                      </div>
                      <EmpresaUsersManager empresaId={empresa.id} />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      <EmpresaWizard 
        isOpen={isWizardOpen} 
        onClose={handleCloseWizard}
        onSuccess={() => refetch()}
        editingEmpresa={editingEmpresa}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa "{deleteConfirm?.nome}"? 
              Esta ação não pode ser desfeita e todos os dados associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
