import { useState } from "react";
import { Building2, Plus, X, Check, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ModuloConfig {
  modulo: 'taskvault' | 'financialace' | 'conferesped' | 'ajustasped';
  ativo: boolean;
  modo: 'basico' | 'pro';
}

interface NovaEmpresa {
  nome: string;
  cnpj: string;
  email: string;
  modulos: ModuloConfig[];
}

const modulosDisponiveis = [
  { id: 'taskvault', nome: 'TaskVault', cor: 'magenta' },
  { id: 'financialace', nome: 'FinancialACE', cor: 'blue' },
  { id: 'conferesped', nome: 'ConfereSped', cor: 'orange' },
  { id: 'ajustasped', nome: 'AjustaSped', cor: 'cyan' },
] as const;

export function EmpresaCadastroCard() {
  const { empresas, loading: isLoading } = useEmpresas();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<string | null>(null);
  const [novaEmpresa, setNovaEmpresa] = useState<NovaEmpresa>({
    nome: '',
    cnpj: '',
    email: '',
    modulos: modulosDisponiveis.map(m => ({
      modulo: m.id,
      ativo: false,
      modo: 'basico' as const,
    })),
  });

  const createEmpresaMutation = useMutation({
    mutationFn: async (empresa: NovaEmpresa) => {
      // 1. Criar empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nome: empresa.nome,
          cnpj: empresa.cnpj || null,
          email: empresa.email || null,
        })
        .select()
        .single();

      if (empresaError) throw empresaError;

      // 2. Não precisamos criar permissões globais aqui, pois as permissões
      // são por usuário. Quando um usuário for vinculado à empresa,
      // as permissões serão criadas.

      return empresaData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast({ title: 'Empresa cadastrada com sucesso!' });
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao cadastrar empresa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteEmpresaMutation = useMutation({
    mutationFn: async (empresaId: string) => {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', empresaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast({ title: 'Empresa excluída com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao excluir empresa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const resetForm = () => {
    setNovaEmpresa({
      nome: '',
      cnpj: '',
      email: '',
      modulos: modulosDisponiveis.map(m => ({
        modulo: m.id,
        ativo: false,
        modo: 'basico' as const,
      })),
    });
    setEditingEmpresa(null);
  };

  const handleSubmit = () => {
    if (!novaEmpresa.nome.trim()) {
      toast({ title: 'Nome da empresa é obrigatório', variant: 'destructive' });
      return;
    }

    const modulosAtivos = novaEmpresa.modulos.filter(m => m.ativo);
    if (modulosAtivos.length === 0) {
      toast({ title: 'Selecione pelo menos um módulo', variant: 'destructive' });
      return;
    }

    createEmpresaMutation.mutate(novaEmpresa);
  };

  const toggleModulo = (moduloId: string) => {
    setNovaEmpresa(prev => ({
      ...prev,
      modulos: prev.modulos.map(m => 
        m.modulo === moduloId ? { ...m, ativo: !m.ativo } : m
      ),
    }));
  };

  const setModuloModo = (moduloId: string, modo: 'basico' | 'pro') => {
    setNovaEmpresa(prev => ({
      ...prev,
      modulos: prev.modulos.map(m => 
        m.modulo === moduloId ? { ...m, modo } : m
      ),
    }));
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Cadastro de Empresas</h3>
            <p className="text-xs text-muted-foreground">
              {empresas?.length || 0} empresas cadastradas
            </p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Dados básicos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nome">Nome da Empresa *</Label>
                  <Input
                    id="nome"
                    value={novaEmpresa.nome}
                    onChange={(e) => setNovaEmpresa(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Razão Social"
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={novaEmpresa.cnpj}
                    onChange={(e) => setNovaEmpresa(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={novaEmpresa.email}
                    onChange={(e) => setNovaEmpresa(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>

              {/* Módulos */}
              <div>
                <Label className="mb-3 block">Módulos Disponíveis *</Label>
                <div className="space-y-3">
                  {modulosDisponiveis.map((modulo) => {
                    const config = novaEmpresa.modulos.find(m => m.modulo === modulo.id);
                    const isAtivo = config?.ativo || false;
                    
                    return (
                      <div 
                        key={modulo.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isAtivo 
                            ? 'border-primary/50 bg-primary/5' 
                            : 'border-border/50 bg-muted/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isAtivo}
                            onCheckedChange={() => toggleModulo(modulo.id)}
                          />
                          <span className={`font-medium text-sm ${isAtivo ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {modulo.nome}
                          </span>
                        </div>

                        {isAtivo && (
                          <Select
                            value={config?.modo || 'basico'}
                            onValueChange={(value) => setModuloModo(modulo.id, value as 'basico' | 'pro')}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basico">Básico</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={createEmpresaMutation.isPending}>
                  {createEmpresaMutation.isPending ? 'Salvando...' : 'Cadastrar Empresa'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de empresas */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : empresas?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada</p>
        ) : (
          empresas?.map((empresa) => (
            <div
              key={empresa.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
            >
              <div>
                <p className="font-medium text-sm text-foreground">{empresa.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {empresa.cnpj || 'CNPJ não informado'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => deleteEmpresaMutation.mutate(empresa.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
