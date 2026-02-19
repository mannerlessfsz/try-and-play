import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TipoRegra = "revisao" | "alteracao";

export interface RegraExclusaoLider {
  id: string;
  empresa_id: string;
  tipo: TipoRegra;
  conta_debito: string;
  conta_credito: string;
  descricao: string;
  historico_busca: string;
  novo_debito: string;
  novo_credito: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useRegrasExclusaoLider(empresaId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: regras = [], isLoading, refetch } = useQuery({
    queryKey: ["regras-exclusao-lider", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from("regras_exclusao_lider")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RegraExclusaoLider[];
    },
    enabled: !!empresaId,
  });

  const criarRegra = useMutation({
    mutationFn: async (regra: {
      tipo: TipoRegra;
      conta_debito: string;
      conta_credito: string;
      descricao: string;
      historico_busca?: string;
      novo_debito?: string;
      novo_credito?: string;
    }) => {
      if (!empresaId) throw new Error("Empresa não selecionada");

      const { data, error } = await supabase
        .from("regras_exclusao_lider")
        .insert({
          empresa_id: empresaId,
          tipo: regra.tipo,
          conta_debito: regra.conta_debito || "",
          conta_credito: regra.conta_credito || "",
          descricao: regra.descricao,
          historico_busca: regra.historico_busca || "",
          novo_debito: regra.novo_debito || "",
          novo_credito: regra.novo_credito || "",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regras-exclusao-lider", empresaId] });
      toast({ title: "Regra criada com sucesso" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar regra",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const atualizarRegra = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<RegraExclusaoLider> & { id: string }) => {
      const { data, error } = await supabase
        .from("regras_exclusao_lider")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regras-exclusao-lider", empresaId] });
      toast({ title: "Regra atualizada com sucesso" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar regra",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarRegra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("regras_exclusao_lider")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regras-exclusao-lider", empresaId] });
      toast({ title: "Regra removida com sucesso" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover regra",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Separate rules by type
  const regrasRevisao = regras.filter(r => r.tipo === "revisao");
  const regrasAlteracao = regras.filter(r => r.tipo === "alteracao");

  return {
    regras,
    regrasRevisao,
    regrasAlteracao,
    isLoading,
    refetch,
    criarRegra,
    atualizarRegra,
    deletarRegra,
  };
}
