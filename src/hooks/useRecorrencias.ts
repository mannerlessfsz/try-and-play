import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Recorrencia {
  id: string;
  empresa_id: string;
  descricao: string;
  valor: number;
  tipo: string;
  frequencia: string;
  dia_vencimento: number | null;
  dia_semana: number | null;
  data_inicio: string;
  data_fim: string | null;
  proxima_geracao: string;
  categoria_id: string | null;
  conta_bancaria_id: string | null;
  centro_custo_id: string | null;
  gerar_automatico: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  categoria?: { id: string; nome: string; cor: string | null } | null;
  conta_bancaria?: { id: string; nome: string; banco: string } | null;
}

export interface RecorrenciaInput {
  empresa_id: string;
  descricao: string;
  valor: number;
  tipo: string;
  frequencia: string;
  dia_vencimento?: number;
  dia_semana?: number;
  data_inicio: string;
  data_fim?: string;
  proxima_geracao: string;
  categoria_id?: string;
  conta_bancaria_id?: string;
  centro_custo_id?: string;
  gerar_automatico?: boolean;
}

export function useRecorrencias(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["recorrencias", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from("recorrencias")
        .select(`
          *,
          categoria:categorias_financeiras(id, nome, cor),
          conta_bancaria:contas_bancarias(id, nome, banco)
        `)
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("proxima_geracao", { ascending: true });

      if (error) throw error;
      return data as Recorrencia[];
    },
    enabled: !!empresaId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: RecorrenciaInput) => {
      const { data, error } = await supabase
        .from("recorrencias")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recorrencias", empresaId] });
      toast({ title: "Recorrência criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar recorrência", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<RecorrenciaInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("recorrencias")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recorrencias", empresaId] });
      toast({ title: "Recorrência atualizada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar recorrência", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recorrencias")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recorrencias", empresaId] });
      toast({ title: "Recorrência desativada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao desativar recorrência", description: error.message, variant: "destructive" });
    },
  });

  // Calculate metrics
  const recorrencias = query.data || [];
  const receitas = recorrencias.filter(r => r.tipo === "receita");
  const despesas = recorrencias.filter(r => r.tipo === "despesa");
  const totalMensal = recorrencias
    .filter(r => r.frequencia === "mensal")
    .reduce((acc, r) => acc + (r.tipo === "receita" ? r.valor : -r.valor), 0);

  return {
    recorrencias,
    receitas,
    despesas,
    totalMensal,
    isLoading: query.isLoading,
    error: query.error,
    createRecorrencia: createMutation.mutate,
    updateRecorrencia: updateMutation.mutate,
    deleteRecorrencia: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
