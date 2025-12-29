import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Database } from "@/integrations/supabase/types";

export type MovimentoEstoque = Tables<"estoque_movimentos"> & {
  produto?: {
    id: string;
    nome: string;
    codigo: string | null;
    estoque_atual: number | null;
  };
};

export type ProdutoEstoque = {
  id: string;
  codigo: string | null;
  nome: string;
  estoque_atual: number | null;
  estoque_minimo: number | null;
  preco_custo: number | null;
  preco_venda: number | null;
  categoria?: {
    nome: string;
  } | null;
  unidade?: {
    codigo: string;
  } | null;
};

type TipoMovimentoEstoque = Database["public"]["Enums"]["tipo_movimento_estoque"];

export function useEstoque(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: movimentos = [], isLoading: loadingMovimentos } = useQuery({
    queryKey: ["estoque-movimentos", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("estoque_movimentos")
        .select(`
          *,
          produto:produtos(id, nome, codigo, estoque_atual)
        `)
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as MovimentoEstoque[];
    },
    enabled: !!empresaId,
  });

  const { data: produtosEstoque = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ["produtos-estoque", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("produtos")
        .select(`
          id, codigo, nome, estoque_atual, estoque_minimo, preco_custo, preco_venda,
          categoria:categorias_produtos(nome),
          unidade:unidades_medida(codigo)
        `)
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as ProdutoEstoque[];
    },
    enabled: !!empresaId,
  });

  const addMovimento = useMutation({
    mutationFn: async (movimento: {
      empresa_id: string;
      produto_id: string;
      tipo: TipoMovimentoEstoque;
      quantidade: number;
      custo_unitario?: number | null;
      observacao?: string | null;
      documento_tipo?: string | null;
      documento_id?: string | null;
      lote?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("estoque_movimentos")
        .insert(movimento)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque-movimentos", empresaId] });
      queryClient.invalidateQueries({ queryKey: ["produtos-estoque", empresaId] });
      queryClient.invalidateQueries({ queryKey: ["produtos", empresaId] });
      toast({ title: "Movimento de estoque registrado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar movimento", description: error.message, variant: "destructive" });
    },
  });

  // Metrics
  const produtosAbaixoMinimo = produtosEstoque.filter(p => 
    p.estoque_minimo && p.estoque_atual !== null && p.estoque_atual < p.estoque_minimo
  ).length;

  const valorTotalEstoque = produtosEstoque.reduce((sum, p) => {
    const custo = p.preco_custo || 0;
    const qtd = p.estoque_atual || 0;
    return sum + (custo * qtd);
  }, 0);

  const totalProdutos = produtosEstoque.length;

  return {
    movimentos,
    produtosEstoque,
    isLoading: loadingMovimentos || loadingProdutos,
    addMovimento,
    produtosAbaixoMinimo,
    valorTotalEstoque,
    totalProdutos,
  };
}
