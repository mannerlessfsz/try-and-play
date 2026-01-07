/**
 * FONTE ÚNICA DE VERDADE PARA MÓDULOS DO SISTEMA
 * 
 * Este arquivo centraliza todas as definições de módulos, recursos e permissões.
 * Qualquer alteração em módulos deve ser feita APENAS aqui.
 * 
 * HIERARQUIA DE PERMISSÕES:
 * Módulo → Sub-módulo → Recurso → Ações (view, create, edit, delete, export)
 * 
 * Propagação em cascata:
 * - Negar módulo = nega tudo abaixo automaticamente
 * - Permitir módulo = permite configurar sub-módulos
 * - Permitir sub-módulo = permite configurar recursos
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
 */
export type AppModule = 
  | 'taskvault' 
  | 'gestao' 
  | 'conversores' 
  | 'messenger'
  // Legados (mantidos para compatibilidade com banco de dados)
  | 'financialace' 
  | 'erp' 
  | 'ajustasped'
  | 'conferesped';

/**
 * Sub-módulos do sistema (nível intermediário da hierarquia)
 */
export type AppSubModule = 
  | 'financeiro' 
  | 'erp_comercial' 
  | 'tarefas'
  // Sub-módulos de outros módulos
  | 'kanban'
  | 'fiscal'
  | 'extrato'
  | 'conferencia'
  | 'comunicacao';

/**
 * Tipos de permissão por módulo
 */
export type PermissionType = 'view' | 'create' | 'edit' | 'delete' | 'export';

// ============================================================================
// CONSTANTES - MÓDULOS
// ============================================================================

/**
 * Lista oficial de módulos do sistema
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
    value: 'messenger',
    label: 'Messenger',
    description: 'Comunicação via WhatsApp Business',
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
  messenger: 'Messenger',
  // Legados - apontam para os novos
  financialace: 'GESTÃO',
  erp: 'GESTÃO',
  ajustasped: 'Conversores',
  conferesped: 'Conversores',
};

/**
 * Mapeamento de módulos legados para os atuais
 */
export const LEGACY_MODULE_MAP: Record<string, AppModule> = {
  'financialace': 'gestao',
  'erp': 'gestao',
  'ajustasped': 'conversores',
  'conferesped': 'conversores',
};

/**
 * Função para normalizar nome de módulo (legado -> atual)
 */
export function normalizeModuleName(module: string): AppModule {
  return LEGACY_MODULE_MAP[module] || (module as AppModule);
}

// ============================================================================
// CONSTANTES - SUB-MÓDULOS
// ============================================================================

/**
 * Definição de sub-módulos por módulo
 * Esta é a estrutura hierárquica intermediária
 */
export interface SubModuleDefinition {
  value: AppSubModule;
  label: string;
  description: string;
  icon?: string;
}

export const MODULE_SUB_MODULES: Record<AppModule, SubModuleDefinition[]> = {
  gestao: [
    { value: 'financeiro', label: 'Financeiro', description: 'Contas, transações, conciliação e relatórios' },
    { value: 'erp_comercial', label: 'ERP', description: 'Produtos, clientes, vendas, compras e estoque' },
    { value: 'tarefas', label: 'Tarefas', description: 'Gestão de tarefas dentro da empresa' },
  ],
  taskvault: [
    { value: 'kanban', label: 'Kanban', description: 'Gestão visual de tarefas' },
  ],
  conversores: [
    { value: 'fiscal', label: 'Fiscal', description: 'Conversão de arquivos fiscais' },
    { value: 'extrato', label: 'Extrato', description: 'Conversão de extratos bancários' },
  ],
  messenger: [
    { value: 'comunicacao', label: 'Comunicação', description: 'Conversas, contatos e mensagens' },
  ],
  // Legados
  conferesped: [],
  financialace: [],
  erp: [],
  ajustasped: [],
};

// ============================================================================
// CONSTANTES - RECURSOS POR SUB-MÓDULO
// ============================================================================

