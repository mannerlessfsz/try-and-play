import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type DepartamentoTipo = Database['public']['Enums']['departamento_tipo'];
type RegimeTributario = Database['public']['Enums']['regime_tributario'];

export interface TarefaModelo {
  id: string;
  titulo: string;
  descricao: string | null;
  departamento: DepartamentoTipo;
  prioridade: string;
  dia_vencimento: number | null;
  prazo_dias: number | null;
  requer_anexo: boolean | null;
  justificativa: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
  regimes?: RegimeTributario[];
}

export interface TarefaModeloFormData {
  titulo: string;
  descricao?: string;
  departamento: DepartamentoTipo;
  prioridade: string;
  dia_vencimento?: number;
  prazo_dias?: number;
  requer_anexo?: boolean;
  justificativa?: string;
  regimes: RegimeTributario[];
}

export function useTarefasModelo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all tarefas modelo with their regimes
  const { data: tarefasModelo = [], isLoading } = useQuery({
    queryKey: ['tarefas-modelo'],
    queryFn: async () => {
      // Fetch tarefas modelo
      const { data: modelos, error: modelosError } = await supabase
        .from('tarefas_modelo')
        .select('*')
        .order('departamento', { ascending: true })
        .order('titulo', { ascending: true });

      if (modelosError) throw modelosError;

      // Fetch regimes for each modelo
      const { data: regimes, error: regimesError } = await supabase
        .from('tarefa_modelo_regimes')
        .select('tarefa_modelo_id, regime_tributario');

      if (regimesError) throw regimesError;

      // Map regimes to modelos
      return (modelos || []).map(modelo => ({
        ...modelo,
        regimes: (regimes || [])
          .filter(r => r.tarefa_modelo_id === modelo.id)
          .map(r => r.regime_tributario)
      })) as TarefaModelo[];
    }
  });

  // Create tarefa modelo
  const createMutation = useMutation({
    mutationFn: async (formData: TarefaModeloFormData) => {
      // Insert modelo
      const { data: modelo, error: modeloError } = await supabase
        .from('tarefas_modelo')
        .insert({
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          departamento: formData.departamento,
          prioridade: formData.prioridade,
          dia_vencimento: formData.dia_vencimento || null,
          prazo_dias: formData.prazo_dias || null,
          requer_anexo: formData.requer_anexo || false,
          justificativa: formData.justificativa || null,
        })
        .select()
        .single();

      if (modeloError) throw modeloError;

      // Insert regimes
      if (formData.regimes.length > 0) {
        const regimesData = formData.regimes.map(regime => ({
          tarefa_modelo_id: modelo.id,
          regime_tributario: regime,
        }));

        const { error: regimesError } = await supabase
          .from('tarefa_modelo_regimes')
          .insert(regimesData);

        if (regimesError) throw regimesError;
      }

      return modelo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-modelo'] });
      toast({ title: 'Tarefa modelo criada com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar tarefa modelo', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Update tarefa modelo
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }: TarefaModeloFormData & { id: string }) => {
      // Update modelo
      const { error: modeloError } = await supabase
        .from('tarefas_modelo')
        .update({
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          departamento: formData.departamento,
          prioridade: formData.prioridade,
          dia_vencimento: formData.dia_vencimento || null,
          prazo_dias: formData.prazo_dias || null,
          requer_anexo: formData.requer_anexo || false,
          justificativa: formData.justificativa || null,
        })
        .eq('id', id);

      if (modeloError) throw modeloError;

      // Delete existing regimes
      const { error: deleteError } = await supabase
        .from('tarefa_modelo_regimes')
        .delete()
        .eq('tarefa_modelo_id', id);

      if (deleteError) throw deleteError;

      // Insert new regimes
      if (formData.regimes.length > 0) {
        const regimesData = formData.regimes.map(regime => ({
          tarefa_modelo_id: id,
          regime_tributario: regime,
        }));

        const { error: regimesError } = await supabase
          .from('tarefa_modelo_regimes')
          .insert(regimesData);

        if (regimesError) throw regimesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-modelo'] });
      toast({ title: 'Tarefa modelo atualizada!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar tarefa modelo', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Toggle ativo
  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('tarefas_modelo')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-modelo'] });
      toast({ title: ativo ? 'Tarefa modelo ativada' : 'Tarefa modelo inativada' });
    }
  });

  // Delete tarefa modelo
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Regimes are deleted by cascade
      const { error } = await supabase
        .from('tarefas_modelo')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-modelo'] });
      toast({ title: 'Tarefa modelo excluída' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao excluir tarefa modelo', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Generate tasks for a company
  const gerarTarefasMutation = useMutation({
    mutationFn: async ({ empresaId, mes, ano }: { empresaId: string; mes: number; ano: number }) => {
      const { data, error } = await supabase.rpc('gerar_tarefas_empresa', {
        p_empresa_id: empresaId,
        p_mes: mes,
        p_ano: ano,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast({ 
        title: 'Tarefas geradas!', 
        description: `${count} tarefa(s) criada(s) para o mês.`
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao gerar tarefas', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  return {
    tarefasModelo,
    isLoading,
    createTarefaModelo: createMutation.mutate,
    updateTarefaModelo: updateMutation.mutate,
    toggleAtivo: toggleAtivoMutation.mutate,
    deleteTarefaModelo: deleteMutation.mutate,
    gerarTarefas: gerarTarefasMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isGenerating: gerarTarefasMutation.isPending,
  };
}

export const REGIMES_TRIBUTARIOS: { value: RegimeTributario; label: string }[] = [
  { value: 'nano_empreendedor', label: 'Nano Empreendedor' },
  { value: 'mei', label: 'MEI - Micro Empreendedor Individual' },
  { value: 'simples_nacional', label: 'Simples Nacional' },
  { value: 'lucro_presumido', label: 'Lucro Presumido' },
  { value: 'lucro_real', label: 'Lucro Real' },
];

export const DEPARTAMENTOS: { value: DepartamentoTipo; label: string }[] = [
  { value: 'fiscal', label: 'Fiscal' },
  { value: 'contabil', label: 'Contábil' },
  { value: 'departamento_pessoal', label: 'Departamento Pessoal' },
];
