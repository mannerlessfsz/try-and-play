import { useState } from "react";
import { Building2, User, Settings, Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Database } from "@/integrations/supabase/types";
import { z } from "zod";

type AppModule = Database['public']['Enums']['app_module'];
type PermissionType = Database['public']['Enums']['permission_type'];

interface ModuloConfig {
  modulo: AppModule;
  ativo: boolean;
  modo: 'basico' | 'pro';
}

interface PermissaoConfig {
  modulo: AppModule;
  permissions: PermissionType[];
}

interface WizardData {
  // Step 1: Empresa
  nome: string;
  cnpj: string;
  telefone: string;
  // Step 2: Gerente
  gerenteNome: string;
  gerenteEmail: string;
  gerenteSenha: string;
  // Step 3: Módulos e Permissões
  modulos: ModuloConfig[];
  permissoes: PermissaoConfig[];
}

const modulosDisponiveis: { id: AppModule; nome: string; descricao: string }[] = [
  { id: 'taskvault', nome: 'TaskVault', descricao: 'Gestão de tarefas e projetos' },
  { id: 'financialace', nome: 'FinancialACE', descricao: 'Gestão financeira e conciliação' },
  { id: 'conferesped', nome: 'ConfereSped', descricao: 'Conferência de arquivos SPED' },
  { id: 'ajustasped', nome: 'AjustaSped', descricao: 'Ajuste de arquivos SPED' },
];

const permissoesDisponiveis: { id: PermissionType; nome: string }[] = [
  { id: 'view', nome: 'Visualizar' },
  { id: 'create', nome: 'Criar' },
  { id: 'edit', nome: 'Editar' },
  { id: 'delete', nome: 'Excluir' },
  { id: 'export', nome: 'Exportar' },
];

// Validation schemas
const step1Schema = z.object({
  nome: z.string().min(3, 'Razão social deve ter pelo menos 3 caracteres'),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
});

