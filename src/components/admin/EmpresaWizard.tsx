import { useState, useEffect } from "react";
import { Building2, User, Settings, Check, ChevronRight, ChevronLeft, Loader2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { REGIMES_TRIBUTARIOS } from "@/hooks/useTarefasModelo";

type AppModule = Database['public']['Enums']['app_module'];
type PermissionType = Database['public']['Enums']['permission_type'];
type RegimeTributario = Database['public']['Enums']['regime_tributario'];

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
  regimeTributario: RegimeTributario | '';
  // Step 2: Gerente
  gerenteTipo: 'novo' | 'existente';
  gerenteNome: string;
  gerenteEmail: string;
  gerenteSenha: string;
  gerenteExistenteId: string;
  // Step 3: Módulos e Permissões
  modulos: ModuloConfig[];
  permissoes: PermissaoConfig[];
}

const modulosDisponiveis: { id: AppModule; nome: string; descricao: string }[] = [
  { id: 'taskvault', nome: 'TaskVault', descricao: 'Gestão de tarefas e projetos' },
  { id: 'financialace', nome: 'GESTÃO', descricao: 'Sistema integrado financeiro e ERP' },
  { id: 'conversores', nome: 'Conversores', descricao: 'Conversão de arquivos fiscais e documentos' },
  { id: 'conferesped', nome: 'ConfereSped', descricao: 'Conferência de arquivos SPED' },
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
  regimeTributario: z.string().min(1, 'Selecione o regime tributário'),
});

