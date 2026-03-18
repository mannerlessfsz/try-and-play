import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { toast } from "sonner";

export interface CasaPlanoEmpresaItem {
  id: string;
  empresa_id: string;
  codigo: string;
  descricao: string;
  classificacao: string | null;
  cnpj: string;
  ordem: number;
  created_at: string;
}

export function useCasaPlanoEmpresa() {
  const { empresaAtiva } = useEmpresaAtiva();
  const queryClient = useQueryClient();
  const empresaId = empresaAtiva?.id;

  const { data: planoEmpresa = [], isLoading: loadingPlano } = useQuery({
    queryKey: ["casa-plano-empresa", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const allData: CasaPlanoEmpresaItem[] = [];
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("casa_planos_empresa")
          .select("*")
          .eq("empresa_id", empresaId)
          .order("ordem", { ascending: true })
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...(data as CasaPlanoEmpresaItem[]));
        if (data.length < batchSize) break;
        offset += batchSize;
      }
      return allData;
    },
    enabled: !!empresaId,
  });

  const { data: planoArquivoData } = useQuery({
    queryKey: ["casa-plano-arquivo", empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data, error } = await supabase
        .from("empresas")
        .select("casa_plano_contas_arquivo")
        .eq("id", empresaId)
        .single();
      if (error) return null;
      return (data as any)?.casa_plano_contas_arquivo as string | null;
    },
    enabled: !!empresaId,
  });

  const planoArquivo = planoArquivoData ?? null;

  const salvarPlano = useMutation({
    mutationFn: async ({ contas, nomeArquivo }: { contas: { codigo: string; descricao: string; classificacao?: string; cnpj?: string }[]; nomeArquivo: string }) => {
      if (!empresaId) throw new Error("Nenhuma empresa ativa");

      await supabase.from("casa_planos_empresa").delete().eq("empresa_id", empresaId);

      const rows = contas.map((c, idx) => ({
        empresa_id: empresaId,
        codigo: c.codigo,
        descricao: c.descricao,
        classificacao: c.classificacao || null,
        cnpj: c.cnpj || "00000000000000",
        ordem: idx,
      }));

      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("casa_planos_empresa").insert(batch);
        if (error) throw error;
      }

      await supabase.from("empresas").update({ casa_plano_contas_arquivo: nomeArquivo } as any).eq("id", empresaId);
      return contas.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casa-plano-empresa", empresaId] });
      queryClient.invalidateQueries({ queryKey: ["casa-plano-arquivo", empresaId] });
      toast.success("Plano de contas salvo!");
    },
    onError: (e) => toast.error("Erro ao salvar plano: " + e.message),
  });

  const removerPlano = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error("Nenhuma empresa ativa");
      await supabase.from("casa_planos_empresa").delete().eq("empresa_id", empresaId);
      await supabase.from("empresas").update({ casa_plano_contas_arquivo: null } as any).eq("id", empresaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casa-plano-empresa", empresaId] });
      queryClient.invalidateQueries({ queryKey: ["casa-plano-arquivo", empresaId] });
      toast.success("Plano de contas removido");
    },
    onError: (e) => toast.error("Erro ao remover plano: " + e.message),
  });

  return {
    planoEmpresa,
    planoArquivo,
    loadingPlano,
    salvarPlano,
    removerPlano,
    temPlano: planoEmpresa.length > 0,
  };
}
