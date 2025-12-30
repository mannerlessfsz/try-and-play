import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'manager' | 'user';
export type AppModule = 'taskvault' | 'financialace' | 'ajustasped' | 'conferesped';
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
    
    return permissions.some(p => 
      p.module === module && 
      p.permission === permission &&
      (p.empresa_id === null || p.empresa_id === empresaId)
    );
  };

  const hasModuleAccess = (module: AppModule): boolean => {
    if (isAdmin) return true;
    return permissions.some(p => p.module === module && p.permission === 'view');
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
    userEmpresas,
    isAdmin,
    isManager,
    hasRole,
    hasPermission,
    hasModuleAccess,
    hasProMode,
    hasEmpresaAccess,
    getAccessibleEmpresas,
    loading: rolesLoading || permissionsLoading || empresasLoading
  };
};
