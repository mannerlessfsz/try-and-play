/**
 * FONTE ÚNICA DE VERDADE PARA MÓDULOS DO SISTEMA
 * 
 * Este arquivo centraliza todas as definições de módulos, recursos e permissões.
 * Qualquer alteração em módulos deve ser feita APENAS aqui.
 * 
 * IMPORTANTE: Ao adicionar um novo módulo:
 * 1. Adicionar ao APP_MODULES abaixo
 * 2. Adicionar seus recursos ao MODULE_RESOURCES
 * 3. Executar migration para adicionar ao enum app_module no banco de dados
 * 4. Testar permissões no painel admin
 */

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Papéis do sistema (roles)
 * - admin: Acesso total à plataforma
 * - manager: Gerente de empresa
 * - user: Usuário comum
 */
export type AppRole = 'admin' | 'manager' | 'user';

/**
 * Módulos disponíveis no sistema (inclui legados para compatibilidade com banco)
 * NOTA: Inclui módulos legados (financialace, erp, ajustasped) para compatibilidade
 * com dados existentes no banco de dados
 */
export type AppModule = 
  | 'taskvault' 
  | 'gestao' 
  | 'conversores' 
  | 'conferesped'
  // Legados (mantidos para compatibilidade com banco de dados)
  | 'financialace' 
  | 'erp' 
  | 'ajustasped';

/**
 * Tipos de permissão por módulo
 */
export type PermissionType = 'view' | 'create' | 'edit' | 'delete' | 'export';

// ============================================================================
// CONSTANTES - MÓDULOS
// ============================================================================

/**
 * Lista oficial de módulos do sistema
 * Use esta lista em TODOS os componentes que precisam listar módulos
 */
export const APP_MODULES: {
  value: AppModule;
  label: string;
  description: string;
  color: string;
  icon?: string;
}[] = [
  {
    value: 'taskvault',
    label: 'TaskVault',
    description: 'Gestão de tarefas e projetos',
    color: 'bg-red-500',
  },
  {
    value: 'gestao',
    label: 'GESTÃO',
    description: 'Sistema integrado financeiro e ERP',
    color: 'bg-blue-500',
  },
  {
    value: 'conversores',
    label: 'Conversores',
    description: 'Conversão de arquivos fiscais, extratos e documentos',
    color: 'bg-green-500',
  },
  {
    value: 'conferesped',
    label: 'ConfereSped',
    description: 'Conferência de arquivos SPED',
    color: 'bg-orange-500',
  },
];

/**
 * Mapa rápido para obter label de um módulo (inclui legados)
 */
export const MODULE_LABELS: Record<AppModule, string> = {
  taskvault: 'TaskVault',
  gestao: 'GESTÃO',
  conversores: 'Conversores',
  conferesped: 'ConfereSped',
  // Legados - apontam para os novos
  financialace: 'GESTÃO',
  erp: 'GESTÃO',
  ajustasped: 'Conversores',
};

/**
 * Mapeamento de módulos legados para os atuais
 * Usado para compatibilidade com dados antigos no banco
 */
export const LEGACY_MODULE_MAP: Record<string, AppModule> = {
  'financialace': 'gestao',
  'erp': 'gestao',
  'ajustasped': 'conversores',
};

/**
 * Função para normalizar nome de módulo (legado -> atual)
 */
export function normalizeModuleName(module: string): AppModule {
  return LEGACY_MODULE_MAP[module] || (module as AppModule);
}

// ============================================================================
// CONSTANTES - RECURSOS POR MÓDULO
// ============================================================================

/**
 * Recursos granulares por módulo
 * Cada módulo possui recursos específicos que podem ter permissões individuais
 */
export const MODULE_RESOURCES: Record<AppModule, { value: string; label: string; description?: string }[]> = {
  gestao: [
    // Financeiro
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
    // ERP
    { value: 'clientes', label: 'Clientes', description: 'Cadastro de clientes' },
    { value: 'fornecedores', label: 'Fornecedores', description: 'Cadastro de fornecedores' },
    { value: 'produtos', label: 'Produtos', description: 'Cadastro de produtos e serviços' },
    { value: 'categorias_produtos', label: 'Categorias de Produtos', description: 'Classificação de produtos' },
    { value: 'unidades', label: 'Unidades de Medida', description: 'UN, KG, LT, etc.' },
    { value: 'vendas', label: 'Vendas', description: 'Pedidos de venda' },
    { value: 'compras', label: 'Compras', description: 'Pedidos de compra' },
    { value: 'orcamentos_servico', label: 'Orçamentos de Serviço', description: 'Orçamentos para clientes' },
    { value: 'estoque', label: 'Estoque', description: 'Movimentações de estoque' },
    { value: 'nfe', label: 'Notas Fiscais', description: 'Importação e gestão de NF-e' },
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
  conferesped: [
    { value: 'conferencia', label: 'Conferência', description: 'Conferência de arquivos SPED' },
    { value: 'relatorios', label: 'Relatórios', description: 'Relatórios de conferência' },
    { value: 'validacao', label: 'Validação', description: 'Validação de registros' },
  ],
  // Legados - redirecionam para os módulos atuais
  financialace: [], // Usar recursos de 'gestao'
  erp: [], // Usar recursos de 'gestao'
  ajustasped: [], // Usar recursos de 'conversores'
};

// ============================================================================
// CONSTANTES - PERMISSÕES
// ============================================================================

/**
 * Tipos de permissão disponíveis
 */
export const PERMISSION_TYPES: { value: PermissionType; label: string }[] = [
  { value: 'view', label: 'Visualizar' },
  { value: 'create', label: 'Criar' },
  { value: 'edit', label: 'Editar' },
  { value: 'delete', label: 'Excluir' },
  { value: 'export', label: 'Exportar' },
];

/**
 * Ações de permissão para recursos (formato usado em user_resource_permissions)
 */
export const PERMISSION_ACTIONS = [
  { value: 'can_view', label: 'Visualizar' },
  { value: 'can_create', label: 'Criar' },
  { value: 'can_edit', label: 'Editar' },
  { value: 'can_delete', label: 'Excluir' },
  { value: 'can_export', label: 'Exportar' },
] as const;

/**
 * Papéis (roles) do sistema
 */
export const ROLES: { value: AppRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Administrador', color: 'bg-red-500' },
  { value: 'manager', label: 'Gerente', color: 'bg-yellow-500' },
  { value: 'user', label: 'Usuário', color: 'bg-blue-500' },
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Obtém os recursos de um módulo
 */
export function getModuleResources(module: AppModule) {
  return MODULE_RESOURCES[module] || [];
}

/**
 * Obtém o label de um módulo
 */
export function getModuleLabel(module: AppModule | string): string {
  const normalized = normalizeModuleName(module);
  return MODULE_LABELS[normalized] || module;
}

/**
 * Verifica se um módulo existe
 */
export function isValidModule(module: string): module is AppModule {
  return APP_MODULES.some(m => m.value === module) || Object.keys(LEGACY_MODULE_MAP).includes(module);
}

/**
 * Obtém todos os recursos de todos os módulos (flat)
 */
export function getAllResources() {
  return Object.entries(MODULE_RESOURCES).flatMap(([module, resources]) =>
    resources.map(r => ({ ...r, module: module as AppModule }))
  );
}