const step2Schema = z.object({
  gerenteNome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  gerenteEmail: z.string().email('Email inválido'),
  gerenteSenha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

interface EmpresaWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EmpresaWizard({ isOpen, onClose, onSuccess }: EmpresaWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [data, setData] = useState<WizardData>({
    nome: '',
    cnpj: '',
    telefone: '',
    gerenteNome: '',
    gerenteEmail: '',
    gerenteSenha: '',
    modulos: modulosDisponiveis.map(m => ({
      modulo: m.id,
      ativo: false,
      modo: 'basico' as const,
    })),
    permissoes: modulosDisponiveis.map(m => ({
      modulo: m.id,
      permissions: [],
    })),
  });

  const resetWizard = () => {
    setCurrentStep(1);
    setErrors({});
    setData({
      nome: '',
      cnpj: '',
      telefone: '',
      gerenteNome: '',
      gerenteEmail: '',
      gerenteSenha: '',
      modulos: modulosDisponiveis.map(m => ({
        modulo: m.id,
        ativo: false,
        modo: 'basico' as const,
      })),
      permissoes: modulosDisponiveis.map(m => ({
        modulo: m.id,
        permissions: [],
      })),
    });
  };

  const createEmpresaMutation = useMutation({
    mutationFn: async () => {
      // Store current master session BEFORE creating new user
      const { data: currentSession } = await supabase.auth.getSession();
      const masterSession = currentSession?.session;
      
      if (!masterSession) {
        throw new Error('Sessão do usuário master não encontrada. Faça login novamente.');
      }

      try {
        // 1. Create manager user (this will change the session!)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.gerenteEmail,
          password: data.gerenteSenha,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: data.gerenteNome }
          }
        });
        
        if (authError) {
          if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
            throw new Error(`O email "${data.gerenteEmail}" já está cadastrado. Use um email diferente.`);
          }
          throw new Error(`Erro ao criar usuário: ${authError.message}`);
        }
        
        const managerId = authData.user?.id;
        if (!managerId) throw new Error('Erro ao obter ID do usuário criado');

        // 2. IMMEDIATELY restore master session before any RPC calls
        const { error: restoreError } = await supabase.auth.setSession({
          access_token: masterSession.access_token,
          refresh_token: masterSession.refresh_token,
        });
        
        if (restoreError) {
          console.error('Erro ao restaurar sessão master:', restoreError);
          throw new Error('Erro ao restaurar sessão do administrador. Faça login novamente.');
        }

        // 3. Add manager role using security definer function
        const { error: roleError } = await supabase.rpc('assign_manager_role', { 
          _user_id: managerId 
        });
        if (roleError) throw roleError;

        // 4. Create empresa using SECURITY DEFINER function (bypasses RLS)
        const { data: empresaId, error: empresaError } = await supabase.rpc('create_empresa_for_manager', {
          _nome: data.nome,
          _cnpj: data.cnpj || null,
          _telefone: data.telefone || null,
          _manager_id: managerId,
        });

        if (empresaError) throw new Error(`Erro ao criar empresa: ${empresaError.message}`);
        if (!empresaId) throw new Error('Erro ao obter ID da empresa criada');

        // 5. Link manager to empresa using SECURITY DEFINER function
        const { error: userEmpresaError } = await supabase.rpc('link_user_to_empresa', {
          _user_id: managerId,
          _empresa_id: empresaId,
          _is_owner: true
        });
        if (userEmpresaError) throw new Error(`Erro ao vincular gerente: ${userEmpresaError.message}`);

        // 6. Create empresa modulos using SECURITY DEFINER function
        const modulosAtivos = data.modulos.filter(m => m.ativo);
        for (const mod of modulosAtivos) {
          const { error: moduloError } = await supabase.rpc('add_empresa_modulo', {
            _empresa_id: empresaId,
            _modulo: mod.modulo,
            _modo: mod.modo,
            _ativo: true,
          });
          if (moduloError) throw new Error(`Erro ao adicionar módulo: ${moduloError.message}`);
        }

        // 7. Create user permissions using SECURITY DEFINER function
        for (const permConfig of data.permissoes) {
          const moduloConfig = data.modulos.find(m => m.modulo === permConfig.modulo);
          if (moduloConfig?.ativo && permConfig.permissions.length > 0) {
            for (const perm of permConfig.permissions) {
              const { error: permError } = await supabase.rpc('add_user_permission', {
                _user_id: managerId,
                _empresa_id: empresaId,
                _module: permConfig.modulo,
                _permission: perm,
                _is_pro_mode: moduloConfig.modo === 'pro',
              });
              if (permError) throw new Error(`Erro ao adicionar permissão: ${permError.message}`);
            }
          }
        }

        return { id: empresaId, nome: data.nome };
      } catch (error) {
        // If anything fails, try to restore master session
        if (masterSession) {
          await supabase.auth.setSession({
            access_token: masterSession.access_token,
            refresh_token: masterSession.refresh_token,
          });
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-user-empresas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-empresa-modulos'] });
      toast({ title: 'Empresa cadastrada com sucesso!' });
      resetWizard();
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao cadastrar empresa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const validateStep = (step: number): boolean => {
    setErrors({});
    
    if (step === 1) {
      const result = step1Schema.safeParse(data);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach(err => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        return false;
      }
    }
    
    if (step === 2) {
      const result = step2Schema.safeParse(data);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach(err => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        return false;
      }
    }
    
    if (step === 3) {
      const modulosAtivos = data.modulos.filter(m => m.ativo);
      if (modulosAtivos.length === 0) {
        setErrors({ modulos: 'Selecione pelo menos um módulo' });
        return false;
      }
      
      // Check if at least one permission is selected for each active module
      for (const mod of modulosAtivos) {
        const permConfig = data.permissoes.find(p => p.modulo === mod.modulo);
        if (!permConfig || permConfig.permissions.length === 0) {
          setErrors({ permissoes: `Selecione pelo menos uma permissão para ${modulosDisponiveis.find(m => m.id === mod.modulo)?.nome}` });
          return false;
        }
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (validateStep(3)) {
      createEmpresaMutation.mutate();
    }
  };

  const toggleModulo = (moduloId: AppModule) => {
    setData(prev => ({
      ...prev,
      modulos: prev.modulos.map(m => 
        m.modulo === moduloId ? { ...m, ativo: !m.ativo } : m
      ),
    }));
  };

  const setModuloModo = (moduloId: AppModule, modo: 'basico' | 'pro') => {
    setData(prev => ({
      ...prev,
      modulos: prev.modulos.map(m => 
        m.modulo === moduloId ? { ...m, modo } : m
      ),
    }));
  };

  const togglePermission = (moduloId: AppModule, permission: PermissionType) => {
    setData(prev => ({
      ...prev,
      permissoes: prev.permissoes.map(p => {
        if (p.modulo === moduloId) {
          const hasPermission = p.permissions.includes(permission);
          return {
            ...p,
            permissions: hasPermission 
              ? p.permissions.filter(perm => perm !== permission)
              : [...p.permissions, permission]
          };
        }
        return p;
      }),
    }));
  };

  const selectAllPermissions = (moduloId: AppModule) => {
    setData(prev => ({
      ...prev,
      permissoes: prev.permissoes.map(p => 
        p.modulo === moduloId 
          ? { ...p, permissions: permissoesDisponiveis.map(perm => perm.id) }
          : p
      ),
    }));
  };

  const steps = [
    { number: 1, title: 'Empresa', icon: Building2 },
    { number: 2, title: 'Gerente', icon: User },
    { number: 3, title: 'Módulos', icon: Settings },
  ];

  const modulosAtivos = data.modulos.filter(m => m.ativo);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetWizard(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4 border-b border-border/50">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div 
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  currentStep === step.number 
                    ? 'bg-primary text-primary-foreground' 
                    : currentStep > step.number
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > step.number ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {/* Step 1: Dados da Empresa */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Dados da Empresa</h3>
                <p className="text-sm text-muted-foreground">Informe os dados básicos da empresa</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Razão Social *</Label>
                  <Input
                    id="nome"
                    value={data.nome}
                    onChange={(e) => setData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome completo da empresa"
                    className={errors.nome ? 'border-destructive' : ''}
                  />
                  {errors.nome && <p className="text-sm text-destructive mt-1">{errors.nome}</p>}
                </div>

                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={data.cnpj}
                    onChange={(e) => setData(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={data.telefone}
                    onChange={(e) => setData(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Dados do Gerente */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Dados do Gerente</h3>
                <p className="text-sm text-muted-foreground">
                  O gerente terá acesso administrativo à empresa
                </p>
              </div>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                <p className="text-xs text-primary">
                  Este usuário será o responsável pela empresa e poderá acessar os módulos contratados.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="gerenteNome">Nome Completo *</Label>
                  <Input
                    id="gerenteNome"
                    value={data.gerenteNome}
                    onChange={(e) => setData(prev => ({ ...prev, gerenteNome: e.target.value }))}
                    placeholder="Nome do gerente"
                    className={errors.gerenteNome ? 'border-destructive' : ''}
                  />
                  {errors.gerenteNome && <p className="text-sm text-destructive mt-1">{errors.gerenteNome}</p>}
                </div>

                <div>
                  <Label htmlFor="gerenteEmail">E-mail de Acesso *</Label>
                  <Input
                    id="gerenteEmail"
                    type="email"
                    value={data.gerenteEmail}
                    onChange={(e) => setData(prev => ({ ...prev, gerenteEmail: e.target.value }))}
                    placeholder="gerente@empresa.com"
                    className={errors.gerenteEmail ? 'border-destructive' : ''}
                  />
                  {errors.gerenteEmail && <p className="text-sm text-destructive mt-1">{errors.gerenteEmail}</p>}
                </div>

                <div>
                  <Label htmlFor="gerenteSenha">Senha Inicial *</Label>
                  <Input
                    id="gerenteSenha"
                    type="password"
                    value={data.gerenteSenha}
                    onChange={(e) => setData(prev => ({ ...prev, gerenteSenha: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className={errors.gerenteSenha ? 'border-destructive' : ''}
                  />
                  {errors.gerenteSenha && <p className="text-sm text-destructive mt-1">{errors.gerenteSenha}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Módulos e Permissões */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Módulos e Permissões</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione os módulos e permissões do gerente
                </p>
              </div>

              {errors.modulos && (
                <p className="text-sm text-destructive text-center">{errors.modulos}</p>
              )}
              {errors.permissoes && (
                <p className="text-sm text-destructive text-center">{errors.permissoes}</p>
              )}

              <div className="space-y-4">
                {modulosDisponiveis.map((modulo) => {
                  const config = data.modulos.find(m => m.modulo === modulo.id);
                  const permConfig = data.permissoes.find(p => p.modulo === modulo.id);
                  const isAtivo = config?.ativo || false;
                  
                  return (
                    <div 
                      key={modulo.id}
                      className={`rounded-lg border transition-colors ${
                        isAtivo 
                          ? 'border-primary/50 bg-primary/5' 
                          : 'border-border/50 bg-muted/20'
                      }`}
                    >
                      {/* Module header */}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isAtivo}
                            onCheckedChange={() => toggleModulo(modulo.id)}
                          />
                          <div>
                            <span className={`font-medium ${isAtivo ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {modulo.nome}
                            </span>
                            <p className="text-xs text-muted-foreground">{modulo.descricao}</p>
                          </div>
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

                      {/* Permissions */}
                      {isAtivo && (
                        <div className="px-4 pb-4 pt-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Permissões:</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs"
                              onClick={() => selectAllPermissions(modulo.id)}
                            >
                              Selecionar todas
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {permissoesDisponiveis.map((perm) => {
                              const isSelected = permConfig?.permissions.includes(perm.id) || false;
                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                                    isSelected 
                                      ? 'bg-primary/20 border-primary/50 text-foreground' 
                                      : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'
                                  }`}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => togglePermission(modulo.id, perm.id)}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span className="text-xs">{perm.nome}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              {modulosAtivos.length > 0 && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <h4 className="text-sm font-medium mb-2">Resumo</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Empresa:</strong> {data.nome}</p>
                    <p><strong>Gerente:</strong> {data.gerenteNome} ({data.gerenteEmail})</p>
                    <p><strong>Módulos:</strong> {modulosAtivos.map(m => 
                      modulosDisponiveis.find(md => md.id === m.modulo)?.nome
                    ).join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext} className="gap-2">
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={createEmpresaMutation.isPending}
              className="gap-2"
            >
              {createEmpresaMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Cadastrar Empresa
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
