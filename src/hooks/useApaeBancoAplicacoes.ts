import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ApaeBancoAplicacao {
  id: string;
  sessao_id: string;
  banco_codigo: string;
  aplicacao1_codigo: string;
  aplicacao2_codigo: string;
  aplicacao3_codigo: string;
  aplicacao4_codigo: string;
  aplicacao5_codigo: string;
  nome_relatorio: string | null;
  created_at: string;
}

export function useApaeBancoAplicacoes(sessaoId: string | null) {
  const [mapeamentos, setMapeamentos] = useState<ApaeBancoAplicacao[]>([]);
  const [loading, setLoading] = useState(false);

  const buscar = useCallback(async (): Promise<ApaeBancoAplicacao[]> => {
    if (!sessaoId) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("apae_banco_aplicacoes")
        .select("*")
        .eq("sessao_id", sessaoId)
        .order("banco_codigo");
      if (error) throw error;
      const rows = (data as ApaeBancoAplicacao[]) || [];
      setMapeamentos(rows);
      return rows;
    } catch (e: any) {
      toast.error("Erro ao buscar mapeamentos: " + e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [sessaoId]);

  const adicionar = useCallback(async (banco_codigo: string) => {
    if (!sessaoId) return;
    const { data, error } = await supabase
      .from("apae_banco_aplicacoes")
      .insert({ sessao_id: sessaoId, banco_codigo })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao adicionar: " + error.message);
      return;
    }
    setMapeamentos((prev) => [...prev, data as ApaeBancoAplicacao].sort((a, b) => a.banco_codigo.localeCompare(b.banco_codigo)));
  }, [sessaoId]);

  const atualizar = useCallback(async (id: string, updates: Partial<Pick<ApaeBancoAplicacao, "banco_codigo" | "aplicacao1_codigo" | "aplicacao2_codigo" | "aplicacao3_codigo" | "aplicacao4_codigo" | "aplicacao5_codigo" | "nome_relatorio">>) => {
    const { error } = await supabase
      .from("apae_banco_aplicacoes")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    setMapeamentos((prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const remover = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("apae_banco_aplicacoes")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    setMapeamentos((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /** Sincroniza mapeamentos com a lista de bancos atual.
   *  - Busca do DB diretamente (evita stale state)
   *  - Adiciona faltantes, remove os que não são mais banco
   *  - Retorna o total final
   */
  const sincronizar = useCallback(async (bancoCodigos: string[]): Promise<number> => {
    if (!sessaoId) return 0;
    setLoading(true);
    try {
      // 1. Fetch current from DB
      const { data: existentes, error: fetchErr } = await supabase
        .from("apae_banco_aplicacoes")
        .select("*")
        .eq("sessao_id", sessaoId);
      if (fetchErr) throw fetchErr;

      const existing = (existentes as ApaeBancoAplicacao[]) || [];
      const existingSet = new Set(existing.map((m) => m.banco_codigo));
      const desiredSet = new Set(bancoCodigos);

      // 2. Add missing
      const toAdd = bancoCodigos.filter((c) => !existingSet.has(c));
      if (toAdd.length > 0) {
        const rows = toAdd.map((banco_codigo) => ({ sessao_id: sessaoId, banco_codigo }));
        const { error: insertErr } = await supabase
          .from("apae_banco_aplicacoes")
          .insert(rows);
        if (insertErr) throw insertErr;
      }

      // 3. Remove no longer banco
      const toRemove = existing.filter((m) => !desiredSet.has(m.banco_codigo));
      if (toRemove.length > 0) {
        const ids = toRemove.map((m) => m.id);
        const { error: delErr } = await supabase
          .from("apae_banco_aplicacoes")
          .delete()
          .in("id", ids);
        if (delErr) throw delErr;
      }

      // 4. Re-fetch final state
      const { data: final, error: finalErr } = await supabase
        .from("apae_banco_aplicacoes")
        .select("*")
        .eq("sessao_id", sessaoId)
        .order("banco_codigo");
      if (finalErr) throw finalErr;

      const result = (final as ApaeBancoAplicacao[]) || [];
      setMapeamentos(result);
      return result.length;
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + e.message);
      return 0;
    } finally {
      setLoading(false);
    }
  }, [sessaoId]);

  return { mapeamentos, loading, buscar, adicionar, atualizar, remover, sincronizar };
}
