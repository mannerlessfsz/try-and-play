import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncMissingProfiles } from '@/hooks/useSyncProfiles';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { EmpresaWizard } from '@/components/admin/EmpresaWizard';
import { EmpresaUsersManager } from '@/components/admin/EmpresaUsersManager';
import { PermissionProfilesManager } from '@/components/admin/PermissionProfilesManager';
import { usePermissionProfiles } from '@/hooks/usePermissionProfiles';
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
  UserCog,
  Layers
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

const MODULES: { value: AppModule; label: string }[] = [
  { value: 'taskvault', label: 'TaskVault' },
  { value: 'financialace', label: 'FinancialACE' },
  { value: 'erp', label: 'ERP/Gestão' },
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

// Componente inline para aplicar perfis de permissão
interface ApplyProfileInlineProps {
  userId: string;
  userEmpresas: UserEmpresa[];
  empresas: Empresa[];
}

function ApplyProfileInline({ userId, userEmpresas, empresas }: ApplyProfileInlineProps) {
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(userEmpresas[0]?.empresa_id || '');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const { profiles, applyProfileToUser, isApplying } = usePermissionProfiles();

  const activeProfiles = profiles.filter(p => p.ativo);
  const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId);

  const handleApply = () => {
    if (!selectedProfileId || !selectedEmpresaId) return;
    applyProfileToUser({
      profileId: selectedProfileId,
      userId,
      empresaId: selectedEmpresaId,
      assignRole: true,
    });
    setSelectedProfileId('');
  };

  return (
    <div className="space-y-4">
      {userEmpresas.length > 1 && (
        <div className="space-y-2">
          <Label>Empresa</Label>
          <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {userEmpresas.map(ue => {
                const emp = empresas.find(e => e.id === ue.empresa_id);
                return (
                  <SelectItem key={ue.empresa_id} value={ue.empresa_id}>
                    {emp?.nome || 'Empresa desconhecida'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {userEmpresas.length === 1 && (
        <div className="text-sm text-muted-foreground">
          Empresa: <span className="font-medium">{selectedEmpresa?.nome}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label>Perfil de Permissões</Label>
        {activeProfiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum perfil disponível. Crie perfis na aba "Perfis".</p>
        ) : (
          <div className="space-y-2">
            {activeProfiles.map(profile => (
              <Button
                key={profile.id}
                variant={selectedProfileId === profile.id ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setSelectedProfileId(profile.id)}
              >
                <Layers className="w-4 h-4 mr-2" />
                <div className="flex flex-col items-start">
                  <span>{profile.nome}</span>
                  {profile.role_padrao && (
                    <span className="text-xs opacity-70">Role: {profile.role_padrao}</span>
                  )}
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>

      {selectedProfileId && (
        <Button 
          onClick={handleApply} 
          disabled={isApplying || !selectedEmpresaId}
          className="w-full"
        >
          {isApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Aplicar Perfil
        </Button>
      )}
    </div>
  );
}

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
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

  // Create new user mutation with email validation
  const createUserMutation = useMutation({
    mutationFn: async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
      // Check if email already exists
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        throw new Error('Este e-mail já está cadastrado no sistema');
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      if (error) throw error;
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

  // Delete empresa mutation
  const deleteEmpresaMutation = useMutation({
    mutationFn: async (empresaId: string) => {
      const { error } = await supabase.from('empresas').delete().eq('id', empresaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      toast({ title: 'Empresa removida' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover empresa', description: error.message, variant: 'destructive' });
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
  const getUserPermissions = (userId: string) => allPermissions.filter(p => p.user_id === userId);
  const getUserEmpresas = (userId: string) => allUserEmpresas.filter(ue => ue.user_id === userId);
  const getEmpresaUsers = (empresaId: string) => allUserEmpresas.filter(ue => ue.empresa_id === empresaId);
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
    queryClient.invalidateQueries({ queryKey: ['admin-all-permissions'] });
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
              <p className="text-sm text-muted-foreground">Gerenciar usuários, empresas e permissões</p>
            </div>
          </div>
          <Settings className="w-6 h-6 text-primary" />
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="empresas" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="empresas" className="gap-2">
              <Building2 className="w-4 h-4" /> Empresas
            </TabsTrigger>
            <TabsTrigger value="profiles" className="gap-2">
              <Layers className="w-4 h-4" /> Perfis
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="w-4 h-4" /> Permissões
            </TabsTrigger>
          </TabsList>

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
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2">
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Aplicar Perfil - {user.full_name || user.email}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 mt-2">
                                    <p className="text-sm text-muted-foreground">
                                      Selecione um perfil para aplicar permissões e role ao usuário.
                                    </p>
                                    {getUserEmpresas(user.id).length === 0 ? (
                                      <p className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                                        Este usuário não está vinculado a nenhuma empresa. Vincule-o primeiro para aplicar perfis.
                                      </p>
                                    ) : (
                                      <ApplyProfileInline
                                        userId={user.id}
                                        userEmpresas={getUserEmpresas(user.id)}
                                        empresas={empresas}
                                      />
                                    )}
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
                              onClick={() => {
                                setEditingUser(user);
                                setEditUserForm({ full_name: user.full_name || '', email: user.email });
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Shield className="w-4 h-4" />
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
                <Button className="gap-2" onClick={() => setIsAddingEmpresa(true)}>
                  <Plus className="w-4 h-4" /> Nova Empresa
                </Button>
                <EmpresaWizard 
                  isOpen={isAddingEmpresa} 
                  onClose={() => setIsAddingEmpresa(false)}
                  onSuccess={handleWizardSuccess}
                />
              </CardHeader>
              <CardContent>
                {empresasLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : empresas.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
                    <Button onClick={() => setIsAddingEmpresa(true)} className="mt-4">
                      <Plus className="w-4 h-4 mr-2" /> Cadastrar Primeira Empresa
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {empresas.map((empresa) => {
                      const empresaUsers = getEmpresaUsers(empresa.id);
                      const modulos = getEmpresaModulos(empresa.id);
                      const contas = getEmpresaContas(empresa.id);
                      const manager = getManagerUser(empresa.manager_id);
                      const isExpanded = expandedEmpresa === empresa.id;

                      return (
                        <Card key={empresa.id} className="bg-muted/30 border-border/50 hover:border-primary/50 transition-all">
                          <CardContent className="p-4">
                            <div 
                              className="flex items-start justify-between cursor-pointer"
                              onClick={() => setExpandedEmpresa(isExpanded ? null : empresa.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-foreground">{empresa.nome}</h3>
                                  <p className="text-xs text-muted-foreground">{empresa.cnpj || 'CNPJ não informado'}</p>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {modulos.map(m => (
                                      <Badge 
                                        key={m.id} 
                                        variant={m.modo === 'pro' ? 'default' : 'secondary'} 
                                        className="text-[10px] h-5"
                                      >
                                        {m.modulo} {m.modo === 'pro' && '★'}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
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
                                    if (confirm(`Deseja remover a empresa ${empresa.nome}?`)) {
                                      deleteEmpresaMutation.mutate(empresa.id);
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

                                {/* Usuários vinculados com gerenciamento completo */}
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

                {/* Edit Empresa Dialog */}
                <Dialog open={!!editingEmpresa} onOpenChange={(open) => !open && setEditingEmpresa(null)}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Editar Empresa</DialogTitle>
                    </DialogHeader>
                    {editingEmpresa && (
                      <div className="space-y-4">
                        <div>
                          <Label>Razão Social</Label>
                          <Input
                            value={editingEmpresa.nome}
                            onChange={(e) => setEditingEmpresa(prev => prev ? { ...prev, nome: e.target.value } : null)}
                            placeholder="Nome da empresa"
                          />
                        </div>
                        <div>
                          <Label>CNPJ</Label>
                          <Input
                            value={editingEmpresa.cnpj || ''}
                            onChange={(e) => setEditingEmpresa(prev => prev ? { ...prev, cnpj: e.target.value } : null)}
                            placeholder="00.000.000/0000-00"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            value={editingEmpresa.email || ''}
                            onChange={(e) => setEditingEmpresa(prev => prev ? { ...prev, email: e.target.value } : null)}
                            placeholder="contato@empresa.com"
                          />
                        </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input
                            value={editingEmpresa.telefone || ''}
                            onChange={(e) => setEditingEmpresa(prev => prev ? { ...prev, telefone: e.target.value } : null)}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <Button 
                          onClick={() => editingEmpresa && updateEmpresaMutation.mutate(editingEmpresa)}
                          disabled={!editingEmpresa.nome || updateEmpresaMutation.isPending}
                          className="w-full"
                        >
                          {updateEmpresaMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Salvar Alterações
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permission Profiles Tab */}
          <TabsContent value="profiles">
            <PermissionProfilesManager />
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
