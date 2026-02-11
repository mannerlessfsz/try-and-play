import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ApaeSessao {
  id: string;
  empresa_id: string;
  passo_atual: number;
  status: string;
  nome_sessao: string | null;
  plano_contas_arquivo: string | null;
  relatorio_arquivo: string | null;
  metadados: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApaePlanoContas {
  id: string;
  sessao_id: string;
  codigo: string;
  descricao: string;
  classificacao: string | null;
  cnpj: string;
  is_banco: boolean;
  is_aplicacao: boolean;
  created_at: string;
}

export interface ApaeRelatorioLinha {
  id: string;
  sessao_id: string;
  linha_numero: number;
  tipo_linha: string;
  par_id: number | null;
  col_a: string | null;
  col_b: string | null;
  col_c: string | null;
  col_d: string | null;
  col_e: string | null;
  col_f: string | null;
  col_g: string | null;
  col_h: string | null;
  col_i: string | null;
  created_at: string;
}

export interface ApaeResultado {
  id: string;
  sessao_id: string;
  par_id: number;
  fornecedor: string | null;
  conta_debito: string | null;
  conta_debito_codigo: string | null;
  centro_custo: string | null;
  n_doc: string | null;
  vencimento: string | null;
  valor: string | null;
  data_pagto: string | null;
  valor_pago: string | null;
  historico_original: string | null;
  historico_concatenado: string | null;
  conta_credito_codigo: string | null;
  status: string;
  created_at: string;
}

export function useApaeSessoes() {
  const { empresaAtiva } = useEmpresaAtiva();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const empresaId = empresaAtiva?.id;

  // Buscar sessões da empresa ativa
  const { data: sessoes = [], isLoading: loadingSessoes } = useQuery({
    queryKey: ["apae-sessoes", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("apae_sessoes")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ApaeSessao[];
    },
    enabled: !!empresaId,
  });

  // Criar nova sessão
  const criarSessao = useMutation({
    mutationFn: async (nome?: string) => {
      if (!empresaId) throw new Error("Nenhuma empresa ativa");
      const { data, error } = await supabase
        .from("apae_sessoes")
        .insert({
          empresa_id: empresaId,
          nome_sessao: nome || `Sessão ${new Date().toLocaleDateString("pt-BR")}`,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ApaeSessao;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["apae-sessoes", empresaId] }),
    onError: (e) => toast.error("Erro ao criar sessão: " + e.message),
  });

  // Atualizar sessão
  const atualizarSessao = useMutation({
    mutationFn: async (params: { id: string; passo_atual?: number; status?: string; plano_contas_arquivo?: string | null; relatorio_arquivo?: string | null; metadados?: Record<string, any> }) => {
      const { id, ...updates } = params;
      const updatePayload: Record<string, any> = {};
      if (updates.passo_atual !== undefined) updatePayload.passo_atual = updates.passo_atual;
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.plano_contas_arquivo !== undefined) updatePayload.plano_contas_arquivo = updates.plano_contas_arquivo;
      if (updates.relatorio_arquivo !== undefined) updatePayload.relatorio_arquivo = updates.relatorio_arquivo;
      if (updates.metadados !== undefined) updatePayload.metadados = updates.metadados;
      const { data, error } = await supabase
        .from("apae_sessoes")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ApaeSessao;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["apae-sessoes", empresaId] }),
  });

  // Deletar sessão (cascata deleta filhos)
  const deletarSessao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("apae_sessoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apae-sessoes", empresaId] });
      toast.success("Sessão removida");
    },
    onError: (e) => toast.error("Erro ao remover sessão: " + e.message),
  });

  // --- Plano de Contas ---
  const buscarPlanoContas = async (sessaoId: string) => {
    const allData: ApaePlanoContas[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from("apae_plano_contas")
        .select("*")
        .eq("sessao_id", sessaoId)
        .order("ordem", { ascending: true })
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      if (data && data.length > 0) {
        allData.push(...(data as ApaePlanoContas[]));
        offset += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  const salvarPlanoContas = useMutation({
    mutationFn: async ({ sessaoId, contas }: { sessaoId: string; contas: { codigo: string; descricao: string; classificacao?: string; cnpj?: string }[] }) => {
      // Limpar antigos
      await supabase.from("apae_plano_contas").delete().eq("sessao_id", sessaoId);
      // Inserir novos
      const rows = contas.map((c, idx) => ({
        sessao_id: sessaoId,
        codigo: c.codigo,
        descricao: c.descricao,
        classificacao: c.classificacao || null,
        cnpj: c.cnpj || "00000000000000",
        ordem: idx,
      }));
      // Insert em lotes de 500
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("apae_plano_contas").insert(batch);
        if (error) throw error;
      }
      return contas.length;
    },
    onSuccess: () => toast.success("Plano de contas salvo!"),
    onError: (e) => toast.error("Erro ao salvar plano: " + e.message),
  });

  // Atualizar flags de banco/aplicação
  const atualizarContaBanco = useMutation({
    mutationFn: async ({ id, is_banco, is_aplicacao }: { id: string; is_banco?: boolean; is_aplicacao?: boolean }) => {
      const updates: Record<string, boolean> = {};
      if (is_banco !== undefined) updates.is_banco = is_banco;
      if (is_aplicacao !== undefined) updates.is_aplicacao = is_aplicacao;
      const { error } = await supabase.from("apae_plano_contas").update(updates).eq("id", id);
      if (error) throw error;
    },
  });

  // --- Relatório ---
  const buscarRelatorioLinhas = async (sessaoId: string) => {
    const { data, error } = await supabase
      .from("apae_relatorio_linhas")
      .select("*")
      .eq("sessao_id", sessaoId)
      .order("linha_numero");
    if (error) throw error;
    return data as ApaeRelatorioLinha[];
  };

  const salvarRelatorioLinhas = useMutation({
    mutationFn: async ({ sessaoId, linhas }: { sessaoId: string; linhas: Omit<ApaeRelatorioLinha, "id" | "sessao_id" | "created_at">[] }) => {
      await supabase.from("apae_relatorio_linhas").delete().eq("sessao_id", sessaoId);
      const rows = linhas.map((l) => ({ sessao_id: sessaoId, ...l }));
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("apae_relatorio_linhas").insert(batch);
        if (error) throw error;
      }
      return linhas.length;
    },
    onError: (e) => toast.error("Erro ao salvar relatório: " + e.message),
  });

  // --- Resultados ---
  const buscarResultados = async (sessaoId: string) => {
    const { data, error } = await supabase
      .from("apae_resultados")
      .select("*")
      .eq("sessao_id", sessaoId)
      .order("par_id");
    if (error) throw error;
    return data as ApaeResultado[];
  };

  const salvarResultados = useMutation({
    mutationFn: async ({ sessaoId, resultados }: { sessaoId: string; resultados: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[] }) => {
      await supabase.from("apae_resultados").delete().eq("sessao_id", sessaoId);
      const rows = resultados.map((r) => ({ sessao_id: sessaoId, ...r }));
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("apae_resultados").insert(batch);
        if (error) throw error;
      }
      return resultados.length;
    },
    onError: (e) => toast.error("Erro ao salvar resultados: " + e.message),
  });

  return {
    sessoes,
    loadingSessoes,
    criarSessao,
    atualizarSessao,
    deletarSessao,
    buscarPlanoContas,
    salvarPlanoContas,
    atualizarContaBanco,
    buscarRelatorioLinhas,
    salvarRelatorioLinhas,
    buscarResultados,
    salvarResultados,
  };
}
