import { useState, useEffect, useCallback } from "react";
import { Building2, Settings, Check, ChevronRight, ChevronLeft, Loader2, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { REGIMES_TRIBUTARIOS } from "@/hooks/useTarefasModelo";
import { formatCnpj, cleanCnpj, isValidCnpj, fetchCnpjData } from "@/utils/cnpjUtils";

type AppModule = Database['public']['Enums']['app_module'];
type RegimeTributario = Database['public']['Enums']['regime_tributario'];

interface ModuloConfig {
  modulo: AppModule;
  ativo: boolean;
  modo: 'basico' | 'pro';
}

interface WizardData {
  // Step 1: Empresa
  nome: string;
  cnpj: string;
  telefone: string;
  regimeTributario: RegimeTributario | '';
  // Step 2: Módulos
  modulos: ModuloConfig[];
}

const modulosDisponiveis: { id: AppModule; nome: string; descricao: string }[] = [
  { id: 'taskvault', nome: 'TaskVault', descricao: 'Gestão de tarefas e obrigações' },
  { id: 'gestao', nome: 'GESTÃO', descricao: 'Sistema integrado financeiro e ERP' },
  { id: 'conversores', nome: 'Conversores', descricao: 'Conversão de arquivos fiscais e documentos' },
  { id: 'ajustasped', nome: 'AjustaSped', descricao: 'Ajuste de arquivos SPED' },
  { id: 'conferesped', nome: 'ConfereSped', descricao: 'Conferência de arquivos SPED' },
  { id: 'erp', nome: 'ERP', descricao: 'Controle de estoque, vendas e compras' },
  { id: 'financialace', nome: 'FinancialACE', descricao: 'Gestão financeira avançada' },
];

// Validation schemas
const step1Schema = z.object({
  nome: z.string().min(3, 'Razão social deve ter pelo menos 3 caracteres'),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  regimeTributario: z.string().min(1, 'Selecione o regime tributário'),
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
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid' | 'found'>('idle');
  const [cnpjMessage, setCnpjMessage] = useState('');
  
  const [data, setData] = useState<WizardData>({
    nome: '',
    cnpj: '',
    telefone: '',
    regimeTributario: '',
    modulos: modulosDisponiveis.map(m => ({
      modulo: m.id,
      ativo: false,
      modo: 'basico' as const,
    })),
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

  const resetWizard = () => {
    setCurrentStep(1);
    setErrors({});
    setCnpjStatus('idle');
    setCnpjMessage('');
    setData({
      nome: '',
      cnpj: '',
      telefone: '',
      regimeTributario: '',
      modulos: modulosDisponiveis.map(m => ({
        modulo: m.id,
        ativo: false,
        modo: 'basico' as const,
      })),
    });
  };

  const handleCnpjChange = (value: string) => {
    const formatted = formatCnpj(value);
    setData(prev => ({ ...prev, cnpj: formatted }));
    setCnpjStatus('idle');
    setCnpjMessage('');
  };

  const handleCnpjLookup = useCallback(async () => {
    const digits = cleanCnpj(data.cnpj);
    if (digits.length !== 14) {
      setCnpjStatus('invalid');
      setCnpjMessage('CNPJ deve ter 14 dígitos');
      return;
    }
    if (!isValidCnpj(digits)) {
      setCnpjStatus('invalid');
      setCnpjMessage('CNPJ inválido (dígitos verificadores incorretos)');
      return;
    }

    setCnpjStatus('loading');
    setCnpjMessage('Consultando Receita Federal...');

    try {
      const result = await fetchCnpjData(digits);

      if (result.situacao_cadastral && result.situacao_cadastral !== 'ATIVA') {
        setCnpjStatus('invalid');
        setCnpjMessage(`Situação cadastral: ${result.situacao_cadastral}`);
        return;
      }

      // Preenche campos automaticamente
      setData(prev => ({
        ...prev,
        nome: result.razao_social || prev.nome,
        telefone: result.telefone || prev.telefone,
      }));

      const location = [result.municipio, result.uf].filter(Boolean).join('/');
      setCnpjStatus('found');
      setCnpjMessage(
        `✓ ${result.razao_social}${result.nome_fantasia ? ` (${result.nome_fantasia})` : ''}${location ? ` — ${location}` : ''}`
      );

      toast({ title: 'CNPJ válido!', description: 'Dados preenchidos automaticamente.' });
    } catch (err) {
      setCnpjStatus('invalid');
      setCnpjMessage(err instanceof Error ? err.message : 'Erro ao consultar CNPJ');
    }
  }, [data.cnpj, toast]);

  const createEmpresaMutation = useMutation({
    mutationFn: async () => {
      // Create empresa using SECURITY DEFINER function (bypasses RLS)
      const { data: empresaId, error: empresaError } = await supabase.rpc('create_empresa_for_manager', {
        _nome: data.nome,
        _cnpj: data.cnpj || null,
        _telefone: data.telefone || null,
        _manager_id: null, // No manager on creation
      });

      if (empresaError) throw new Error(`Erro ao criar empresa: ${empresaError.message}`);
      if (!empresaId) throw new Error('Erro ao obter ID da empresa criada');

      // Update regime tributario
      if (data.regimeTributario) {
        const { error: regimeError } = await supabase
          .from('empresas')
          .update({ regime_tributario: data.regimeTributario })
          .eq('id', empresaId);
        if (regimeError) console.error('Erro ao atualizar regime:', regimeError);
      }

      // Create empresa modulos
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

      return { id: empresaId, nome: data.nome };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
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
      
      const newRegime = data.regimeTributario || null;
      
      // Update empresa basic data
      const { error } = await supabase
        .from('empresas')
        .update({
          nome: data.nome,
          cnpj: data.cnpj || null,
          telefone: data.telefone || null,
          regime_tributario: newRegime,
        })
        .eq('id', editingEmpresa.id);

      if (error) throw error;

      // Update empresa modules with proper UPDATE to trigger permission sync
      const modulosAtivos = data.modulos.filter(m => m.ativo);
      const modulosInativos = data.modulos.filter(m => !m.ativo);
      
      // For each active module: upsert (update if exists, insert if not)
      for (const mod of modulosAtivos) {
        const existing = currentModulos.find(cm => cm.modulo === mod.modulo);
        
        if (existing) {
          // UPDATE existing module (triggers sync_permissions_on_module_mode_change)
          const { error: updateError } = await supabase
            .from('empresa_modulos')
            .update({ 
              modo: mod.modo, 
              ativo: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          if (updateError) console.error('Erro ao atualizar módulo:', updateError);
        } else {
          // INSERT new module
          const { error: insertError } = await supabase.rpc('add_empresa_modulo', {
            _empresa_id: editingEmpresa.id,
            _modulo: mod.modulo,
            _modo: mod.modo,
            _ativo: true,
          });
          if (insertError) console.error('Erro ao adicionar módulo:', insertError);
        }
      }
      
      // Deactivate removed modules (soft delete)
      for (const mod of modulosInativos) {
        const existing = currentModulos.find(cm => cm.modulo === mod.modulo);
        if (existing && existing.ativo) {
          await supabase
            .from('empresa_modulos')
            .update({ ativo: false, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
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
      const modulosAtivos = data.modulos.filter(m => m.ativo);
      if (modulosAtivos.length === 0) {
        setErrors({ modulos: 'Selecione pelo menos um módulo' });
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 2));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (validateStep(2)) {
      if (isEditMode) {
        updateEmpresaMutation.mutate();
      } else {
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

  const steps = [
    { number: 1, title: 'Empresa', icon: Building2 },
    { number: 2, title: 'Módulos', icon: Settings },
  ];

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
                  <div className="flex gap-2">
                    <Input
                      id="cnpj"
                      value={data.cnpj}
                      onChange={(e) => handleCnpjChange(e.target.value)}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className={cnpjStatus === 'invalid' ? 'border-destructive' : cnpjStatus === 'found' ? 'border-green-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCnpjLookup}
                      disabled={cnpjStatus === 'loading' || cleanCnpj(data.cnpj).length < 14}
                      title="Buscar dados do CNPJ"
                    >
                      {cnpjStatus === 'loading' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {cnpjMessage && (
                    <div className={`flex items-start gap-1.5 mt-1.5 text-xs ${
                      cnpjStatus === 'invalid' ? 'text-destructive' : 
                      cnpjStatus === 'found' ? 'text-green-500' : 
                      'text-muted-foreground'
                    }`}>
                      {cnpjStatus === 'invalid' && <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />}
                      {cnpjStatus === 'found' && <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />}
                      <span>{cnpjMessage}</span>
                    </div>
                  )}
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
              </div>
            </div>
          )}

          {/* Step 2: Módulos */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Módulos da Empresa</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione os módulos que a empresa terá acesso
                </p>
              </div>

              {errors.modulos && (
                <p className="text-sm text-destructive text-center">{errors.modulos}</p>
              )}

              <div className="space-y-4">
                {modulosDisponiveis.map((modulo) => {
                  const config = data.modulos.find(m => m.modulo === modulo.id);
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
                    <p><strong>Regime:</strong> {REGIMES_TRIBUTARIOS.find(r => r.value === data.regimeTributario)?.label || '-'}</p>
                    <p><strong>Módulos:</strong> {modulosAtivos.map(m => 
                      `${modulosDisponiveis.find(md => md.id === m.modulo)?.nome} (${m.modo})`
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

          {currentStep < 2 ? (
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
