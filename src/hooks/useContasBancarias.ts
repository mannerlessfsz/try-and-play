import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ContaBancaria {
  id: string;
  empresa_id: string;
  nome: string;
  banco: string;
  agencia: string | null;
  conta: string | null;
  tipo: string;
  saldo_inicial: number | null;
  cor: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContaBancariaInput {
  empresa_id: string;
  nome: string;
  banco: string;
  agencia?: string;
  conta?: string;
  tipo?: string;
  saldo_inicial?: number;
  cor?: string;
}

export function useContasBancarias(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["contas_bancarias", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as ContaBancaria[];
    },
    enabled: !!empresaId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: ContaBancariaInput) => {
      const { data, error } = await supabase
        .from("contas_bancarias")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_bancarias", empresaId] });
      toast({ title: "Conta bancária criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar conta bancária", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<ContaBancariaInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("contas_bancarias")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_bancarias", empresaId] });
      toast({ title: "Conta bancária atualizada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar conta bancária", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contas_bancarias")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_bancarias", empresaId] });
      toast({ title: "Conta bancária removida" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover conta bancária", description: error.message, variant: "destructive" });
    },
  });

  return {
    contas: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createConta: createMutation.mutate,
    updateConta: updateMutation.mutate,
    deleteConta: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
