import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  MODULE_RESOURCES, 
  PERMISSION_ACTIONS,
  useResourcePermissions 
} from '@/hooks/useResourcePermissions';
import { 
  UserPlus, 
  Trash2, 
  Shield, 
  Crown, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  User
} from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  ativo: boolean;
}

interface UserEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  is_owner: boolean;
}

interface EmpresaUsersManagerProps {
  empresaId: string;
  empresaNome?: string;
}

const MODULES = [
  { value: 'financialace', label: 'FinancialACE' },
  { value: 'erp', label: 'ERP/Gestão' },
  { value: 'taskvault', label: 'TaskVault' },
  { value: 'ajustasped', label: 'AjustaSped' },
  { value: 'conferesped', label: 'ConfereSped' },
];

export function EmpresaUsersManager({ empresaId, empresaNome }: EmpresaUsersManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('financialace');
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch users linked to this empresa
  const { data: empresaUsers = [], isLoading } = useQuery({
    queryKey: ['empresa-users', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_empresas')
        .select('*')
        .eq('empresa_id', empresaId);
      if (error) throw error;
      return data as UserEmpresa[];
    },
  });

  // Resource permissions hook
  const { 
    permissions: resourcePermissions, 
    upsertPermission, 
    isUpdating 
  } = useResourcePermissions(empresaId);

  // Get active users not yet linked
  const availableUsers = allUsers.filter(
    u => u.ativo && !empresaUsers.some(eu => eu.user_id === u.id)
  );

  // Add user to empresa
  const addUserMutation = useMutation({
    mutationFn: async ({ userId, isOwner }: { userId: string; isOwner: boolean }) => {
      const { error } = await supabase
        .from('user_empresas')
        .insert({ user_id: userId, empresa_id: empresaId, is_owner: isOwner });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-users', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsOpen(false);
      setSelectedUserId(null);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setAddMode('existing');
      toast({ title: 'Usuário adicionado à empresa' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Create new user and add to empresa with email validation
  const createUserMutation = useMutation({
    mutationFn: async ({ email, name, password, isOwner }: { email: string; name: string; password: string; isOwner: boolean }) => {
      // Check if email already exists
      const existingUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        throw new Error('Este e-mail já está cadastrado no sistema. Use a aba "Existente" para adicionar este usuário.');
      }
      
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });
      
      if (authError) {
        // Check for duplicate email error from Supabase
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          throw new Error('Este e-mail já está cadastrado no sistema. Use a aba "Existente" para adicionar este usuário.');
        }
        throw authError;
      }
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // Link user to empresa
      const { error: linkError } = await supabase
        .from('user_empresas')
        .insert({ user_id: authData.user.id, empresa_id: empresaId, is_owner: isOwner });
      
      if (linkError) throw linkError;
      
      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-users', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsOpen(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setAddMode('existing');
      toast({ title: 'Usuário criado e adicionado à empresa' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
    },
  });

  // Remove user from empresa
  const removeUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_empresas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-users', empresaId] });
      toast({ title: 'Usuário removido da empresa' });
    },
  });

  // Get user profile
  const getUserProfile = (userId: string) => allUsers.find(u => u.id === userId);

  // Get user's permissions for a resource
  const getUserResourcePermission = (userId: string, module: string, resource: string) => {
    return resourcePermissions.find(
      p => p.user_id === userId && p.module === module && p.resource === resource
    );
  };

  // Toggle permission
  const handleTogglePermission = (
    userId: string, 
    module: string, 
    resource: string, 
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export',
    currentValue: boolean
  ) => {
    const existing = getUserResourcePermission(userId, module, resource);
    upsertPermission({
      user_id: userId,
      empresa_id: empresaId,
      module,
      resource,
      ...existing,
      [action]: !currentValue,
    });
  };

  // Grant all permissions for a resource
  const handleGrantAllForResource = (userId: string, module: string, resource: string) => {
    upsertPermission({
      user_id: userId,
      empresa_id: empresaId,
      module,
      resource,
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
      can_export: true,
    });
  };

  // Revoke all permissions for a resource
  const handleRevokeAllForResource = (userId: string, module: string, resource: string) => {
    upsertPermission({
      user_id: userId,
      empresa_id: empresaId,
      module,
      resource,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_export: false,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {empresaNome && <h3 className="text-lg font-semibold">Usuários de {empresaNome}</h3>}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="w-4 h-4" /> Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Usuário à Empresa</DialogTitle>
            </DialogHeader>
            <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'existing' | 'new')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing" className="gap-2">
                  <User className="w-4 h-4" /> Existente
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-2">
                  <UserPlus className="w-4 h-4" /> Novo
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="existing" className="space-y-4 mt-4">
                <div>
                  <Label>Selecione o usuário</Label>
                  <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum usuário ativo disponível
                        </div>
                      ) : (
                        availableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email} {!user.ativo && '(Inativo)'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => selectedUserId && addUserMutation.mutate({ userId: selectedUserId, isOwner: false })}
                    disabled={!selectedUserId || addUserMutation.isPending}
                    className="flex-1"
                  >
                    {addUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Adicionar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => selectedUserId && addUserMutation.mutate({ userId: selectedUserId, isOwner: true })}
                    disabled={!selectedUserId || addUserMutation.isPending}
                    className="flex-1"
                  >
                    <Crown className="w-4 h-4 mr-1" /> Como Proprietário
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="new" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="newUserName">Nome completo</Label>
                  <Input
                    id="newUserName"
                    placeholder="Nome do usuário"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="newUserEmail">E-mail</Label>
                  <Input
                    id="newUserEmail"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="newUserPassword">Senha</Label>
                  <Input
                    id="newUserPassword"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => createUserMutation.mutate({ 
                      email: newUserEmail, 
                      name: newUserName, 
                      password: newUserPassword, 
                      isOwner: false 
                    })}
                    disabled={!newUserEmail || !newUserPassword || newUserPassword.length < 6 || createUserMutation.isPending}
                    className="flex-1"
                  >
                    {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Criar Usuário
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => createUserMutation.mutate({ 
                      email: newUserEmail, 
                      name: newUserName, 
                      password: newUserPassword, 
                      isOwner: true 
                    })}
                    disabled={!newUserEmail || !newUserPassword || newUserPassword.length < 6 || createUserMutation.isPending}
                    className="flex-1"
                  >
                    <Crown className="w-4 h-4 mr-1" /> Como Proprietário
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {empresaUsers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum usuário vinculado a esta empresa
        </div>
      ) : (
        <div className="space-y-3">
          {empresaUsers.map(eu => {
            const user = getUserProfile(eu.user_id);
            const isExpanded = expandedUser === eu.id;

            return (
              <div key={eu.id} className="border border-border rounded-lg p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedUser(isExpanded ? null : eu.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {(user?.full_name || user?.email || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user?.full_name || user?.email || 'N/A'}</span>
                        {eu.is_owner && (
                          <Badge variant="outline" className="gap-1 text-yellow-500 border-yellow-500">
                            <Crown className="w-3 h-3" /> Proprietário
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Remover usuário desta empresa?')) {
                          removeUserMutation.mutate(eu.id);
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
                  <div className="mt-4 pt-4 border-t border-border space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Permissões Granulares por Recurso</span>
                    </div>

                    {/* Module selector */}
                    <div className="flex gap-2 flex-wrap">
                      {MODULES.map(mod => (
                        <Button
                          key={mod.value}
                          variant={selectedModule === mod.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedModule(mod.value)}
                        >
                          {mod.label}
                        </Button>
                      ))}
                    </div>

                    {/* Resources table */}
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Recurso</TableHead>
                            {PERMISSION_ACTIONS.map(action => (
                              <TableHead key={action.value} className="text-center w-20">
                                {action.label}
                              </TableHead>
                            ))}
                            <TableHead className="text-center w-24">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(MODULE_RESOURCES[selectedModule] || []).map(resource => {
                            const perm = getUserResourcePermission(eu.user_id, selectedModule, resource.value);
                            
                            return (
                              <TableRow key={resource.value}>
                                <TableCell className="font-medium">{resource.label}</TableCell>
                                {PERMISSION_ACTIONS.map(action => (
                                  <TableCell key={action.value} className="text-center">
                                    <Checkbox
                                      checked={perm?.[action.value] || false}
                                      onCheckedChange={() => handleTogglePermission(
                                        eu.user_id,
                                        selectedModule,
                                        resource.value,
                                        action.value,
                                        perm?.[action.value] || false
                                      )}
                                      disabled={isUpdating}
                                    />
                                  </TableCell>
                                ))}
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-green-500 hover:text-green-600"
                                      onClick={() => handleGrantAllForResource(eu.user_id, selectedModule, resource.value)}
                                    >
                                      Tudo
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                                      onClick={() => handleRevokeAllForResource(eu.user_id, selectedModule, resource.value)}
                                    >
                                      Nada
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
