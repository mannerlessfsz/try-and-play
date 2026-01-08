/**
 * Hook ÚNICO de permissões do sistema
 * 
 * MODELO:
 * - Usuário com empresa: permissões são por módulo dentro da empresa
 * - Usuário sem empresa (standalone): permissões são por módulo diretamente
 * - Admin: bypass total
 * 
 * ESTE É O ÚNICO HOOK DE PERMISSÕES. usePermissions foi deprecado e removido.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AppModule, APP_MODULES, LEGACY_MODULE_MAP, AppRole, PermissionType } from '@/constants/modules';

// Re-export for convenience - tipos unificados
export type { AppModule, AppRole, PermissionType };

export interface ModulePermission {
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

export interface ModulePermissionInput {
  user_id: string;
  empresa_id: string | null;
  module: string;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_export?: boolean;
  is_pro_mode?: boolean;
}

/**
 * Hook principal para verificar permissões do usuário logado
 */
export function useModulePermissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar roles do usuário
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });

  // Buscar permissões de módulo do usuário
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-module-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as ModulePermission[];
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });

  // Buscar empresas do usuário
  const { data: userEmpresas = [], isLoading: empresasLoading } = useQuery({
    queryKey: ['user-empresas', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_empresas')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`module-permissions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_module_permissions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-module-permissions', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-roles', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Verificações
  const isAdmin = roles.some(r => r.role === 'admin');
  const isManager = roles.some(r => r.role === 'manager');

  /**
   * Normaliza nome de módulo (legado -> atual)
   */
  const normalizeModule = (module: string): string => {
    return LEGACY_MODULE_MAP[module] || module;
  };

  /**
   * Verifica se usuário tem acesso a um módulo
   */
  const hasModuleAccess = (module: AppModule, empresaId?: string | null): boolean => {
    if (isAdmin) return true;
    
    const normalizedModule = normalizeModule(module);
    
    return permissions.some(p => {
      const moduleMatch = normalizeModule(p.module) === normalizedModule;
      const empresaMatch = empresaId === undefined 
        ? true  // Não filtrar por empresa
        : empresaId === null 
          ? p.empresa_id === null  // Standalone
          : p.empresa_id === empresaId;  // Empresa específica
      
      return moduleMatch && empresaMatch && p.can_view;
    });
  };

  /**
   * Verifica permissão específica em módulo
   */
  const hasPermission = (
    module: AppModule, 
    action: 'view' | 'create' | 'edit' | 'delete' | 'export',
    empresaId?: string | null
  ): boolean => {
    if (isAdmin) return true;
    
    const normalizedModule = normalizeModule(module);
    const actionKey = `can_${action}` as keyof ModulePermission;
    
    return permissions.some(p => {
      const moduleMatch = normalizeModule(p.module) === normalizedModule;
      const empresaMatch = empresaId === undefined 
        ? true 
        : empresaId === null 
          ? p.empresa_id === null 
          : p.empresa_id === empresaId;
      
      return moduleMatch && empresaMatch && p[actionKey] === true;
    });
  };

  /**
   * Verifica se usuário tem Pro Mode em módulo
   */
  const hasProMode = (module: AppModule, empresaId?: string | null): boolean => {
    if (isAdmin) return true;
    
    const normalizedModule = normalizeModule(module);
    
    return permissions.some(p => {
      const moduleMatch = normalizeModule(p.module) === normalizedModule;
      const empresaMatch = empresaId === undefined 
        ? true 
        : empresaId === null 
          ? p.empresa_id === null 
          : p.empresa_id === empresaId;
      
      return moduleMatch && empresaMatch && p.is_pro_mode;
    });
  };

  /**
   * Verifica se usuário tem acesso a uma empresa
   */
  const hasEmpresaAccess = (empresaId: string): boolean => {
    if (isAdmin) return true;
    return userEmpresas.some(ue => ue.empresa_id === empresaId);
  };

  /**
   * Retorna IDs das empresas acessíveis
   */
  const getAccessibleEmpresas = (): string[] => {
    if (isAdmin) return [];
    return userEmpresas.map(ue => ue.empresa_id);
  };

  /**
   * Retorna módulos acessíveis para uma empresa (ou standalone)
   */
  const getAccessibleModules = (empresaId?: string | null): AppModule[] => {
    if (isAdmin) {
      return APP_MODULES.map(m => m.value);
    }

    return permissions
      .filter(p => {
        const empresaMatch = empresaId === undefined 
          ? true 
          : empresaId === null 
            ? p.empresa_id === null 
            : p.empresa_id === empresaId;
        return empresaMatch && p.can_view;
      })
      .map(p => normalizeModule(p.module) as AppModule)
      .filter((v, i, a) => a.indexOf(v) === i); // unique
  };

  /**
   * Retorna permissão completa de um módulo
   */
  const getModulePermission = (module: AppModule, empresaId?: string | null): ModulePermission | null => {
    const normalizedModule = normalizeModule(module);
    
    return permissions.find(p => {
      const moduleMatch = normalizeModule(p.module) === normalizedModule;
      const empresaMatch = empresaId === undefined 
        ? true 
        : empresaId === null 
          ? p.empresa_id === null 
          : p.empresa_id === empresaId;
      return moduleMatch && empresaMatch;
    }) || null;
  };

  /**
   * Verifica se usuário tem um papel específico
   */
  const hasRole = (role: AppRole): boolean => {
    return roles.some(r => r.role === role);
  };

  /**
   * Verifica acesso a submódulo (herda do módulo pai)
   */
  const hasSubModuleAccess = (module: AppModule, _subModule: string): boolean => {
    return hasModuleAccess(module);
  };

  /**
   * Verifica permissão em recurso (herda do módulo pai)
   */
  const hasResourcePermission = (
    module: AppModule, 
    _subModule: string | null, 
    _resource: string, 
    action: PermissionType,
    empresaId?: string | null
  ): boolean => {
    return hasPermission(module, action, empresaId);
  };

  return {
    // Data
    roles,
    permissions,
    userEmpresas,
    resourcePermissions: [], // Deprecated - retorna vazio para compatibilidade
    
    // Flags
    isAdmin,
    isManager,
    loading: rolesLoading || permissionsLoading || empresasLoading,
    
    // Checkers
    hasRole,
    hasModuleAccess,
    hasSubModuleAccess,
    hasPermission,
    hasResourcePermission,
    hasProMode,
    hasEmpresaAccess,
    
    // Getters
    getAccessibleEmpresas,
    getAccessibleModules,
    getModulePermission,
  };
}

/**
 * @deprecated Use useModulePermissions diretamente
 * Este alias existe apenas para compatibilidade
 */
export const usePermissions = useModulePermissions;

/**
 * Hook para admin gerenciar permissões de outros usuários
 */
export function useManageModulePermissions(userId?: string, empresaId?: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar permissões de um usuário específico
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['admin-user-module-permissions', userId, empresaId],
    queryFn: async () => {
      if (!userId) return [];
      
      let query = supabase
        .from('user_module_permissions')
        .select('*')
        .eq('user_id', userId);
      
      if (empresaId === null) {
        query = query.is('empresa_id', null);
      } else if (empresaId !== undefined) {
        query = query.eq('empresa_id', empresaId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ModulePermission[];
    },
    enabled: !!userId,
  });

  // Conceder permissão
  const grantMutation = useMutation({
    mutationFn: async (input: ModulePermissionInput) => {
      const { data, error } = await supabase.rpc('grant_module_permission', {
        p_user_id: input.user_id,
        p_module: input.module,
        p_empresa_id: input.empresa_id,
        p_can_view: input.can_view ?? false,
        p_can_create: input.can_create ?? false,
        p_can_edit: input.can_edit ?? false,
        p_can_delete: input.can_delete ?? false,
        p_can_export: input.can_export ?? false,
        p_is_pro_mode: input.is_pro_mode ?? false,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-module-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-module-permissions'] });
      toast({ title: 'Permissão atualizada' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar permissão', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Revogar permissão
  const revokeMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      module, 
      empresaId 
    }: { 
      userId: string; 
      module: string; 
      empresaId: string | null;
    }) => {
      const { data, error } = await supabase.rpc('revoke_module_permission', {
        p_user_id: userId,
        p_module: module,
        p_empresa_id: empresaId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-module-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-module-permissions'] });
      toast({ title: 'Permissão revogada' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao revogar permissão', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    permissions,
    isLoading,
    grantPermission: grantMutation.mutate,
    revokePermission: revokeMutation.mutate,
    isUpdating: grantMutation.isPending || revokeMutation.isPending,
  };
}
