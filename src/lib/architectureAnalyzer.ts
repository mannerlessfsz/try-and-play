/**
 * ANALISADOR DE ARQUITETURA DO PROJETO
 * 
 * Gera o mapeamento completo de:
 * - Estrutura de arquivos
 * - Dependências entre módulos
 * - Problemas e inconsistências
 */

import { 
  ArchitectureGraph, 
  ArchitectureNode, 
  ArchitectureDependency,
  ArchitectureIssue,
  NodeType,
  NodeStatus,
  ProjectStructure 
} from '@/types/architecture';

// ============================================================================
// MAPEAMENTO ESTÁTICO DO PROJETO (baseado na auditoria)
// ============================================================================

/**
 * Estrutura completa do projeto VAULT
 * Atualizado manualmente após cada grande mudança
 */
export function generateProjectStructure(): ProjectStructure {
  return {
    // ========== PÁGINAS ==========
    pages: [
      {
        name: 'LandingPage',
        path: 'src/pages/LandingPage.tsx',
        route: '/',
        components: ['VaultLogo', 'ParticleField', 'GradientMesh', 'TiltCard', 'CompactFeatureCard'],
        hooks: [],
      },
      {
        name: 'ClientAuth',
        path: 'src/pages/ClientAuth.tsx',
        route: '/auth',
        components: [],
        hooks: ['useAuth'],
      },
      {
        name: 'MasterAuth',
        path: 'src/pages/MasterAuth.tsx',
        route: '/sys-a7x9k2',
        components: [],
        hooks: ['useAuth'],
      },
      {
        name: 'Dashboard (Index)',
        path: 'src/pages/Index.tsx',
        route: '/dashboard',
        components: ['ModularDashboardLayout'],
        hooks: ['useAuth', 'useModulePermissions', 'useEmpresaAtiva'],
      },
      {
        name: 'Admin',
        path: 'src/pages/Admin.tsx',
        route: '/admin',
        components: [
          'AdminDashboard', 'EmpresaWizard', 'EmpresaUsersManager', 
          'ModulePermissionsEditor', 'AuditLogViewer', 'SystemArchitectureViewer',
          'PermissionTreeDiagram', 'TarefasModeloManager', 'CreationEditionManager',
          'ProjectArchitectureViewer'
        ],
        hooks: ['useAuth', 'useModulePermissions', 'useEmpresas', 'useSyncProfiles'],
      },
      {
        name: 'TaskVault',
        path: 'src/pages/TaskVault.tsx',
        route: '/taskvault',
        module: 'taskvault',
        components: ['KanbanCard', 'TaskModal', 'EmpresaModal', 'ExpandedTaskCard'],
        hooks: ['useTarefas', 'useEmpresas', 'useEmpresaAtiva', 'useAtividades'],
      },
      {
        name: 'FinancialACE (GESTÃO)',
        path: 'src/pages/FinancialACE.tsx',
        route: '/gestao',
        module: 'gestao',
        components: [
          'ModernSidebar', 'FinancialDashboard', 'TransacoesManager', 
          'ContasBancariasManager', 'CategoriasManager', 'CentrosCustoManager',
          'RecorrenciasManager', 'MetasFinanceirasManager', 'RelatoriosManager',
          'ClientesManager', 'FornecedoresManager', 'ProdutosManager',
          'VendasManager', 'ComprasManager', 'OrcamentosManager', 'EstoqueManager'
        ],
        hooks: [
          'useTransacoes', 'useContasBancarias', 'useCategorias', 'useCentrosCusto',
          'useRecorrencias', 'useMetasFinanceiras', 'useClientes', 'useFornecedores',
          'useProdutos', 'useVendas', 'useCompras', 'useOrcamentos', 'useEstoque',
          'useEmpresaAtiva', 'useModulePermissions'
        ],
      },
      {
        name: 'Conversores',
        path: 'src/pages/Conversores.tsx',
        route: '/conversores',
        module: 'conversores',
        components: [
          'AjustaSpedTab', 'LancaApaeTab', 'ConversorCasaTab', 'ConversorLiderTab',
          'ConversorExtrato', 'ConversorDocumentos', 'ConversorContabil'
        ],
        hooks: ['useConversoes', 'useEmpresaAtiva'],
      },
      {
        name: 'Messenger',
        path: 'src/pages/Messenger.tsx',
        route: '/messenger',
        module: 'messenger',
        components: ['MessengerSidebar', 'FloatingMessengerOrbs'],
        hooks: ['useEmpresaAtiva'],
      },
    ],

    // ========== HOOKS ==========
    hooks: [
      // ===== CORE =====
      {
        name: 'useAuth',
        path: 'src/contexts/AuthContext.tsx',
        usedBy: ['ProtectedRoute', 'Admin', 'ClientAuth', 'MasterAuth', 'Index', 'useModulePermissions'],
        dependencies: ['supabase'],
        status: 'active',
      },
      {
        name: 'useEmpresaAtiva',
        path: 'src/hooks/useEmpresaAtiva.ts',
        usedBy: ['TaskVault', 'FinancialACE', 'Conversores', 'Messenger', 'most managers'],
        dependencies: ['useAuth', 'useEmpresas'],
        tables: ['empresas', 'user_empresas'],
        status: 'active',
      },
      
      // ===== PERMISSÕES (UNIFICADO) =====
      {
        name: 'useModulePermissions',
        path: 'src/hooks/useModulePermissions.ts',
        usedBy: ['ProtectedRoute', 'Index', 'Admin', 'Conversores', 'ModulePermissionsEditor', 'all modules'],
        dependencies: ['useAuth', 'supabase'],
        tables: ['user_roles', 'user_module_permissions', 'user_empresas'],
        status: 'active',
        issues: [],
      },
      
      // ===== EMPRESAS =====
      {
        name: 'useEmpresas',
        path: 'src/hooks/useEmpresas.ts',
        usedBy: ['Admin', 'TaskVault', 'useEmpresaAtiva'],
        dependencies: ['supabase'],
        tables: ['empresas'],
        status: 'active',
      },
      {
        name: 'useEmpresaContatos',
        path: 'src/hooks/useEmpresaContatos.ts',
        usedBy: ['EmpresaContatosManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['empresa_contatos', 'contato_departamentos'],
        status: 'active',
      },
      
      // ===== TAREFAS =====
      {
        name: 'useTarefas',
        path: 'src/hooks/useTarefas.ts',
        usedBy: ['TaskVault', 'GESTÃO tarefas section'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['tarefas', 'tarefa_arquivos'],
        status: 'active',
      },
      {
        name: 'useTarefasModelo',
        path: 'src/hooks/useTarefasModelo.ts',
        usedBy: ['TarefasModeloManager'],
        dependencies: ['supabase'],
        tables: ['tarefas_modelo', 'tarefa_modelo_regimes'],
        status: 'active',
      },
      {
        name: 'useAtividades',
        path: 'src/hooks/useAtividades.ts',
        usedBy: ['TaskVault', 'AuditLogViewer'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['atividades'],
        status: 'active',
      },
      
      // ===== FINANCEIRO =====
      {
        name: 'useTransacoes',
        path: 'src/hooks/useTransacoes.ts',
        usedBy: ['TransacoesManager', 'TransacoesUnificadasManager', 'FinancialDashboard'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['transacoes'],
        status: 'active',
      },
      {
        name: 'useContasBancarias',
        path: 'src/hooks/useContasBancarias.ts',
        usedBy: ['ContasBancariasManager', 'TransacoesManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['contas_bancarias'],
        status: 'active',
      },
      {
        name: 'useCategorias',
        path: 'src/hooks/useCategorias.ts',
        usedBy: ['CategoriasManager', 'TransacoesManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['categorias_financeiras'],
        status: 'active',
      },
      {
        name: 'useCentrosCusto',
        path: 'src/hooks/useCentrosCusto.ts',
        usedBy: ['CentrosCustoManager', 'TransacoesManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['centros_custo'],
        status: 'active',
      },
      {
        name: 'useRecorrencias',
        path: 'src/hooks/useRecorrencias.ts',
        usedBy: ['RecorrenciasManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['recorrencias'],
        status: 'active',
      },
      {
        name: 'useMetasFinanceiras',
        path: 'src/hooks/useMetasFinanceiras.ts',
        usedBy: ['MetasFinanceirasManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['metas_financeiras'],
        status: 'active',
      },
      {
        name: 'useSaldoContas',
        path: 'src/hooks/useSaldoContas.ts',
        usedBy: ['FinancialDashboard', 'ContasBancariasManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['transacoes', 'contas_bancarias'],
        status: 'active',
      },
      {
        name: 'useParcelasAlerta',
        path: 'src/hooks/useParcelasAlerta.ts',
        usedBy: ['ParcelasAlertaWidget'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['transacoes'],
        status: 'active',
      },
      {
        name: 'useImportacoesExtrato',
        path: 'src/hooks/useImportacoesExtrato.ts',
        usedBy: ['ImportExtratoModal'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['importacoes_extrato'],
        status: 'active',
      },
      
      // ===== ERP =====
      {
        name: 'useClientes',
        path: 'src/hooks/useClientes.ts',
        usedBy: ['ClientesManager', 'VendaFormModal', 'OrcamentosManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['clientes'],
        status: 'active',
      },
      {
        name: 'useFornecedores',
        path: 'src/hooks/useFornecedores.ts',
        usedBy: ['FornecedoresManager', 'ComprasManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['fornecedores'],
        status: 'active',
      },
      {
        name: 'useProdutos',
        path: 'src/hooks/useProdutos.ts',
        usedBy: ['ProdutosManager', 'VendasManager', 'ComprasManager', 'EstoqueManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['produtos', 'categorias_produtos', 'unidades_medida'],
        status: 'active',
      },
      {
        name: 'useVendas',
        path: 'src/hooks/useVendas.ts',
        usedBy: ['VendasManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['vendas', 'venda_itens'],
        status: 'active',
      },
      {
        name: 'useCompras',
        path: 'src/hooks/useCompras.ts',
        usedBy: ['ComprasManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['compras', 'compra_itens'],
        status: 'active',
      },
      {
        name: 'useOrcamentos',
        path: 'src/hooks/useOrcamentos.ts',
        usedBy: ['OrcamentosManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['orcamentos_servico', 'orcamento_itens'],
        status: 'active',
      },
      {
        name: 'useEstoque',
        path: 'src/hooks/useEstoque.ts',
        usedBy: ['EstoqueManager'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['estoque_movimentos', 'produtos'],
        status: 'active',
      },
      
      // ===== CONVERSORES =====
      {
        name: 'useConversoes',
        path: 'src/hooks/useConversoes.ts',
        usedBy: ['Conversores page', 'all conversor tabs'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['conversoes_arquivos'],
        status: 'active',
      },
      {
        name: 'useRegrasExclusaoLider',
        path: 'src/hooks/useRegrasExclusaoLider.ts',
        usedBy: ['ConversorLiderTab'],
        dependencies: ['supabase', 'useEmpresaAtiva'],
        tables: ['regras_exclusao_lider'],
        status: 'active',
      },
      
      // ===== ADMIN =====
      {
        name: 'useAdminNotifications',
        path: 'src/hooks/useAdminNotifications.ts',
        usedBy: ['NotificationCenter'],
        dependencies: ['supabase'],
        tables: ['admin_notifications'],
        status: 'active',
      },
      {
        name: 'useAuditLogs',
        path: 'src/hooks/useAuditLogs.ts',
        usedBy: ['AuditLogViewer'],
        dependencies: ['supabase'],
        tables: ['audit_logs'],
        status: 'active',
      },
      {
        name: 'useSyncProfiles',
        path: 'src/hooks/useSyncProfiles.ts',
        usedBy: ['Admin'],
        dependencies: ['supabase'],
        tables: ['profiles'],
        status: 'active',
      },
      
      // ===== UI =====
      {
        name: 'useWidgetPreferences',
        path: 'src/hooks/useWidgetPreferences.ts',
        usedBy: ['WidgetManagerPanel', 'ModularDashboardLayout'],
        dependencies: ['localStorage'],
        status: 'active',
      },
      {
        name: 'use-mobile',
        path: 'src/hooks/use-mobile.tsx',
        usedBy: ['various UI components'],
        dependencies: [],
        status: 'active',
      },
      {
        name: 'use-toast',
        path: 'src/hooks/use-toast.ts',
        usedBy: ['almost all components'],
        dependencies: [],
        status: 'active',
      },
    ],

    // ========== COMPONENTES (resumido por categoria) ==========
    components: [
      // UI Base (shadcn) - ~40 componentes
      { name: 'Button', path: 'src/components/ui/button.tsx', category: 'ui', usedBy: ['*'], uses: [] },
      { name: 'Card', path: 'src/components/ui/card.tsx', category: 'ui', usedBy: ['*'], uses: [] },
      { name: 'Dialog', path: 'src/components/ui/dialog.tsx', category: 'ui', usedBy: ['*'], uses: [] },
      { name: 'Input', path: 'src/components/ui/input.tsx', category: 'ui', usedBy: ['*'], uses: [] },
      { name: 'Select', path: 'src/components/ui/select.tsx', category: 'ui', usedBy: ['*'], uses: [] },
      { name: 'Table', path: 'src/components/ui/table.tsx', category: 'ui', usedBy: ['*'], uses: [] },
      { name: 'Tabs', path: 'src/components/ui/tabs.tsx', category: 'ui', usedBy: ['*'], uses: [] },
      
      // Landing
      { name: 'VaultLogo', path: 'src/components/VaultLogo.tsx', category: 'landing', usedBy: ['LandingPage'], uses: [] },
      { name: 'ParticleField', path: 'src/components/ParticleField.tsx', category: 'landing', usedBy: ['LandingPage'], uses: [] },
      { name: 'GradientMesh', path: 'src/components/GradientMesh.tsx', category: 'landing', usedBy: ['LandingPage'], uses: [] },
      { name: 'TiltCard', path: 'src/components/TiltCard.tsx', category: 'landing', usedBy: ['LandingPage'], uses: [] },
      { name: 'CompactFeatureCard', path: 'src/components/CompactFeatureCard.tsx', category: 'landing', usedBy: ['LandingPage'], uses: [] },
      
      // Admin - 14 componentes
      { name: 'AdminDashboard', path: 'src/components/admin/AdminDashboard.tsx', category: 'admin', usedBy: ['Admin'], uses: [] },
      { name: 'EmpresaWizard', path: 'src/components/admin/EmpresaWizard.tsx', category: 'admin', usedBy: ['Admin'], uses: ['useEmpresas'] },
      { name: 'EmpresaUsersManager', path: 'src/components/admin/EmpresaUsersManager.tsx', category: 'admin', usedBy: ['Admin'], uses: [] },
      { name: 'ModulePermissionsEditor', path: 'src/components/admin/ModulePermissionsEditor.tsx', category: 'admin', usedBy: ['Admin', 'EmpresaUsersManager'], uses: ['useManageModulePermissions'] },
      { name: 'PermissionTreeDiagram', path: 'src/components/admin/PermissionTreeDiagram.tsx', category: 'admin', usedBy: ['Admin'], uses: [] },
      { name: 'SystemArchitectureViewer', path: 'src/components/admin/SystemArchitectureViewer.tsx', category: 'admin', usedBy: ['Admin'], uses: [] },
      { name: 'AuditLogViewer', path: 'src/components/admin/AuditLogViewer.tsx', category: 'admin', usedBy: ['Admin'], uses: ['useAuditLogs'] },
      { name: 'TarefasModeloManager', path: 'src/components/admin/TarefasModeloManager.tsx', category: 'admin', usedBy: ['Admin'], uses: ['useTarefasModelo'] },
      
      // Gestão - 11 componentes
      { name: 'ModernSidebar', path: 'src/components/gestao/ModernSidebar.tsx', category: 'gestao', usedBy: ['FinancialACE'], uses: [] },
      { name: 'FinancialDashboard', path: 'src/components/gestao/FinancialDashboard.tsx', category: 'gestao', usedBy: ['FinancialACE'], uses: ['useTransacoes', 'useSaldoContas'] },
      { name: 'ModularDashboardLayout', path: 'src/components/gestao/ModularDashboardLayout.tsx', category: 'gestao', usedBy: ['Index'], uses: ['useWidgetPreferences'] },
      
      // Financial - 11 componentes
      { name: 'TransacoesManager', path: 'src/components/financial/TransacoesManager.tsx', category: 'financial', usedBy: ['FinancialACE'], uses: ['useTransacoes'] },
      { name: 'ContasBancariasManager', path: 'src/components/financial/ContasBancariasManager.tsx', category: 'financial', usedBy: ['FinancialACE'], uses: ['useContasBancarias'] },
      { name: 'CategoriasManager', path: 'src/components/financial/CategoriasManager.tsx', category: 'financial', usedBy: ['FinancialACE'], uses: ['useCategorias'] },
      
      // ERP - 12 componentes
      { name: 'ClientesManager', path: 'src/components/erp/ClientesManager.tsx', category: 'erp', usedBy: ['FinancialACE'], uses: ['useClientes'] },
      { name: 'FornecedoresManager', path: 'src/components/erp/FornecedoresManager.tsx', category: 'erp', usedBy: ['FinancialACE'], uses: ['useFornecedores'] },
      { name: 'ProdutosManager', path: 'src/components/erp/ProdutosManager.tsx', category: 'erp', usedBy: ['FinancialACE'], uses: ['useProdutos'] },
      { name: 'VendasManager', path: 'src/components/erp/VendasManager.tsx', category: 'erp', usedBy: ['FinancialACE'], uses: ['useVendas'] },
      { name: 'ComprasManager', path: 'src/components/erp/ComprasManager.tsx', category: 'erp', usedBy: ['FinancialACE'], uses: ['useCompras'] },
      
      // Task - 7 componentes
      { name: 'KanbanCard', path: 'src/components/task/KanbanCard.tsx', category: 'task', usedBy: ['TaskVault'], uses: [] },
      { name: 'TaskModal', path: 'src/components/task/TaskModal.tsx', category: 'task', usedBy: ['TaskVault'], uses: [] },
      { name: 'EmpresaModal', path: 'src/components/task/EmpresaModal.tsx', category: 'task', usedBy: ['TaskVault'], uses: [] },
      
      // Conversores - 9 componentes
      { name: 'ConversorBase', path: 'src/components/conversores/ConversorBase.tsx', category: 'conversores', usedBy: ['all conversor tabs'], uses: [] },
      { name: 'AjustaSpedTab', path: 'src/components/conversores/AjustaSpedTab.tsx', category: 'conversores', usedBy: ['Conversores'], uses: ['ConversorBase'] },
      { name: 'ConversorExtrato', path: 'src/components/conversores/ConversorExtrato.tsx', category: 'conversores', usedBy: ['Conversores'], uses: ['ConversorBase'] },
      
      // Messenger - 2 componentes
      { name: 'MessengerSidebar', path: 'src/components/messenger/MessengerSidebar.tsx', category: 'messenger', usedBy: ['Messenger'], uses: [] },
      { name: 'FloatingMessengerOrbs', path: 'src/components/messenger/FloatingMessengerOrbs.tsx', category: 'messenger', usedBy: ['App'], uses: [] },
    ],

    // ========== CONTEXTOS ==========
    contexts: [
      {
        name: 'AuthContext',
        path: 'src/contexts/AuthContext.tsx',
        provides: ['user', 'session', 'loading', 'signIn', 'signUp', 'signOut'],
        usedBy: ['ProtectedRoute', 'useModulePermissions', 'all protected pages'],
      },
      {
        name: 'EmpresaAtivaContext',
        path: 'src/contexts/EmpresaAtivaContext.tsx',
        provides: ['empresaAtiva', 'setEmpresaAtiva', 'empresas'],
        usedBy: ['all module pages', 'all managers'],
      },
    ],

    // ========== CONSTANTES ==========
    constants: [
      {
        name: 'modules',
        path: 'src/constants/modules.ts',
        exports: ['AppModule', 'AppRole', 'PermissionType', 'APP_MODULES', 'MODULE_LABELS', 'LEGACY_MODULE_MAP'],
        usedBy: ['useModulePermissions', 'ProtectedRoute', 'Admin', 'ModulePermissionsEditor'],
      },
      {
        name: 'routes',
        path: 'src/constants/routes.ts',
        exports: ['SYSTEM_ROUTES', 'getRoutesByType', 'getModuleRoute'],
        usedBy: ['SystemArchitectureViewer'],
      },
    ],

    // ========== BANCO DE DADOS ==========
    database: {
      tables: [
        { name: 'profiles', columns: ['id', 'email', 'full_name', 'ativo', 'avatar_url'], hasRLS: true, policies: ['Users can view own', 'Admin can view all'], usedByHooks: ['useSyncProfiles'] },
        { name: 'user_roles', columns: ['id', 'user_id', 'role'], hasRLS: true, policies: ['Admin only'], usedByHooks: ['useModulePermissions'] },
        { name: 'user_module_permissions', columns: ['id', 'user_id', 'empresa_id', 'module', 'can_*', 'is_pro_mode'], hasRLS: true, policies: ['Admin only'], usedByHooks: ['useModulePermissions'] },
        { name: 'user_empresas', columns: ['id', 'user_id', 'empresa_id', 'is_owner'], hasRLS: true, policies: ['User can view own'], usedByHooks: ['useModulePermissions', 'useEmpresaAtiva'] },
        { name: 'empresas', columns: ['id', 'nome', 'cnpj', 'ativo', 'regime_tributario'], hasRLS: true, policies: ['Admin or member'], usedByHooks: ['useEmpresas', 'useEmpresaAtiva'] },
        { name: 'empresa_modulos', columns: ['id', 'empresa_id', 'modulo', 'modo', 'ativo'], hasRLS: true, policies: ['Admin only'], usedByHooks: ['useModulePermissions'] },
        { name: 'empresa_contatos', columns: ['id', 'empresa_id', 'nome', 'email', 'cargo'], hasRLS: true, policies: ['Member can view'], usedByHooks: ['useEmpresaContatos'] },
        { name: 'tarefas', columns: ['id', 'empresa_id', 'titulo', 'status', 'prioridade'], hasRLS: true, policies: ['Member access'], usedByHooks: ['useTarefas'] },
        { name: 'transacoes', columns: ['id', 'empresa_id', 'tipo', 'valor', 'data_transacao'], hasRLS: true, policies: ['Member access'], usedByHooks: ['useTransacoes'] },
        { name: 'produtos', columns: ['id', 'empresa_id', 'nome', 'preco_venda', 'estoque_atual'], hasRLS: true, policies: ['Member access'], usedByHooks: ['useProdutos'] },
      ],
      functions: [
        { name: 'is_admin', usedBy: ['RLS policies', 'other functions'] },
        { name: 'has_role', usedBy: ['RLS policies', 'is_admin'] },
        { name: 'has_empresa_access', usedBy: ['RLS policies'] },
        { name: 'has_module_permission', usedBy: ['RLS policies'] },
        { name: 'grant_module_permission', usedBy: ['useManageModulePermissions'] },
        { name: 'revoke_module_permission', usedBy: ['useManageModulePermissions'] },
        { name: 'get_empresas_safe', usedBy: ['useEmpresas'] },
        { name: 'fix_permission_inconsistencies', usedBy: ['Admin'] },
        { name: 'gerar_tarefas_empresa', usedBy: ['triggers'] },
      ],
    },
  };
}

// ============================================================================
// ANÁLISE DE PROBLEMAS
// ============================================================================

export interface AnalysisResult {
  issues: {
    id: string;
    severity: 'error' | 'warning' | 'info';
    category: 'duplicate' | 'orphan' | 'inconsistency' | 'missing' | 'deprecated';
    title: string;
    description: string;
    affectedFiles: string[];
    suggestion: string;
  }[];
  stats: {
    totalFiles: number;
    totalHooks: number;
    totalComponents: number;
    issuesByCategory: Record<string, number>;
  };
}

export function analyzeProject(structure: ProjectStructure): AnalysisResult {
  const issues: AnalysisResult['issues'] = [];

  // 1. Detectar hooks duplicados
  const permissionHooks = structure.hooks.filter(h => 
    h.name.toLowerCase().includes('permission')
  );
  if (permissionHooks.length > 1) {
    issues.push({
      id: 'dup-permissions',
      severity: 'error',
      category: 'duplicate',
      title: 'Hooks de permissão duplicados',
      description: `Existem ${permissionHooks.length} hooks de permissão: ${permissionHooks.map(h => h.name).join(', ')}. Verifique se há duplicidade real ou apenas aliases.`,
      affectedFiles: permissionHooks.map(h => h.path),
      suggestion: 'O hook único é useModulePermissions. Aliases como usePermissions são apenas reexportações e não representam duplicidade real.',
    });
  }

  // 2. Detectar hooks órfãos (sem uso)
  const allUsedHooks = new Set<string>();
  structure.pages.forEach(p => p.hooks.forEach(h => allUsedHooks.add(h)));
  structure.components.forEach(c => c.uses.forEach(u => allUsedHooks.add(u)));
  
  structure.hooks.forEach(hook => {
    if (!allUsedHooks.has(hook.name) && hook.usedBy.length === 0) {
      issues.push({
        id: `orphan-${hook.name}`,
        severity: 'warning',
        category: 'orphan',
        title: `Hook órfão: ${hook.name}`,
        description: `O hook ${hook.name} não parece estar sendo usado em nenhum lugar.`,
        affectedFiles: [hook.path],
        suggestion: 'Verificar se o hook ainda é necessário ou pode ser removido.',
      });
    }
  });

  // 3. Detectar inconsistências de importação
  // (seria necessário análise estática real do código)

  // 4. Listar issues já marcadas
  structure.hooks.forEach(hook => {
    if (hook.issues) {
      hook.issues.forEach((issue, idx) => {
        issues.push({
          id: `hook-issue-${hook.name}-${idx}`,
          severity: 'warning',
          category: 'inconsistency',
          title: `Issue em ${hook.name}`,
          description: issue,
          affectedFiles: [hook.path],
          suggestion: 'Revisar e corrigir o hook.',
        });
      });
    }
  });

  return {
    issues,
    stats: {
      totalFiles: structure.pages.length + structure.hooks.length + structure.components.length,
      totalHooks: structure.hooks.length,
      totalComponents: structure.components.length,
      issuesByCategory: issues.reduce((acc, issue) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  };
}

// ============================================================================
// GERAÇÃO DO GRAFO
// ============================================================================

export function generateArchitectureGraph(structure: ProjectStructure): ArchitectureGraph {
  const nodes: ArchitectureNode[] = [];
  const dependencies: ArchitectureDependency[] = [];
  let nodeId = 0;
  let depId = 0;

  const getNodeId = () => `node-${++nodeId}`;
  const getDepId = () => `dep-${++depId}`;
  const nodeMap = new Map<string, string>(); // name -> id

  // Raiz
  const rootId = getNodeId();
  nodes.push({
    id: rootId,
    name: 'VAULT',
    type: 'root',
    status: 'active',
    description: 'Sistema de gestão empresarial',
  });

  // Camadas
  const layers = ['pages', 'hooks', 'components', 'contexts', 'constants', 'database'];
  layers.forEach(layer => {
    const layerId = getNodeId();
    nodes.push({
      id: layerId,
      name: layer,
      type: 'layer',
      status: 'active',
      parentId: rootId,
    });
    nodeMap.set(`layer-${layer}`, layerId);
  });

  // Páginas
  structure.pages.forEach(page => {
    const pageId = getNodeId();
    nodes.push({
      id: pageId,
      name: page.name,
      type: 'page',
      status: 'active',
      path: page.path,
      parentId: nodeMap.get('layer-pages'),
    });
    nodeMap.set(page.name, pageId);
  });

  // Hooks
  structure.hooks.forEach(hook => {
    const hookId = getNodeId();
    nodes.push({
      id: hookId,
      name: hook.name,
      type: 'hook',
      status: hook.status,
      path: hook.path,
      parentId: nodeMap.get('layer-hooks'),
      issues: hook.issues?.map(issue => ({
        id: `issue-${hookId}`,
        severity: 'warning',
        message: issue,
      })),
    });
    nodeMap.set(hook.name, hookId);
  });

  // Adicionar dependências
  structure.hooks.forEach(hook => {
    const sourceId = nodeMap.get(hook.name);
    if (!sourceId) return;

    hook.dependencies.forEach(dep => {
      const targetId = nodeMap.get(dep);
      if (targetId) {
        dependencies.push({
          id: getDepId(),
          sourceId,
          targetId,
          type: 'uses',
        });
      }
    });
  });

  structure.pages.forEach(page => {
    const sourceId = nodeMap.get(page.name);
    if (!sourceId) return;

    page.hooks.forEach(hookName => {
      const targetId = nodeMap.get(hookName);
      if (targetId) {
        dependencies.push({
          id: getDepId(),
          sourceId,
          targetId,
          type: 'uses',
        });
      }
    });
  });

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    nodes,
    dependencies,
    stats: {
      totalNodes: nodes.length,
      totalDependencies: dependencies.length,
      issuesCount: { error: 0, warning: 0, info: 0 },
      orphanCount: 0,
      duplicateCount: 0,
    },
  };
}