/**
 * Recursos granulares por sub-módulo
 * Cada sub-módulo possui recursos específicos que podem ter permissões individuais
 */
export interface ResourceDefinition {
  value: string;
  label: string;
  description?: string;
}

export const SUB_MODULE_RESOURCES: Record<AppSubModule, ResourceDefinition[]> = {
  // GESTÃO > Financeiro
  financeiro: [
    { value: 'dashboard', label: 'Dashboard', description: 'Visão geral e indicadores' },
    { value: 'transacoes', label: 'Transações', description: 'Receitas, despesas e transferências' },
    { value: 'contas_bancarias', label: 'Contas Bancárias', description: 'Cadastro de contas' },
    { value: 'categorias', label: 'Categorias', description: 'Classificação de transações' },
    { value: 'centros_custo', label: 'Centros de Custo', description: 'Centros de custo e projetos' },
    { value: 'recorrencias', label: 'Recorrências', description: 'Transações recorrentes' },
    { value: 'metas', label: 'Metas Financeiras', description: 'Objetivos e metas' },
    { value: 'orcamentos', label: 'Orçamentos', description: 'Planejamento orçamentário' },
    { value: 'relatorios', label: 'Relatórios', description: 'Relatórios e DRE' },
    { value: 'importacoes', label: 'Importações', description: 'Importação de extratos' },
    { value: 'conciliacao', label: 'Conciliação', description: 'Conciliação bancária' },
  ],
  // GESTÃO > ERP
  erp_comercial: [
    { value: 'produtos', label: 'Produtos', description: 'Cadastro de produtos e serviços' },
    { value: 'categorias_produtos', label: 'Categorias de Produtos', description: 'Classificação de produtos' },
    { value: 'unidades', label: 'Unidades de Medida', description: 'UN, KG, LT, etc.' },
    { value: 'clientes', label: 'Clientes', description: 'Cadastro de clientes' },
    { value: 'fornecedores', label: 'Fornecedores', description: 'Cadastro de fornecedores' },
    { value: 'vendas', label: 'Vendas', description: 'Pedidos de venda' },
    { value: 'compras', label: 'Compras', description: 'Pedidos de compra' },
    { value: 'orcamentos_servico', label: 'Orçamentos', description: 'Orçamentos para clientes' },
    { value: 'estoque', label: 'Estoque', description: 'Movimentações de estoque' },
    { value: 'nfe', label: 'Notas Fiscais', description: 'Importação e gestão de NF-e' },
  ],
  // GESTÃO > Tarefas
  tarefas: [
    { value: 'tarefas', label: 'Tarefas', description: 'Gerenciamento de tarefas' },
    { value: 'atividades', label: 'Atividades', description: 'Histórico de atividades' },
  ],
  // TaskVault > Kanban
  kanban: [
    { value: 'tarefas', label: 'Tarefas', description: 'Gerenciamento de tarefas' },
    { value: 'atividades', label: 'Atividades', description: 'Histórico de atividades' },
    { value: 'arquivos', label: 'Arquivos', description: 'Anexos das tarefas' },
  ],
  // Conversores > Fiscal
  fiscal: [
    { value: 'ajustasped', label: 'Ajusta SPED', description: 'Correção de arquivos SPED' },
    { value: 'lancaapae', label: 'Lança APAE', description: 'Importação de arquivos APAE' },
    { value: 'casa', label: 'Conversor CASA', description: 'Arquivos do sistema CASA' },
    { value: 'lider', label: 'Conversor LÍDER', description: 'Arquivos do sistema LÍDER' },
    { value: 'contabil', label: 'Dados Contábeis', description: 'Balancete, DRE, plano de contas' },
  ],
  // Conversores > Extrato
  extrato: [
    { value: 'ofx', label: 'OFX', description: 'Arquivos OFX bancários' },
    { value: 'pdf', label: 'PDF', description: 'Extratos em PDF' },
    { value: 'documentos', label: 'Documentos Gerais', description: 'Outros formatos' },
  ],
  // ConfereSped > Conferência
  conferencia: [
    { value: 'validacao', label: 'Validação', description: 'Validação de registros SPED' },
    { value: 'relatorios', label: 'Relatórios', description: 'Relatórios de conferência' },
  ],
  // Messenger > Comunicação
  comunicacao: [
    { value: 'conversas', label: 'Conversas', description: 'Gerenciamento de conversas' },
    { value: 'contatos', label: 'Contatos', description: 'Lista de contatos internos e externos' },
    { value: 'templates', label: 'Templates', description: 'Modelos de mensagem' },
    { value: 'grupos', label: 'Grupos', description: 'Grupos e canais de comunicação' },
  ],
};

