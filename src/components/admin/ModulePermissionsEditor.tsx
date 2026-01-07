/**
 * Editor simplificado de permissões por módulo
 * 
 * Exibe todos os módulos disponíveis com checkboxes para cada ação
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, Zap } from 'lucide-react';
import { APP_MODULES, AppModule, PERMISSION_TYPES } from '@/constants/modules';
import { useManageModulePermissions, ModulePermission } from '@/hooks/useModulePermissions';

interface ModulePermissionsEditorProps {
  userId: string;
  empresaId: string | null;
  empresaModulos?: string[]; // Módulos liberados para a empresa (se aplicável)
  readOnly?: boolean;
}

const ACTIVE_MODULES = APP_MODULES.filter(m => 
  !['financialace', 'erp', 'ajustasped', 'conferesped'].includes(m.value)
);

export function ModulePermissionsEditor({
  userId,
  empresaId,
  empresaModulos,
  readOnly = false,
}: ModulePermissionsEditorProps) {
  const { 
    permissions, 
    isLoading, 
    grantPermission, 
    isUpdating 
  } = useManageModulePermissions(userId, empresaId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const getPermission = (module: AppModule): ModulePermission | null => {
    return permissions.find(p => p.module === module) || null;
  };

  const handleToggle = (
    module: AppModule, 
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export' | 'is_pro_mode',
    currentValue: boolean
  ) => {
    if (readOnly || isUpdating) return;

    const current = getPermission(module);
    
    grantPermission({
      user_id: userId,
      empresa_id: empresaId,
      module,
      can_view: action === 'can_view' ? !currentValue : current?.can_view ?? false,
      can_create: action === 'can_create' ? !currentValue : current?.can_create ?? false,
      can_edit: action === 'can_edit' ? !currentValue : current?.can_edit ?? false,
      can_delete: action === 'can_delete' ? !currentValue : current?.can_delete ?? false,
      can_export: action === 'can_export' ? !currentValue : current?.can_export ?? false,
      is_pro_mode: action === 'is_pro_mode' ? !currentValue : current?.is_pro_mode ?? false,
    });
  };

  const handleGrantAll = (module: AppModule) => {
    if (readOnly || isUpdating) return;
    
    grantPermission({
      user_id: userId,
      empresa_id: empresaId,
      module,
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
      can_export: true,
      is_pro_mode: true,
    });
  };

  const handleRevokeAll = (module: AppModule) => {
    if (readOnly || isUpdating) return;
    
    grantPermission({
      user_id: userId,
      empresa_id: empresaId,
      module,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_export: false,
      is_pro_mode: false,
    });
  };

  const isModuleAvailable = (module: AppModule): boolean => {
    // Se não há restrição de empresa, todos os módulos estão disponíveis
    if (!empresaModulos) return true;
    // Verificar se módulo está na lista de módulos da empresa
    return empresaModulos.includes(module);
  };

  const countPermissions = (module: AppModule): number => {
    const perm = getPermission(module);
    if (!perm) return 0;
    return [
      perm.can_view,
      perm.can_create,
      perm.can_edit,
      perm.can_delete,
      perm.can_export,
    ].filter(Boolean).length;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Permissões por Módulo</span>
          {empresaId && (
            <Badge variant="outline" className="ml-2">
              Vinculado à empresa
            </Badge>
          )}
          {empresaId === null && (
            <Badge variant="secondary" className="ml-2">
              Standalone
            </Badge>
          )}
        </div>
        {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
      </div>

      {/* Módulos */}
      <div className="grid gap-4">
        {ACTIVE_MODULES.map(module => {
          const available = isModuleAvailable(module.value);
          const perm = getPermission(module.value);
          const permCount = countPermissions(module.value);

          return (
            <Card 
              key={module.value} 
              className={!available ? 'opacity-50' : ''}
            >
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${module.color}`} />
                    <CardTitle className="text-base">{module.label}</CardTitle>
                    {permCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {permCount}/5
                      </Badge>
                    )}
                    {perm?.is_pro_mode && (
                      <Badge variant="default" className="gap-1 text-xs">
                        <Zap className="w-3 h-3" /> Pro
                      </Badge>
                    )}
                  </div>
                  
                  {!readOnly && available && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGrantAll(module.value)}
                        className="text-xs text-primary hover:underline"
                        disabled={isUpdating}
                      >
                        Todos
                      </button>
                      <span className="text-muted-foreground">|</span>
                      <button
                        onClick={() => handleRevokeAll(module.value)}
                        className="text-xs text-muted-foreground hover:underline"
                        disabled={isUpdating}
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{module.description}</p>
              </CardHeader>

              {available && (
                <CardContent className="py-3 border-t">
                  <div className="flex flex-wrap gap-6">
                    {/* Ações básicas */}
                    {PERMISSION_TYPES.map(action => (
                      <div key={action.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`${module.value}-${action.value}`}
                          checked={perm?.[`can_${action.value}` as keyof ModulePermission] === true}
                          onCheckedChange={() => handleToggle(
                            module.value, 
                            `can_${action.value}` as any,
                            perm?.[`can_${action.value}` as keyof ModulePermission] === true
                          )}
                          disabled={readOnly || isUpdating}
                        />
                        <Label 
                          htmlFor={`${module.value}-${action.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {action.label}
                        </Label>
                      </div>
                    ))}

                    {/* Separador */}
                    <div className="h-6 w-px bg-border" />

                    {/* Pro Mode */}
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`${module.value}-pro`}
                        checked={perm?.is_pro_mode === true}
                        onCheckedChange={() => handleToggle(
                          module.value, 
                          'is_pro_mode',
                          perm?.is_pro_mode === true
                        )}
                        disabled={readOnly || isUpdating}
                      />
                      <Label 
                        htmlFor={`${module.value}-pro`}
                        className="text-sm cursor-pointer flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        Pro Mode
                      </Label>
                    </div>
                  </div>
                </CardContent>
              )}

              {!available && (
                <CardContent className="py-3 border-t">
                  <p className="text-sm text-muted-foreground italic">
                    Módulo não disponível para esta empresa
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
