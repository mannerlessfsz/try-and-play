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
import { Switch } from '@/components/ui/switch';
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
  Settings,
  CreditCard,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Crown
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

interface NovaEmpresa {
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  modulos: { modulo: AppModule; ativo: boolean; modo: 'basico' | 'pro' }[];
  contas: { nome: string; banco: string; agencia: string; conta: string; tipo: 'corrente' | 'poupanca' | 'investimento' }[];
  gerente: { email: string; password: string; fullName: string };
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

const BANCOS = [
  'Banco do Brasil', 'Bradesco', 'Itaú', 'Santander', 'Caixa', 
  'Nubank', 'Inter', 'C6 Bank', 'Sicredi', 'Sicoob', 'Outro'
];

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
  
  const [novaEmpresa, setNovaEmpresa] = useState<NovaEmpresa>({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    modulos: MODULES.map(m => ({ modulo: m.value, ativo: false, modo: 'basico' as const })),
    contas: [],
    gerente: { email: '', password: '', fullName: '' }
  });

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

  // Create empresa mutation (complete with modules, accounts, and manager)
  const createEmpresaMutation = useMutation({
    mutationFn: async (empresa: NovaEmpresa) => {
      // 1. Create manager user first if provided
      let managerId: string | null = null;
      
      if (empresa.gerente.email && empresa.gerente.password) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: empresa.gerente.email,
          password: empresa.gerente.password,
          options: {
            data: { full_name: empresa.gerente.fullName }
          }
        });
        if (authError) throw new Error(`Erro ao criar gerente: ${authError.message}`);
        managerId = authData.user?.id || null;
        
        // Add manager role
        if (managerId) {
          await supabase.from('user_roles').insert({ user_id: managerId, role: 'manager' });
        }
      }

