import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Transacao {
  id: string;
  empresa_id: string;
  descricao: string;
  valor: number;
  tipo: string;
  status: string;
  data_transacao: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  categoria_id: string | null;
  conta_bancaria_id: string | null;
  centro_custo_id: string | null;
  cliente_id: string | null;
  forma_pagamento: string | null;
  numero_documento: string | null;
  observacoes: string | null;
  conciliado: boolean | null;
  competencia_ano: number | null;
  competencia_mes: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  categoria?: { id: string; nome: string; cor: string | null } | null;
  conta_bancaria?: { id: string; nome: string; banco: string } | null;
  cliente?: { id: string; nome: string; cpf_cnpj: string | null; tipo_pessoa: string | null } | null;
}

export interface TransacaoInput {
  empresa_id: string;
  descricao: string;
  valor: number;
  tipo: string;
  status?: string;
  data_transacao?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  categoria_id?: string;
  conta_bancaria_id?: string;
  centro_custo_id?: string;
  cliente_id?: string;
  forma_pagamento?: string;
  numero_documento?: string;
  observacoes?: string;
  competencia_ano?: number;
  competencia_mes?: number;
  conciliado?: boolean;
}

// Options for filtering transactions

interface UseTransacoesOptions {
  tipo?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function useTransacoes(empresaId: string | undefined, options: UseTransacoesOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["transacoes", empresaId, options],
    queryFn: async () => {
      if (!empresaId) return [];
      
      let queryBuilder = supabase
        .from("transacoes")
        .select(`
          *,
          categoria:categorias_financeiras(id, nome, cor),
          conta_bancaria:contas_bancarias!transacoes_conta_bancaria_id_fkey(id, nome, banco),
          cliente:clientes(id, nome, cpf_cnpj, tipo_pessoa)
        `)
        .eq("empresa_id", empresaId)
        .order("data_transacao", { ascending: false });

      if (options.tipo) {
        queryBuilder = queryBuilder.eq("tipo", options.tipo);
      }
      if (options.status) {
        queryBuilder = queryBuilder.eq("status", options.status);
      }
      if (options.dataInicio) {
        queryBuilder = queryBuilder.gte("data_transacao", options.dataInicio);
      }
      if (options.dataFim) {
        queryBuilder = queryBuilder.lte("data_transacao", options.dataFim);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data as Transacao[];
    },
    enabled: !!empresaId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: TransacaoInput) => {
      const { data, error } = await supabase
        .from("transacoes")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes", empresaId] });
      toast({ title: "Transação criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar transação", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<TransacaoInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("transacoes")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes", empresaId] });
      toast({ title: "Transação atualizada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar transação", description: error.message, variant: "destructive" });
    },
  });

  // Conciliar uma transação (marcar como conciliado)
  const conciliarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("transacoes")
        .update({ conciliado: true, data_conciliacao: new Date().toISOString().split('T')[0] })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes", empresaId] });
    },
    onError: (error) => {
      toast({ title: "Erro ao conciliar transação", description: error.message, variant: "destructive" });
    },
  });

  // Conciliar várias transações em massa
  const conciliarEmMassaMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase
        .from("transacoes")
        .update({ conciliado: true, data_conciliacao: new Date().toISOString().split('T')[0] })
        .in("id", ids)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transacoes", empresaId] });
      toast({ title: `${data?.length || 0} transações conciliadas` });
    },
    onError: (error) => {
      toast({ title: "Erro ao conciliar transações", description: error.message, variant: "destructive" });
    },
  });

  // Desconciliar várias transações em massa (usado ao deletar extrato)
  const desconciliarEmMassaMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return [];
      
      const { data, error } = await supabase
        .from("transacoes")
        .update({ conciliado: false, data_conciliacao: null })
        .in("id", ids)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transacoes", empresaId] });
    },
    onError: (error) => {
      toast({ title: "Erro ao desconciliar transações", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transacoes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacoes", empresaId] });
      toast({ title: "Transação removida" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover transação", description: error.message, variant: "destructive" });
    },
  });

  // Calculate totals
  const transacoes = query.data || [];
  const totalReceitas = transacoes
    .filter(t => t.tipo === "receita" && t.status === "pago")
    .reduce((acc, t) => acc + Number(t.valor), 0);
  const totalDespesas = transacoes
    .filter(t => t.tipo === "despesa" && t.status === "pago")
    .reduce((acc, t) => acc + Number(t.valor), 0);
  const saldo = totalReceitas - totalDespesas;
  const pendentes = transacoes.filter(t => t.status === "pendente").length;

  return {
    transacoes,
    isLoading: query.isLoading,
    error: query.error,
    createTransacao: createMutation.mutate,
    createTransacaoAsync: createMutation.mutateAsync,
    updateTransacao: updateMutation.mutate,
    deleteTransacao: deleteMutation.mutate,
    conciliarTransacao: conciliarMutation.mutate,
    conciliarTransacaoAsync: conciliarMutation.mutateAsync,
    conciliarEmMassa: conciliarEmMassaMutation.mutate,
    conciliarEmMassaAsync: conciliarEmMassaMutation.mutateAsync,
    desconciliarEmMassaAsync: desconciliarEmMassaMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isConciliando: conciliarMutation.isPending || conciliarEmMassaMutation.isPending,
    totalReceitas,
    totalDespesas,
    saldo,
    pendentes,
  };
}
