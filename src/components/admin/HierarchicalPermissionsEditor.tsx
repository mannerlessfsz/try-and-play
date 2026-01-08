/**
 * Editor Hierárquico de Permissões
 * 
 * Exibe a estrutura completa: Módulo → Sub-módulo → Recurso → Ações
 * Respeita modo Básico/Pro mostrando recursos adequados para cada nível
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Shield, Zap, ChevronRight, ChevronDown,
  CheckSquare, Layers, RefreshCw, MessageCircle,
  Receipt, Package, FileText, Landmark, MessageSquare,
  Check, X
} from 'lucide-react';
import { 
  APP_MODULES, 
  AppModule, 
  AppSubModule,
  MODULE_SUB_MODULES, 
  SUB_MODULE_RESOURCES,
  getModuleSubModules,
  getSubModuleResources,
  ResourceDefinition
} from '@/constants/modules';

// Mapeamento de ícones para módulos
const MODULE_ICONS: Record<string, React.ReactNode> = {
  taskvault: <CheckSquare className="w-5 h-5" />,
  gestao: <Layers className="w-5 h-5" />,
  conversores: <RefreshCw className="w-5 h-5" />,
  messenger: <MessageCircle className="w-5 h-5" />,
};

// Mapeamento de ícones para sub-módulos
const SUBMODULE_ICONS: Record<string, React.ReactNode> = {
  financeiro: <Receipt className="w-4 h-4" />,
  erp_comercial: <Package className="w-4 h-4" />,
  tarefas: <CheckSquare className="w-4 h-4" />,
  kanban: <CheckSquare className="w-4 h-4" />,
  fiscal: <FileText className="w-4 h-4" />,
  extrato: <Landmark className="w-4 h-4" />,
  comunicacao: <MessageSquare className="w-4 h-4" />,
  conferencia: <FileText className="w-4 h-4" />,
};

// Recursos PRO-only por sub-módulo
const PRO_ONLY_RESOURCES: Record<string, string[]> = {
  financeiro: ['recorrencias', 'metas', 'orcamentos', 'relatorios', 'importacoes', 'conciliacao'],
  erp_comercial: ['nfe', 'estoque'],
  kanban: [],
  fiscal: [],
  extrato: [],
  comunicacao: ['templates', 'grupos'],
};

interface ResourcePermission {
  id?: string;
  user_id: string;
  empresa_id: string | null;
  module: string;
  sub_module: string | null;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

interface HierarchicalPermissionsEditorProps {
  userId: string;
  empresaId: string | null;
  /** fallback (mantido por compatibilidade) */
  isProMode?: boolean;
  /** quando informado, define Pro/Básico por módulo */
  moduleProMode?: Partial<Record<AppModule, boolean>>;
  /** quando informado, restringe a árvore somente a estes módulos */
  allowedModules?: AppModule[];
  readOnly?: boolean;
}

// Módulos ativos (excluindo legados)
const ACTIVE_MODULES = APP_MODULES.filter(m => !['financialace', 'erp', 'ajustasped', 'conferesped'].includes(m.value));