// ============================================================================
// MAPEAMENTO LEGADO (para compatibilidade com código existente)
// ============================================================================

/**
 * Recursos por módulo (formato antigo - mantido para compatibilidade)
 * @deprecated Use SUB_MODULE_RESOURCES para nova hierarquia
 */
export const MODULE_RESOURCES: Record<AppModule, ResourceDefinition[]> = {
  gestao: [
    // Financeiro
    { value: 'dashboard', label: 'Dashboard', description: 'Visão geral e indicadores' },
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
    // Tarefas
    { value: 'tarefas', label: 'Tarefas', description: 'Gerenciamento de tarefas' },
    { value: 'atividades', label: 'Atividades', description: 'Histórico de atividades' },
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
  messenger: [
    { value: 'conversas', label: 'Conversas', description: 'Gerenciamento de conversas' },
    { value: 'contatos', label: 'Contatos', description: 'Lista de contatos' },
    { value: 'templates', label: 'Templates', description: 'Modelos de mensagem' },
  ],
  // Legados
  conferesped: [],
  financialace: [],
  erp: [],
  ajustasped: [],
};

// ============================================================================
// MAPEAMENTO RECURSO -> SUB-MÓDULO
// ============================================================================

/**
 * Mapeia um recurso para seu sub-módulo correspondente
 */
export function getSubModuleForResource(resource: string): AppSubModule | null {
  for (const [subModule, resources] of Object.entries(SUB_MODULE_RESOURCES)) {
    if (resources.some(r => r.value === resource)) {
      return subModule as AppSubModule;
    }
  }
  return null;
}

/**
 * Obtém o módulo pai de um sub-módulo
 */
export function getModuleForSubModule(subModule: AppSubModule): AppModule | null {
  for (const [module, subModules] of Object.entries(MODULE_SUB_MODULES)) {
    if (subModules.some(sm => sm.value === subModule)) {
      return module as AppModule;
    }
  }
  return null;
}

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
 * Ações de permissão para recursos
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
 * Obtém os recursos de um módulo (formato antigo)
 * @deprecated Use getSubModuleResources para nova hierarquia
 */
export function getModuleResources(module: AppModule) {
  return MODULE_RESOURCES[module] || [];
}

/**
 * Obtém os sub-módulos de um módulo
 */
export function getModuleSubModules(module: AppModule): SubModuleDefinition[] {
  return MODULE_SUB_MODULES[module] || [];
}

/**
 * Obtém os recursos de um sub-módulo
 */
export function getSubModuleResources(subModule: AppSubModule): ResourceDefinition[] {
  return SUB_MODULE_RESOURCES[subModule] || [];
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

/**
 * Obtém todos os recursos organizados por hierarquia
 */
export function getHierarchicalResources(): {
  module: AppModule;
  moduleLabel: string;
  subModules: {
    subModule: AppSubModule;
    subModuleLabel: string;
    resources: ResourceDefinition[];
  }[];
}[] {
  return APP_MODULES
    .filter(m => !['financialace', 'erp', 'ajustasped'].includes(m.value))
    .map(module => ({
      module: module.value,
      moduleLabel: module.label,
      subModules: getModuleSubModules(module.value).map(sm => ({
        subModule: sm.value,
        subModuleLabel: sm.label,
        resources: getSubModuleResources(sm.value),
      })),
    }));
}
