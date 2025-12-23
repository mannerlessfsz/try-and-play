import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, AppModule, PermissionType, AppRole } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Users, 
  Building2, 
  Shield, 
  Plus, 
  Trash2, 
  Edit, 
  Loader2,
  UserPlus,
  Settings
} from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

interface UserPermission {
  id: string;
  user_id: string;
  empresa_id: string | null;
  module: AppModule;
  permission: PermissionType;
  is_pro_mode: boolean;
}

interface UserEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  is_owner: boolean;
}

const MODULES: { value: AppModule; label: string }[] = [
  { value: 'taskvault', label: 'TaskVault' },
  { value: 'financialace', label: 'FinancialACE' },
  { value: 'ajustasped', label: 'AjustaSped' },
  { value: 'conferesped', label: 'ConfereSped' }
];

const PERMISSIONS: { value: PermissionType; label: string }[] = [
  { value: 'view', label: 'Visualizar' },
  { value: 'create', label: 'Criar' },
  { value: 'edit', label: 'Editar' },
  { value: 'delete', label: 'Excluir' },
  { value: 'export', label: 'Exportar' }
];

const ROLES: { value: AppRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Administrador', color: 'bg-red-500' },
  { value: 'manager', label: 'Gerente', color: 'bg-yellow-500' },
  { value: 'user', label: 'Usuário', color: 'bg-blue-500' }
];

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isAddingEmpresa, setIsAddingEmpresa] = useState(false);
  const [newEmpresa, setNewEmpresa] = useState({ nome: '', cnpj: '', email: '' });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data as Profile[];
    }
  });

  // Fetch all empresas
  const { data: empresas = [], isLoading: empresasLoading } = useQuery({
    queryKey: ['admin-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('*');
      if (error) throw error;
      return data as Empresa[];
    }
  });

  // Fetch user roles
  const { data: allRoles = [] } = useQuery({
    queryKey: ['admin-all-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data as UserRole[];
    }
  });

  // Fetch user permissions
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['admin-all-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_permissions').select('*');
      if (error) throw error;
      return data as UserPermission[];
    }
  });

  // Fetch user-empresa associations
  const { data: allUserEmpresas = [] } = useQuery({
    queryKey: ['admin-all-user-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_empresas').select('*');
      if (error) throw error;
      return data as UserEmpresa[];
    }
  });

  // Add empresa mutation
  const addEmpresaMutation = useMutation({
    mutationFn: async (empresa: { nome: string; cnpj: string; email: string }) => {
      const { data, error } = await supabase.from('empresas').insert(empresa).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      setIsAddingEmpresa(false);
      setNewEmpresa({ nome: '', cnpj: '', email: '' });
      toast({ title: 'Empresa criada com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar empresa', description: error.message, variant: 'destructive' });
    }
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] });
      toast({ title: 'Papel adicionado' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] });
      toast({ title: 'Papel removido' });
    }
  });

  // Add permission mutation
  const addPermissionMutation = useMutation({
    mutationFn: async (permission: Omit<UserPermission, 'id'>) => {
      const { error } = await supabase.from('user_permissions').insert(permission);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-permissions'] });
      toast({ title: 'Permissão adicionada' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });

  // Remove permission mutation
  const removePermissionMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase.from('user_permissions').delete().eq('id', permissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-permissions'] });
      toast({ title: 'Permissão removida' });
    }
  });

  // Add user-empresa association
  const addUserEmpresaMutation = useMutation({
    mutationFn: async ({ userId, empresaId, isOwner }: { userId: string; empresaId: string; isOwner: boolean }) => {
      const { error } = await supabase.from('user_empresas').insert({ 
        user_id: userId, 
        empresa_id: empresaId, 
        is_owner: isOwner 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-user-empresas'] });
      toast({ title: 'Associação criada' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });

  // Remove user-empresa association
  const removeUserEmpresaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_empresas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-user-empresas'] });
      toast({ title: 'Associação removida' });
    }
  });

  const getUserRoles = (userId: string) => allRoles.filter(r => r.user_id === userId);
  const getUserPermissions = (userId: string) => allPermissions.filter(p => p.user_id === userId);
  const getUserEmpresas = (userId: string) => allUserEmpresas.filter(ue => ue.user_id === userId);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="glass">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-foreground">Acesso restrito a administradores</p>
            <Button onClick={() => navigate('/')} className="mt-4">Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Gerenciar usuários, empresas e permissões</p>
            </div>
          </div>
          <Settings className="w-6 h-6 text-primary" />
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="empresas" className="gap-2">
              <Building2 className="w-4 h-4" /> Empresas
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="w-4 h-4" /> Permissões
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Usuários do Sistema</CardTitle>
                <CardDescription>Gerencie papéis e acessos de cada usuário</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Papéis</TableHead>
                        <TableHead>Empresas</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {getUserRoles(user.id).map(role => (
                                <Badge key={role.id} variant="secondary" className="gap-1">
                                  {ROLES.find(r => r.value === role.role)?.label}
                                  <button onClick={() => removeRoleMutation.mutate(role.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2">
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Adicionar papel para {user.full_name || user.email}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {ROLES.map(role => (
                                      <Button
                                        key={role.value}
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => addRoleMutation.mutate({ userId: user.id, role: role.value })}
                                        disabled={getUserRoles(user.id).some(r => r.role === role.value)}
                                      >
                                        <div className={`w-3 h-3 rounded-full ${role.color} mr-2`} />
                                        {role.label}
                                      </Button>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {getUserEmpresas(user.id).map(ue => {
                                const empresa = empresas.find(e => e.id === ue.empresa_id);
                                return (
                                  <Badge key={ue.id} variant="outline" className="gap-1">
                                    {empresa?.nome || 'N/A'}
                                    {ue.is_owner && <span className="text-primary">★</span>}
                                    <button onClick={() => removeUserEmpresaMutation.mutate(ue.id)}>
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2">
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Associar empresa a {user.full_name || user.email}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {empresas
                                      .filter(e => !getUserEmpresas(user.id).some(ue => ue.empresa_id === e.id))
                                      .map(empresa => (
                                        <Button
                                          key={empresa.id}
                                          variant="outline"
                                          className="w-full justify-start"
                                          onClick={() => addUserEmpresaMutation.mutate({ 
                                            userId: user.id, 
                                            empresaId: empresa.id, 
                                            isOwner: false 
                                          })}
                                        >
                                          <Building2 className="w-4 h-4 mr-2" />
                                          {empresa.nome}
                                        </Button>
                                      ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Empresas Tab */}
          <TabsContent value="empresas">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Empresas</CardTitle>
                  <CardDescription>Gerencie as empresas do sistema</CardDescription>
                </div>
                <Dialog open={isAddingEmpresa} onOpenChange={setIsAddingEmpresa}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" /> Nova Empresa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Empresa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={newEmpresa.nome}
                          onChange={(e) => setNewEmpresa(prev => ({ ...prev, nome: e.target.value }))}
                          placeholder="Nome da empresa"
                        />
                      </div>
                      <div>
                        <Label>CNPJ</Label>
                        <Input
                          value={newEmpresa.cnpj}
                          onChange={(e) => setNewEmpresa(prev => ({ ...prev, cnpj: e.target.value }))}
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={newEmpresa.email}
                          onChange={(e) => setNewEmpresa(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="contato@empresa.com"
                        />
                      </div>
                      <Button 
                        onClick={() => addEmpresaMutation.mutate(newEmpresa)}
                        disabled={!newEmpresa.nome || addEmpresaMutation.isPending}
                        className="w-full"
                      >
                        {addEmpresaMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Criar Empresa
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {empresasLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Usuários</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empresas.map((empresa) => {
                        const empresaUsers = allUserEmpresas.filter(ue => ue.empresa_id === empresa.id);
                        return (
                          <TableRow key={empresa.id}>
                            <TableCell className="font-medium">{empresa.nome}</TableCell>
                            <TableCell>{empresa.cnpj || '-'}</TableCell>
                            <TableCell>{empresa.email || '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {empresaUsers.map(ue => {
                                  const user = users.find(u => u.id === ue.user_id);
                                  return (
                                    <Badge key={ue.id} variant="secondary">
                                      {user?.full_name || user?.email || 'N/A'}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Permissões por Módulo</CardTitle>
                <CardDescription>Configure permissões granulares para cada usuário</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {users.map(user => (
                    <div key={user.id} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{user.full_name || user.email}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex gap-1">
                          {getUserRoles(user.id).map(role => (
                            <Badge key={role.id} className={ROLES.find(r => r.value === role.role)?.color}>
                              {ROLES.find(r => r.value === role.role)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {MODULES.map(module => {
                          const userModulePermissions = getUserPermissions(user.id).filter(p => p.module === module.value);
                          
                          return (
                            <div key={module.value} className="bg-muted/30 rounded-lg p-3 space-y-2">
                              <h4 className="font-medium text-sm text-foreground">{module.label}</h4>
                              <div className="space-y-1">
                                {PERMISSIONS.map(perm => {
                                  const hasPermission = userModulePermissions.some(p => p.permission === perm.value);
                                  
                                  return (
                                    <div key={perm.value} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`${user.id}-${module.value}-${perm.value}`}
                                        checked={hasPermission}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            addPermissionMutation.mutate({
                                              user_id: user.id,
                                              empresa_id: null,
                                              module: module.value,
                                              permission: perm.value,
                                              is_pro_mode: false
                                            });
                                          } else {
                                            const permission = userModulePermissions.find(p => p.permission === perm.value);
                                            if (permission) {
                                              removePermissionMutation.mutate(permission.id);
                                            }
                                          }
                                        }}
                                      />
                                      <Label 
                                        htmlFor={`${user.id}-${module.value}-${perm.value}`}
                                        className="text-xs text-muted-foreground cursor-pointer"
                                      >
                                        {perm.label}
                                      </Label>
                                    </div>
                                  );
                                })}
                                <div className="flex items-center gap-2 pt-1 border-t border-border/50 mt-2">
                                  <Checkbox
                                    id={`${user.id}-${module.value}-pro`}
                                    checked={userModulePermissions.some(p => p.is_pro_mode)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        addPermissionMutation.mutate({
                                          user_id: user.id,
                                          empresa_id: null,
                                          module: module.value,
                                          permission: 'view',
                                          is_pro_mode: true
                                        });
                                      } else {
                                        const permission = userModulePermissions.find(p => p.is_pro_mode);
                                        if (permission) {
                                          removePermissionMutation.mutate(permission.id);
                                        }
                                      }
                                    }}
                                  />
                                  <Label 
                                    htmlFor={`${user.id}-${module.value}-pro`}
                                    className="text-xs text-primary font-medium cursor-pointer"
                                  >
                                    Modo Pro
                                  </Label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
