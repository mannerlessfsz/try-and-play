import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Empresa } from "@/types/task";

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;

      setEmpresas(
        (data || []).map((e) => ({
          id: e.id,
          nome: e.nome,
          cnpj: e.cnpj || undefined,
          email: e.email || undefined,
        }))
      );
    } catch (error) {
      console.error("Error fetching empresas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as empresas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addEmpresa = async (empresa: Omit<Empresa, "id">) => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .insert({
          nome: empresa.nome,
          cnpj: empresa.cnpj || null,
          email: empresa.email || null,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchEmpresas();
      return data.id;
    } catch (error) {
      console.error("Error adding empresa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a empresa",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateEmpresa = async (id: string, updates: Partial<Empresa>) => {
    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          nome: updates.nome,
          cnpj: updates.cnpj || null,
          email: updates.email || null,
        })
        .eq("id", id);

      if (error) throw error;
      await fetchEmpresas();
    } catch (error) {
      console.error("Error updating empresa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a empresa",
        variant: "destructive",
      });
    }
  };

  const deleteEmpresa = async (id: string) => {
    try {
      const { error } = await supabase.from("empresas").delete().eq("id", id);

      if (error) throw error;
      await fetchEmpresas();
    } catch (error) {
      console.error("Error deleting empresa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a empresa",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  return {
    empresas,
    loading,
    addEmpresa,
    updateEmpresa,
    deleteEmpresa,
    refetch: fetchEmpresas,
  };
}
