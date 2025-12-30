import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  desconto_percentual: number | null;
  desconto_valor: number | null;
  total: number;
  observacao: string | null;
  created_at: string;
}

export interface Orcamento {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  numero: number | null;
  titulo: string;
  descricao: string | null;
  data_orcamento: string;
  data_validade: string | null;
  status: string;
  subtotal: number | null;
  desconto_percentual: number | null;
  desconto_valor: number | null;
  total: number | null;
  condicao_pagamento: string | null;
  observacoes: string | null;
  observacoes_internas: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  cliente?: {
    id: string;
    nome: string;
    cpf_cnpj: string | null;
  } | null;
  itens?: OrcamentoItem[];
}

export interface OrcamentoInput {
  empresa_id: string;
  cliente_id?: string | null;
  titulo: string;
  descricao?: string;
  data_orcamento?: string;
  data_validade?: string;
  status?: string;
  subtotal?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  total?: number;
  condicao_pagamento?: string;
  observacoes?: string;
  observacoes_internas?: string;
}

export interface OrcamentoItemInput {
  orcamento_id: string;
  descricao: string;
  quantidade: number;
  unidade?: string;
  valor_unitario: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  total: number;
  observacao?: string;
}

export function useOrcamentos(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orcamentos = [], isLoading } = useQuery({
    queryKey: ["orcamentos", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("orcamentos_servico")
        .select(`
          *,
          cliente:clientes(id, nome, cpf_cnpj)
        `)
        .eq("empresa_id", empresaId)
        .order("data_orcamento", { ascending: false });
      if (error) throw error;
      return data as Orcamento[];
    },
    enabled: !!empresaId,
  });

  const getOrcamentoComItens = async (orcamentoId: string) => {
    const { data, error } = await supabase
      .from("orcamentos_servico")
      .select(`
        *,
        cliente:clientes(id, nome, cpf_cnpj),
        itens:orcamento_itens(*)
      `)
      .eq("id", orcamentoId)
      .single();
    if (error) throw error;
    return data as Orcamento;
  };

  const addOrcamento = useMutation({
    mutationFn: async ({ itens, ...orcamento }: OrcamentoInput & { itens?: Omit<OrcamentoItemInput, "orcamento_id">[] }) => {
      // Insert orcamento
      const { data: orcamentoData, error: orcamentoError } = await supabase
        .from("orcamentos_servico")
        .insert(orcamento)
        .select()
        .single();
      if (orcamentoError) throw orcamentoError;

      // Insert items if provided
      if (itens && itens.length > 0) {
        const itensWithOrcamentoId = itens.map(item => ({
          ...item,
          orcamento_id: orcamentoData.id,
        }));
        const { error: itensError } = await supabase
          .from("orcamento_itens")
          .insert(itensWithOrcamentoId);
        if (itensError) throw itensError;
      }

      return orcamentoData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos", empresaId] });
      toast({ title: "Orçamento criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar orçamento", description: error.message, variant: "destructive" });
    },
  });

  const updateOrcamento = useMutation({
    mutationFn: async ({ id, ...data }: Partial<OrcamentoInput> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("orcamentos_servico")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos", empresaId] });
      toast({ title: "Orçamento atualizado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar orçamento", description: error.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("orcamentos_servico")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos", empresaId] });
      queryClient.invalidateQueries({ queryKey: ["transacoes", empresaId] });
      
      if (data.status === 'convertido') {
        toast({ title: "Orçamento aprovado e convertido em receita!" });
      } else {
        toast({ title: "Status do orçamento atualizado!" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    },
  });

  const deleteOrcamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("orcamentos_servico")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos", empresaId] });
      toast({ title: "Orçamento removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover orçamento", description: error.message, variant: "destructive" });
    },
  });

  // Calculate metrics
  const totalOrcamentos = orcamentos.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const orcamentosAbertos = orcamentos.filter(o => ['rascunho', 'enviado'].includes(o.status)).length;
  const orcamentosAprovados = orcamentos.filter(o => ['aprovado', 'convertido'].includes(o.status)).length;

  return {
    orcamentos,
    isLoading,
    getOrcamentoComItens,
    addOrcamento,
    updateOrcamento,
    updateStatus,
    deleteOrcamento,
    totalOrcamentos,
    orcamentosAbertos,
    orcamentosAprovados,
  };
}
