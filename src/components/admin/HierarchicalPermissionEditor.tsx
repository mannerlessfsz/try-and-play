import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  APP_MODULES,
  MODULE_SUB_MODULES,
  SUB_MODULE_RESOURCES,
  PERMISSION_ACTIONS,
  AppModule,
  AppSubModule,
} from '@/constants/modules';
import { 
  Shield, 
  Lock, 
  Unlock,
  ChevronRight,
  Check,
  X,
  Layers,
  FolderOpen,
  FileText
} from 'lucide-react';

export interface PermissionState {
  module: string;
  sub_module: string | null;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

interface HierarchicalPermissionEditorProps {
  permissions: PermissionState[];
  onTogglePermission: (
    module: string,
    subModule: string | null,
    resource: string,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export',
    currentValue: boolean
  ) => void;
  onGrantAllForResource: (module: string, subModule: string | null, resource: string) => void;
  onRevokeAllForResource: (module: string, subModule: string | null, resource: string) => void;
  onGrantAllForSubModule: (module: string, subModule: string) => void;
  onRevokeAllForSubModule: (module: string, subModule: string) => void;
  onToggleModuleAccess?: (module: string, enabled: boolean) => void;
  moduleAccessState?: Record<string, boolean>;
  readOnly?: boolean;
}

// Módulos ativos (excluindo legados)
const ACTIVE_MODULES = APP_MODULES.filter(
  m => !['financialace', 'erp', 'ajustasped'].includes(m.value)
);

export function HierarchicalPermissionEditor({
  permissions,
  onTogglePermission,
  onGrantAllForResource,
  onRevokeAllForResource,
  onGrantAllForSubModule,
  onRevokeAllForSubModule,
  onToggleModuleAccess,
  moduleAccessState = {},
  readOnly = false,
}: HierarchicalPermissionEditorProps) {
  const [selectedModule, setSelectedModule] = useState<AppModule>('gestao');
  const [selectedSubModule, setSelectedSubModule] = useState<AppSubModule | null>(null);

  // Calcular permissões por módulo
  const getModulePermissionCount = (module: AppModule) => {
    return permissions.filter(p => p.module === module).reduce((acc, p) => {
      return acc + 
        (p.can_view ? 1 : 0) + 
        (p.can_create ? 1 : 0) + 
        (p.can_edit ? 1 : 0) + 
        (p.can_delete ? 1 : 0) + 
        (p.can_export ? 1 : 0);
    }, 0);
  };

  // Calcular permissões por sub-módulo
  const getSubModulePermissionCount = (module: AppModule, subModule: AppSubModule) => {
    return permissions.filter(p => p.module === module && p.sub_module === subModule).reduce((acc, p) => {
      return acc + 
        (p.can_view ? 1 : 0) + 
        (p.can_create ? 1 : 0) + 
        (p.can_edit ? 1 : 0) + 
        (p.can_delete ? 1 : 0) + 
        (p.can_export ? 1 : 0);
    }, 0);
  };

  // Obter permissão de um recurso
  const getResourcePermission = (module: string, subModule: string | null, resource: string) => {
    return permissions.find(
      p => p.module === module && p.sub_module === subModule && p.resource === resource
    );
  };

  // Verificar se módulo está habilitado
  const isModuleEnabled = (module: AppModule) => {
    return moduleAccessState[module] !== false; // Default true se não definido
  };

  // Selecionar primeiro sub-módulo ao mudar de módulo
  const handleModuleChange = (module: AppModule) => {
    setSelectedModule(module);
    const subModules = MODULE_SUB_MODULES[module];
    if (subModules && subModules.length > 0) {
      setSelectedSubModule(subModules[0].value);
    } else {
      setSelectedSubModule(null);
    }
  };

  // Inicializar sub-módulo se necessário
  React.useEffect(() => {
    if (!selectedSubModule && selectedModule) {
      const subModules = MODULE_SUB_MODULES[selectedModule];
      if (subModules && subModules.length > 0) {
        setSelectedSubModule(subModules[0].value);
      }
    }
  }, [selectedModule, selectedSubModule]);

  const currentSubModules = MODULE_SUB_MODULES[selectedModule] || [];
  const currentResources = selectedSubModule ? SUB_MODULE_RESOURCES[selectedSubModule] || [] : [];

  return (
    <div className="space-y-4">
      {/* Header com legenda */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="w-4 h-4" />
          <span>Módulo</span>
          <ChevronRight className="w-3 h-3" />
          <FolderOpen className="w-4 h-4" />
          <span>Sub-módulo</span>
          <ChevronRight className="w-3 h-3" />
          <FileText className="w-4 h-4" />
          <span>Recurso</span>
        </div>
        <Badge variant="outline" className="gap-1">
          <Shield className="w-3 h-3" />
          Cascata automática
        </Badge>
      </div>

      {/* Tabs de Módulos */}
      <Tabs value={selectedModule} onValueChange={(v) => handleModuleChange(v as AppModule)}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${ACTIVE_MODULES.length}, 1fr)` }}>
          {ACTIVE_MODULES.map(module => {
            const permCount = getModulePermissionCount(module.value);
            const enabled = isModuleEnabled(module.value);
            
            return (
              <TabsTrigger 
                key={module.value} 
                value={module.value}
                className="relative gap-2"
                disabled={!enabled && onToggleModuleAccess !== undefined}
              >
                {!enabled && <Lock className="w-3 h-3" />}
                {module.label}
                {permCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {permCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ACTIVE_MODULES.map(module => (
          <TabsContent key={module.value} value={module.value} className="mt-4 space-y-4">
            {/* Toggle de acesso ao módulo */}
            {onToggleModuleAccess && (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {isModuleEnabled(module.value) ? (
                    <Unlock className="w-5 h-5 text-green-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label className="text-base font-medium">Acesso ao {module.label}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isModuleEnabled(module.value) 
                        ? 'Acesso habilitado - configure os sub-módulos abaixo'
                        : 'Acesso bloqueado - todos os recursos negados'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isModuleEnabled(module.value)}
                  onCheckedChange={(checked) => onToggleModuleAccess(module.value, checked)}
                  disabled={readOnly}
                />
              </div>
            )}

            {/* Sub-módulos (se módulo habilitado) */}
            {isModuleEnabled(module.value) && currentSubModules.length > 0 && (
              <Tabs value={selectedSubModule || ''} onValueChange={(v) => setSelectedSubModule(v as AppSubModule)}>
                <div className="flex items-center justify-between">
                  <TabsList>
                    {currentSubModules.map(subMod => {
                      const subPermCount = getSubModulePermissionCount(module.value, subMod.value);
                      
                      return (
                        <TabsTrigger key={subMod.value} value={subMod.value} className="gap-2">
                          <FolderOpen className="w-4 h-4" />
                          {subMod.label}
                          {subPermCount > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                              {subPermCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  
                  {/* Ações em massa para sub-módulo */}
                  {selectedSubModule && !readOnly && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onGrantAllForSubModule(module.value, selectedSubModule)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Marcar Todos
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRevokeAllForSubModule(module.value, selectedSubModule)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Limpar
                      </Button>
                    </div>
                  )}
                </div>

                {currentSubModules.map(subMod => (
                  <TabsContent key={subMod.value} value={subMod.value} className="mt-4">
                    <div className="mb-2 text-sm text-muted-foreground">
                      {subMod.description}
                    </div>
                    
                    {/* Tabela de recursos */}
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[200px]">Recurso</TableHead>
                            {PERMISSION_ACTIONS.map(action => (
                              <TableHead key={action.value} className="text-center w-24">
                                {action.label}
                              </TableHead>
                            ))}
                            <TableHead className="w-32">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(SUB_MODULE_RESOURCES[subMod.value] || []).map(resource => {
                            const permission = getResourcePermission(module.value, subMod.value, resource.value);
                            const hasAnyPermission = permission && (
                              permission.can_view || permission.can_create || 
                              permission.can_edit || permission.can_delete || permission.can_export
                            );

                            return (
                              <TableRow key={resource.value} className={hasAnyPermission ? 'bg-primary/5' : ''}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <span className="font-medium">{resource.label}</span>
                                      {resource.description && (
                                        <p className="text-xs text-muted-foreground">{resource.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                {PERMISSION_ACTIONS.map(action => (
                                  <TableCell key={action.value} className="text-center">
                                    <Checkbox
                                      checked={permission?.[action.value] ?? false}
                                      onCheckedChange={() =>
                                        onTogglePermission(
                                          module.value,
                                          subMod.value,
                                          resource.value,
                                          action.value,
                                          permission?.[action.value] ?? false
                                        )
                                      }
                                      disabled={readOnly}
                                    />
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => onGrantAllForResource(module.value, subMod.value, resource.value)}
                                      disabled={readOnly}
                                    >
                                      Todos
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={() => onRevokeAllForResource(module.value, subMod.value, resource.value)}
                                      disabled={readOnly}
                                    >
                                      Limpar
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {/* Mensagem quando módulo está bloqueado */}
            {!isModuleEnabled(module.value) && onToggleModuleAccess && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Lock className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium">Acesso ao módulo bloqueado</p>
                <p className="text-sm">Habilite o acesso acima para configurar permissões granulares</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