export function HierarchicalPermissionsEditor({
  userId,
  empresaId,
  isProMode = false,
  moduleProMode,
  allowedModules,
  readOnly = false,
}: HierarchicalPermissionsEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [expandedSubModules, setExpandedSubModules] = useState<string[]>([]);

  const visibleModules = useMemo(() => {
    if (!allowedModules) return ACTIVE_MODULES;
    const allowedSet = new Set<AppModule>(allowedModules);
    return ACTIVE_MODULES.filter(m => allowedSet.has(m.value as AppModule));
  }, [allowedModules]);

  const isModulePro = (module: AppModule): boolean => {
    return moduleProMode?.[module] ?? isProMode;
  };

  // Buscar permissões de recursos do usuário
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['user-resource-permissions', userId, empresaId],
    queryFn: async () => {
      let query = supabase.from('user_resource_permissions').select('*').eq('user_id', userId);

      if (empresaId === null) {
        query = query.is('empresa_id', null);
      } else if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ResourcePermission[];
    },
  });

  // Mutation para salvar permissão
  const saveMutation = useMutation({
    mutationFn: async (perm: Omit<ResourcePermission, 'id'>) => {
      const { data: existing } = await supabase
        .from('user_resource_permissions')
        .select('id')
        .eq('user_id', perm.user_id)
        .eq('module', perm.module)
        .eq('resource', perm.resource)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_resource_permissions')
          .update({
            sub_module: perm.sub_module,
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
            can_export: perm.can_export,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_resource_permissions').insert(perm);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-resource-permissions', userId, empresaId] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar permissão', description: error.message, variant: 'destructive' });
    },
  });

  // Mutation para conceder todas as permissões de um recurso
  const grantAllMutation = useMutation({
    mutationFn: async ({ module, subModule, resource }: { module: string; subModule: string; resource: string }) => {
      const perm: Omit<ResourcePermission, 'id'> = {
        user_id: userId,
        empresa_id: empresaId,
        module,
        sub_module: subModule,
        resource,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        can_export: true,
      };

      const { data: existing } = await supabase
        .from('user_resource_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('module', module)
        .eq('resource', resource)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_resource_permissions')
          .update({
            ...perm,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('user_resource_permissions').insert(perm);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-resource-permissions', userId, empresaId] });
    },
  });

  // Mutation para revogar todas as permissões de um recurso
  const revokeAllMutation = useMutation({
    mutationFn: async ({ module, resource }: { module: string; resource: string }) => {
      const { error } = await supabase
        .from('user_resource_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('module', module)
        .eq('resource', resource);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-resource-permissions', userId, empresaId] });
    },
  });

  const getResourcePermission = (module: string, resource: string): ResourcePermission | undefined => {
    return permissions.find(p => p.module === module && p.resource === resource);
  };

  const toggleAction = (
    module: string,
    subModule: string,
    resource: string,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export'
  ) => {
    if (readOnly) return;

    const existing = getResourcePermission(module, resource);
    const currentValue = existing?.[action] ?? false;

    saveMutation.mutate({
      user_id: userId,
      empresa_id: empresaId,
      module,
      sub_module: subModule,
      resource,
      can_view: action === 'can_view' ? !currentValue : existing?.can_view ?? false,
      can_create: action === 'can_create' ? !currentValue : existing?.can_create ?? false,
      can_edit: action === 'can_edit' ? !currentValue : existing?.can_edit ?? false,
      can_delete: action === 'can_delete' ? !currentValue : existing?.can_delete ?? false,
      can_export: action === 'can_export' ? !currentValue : existing?.can_export ?? false,
    });
  };

  const toggleModule = (moduleValue: string) => {
    setExpandedModules(prev => (prev.includes(moduleValue) ? prev.filter(m => m !== moduleValue) : [...prev, moduleValue]));
  };

  const toggleSubModule = (subModuleValue: string) => {
    setExpandedSubModules(prev => (prev.includes(subModuleValue) ? prev.filter(m => m !== subModuleValue) : [...prev, subModuleValue]));
  };

  const isResourceAvailable = (module: AppModule, subModule: string, resource: string): boolean => {
    if (isModulePro(module)) return true;
    const proResources = PRO_ONLY_RESOURCES[subModule] || [];
    return !proResources.includes(resource);
  };

  const countResourcePermissions = (module: string, resource: string): number => {
    const perm = getResourcePermission(module, resource);
    if (!perm) return 0;
    return [perm.can_view, perm.can_create, perm.can_edit, perm.can_delete, perm.can_export].filter(Boolean).length;
  };

  const countSubModulePermissions = (module: string, subModule: AppSubModule): number => {
    const resources = getSubModuleResources(subModule);
    return resources.reduce((acc, r) => acc + countResourcePermissions(module, r.value), 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com legenda */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Permissões Hierárquicas</span>
          {isProMode ? (
            <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500">
              <Zap className="w-3 h-3" /> Pro
            </Badge>
          ) : (
            <Badge variant="secondary">Básico</Badge>
          )}
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Permitido</span>
          <span className="flex items-center gap-1"><X className="w-3 h-3 text-red-500" /> Negado</span>
        </div>
      </div>

      {/* Árvore de Módulos */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3 pr-4">
          {ACTIVE_MODULES.map(module => {
            const subModules = getModuleSubModules(module.value);
            const isExpanded = expandedModules.includes(module.value);
            
            return (
              <Card key={module.value} className="overflow-hidden">
                {/* Cabeçalho do Módulo */}
                <Collapsible open={isExpanded} onOpenChange={() => toggleModule(module.value)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <div className={`p-1.5 rounded ${module.color} bg-opacity-20`}>
                            {MODULE_ICONS[module.value]}
                          </div>
                          <div>
                            <CardTitle className="text-base">{module.label}</CardTitle>
                            <p className="text-xs text-muted-foreground">{module.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {subModules.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {subModules.length} sub-módulos
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {/* Sub-módulos */}
                      {subModules.map(subModule => {
                        const resources = getSubModuleResources(subModule.value);
                        const isSubExpanded = expandedSubModules.includes(subModule.value);
                        const permCount = countSubModulePermissions(module.value, subModule.value);
                        
                        return (
                          <Collapsible 
                            key={subModule.value} 
                            open={isSubExpanded} 
                            onOpenChange={() => toggleSubModule(subModule.value)}
                          >
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2">
                                  {isSubExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  {SUBMODULE_ICONS[subModule.value]}
                                  <span className="text-sm font-medium">{subModule.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {permCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {permCount} ações
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {resources.length} recursos
                                  </Badge>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <div className="mt-2 ml-4 space-y-2">
                                {/* Recursos */}
                                {resources.map(resource => {
                                  const isAvailable = isResourceAvailable(module.value as AppModule, subModule.value, resource.value);
                                  const perm = getResourcePermission(module.value, resource.value);
                                  const resourcePermCount = countResourcePermissions(module.value, resource.value);
                                  
                                  return (
                                    <div 
                                      key={resource.value} 
                                      className={`p-3 rounded-lg border ${isAvailable ? 'border-border/30 bg-background' : 'border-dashed border-amber-500/30 bg-amber-500/5'}`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium">{resource.label}</span>
                                          {!isAvailable && (
                                            <Badge variant="outline" className="text-xs gap-1 text-amber-500 border-amber-500/50">
                                              <Zap className="w-3 h-3" /> Pro
                                            </Badge>
                                          )}
                                          {resourcePermCount > 0 && isAvailable && (
                                            <Badge variant="secondary" className="text-xs">{resourcePermCount}/5</Badge>
                                          )}
                                        </div>
                                        {!readOnly && isAvailable && (
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => grantAllMutation.mutate({ 
                                                module: module.value, 
                                                subModule: subModule.value, 
                                                resource: resource.value 
                                              })}
                                              className="text-xs text-primary hover:underline"
                                            >
                                              Todos
                                            </button>
                                            <span className="text-muted-foreground">|</span>
                                            <button
                                              onClick={() => revokeAllMutation.mutate({ 
                                                module: module.value, 
                                                resource: resource.value 
                                              })}
                                              className="text-xs text-muted-foreground hover:underline"
                                            >
                                              Limpar
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {isAvailable ? (
                                        <div className="flex flex-wrap gap-4">
                                          {(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_export'] as const).map(action => (
                                            <div key={action} className="flex items-center gap-2">
                                              <Checkbox
                                                id={`${module.value}-${resource.value}-${action}`}
                                                checked={perm?.[action] === true}
                                                onCheckedChange={() => toggleAction(module.value, subModule.value, resource.value, action)}
                                                disabled={readOnly || saveMutation.isPending}
                                              />
                                              <Label 
                                                htmlFor={`${module.value}-${resource.value}-${action}`}
                                                className="text-xs cursor-pointer"
                                              >
                                                {action === 'can_view' && 'Visualizar'}
                                                {action === 'can_create' && 'Criar'}
                                                {action === 'can_edit' && 'Editar'}
                                                {action === 'can_delete' && 'Excluir'}
                                                {action === 'can_export' && 'Exportar'}
                                              </Label>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground italic">
                                          Disponível apenas no modo Pro
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                      
                      {subModules.length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-4">
                          Este módulo não possui sub-módulos configurados
                        </p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
