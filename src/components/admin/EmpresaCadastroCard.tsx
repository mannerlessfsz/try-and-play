import { useState } from "react";
import { Building2, Plus, Trash2, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Database } from "@/integrations/supabase/types";

type AppModule = Database['public']['Enums']['app_module'];

interface ModuloConfig {
  modulo: AppModule;
  ativo: boolean;
  modo: 'basico' | 'pro';
}

interface ContaBancaria {
  id?: string;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo: 'corrente' | 'poupanca' | 'investimento';
}

interface NovaEmpresa {
  nome: string;
  cnpj: string;
  email: string;
  modulos: ModuloConfig[];
  contas: ContaBancaria[];
}

const modulosDisponiveis: { id: AppModule; nome: string; cor: string }[] = [
  { id: 'taskvault', nome: 'TaskVault', cor: 'magenta' },
  { id: 'financialace', nome: 'FinancialACE', cor: 'blue' },
  { id: 'conferesped', nome: 'ConfereSped', cor: 'orange' },
  { id: 'ajustasped', nome: 'AjustaSped', cor: 'cyan' },
];

const bancosDisponiveis = [
  'Banco do Brasil', 'Bradesco', 'Itaú', 'Santander', 'Caixa', 
  'Nubank', 'Inter', 'C6 Bank', 'Sicredi', 'Sicoob', 'Outro'
];

