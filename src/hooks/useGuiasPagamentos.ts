import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GuiaPagamento {
  id: string;
  empresa_id: string;
  numero_nota: string;
  valor_guia: number;
  data_nota: string | null;
  data_pagamento: string | null;
  numero_doc_pagamento: string | null;
  codigo_barras: string | null;
  produto: string | null;
  credito_icms_proprio: string | null;
  credito_icms_st: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type GuiaPagamentoInsert = Omit<GuiaPagamento, "id" | "created_at" | "updated_at">;

export function useGuiasPagamentos(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["guias_pagamentos", empresaId];

  const { data: guias = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("guias_pagamentos" as any)
        .select("*")
        .eq("empresa_id", empresaId)
        .order("data_nota", { ascending: false });
      if (error) throw error;
      return data as unknown as GuiaPagamento[];
    },
    enabled: !!empresaId,
  });

  const addGuia = useMutation({
    mutationFn: async (guia: GuiaPagamentoInsert) => {
      const { data, error } = await supabase
        .from("guias_pagamentos" as any)
        .insert(guia as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Guia adicionada com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao adicionar guia", description: err.message, variant: "destructive" });
    },
  });

  const deleteGuia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("guias_pagamentos" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Guia removida" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    },
  });

  const addMany = useMutation({
    mutationFn: async (guias: GuiaPagamentoInsert[]) => {
      const { data, error } = await supabase
        .from("guias_pagamentos" as any)
        .insert(guias as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: `${(data as any[]).length} guias importadas com sucesso` });
    },
    onError: (err: any) => {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    },
  });

  return { guias, isLoading, addGuia, deleteGuia, addMany };
}
