import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DocumentoModelo {
  id: string;
  nome: string;
  descricao: string;
  palavrasChave: string[];
  tipoDocumento: string;
  departamento: string | null;
  arquivoModeloUrl: string | null;
  arquivoModeloNome: string | null;
  empresaId: string | null;
  ativo: boolean;
  createdAt: string;
}

export interface DocumentoModeloForm {
  nome: string;
  descricao: string;
  palavrasChave: string[];
  tipoDocumento: string;
  departamento: string | null;
  empresaId: string | null;
}

const TIPOS_DOCUMENTO = [
  { value: "geral", label: "Geral" },
  { value: "balanco", label: "Balanço" },
  { value: "das", label: "DAS" },
  { value: "dctf", label: "DCTF" },
  { value: "sped", label: "SPED" },
  { value: "nfe", label: "Nota Fiscal" },
  { value: "recibo", label: "Recibo" },
  { value: "contrato", label: "Contrato" },
  { value: "declaracao", label: "Declaração" },
  { value: "guia", label: "Guia de Recolhimento" },
  { value: "folha", label: "Folha de Pagamento" },
  { value: "certidao", label: "Certidão" },
];

export { TIPOS_DOCUMENTO };

export function useDocumentoModelos() {
  const [modelos, setModelos] = useState<DocumentoModelo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchModelos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("documento_modelos")
        .select("*")
        .order("nome");

      if (error) throw error;

      setModelos(
        (data || []).map((d) => ({
          id: d.id,
          nome: d.nome,
          descricao: d.descricao || "",
          palavrasChave: d.palavras_chave || [],
          tipoDocumento: d.tipo_documento || "geral",
          departamento: d.departamento,
          arquivoModeloUrl: d.arquivo_modelo_url,
          arquivoModeloNome: d.arquivo_modelo_nome,
          empresaId: d.empresa_id,
          ativo: d.ativo,
          createdAt: d.created_at,
        }))
      );
    } catch (error) {
      console.error("Error fetching documento_modelos:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os modelos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addModelo = useCallback(async (form: DocumentoModeloForm) => {
    try {
      const { error } = await supabase.from("documento_modelos").insert({
        nome: form.nome,
        descricao: form.descricao,
        palavras_chave: form.palavrasChave,
        tipo_documento: form.tipoDocumento,
        departamento: form.departamento,
        empresa_id: form.empresaId,
      });
      if (error) throw error;
      toast({ title: "Modelo criado com sucesso" });
      await fetchModelos();
      return true;
    } catch (error) {
      console.error("Error adding modelo:", error);
      toast({ title: "Erro", description: "Não foi possível criar o modelo", variant: "destructive" });
      return false;
    }
  }, [fetchModelos, toast]);

  const updateModelo = useCallback(async (id: string, form: Partial<DocumentoModeloForm> & { ativo?: boolean }) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (form.nome !== undefined) updateData.nome = form.nome;
      if (form.descricao !== undefined) updateData.descricao = form.descricao;
      if (form.palavrasChave !== undefined) updateData.palavras_chave = form.palavrasChave;
      if (form.tipoDocumento !== undefined) updateData.tipo_documento = form.tipoDocumento;
      if (form.departamento !== undefined) updateData.departamento = form.departamento;
      if (form.empresaId !== undefined) updateData.empresa_id = form.empresaId;
      if (form.ativo !== undefined) updateData.ativo = form.ativo;

      const { error } = await supabase.from("documento_modelos").update(updateData).eq("id", id);
      if (error) throw error;

      setModelos((prev) => prev.map((m) => (m.id === id ? { ...m, ...form } : m)));
      toast({ title: "Modelo atualizado" });
      return true;
    } catch (error) {
      console.error("Error updating modelo:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" });
      return false;
    }
  }, [toast]);

  const deleteModelo = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("documento_modelos").delete().eq("id", id);
      if (error) throw error;
      setModelos((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Modelo excluído" });
    } catch (error) {
      console.error("Error deleting modelo:", error);
      toast({ title: "Erro", description: "Não foi possível excluir", variant: "destructive" });
    }
  }, [toast]);

  const uploadArquivoModelo = useCallback(async (id: string, file: File) => {
    try {
      const fileName = `modelos/${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("task-files").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("task-files").getPublicUrl(fileName);
      const { error: dbError } = await supabase
        .from("documento_modelos")
        .update({ arquivo_modelo_url: urlData.publicUrl, arquivo_modelo_nome: file.name })
        .eq("id", id);
      if (dbError) throw dbError;

      setModelos((prev) =>
        prev.map((m) => (m.id === id ? { ...m, arquivoModeloUrl: urlData.publicUrl, arquivoModeloNome: file.name } : m))
      );
      toast({ title: "Arquivo modelo enviado" });
    } catch (error) {
      console.error("Error uploading arquivo modelo:", error);
      toast({ title: "Erro", description: "Não foi possível enviar o arquivo", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchModelos();
  }, [fetchModelos]);

  return { modelos, loading, addModelo, updateModelo, deleteModelo, uploadArquivoModelo, refetch: fetchModelos };
}
