import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Atividade } from "@/types/task";

export function useAtividades() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAtividades = async () => {
    try {
      const { data, error } = await supabase
        .from("atividades")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

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
    tarefaId?: string,
    empresaId?: string
  ) => {
    try {
      const { error } = await supabase.from("atividades").insert({
        tipo,
        descricao,
        tarefa_id: tarefaId || null,
        empresa_id: empresaId || null,
      });

      if (error) throw error;
      await fetchAtividades();
    } catch (error) {
      console.error("Error adding atividade:", error);
    }
  };

  useEffect(() => {
    fetchAtividades();
  }, []);

  return {
    atividades,
    loading,
    addAtividade,
    refetch: fetchAtividades,
  };
}
