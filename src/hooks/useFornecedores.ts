import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Fornecedor = Tables<"fornecedores">;
export type FornecedorInsert = TablesInsert<"fornecedores">;
export type FornecedorUpdate = TablesUpdate<"fornecedores">;

export function useFornecedores(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ["fornecedores", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const addFornecedor = useMutation({
    mutationFn: async (fornecedor: FornecedorInsert) => {
      const { data, error } = await supabase
        .from("fornecedores")
        .insert(fornecedor)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores", empresaId] });
      toast({ title: "Fornecedor cadastrado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cadastrar fornecedor", description: error.message, variant: "destructive" });
    },
  });

  const updateFornecedor = useMutation({
    mutationFn: async ({ id, ...updates }: FornecedorUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("fornecedores")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores", empresaId] });
      toast({ title: "Fornecedor atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar fornecedor", description: error.message, variant: "destructive" });
    },
  });

  const deleteFornecedor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores", empresaId] });
      toast({ title: "Fornecedor excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir fornecedor", description: error.message, variant: "destructive" });
    },
  });

  return {
    fornecedores,
    isLoading,
    addFornecedor,
    updateFornecedor,
    deleteFornecedor,
  };
}
