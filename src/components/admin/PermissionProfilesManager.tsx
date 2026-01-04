import React, { useState } from 'react';
import { usePermissionProfiles, PermissionProfile } from '@/hooks/usePermissionProfiles';
import { 
  APP_MODULES, 
  MODULE_SUB_MODULES, 
  SUB_MODULE_RESOURCES,
  PERMISSION_ACTIONS,
  AppModule,
  AppSubModule 
} from '@/constants/modules';
import { HierarchicalPermissionEditor, PermissionState } from './HierarchicalPermissionEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'user', label: 'Usuário' },
];

export function PermissionProfilesManager() {
  const {
    profiles,
    profileItems,
    isLoading,
    createProfile,
    updateProfile,
    deleteProfile,
    upsertProfileItem,
    getProfileItems,
  } = usePermissionProfiles();

  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PermissionProfile | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    role_padrao: '',
  });

  const handleCreateProfile = () => {
    createProfile({
      nome: formData.nome,
      descricao: formData.descricao || undefined,
      role_padrao: formData.role_padrao || undefined,
    });
    setFormData({ nome: '', descricao: '', role_padrao: '' });
    setIsCreateOpen(false);
  };

  const handleUpdateProfile = () => {
    if (!editingProfile) return;
    updateProfile({
      id: editingProfile.id,
      nome: formData.nome,
      descricao: formData.descricao || undefined,
      role_padrao: formData.role_padrao || undefined,
    });
    setEditingProfile(null);
    setFormData({ nome: '', descricao: '', role_padrao: '' });
  };

  // Converter profileItems para o formato do HierarchicalPermissionEditor
  const getPermissionsForEditor = (profileId: string): PermissionState[] => {
    const items = getProfileItems(profileId);
    return items.map(item => ({
      module: item.module,
      sub_module: item.sub_module || null,
      resource: item.resource,
      can_view: item.can_view ?? false,
      can_create: item.can_create ?? false,
      can_edit: item.can_edit ?? false,
      can_delete: item.can_delete ?? false,
      can_export: item.can_export ?? false,
    }));
  };

  const handleTogglePermission = (
    profileId: string,
    module: string,
    subModule: string | null,
    resource: string,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export',
    currentValue: boolean
  ) => {
    const existing = getProfileItems(profileId).find(
      item => item.module === module && item.sub_module === subModule && item.resource === resource
    );
    
    upsertProfileItem({
      profile_id: profileId,
      module,
      sub_module: subModule,
      resource,
      can_view: existing?.can_view ?? false,
      can_create: existing?.can_create ?? false,
      can_edit: existing?.can_edit ?? false,
      can_delete: existing?.can_delete ?? false,
      can_export: existing?.can_export ?? false,
      [action]: !currentValue,
    });
  };

  const handleGrantAllForResource = (profileId: string, module: string, subModule: string | null, resource: string) => {
    upsertProfileItem({
      profile_id: profileId,
      module,
      sub_module: subModule,
      resource,
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
      can_export: true,
    });
  };

  const handleRevokeAllForResource = (profileId: string, module: string, subModule: string | null, resource: string) => {
    upsertProfileItem({
      profile_id: profileId,
      module,
      sub_module: subModule,
      resource,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_export: false,
    });
  };

  const handleGrantAllForSubModule = (profileId: string, module: string, subModule: string) => {
    const resources = SUB_MODULE_RESOURCES[subModule as AppSubModule] || [];
    resources.forEach(resource => {
      handleGrantAllForResource(profileId, module, subModule, resource.value);
    });
  };

  const handleRevokeAllForSubModule = (profileId: string, module: string, subModule: string) => {
    const resources = SUB_MODULE_RESOURCES[subModule as AppSubModule] || [];
    resources.forEach(resource => {
      handleRevokeAllForResource(profileId, module, subModule, resource.value);
    });
  };

  const getRoleLabel = (role: string | null) => {
    const found = ROLES.find(r => r.value === role);
    return found?.label || role || 'Nenhum';
  };

  const getProfilePermissionCount = (profileId: string) => {
    const items = getProfileItems(profileId);
    let count = 0;
    items.forEach(item => {
      if (item.can_view) count++;
      if (item.can_create) count++;
      if (item.can_edit) count++;
      if (item.can_delete) count++;
      if (item.can_export) count++;
    });
    return count;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Perfis de Permissões
          </CardTitle>
          <CardDescription>
            Crie templates de permissões com hierarquia Módulo → Sub-módulo → Recurso
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Perfil de Permissões</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Perfil</Label>
                <Input
                  placeholder="Ex: Gerente Financeiro"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva as permissões deste perfil..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
              <div>
                <Label>Role Padrão</Label>
                <Select
                  value={formData.role_padrao}
                  onValueChange={(v) => setFormData({ ...formData, role_padrao: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Role que será atribuída automaticamente ao aplicar este perfil
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateProfile} disabled={!formData.nome}>
                Criar Perfil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {profiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum perfil de permissões criado
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map(profile => {
              const isExpanded = expandedProfile === profile.id;
              const permCount = getProfilePermissionCount(profile.id);

              return (
                <div key={profile.id} className="border border-border rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedProfile(isExpanded ? null : profile.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{profile.nome}</span>
                          <Badge variant="outline">
                            {getRoleLabel(profile.role_padrao)}
                          </Badge>
                          <Badge variant="secondary">
                            {permCount} permissões
                          </Badge>
                        </div>
                        {profile.descricao && (
                          <p className="text-xs text-muted-foreground">{profile.descricao}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({
                            nome: profile.nome,
                            descricao: profile.descricao || '',
                            role_padrao: profile.role_padrao || '',
                          });
                          setEditingProfile(profile);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Excluir este perfil de permissões?')) {
                            deleteProfile(profile.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border p-4">
                      <HierarchicalPermissionEditor
                        permissions={getPermissionsForEditor(profile.id)}
                        onTogglePermission={(module, subModule, resource, action, currentValue) =>
                          handleTogglePermission(profile.id, module, subModule, resource, action, currentValue)
                        }
                        onGrantAllForResource={(module, subModule, resource) =>
                          handleGrantAllForResource(profile.id, module, subModule, resource)
                        }
                        onRevokeAllForResource={(module, subModule, resource) =>
                          handleRevokeAllForResource(profile.id, module, subModule, resource)
                        }
                        onGrantAllForSubModule={(module, subModule) =>
                          handleGrantAllForSubModule(profile.id, module, subModule)
                        }
                        onRevokeAllForSubModule={(module, subModule) =>
                          handleRevokeAllForSubModule(profile.id, module, subModule)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Profile Dialog */}
        <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Perfil</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
              <div>
                <Label>Role Padrão</Label>
                <Select
                  value={formData.role_padrao}
                  onValueChange={(v) => setFormData({ ...formData, role_padrao: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProfile(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateProfile} disabled={!formData.nome}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
