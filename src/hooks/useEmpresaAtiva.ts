import { useState, useEffect, createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
}

interface EmpresaAtivaContextType {
  empresaAtiva: Empresa | null;
  empresasDisponiveis: Empresa[];
  setEmpresaAtiva: (empresa: Empresa | null) => void;
  loading: boolean;
}

const EmpresaAtivaContext = createContext<EmpresaAtivaContextType | undefined>(undefined);

export const useEmpresaAtiva = () => {
  const context = useContext(EmpresaAtivaContext);
  if (context === undefined) {
    throw new Error('useEmpresaAtiva must be used within an EmpresaAtivaProvider');
  }
  return context;
};

export const useEmpresaAtivaState = () => {
  const { user } = useAuth();
  const { isAdmin, userEmpresas } = usePermissions();
  const [empresaAtiva, setEmpresaAtivaState] = useState<Empresa | null>(null);

  // Fetch empresas the user has access to
  const { data: empresasDisponiveis = [], isLoading } = useQuery({
    queryKey: ['empresas-disponiveis', user?.id, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      
      // Admin sees all empresas
      if (isAdmin) {
        const { data, error } = await supabase.from('empresas').select('*');
        if (error) throw error;
        return data as Empresa[];
      }
      
      // Regular users see only their associated empresas
      const empresaIds = userEmpresas.map(ue => ue.empresa_id);
      if (empresaIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .in('id', empresaIds);
      if (error) throw error;
      return data as Empresa[];
    },
    enabled: !!user
  });

  // Auto-select first empresa if none selected
  useEffect(() => {
    if (!empresaAtiva && empresasDisponiveis.length > 0) {
      // Try to restore from localStorage
      const savedEmpresaId = localStorage.getItem('empresaAtiva');
      const savedEmpresa = empresasDisponiveis.find(e => e.id === savedEmpresaId);
      if (savedEmpresa) {
        setEmpresaAtivaState(savedEmpresa);
      } else {
        setEmpresaAtivaState(empresasDisponiveis[0]);
      }
    }
  }, [empresasDisponiveis, empresaAtiva]);

  const setEmpresaAtiva = (empresa: Empresa | null) => {
    setEmpresaAtivaState(empresa);
    if (empresa) {
      localStorage.setItem('empresaAtiva', empresa.id);
    } else {
      localStorage.removeItem('empresaAtiva');
    }
  };

  return {
    empresaAtiva,
    empresasDisponiveis,
    setEmpresaAtiva,
    loading: isLoading
  };
};

export { EmpresaAtivaContext };
export type { Empresa, EmpresaAtivaContextType };
