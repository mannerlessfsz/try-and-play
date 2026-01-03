import { useMemo } from "react";
import { useTransacoes } from "./useTransacoes";
import { addDays, isBefore, isAfter, startOfDay, parseISO } from "date-fns";

export interface ParcelaAlerta {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  parcela_numero: number | null;
  parcela_total: number | null;
  tipo: "vencendo" | "atrasada";
  dias: number; // dias até vencimento (negativo = atrasada)
  categoria_nome?: string;
}

export interface ParcelasAlertaResult {
  parcelasVencendo: ParcelaAlerta[];
  parcelasAtrasadas: ParcelaAlerta[];
  totalVencendo: number;
  totalAtrasadas: number;
  totalValorVencendo: number;
  totalValorAtrasadas: number;
  hasAlertas: boolean;
  loading: boolean;
}

export function useParcelasAlerta(empresaId: string | undefined): ParcelasAlertaResult {
  const { transacoes, isLoading } = useTransacoes(empresaId, {
    status: "pendente",
  });

  const result = useMemo(() => {
    if (!transacoes || transacoes.length === 0) {
      return {
        parcelasVencendo: [],
        parcelasAtrasadas: [],
        totalVencendo: 0,
        totalAtrasadas: 0,
        totalValorVencendo: 0,
        totalValorAtrasadas: 0,
        hasAlertas: false,
      };
    }

    const hoje = startOfDay(new Date());
    const limiteFuturo = addDays(hoje, 7); // próximos 7 dias

    const parcelasVencendo: ParcelaAlerta[] = [];
    const parcelasAtrasadas: ParcelaAlerta[] = [];

    transacoes.forEach((t) => {
      // Só considera transações pendentes com data de vencimento
      if (t.status !== "pendente" || !t.data_vencimento) return;

      const dataVenc = startOfDay(parseISO(t.data_vencimento));
      const diffTime = dataVenc.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Cast to access parcela fields from the raw database response
      const rawT = t as typeof t & { parcela_numero?: number | null; parcela_total?: number | null };

      const parcela: ParcelaAlerta = {
        id: t.id,
        descricao: t.descricao,
        valor: t.valor,
        data_vencimento: t.data_vencimento,
        parcela_numero: rawT.parcela_numero ?? null,
        parcela_total: rawT.parcela_total ?? null,
        tipo: diffDays < 0 ? "atrasada" : "vencendo",
        dias: diffDays,
        categoria_nome: t.categoria?.nome,
      };

      if (isBefore(dataVenc, hoje)) {
        // Atrasada
        parcelasAtrasadas.push(parcela);
      } else if (!isAfter(dataVenc, limiteFuturo)) {
        // Vencendo nos próximos 7 dias
        parcelasVencendo.push(parcela);
      }
    });

    // Ordena por data de vencimento
    parcelasVencendo.sort((a, b) => a.dias - b.dias);
    parcelasAtrasadas.sort((a, b) => a.dias - b.dias); // mais atrasadas primeiro

    const totalValorVencendo = parcelasVencendo.reduce((acc, p) => acc + p.valor, 0);
    const totalValorAtrasadas = parcelasAtrasadas.reduce((acc, p) => acc + p.valor, 0);

    return {
      parcelasVencendo,
      parcelasAtrasadas,
      totalVencendo: parcelasVencendo.length,
      totalAtrasadas: parcelasAtrasadas.length,
      totalValorVencendo,
      totalValorAtrasadas,
      hasAlertas: parcelasVencendo.length > 0 || parcelasAtrasadas.length > 0,
    };
  }, [transacoes]);

  return {
    ...result,
    loading: isLoading,
  };
}
