/**
 * Hook de permissões refatorado - usa o novo sistema user_module_permissions
 * Mantém API compatível com código existente
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AppRole, 
  AppModule, 
  PermissionType,
  LEGACY_MODULE_MAP
} from '@/constants/modules';

// Re-export types for backward compatibility
export type { AppRole, AppModule, PermissionType };

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
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

interface UserEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  is_owner: boolean;
}

/**
 * Normaliza nome de módulo (legado -> atual)
 */
function normalizeModule(module: string): string {
  return LEGACY_MODULE_MAP[module] || module;
}

export const usePermissions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime subscription para atualização imediata
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`permissions-${user.id}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Buscar roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!user,
    staleTime: 1000 * 30,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Buscar permissões de módulo (NOVA TABELA)
  const { data: modulePermissions = [], isLoading: permissionsLoading } = useQuery({
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
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
      return data as UserEmpresa[];
    },
    enabled: !!user,
    staleTime: 1000 * 30,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const isAdmin = roles.some(r => r.role === 'admin');
  const isManager = roles.some(r => r.role === 'manager');

  const hasRole = (role: AppRole): boolean => {
    return roles.some(r => r.role === role);
  };

  /**
   * Check permission in a module
   */
  const hasPermission = (module: AppModule, permission: PermissionType, empresaId?: string): boolean => {
    if (isAdmin) return true;
    
    const normalizedModule = normalizeModule(module);
    const actionKey = `can_${permission}` as keyof ModulePermission;
    
    return modulePermissions.some(p => {
      const moduleMatch = normalizeModule(p.module) === normalizedModule;
      const empresaMatch = empresaId === undefined 
        ? true  // Não filtrar por empresa
        : p.empresa_id === empresaId || p.empresa_id === null;
      
      return moduleMatch && empresaMatch && p[actionKey] === true;
    });
  };

  /**
   * Check if user has access to a module (can view)
   */
  const hasModuleAccess = (module: AppModule): boolean => {
    if (isAdmin) return true;
    
    const normalizedModule = normalizeModule(module);
    
    return modulePermissions.some(p => {
      const moduleMatch = normalizeModule(p.module) === normalizedModule;
      return moduleMatch && p.can_view;
    });
  };

  /**
   * Check if user has access to a sub-module (backwards compatible - uses module access)
   */
  const hasSubModuleAccess = (module: AppModule, _subModule: string): boolean => {
    // No novo sistema simplificado, sub-módulos herdam permissão do módulo
    return hasModuleAccess(module);
  };

  /**
   * Check if user has permission for a specific resource (backwards compatible)
   */
  const hasResourcePermission = (
    module: AppModule, 
    _subModule: string | null, 
    _resource: string, 
    action: PermissionType,
    empresaId?: string
  ): boolean => {
    // No novo sistema simplificado, recursos herdam permissão do módulo
    return hasPermission(module, action, empresaId);
  };

  /**
   * Check Pro Mode
   */
  const hasProMode = (module: AppModule): boolean => {
    if (isAdmin) return true;
    
    const normalizedModule = normalizeModule(module);
    
    return modulePermissions.some(p => {
      const moduleMatch = normalizeModule(p.module) === normalizedModule;
      return moduleMatch && p.is_pro_mode;
    });
  };

  /**
   * Check empresa access
   */
  const hasEmpresaAccess = (empresaId: string): boolean => {
    if (isAdmin) return true;
    return userEmpresas.some(ue => ue.empresa_id === empresaId);
  };

  /**
   * Get accessible empresas
   */
  const getAccessibleEmpresas = (): string[] => {
    if (isAdmin) return [];
    return userEmpresas.map(ue => ue.empresa_id);
  };

  return {
    // Dados
    roles,
    permissions: modulePermissions, // Compatibilidade
    resourcePermissions: [], // Deprecated - retorna vazio
    userEmpresas,
    
    // Flags
    isAdmin,
    isManager,
    
    // Checkers
    hasRole,
    hasPermission,
    hasModuleAccess,
    hasSubModuleAccess,
    hasResourcePermission,
    hasProMode,
    hasEmpresaAccess,
    
    // Getters
    getAccessibleEmpresas,
    
    // Loading
    loading: rolesLoading || permissionsLoading || empresasLoading
  };
};
