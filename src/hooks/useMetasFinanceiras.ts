import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface MetaFinanceira {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  valor_meta: number;
  valor_atual: number | null;
  data_inicio: string;
  data_fim: string;
  categoria_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  categoria?: { id: string; nome: string; cor: string | null } | null;
}

export interface MetaFinanceiraInput {
  empresa_id: string;
  nome: string;
  descricao?: string;
  tipo: string;
  valor_meta: number;
  data_inicio: string;
  data_fim: string;
  categoria_id?: string;
}

export function useMetasFinanceiras(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["metas_financeiras", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from("metas_financeiras")
        .select(`
          *,
          categoria:categorias_financeiras(id, nome, cor)
        `)
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("data_fim", { ascending: true });

      if (error) throw error;
      return data as MetaFinanceira[];
    },
    enabled: !!empresaId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: MetaFinanceiraInput) => {
      const { data, error } = await supabase
        .from("metas_financeiras")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_financeiras", empresaId] });
      toast({ title: "Meta criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar meta", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<MetaFinanceiraInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("metas_financeiras")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_financeiras", empresaId] });
      toast({ title: "Meta atualizada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar meta", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("metas_financeiras")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_financeiras", empresaId] });
      toast({ title: "Meta removida" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover meta", description: error.message, variant: "destructive" });
    },
  });

  // Calculate metrics
  const metas = query.data || [];
  const metasAtivas = metas.filter(m => new Date(m.data_fim) >= new Date());
  const metasAlcancadas = metas.filter(m => (m.valor_atual || 0) >= m.valor_meta);

  return {
    metas,
    metasAtivas,
    metasAlcancadas,
    isLoading: query.isLoading,
    error: query.error,
    createMeta: createMutation.mutate,
    updateMeta: updateMutation.mutate,
    deleteMeta: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
