import { useMemo } from "react";
import { useTarefas } from "@/hooks/useTarefas";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";

/**
 * Hook for the client portal — returns only tasks belonging to the client's active empresa
 */
export function useClienteTarefas() {
  const { user } = useAuth();
  const { empresaAtiva } = useEmpresaAtiva();
  const { tarefas, loading, updateTarefa, uploadArquivo, deleteArquivo, refetch } = useTarefas();

  const clienteTarefas = useMemo(() => {
    if (!empresaAtiva) return [];
    return tarefas.filter(t => t.empresaId === empresaAtiva.id);
  }, [tarefas, empresaAtiva]);

  const marcarConcluida = async (id: string, justificativa?: string) => {
    const updates: Record<string, unknown> = {
      status: "concluida" as const,
      progresso: 100,
    };
    if (justificativa) {
      updates.justificativa = justificativa;
    }
    await updateTarefa(id, updates);
  };

  return {
    tarefas: clienteTarefas,
    empresaAtiva,
    loading,
    marcarConcluida,
    uploadArquivo,
    deleteArquivo,
    refetch,
  };
}
