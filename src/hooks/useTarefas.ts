import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tarefa, TarefaArquivo } from "@/types/task";

export function useTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTarefas = async () => {
    try {
      const { data: tarefasData, error: tarefasError } = await supabase
        .from("tarefas")
        .select(`
          *,
          empresa:empresas(id, nome)
        `)
        .order("created_at", { ascending: false });

      if (tarefasError) throw tarefasError;

      const { data: arquivosData, error: arquivosError } = await supabase
        .from("tarefa_arquivos")
        .select("*");

      if (arquivosError) throw arquivosError;

      const tarefasFormatted: Tarefa[] = (tarefasData || []).map((t) => ({
        id: t.id,
        titulo: t.titulo,
        descricao: t.descricao || "",
        empresaId: t.empresa_id || "",
        status: t.status as Tarefa["status"],
        prioridade: t.prioridade as Tarefa["prioridade"],
        dataVencimento: t.data_vencimento || undefined,
        progresso: t.progresso || 0,
        responsavel: t.responsavel || undefined,
        departamento: t.departamento as Tarefa["departamento"] || undefined,
        contatoId: t.contato_id || undefined,
        arquivos: (arquivosData || [])
          .filter((a) => a.tarefa_id === t.id)
          .map((a) => ({
            id: a.id,
            nome: a.nome,
            tamanho: a.tamanho,
            tipo: a.tipo,
            url: a.url || undefined,
          })),
      }));

      setTarefas(tarefasFormatted);
    } catch (error) {
      console.error("Error fetching tarefas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as tarefas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTarefa = async (tarefa: Omit<Tarefa, "id" | "arquivos">) => {
    try {
      const { data, error } = await supabase
        .from("tarefas")
        .insert({
          titulo: tarefa.titulo,
          descricao: tarefa.descricao,
          empresa_id: tarefa.empresaId || null,
          status: tarefa.status,
          prioridade: tarefa.prioridade,
          data_vencimento: tarefa.dataVencimento || null,
          progresso: tarefa.progresso || 0,
          responsavel: tarefa.responsavel || null,
          departamento: tarefa.departamento || null,
          contato_id: tarefa.contatoId || null,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTarefas();
      return data.id;
    } catch (error) {
      console.error("Error adding tarefa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a tarefa",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTarefa = async (id: string, updates: Partial<Tarefa>) => {
    try {
      const { error } = await supabase
        .from("tarefas")
        .update({
          titulo: updates.titulo,
          descricao: updates.descricao,
          empresa_id: updates.empresaId || null,
          status: updates.status,
          prioridade: updates.prioridade,
          data_vencimento: updates.dataVencimento || null,
          progresso: updates.progresso,
          responsavel: updates.responsavel || null,
          departamento: updates.departamento || null,
          contato_id: updates.contatoId || null,
        })
        .eq("id", id);

      if (error) throw error;
      await fetchTarefas();
    } catch (error) {
      console.error("Error updating tarefa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a tarefa",
        variant: "destructive",
      });
    }
  };

  const deleteTarefa = async (id: string) => {
    try {
      const { error } = await supabase.from("tarefas").delete().eq("id", id);

      if (error) throw error;
      await fetchTarefas();
    } catch (error) {
      console.error("Error deleting tarefa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a tarefa",
        variant: "destructive",
      });
    }
  };

  const uploadArquivo = async (tarefaId: string, file: File) => {
    try {
      const fileName = `${tarefaId}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("task-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("task-files")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("tarefa_arquivos").insert({
        tarefa_id: tarefaId,
        nome: file.name,
        tamanho: file.size,
        tipo: file.type,
        url: urlData.publicUrl,
      });

      if (dbError) throw dbError;

      await fetchTarefas();
      toast({
        title: "Sucesso",
        description: "Arquivo enviado com sucesso",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o arquivo",
        variant: "destructive",
      });
    }
  };

  const deleteArquivo = async (arquivoId: string, url?: string) => {
    try {
      if (url) {
        const path = url.split("/task-files/")[1];
        if (path) {
          await supabase.storage.from("task-files").remove([path]);
        }
      }

      const { error } = await supabase
        .from("tarefa_arquivos")
        .delete()
        .eq("id", arquivoId);

      if (error) throw error;
      await fetchTarefas();
    } catch (error) {
      console.error("Error deleting arquivo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o arquivo",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTarefas();
  }, []);

  return {
    tarefas,
    loading,
    addTarefa,
    updateTarefa,
    deleteTarefa,
    uploadArquivo,
    deleteArquivo,
    refetch: fetchTarefas,
  };
}
