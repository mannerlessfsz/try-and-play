import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Atividade } from "@/types/task";

export type ModuloAtividade = "taskvault" | "ajustasped" | "conferesped" | "gestao" | "conversores" | "admin";

export function useAtividades(modulo?: ModuloAtividade, empresaId?: string) {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAtividades = async () => {
    try {
      let query = supabase
        .from("atividades")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      // Filter by module if specified
      if (modulo) {
        query = query.eq("modulo", modulo);
      }

      // Filter by empresa if specified
      if (empresaId) {
        query = query.eq("empresa_id", empresaId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAtividades(
        (data || []).map((a) => ({
          id: a.id,
          tipo: a.tipo as Atividade["tipo"],
          descricao: a.descricao,
          data: a.created_at,
        }))
      );
    } catch (error) {
      console.error("Error fetching atividades:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as atividades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addAtividade = async (
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        tipo,
        descricao,
        user_id: user?.id || null,
        tarefa_id: options?.tarefaId || null,
        empresa_id: options?.empresaId || empresaId || null,
        modulo: options?.modulo || modulo || null,
        metadados: options?.metadados || null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("atividades").insert(insertData as any);

      if (error) throw error;
      await fetchAtividades();
    } catch (error) {
      console.error("Error adding atividade:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a atividade",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAtividades();
  }, [modulo, empresaId]);

  return {
    atividades,
    loading,
    addAtividade,
    refetch: fetchAtividades,
  };
}
