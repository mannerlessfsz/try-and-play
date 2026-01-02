import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CentroCusto {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CentroCustoInput {
  empresa_id: string;
  nome: string;
  descricao?: string;
}

export function useCentrosCusto(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["centros_custo", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from("centros_custo")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as CentroCusto[];
    },
    enabled: !!empresaId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CentroCustoInput) => {
      const { data, error } = await supabase
        .from("centros_custo")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros_custo", empresaId] });
      toast({ title: "Centro de custo criado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar centro de custo", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CentroCustoInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("centros_custo")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros_custo", empresaId] });
      toast({ title: "Centro de custo atualizado" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar centro de custo", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("centros_custo")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros_custo", empresaId] });
      toast({ title: "Centro de custo removido" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover centro de custo", description: error.message, variant: "destructive" });
    },
  });

  return {
    centros: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createCentro: createMutation.mutate,
    updateCentro: updateMutation.mutate,
    deleteCentro: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
