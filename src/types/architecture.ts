/**
 * TIPOS PARA O SISTEMA DE AUDITORIA DE ARQUITETURA
 * 
 * Define a estrutura hierárquica completa do projeto:
 * Raiz → Camadas → Módulos → Componentes → Dependências
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

export type NodeType = 
  | 'root'           // Raiz do projeto
  | 'layer'          // Camada (pages, hooks, components, etc)
  | 'module'         // Módulo principal (gestao, taskvault, etc)
  | 'submodule'      // Sub-módulo (financeiro, erp, etc)
  | 'component'      // Componente React
  | 'hook'           // Hook customizado
  | 'context'        // Context provider
  | 'util'           // Utilitário/helper
  | 'constant'       // Constante/configuração
  | 'type'           // Definição de tipo
  | 'page'           // Página/rota
  | 'db_table'       // Tabela do banco
  | 'db_function'    // Função do banco
  | 'edge_function'; // Edge function

export type NodeStatus = 
  | 'active'         // Em uso, funcionando
  | 'deprecated'     // Obsoleto, marcado para remoção
  | 'broken'         // Quebrado, com erros
  | 'orphan'         // Órfão, sem dependentes
  | 'duplicate'      // Duplicado, conflita com outro
  | 'missing'        // Faltando, referenciado mas não existe
  | 'refactor';      // Precisa de refatoração

export type DependencyType = 
  | 'import'         // Importação direta
  | 'uses'           // Usa (hook, context)
  | 'renders'        // Renderiza (componente)
  | 'calls'          // Chama (função, RPC)
  | 'extends'        // Estende (herança)
  | 'queries'        // Consulta (tabela)
  | 'mutates';       // Modifica (tabela)

// ============================================================================
// NÓS DA ARQUITETURA
// ============================================================================

export interface ArchitectureNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  path?: string;          // Caminho do arquivo
  description?: string;
  tags?: string[];
  
  // Posicionamento visual
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  collapsed?: boolean;
  
  // Hierarquia
  parentId?: string;
  children?: string[];    // IDs dos filhos
  
  // Metadados
  lineCount?: number;
  lastModified?: string;
  createdAt?: string;
  issues?: ArchitectureIssue[];
}

export interface ArchitectureDependency {
  id: string;
  sourceId: string;
  targetId: string;
  type: DependencyType;
  label?: string;
  bidirectional?: boolean;
}

export interface ArchitectureIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  autoFix?: boolean;
}

// ============================================================================
// GRAFO COMPLETO
// ============================================================================

export interface ArchitectureGraph {
  version: string;
  generatedAt: string;
  nodes: ArchitectureNode[];
  dependencies: ArchitectureDependency[];
  
  // Estatísticas
  stats: {
    totalNodes: number;
    totalDependencies: number;
    issuesCount: { error: number; warning: number; info: number };
    orphanCount: number;
    duplicateCount: number;
  };
}

// ============================================================================
// MAPEAMENTO DO PROJETO
// ============================================================================

export interface ProjectStructure {
  // Páginas
  pages: {
    name: string;
    path: string;
    route: string;
    module?: string;
    components: string[];
    hooks: string[];
  }[];
  
  // Hooks
  hooks: {
    name: string;
    path: string;
    usedBy: string[];
    dependencies: string[];
    tables?: string[];
    status: NodeStatus;
    issues?: string[];
  }[];
  
  // Componentes
  components: {
    name: string;
    path: string;
    category: string;
    usedBy: string[];
    uses: string[];
  }[];
  
  // Contextos
  contexts: {
    name: string;
    path: string;
    provides: string[];
    usedBy: string[];
  }[];
  
  // Constantes
  constants: {
    name: string;
    path: string;
    exports: string[];
    usedBy: string[];
  }[];
  
  // Banco de dados
  database: {
    tables: {
      name: string;
      columns: string[];
      hasRLS: boolean;
      policies: string[];
      usedByHooks: string[];
    }[];
    functions: {
      name: string;
      usedBy: string[];
    }[];
  };
}

// ============================================================================
// CONFIGURAÇÃO DE PROPAGAÇÃO
// ============================================================================

/**
 * Define como mudanças devem propagar pelo sistema
 */
export interface PropagationRule {
  id: string;
  name: string;
  description: string;
  
  // Gatilho
  trigger: {
    type: 'file_change' | 'schema_change' | 'hook_change' | 'component_change';
    pattern: string;  // Regex ou glob
  };
  
  // Ações
  actions: {
    type: 'update' | 'validate' | 'notify' | 'refactor';
    targets: string[];  // Padrões de arquivos afetados
    description: string;
  }[];
  
  // Status
  enabled: boolean;
  lastTriggered?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  root: 'Raiz',
  layer: 'Camada',
  module: 'Módulo',
  submodule: 'Sub-módulo',
  component: 'Componente',
  hook: 'Hook',
  context: 'Contexto',
  util: 'Utilitário',
  constant: 'Constante',
  type: 'Tipo',
  page: 'Página',
  db_table: 'Tabela',
  db_function: 'Função DB',
  edge_function: 'Edge Function',
};

export const NODE_STATUS_COLORS: Record<NodeStatus, string> = {
  active: 'bg-green-500',
  deprecated: 'bg-yellow-500',
  broken: 'bg-red-500',
  orphan: 'bg-gray-500',
  duplicate: 'bg-orange-500',
  missing: 'bg-purple-500',
  refactor: 'bg-blue-500',
};

export const DEPENDENCY_TYPE_COLORS: Record<DependencyType, string> = {
  import: 'stroke-gray-400',
  uses: 'stroke-blue-400',
  renders: 'stroke-green-400',
  calls: 'stroke-yellow-400',
  extends: 'stroke-purple-400',
  queries: 'stroke-cyan-400',
  mutates: 'stroke-red-400',
};