export function EmpresaCadastroCard() {
  const { empresas, loading: isLoading } = useEmpresas();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);
  const [novaEmpresa, setNovaEmpresa] = useState<NovaEmpresa>({
    nome: '',
    cnpj: '',
    email: '',
    modulos: modulosDisponiveis.map(m => ({
      modulo: m.id,
      ativo: false,
      modo: 'basico' as const,
    })),
    contas: [],
  });

  // Fetch modulos for each empresa
  const { data: empresaModulos } = useQuery({
    queryKey: ['empresa-modulos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresa_modulos')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch contas bancarias
  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  const createEmpresaMutation = useMutation({
    mutationFn: async (empresa: NovaEmpresa) => {
      // 1. Create empresa
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

      // 2. Create modulos for the empresa
      const modulosAtivos = empresa.modulos.filter(m => m.ativo);
      if (modulosAtivos.length > 0) {
        const { error: modulosError } = await supabase
          .from('empresa_modulos')
          .insert(
            modulosAtivos.map(m => ({
              empresa_id: empresaData.id,
              modulo: m.modulo,
              modo: m.modo,
              ativo: true,
            }))
          );
        if (modulosError) throw modulosError;
      }

      // 3. Create bank accounts
      if (empresa.contas.length > 0) {
        const { error: contasError } = await supabase
          .from('contas_bancarias')
          .insert(
            empresa.contas.map(c => ({
              empresa_id: empresaData.id,
              nome: c.nome,
              banco: c.banco,
              agencia: c.agencia || null,
              conta: c.conta || null,
              tipo: c.tipo,
            }))
          );
        if (contasError) throw contasError;
      }

      return empresaData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      queryClient.invalidateQueries({ queryKey: ['empresa-modulos'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
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
      queryClient.invalidateQueries({ queryKey: ['empresa-modulos'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
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

  const addContaMutation = useMutation({
    mutationFn: async ({ empresaId, conta }: { empresaId: string; conta: ContaBancaria }) => {
      const { error } = await supabase
        .from('contas_bancarias')
        .insert({
          empresa_id: empresaId,
          nome: conta.nome,
          banco: conta.banco,
          agencia: conta.agencia || null,
          conta: conta.conta || null,
          tipo: conta.tipo,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast({ title: 'Conta bancária adicionada!' });
    },
  });

  const deleteContaMutation = useMutation({
    mutationFn: async (contaId: string) => {
      const { error } = await supabase
        .from('contas_bancarias')
        .delete()
        .eq('id', contaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast({ title: 'Conta bancária removida!' });
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
      contas: [],
    });
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

    // Check if FinancialACE is selected and requires at least one bank account
    const hasFinancial = modulosAtivos.some(m => m.modulo === 'financialace');
    if (hasFinancial && novaEmpresa.contas.length === 0) {
      toast({ title: 'Para o FinancialACE, adicione pelo menos uma conta bancária', variant: 'destructive' });
      return;
    }

    createEmpresaMutation.mutate(novaEmpresa);
  };

  const toggleModulo = (moduloId: AppModule) => {
    setNovaEmpresa(prev => ({
      ...prev,
      modulos: prev.modulos.map(m => 
        m.modulo === moduloId ? { ...m, ativo: !m.ativo } : m
      ),
    }));
  };

  const setModuloModo = (moduloId: AppModule, modo: 'basico' | 'pro') => {
    setNovaEmpresa(prev => ({
      ...prev,
      modulos: prev.modulos.map(m => 
        m.modulo === moduloId ? { ...m, modo } : m
      ),
    }));
  };

  const addNovaConta = () => {
    setNovaEmpresa(prev => ({
      ...prev,
      contas: [...prev.contas, { nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente' }],
    }));
  };

  const updateConta = (index: number, field: keyof ContaBancaria, value: string) => {
    setNovaEmpresa(prev => ({
      ...prev,
      contas: prev.contas.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const removeConta = (index: number) => {
    setNovaEmpresa(prev => ({
      ...prev,
      contas: prev.contas.filter((_, i) => i !== index),
    }));
  };

  const getEmpresaModulos = (empresaId: string) => {
    return empresaModulos?.filter(m => m.empresa_id === empresaId) || [];
  };

  const getEmpresaContas = (empresaId: string) => {
    return contasBancarias?.filter(c => c.empresa_id === empresaId) || [];
  };

  const hasFinancialActive = novaEmpresa.modulos.some(m => m.modulo === 'financialace' && m.ativo);

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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Dados básicos */}
              <div>
                <h4 className="text-sm font-medium mb-3">Dados da Empresa</h4>
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
              </div>

              {/* Módulos */}
              <div>
                <h4 className="text-sm font-medium mb-3">Módulos Disponíveis *</h4>
                <div className="space-y-2">
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

              {/* Contas Bancárias - Only show if FinancialACE is active */}
              {hasFinancialActive && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Contas Bancárias *</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addNovaConta}>
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar Conta
                    </Button>
                  </div>

                  {novaEmpresa.contas.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
                      Adicione pelo menos uma conta bancária para o módulo FinancialACE
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {novaEmpresa.contas.map((conta, index) => (
                        <div key={index} className="p-3 rounded-lg border border-border/50 bg-muted/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Conta {index + 1}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeConta(index)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <Label className="text-xs">Nome/Apelido</Label>
                              <Input
                                value={conta.nome}
                                onChange={(e) => updateConta(index, 'nome', e.target.value)}
                                placeholder="Ex: Conta Principal"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Banco</Label>
                              <Select
                                value={conta.banco}
                                onValueChange={(value) => updateConta(index, 'banco', value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {bancosDisponiveis.map(banco => (
                                    <SelectItem key={banco} value={banco}>{banco}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Tipo</Label>
                              <Select
                                value={conta.tipo}
                                onValueChange={(value) => updateConta(index, 'tipo', value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="corrente">Corrente</SelectItem>
                                  <SelectItem value="poupanca">Poupança</SelectItem>
                                  <SelectItem value="investimento">Investimento</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Agência</Label>
                              <Input
                                value={conta.agencia}
                                onChange={(e) => updateConta(index, 'agencia', e.target.value)}
                                placeholder="0000"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Conta</Label>
                              <Input
                                value={conta.conta}
                                onChange={(e) => updateConta(index, 'conta', e.target.value)}
                                placeholder="00000-0"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
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
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : empresas?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada</p>
        ) : (
          empresas?.map((empresa) => {
            const modulos = getEmpresaModulos(empresa.id);
            const contas = getEmpresaContas(empresa.id);
            const isExpanded = expandedEmpresa === empresa.id;

            return (
              <div
                key={empresa.id}
                className="rounded-lg bg-muted/20 border border-border/30 overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedEmpresa(isExpanded ? null : empresa.id)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{empresa.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {empresa.cnpj || 'CNPJ não informado'}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {modulos.map(m => (
                        <span
                          key={m.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            m.modo === 'pro' 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {m.modulo} {m.modo === 'pro' && '(Pro)'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {contas.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {contas.length} conta{contas.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-border/20 space-y-2">
                    {contas.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Contas Bancárias:</p>
                        {contas.map(conta => (
                          <div key={conta.id} className="flex items-center justify-between text-xs py-1">
                            <span className="text-foreground">{conta.nome} - {conta.banco}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{conta.agencia}/{conta.conta}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteContaMutation.mutate(conta.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEmpresaMutation.mutate(empresa.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Excluir Empresa
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
