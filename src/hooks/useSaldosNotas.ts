import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SaldoNota {
  id: string;
  empresa_id: string;
  guia_id: string;
  numero_nota: string;
  competencia_ano: number;
  competencia_mes: number;
  saldo_remanescente: number;
  quantidade_original: number;
  quantidade_consumida: number;
  created_at: string;
  updated_at: string;
}

export type SaldoNotaInsert = Omit<SaldoNota, "id" | "created_at" | "updated_at">;

export function useSaldosNotas(empresaId: string | undefined, competenciaAno?: number, competenciaMes?: number) {
  const queryClient = useQueryClient();
  const queryKey = ["controle_saldos_notas", empresaId, competenciaAno, competenciaMes];

  // Saldos da competência ATUAL (para restaurar confirmações)
  const { data: saldos = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresaId || !competenciaAno || !competenciaMes) return [];
      const { data, error } = await supabase
        .from("controle_saldos_notas" as any)
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("competencia_ano", competenciaAno)
        .eq("competencia_mes", competenciaMes);
      if (error) throw error;
      return data as unknown as SaldoNota[];
    },
    enabled: !!empresaId && !!competenciaAno && !!competenciaMes,
  });

  // Saldos do mês anterior para sugestão
  const getSaldosMesAnterior = (ano: number, mes: number) => {
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anoAnterior = mes === 1 ? ano - 1 : ano;
    return { mesAnterior, anoAnterior };
  };

  const { data: saldosMesAnterior = [], isLoading: isLoadingSugestoes } = useQuery({
    queryKey: ["controle_saldos_notas_anterior", empresaId, competenciaAno, competenciaMes],
    queryFn: async () => {
      if (!empresaId || !competenciaAno || !competenciaMes) return [];
      const { mesAnterior, anoAnterior } = getSaldosMesAnterior(competenciaAno, competenciaMes);
      const { data, error } = await supabase
        .from("controle_saldos_notas" as any)
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("competencia_ano", anoAnterior)
        .eq("competencia_mes", mesAnterior);
      if (error) throw error;
      return data as unknown as SaldoNota[];
    },
    enabled: !!empresaId && !!competenciaAno && !!competenciaMes,
  });

  // Salvar saldos em lote (usado pelo Step 2)
  const salvarSaldos = useMutation({
    mutationFn: async (items: SaldoNotaInsert[]) => {
      if (items.length === 0) return;
      const { error } = await supabase
        .from("controle_saldos_notas" as any)
        .upsert(items as any, {
          onConflict: "empresa_id,guia_id,competencia_ano,competencia_mes",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Saldos remanescentes salvos com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar saldos: " + err.message);
    },
  });

  // Salvar/remover confirmação individual (Step 1)
  const salvarConfirmacao = useMutation({
    mutationFn: async ({ guiaId, numeroNota, saldoAnterior, quantidade, confirmar }: {
      guiaId: string;
      numeroNota: string;
      saldoAnterior: number;
      quantidade: number;
      confirmar: boolean;
    }) => {
      if (!empresaId || !competenciaAno || !competenciaMes) return;

      if (confirmar) {
        const { error } = await supabase
          .from("controle_saldos_notas" as any)
          .upsert({
            empresa_id: empresaId,
            guia_id: guiaId,
            numero_nota: numeroNota,
            competencia_ano: competenciaAno,
            competencia_mes: competenciaMes,
            saldo_remanescente: quantidade - saldoAnterior,
            quantidade_original: quantidade,
            quantidade_consumida: saldoAnterior,
          } as any, {
            onConflict: "empresa_id,guia_id,competencia_ano,competencia_mes",
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("controle_saldos_notas" as any)
          .delete()
          .eq("empresa_id", empresaId)
          .eq("guia_id", guiaId)
          .eq("competencia_ano", competenciaAno)
          .eq("competencia_mes", competenciaMes);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar confirmação: " + err.message);
    },
  });

  // Mapa de guia_id -> quantidade_consumida do mês anterior (para sugestão como "saldo anterior" no form)
  const sugestoesSaldoAnterior = new Map<string, number>();
  saldosMesAnterior.forEach(s => {
    if (s.quantidade_consumida > 0) {
      sugestoesSaldoAnterior.set(s.guia_id, s.quantidade_consumida);
    }
  });

  return {
    saldos,
    isLoading,
    saldosMesAnterior,
    isLoadingSugestoes,
    sugestoesSaldoAnterior,
    salvarSaldos,
    salvarConfirmacao,
  };
}
