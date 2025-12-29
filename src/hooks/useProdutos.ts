import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Produto = Tables<"produtos"> & {
  categoria?: Tables<"categorias_produtos"> | null;
  unidade?: Tables<"unidades_medida"> | null;
};

export type CategoriaProduto = Tables<"categorias_produtos">;
export type UnidadeMedida = Tables<"unidades_medida">;
export type ProdutoInsert = TablesInsert<"produtos">;
export type ProdutoUpdate = TablesUpdate<"produtos">;

export function useProdutos(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("produtos")
        .select(`
          *,
          categoria:categorias_produtos(*),
          unidade:unidades_medida(*)
        `)
        .eq("empresa_id", empresaId)
        .order("nome");
      if (error) throw error;
      return data as Produto[];
    },
    enabled: !!empresaId,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias-produtos", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("categorias_produtos")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades-medida", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("unidades_medida")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("codigo");
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const addProduto = useMutation({
    mutationFn: async (produto: ProdutoInsert) => {
      const { data, error } = await supabase
        .from("produtos")
        .insert(produto)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos", empresaId] });
      toast({ title: "Produto cadastrado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cadastrar produto", description: error.message, variant: "destructive" });
    },
  });

  const updateProduto = useMutation({
    mutationFn: async ({ id, ...updates }: ProdutoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("produtos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos", empresaId] });
      toast({ title: "Produto atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar produto", description: error.message, variant: "destructive" });
    },
  });

  const deleteProduto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos", empresaId] });
      toast({ title: "Produto excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir produto", description: error.message, variant: "destructive" });
    },
  });

  return {
    produtos,
    categorias,
    unidades,
    isLoading,
    addProduto,
    updateProduto,
    deleteProduto,
  };
}
