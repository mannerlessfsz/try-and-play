import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  MODULE_RESOURCES, 
  PERMISSION_ACTIONS,
  AppModule 
} from '@/constants/modules';

// Re-export for backward compatibility
export { MODULE_RESOURCES, PERMISSION_ACTIONS };

export interface ResourcePermission {
  id: string;
  user_id: string;
  empresa_id: string;
  module: string;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourcePermissionInput {
  user_id: string;
  empresa_id: string;
  module: string;
  resource: string;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_export?: boolean;
}

export function useResourcePermissions(empresaId?: string, userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const query = useQuery({
    queryKey: ['resource-permissions', empresaId, userId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('user_resource_permissions')
        .select('*');

      if (empresaId) {
        queryBuilder = queryBuilder.eq('empresa_id', empresaId);
      }
      if (userId) {
        queryBuilder = queryBuilder.eq('user_id', userId);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return data as ResourcePermission[];
    },
    enabled: !!empresaId || !!userId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: ResourcePermissionInput) => {
      const { data, error } = await supabase
        .from('user_resource_permissions')
        .upsert(input, { onConflict: 'user_id,empresa_id,module,resource' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      toast({ title: 'Permissão atualizada' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar permissão', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_resource_permissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      toast({ title: 'Permissão removida' });
    },
  });

  // Função para checar se usuário tem permissão para um recurso específico
  const hasResourcePermission = (
    module: string,
    resource: string,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export'
  ): boolean => {
    if (!query.data) return false;
    
    const permission = query.data.find(
      p => p.module === module && p.resource === resource
    );
    
    return permission ? permission[action] : false;
  };

  // Obter permissões de um usuário para um módulo específico
  const getUserModulePermissions = (module: string) => {
    if (!query.data) return [];
    return query.data.filter(p => p.module === module);
  };

  return {
    permissions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    upsertPermission: upsertMutation.mutate,
    deletePermission: deleteMutation.mutate,
    hasResourcePermission,
    getUserModulePermissions,
    isUpdating: upsertMutation.isPending,
  };
}

// Hook para o usuário atual checar suas próprias permissões
export function useMyResourcePermissions(empresaId?: string) {
  const { user } = useAuth();
  return useResourcePermissions(empresaId, user?.id);
}
