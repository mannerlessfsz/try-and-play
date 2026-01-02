import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ImportacaoExtrato {
  id: string;
  empresa_id: string;
  conta_bancaria_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  status: string;
  total_transacoes: number | null;
  transacoes_importadas: number | null;
  transacoes_duplicadas: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  erro_mensagem: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ImportacaoExtratoInput {
  empresa_id: string;
  conta_bancaria_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  status?: string;
  total_transacoes?: number;
  transacoes_importadas?: number;
  transacoes_duplicadas?: number;
  data_inicio?: string;
  data_fim?: string;
}

export function useImportacoesExtrato(empresaId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: importacoes = [], isLoading } = useQuery({
    queryKey: ['importacoes_extrato', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from('importacoes_extrato')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ImportacaoExtrato[];
    },
    enabled: !!empresaId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: ImportacaoExtratoInput) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('importacoes_extrato')
        .insert([{
          ...input,
          created_by: userData.user?.id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importacoes_extrato', empresaId] });
    },
    onError: (error: any) => {
      console.error('Erro ao criar importação:', error);
      toast({
        title: 'Erro ao registrar importação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ImportacaoExtrato> & { id: string }) => {
      const { data, error } = await supabase
        .from('importacoes_extrato')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importacoes_extrato', empresaId] });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar importação:', error);
      toast({
        title: 'Erro ao atualizar importação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('importacoes_extrato')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importacoes_extrato', empresaId] });
      toast({
        title: 'Extrato excluído',
        description: 'O extrato foi removido e as conciliações foram desfeitas.',
      });
    },
    onError: (error: any) => {
      console.error('Erro ao excluir importação:', error);
      toast({
        title: 'Erro ao excluir extrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    importacoes,
    isLoading,
    createImportacao: createMutation.mutateAsync,
    updateImportacao: updateMutation.mutateAsync,
    deleteImportacao: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
