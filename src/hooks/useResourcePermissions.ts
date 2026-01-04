import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ResourcePermission {
  id: string;
  user_id: string;
  empresa_id: string;
  module: string;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourcePermissionInput {
  user_id: string;
  empresa_id: string;
  module: string;
  resource: string;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_export?: boolean;
}

// Recursos por módulo - completo para controle granular
export const MODULE_RESOURCES: Record<string, { value: string; label: string; description?: string }[]> = {
  financialace: [
    { value: 'transacoes', label: 'Transações', description: 'Receitas, despesas e transferências' },
    { value: 'categorias', label: 'Categorias', description: 'Classificação de transações' },
    { value: 'contas_bancarias', label: 'Contas Bancárias', description: 'Cadastro de contas' },
    { value: 'centros_custo', label: 'Centros de Custo', description: 'Centros de custo e projetos' },
    { value: 'recorrencias', label: 'Recorrências', description: 'Transações recorrentes' },
    { value: 'metas', label: 'Metas Financeiras', description: 'Objetivos e metas' },
    { value: 'orcamentos', label: 'Orçamentos', description: 'Planejamento orçamentário' },
    { value: 'relatorios', label: 'Relatórios', description: 'Relatórios e dashboards' },
    { value: 'importacoes', label: 'Importações', description: 'Importação de extratos' },
    { value: 'conciliacao', label: 'Conciliação', description: 'Conciliação bancária' },
  ],
  erp: [
    { value: 'clientes', label: 'Clientes', description: 'Cadastro de clientes' },
    { value: 'fornecedores', label: 'Fornecedores', description: 'Cadastro de fornecedores' },
    { value: 'produtos', label: 'Produtos', description: 'Cadastro de produtos e serviços' },
    { value: 'categorias_produtos', label: 'Categorias de Produtos', description: 'Classificação de produtos' },
    { value: 'unidades', label: 'Unidades de Medida', description: 'UN, KG, LT, etc.' },
    { value: 'vendas', label: 'Vendas', description: 'Pedidos de venda' },
    { value: 'vendas_varejo', label: 'Vendas Varejo', description: 'Vendas para consumidor final' },
    { value: 'vendas_atacado', label: 'Vendas Atacado', description: 'Vendas para revendedores' },
    { value: 'vendas_servicos', label: 'Vendas de Serviços', description: 'Prestação de serviços' },
    { value: 'compras', label: 'Compras', description: 'Pedidos de compra' },
    { value: 'orcamentos_servico', label: 'Orçamentos de Serviço', description: 'Orçamentos para clientes' },
    { value: 'estoque', label: 'Estoque', description: 'Movimentações de estoque' },
    { value: 'estoque_lotes', label: 'Controle de Lotes', description: 'Rastreabilidade por lote' },
    { value: 'nfe', label: 'Notas Fiscais', description: 'Importação e gestão de NF-e' },
    { value: 'comissoes', label: 'Comissões', description: 'Comissões de vendedores' },
    { value: 'comissoes_relatorios', label: 'Relatórios de Comissões', description: 'Relatórios e extratos' },
    { value: 'metas_vendas', label: 'Metas de Vendas', description: 'Objetivos comerciais' },
    { value: 'precificacao', label: 'Precificação', description: 'Regras de preços e margens' },
    { value: 'descontos', label: 'Descontos', description: 'Políticas de desconto' },
    { value: 'promocoes', label: 'Promoções', description: 'Campanhas promocionais' },
  ],
  taskvault: [
    { value: 'tarefas', label: 'Tarefas', description: 'Gerenciamento de tarefas' },
    { value: 'atividades', label: 'Atividades', description: 'Histórico de atividades' },
    { value: 'arquivos', label: 'Arquivos', description: 'Anexos das tarefas' },
    { value: 'kanban', label: 'Kanban', description: 'Visualização Kanban' },
  ],
  conversores: [
    { value: 'fiscal', label: 'Arquivos Fiscais', description: 'XML de NF-e, SPED, CT-e' },
    { value: 'extrato', label: 'Extratos Bancários', description: 'OFX, PDF para CSV/Excel' },
    { value: 'documentos', label: 'Documentos Gerais', description: 'PDF, texto, planilhas' },
    { value: 'contabil', label: 'Dados Contábeis', description: 'Balancete, DRE, plano de contas' },
    { value: 'ajustasped', label: 'Ajusta SPED', description: 'Correção de arquivos SPED' },
    { value: 'lancaapae', label: 'Lança APAE', description: 'Importação de arquivos APAE' },
    { value: 'casa', label: 'Conversor CASA', description: 'Arquivos do sistema CASA' },
    { value: 'lider', label: 'Conversor LÍDER', description: 'Arquivos do sistema LÍDER' },
  ],
};

export const PERMISSION_ACTIONS = [
  { value: 'can_view', label: 'Visualizar' },
  { value: 'can_create', label: 'Criar' },
  { value: 'can_edit', label: 'Editar' },
  { value: 'can_delete', label: 'Excluir' },
  { value: 'can_export', label: 'Exportar' },
] as const;

export function useResourcePermissions(empresaId?: string, userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const query = useQuery({
    queryKey: ['resource-permissions', empresaId, userId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('user_resource_permissions')
        .select('*');

      if (empresaId) {
        queryBuilder = queryBuilder.eq('empresa_id', empresaId);
      }
      if (userId) {
        queryBuilder = queryBuilder.eq('user_id', userId);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return data as ResourcePermission[];
    },
    enabled: !!empresaId || !!userId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: ResourcePermissionInput) => {
      const { data, error } = await supabase
        .from('user_resource_permissions')
        .upsert(input, { onConflict: 'user_id,empresa_id,module,resource' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      toast({ title: 'Permissão atualizada' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar permissão', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_resource_permissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      toast({ title: 'Permissão removida' });
    },
  });

  // Função para checar se usuário tem permissão para um recurso específico
  const hasResourcePermission = (
    module: string,
    resource: string,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export'
  ): boolean => {
    if (!query.data) return false;
    
    const permission = query.data.find(
      p => p.module === module && p.resource === resource
    );
    
    return permission ? permission[action] : false;
  };

  // Obter permissões de um usuário para um módulo específico
  const getUserModulePermissions = (module: string) => {
    if (!query.data) return [];
    return query.data.filter(p => p.module === module);
  };

  return {
    permissions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    upsertPermission: upsertMutation.mutate,
    deletePermission: deleteMutation.mutate,
    hasResourcePermission,
    getUserModulePermissions,
    isUpdating: upsertMutation.isPending,
  };
}

// Hook para o usuário atual checar suas próprias permissões
export function useMyResourcePermissions(empresaId?: string) {
  const { user } = useAuth();
  return useResourcePermissions(empresaId, user?.id);
}
