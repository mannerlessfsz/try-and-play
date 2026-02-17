import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { toast } from "sonner";

export interface ApaePlanoEmpresaItem {
  id: string;
  empresa_id: string;
  codigo: string;
  descricao: string;
  classificacao: string | null;
  cnpj: string;
  ordem: number;
  is_banco: boolean;
  is_aplicacao: boolean;
  created_at: string;
}

export function useApaePlanoEmpresa() {
  const { empresaAtiva } = useEmpresaAtiva();
  const queryClient = useQueryClient();
  const empresaId = empresaAtiva?.id;

  // Buscar plano persistente da empresa
  const { data: planoEmpresa = [], isLoading: loadingPlano } = useQuery({
    queryKey: ["apae-plano-empresa", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const allData: ApaePlanoEmpresaItem[] = [];
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("apae_planos_empresa")
          .select("*")
          .eq("empresa_id", empresaId)
          .order("ordem", { ascending: true })
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...(data as ApaePlanoEmpresaItem[]));
        if (data.length < batchSize) break;
        offset += batchSize;
      }
      return allData;
    },
    enabled: !!empresaId,
  });

  // Buscar nome do arquivo do plano diretamente da empresa
  const { data: planoArquivoData } = useQuery({
    queryKey: ["apae-plano-arquivo", empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data, error } = await supabase
        .from("empresas")
        .select("apae_plano_contas_arquivo")
        .eq("id", empresaId)
        .single();
      if (error) return null;
      return (data as any)?.apae_plano_contas_arquivo as string | null;
    },
    enabled: !!empresaId,
  });

  const planoArquivo = planoArquivoData ?? null;

  // Salvar plano na empresa (substitui tudo)
  const salvarPlano = useMutation({
    mutationFn: async ({ contas, nomeArquivo }: { contas: { codigo: string; descricao: string; classificacao?: string; cnpj?: string; is_banco?: boolean; is_aplicacao?: boolean }[]; nomeArquivo: string }) => {
      if (!empresaId) throw new Error("Nenhuma empresa ativa");

      // 1. Capturar flags existentes (is_banco, is_aplicacao) por código
      const flagsAntigos = new Map<string, { is_banco: boolean; is_aplicacao: boolean }>();
      for (const c of planoEmpresa) {
        if (c.is_banco || c.is_aplicacao) {
          flagsAntigos.set(c.codigo, { is_banco: c.is_banco, is_aplicacao: c.is_aplicacao });
        }
      }

      // 2. Limpar plano antigo e inserir novo
      await supabase.from("apae_planos_empresa").delete().eq("empresa_id", empresaId);

      const novosCodigos = new Set(contas.map((c) => c.codigo));
      const rows = contas.map((c, idx) => {
        const flagAnterior = flagsAntigos.get(c.codigo);
        return {
          empresa_id: empresaId,
          codigo: c.codigo,
          descricao: c.descricao,
          classificacao: c.classificacao || null,
          cnpj: c.cnpj || "00000000000000",
          ordem: idx,
          is_banco: flagAnterior?.is_banco || false,
          is_aplicacao: flagAnterior?.is_aplicacao || false,
        };
      });
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("apae_planos_empresa").insert(batch);
        if (error) throw error;
      }

      // 3. Limpar mapeamentos cujas contas não existem mais no novo plano
      const { data: mapExistentes } = await supabase
        .from("apae_banco_aplicacoes_empresa")
        .select("*")
        .eq("empresa_id", empresaId);

      if (mapExistentes && mapExistentes.length > 0) {
        const idsRemover: string[] = [];
        const aplicacaoCols = ["aplicacao1_codigo", "aplicacao2_codigo", "aplicacao3_codigo", "aplicacao4_codigo", "aplicacao5_codigo"] as const;

        for (const m of mapExistentes) {
          // Se o banco não existe mais, remover o mapeamento inteiro
          if (!novosCodigos.has(m.banco_codigo)) {
            idsRemover.push(m.id);
            continue;
          }
          // Limpar aplicações que não existem mais
          const updates: Record<string, string | null> = {};
          for (const col of aplicacaoCols) {
            const val = m[col];
            if (val && val !== "0" && !novosCodigos.has(val)) {
              updates[col] = null;
            }
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from("apae_banco_aplicacoes_empresa").update(updates).eq("id", m.id);
          }
        }

        if (idsRemover.length > 0) {
          await supabase.from("apae_banco_aplicacoes_empresa").delete().in("id", idsRemover);
        }
      }

      // 4. Atualizar nome do arquivo na empresa
      await supabase.from("empresas").update({ apae_plano_contas_arquivo: nomeArquivo }).eq("id", empresaId);
      return contas.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apae-plano-empresa", empresaId] });
      queryClient.invalidateQueries({ queryKey: ["apae-plano-arquivo", empresaId] });
      queryClient.invalidateQueries({ queryKey: ["apae-banco-aplicacoes-empresa"] });
      toast.success("Plano de contas salvo na empresa!");
    },
    onError: (e) => toast.error("Erro ao salvar plano: " + e.message),
  });

  // Remover plano da empresa
  const removerPlano = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error("Nenhuma empresa ativa");
      await supabase.from("apae_planos_empresa").delete().eq("empresa_id", empresaId);
      await supabase.from("empresas").update({ apae_plano_contas_arquivo: null }).eq("id", empresaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apae-plano-empresa", empresaId] });
      queryClient.invalidateQueries({ queryKey: ["apae-plano-arquivo", empresaId] });
      toast.success("Plano de contas removido");
    },
    onError: (e) => toast.error("Erro ao remover plano: " + e.message),
  });

  // Atualizar flags is_banco/is_aplicacao de uma conta
  const atualizarContaEmpresa = async (id: string, updates: { is_banco?: boolean; is_aplicacao?: boolean }) => {
    const { error } = await supabase.from("apae_planos_empresa").update(updates).eq("id", id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["apae-plano-empresa", empresaId] });
  };

  // Copiar plano da empresa para uma sessão
  const copiarParaSessao = async (sessaoId: string) => {
    if (planoEmpresa.length === 0) return;
    // Limpar plano da sessão
    await supabase.from("apae_plano_contas").delete().eq("sessao_id", sessaoId);
    const rows = planoEmpresa.map((c, idx) => ({
      sessao_id: sessaoId,
      codigo: c.codigo,
      descricao: c.descricao,
      classificacao: c.classificacao,
      cnpj: c.cnpj || "00000000000000",
      ordem: idx,
      is_banco: c.is_banco || false,
      is_aplicacao: c.is_aplicacao || false,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase.from("apae_plano_contas").insert(batch);
      if (error) throw error;
    }
  };

  return {
    planoEmpresa,
    planoArquivo,
    loadingPlano,
    salvarPlano,
    removerPlano,
    copiarParaSessao,
    atualizarContaEmpresa,
    temPlano: planoEmpresa.length > 0,
  };
}
