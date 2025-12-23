import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CategoriaFinanceira {
  id: string;
  empresa_id: string;
  nome: string;
  tipo: string;
  cor: string | null;
  icone: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CategoriaInput {
  empresa_id: string;
  nome: string;
  tipo: string;
  cor?: string;
  icone?: string;
}

export function useCategorias(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["categorias_financeiras", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from("categorias_financeiras")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as CategoriaFinanceira[];
    },
    enabled: !!empresaId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CategoriaInput) => {
      const { data, error } = await supabase
        .from("categorias_financeiras")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_financeiras", empresaId] });
      toast({ title: "Categoria criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar categoria", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CategoriaInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("categorias_financeiras")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_financeiras", empresaId] });
      toast({ title: "Categoria atualizada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar categoria", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categorias_financeiras")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_financeiras", empresaId] });
      toast({ title: "Categoria removida" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover categoria", description: error.message, variant: "destructive" });
    },
  });

  return {
    categorias: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createCategoria: createMutation.mutate,
    updateCategoria: updateMutation.mutate,
    deleteCategoria: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
