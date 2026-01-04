import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ConversaoArquivo {
  id: string;
  empresa_id: string;
  modulo: string;
  nome_arquivo_original: string;
  nome_arquivo_convertido: string | null;
  arquivo_original_url: string | null;
  arquivo_convertido_url: string | null;
  total_linhas: number;
  linhas_processadas: number;
  linhas_erro: number;
  status: string;
  mensagem_erro: string | null;
  metadados: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export function useConversoes(modulo?: string) {
  const { empresaAtiva } = useEmpresaAtiva();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: conversoes = [], isLoading, refetch } = useQuery({
    queryKey: ["conversoes", empresaAtiva?.id, modulo],
    queryFn: async () => {
      if (!empresaAtiva?.id) return [];
      
      let query = supabase
        .from("conversoes_arquivos")
        .select("*")
        .eq("empresa_id", empresaAtiva.id)
        .order("created_at", { ascending: false });

      if (modulo) {
        query = query.eq("modulo", modulo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ConversaoArquivo[];
    },
    enabled: !!empresaAtiva?.id,
  });

  const uploadArquivo = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("conversoes")
      .upload(path, file, { upsert: true });

    if (error) {
      console.error("Erro ao fazer upload:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("conversoes")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const uploadConteudo = async (content: string, path: string, mimeType: string): Promise<string | null> => {
    const blob = new Blob([content], { type: mimeType });
    const file = new File([blob], path.split('/').pop() || 'arquivo', { type: mimeType });
    
    const { data, error } = await supabase.storage
      .from("conversoes")
      .upload(path, file, { upsert: true });

    if (error) {
      console.error("Erro ao fazer upload do conteúdo:", error);
      return null;
    }

    return path;
  };

  const getDownloadUrl = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("conversoes")
      .createSignedUrl(path, 3600); // URL válida por 1 hora

    if (error) {
      console.error("Erro ao gerar URL de download:", error);
      return null;
    }

    return data.signedUrl;
  };

  const criarConversao = useMutation({
    mutationFn: async (params: {
      modulo: string;
      nomeArquivoOriginal: string;
      arquivoOriginal?: File;
      conteudoOriginal?: string;
    }) => {
      if (!empresaAtiva?.id) throw new Error("Nenhuma empresa ativa");

      setIsUploading(true);
      const timestamp = Date.now();
      const basePath = `${empresaAtiva.id}/${params.modulo}/${timestamp}`;

      // Upload do arquivo original
      let arquivoOriginalUrl: string | null = null;
      if (params.arquivoOriginal) {
        arquivoOriginalUrl = await uploadConteudo(
          await params.arquivoOriginal.text(),
          `${basePath}/original_${params.nomeArquivoOriginal}`,
          'text/plain'
        );
      } else if (params.conteudoOriginal) {
        arquivoOriginalUrl = await uploadConteudo(
          params.conteudoOriginal,
          `${basePath}/original_${params.nomeArquivoOriginal}`,
          'text/plain'
        );
      }

      const { data, error } = await supabase
        .from("conversoes_arquivos")
        .insert({
          empresa_id: empresaAtiva.id,
          modulo: params.modulo,
          nome_arquivo_original: params.nomeArquivoOriginal,
          arquivo_original_url: arquivoOriginalUrl,
          status: "processando",
          created_by: user?.id,
        })
        .select()
        .single();

      setIsUploading(false);
      if (error) throw error;
      return data as ConversaoArquivo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversoes", empresaAtiva?.id, modulo] });
    },
    onError: (error) => {
      setIsUploading(false);
      toast({
        title: "Erro ao criar conversão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const atualizarConversao = useMutation({
    mutationFn: async (params: {
      id: string;
      status: string;
      totalLinhas?: number;
      linhasProcessadas?: number;
      linhasErro?: number;
      mensagemErro?: string;
      metadados?: Record<string, unknown>;
      conteudoConvertido?: string;
      nomeArquivoConvertido?: string;
    }) => {
      if (!empresaAtiva?.id) throw new Error("Nenhuma empresa ativa");

      let arquivoConvertidoUrl: string | null = null;
      
      if (params.conteudoConvertido && params.nomeArquivoConvertido) {
        const timestamp = Date.now();
        const basePath = `${empresaAtiva.id}/${modulo || 'geral'}/${timestamp}`;
        const mimeType = params.nomeArquivoConvertido.endsWith('.csv') 
          ? 'text/csv;charset=utf-8' 
          : 'text/plain;charset=utf-8';
        
        arquivoConvertidoUrl = await uploadConteudo(
          params.conteudoConvertido,
          `${basePath}/${params.nomeArquivoConvertido}`,
          mimeType
        );
      }

      const updateData: Record<string, unknown> = {
        status: params.status,
      };

      if (params.totalLinhas !== undefined) updateData.total_linhas = params.totalLinhas;
      if (params.linhasProcessadas !== undefined) updateData.linhas_processadas = params.linhasProcessadas;
      if (params.linhasErro !== undefined) updateData.linhas_erro = params.linhasErro;
      if (params.mensagemErro !== undefined) updateData.mensagem_erro = params.mensagemErro;
      if (params.metadados !== undefined) updateData.metadados = params.metadados;
      if (arquivoConvertidoUrl) updateData.arquivo_convertido_url = arquivoConvertidoUrl;
      if (params.nomeArquivoConvertido) updateData.nome_arquivo_convertido = params.nomeArquivoConvertido;

      const { data, error } = await supabase
        .from("conversoes_arquivos")
        .update(updateData)
        .eq("id", params.id)
        .select()
        .single();

      if (error) throw error;
      return data as ConversaoArquivo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversoes", empresaAtiva?.id, modulo] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar conversão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarConversao = useMutation({
    mutationFn: async (conversao: ConversaoArquivo) => {
      // Deletar arquivos do storage
      const pathsToDelete: string[] = [];
      
      if (conversao.arquivo_original_url) {
        pathsToDelete.push(conversao.arquivo_original_url);
      }
      if (conversao.arquivo_convertido_url) {
        pathsToDelete.push(conversao.arquivo_convertido_url);
      }

      if (pathsToDelete.length > 0) {
        await supabase.storage
          .from("conversoes")
          .remove(pathsToDelete);
      }

      // Deletar registro do banco
      const { error } = await supabase
        .from("conversoes_arquivos")
        .delete()
        .eq("id", conversao.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversoes", empresaAtiva?.id, modulo] });
      toast({ title: "Conversão removida com sucesso" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover conversão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    conversoes,
    isLoading,
    isUploading,
    refetch,
    criarConversao,
    atualizarConversao,
    deletarConversao,
    getDownloadUrl,
  };
}
