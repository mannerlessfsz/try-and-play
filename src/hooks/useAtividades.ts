import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Atividade } from "@/types/task";

export type ModuloAtividade = "taskvault" | "gestao" | "admin";

export function useAtividades(modulo?: ModuloAtividade, empresaId?: string) {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const fetchIdRef = useRef(0);

  const fetchAtividades = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      let query = supabase
        .from("atividades")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (modulo) query = query.eq("modulo", modulo);
      if (empresaId) query = query.eq("empresa_id", empresaId);

      const { data, error } = await query;
      if (error) throw error;
      if (id !== fetchIdRef.current) return;

      setAtividades(
        (data || []).map((a) => ({
          id: a.id,
          tipo: a.tipo as Atividade["tipo"],
          descricao: a.descricao,
          data: a.created_at,
        }))
      );
    } catch (error) {
      if (id !== fetchIdRef.current) return;
      console.error("Error fetching atividades:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as atividades", variant: "destructive" });
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [modulo, empresaId, toast]);

  const addAtividade = useCallback(async (
    tipo: Atividade["tipo"],
    descricao: string,
    options?: {
      tarefaId?: string;
      empresaId?: string;
      modulo?: ModuloAtividade;
      metadados?: Record<string, unknown>;
    }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        tipo, descricao,
        user_id: user?.id || null,
        tarefa_id: options?.tarefaId || null,
        empresa_id: options?.empresaId || empresaId || null,
        modulo: options?.modulo || modulo || null,
        metadados: options?.metadados || null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("atividades").insert(insertData as any);
      if (error) throw error;

      // Optimistic: add to local state instead of refetch
      setAtividades(prev => [{
        id: crypto.randomUUID(),
        tipo,
        descricao,
        data: new Date().toISOString(),
      }, ...prev.slice(0, 29)]);
    } catch (error) {
      console.error("Error adding atividade:", error);
      toast({ title: "Erro", description: "Não foi possível adicionar a atividade", variant: "destructive" });
    }
  }, [modulo, empresaId, toast]);

  useEffect(() => { fetchAtividades(); }, [fetchAtividades]);

  return { atividades, loading, addAtividade, refetch: fetchAtividades };
}
