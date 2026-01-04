import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type DepartamentoTipo = Database['public']['Enums']['departamento_tipo'];

export interface EmpresaContato {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: string | null;
  ativo: boolean;
  departamentos: DepartamentoTipo[];
}

export function useEmpresaContatos(empresaId?: string) {
  const [contatos, setContatos] = useState<EmpresaContato[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContatos = async () => {
    if (!empresaId) {
      setContatos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch contatos with their departments
      const { data: contatosData, error: contatosError } = await supabase
        .from('empresa_contatos')
        .select(`
          id,
          empresa_id,
          nome,
          email,
          telefone,
          cargo,
          ativo,
          contato_departamentos(departamento)
        `)
        .eq('empresa_id', empresaId)
        .order('nome');

      if (contatosError) throw contatosError;

      const formatted = (contatosData || []).map(c => ({
        id: c.id,
        empresa_id: c.empresa_id,
        nome: c.nome,
        email: c.email,
        telefone: c.telefone,
        cargo: c.cargo,
        ativo: c.ativo ?? true,
        departamentos: (c.contato_departamentos || []).map((d: any) => d.departamento as DepartamentoTipo),
      }));

      setContatos(formatted);
    } catch (error) {
      console.error("Error fetching contatos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os contatos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addContato = async (contato: {
    nome: string;
    email: string;
    telefone?: string;
    cargo?: string;
    departamentos: DepartamentoTipo[];
  }) => {
    if (!empresaId) return null;

    try {
      // Create contato
      const { data: contatoData, error: contatoError } = await supabase
        .from('empresa_contatos')
        .insert({
          empresa_id: empresaId,
          nome: contato.nome,
          email: contato.email,
          telefone: contato.telefone || null,
          cargo: contato.cargo || null,
        })
        .select()
        .single();

      if (contatoError) throw contatoError;

      // Add departments
      if (contato.departamentos.length > 0) {
        const { error: deptError } = await supabase
          .from('contato_departamentos')
          .insert(
            contato.departamentos.map(d => ({
              contato_id: contatoData.id,
              departamento: d,
            }))
          );

        if (deptError) throw deptError;
      }

      await fetchContatos();
      toast({ title: "Contato adicionado com sucesso!" });
      return contatoData.id;
    } catch (error: any) {
      console.error("Error adding contato:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar o contato",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateContato = async (
    id: string,
    updates: {
      nome?: string;
      email?: string;
      telefone?: string;
      cargo?: string;
      ativo?: boolean;
      departamentos?: DepartamentoTipo[];
    }
  ) => {
    try {
      // Update contato basic info
      const { error: updateError } = await supabase
        .from('empresa_contatos')
        .update({
          nome: updates.nome,
          email: updates.email,
          telefone: updates.telefone || null,
          cargo: updates.cargo || null,
          ativo: updates.ativo,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update departments if provided
      if (updates.departamentos !== undefined) {
        // Remove existing
        await supabase.from('contato_departamentos').delete().eq('contato_id', id);

        // Add new
        if (updates.departamentos.length > 0) {
          const { error: deptError } = await supabase
            .from('contato_departamentos')
            .insert(
              updates.departamentos.map(d => ({
                contato_id: id,
                departamento: d,
              }))
            );

          if (deptError) throw deptError;
        }
      }

      await fetchContatos();
      toast({ title: "Contato atualizado!" });
    } catch (error: any) {
      console.error("Error updating contato:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o contato",
        variant: "destructive",
      });
    }
  };

  const deleteContato = async (id: string) => {
    try {
      const { error } = await supabase
        .from('empresa_contatos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchContatos();
      toast({ title: "Contato removido" });
    } catch (error: any) {
      console.error("Error deleting contato:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o contato",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchContatos();
  }, [empresaId]);

  return {
    contatos,
    loading,
    addContato,
    updateContato,
    deleteContato,
    refetch: fetchContatos,
  };
}
