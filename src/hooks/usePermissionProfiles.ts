import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PermissionProfile {
  id: string;
  nome: string;
  descricao: string | null;
  role_padrao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionProfileItem {
  id: string;
  profile_id: string;
  module: string;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  created_at: string;
}

export interface PermissionProfileInput {
  nome: string;
  descricao?: string;
  role_padrao?: string;
  ativo?: boolean;
}

export interface PermissionProfileItemInput {
  profile_id: string;
  module: string;
  resource: string;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_export?: boolean;
}

// Helper to make type-safe queries for tables not yet in generated types
const fromTable = (tableName: string) => {
  return supabase.from(tableName as 'profiles');
};

export function usePermissionProfiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all profiles
  const profilesQuery = useQuery({
    queryKey: ['permission-profiles'],
    queryFn: async () => {
      const { data, error } = await fromTable('permission_profiles')
        .select('*')
        .order('nome' as any);
      if (error) throw error;
      return (data || []) as unknown as PermissionProfile[];
    },
  });

  // Fetch all profile items
  const itemsQuery = useQuery({
    queryKey: ['permission-profile-items'],
    queryFn: async () => {
      const { data, error } = await fromTable('permission_profile_items')
        .select('*');
      if (error) throw error;
      return (data || []) as unknown as PermissionProfileItem[];
    },
  });

  // Create profile
  const createProfileMutation = useMutation({
    mutationFn: async (input: PermissionProfileInput) => {
      const { data, error } = await fromTable('permission_profiles')
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PermissionProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-profiles'] });
      toast({ title: 'Perfil criado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar perfil', description: error.message, variant: 'destructive' });
    },
  });

  // Update profile
  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, ...input }: PermissionProfileInput & { id: string }) => {
      const { data, error } = await fromTable('permission_profiles')
        .update(input as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PermissionProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-profiles'] });
      toast({ title: 'Perfil atualizado' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar perfil', description: error.message, variant: 'destructive' });
    },
  });

  // Delete profile
  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromTable('permission_profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['permission-profile-items'] });
      toast({ title: 'Perfil removido' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover perfil', description: error.message, variant: 'destructive' });
    },
  });

  // Upsert profile item
  const upsertProfileItemMutation = useMutation({
    mutationFn: async (input: PermissionProfileItemInput) => {
      const { data, error } = await fromTable('permission_profile_items')
        .upsert(input as any, { onConflict: 'profile_id,module,resource' })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PermissionProfileItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-profile-items'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar item', description: error.message, variant: 'destructive' });
    },
  });

  // Delete profile item
  const deleteProfileItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromTable('permission_profile_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-profile-items'] });
    },
  });

  // Apply profile to user (bulk insert permissions)
  const applyProfileToUserMutation = useMutation({
    mutationFn: async ({ 
      profileId, 
      userId, 
      empresaId,
      assignRole = true 
    }: { 
      profileId: string; 
      userId: string; 
      empresaId: string;
      assignRole?: boolean;
    }) => {
      // Get profile items
      const profileItems = (itemsQuery.data || []).filter(item => item.profile_id === profileId);
      const profile = (profilesQuery.data || []).find(p => p.id === profileId);
      
      if (profileItems.length === 0) {
        throw new Error('Perfil sem permissões configuradas');
      }

      // Delete existing permissions for this user/empresa combination
      const { error: deleteError } = await supabase
        .from('user_resource_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('empresa_id', empresaId);
      
      if (deleteError) throw deleteError;

      // Insert new permissions based on profile
      const newPermissions = profileItems.map(item => ({
        user_id: userId,
        empresa_id: empresaId,
        module: item.module,
        resource: item.resource,
        can_view: item.can_view,
        can_create: item.can_create,
        can_edit: item.can_edit,
        can_delete: item.can_delete,
        can_export: item.can_export,
      }));

      const { error: insertError } = await supabase
        .from('user_resource_permissions')
        .insert(newPermissions);

      if (insertError) throw insertError;

      // Register which profile was applied (for auto-sync when profile changes)
      const { error: trackError } = await fromTable('user_applied_profiles')
        .upsert({
          user_id: userId,
          empresa_id: empresaId,
          profile_id: profileId,
          applied_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id,empresa_id' });

      if (trackError) {
        console.warn('Erro ao registrar perfil aplicado:', trackError);
        // Não falhar a operação por causa disso
      }

      // Optionally assign role
      if (assignRole && profile?.role_padrao) {
        const rolePadrao = profile.role_padrao as 'admin' | 'manager' | 'user';
        
        // Check if user already has this role
        const { data: existingRoles } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .eq('role', rolePadrao);

        if (!existingRoles || existingRoles.length === 0) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert([{ user_id: userId, role: rolePadrao }]);
          
          if (roleError) throw roleError;
        }
      }

      return { applied: newPermissions.length, profileName: profile?.nome };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-applied-profiles'] });
      toast({ 
        title: 'Perfil aplicado com sucesso', 
        description: `${data.applied} permissões configuradas. Alterações no perfil serão sincronizadas automaticamente.` 
      });
    },
    onError: (error) => {
      toast({ title: 'Erro ao aplicar perfil', description: error.message, variant: 'destructive' });
    },
  });

  // Get profile items for a specific profile
  const getProfileItems = (profileId: string): PermissionProfileItem[] => {
    return (itemsQuery.data || []).filter(item => item.profile_id === profileId);
  };

  return {
    profiles: profilesQuery.data || [],
    profileItems: itemsQuery.data || [],
    isLoading: profilesQuery.isLoading || itemsQuery.isLoading,
    createProfile: createProfileMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    deleteProfile: deleteProfileMutation.mutate,
    upsertProfileItem: upsertProfileItemMutation.mutate,
    deleteProfileItem: deleteProfileItemMutation.mutate,
    applyProfileToUser: applyProfileToUserMutation.mutate,
    isApplying: applyProfileToUserMutation.isPending,
    getProfileItems,
  };
}
