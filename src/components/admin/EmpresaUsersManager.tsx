import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncMissingProfiles } from '@/hooks/useSyncProfiles';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  UserPlus, 
  Trash2, 
  Crown, 
  Loader2,
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

export function EmpresaUsersManager({ empresaId, empresaNome }: EmpresaUsersManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      await syncMissingProfiles();
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

  const availableUsers = allUsers.filter(
    u => u.ativo && !empresaUsers.some(eu => eu.user_id === u.id)
  );

  const addUserMutation = useMutation({
    mutationFn: async ({ userId, isOwner }: { userId: string; isOwner: boolean }) => {
      const { error } = await supabase
        .from('user_empresas')
        .insert({ user_id: userId, empresa_id: empresaId, is_owner: isOwner });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-users', empresaId] });
      setIsOpen(false);
      setSelectedUserId(null);
      toast({ title: 'Usuário adicionado à empresa' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async ({ email, name, password, isOwner }: { email: string; name: string; password: string; isOwner: boolean }) => {
      const existingUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        throw new Error('Este e-mail já está cadastrado.');
      }
      
      const { data: currentSession } = await supabase.auth.getSession();
      const masterSession = currentSession?.session;
      
      if (!masterSession) {
        throw new Error('Sessão não encontrada.');
      }
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: name },
        },
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      await supabase.auth.setSession({
        access_token: masterSession.access_token,
        refresh_token: masterSession.refresh_token,
      });

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
      toast({ title: 'Usuário criado e adicionado à empresa' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_empresas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-users', empresaId] });
      toast({ title: 'Usuário removido da empresa' });
    },
  });

  const getUserProfile = (userId: string) => allUsers.find(u => u.id === userId);

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
                          Nenhum usuário disponível
                        </div>
                      ) : (
                        availableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
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
                    <Crown className="w-4 h-4 mr-1" /> Proprietário
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="new" className="space-y-4 mt-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input
                    placeholder="Nome do usuário"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input
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
                    Criar
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
                    <Crown className="w-4 h-4 mr-1" /> Proprietário
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
        <div className="space-y-2">
          {empresaUsers.map(eu => {
            const user = getUserProfile(eu.user_id);
            return (
              <div key={eu.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {(user?.full_name || user?.email || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{user?.full_name || user?.email || 'N/A'}</span>
                      {eu.is_owner && (
                        <Badge variant="outline" className="gap-1 text-yellow-500 border-yellow-500 text-xs">
                          <Crown className="w-3 h-3" /> Proprietário
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => {
                    if (confirm('Remover usuário desta empresa?')) {
                      removeUserMutation.mutate(eu.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
