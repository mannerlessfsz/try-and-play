/**
 * Página dedicada para gestão de usuários e permissões
 * Apenas admins podem acessar
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModulePermissions, useManageModulePermissions } from '@/hooks/useModulePermissions';
import { syncMissingProfiles } from '@/hooks/useSyncProfiles';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, UserPlus, Shield, Settings, Search, 
  Loader2, CheckCircle, XCircle, ArrowLeft, Zap,
  Eye, EyeOff, Mail, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APP_MODULES, AppModule } from '@/constants/modules';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  ativo: boolean;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface ModulePermission {
  id: string;
  user_id: string;
  empresa_id: string | null;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  is_pro_mode: boolean;
}

// Módulos ativos
const ACTIVE_MODULES = APP_MODULES.filter(m => 
  !['financialace', 'erp', 'ajustasped', 'conferesped'].includes(m.value)
);

export default function UsuariosAdmin() {
  const { user } = useAuth();
  const { isAdmin, loading: permissionsLoading } = useModulePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);

  // Form state for new user
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fetch users
  const { data: profiles = [], isLoading: loadingProfiles, refetch } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      // Sync missing profiles first
      await syncMissingProfiles();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ['admin-users-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: isAdmin,
  });

  // Use centralized hook for managing permissions
  const { 
    permissions: userPermissions, 
    isLoading: loadingPermissions, 
    grantPermission,
    isUpdating: updatePermissionPending 
  } = useManageModulePermissions(selectedUser?.id, null);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      // Call RPC to create user (using any cast due to types being auto-generated)
      const { data, error } = await supabase.rpc('create_user_by_admin' as any, {
        p_email: newUserEmail.trim().toLowerCase(),
        p_password: newUserPassword,
        p_full_name: newUserName.trim() || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Usuário criado com sucesso!' });
      setShowCreateDialog(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
    },
  });


  // Filter users by search
  const filteredProfiles = profiles.filter(p => 
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const getUserRole = (userId: string): string | null => {
    const userRole = roles.find(r => r.user_id === userId);
    return userRole?.role || null;
  };

  const getUserPermission = (module: string): ModulePermission | undefined => {
    return userPermissions.find(p => p.module === module);
  };

  const toggleModuleAccess = (module: string, action: keyof ModulePermission) => {
    if (!selectedUser) return;
    const existing = getUserPermission(module);
    const newValue = !(existing?.[action] ?? false);
    
    grantPermission({
      user_id: selectedUser.id,
      module,
      empresa_id: null,
      can_view: action === 'can_view' ? newValue : existing?.can_view ?? false,
      can_create: action === 'can_create' ? newValue : existing?.can_create ?? false,
      can_edit: action === 'can_edit' ? newValue : existing?.can_edit ?? false,
      can_delete: action === 'can_delete' ? newValue : existing?.can_delete ?? false,
      can_export: action === 'can_export' ? newValue : existing?.can_export ?? false,
      is_pro_mode: action === 'is_pro_mode' ? newValue : existing?.is_pro_mode ?? false,
      // If disabling view, disable all
      ...(action === 'can_view' && !newValue ? {
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_export: false,
      } : {}),
    });
  };

  const grantFullAccess = (module: string) => {
    if (!selectedUser) return;
    grantPermission({
      user_id: selectedUser.id,
      module,
      empresa_id: null,
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
      can_export: true,
      is_pro_mode: true,
    });
  };

  const revokeAllAccess = (module: string) => {
    if (!selectedUser) return;
    grantPermission({
      user_id: selectedUser.id,
      module,
      empresa_id: null,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_export: false,
      is_pro_mode: false,
    });
  };

  if (permissionsLoading || loadingProfiles) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="w-16 h-16 mx-auto text-destructive" />
              <h2 className="text-xl font-bold">Acesso Negado</h2>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar esta página.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Gestão de Usuários</h1>
                  <p className="text-sm text-muted-foreground">Cadastro e permissões por módulo</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Search and Stats */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {profiles.length} usuários
          </Badge>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
            <CardDescription>
              Gerencie usuários e suas permissões de acesso aos módulos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => {
                    const role = getUserRole(profile.id);
                    return (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{profile.full_name || 'Sem nome'}</p>
                              <p className="text-sm text-muted-foreground">{profile.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {profile.ativo ? (
                            <Badge variant="default" className="gap-1 bg-green-500">
                              <CheckCircle className="w-3 h-3" /> Ativo
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3 h-3" /> Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {role === 'admin' && (
                            <Badge className="bg-red-500">Administrador</Badge>
                          )}
                          {role === 'manager' && (
                            <Badge className="bg-yellow-500">Gerente</Badge>
                          )}
                          {role === 'user' && (
                            <Badge variant="secondary">Usuário</Badge>
                          )}
                          {!role && (
                            <Badge variant="outline">Sem papel</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setSelectedUser(profile);
                              setShowPermissionsDialog(true);
                            }}
                          >
                            <Settings className="w-4 h-4" />
                            Permissões
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProfiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {search ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Criar Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                placeholder="Nome do usuário"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createUserMutation.mutate()}
              disabled={!newUserEmail || !newUserPassword || newUserPassword.length < 6 || createUserMutation.isPending}
            >
              {createUserMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permissões de {selectedUser?.full_name || selectedUser?.email}
            </DialogTitle>
          </DialogHeader>
          
          {loadingPermissions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {ACTIVE_MODULES.map((module) => {
                  const perm = getUserPermission(module.value);
                  const hasAccess = perm?.can_view ?? false;
                  
                  return (
                    <Card key={module.value} className={!hasAccess ? 'opacity-60' : ''}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${module.color} bg-opacity-20`}>
                              <Shield className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{module.label}</CardTitle>
                              <CardDescription className="text-xs">{module.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => grantFullAccess(module.value)}
                              disabled={updatePermissionPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Liberar Tudo
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeAllAccess(module.value)}
                              disabled={updatePermissionPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Revogar
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 border-t">
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${module.value}-view`}
                              checked={perm?.can_view ?? false}
                              onCheckedChange={() => toggleModuleAccess(module.value, 'can_view')}
                              disabled={updatePermissionPending}
                            />
                            <Label htmlFor={`${module.value}-view`} className="text-xs">Ver</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${module.value}-create`}
                              checked={perm?.can_create ?? false}
                              onCheckedChange={() => toggleModuleAccess(module.value, 'can_create')}
                              disabled={!hasAccess || updatePermissionPending}
                            />
                            <Label htmlFor={`${module.value}-create`} className="text-xs">Criar</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${module.value}-edit`}
                              checked={perm?.can_edit ?? false}
                              onCheckedChange={() => toggleModuleAccess(module.value, 'can_edit')}
                              disabled={!hasAccess || updatePermissionPending}
                            />
                            <Label htmlFor={`${module.value}-edit`} className="text-xs">Editar</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${module.value}-delete`}
                              checked={perm?.can_delete ?? false}
                              onCheckedChange={() => toggleModuleAccess(module.value, 'can_delete')}
                              disabled={!hasAccess || updatePermissionPending}
                            />
                            <Label htmlFor={`${module.value}-delete`} className="text-xs">Excluir</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${module.value}-export`}
                              checked={perm?.can_export ?? false}
                              onCheckedChange={() => toggleModuleAccess(module.value, 'can_export')}
                              disabled={!hasAccess || updatePermissionPending}
                            />
                            <Label htmlFor={`${module.value}-export`} className="text-xs">Exportar</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${module.value}-pro`}
                              checked={perm?.is_pro_mode ?? false}
                              onCheckedChange={() => toggleModuleAccess(module.value, 'is_pro_mode')}
                              disabled={!hasAccess || updatePermissionPending}
                            />
                            <Label htmlFor={`${module.value}-pro`} className="text-xs flex items-center gap-1">
                              <Zap className="w-3 h-3" /> Pro
                            </Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
