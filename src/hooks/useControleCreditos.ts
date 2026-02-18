import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ControleStatus = "aberto" | "conferido" | "fechado";

export interface ControleCredito {
  id: string;
  empresa_id: string;
  competencia_mes: number;
  competencia_ano: number;
  saldo_anterior: number;
  credito_periodo: number;
  utilizado_periodo: number;
  estornado_periodo: number;
  saldo_final: number;
  total_guias: number;
  guias_utilizaveis: number;
  guias_utilizadas: number;
  guias_nao_pagas: number;
  status: ControleStatus;
  observacoes: string | null;
  conferido_por: string | null;
  conferido_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface ControleGuiaDetalhe {
  id: string;
  controle_id: string;
  guia_id: string;
  numero_nota: string;
  valor_guia: number;
  credito_icms_st: number;
  credito_icms_proprio: number;
  valor_utilizado: number;
  status_guia: string | null;
  observacao: string | null;
  created_at: string;
}

export function useControleCreditos(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["controle_creditos_icms_st", empresaId];

  const { data: controles = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("controle_creditos_icms_st" as any)
        .select("*")
        .eq("empresa_id", empresaId)
        .order("competencia_ano", { ascending: false })
        .order("competencia_mes", { ascending: false });
      if (error) throw error;
      return data as unknown as ControleCredito[];
    },
    enabled: !!empresaId,
  });

  const upsertControle = useMutation({
    mutationFn: async (controle: Omit<ControleCredito, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("controle_creditos_icms_st" as any)
        .upsert(controle as any, { onConflict: "empresa_id,competencia_mes,competencia_ano" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ControleCredito;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar controle", description: err.message, variant: "destructive" });
    },
  });

  const updateControle = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ControleCredito> & { id: string }) => {
      const { data, error } = await supabase
        .from("controle_creditos_icms_st" as any)
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

  // Detalhes de guias para um controle específico
  const useControleGuias = (controleId: string | undefined) => {
    return useQuery({
      queryKey: ["controle_creditos_guias", controleId],
      queryFn: async () => {
        if (!controleId) return [];
        const { data, error } = await supabase
          .from("controle_creditos_guias" as any)
          .select("*")
          .eq("controle_id", controleId)
          .order("numero_nota");
        if (error) throw error;
        return data as unknown as ControleGuiaDetalhe[];
      },
      enabled: !!controleId,
    });
  };

  const upsertGuiasDetalhe = useMutation({
    mutationFn: async ({ controleId, guias }: { controleId: string; guias: Omit<ControleGuiaDetalhe, "id" | "created_at">[] }) => {
      // Delete existing and re-insert
      await supabase.from("controle_creditos_guias" as any).delete().eq("controle_id", controleId);
      if (guias.length > 0) {
        const { error } = await supabase
          .from("controle_creditos_guias" as any)
          .insert(guias.map(g => ({ ...g, controle_id: controleId })) as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["controle_creditos_guias", vars.controleId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar detalhes", description: err.message, variant: "destructive" });
    },
  });

  return { controles, isLoading, upsertControle, updateControle, useControleGuias, upsertGuiasDetalhe };
}
