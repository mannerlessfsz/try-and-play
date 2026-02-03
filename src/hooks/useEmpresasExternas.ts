import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface EmpresaExterna {
  id: string;
  nome: string;
  cnpj: string | null;
  codigo_empresa: string;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanoContasExterno {
  id: string;
  empresa_externa_id: string;
  nome_arquivo: string;
  arquivo_url: string | null;
  storage_path: string | null;
  metadados: Json;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useEmpresasExternas = () => {
  const queryClient = useQueryClient();

  // Fetch all empresas externas
  const { data: empresasExternas = [], isLoading, refetch } = useQuery({
    queryKey: ['empresas-externas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas_externas_conversores')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as EmpresaExterna[];
    }
  });

  // Create empresa externa
  const createEmpresa = useMutation({
    mutationFn: async (empresa: Omit<EmpresaExterna, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'ativo'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('empresas_externas_conversores')
        .insert({
          ...empresa,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-externas'] });
      toast.success('Empresa externa cadastrada com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Código da empresa já existe!');
      } else {
        toast.error('Erro ao cadastrar empresa: ' + error.message);
      }
    }
  });

  // Update empresa externa
  const updateEmpresa = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmpresaExterna> & { id: string }) => {
      const { data, error } = await supabase
        .from('empresas_externas_conversores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-externas'] });
      toast.success('Empresa atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar empresa: ' + error.message);
    }
  });

  // Delete (soft) empresa externa
  const deleteEmpresa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('empresas_externas_conversores')
        .update({ ativo: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-externas'] });
      toast.success('Empresa removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover empresa: ' + error.message);
    }
  });

  return {
    empresasExternas,
    isLoading,
    refetch,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa
  };
};

export const usePlanosContasExternos = (empresaExternaId?: string) => {
  const queryClient = useQueryClient();

  // Fetch planos de contas for a specific empresa
  const { data: planosContas = [], isLoading } = useQuery({
    queryKey: ['planos-contas-externos', empresaExternaId],
    queryFn: async () => {
      if (!empresaExternaId) return [];
      
      const { data, error } = await supabase
        .from('planos_contas_externos')
        .select('*')
        .eq('empresa_externa_id', empresaExternaId)
        .eq('ativo', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PlanoContasExterno[];
    },
    enabled: !!empresaExternaId
  });

  // Upload plano de contas
  const uploadPlanoContas = useMutation({
    mutationFn: async ({ 
      empresaExternaId, 
      file, 
      metadados 
    }: { 
      empresaExternaId: string; 
      file: File; 
      metadados?: Json;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upload file to storage
      const fileName = `${empresaExternaId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('planos-contas')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('planos-contas')
        .getPublicUrl(fileName);
      
      // Create record
      const { data, error } = await supabase
        .from('planos_contas_externos')
        .insert([{
          empresa_externa_id: empresaExternaId,
          nome_arquivo: file.name,
          arquivo_url: publicUrl,
          storage_path: fileName,
          metadados: metadados ?? {},
          created_by: user?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-contas-externos'] });
      toast.success('Plano de contas salvo com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar plano de contas: ' + error.message);
    }
  });

  // Get latest plano de contas for empresa
  const getLatestPlano = async (empresaId: string): Promise<PlanoContasExterno | null> => {
    const { data, error } = await supabase
      .from('planos_contas_externos')
      .select('*')
      .eq('empresa_externa_id', empresaId)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) return null;
    return data as PlanoContasExterno;
  };

  // Download file from storage
  const downloadPlanoFile = async (storagePath: string): Promise<Blob | null> => {
    const { data, error } = await supabase.storage
      .from('planos-contas')
      .download(storagePath);
    
    if (error) {
      toast.error('Erro ao baixar arquivo: ' + error.message);
      return null;
    }
    return data;
  };

  return {
    planosContas,
    isLoading,
    uploadPlanoContas,
    getLatestPlano,
    downloadPlanoFile
  };
};
