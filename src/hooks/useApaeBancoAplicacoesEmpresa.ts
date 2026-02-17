import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { toast } from "sonner";

export interface ApaeBancoAplicacaoEmpresa {
  id: string;
  empresa_id: string;
  banco_codigo: string;
  aplicacao1_codigo: string | null;
  aplicacao2_codigo: string | null;
  aplicacao3_codigo: string | null;
  aplicacao4_codigo: string | null;
  aplicacao5_codigo: string | null;
  nome_relatorio: string | null;
  created_at: string;
}

export function useApaeBancoAplicacoesEmpresa() {
  const { empresaAtiva } = useEmpresaAtiva();
  const empresaId = empresaAtiva?.id;
  const [mapeamentos, setMapeamentos] = useState<ApaeBancoAplicacaoEmpresa[]>([]);
  const [loading, setLoading] = useState(false);

  const buscar = useCallback(async (): Promise<ApaeBancoAplicacaoEmpresa[]> => {
    if (!empresaId) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("apae_banco_aplicacoes_empresa")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("banco_codigo");
      if (error) throw error;
      const rows = (data as ApaeBancoAplicacaoEmpresa[]) || [];
      setMapeamentos(rows);
      return rows;
    } catch (e: any) {
      toast.error("Erro ao buscar mapeamentos: " + e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  const atualizar = useCallback(async (id: string, updates: Partial<Pick<ApaeBancoAplicacaoEmpresa, "banco_codigo" | "aplicacao1_codigo" | "aplicacao2_codigo" | "aplicacao3_codigo" | "aplicacao4_codigo" | "aplicacao5_codigo" | "nome_relatorio">>) => {
    const { error } = await supabase
      .from("apae_banco_aplicacoes_empresa")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    setMapeamentos((prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const sincronizar = useCallback(async (bancoCodigos: string[]): Promise<number> => {
    if (!empresaId) return 0;
    setLoading(true);
    try {
      const { data: existentes, error: fetchErr } = await supabase
        .from("apae_banco_aplicacoes_empresa")
        .select("*")
        .eq("empresa_id", empresaId);
      if (fetchErr) throw fetchErr;

      const existing = (existentes as ApaeBancoAplicacaoEmpresa[]) || [];
      const existingSet = new Set(existing.map((m) => m.banco_codigo));
      const desiredSet = new Set(bancoCodigos);

      const toAdd = bancoCodigos.filter((c) => !existingSet.has(c));
      if (toAdd.length > 0) {
        const rows = toAdd.map((banco_codigo) => ({ empresa_id: empresaId, banco_codigo }));
        const { error: insertErr } = await supabase
          .from("apae_banco_aplicacoes_empresa")
          .insert(rows);
        if (insertErr) throw insertErr;
      }

      const toRemove = existing.filter((m) => !desiredSet.has(m.banco_codigo));
      if (toRemove.length > 0) {
        const ids = toRemove.map((m) => m.id);
        const { error: delErr } = await supabase
          .from("apae_banco_aplicacoes_empresa")
          .delete()
          .in("id", ids);
        if (delErr) throw delErr;
      }

      const { data: final, error: finalErr } = await supabase
        .from("apae_banco_aplicacoes_empresa")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("banco_codigo");
      if (finalErr) throw finalErr;

      const result = (final as ApaeBancoAplicacaoEmpresa[]) || [];
      setMapeamentos(result);
      return result.length;
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + e.message);
      return 0;
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  /** Copiar mapeamentos da empresa para uma sessão */
  const copiarParaSessao = useCallback(async (sessaoId: string) => {
    if (mapeamentos.length === 0) return;
    // Limpar mapeamentos da sessão
    await supabase.from("apae_banco_aplicacoes").delete().eq("sessao_id", sessaoId);
    const rows = mapeamentos.map((m) => ({
      sessao_id: sessaoId,
      banco_codigo: m.banco_codigo,
      aplicacao1_codigo: m.aplicacao1_codigo,
      aplicacao2_codigo: m.aplicacao2_codigo,
      aplicacao3_codigo: m.aplicacao3_codigo,
      aplicacao4_codigo: m.aplicacao4_codigo,
      aplicacao5_codigo: m.aplicacao5_codigo,
      nome_relatorio: m.nome_relatorio,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase.from("apae_banco_aplicacoes").insert(batch);
      if (error) throw error;
    }
  }, [mapeamentos]);

  return { mapeamentos, loading, buscar, atualizar, sincronizar, copiarParaSessao, temMapeamentos: mapeamentos.length > 0 };
}
