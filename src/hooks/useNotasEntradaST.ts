import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NotaEntradaST {
  id: string;
  empresa_id: string;
  nfe: string;
  fornecedor: string;
  competencia: string | null;
  ncm: string | null;
  quantidade: number;
  valor_produto: number;
  ipi: number;
  frete: number;
  desconto: number;
  valor_total: number;
  pct_mva: number;
  pct_icms_interno: number;
  pct_fecp: number;
  pct_icms_interestadual: number;
  bc_icms_st: number;
  valor_icms_nf: number;
  valor_icms_st: number;
  valor_fecp: number;
  valor_st_un: number;
  total_st: number;
  data_pagamento: string | null;
  chave_nfe: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type NotaEntradaSTInsert = Omit<NotaEntradaST, "id" | "created_at" | "updated_at">;

export function useNotasEntradaST(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["notas_entrada_st", empresaId];

  const { data: notas = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("notas_entrada_st" as any)
        .select("*")
        .eq("empresa_id", empresaId)
        .order("competencia", { ascending: true });
      if (error) throw error;
      return data as unknown as NotaEntradaST[];
    },
    enabled: !!empresaId,
  });

  const addNota = useMutation({
    mutationFn: async (nota: NotaEntradaSTInsert) => {
      const { data, error } = await supabase
        .from("notas_entrada_st" as any)
        .insert(nota as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Nota adicionada com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao adicionar nota", description: err.message, variant: "destructive" });
    },
  });

  const updateNota = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NotaEntradaST> & { id: string }) => {
      const { data, error } = await supabase
        .from("notas_entrada_st" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });

  const deleteNota = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notas_entrada_st" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Nota removida" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    },
  });

  const addMany = useMutation({
    mutationFn: async (notas: NotaEntradaSTInsert[]) => {
      const { data, error } = await supabase
        .from("notas_entrada_st" as any)
        .insert(notas as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: `${(data as any[]).length} notas importadas com sucesso` });
    },
    onError: (err: any) => {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    },
  });

  return { notas, isLoading, addNota, updateNota, deleteNota, addMany };
}
