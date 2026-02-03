import { useState } from 'react';
import { Building2, Plus, Search, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useEmpresasExternas, EmpresaExterna } from '@/hooks/useEmpresasExternas';
import { cn } from '@/lib/utils';

interface EmpresaExternaSelectorProps {
  value?: string;
  onChange: (empresaId: string | undefined, empresa?: EmpresaExterna) => void;
  className?: string;
  disabled?: boolean;
}

export function EmpresaExternaSelector({
  value,
  onChange,
  className,
  disabled
}: EmpresaExternaSelectorProps) {
  const { empresasExternas, isLoading, createEmpresa, updateEmpresa } = useEmpresasExternas();
  const [showModal, setShowModal] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaExterna | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    codigo_empresa: ''
  });

  const selectedEmpresa = empresasExternas.find(e => e.id === value);
  
  const filteredEmpresas = empresasExternas.filter(e =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.codigo_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.cnpj && e.cnpj.includes(searchTerm))
  );

  const handleOpenModal = (empresa?: EmpresaExterna) => {
    if (empresa) {
      setEditingEmpresa(empresa);
      setFormData({
        nome: empresa.nome,
        cnpj: empresa.cnpj || '',
        codigo_empresa: empresa.codigo_empresa
      });
    } else {
      setEditingEmpresa(null);
      setFormData({ nome: '', cnpj: '', codigo_empresa: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.codigo_empresa) {
      return;
    }

    try {
      if (editingEmpresa) {
        await updateEmpresa.mutateAsync({
          id: editingEmpresa.id,
          nome: formData.nome,
          cnpj: formData.cnpj || null,
          codigo_empresa: formData.codigo_empresa
        });
      } else {
        const result = await createEmpresa.mutateAsync({
          nome: formData.nome,
          cnpj: formData.cnpj || null,
          codigo_empresa: formData.codigo_empresa
        });
        // Auto-select newly created empresa
        if (result) {
          onChange(result.id, result as EmpresaExterna);
        }
      }
      setShowModal(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSelect = (empresaId: string) => {
    const empresa = empresasExternas.find(e => e.id === empresaId);
    onChange(empresaId, empresa);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            value={value}
            onValueChange={handleSelect}
            disabled={disabled || isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma empresa externa...">
                {selectedEmpresa && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedEmpresa.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      ({selectedEmpresa.codigo_empresa})
                    </span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              
              {filteredEmpresas.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma empresa encontrada
                </div>
              ) : (
                filteredEmpresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{empresa.nome}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {empresa.codigo_empresa}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handleOpenModal()}
          disabled={disabled}
          title="Nova empresa"
        >
          <Plus className="w-4 h-4" />
        </Button>
        
        {selectedEmpresa && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleOpenModal(selectedEmpresa)}
            disabled={disabled}
            title="Editar empresa"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {editingEmpresa ? 'Editar Empresa Externa' : 'Nova Empresa Externa'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Empresa *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Cliente ABC Ltda"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="codigo">Código da Empresa *</Label>
              <Input
                id="codigo"
                value={formData.codigo_empresa}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  codigo_empresa: e.target.value.toUpperCase().replace(/\s/g, '') 
                }))}
                placeholder="Ex: ABC001"
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Identificador único para esta empresa
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.nome || !formData.codigo_empresa || createEmpresa.isPending || updateEmpresa.isPending}
            >
              <Check className="w-4 h-4 mr-2" />
              {editingEmpresa ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
