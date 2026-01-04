import React, { useState } from 'react';
import { usePermissionProfiles, PermissionProfile } from '@/hooks/usePermissionProfiles';
import { MODULE_RESOURCES, PERMISSION_ACTIONS } from '@/hooks/useResourcePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
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
  Copy,
  Users
} from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'user', label: 'Usuário' },
];

const MODULES = [
  { value: 'financialace', label: 'FinancialACE' },
  { value: 'erp', label: 'ERP/Gestão' },
  { value: 'taskvault', label: 'TaskVault' },
  { value: 'conversores', label: 'Conversores' },
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
  const [selectedModule, setSelectedModule] = useState<string>('financialace');
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

  const handleTogglePermission = (
    profileId: string,
    module: string,
    resource: string,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export',
    currentValue: boolean
  ) => {
    const existing = getProfileItems(profileId).find(
      item => item.module === module && item.resource === resource
    );
    
    upsertProfileItem({
      profile_id: profileId,
      module,
      resource,
      can_view: existing?.can_view ?? false,
      can_create: existing?.can_create ?? false,
      can_edit: existing?.can_edit ?? false,
      can_delete: existing?.can_delete ?? false,
      can_export: existing?.can_export ?? false,
      [action]: !currentValue,
    });
  };

  const handleGrantAllForResource = (profileId: string, module: string, resource: string) => {
    upsertProfileItem({
      profile_id: profileId,
      module,
      resource,
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
      can_export: true,
    });
  };

  const handleRevokeAllForResource = (profileId: string, module: string, resource: string) => {
    upsertProfileItem({
      profile_id: profileId,
      module,
      resource,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_export: false,
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
            Crie templates de permissões para aplicar rapidamente a usuários
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
                    <div className="border-t border-border p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Configurar Permissões do Perfil</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Marque as permissões que este perfil terá em cada recurso
                        </p>
                      </div>

                      {/* Module selector */}
                      <div className="flex gap-2 flex-wrap">
                        {MODULES.map(mod => {
                          const modulePermCount = getProfileItems(profile.id).filter(
                            item => item.module === mod.value
                          ).reduce((acc, item) => {
                            return acc + 
                              (item.can_view ? 1 : 0) + 
                              (item.can_create ? 1 : 0) + 
                              (item.can_edit ? 1 : 0) + 
                              (item.can_delete ? 1 : 0) + 
                              (item.can_export ? 1 : 0);
                          }, 0);
                          
                          return (
                            <Button
                              key={mod.value}
                              size="sm"
                              variant={selectedModule === mod.value ? 'default' : 'outline'}
                              onClick={() => setSelectedModule(mod.value)}
                              className="relative"
                            >
                              {mod.label}
                              {modulePermCount > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                  {modulePermCount}
                                </Badge>
                              )}
                            </Button>
                          );
                        })}
                      </div>

                      {/* Bulk actions for module */}
                      <div className="flex gap-2 items-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            MODULE_RESOURCES[selectedModule]?.forEach(resource => {
                              handleGrantAllForResource(profile.id, selectedModule, resource.value);
                            });
                          }}
                        >
                          Marcar Todos do Módulo
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            MODULE_RESOURCES[selectedModule]?.forEach(resource => {
                              handleRevokeAllForResource(profile.id, selectedModule, resource.value);
                            });
                          }}
                        >
                          Limpar Módulo
                        </Button>
                      </div>

                      {/* Resource permissions table */}
                      {MODULE_RESOURCES[selectedModule] && (
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
                              {MODULE_RESOURCES[selectedModule].map(resource => {
                                const permission = getProfileItems(profile.id).find(
                                  p => p.module === selectedModule && p.resource === resource.value
                                );
                                const hasAnyPermission = permission && (
                                  permission.can_view || permission.can_create || 
                                  permission.can_edit || permission.can_delete || permission.can_export
                                );

                                return (
                                  <TableRow key={resource.value} className={hasAnyPermission ? 'bg-primary/5' : ''}>
                                    <TableCell>
                                      <div>
                                        <span className="font-medium">{resource.label}</span>
                                        {resource.description && (
                                          <p className="text-xs text-muted-foreground">{resource.description}</p>
                                        )}
                                      </div>
                                    </TableCell>
                                    {PERMISSION_ACTIONS.map(action => (
                                      <TableCell key={action.value} className="text-center">
                                        <Checkbox
                                          checked={permission?.[action.value] ?? false}
                                          onCheckedChange={() =>
                                            handleTogglePermission(
                                              profile.id,
                                              selectedModule,
                                              resource.value,
                                              action.value,
                                              permission?.[action.value] ?? false
                                            )
                                          }
                                        />
                                      </TableCell>
                                    ))}
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() =>
                                            handleGrantAllForResource(profile.id, selectedModule, resource.value)
                                          }
                                        >
                                          Todos
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-xs"
                                          onClick={() =>
                                            handleRevokeAllForResource(profile.id, selectedModule, resource.value)
                                          }
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
                      )}
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
