import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tarefa, TarefaArquivo } from "@/types/task";

export function useTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const fetchIdRef = useRef(0);

  const fetchTarefas = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      // Single query with joined arquivos instead of two separate fetches
      const { data, error } = await supabase
        .from("tarefas")
        .select("*, tarefa_arquivos(id, nome, tamanho, tipo, url)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (id !== fetchIdRef.current) return; // stale

      const formatted: Tarefa[] = (data || []).map((t) => ({
        id: t.id,
        titulo: t.titulo,
        descricao: t.descricao || "",
        empresaId: t.empresa_id || "",
        status: t.status as Tarefa["status"],
        prioridade: t.prioridade as Tarefa["prioridade"],
        dataVencimento: t.data_vencimento || undefined,
        prazoEntrega: t.prazo_entrega || undefined,
        requerAnexo: t.requer_anexo ?? false,
        justificativa: t.justificativa || undefined,
        envioAutomatico: t.envio_automatico ?? false,
        dataEnvioAutomatico: t.data_envio_automatico || undefined,
        progresso: t.progresso || 0,
        responsavel: t.responsavel || undefined,
        departamento: t.departamento as Tarefa["departamento"] || undefined,
        contatoId: t.contato_id || undefined,
        arquivos: ((t as any).tarefa_arquivos || []).map((a: any) => ({
          id: a.id, nome: a.nome, tamanho: a.tamanho, tipo: a.tipo, url: a.url || undefined,
        })),
      }));

      setTarefas(formatted);
    } catch (error) {
      if (id !== fetchIdRef.current) return;
      console.error("Error fetching tarefas:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as tarefas", variant: "destructive" });
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [toast]);

  const addTarefa = useCallback(async (tarefa: Omit<Tarefa, "id" | "arquivos">) => {
    try {
      const { data, error } = await supabase
        .from("tarefas")
        .insert({
          titulo: tarefa.titulo, descricao: tarefa.descricao,
          empresa_id: tarefa.empresaId || null, status: tarefa.status,
          prioridade: tarefa.prioridade, data_vencimento: tarefa.dataVencimento || null,
          prazo_entrega: tarefa.prazoEntrega || null, requer_anexo: tarefa.requerAnexo ?? false,
          justificativa: tarefa.justificativa || null, envio_automatico: tarefa.envioAutomatico ?? false,
          data_envio_automatico: tarefa.dataEnvioAutomatico || null, progresso: tarefa.progresso || 0,
          responsavel: tarefa.responsavel || null, departamento: tarefa.departamento || null,
          contato_id: tarefa.contatoId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic: add to local state instead of full refetch
      const newTarefa: Tarefa = {
        id: data.id, titulo: data.titulo, descricao: data.descricao || "",
        empresaId: data.empresa_id || "", status: data.status as Tarefa["status"],
        prioridade: data.prioridade as Tarefa["prioridade"],
        dataVencimento: data.data_vencimento || undefined,
        prazoEntrega: data.prazo_entrega || undefined,
        requerAnexo: data.requer_anexo ?? false,
        justificativa: data.justificativa || undefined,
        envioAutomatico: data.envio_automatico ?? false,
        dataEnvioAutomatico: data.data_envio_automatico || undefined,
        progresso: data.progresso || 0,
        responsavel: data.responsavel || undefined,
        departamento: data.departamento as Tarefa["departamento"] || undefined,
        contatoId: data.contato_id || undefined,
        arquivos: [],
      };
      setTarefas(prev => [newTarefa, ...prev]);
      return data.id;
    } catch (error) {
      console.error("Error adding tarefa:", error);
      toast({ title: "Erro", description: "Não foi possível criar a tarefa", variant: "destructive" });
      return null;
    }
  }, [toast]);

  const updateTarefa = useCallback(async (id: string, updates: Partial<Tarefa>) => {
    // Optimistic local update first
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    try {
      const updateData: Record<string, unknown> = {};
      if (updates.titulo !== undefined) updateData.titulo = updates.titulo;
      if (updates.descricao !== undefined) updateData.descricao = updates.descricao;
      if (updates.empresaId !== undefined) updateData.empresa_id = updates.empresaId || null;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.prioridade !== undefined) updateData.prioridade = updates.prioridade;
      if (updates.dataVencimento !== undefined) updateData.data_vencimento = updates.dataVencimento || null;
      if (updates.prazoEntrega !== undefined) updateData.prazo_entrega = updates.prazoEntrega || null;
      if (updates.requerAnexo !== undefined) updateData.requer_anexo = updates.requerAnexo;
      if (updates.justificativa !== undefined) updateData.justificativa = updates.justificativa || null;
      if (updates.envioAutomatico !== undefined) updateData.envio_automatico = updates.envioAutomatico;
      if (updates.dataEnvioAutomatico !== undefined) updateData.data_envio_automatico = updates.dataEnvioAutomatico || null;
      if (updates.progresso !== undefined) updateData.progresso = updates.progresso;
      if (updates.responsavel !== undefined) updateData.responsavel = updates.responsavel || null;
      if (updates.departamento !== undefined) updateData.departamento = updates.departamento || null;
      if (updates.contatoId !== undefined) updateData.contato_id = updates.contatoId || null;

      const { error } = await supabase.from("tarefas").update(updateData).eq("id", id);
      if (error) throw error;
    } catch (error) {
      console.error("Error updating tarefa:", error);
      // Revert on failure
      fetchTarefas();
      toast({ title: "Erro", description: "Não foi possível atualizar a tarefa", variant: "destructive" });
    }
  }, [toast, fetchTarefas]);

  const deleteTarefa = useCallback(async (id: string) => {
    // Optimistic
    setTarefas(prev => prev.filter(t => t.id !== id));
    try {
      const { error } = await supabase.from("tarefas").delete().eq("id", id);
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting tarefa:", error);
      fetchTarefas();
      toast({ title: "Erro", description: "Não foi possível excluir a tarefa", variant: "destructive" });
    }
  }, [toast, fetchTarefas]);

  const uploadArquivo = useCallback(async (tarefaId: string, file: File) => {
    try {
      const fileName = `${tarefaId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("task-files").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("task-files").getPublicUrl(fileName);
      const { data: dbData, error: dbError } = await supabase.from("tarefa_arquivos").insert({
        tarefa_id: tarefaId, nome: file.name, tamanho: file.size, tipo: file.type, url: urlData.publicUrl,
      }).select().single();
      if (dbError) throw dbError;

      setTarefas(prev => prev.map(t => {
        if (t.id !== tarefaId) return t;
        return { ...t, arquivos: [...(t.arquivos || []), { id: dbData.id, nome: file.name, tamanho: file.size, tipo: file.type, url: urlData.publicUrl }] };
      }));
      toast({ title: "Sucesso", description: "Arquivo enviado com sucesso" });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({ title: "Erro", description: "Não foi possível enviar o arquivo", variant: "destructive" });
    }
  }, [toast]);

  const deleteArquivo = useCallback(async (arquivoId: string, url?: string) => {
    try {
      if (url) {
        const path = url.split("/task-files/")[1];
        if (path) await supabase.storage.from("task-files").remove([path]);
      }
      const { error } = await supabase.from("tarefa_arquivos").delete().eq("id", arquivoId);
      if (error) throw error;

      setTarefas(prev => prev.map(t => ({
        ...t,
        arquivos: (t.arquivos || []).filter(a => a.id !== arquivoId),
      })));
    } catch (error) {
      console.error("Error deleting arquivo:", error);
      toast({ title: "Erro", description: "Não foi possível excluir o arquivo", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => { fetchTarefas(); }, [fetchTarefas]);

  return { tarefas, loading, addTarefa, updateTarefa, deleteTarefa, uploadArquivo, deleteArquivo, refetch: fetchTarefas };
}