      // 2. Create empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nome: empresa.nome,
          cnpj: empresa.cnpj || null,
          email: empresa.email || null,
          telefone: empresa.telefone || null,
          manager_id: managerId,
        })
        .select()
        .single();

      if (empresaError) throw empresaError;

      // 3. Link manager to empresa
      if (managerId) {
        await supabase.from('user_empresas').insert({
          user_id: managerId,
          empresa_id: empresaData.id,
          is_owner: true
        });

        // Grant all permissions to manager for active modules
        const activeModules = empresa.modulos.filter(m => m.ativo);
        for (const mod of activeModules) {
          for (const perm of PERMISSIONS) {
            await supabase.from('user_permissions').insert({
              user_id: managerId,
              empresa_id: empresaData.id,
              module: mod.modulo,
              permission: perm.value,
              is_pro_mode: mod.modo === 'pro'
            });
          }
        }
      }

      // 4. Create modulos
      const modulosAtivos = empresa.modulos.filter(m => m.ativo);
      if (modulosAtivos.length > 0) {
        const { error: modulosError } = await supabase
          .from('empresa_modulos')
          .insert(modulosAtivos.map(m => ({
            empresa_id: empresaData.id,
            modulo: m.modulo,
            modo: m.modo,
            ativo: true,
          })));
        if (modulosError) throw modulosError;
      }

      // 5. Create bank accounts
      if (empresa.contas.length > 0) {
        const { error: contasError } = await supabase
          .from('contas_bancarias')
          .insert(empresa.contas.map(c => ({
            empresa_id: empresaData.id,
            nome: c.nome,
            banco: c.banco,
            agencia: c.agencia || null,
            conta: c.conta || null,
            tipo: c.tipo,
          })));
        if (contasError) throw contasError;
      }

      return empresaData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-empresa-modulos'] });
      queryClient.invalidateQueries({ queryKey: ['admin-contas-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-user-empresas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-permissions'] });
      setIsAddingEmpresa(false);
      resetNovaEmpresa();
      toast({ title: 'Empresa cadastrada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao cadastrar empresa', description: error.message, variant: 'destructive' });
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

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
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

  const resetNovaEmpresa = () => {
    setNovaEmpresa({
      nome: '',
      cnpj: '',
      email: '',
      telefone: '',
      modulos: MODULES.map(m => ({ modulo: m.value, ativo: false, modo: 'basico' as const })),
      contas: [],
      gerente: { email: '', password: '', fullName: '' }
    });
  };

  const toggleModulo = (moduloId: AppModule) => {
    setNovaEmpresa(prev => ({
      ...prev,
      modulos: prev.modulos.map(m => 
        m.modulo === moduloId ? { ...m, ativo: !m.ativo } : m
      ),
    }));
  };

  const setModuloModo = (moduloId: AppModule, modo: 'basico' | 'pro') => {
    setNovaEmpresa(prev => ({
      ...prev,
      modulos: prev.modulos.map(m => 
        m.modulo === moduloId ? { ...m, modo } : m
      ),
    }));
  };

  const addNovaConta = () => {
    setNovaEmpresa(prev => ({
      ...prev,
      contas: [...prev.contas, { nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente' as const }],
    }));
  };

  const updateConta = (index: number, field: keyof NovaEmpresa['contas'][0], value: string) => {
    setNovaEmpresa(prev => ({
      ...prev,
      contas: prev.contas.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const removeConta = (index: number) => {
    setNovaEmpresa(prev => ({
      ...prev,
      contas: prev.contas.filter((_, i) => i !== index),
    }));
  };

  const hasFinancialActive = novaEmpresa.modulos.some(m => m.modulo === 'financialace' && m.ativo);

  const handleSubmitNovaEmpresa = () => {
    if (!novaEmpresa.nome.trim()) {
      toast({ title: 'Razão Social é obrigatória', variant: 'destructive' });
      return;
    }

    const modulosAtivos = novaEmpresa.modulos.filter(m => m.ativo);
    if (modulosAtivos.length === 0) {
      toast({ title: 'Selecione pelo menos um módulo', variant: 'destructive' });
      return;
    }

    if (hasFinancialActive && novaEmpresa.contas.length === 0) {
      toast({ title: 'Para o FinancialACE, adicione pelo menos uma conta bancária', variant: 'destructive' });
      return;
    }

    if (novaEmpresa.gerente.email && novaEmpresa.gerente.password.length < 6) {
      toast({ title: 'A senha do gerente deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    createEmpresaMutation.mutate(novaEmpresa);
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
                <Dialog open={isAddingEmpresa} onOpenChange={(open) => { setIsAddingEmpresa(open); if (!open) resetNovaEmpresa(); }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" /> Nova Empresa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 mt-4">
                      {/* Dados da Empresa */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold border-b pb-2">Dados da Empresa</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label htmlFor="razaoSocial">Razão Social *</Label>
                            <Input
                              id="razaoSocial"
                              value={novaEmpresa.nome}
                              onChange={(e) => setNovaEmpresa(prev => ({ ...prev, nome: e.target.value }))}
                              placeholder="Nome da empresa"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cnpj">CNPJ</Label>
                            <Input
                              id="cnpj"
                              value={novaEmpresa.cnpj}
                              onChange={(e) => setNovaEmpresa(prev => ({ ...prev, cnpj: e.target.value }))}
                              placeholder="00.000.000/0000-00"
                            />
                          </div>
                          <div>
                            <Label htmlFor="telefone">Telefone</Label>
                            <Input
                              id="telefone"
                              value={novaEmpresa.telefone}
                              onChange={(e) => setNovaEmpresa(prev => ({ ...prev, telefone: e.target.value }))}
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="emailEmpresa">E-mail</Label>
                            <Input
                              id="emailEmpresa"
                              type="email"
                              value={novaEmpresa.email}
                              onChange={(e) => setNovaEmpresa(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="contato@empresa.com"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Módulos */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold border-b pb-2">Módulos *</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {MODULES.map((modulo) => {
                            const config = novaEmpresa.modulos.find(m => m.modulo === modulo.value);
                            const isAtivo = config?.ativo || false;
                            
                            return (
                              <div 
                                key={modulo.value}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                  isAtivo 
                                    ? 'border-primary/50 bg-primary/5' 
                                    : 'border-border/50 bg-muted/20'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={isAtivo}
                                    onCheckedChange={() => toggleModulo(modulo.value)}
                                  />
                                  <span className={`font-medium text-sm ${isAtivo ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {modulo.label}
                                  </span>
                                </div>

                                {isAtivo && (
                                  <Select
                                    value={config?.modo || 'basico'}
                                    onValueChange={(value) => setModuloModo(modulo.value, value as 'basico' | 'pro')}
                                  >
                                    <SelectTrigger className="w-24 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="basico">Básico</SelectItem>
                                      <SelectItem value="pro">Pro</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Contas Bancárias - Only if FinancialACE */}
                      {hasFinancialActive && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="text-sm font-semibold">Contas Bancárias *</h4>
                            <Button type="button" variant="outline" size="sm" onClick={addNovaConta}>
                              <Plus className="w-3 h-3 mr-1" />
                              Adicionar
                            </Button>
                          </div>

                          {novaEmpresa.contas.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
                              Adicione pelo menos uma conta bancária para o módulo FinancialACE
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {novaEmpresa.contas.map((conta, index) => (
                                <div key={index} className="p-3 rounded-lg border border-border/50 bg-muted/10 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">Conta {index + 1}</span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => removeConta(index)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                      <Label className="text-xs">Nome/Apelido</Label>
                                      <Input
                                        value={conta.nome}
                                        onChange={(e) => updateConta(index, 'nome', e.target.value)}
                                        placeholder="Ex: Conta Principal"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Banco</Label>
                                      <Select
                                        value={conta.banco}
                                        onValueChange={(value) => updateConta(index, 'banco', value)}
                                      >
                                        <SelectTrigger className="h-8 text-sm">
                                          <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {BANCOS.map(banco => (
                                            <SelectItem key={banco} value={banco}>{banco}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Tipo</Label>
                                      <Select
                                        value={conta.tipo}
                                        onValueChange={(value) => updateConta(index, 'tipo', value)}
                                      >
                                        <SelectTrigger className="h-8 text-sm">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="corrente">Corrente</SelectItem>
                                          <SelectItem value="poupanca">Poupança</SelectItem>
                                          <SelectItem value="investimento">Investimento</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Agência</Label>
                                      <Input
                                        value={conta.agencia}
                                        onChange={(e) => updateConta(index, 'agencia', e.target.value)}
                                        placeholder="0000"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Conta</Label>
                                      <Input
                                        value={conta.conta}
                                        onChange={(e) => updateConta(index, 'conta', e.target.value)}
                                        placeholder="00000-0"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Usuário Gerente */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold border-b pb-2 flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          Usuário Gerente (Opcional)
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          O gerente terá acesso a todos os módulos da empresa com todas as permissões, mas não poderá alterar a plataforma.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label htmlFor="gerenteNome">Nome Completo</Label>
                            <Input
                              id="gerenteNome"
                              value={novaEmpresa.gerente.fullName}
                              onChange={(e) => setNovaEmpresa(prev => ({ ...prev, gerente: { ...prev.gerente, fullName: e.target.value } }))}
                              placeholder="Nome do gerente"
                            />
                          </div>
                          <div>
                            <Label htmlFor="gerenteEmail">E-mail</Label>
                            <Input
                              id="gerenteEmail"
                              type="email"
                              value={novaEmpresa.gerente.email}
                              onChange={(e) => setNovaEmpresa(prev => ({ ...prev, gerente: { ...prev.gerente, email: e.target.value } }))}
                              placeholder="gerente@empresa.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="gerenteSenha">Senha</Label>
                            <Input
                              id="gerenteSenha"
                              type="password"
                              value={novaEmpresa.gerente.password}
                              onChange={(e) => setNovaEmpresa(prev => ({ ...prev, gerente: { ...prev.gerente, password: e.target.value } }))}
                              placeholder="Mínimo 6 caracteres"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsAddingEmpresa(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSubmitNovaEmpresa} disabled={createEmpresaMutation.isPending}>
                          {createEmpresaMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Cadastrar Empresa
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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

                                {/* Usuários vinculados */}
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Usuários vinculados:</p>
                                  <div className="flex gap-1 flex-wrap">
                                    {empresaUsers.length === 0 ? (
                                      <span className="text-xs text-muted-foreground italic">Nenhum usuário</span>
                                    ) : (
                                      empresaUsers.map(ue => {
                                        const user = users.find(u => u.id === ue.user_id);
                                        return (
                                          <Badge key={ue.id} variant="secondary" className="text-xs">
                                            {user?.full_name || user?.email || 'N/A'}
                                            {ue.is_owner && <Crown className="w-3 h-3 ml-1 text-yellow-500" />}
                                          </Badge>
                                        );
                                      })
                                    )}
                                  </div>
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
