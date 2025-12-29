import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Database } from "@/integrations/supabase/types";

export type Compra = Tables<"compras"> & {
  fornecedor?: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
    cpf_cnpj: string | null;
  } | null;
  itens?: CompraItem[];
};

export type CompraItem = Tables<"compra_itens"> & {
  produto?: {
    id: string;
    nome: string;
    codigo: string | null;
  };
};

type StatusPedido = Database["public"]["Enums"]["status_pedido"];

export function useCompras(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: compras = [], isLoading } = useQuery({
    queryKey: ["compras", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("compras")
        .select(`
          *,
          fornecedor:fornecedores(id, nome, nome_fantasia, cpf_cnpj)
        `)
        .eq("empresa_id", empresaId)
        .order("data_compra", { ascending: false });
      if (error) throw error;
      return data as Compra[];
    },
    enabled: !!empresaId,
  });

  const getCompraComItens = async (compraId: string) => {
    const { data, error } = await supabase
      .from("compras")
      .select(`
        *,
        fornecedor:fornecedores(id, nome, nome_fantasia, cpf_cnpj),
        itens:compra_itens(
          *,
          produto:produtos(id, nome, codigo)
        )
      `)
      .eq("id", compraId)
      .single();
    if (error) throw error;
    return data as Compra;
  };

  const addCompra = useMutation({
    mutationFn: async ({ itens, ...compra }: {
      empresa_id: string;
      fornecedor_id?: string | null;
      data_compra?: string;
      status?: StatusPedido | null;
      subtotal?: number | null;
      desconto_valor?: number | null;
      desconto_percentual?: number | null;
      frete?: number | null;
      outras_despesas?: number | null;
      total?: number | null;
      forma_pagamento?: string | null;
      observacoes?: string | null;
      itens: {
        produto_id: string;
        quantidade: number;
        preco_unitario: number;
        desconto_valor?: number | null;
        desconto_percentual?: number | null;
        total: number;
      }[];
    }) => {
      // Insert compra
      const { data: compraData, error: compraError } = await supabase
        .from("compras")
        .insert(compra)
        .select()
        .single();
      if (compraError) throw compraError;

      // Insert items
      if (itens.length > 0) {
        const itensWithCompraId = itens.map(item => ({
          ...item,
          compra_id: compraData.id,
        }));
        const { error: itensError } = await supabase
          .from("compra_itens")
          .insert(itensWithCompraId);
        if (itensError) throw itensError;
      }

      return compraData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras", empresaId] });
      toast({ title: "Compra registrada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar compra", description: error.message, variant: "destructive" });
    },
  });

  const updateCompraStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusPedido }) => {
      const { data, error } = await supabase
        .from("compras")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras", empresaId] });
      toast({ title: "Status da compra atualizado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    },
  });

  const cancelarCompra = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("compras")
        .update({ status: "cancelado" as StatusPedido })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras", empresaId] });
      toast({ title: "Compra cancelada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cancelar compra", description: error.message, variant: "destructive" });
    },
  });

  // Calculate metrics
  const totalCompras = compras.reduce((sum, c) => c.status !== "cancelado" ? sum + Number(c.total || 0) : sum, 0);
  const comprasPendentes = compras.filter(c => c.status === "pendente").length;
  const comprasRecebidas = compras.filter(c => c.status === "concluido").length;

  return {
    compras,
    isLoading,
    getCompraComItens,
    addCompra,
    updateCompraStatus,
    cancelarCompra,
    totalCompras,
    comprasPendentes,
    comprasRecebidas,
  };
}
