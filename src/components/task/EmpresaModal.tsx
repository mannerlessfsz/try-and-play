import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Empresa } from "@/types/task";

interface EmpresaModalProps {
  novaEmpresa: Partial<Empresa>;
  setNovaEmpresa: React.Dispatch<React.SetStateAction<Partial<Empresa>>>;
  onSave: () => void;
  onClose: () => void;
}

export function EmpresaModal({ novaEmpresa, setNovaEmpresa, onSave, onClose }: EmpresaModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-red-500/20 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Nova Empresa</h2>
          <button onClick={onClose} className="p-1 hover:bg-foreground/10 rounded">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-foreground/80">Nome *</Label>
            <Input 
              value={novaEmpresa.nome || ""}
              onChange={e => setNovaEmpresa(prev => ({ ...prev, nome: e.target.value }))}
              className="mt-1 bg-background/50 border-foreground/20"
              placeholder="Nome da empresa"
            />
          </div>
          
          <div>
            <Label className="text-sm text-foreground/80">CNPJ *</Label>
            <Input 
              value={novaEmpresa.cnpj || ""}
              onChange={e => setNovaEmpresa(prev => ({ ...prev, cnpj: e.target.value }))}
              className="mt-1 bg-background/50 border-foreground/20"
              placeholder="00.000.000/0001-00"
            />
          </div>
          
          <div>
            <Label className="text-sm text-foreground/80">Email</Label>
            <Input 
              type="email"
              value={novaEmpresa.email || ""}
              onChange={e => setNovaEmpresa(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 bg-background/50 border-foreground/20"
              placeholder="contato@empresa.com"
            />
          </div>
          
          <Button onClick={onSave} className="w-full bg-red-500 hover:bg-red-600 text-white">
            <Save className="w-4 h-4 mr-2" /> Salvar Empresa
          </Button>
        </div>
      </div>
    </div>
  );
}
