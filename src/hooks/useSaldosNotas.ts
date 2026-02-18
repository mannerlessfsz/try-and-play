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

  // Busca saldos do mês anterior para sugerir como Saldo Anterior
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

  const salvarSaldos = useMutation({
    mutationFn: async (items: SaldoNotaInsert[]) => {
      if (items.length === 0) return;
      // Upsert: se já existe para empresa+guia+competência, atualiza
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

  // Mapa de guia_id -> saldo_remanescente do mês anterior (para sugestão)
  const sugestoesSaldoAnterior = new Map<string, number>();
  saldosMesAnterior.forEach(s => {
    if (s.saldo_remanescente > 0) {
      sugestoesSaldoAnterior.set(s.guia_id, s.saldo_remanescente);
    }
  });

  return {
    saldos,
    isLoading,
    saldosMesAnterior,
    isLoadingSugestoes,
    sugestoesSaldoAnterior,
    salvarSaldos,
  };
}
