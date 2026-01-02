import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmpresas } from "@/hooks/useEmpresas";
import { EmpresaWizard } from "./EmpresaWizard";

export function EmpresaCadastroCard() {
  const { empresas, loading: isLoading, refetch } = useEmpresas();
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between">
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
      </div>

      <EmpresaWizard 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => refetch()}
      />
    </>
  );
}