const step2SchemaNew = z.object({
  gerenteNome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  gerenteEmail: z.string().email('Email inválido'),
  gerenteSenha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const step2SchemaExisting = z.object({
  gerenteExistenteId: z.string().min(1, 'Selecione um usuário'),
});

interface EmpresaWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingEmpresa?: { id: string; nome: string; cnpj?: string; email?: string; telefone?: string; regime_tributario?: RegimeTributario | null; manager_id?: string | null } | null;
}

export function EmpresaWizard({ isOpen, onClose, onSuccess, editingEmpresa }: EmpresaWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  const [data, setData] = useState<WizardData>({
    nome: '',
    cnpj: '',
    telefone: '',
    regimeTributario: '',
    gerenteTipo: 'novo',
    gerenteNome: '',
    gerenteEmail: '',
    gerenteSenha: '',
    gerenteExistenteId: '',
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

  // Fetch existing users for selection
  const { data: existingUsers = [] } = useQuery({
    queryKey: ['admin-users-for-manager'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, ativo')
        .eq('ativo', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Fetch current empresa modules when editing
  const { data: currentModulos = [] } = useQuery({
    queryKey: ['empresa-modulos-edit', editingEmpresa?.id],
    queryFn: async () => {
      if (!editingEmpresa?.id) return [];
      const { data, error } = await supabase
        .from('empresa_modulos')
        .select('*')
        .eq('empresa_id', editingEmpresa.id);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!editingEmpresa?.id,
  });

  const isEditMode = !!editingEmpresa;

  // Initialize data when editing
  useEffect(() => {
    if (editingEmpresa) {
      setData(prev => ({
        ...prev,
        nome: editingEmpresa.nome,
        cnpj: editingEmpresa.cnpj || '',
        telefone: editingEmpresa.telefone || '',
        regimeTributario: editingEmpresa.regime_tributario || '',
        gerenteTipo: 'existente',
        gerenteExistenteId: editingEmpresa.manager_id || '',
      }));
    }
  }, [editingEmpresa]);

  // Initialize modules when editing
  useEffect(() => {
    if (editingEmpresa && currentModulos.length > 0) {
      setData(prev => ({
        ...prev,
        modulos: modulosDisponiveis.map(m => {
          const existing = currentModulos.find(cm => cm.modulo === m.id);
          return {
            modulo: m.id,
            ativo: existing?.ativo || false,
            modo: (existing?.modo as 'basico' | 'pro') || 'basico',
          };
        }),
      }));
    }
  }, [editingEmpresa, currentModulos]);

  const checkEmailExists = async (email: string) => {
    if (!email || !z.string().email().safeParse(email).success) return;
    
    setCheckingEmail(true);
    try {
      const { data: existingProfile, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao verificar e-mail:', error);
        return;
      }
      
      if (existingProfile) {
        setErrors(prev => ({ 
          ...prev, 
          gerenteEmail: `Este e-mail já está cadastrado no sistema.` 
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          if (newErrors.gerenteEmail === 'Este e-mail já está cadastrado no sistema.') {
            delete newErrors.gerenteEmail;
          }
          return newErrors;
        });
      }
    } finally {
      setCheckingEmail(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setErrors({});
    setData({
      nome: '',
      cnpj: '',
      telefone: '',
      regimeTributario: '',
      gerenteTipo: 'novo',
      gerenteNome: '',
      gerenteEmail: '',
      gerenteSenha: '',
      gerenteExistenteId: '',
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
        let managerId: string;

        if (data.gerenteTipo === 'novo') {
          // Create NEW manager user (this will change the session!)
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
          
          managerId = authData.user?.id || '';
          if (!managerId) throw new Error('Erro ao obter ID do usuário criado');

          // IMMEDIATELY restore master session before any RPC calls
          const { error: restoreError } = await supabase.auth.setSession({
            access_token: masterSession.access_token,
            refresh_token: masterSession.refresh_token,
          });
          
          if (restoreError) {
            console.error('Erro ao restaurar sessão master:', restoreError);
            throw new Error('Erro ao restaurar sessão do administrador. Faça login novamente.');
          }
        } else {
          // Use EXISTING user as manager
          managerId = data.gerenteExistenteId;
          if (!managerId) throw new Error('Nenhum usuário selecionado');
        }

        // Add manager role using security definer function
        const { error: roleError } = await supabase.rpc('assign_manager_role', { 
          _user_id: managerId 
        });
        if (roleError) throw roleError;

        // Create empresa using SECURITY DEFINER function (bypasses RLS)
        const { data: empresaId, error: empresaError } = await supabase.rpc('create_empresa_for_manager', {
          _nome: data.nome,
          _cnpj: data.cnpj || null,
          _telefone: data.telefone || null,
          _manager_id: managerId,
        });

        if (empresaError) throw new Error(`Erro ao criar empresa: ${empresaError.message}`);
        if (!empresaId) throw new Error('Erro ao obter ID da empresa criada');

        // Update regime tributario (can't pass to RPC, update separately)
        if (data.regimeTributario) {
          const { error: regimeError } = await supabase
            .from('empresas')
            .update({ regime_tributario: data.regimeTributario })
            .eq('id', empresaId);
          if (regimeError) console.error('Erro ao atualizar regime:', regimeError);
        }

        // Link manager to empresa using SECURITY DEFINER function
        const { error: userEmpresaError } = await supabase.rpc('link_user_to_empresa', {
          _user_id: managerId,
          _empresa_id: empresaId,
          _is_owner: true
        });
        if (userEmpresaError) throw new Error(`Erro ao vincular gerente: ${userEmpresaError.message}`);

        // Create empresa modulos using SECURITY DEFINER function
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

        // Create user permissions using SECURITY DEFINER function
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

  // Update empresa mutation (edit mode)
  const updateEmpresaMutation = useMutation({
    mutationFn: async () => {
      if (!editingEmpresa) throw new Error('Nenhuma empresa para editar');
      
      const previousRegime = editingEmpresa.regime_tributario;
      const newRegime = data.regimeTributario || null;
      const newManagerId = data.gerenteExistenteId || null;
      
      // Update empresa basic data
      const { error } = await supabase
        .from('empresas')
        .update({
          nome: data.nome,
          cnpj: data.cnpj || null,
          telefone: data.telefone || null,
          regime_tributario: newRegime,
          manager_id: newManagerId,
        })
        .eq('id', editingEmpresa.id);

      if (error) throw error;

      // Update empresa modules
      // First delete existing modules
      await supabase
        .from('empresa_modulos')
        .delete()
        .eq('empresa_id', editingEmpresa.id);

      // Then insert new modules
      const modulosAtivos = data.modulos.filter(m => m.ativo);
      for (const mod of modulosAtivos) {
        const { error: moduloError } = await supabase.rpc('add_empresa_modulo', {
          _empresa_id: editingEmpresa.id,
          _modulo: mod.modulo,
          _modo: mod.modo,
          _ativo: true,
        });
        if (moduloError) console.error('Erro ao adicionar módulo:', moduloError);
      }
      
      // Auto-generate tasks if regime was just set (was null/undefined, now has value)
      if (!previousRegime && newRegime) {
        const now = new Date();
        const mes = now.getMonth() + 1;
        const ano = now.getFullYear();
        
        const { data: count, error: genError } = await supabase.rpc('gerar_tarefas_empresa', {
          p_empresa_id: editingEmpresa.id,
          p_mes: mes,
          p_ano: ano,
        });
        
        if (genError) {
          console.error('Erro ao gerar tarefas:', genError);
        } else if (count && count > 0) {
          toast({ 
            title: 'Tarefas geradas automaticamente!', 
            description: `${count} tarefa(s) criada(s) para ${data.nome}.`
          });
        }
      }
      
      return { id: editingEmpresa.id, nome: data.nome };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast({ title: 'Empresa atualizada com sucesso!' });
      resetWizard();
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar empresa', 
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
      if (data.gerenteTipo === 'novo') {
        const result = step2SchemaNew.safeParse(data);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          return false;
        }
        
        // Check if email already has an error from the async check
        if (errors.gerenteEmail === 'Este e-mail já está cadastrado no sistema.') {
          return false;
        }
      } else {
        const result = step2SchemaExisting.safeParse(data);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          return false;
        }
      }
    }
    
    if (step === 3) {
      const modulosAtivos = data.modulos.filter(m => m.ativo);
      if (modulosAtivos.length === 0) {
        setErrors({ modulos: 'Selecione pelo menos um módulo' });
        return false;
      }
      
      // Check if at least one permission is selected for each active module (only for create mode)
      if (!isEditMode) {
        for (const mod of modulosAtivos) {
          const permConfig = data.permissoes.find(p => p.modulo === mod.modulo);
          if (!permConfig || permConfig.permissions.length === 0) {
            setErrors({ permissoes: `Selecione pelo menos uma permissão para ${modulosDisponiveis.find(m => m.id === mod.modulo)?.nome}` });
            return false;
          }
        }
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      // In edit mode, skip step 2 (manager is selected directly, no new user creation)
      if (isEditMode && currentStep === 1) {
        setCurrentStep(3);
      } else {
        setCurrentStep(prev => Math.min(prev + 1, 3));
      }
    }
  };

  const handleBack = () => {
    // In edit mode, skip step 2
    if (isEditMode && currentStep === 3) {
      setCurrentStep(1);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleSubmit = () => {
    if (isEditMode) {
      // Edit mode: validate current step (should be step 3 - modules)
      if (validateStep(3)) {
        updateEmpresaMutation.mutate();
      }
    } else {
      // Create mode: validate step 3 (all steps)
      if (validateStep(3)) {
        createEmpresaMutation.mutate();
      }
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

  // Steps configuration - in edit mode, skip step 2 (manager selection is simpler)
  const editSteps = [
    { number: 1, title: 'Empresa', icon: Building2 },
    { number: 3, title: 'Módulos', icon: Settings },
  ];
  
  const createSteps = [
    { number: 1, title: 'Empresa', icon: Building2 },
    { number: 2, title: 'Gerente', icon: User },
    { number: 3, title: 'Módulos', icon: Settings },
  ];
  
  const steps = isEditMode ? editSteps : createSteps;

  const modulosAtivos = data.modulos.filter(m => m.ativo);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetWizard(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}</DialogTitle>
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

                <div>
                  <Label>Regime Tributário *</Label>
                  <Select
                    value={data.regimeTributario}
                    onValueChange={(value) => setData(prev => ({ ...prev, regimeTributario: value as RegimeTributario }))}
                  >
                    <SelectTrigger className={errors.regimeTributario ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione o regime tributário" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIMES_TRIBUTARIOS.map(regime => (
                        <SelectItem key={regime.value} value={regime.value}>{regime.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.regimeTributario && <p className="text-sm text-destructive mt-1">{errors.regimeTributario}</p>}
                </div>

                {/* Manager selector - only in edit mode */}
                {isEditMode && (
                  <div>
                    <Label>Gerente Responsável</Label>
                    <Select
                      value={data.gerenteExistenteId}
                      onValueChange={(value) => setData(prev => ({ ...prev, gerenteExistenteId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gerente responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span>{user.full_name || 'Sem nome'}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Dados do Gerente - only in create mode */}
          {!isEditMode && currentStep === 2 && (
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

              {/* Toggle between new/existing user */}
              <div className="flex gap-2 p-1 rounded-lg bg-muted/30 border border-border/50">
                <Button
                  type="button"
                  variant={data.gerenteTipo === 'novo' ? 'default' : 'ghost'}
                  className="flex-1 gap-2"
                  onClick={() => setData(prev => ({ ...prev, gerenteTipo: 'novo' }))}
                >
                  <UserPlus className="w-4 h-4" />
                  Criar Novo Usuário
                </Button>
                <Button
                  type="button"
                  variant={data.gerenteTipo === 'existente' ? 'default' : 'ghost'}
                  className="flex-1 gap-2"
                  onClick={() => setData(prev => ({ ...prev, gerenteTipo: 'existente' }))}
                >
                  <Users className="w-4 h-4" />
                  Usuário Existente
                </Button>
              </div>

              {/* New user form */}
              {data.gerenteTipo === 'novo' && (
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
                    <div className="relative">
                      <Input
                        id="gerenteEmail"
                        type="email"
                        value={data.gerenteEmail}
                        onChange={(e) => setData(prev => ({ ...prev, gerenteEmail: e.target.value }))}
                        onBlur={(e) => checkEmailExists(e.target.value)}
                        placeholder="gerente@empresa.com"
                        className={errors.gerenteEmail ? 'border-destructive' : ''}
                      />
                      {checkingEmail && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
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
              )}

              {/* Existing user selection */}
              {data.gerenteTipo === 'existente' && (
                <div className="space-y-4">
                  <div>
                    <Label>Selecionar Usuário *</Label>
                    <Select
                      value={data.gerenteExistenteId}
                      onValueChange={(value) => setData(prev => ({ ...prev, gerenteExistenteId: value }))}
                    >
                      <SelectTrigger className={errors.gerenteExistenteId ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Escolha um usuário existente" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span>{user.full_name || 'Sem nome'}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.gerenteExistenteId && (
                      <p className="text-sm text-destructive mt-1">{errors.gerenteExistenteId}</p>
                    )}
                  </div>

                  {existingUsers.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Nenhum usuário disponível. Crie um novo usuário.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Módulos e Permissões */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">{isEditMode ? 'Módulos da Empresa' : 'Módulos e Permissões'}</h3>
                <p className="text-sm text-muted-foreground">
                  {isEditMode ? 'Configure os módulos habilitados para esta empresa' : 'Selecione os módulos e permissões do gerente'}
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

                      {/* Permissions - only show in create mode */}
                      {!isEditMode && isAtivo && (
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

              {/* Summary - only in create mode */}
              {!isEditMode && modulosAtivos.length > 0 && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <h4 className="text-sm font-medium mb-2">Resumo</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Empresa:</strong> {data.nome}</p>
                    <p><strong>Gerente:</strong> {
                      data.gerenteTipo === 'novo' 
                        ? `${data.gerenteNome} (${data.gerenteEmail})`
                        : existingUsers.find(u => u.id === data.gerenteExistenteId)?.full_name || 
                          existingUsers.find(u => u.id === data.gerenteExistenteId)?.email ||
                          'Não selecionado'
                    }</p>
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
            onClick={currentStep === 1 ? () => { resetWizard(); onClose(); } : handleBack}
            className="gap-2"
          >
            {currentStep === 1 ? (
              'Cancelar'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </>
            )}
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext} className="gap-2">
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isEditMode ? updateEmpresaMutation.isPending : createEmpresaMutation.isPending}
              className="gap-2"
            >
              {(isEditMode ? updateEmpresaMutation.isPending : createEmpresaMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isEditMode ? 'Salvar Alterações' : 'Cadastrar Empresa'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
