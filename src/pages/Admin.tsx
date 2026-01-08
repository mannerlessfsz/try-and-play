import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncMissingProfiles } from '@/hooks/useSyncProfiles';
import { useModulePermissions, AppModule, PermissionType, AppRole } from '@/hooks/useModulePermissions';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { EmpresaWizard } from '@/components/admin/EmpresaWizard';
import { EmpresaUsersManager } from '@/components/admin/EmpresaUsersManager';
import { EmpresaContatosManager } from '@/components/admin/EmpresaContatosManager';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import SystemArchitectureViewer from '@/components/admin/SystemArchitectureViewer';
import { CreationEditionManager } from '@/components/admin/CreationEditionManager';
import { UserPermissionsManager } from '@/components/admin/UserPermissionsManager';

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
  Settings,
  CreditCard,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Crown,
  LayoutDashboard,
  History,
  Workflow,
  Pencil,
  RotateCcw,
} from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  ativo: boolean;
}

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  manager_id: string | null;
  regime_tributario: 'nano_empreendedor' | 'mei' | 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | null;
  ativo: boolean;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

interface UserEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  is_owner: boolean;
}

interface EmpresaModulo {
  id: string;
  empresa_id: string;
  modulo: AppModule;
  modo: string;
  ativo: boolean;
}

interface ContaBancaria {
  id: string;
  empresa_id: string;
  nome: string;
  banco: string;
  agencia: string | null;
  conta: string | null;
  tipo: string;
  ativo: boolean;
}

// ID do usuário master - nunca pode ter suas permissões alteradas
const MASTER_USER_ID = 'ea1c9a69-e436-4de2-953b-432e5fff60ae';

