import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModulePermissions, AppModule } from '@/hooks/useModulePermissions';
import { useEmpresaAtiva } from '@/hooks/useEmpresaAtiva';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: AppModule;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  module, 
  requireAdmin = false 
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, hasModuleAccessFlexible, loading: permissionsLoading } = useModulePermissions();
  const { empresaAtiva, loading: empresaLoading } = useEmpresaAtiva();

  if (authLoading || permissionsLoading || empresaLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Usar verificação flexível: empresa ativa, standalone ou qualquer
  if (module && !hasModuleAccessFlexible(module, empresaAtiva?.id)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
