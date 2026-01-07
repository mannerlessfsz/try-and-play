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
      // Use secure RPC that masks CNPJ/email for non-admins/non-owners
      const { data, error } = await supabase.rpc('get_empresas_safe');

      if (error) throw error;

      setEmpresas(
        (data || []).map((e: any) => ({
          id: e.id,
          nome: e.nome,
          cnpj: e.cnpj || undefined,
          email: e.email || undefined,
          telefone: e.telefone || undefined,
          manager_id: e.manager_id || undefined,
          regime_tributario: e.regime_tributario || null,
          ativo: e.ativo ?? true,
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

  // Soft delete - inativar empresa (dispara triggers de revogação)
  const deleteEmpresa = async (id: string) => {
    try {
      const { error } = await supabase
        .from("empresas")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Empresa inativada",
        description: "A empresa foi inativada e todos os acessos foram revogados.",
      });
      
      await fetchEmpresas();
    } catch (error) {
      console.error("Error deactivating empresa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível inativar a empresa",
        variant: "destructive",
      });
    }
  };

  // Reativar empresa
  const reactivateEmpresa = async (id: string) => {
    try {
      const { error } = await supabase
        .from("empresas")
        .update({ ativo: true })
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Empresa reativada",
        description: "A empresa foi reativada. Os módulos e permissões precisam ser reconfigurados.",
      });
      
      await fetchEmpresas();
    } catch (error) {
      console.error("Error reactivating empresa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reativar a empresa",
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
    reactivateEmpresa,
    refetch: fetchEmpresas,
  };
}
