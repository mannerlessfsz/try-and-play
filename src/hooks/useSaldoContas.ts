import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContasBancarias, ContaBancaria } from "@/hooks/useContasBancarias";

export interface SaldoConta {
  conta: ContaBancaria;
  saldoInicial: number;
  totalReceitas: number;
  totalDespesas: number;
  saldoAtual: number;
}

export function useSaldoContas(empresaId: string | undefined) {
  const { contas, isLoading: isLoadingContas } = useContasBancarias(empresaId);

  // Fetch all reconciled transactions for this empresa
  const { data: transacoes, isLoading: isLoadingTransacoes } = useQuery({
    queryKey: ["transacoes-conciliadas-saldo", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from("transacoes")
        .select("id, tipo, valor, conta_bancaria_id, status, conciliado")
        .eq("empresa_id", empresaId)
        .eq("status", "pago") // Only paid transactions count for balance
        .not("conta_bancaria_id", "is", null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId,
  });

  // Calculate balance for each account
  const saldos = useMemo((): SaldoConta[] => {
    if (!contas || !transacoes) return [];

    return contas.map(conta => {
      const transacoesDaConta = transacoes.filter(t => t.conta_bancaria_id === conta.id);
      
      const totalReceitas = transacoesDaConta
        .filter(t => t.tipo === "receita")
        .reduce((acc, t) => acc + Number(t.valor), 0);
      
      const totalDespesas = transacoesDaConta
        .filter(t => t.tipo === "despesa")
        .reduce((acc, t) => acc + Number(t.valor), 0);

      const saldoInicial = conta.saldo_inicial || 0;
      const saldoAtual = saldoInicial + totalReceitas - totalDespesas;

      return {
        conta,
        saldoInicial,
        totalReceitas,
        totalDespesas,
        saldoAtual,
      };
    });
  }, [contas, transacoes]);

  // Get saldo for a specific account
  const getSaldoConta = (contaId: string): SaldoConta | undefined => {
    return saldos.find(s => s.conta.id === contaId);
  };

  // Get total balance across all accounts
  const saldoTotal = useMemo(() => {
    return saldos.reduce((acc, s) => acc + s.saldoAtual, 0);
  }, [saldos]);

  return {
    saldos,
    getSaldoConta,
    saldoTotal,
    isLoading: isLoadingContas || isLoadingTransacoes,
  };
}
