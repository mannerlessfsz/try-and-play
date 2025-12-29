import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Database } from "@/integrations/supabase/types";

export type Venda = Tables<"vendas"> & {
  cliente?: {
    id: string;
    nome: string;
    cpf_cnpj: string | null;
  } | null;
  itens?: VendaItem[];
};

export type VendaItem = Tables<"venda_itens"> & {
  produto?: {
    id: string;
    nome: string;
    codigo: string | null;
  };
};

type StatusPedido = Database["public"]["Enums"]["status_pedido"];

export function useVendas(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("vendas")
        .select(`
          *,
          cliente:clientes(id, nome, cpf_cnpj)
        `)
        .eq("empresa_id", empresaId)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return data as Venda[];
    },
    enabled: !!empresaId,
  });

  const getVendaComItens = async (vendaId: string) => {
    const { data, error } = await supabase
      .from("vendas")
      .select(`
        *,
        cliente:clientes(id, nome, cpf_cnpj),
        itens:venda_itens(
          *,
          produto:produtos(id, nome, codigo)
        )
      `)
      .eq("id", vendaId)
      .single();
    if (error) throw error;
    return data as Venda;
  };

  const addVenda = useMutation({
    mutationFn: async ({ itens, ...venda }: {
      empresa_id: string;
      cliente_id?: string | null;
      data_venda?: string;
      status?: StatusPedido | null;
      subtotal?: number | null;
      desconto_valor?: number | null;
      desconto_percentual?: number | null;
      total?: number | null;
      forma_pagamento?: string | null;
      observacoes?: string | null;
      vendedor_id?: string | null;
      comissao_percentual?: number | null;
      comissao_valor?: number | null;
      itens: {
        produto_id: string;
        quantidade: number;
        preco_unitario: number;
        desconto_valor?: number | null;
        desconto_percentual?: number | null;
        total: number;
      }[];
    }) => {
      // Insert venda
      const { data: vendaData, error: vendaError } = await supabase
        .from("vendas")
        .insert(venda)
        .select()
        .single();
      if (vendaError) throw vendaError;

      // Insert items
      if (itens.length > 0) {
        const itensWithVendaId = itens.map(item => ({
          ...item,
          venda_id: vendaData.id,
        }));
        const { error: itensError } = await supabase
          .from("venda_itens")
          .insert(itensWithVendaId);
        if (itensError) throw itensError;
      }

      return vendaData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas", empresaId] });
      toast({ title: "Venda registrada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar venda", description: error.message, variant: "destructive" });
    },
  });

  const updateVendaStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusPedido }) => {
      const { data, error } = await supabase
        .from("vendas")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas", empresaId] });
      toast({ title: "Status da venda atualizado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    },
  });

  const cancelarVenda = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("vendas")
        .update({ status: "cancelado" as StatusPedido })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas", empresaId] });
      toast({ title: "Venda cancelada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cancelar venda", description: error.message, variant: "destructive" });
    },
  });

  // Calculate metrics
  const totalVendas = vendas.reduce((sum, v) => v.status !== "cancelado" ? sum + Number(v.total || 0) : sum, 0);
  const vendasPendentes = vendas.filter(v => v.status === "pendente").length;
  const vendasFinalizadas = vendas.filter(v => v.status === "concluido").length;

  return {
    vendas,
    isLoading,
    getVendaComItens,
    addVenda,
    updateVendaStatus,
    cancelarVenda,
    totalVendas,
    vendasPendentes,
    vendasFinalizadas,
  };
}
