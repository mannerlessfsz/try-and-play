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
  created_at: string;
}

export function useApaeBancoAplicacoes(sessaoId: string | null) {
  const [mapeamentos, setMapeamentos] = useState<ApaeBancoAplicacao[]>([]);
  const [loading, setLoading] = useState(false);

  const buscar = useCallback(async () => {
    if (!sessaoId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("apae_banco_aplicacoes")
        .select("*")
        .eq("sessao_id", sessaoId)
        .order("banco_codigo");
      if (error) throw error;
      setMapeamentos((data as ApaeBancoAplicacao[]) || []);
    } catch (e: any) {
      toast.error("Erro ao buscar mapeamentos: " + e.message);
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

  const atualizar = useCallback(async (id: string, updates: Partial<Pick<ApaeBancoAplicacao, "banco_codigo" | "aplicacao1_codigo" | "aplicacao2_codigo" | "aplicacao3_codigo" | "aplicacao4_codigo" | "aplicacao5_codigo">>) => {
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

  return { mapeamentos, loading, buscar, adicionar, atualizar, remover };
}
