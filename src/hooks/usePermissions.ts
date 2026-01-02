import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'manager' | 'user';
export type AppModule = 'taskvault' | 'financialace' | 'ajustasped' | 'conferesped' | 'erp';
export type PermissionType = 'view' | 'create' | 'edit' | 'delete' | 'export';

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

interface UserResourcePermission {
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

  const hasPermission = (module: AppModule, permission: PermissionType, empresaId?: string): boolean => {
    if (isAdmin) return true;
    
    // Check user_permissions table
    const hasDirectPermission = permissions.some(p => 
      p.module === module && 
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
      p.module === module && 
      p[permissionMap[permission]] === true &&
      (!empresaId || p.empresa_id === empresaId)
    );
    
    return hasResourcePermission;
  };

  const hasModuleAccess = (module: AppModule): boolean => {
    if (isAdmin) return true;
    
    // Check user_permissions for view access
    const hasDirectAccess = permissions.some(p => p.module === module && p.permission === 'view');
    if (hasDirectAccess) return true;
    
    // Check user_resource_permissions - if user has any can_view permission for this module
    const hasResourceAccess = resourcePermissions.some(p => p.module === module && p.can_view === true);
    return hasResourceAccess;
  };

  const hasProMode = (module: AppModule): boolean => {
    if (isAdmin) return true;
    return permissions.some(p => p.module === module && p.is_pro_mode);
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
    hasProMode,
    hasEmpresaAccess,
    getAccessibleEmpresas,
    loading: rolesLoading || permissionsLoading || resourcePermissionsLoading || empresasLoading
  };
};