const ROLES: { value: AppRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Administrador', color: 'bg-red-500' },
  { value: 'manager', label: 'Gerente', color: 'bg-yellow-500' },
  { value: 'user', label: 'Usuário', color: 'bg-blue-500' }
];

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useModulePermissions();
  const [isAddingEmpresa, setIsAddingEmpresa] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '' });
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editUserForm, setEditUserForm] = useState({ full_name: '', email: '' });

  // Fetch all users (includes automatic sync of missing profiles)
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // First, sync any missing profiles from auth.users
      await syncMissingProfiles();
      
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data as Profile[];
    }
  });

  // Fetch all empresas via secure RPC (admins see full data)
  const { data: empresas = [], isLoading: empresasLoading } = useQuery({
    queryKey: ['admin-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_empresas_safe');
      if (error) throw error;
      return (data || []) as Empresa[];
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

  // Fetch user-empresa associations
  const { data: allUserEmpresas = [] } = useQuery({
    queryKey: ['admin-all-user-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_empresas').select('*');
      if (error) throw error;
      return data as UserEmpresa[];
    }
  });

  // Fetch empresa modulos
  const { data: empresaModulos = [] } = useQuery({
    queryKey: ['admin-empresa-modulos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresa_modulos').select('*');
      if (error) throw error;
      return data as EmpresaModulo[];
    }
  });

  // Fetch contas bancarias
  const { data: contasBancarias = [] } = useQuery({
    queryKey: ['admin-contas-bancarias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contas_bancarias').select('*');
      if (error) throw error;
      return data as ContaBancaria[];
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

  // Remove role mutation (protected for master user)
  const removeRoleMutation = useMutation({
    mutationFn: async ({ roleId, userId }: { roleId: string; userId: string }) => {
      if (userId === MASTER_USER_ID) {
        throw new Error('Não é possível remover papéis do usuário master');
      }
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] });
      toast({ title: 'Papel removido' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
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

  // Create new user mutation with email validation
  const createUserMutation = useMutation({
    mutationFn: async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
      // Check if email already exists
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        throw new Error('Este e-mail já está cadastrado no sistema');
      }
      
      // Store current master session BEFORE creating new user
      const { data: currentSession } = await supabase.auth.getSession();
      const masterSession = currentSession?.session;
      
      if (!masterSession) {
        throw new Error('Sessão do usuário master não encontrada. Faça login novamente.');
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName }
        }
      });
      if (error) throw error;
      
      // IMMEDIATELY restore master session
      await supabase.auth.setSession({
        access_token: masterSession.access_token,
        refresh_token: masterSession.refresh_token,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsAddingUser(false);
      setNewUser({ email: '', password: '', fullName: '' });
      toast({ title: 'Usuário criado com sucesso', description: 'O usuário pode fazer login agora.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
    }
  });

  // Toggle user active status
  const toggleUserActiveMutation = useMutation({
    mutationFn: async ({ userId, ativo }: { userId: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: ativo ? 'Usuário ativado' : 'Usuário inativado' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });

  // Update user profile mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, full_name, email }: { userId: string; full_name: string; email: string }) => {
      // Check for duplicate email (excluding current user)
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== userId);
      if (existingUser) {
        throw new Error('Este e-mail já está em uso por outro usuário');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ full_name, email })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
      setEditUserForm({ full_name: '', email: '' });
      toast({ title: 'Usuário atualizado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar usuário', description: error.message, variant: 'destructive' });
    }
  });

  // Update empresa mutation
  const updateEmpresaMutation = useMutation({
    mutationFn: async (empresa: Empresa) => {
      const { data, error } = await supabase.from('empresas').update({
        nome: empresa.nome,
        cnpj: empresa.cnpj,
        email: empresa.email,
        telefone: empresa.telefone,
      }).eq('id', empresa.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      setEditingEmpresa(null);
      toast({ title: 'Empresa atualizada com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar empresa', description: error.message, variant: 'destructive' });
    }
  });

  // Inactivate empresa mutation (soft delete)
  const deleteEmpresaMutation = useMutation({
    mutationFn: async (empresaId: string) => {
      const { error } = await supabase
        .from('empresas')
        .update({ ativo: false })
        .eq('id', empresaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      toast({ title: 'Empresa inativada', description: 'Todos os acessos foram revogados automaticamente.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao inativar empresa', description: error.message, variant: 'destructive' });
    }
  });

  // Reactivate empresa mutation
  const reactivateEmpresaMutation = useMutation({
    mutationFn: async (empresaId: string) => {
      const { error } = await supabase
        .from('empresas')
        .update({ ativo: true })
        .eq('id', empresaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      toast({ title: 'Empresa reativada', description: 'Reconfigure os módulos e permissões conforme necessário.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao reativar empresa', description: error.message, variant: 'destructive' });
    }
  });

  // Delete conta bancaria mutation
  const deleteContaMutation = useMutation({
    mutationFn: async (contaId: string) => {
      const { error } = await supabase.from('contas_bancarias').delete().eq('id', contaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contas-bancarias'] });
      toast({ title: 'Conta bancária removida' });
    }
  });

  const getUserRoles = (userId: string) => allRoles.filter(r => r.user_id === userId);
  const getUserEmpresas = (userId: string) => allUserEmpresas.filter(ue => ue.user_id === userId);
  const getEmpresaModulos = (empresaId: string) => empresaModulos.filter(m => m.empresa_id === empresaId);
  const getEmpresaContas = (empresaId: string) => contasBancarias.filter(c => c.empresa_id === empresaId);
  const getManagerUser = (managerId: string | null) => users.find(u => u.id === managerId);

  const handleWizardSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
    queryClient.invalidateQueries({ queryKey: ['admin-empresa-modulos'] });
    queryClient.invalidateQueries({ queryKey: ['admin-contas-bancarias'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] });
    queryClient.invalidateQueries({ queryKey: ['admin-all-user-empresas'] });
  };

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
              <p className="text-sm text-muted-foreground">Gerenciar usuários e empresas</p>
            </div>
          </div>
          <Settings className="w-6 h-6 text-primary" />
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="empresas" className="gap-2">
              <Building2 className="w-4 h-4" /> Empresas
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="w-4 h-4" /> Auditoria
            </TabsTrigger>
            <TabsTrigger value="architecture" className="gap-2">
              <Workflow className="w-4 h-4" /> Arquitetura
            </TabsTrigger>
            <TabsTrigger value="creation" className="gap-2">
              <Pencil className="w-4 h-4" /> Criação/Edição
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Usuários do Sistema</CardTitle>
                  <CardDescription>Gerencie papéis e acessos de cada usuário</CardDescription>
                </div>
                <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="w-4 h-4" /> Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome Completo</Label>
                        <Input
                          value={newUser.fullName}
                          onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                          placeholder="Nome do usuário"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div>
                        <Label>Senha</Label>
                        <Input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                      <Button 
                        onClick={() => createUserMutation.mutate(newUser)}
                        disabled={!newUser.email || !newUser.password || newUser.password.length < 6 || createUserMutation.isPending}
                        className="w-full"
                      >
                        {createUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Criar Usuário
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Edit User Dialog */}
                <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Usuário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome Completo</Label>
                        <Input
                          value={editUserForm.full_name}
                          onChange={(e) => setEditUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="Nome do usuário"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={editUserForm.email}
                          onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => setEditingUser(null)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={() => editingUser && updateUserMutation.mutate({ 
                            userId: editingUser.id, 
                            full_name: editUserForm.full_name,
                            email: editUserForm.email 
                          })}
                          disabled={!editUserForm.email || updateUserMutation.isPending}
                          className="flex-1"
                        >
                          {updateUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Papéis</TableHead>
                        <TableHead>Empresas</TableHead>
                        <TableHead>Permissões</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className={`${user.id === MASTER_USER_ID ? 'bg-yellow-500/10' : ''} ${!user.ativo ? 'opacity-50' : ''}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {user.full_name || '-'}
                              {user.id === MASTER_USER_ID && (
                                <Badge variant="outline" className="gap-1 text-yellow-500 border-yellow-500">
                                  <Crown className="w-3 h-3" /> Master
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={user.ativo}
                                onCheckedChange={(checked) => {
                                  if (user.id === MASTER_USER_ID) {
                                    toast({ title: 'Erro', description: 'Não é possível inativar o usuário master', variant: 'destructive' });
                                    return;
                                  }
                                  toggleUserActiveMutation.mutate({ userId: user.id, ativo: checked });
                                }}
                                disabled={user.id === MASTER_USER_ID || toggleUserActiveMutation.isPending}
                              />
                              <Badge variant={user.ativo ? 'default' : 'secondary'}>
                                {user.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {getUserRoles(user.id).map(role => (
                                <Badge key={role.id} variant="secondary" className="gap-1">
                                  {ROLES.find(r => r.value === role.role)?.label}
                                  {user.id !== MASTER_USER_ID && (
                                    <button onClick={() => removeRoleMutation.mutate({ roleId: role.id, userId: user.id })}>
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  {user.id === MASTER_USER_ID && <Crown className="w-3 h-3 text-yellow-500" />}
                                </Badge>
                              ))}
                              {user.id !== MASTER_USER_ID && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 px-2">
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Adicionar Papel - {user.full_name || user.email}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      {ROLES.filter(r => !getUserRoles(user.id).some(ur => ur.role === r.value)).map(role => (
                                        <Button
                                          key={role.value}
                                          variant="outline"
                                          className="w-full justify-start"
                                          onClick={() => addRoleMutation.mutate({ userId: user.id, role: role.value })}
                                        >
                                          <Badge className={role.color + ' mr-2'}>{role.label}</Badge>
                                        </Button>
                                      ))}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
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
                          <TableCell>
                            <UserPermissionsManager
                              userId={user.id}
                              userName={user.full_name || user.email}
                              isMaster={user.id === MASTER_USER_ID}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setEditUserForm({ full_name: user.full_name || '', email: user.email });
                              }}
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
                  <CardTitle>Empresas Cadastradas</CardTitle>
                  <CardDescription>Gerenciar empresas e seus usuários</CardDescription>
                </div>
                <Button className="gap-2" onClick={() => setIsAddingEmpresa(true)}>
                  <Plus className="w-4 h-4" /> Nova Empresa
                </Button>
                <EmpresaWizard isOpen={isAddingEmpresa} onClose={() => setIsAddingEmpresa(false)} onSuccess={handleWizardSuccess} />

                {editingEmpresa && (
                  <EmpresaWizard 
                    isOpen={!!editingEmpresa}
                    editingEmpresa={editingEmpresa} 
                    onClose={() => setEditingEmpresa(null)} 
                    onSuccess={handleWizardSuccess} 
                  />
                )}
              </CardHeader>
              <CardContent>
                {empresasLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {empresas.map(empresa => {
                      const modulos = getEmpresaModulos(empresa.id);
                      const contas = getEmpresaContas(empresa.id);
                      const manager = getManagerUser(empresa.manager_id);
                      const isExpanded = expandedEmpresa === empresa.id;
                      
                      return (
                        <Card key={empresa.id} className={`${empresa.ativo ? 'bg-muted/30' : 'bg-muted/10 opacity-60 border-dashed'}`}>
                          <CardContent className="p-4">
                            <div 
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedEmpresa(isExpanded ? null : empresa.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${empresa.ativo ? 'bg-primary/20' : 'bg-muted'}`}>
                                  <Building2 className={`w-5 h-5 ${empresa.ativo ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{empresa.nome}</span>
                                    {!empresa.ativo && (
                                      <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                                        Inativa
                                      </Badge>
                                    )}
                                    {empresa.regime_tributario && (
                                      <Badge variant="outline" className="text-xs">
                                        {empresa.regime_tributario.replace('_', ' ')}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex gap-1 mt-1">
                                    {modulos.filter(m => m.ativo).map(m => (
                                      <Badge 
                                        key={m.id} 
                                        variant="secondary" 
                                        className={`text-xs ${m.modo === 'pro' ? 'bg-primary/20 text-primary' : ''}`}
                                      >
                                        {m.modulo} {m.modo === 'pro' && '★'}
                                      </Badge>
                                    ))}
                                    {!empresa.ativo && modulos.length === 0 && (
                                      <span className="text-xs text-muted-foreground italic">Sem módulos ativos</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {empresa.ativo ? (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8"
                                      onClick={(e) => { e.stopPropagation(); setEditingEmpresa(empresa); }}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Deseja inativar a empresa ${empresa.nome}? Todos os acessos serão revogados automaticamente.`)) {
                                          deleteEmpresaMutation.mutate(empresa.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Deseja reativar a empresa ${empresa.nome}? Será necessário reconfigurar módulos e permissões.`)) {
                                        reactivateEmpresaMutation.mutate(empresa.id);
                                      }
                                    }}
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Reativar
                                  </Button>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                                {/* Info row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">{empresa.email || 'Não informado'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">{empresa.telefone || 'Não informado'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                    <span className="text-muted-foreground">
                                      {manager ? manager.full_name || manager.email : 'Sem gerente'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">{contas.length} conta(s)</span>
                                  </div>
                                </div>

                                {/* Contas bancárias */}
                                {contas.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Contas Bancárias:</p>
                                    <div className="space-y-1">
                                      {contas.map(conta => (
                                        <div key={conta.id} className="flex items-center justify-between text-sm bg-muted/20 p-2 rounded">
                                          <span>{conta.nome} - {conta.banco}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs">
                                              {conta.agencia && conta.conta ? `${conta.agencia}/${conta.conta}` : 'Dados incompletos'}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-destructive"
                                              onClick={() => deleteContaMutation.mutate(conta.id)}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Contatos da empresa */}
                                <div className="pt-2">
                                  <EmpresaContatosManager empresaId={empresa.id} />
                                </div>

                                {/* Usuários vinculados */}
                                <div className="pt-2">
                                  <EmpresaUsersManager 
                                    empresaId={empresa.id} 
                                    empresaNome={empresa.nome} 
                                  />
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit">
            <AuditLogViewer />
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture">
            <SystemArchitectureViewer />
          </TabsContent>

          {/* Creation/Edition Tab */}
          <TabsContent value="creation">
            <CreationEditionManager />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
