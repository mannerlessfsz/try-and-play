import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AppRole, 
  AppModule, 
  PermissionType,
  normalizeModuleName,
  LEGACY_MODULE_MAP
} from '@/constants/modules';

// Re-export types for backward compatibility
export type { AppRole, AppModule, PermissionType };

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

interface UserPermission {
  id: string;
  user_id: string;
  empresa_id: string | null;
  module: string; // Can be legacy module name
  permission: PermissionType;
  is_pro_mode: boolean;
}

interface UserResourcePermission {
  id: string;
  user_id: string;
  empresa_id: string;
  module: string; // Can be legacy module name
  sub_module: string | null;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

interface UserEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  is_owner: boolean;
}

export const usePermissions = () => {
  const { user } = useAuth();

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
    enabled: !!user
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!user
  });

  // Also fetch resource permissions (granular permissions set in Admin)
  const { data: resourcePermissions = [], isLoading: resourcePermissionsLoading } = useQuery({
    queryKey: ['user-resource-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_resource_permissions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as UserResourcePermission[];
    },
    enabled: !!user
  });

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
    enabled: !!user
  });

  const isAdmin = roles.some(r => r.role === 'admin');
  const isManager = roles.some(r => r.role === 'manager');

  const hasRole = (role: AppRole): boolean => {
    return roles.some(r => r.role === role);
  };

  /**
   * Check permission considering both current and legacy module names
   */
  const hasPermission = (module: AppModule, permission: PermissionType, empresaId?: string): boolean => {
    if (isAdmin) return true;
    
    // Get all possible module names (current + legacy that map to this module)
    const moduleNames: string[] = [module];
    Object.entries(LEGACY_MODULE_MAP).forEach(([legacy, current]) => {
      if (current === module) moduleNames.push(legacy);
    });
    
    // Check user_permissions table
    const hasDirectPermission = permissions.some(p => 
      moduleNames.includes(p.module) && 
      p.permission === permission &&
      (p.empresa_id === null || p.empresa_id === empresaId)
    );
    
    if (hasDirectPermission) return true;
    
    // Check user_resource_permissions table (granular permissions)
    const permissionMap: Record<PermissionType, keyof UserResourcePermission> = {
      'view': 'can_view',
      'create': 'can_create',
      'edit': 'can_edit',
      'delete': 'can_delete',
      'export': 'can_export'
    };
    
    const hasResourcePermission = resourcePermissions.some(p => 
      moduleNames.includes(p.module) && 
      p[permissionMap[permission]] === true &&
      (!empresaId || p.empresa_id === empresaId)
    );
    
    return hasResourcePermission;
  };

  /**
   * Check module access considering both current and legacy module names
   */
  const hasModuleAccess = (module: AppModule): boolean => {
    if (isAdmin) return true;
    
    // Get all possible module names (current + legacy that map to this module)
    const moduleNames: string[] = [module];
    Object.entries(LEGACY_MODULE_MAP).forEach(([legacy, current]) => {
      if (current === module) moduleNames.push(legacy);
    });
    
    // Check user_permissions for view access
    const hasDirectAccess = permissions.some(p => 
      moduleNames.includes(p.module) && p.permission === 'view'
    );
    if (hasDirectAccess) return true;
    
    // Check user_resource_permissions - if user has any can_view permission for this module
    const hasResourceAccess = resourcePermissions.some(p => 
      moduleNames.includes(p.module) && p.can_view === true
    );
    return hasResourceAccess;
  };

  /**
   * Check if user has access to a specific sub-module within a module
   */
  const hasSubModuleAccess = (module: AppModule, subModule: string): boolean => {
    if (isAdmin) return true;
    
    const moduleNames: string[] = [module];
    Object.entries(LEGACY_MODULE_MAP).forEach(([legacy, current]) => {
      if (current === module) moduleNames.push(legacy);
    });
    
    // Check if user has any view permission for resources in this sub-module
    return resourcePermissions.some(p => 
      moduleNames.includes(p.module) && 
      p.sub_module === subModule && 
      p.can_view === true
    );
  };

  /**
   * Check if user has permission for a specific resource within a sub-module
   */
  const hasResourcePermission = (
    module: AppModule, 
    subModule: string | null, 
    resource: string, 
    action: PermissionType,
    empresaId?: string
  ): boolean => {
    if (isAdmin) return true;
    
    const moduleNames: string[] = [module];
    Object.entries(LEGACY_MODULE_MAP).forEach(([legacy, current]) => {
      if (current === module) moduleNames.push(legacy);
    });
    
    const permissionMap: Record<PermissionType, 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export'> = {
      'view': 'can_view',
      'create': 'can_create',
      'edit': 'can_edit',
      'delete': 'can_delete',
      'export': 'can_export'
    };
    
    return resourcePermissions.some(p => 
      moduleNames.includes(p.module) && 
      (subModule === null || p.sub_module === subModule) &&
      p.resource === resource &&
      p[permissionMap[action]] === true &&
      (!empresaId || p.empresa_id === empresaId)
    );
  };

  const hasProMode = (module: AppModule): boolean => {
    if (isAdmin) return true;
    
    // Get all possible module names
    const moduleNames: string[] = [module];
    Object.entries(LEGACY_MODULE_MAP).forEach(([legacy, current]) => {
      if (current === module) moduleNames.push(legacy);
    });
    
    return permissions.some(p => moduleNames.includes(p.module) && p.is_pro_mode);
  };

  const hasEmpresaAccess = (empresaId: string): boolean => {
    if (isAdmin) return true;
    return userEmpresas.some(ue => ue.empresa_id === empresaId);
  };

  const getAccessibleEmpresas = (): string[] => {
    if (isAdmin) return []; // Admin sees all
    return userEmpresas.map(ue => ue.empresa_id);
  };

  return {
    roles,
    permissions,
    resourcePermissions,
    userEmpresas,
    isAdmin,
    isManager,
    hasRole,
    hasPermission,
    hasModuleAccess,
    hasSubModuleAccess,
    hasResourcePermission,
    hasProMode,
    hasEmpresaAccess,
    getAccessibleEmpresas,
    loading: rolesLoading || permissionsLoading || resourcePermissionsLoading || empresasLoading
  };
};
