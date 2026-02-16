/**
 * FONTE ÚNICA DE VERDADE PARA ROTAS DO SISTEMA
 * 
 * Este arquivo centraliza todas as definições de rotas.
 * Qualquer alteração em rotas deve ser feita APENAS aqui.
 * 
 * IMPORTANTE: Ao adicionar uma nova rota:
 * 1. Adicionar ao SYSTEM_ROUTES abaixo
 * 2. Atualizar App.tsx com a nova rota
 * 3. Se for módulo, adicionar também em modules.ts
 * 4. Testar navegação e permissões
 */

import { AppModule } from './modules';

// ============================================================================
// TIPOS
// ============================================================================

export type RouteType = 'public' | 'auth' | 'protected' | 'admin' | 'module' | 'redirect';

export interface SystemRoute {
  path: string;
  name: string;
  type: RouteType;
  requires: string;
  description: string;
  module?: AppModule;
  redirectTo?: string;
}

// ============================================================================
// ROTAS DO SISTEMA
// ============================================================================

/**
 * Lista oficial de todas as rotas do sistema
 * Use esta lista em TODOS os componentes que precisam listar rotas
 */
export const SYSTEM_ROUTES: SystemRoute[] = [
  // Públicas
  {
    path: '/',
    name: 'Landing Page',
    type: 'public',
    requires: '-',
    description: 'Página inicial pública',
  },
  // Autenticação
  {
    path: '/auth',
    name: 'Login Cliente',
    type: 'auth',
    requires: '-',
    description: 'Autenticação por email',
  },
  // Rota master omitida intencionalmente da listagem por segurança
  // Protegidas
  {
    path: '/dashboard',
    name: 'Dashboard',
    type: 'protected',
    requires: 'Autenticação',
    description: 'Hub central do usuário',
  },
  // Admin
  {
    path: '/admin',
    name: 'Painel Admin',
    type: 'admin',
    requires: 'Role: admin',
    description: 'Gestão de usuários, empresas e permissões',
  },
  // Módulos
  {
    path: '/taskvault',
    name: 'TaskVault',
    type: 'module',
    requires: 'Permissão: taskvault',
    description: 'Gestão de tarefas',
    module: 'taskvault',
  },
  {
    path: '/gestao',
    name: 'GESTÃO',
    type: 'module',
    requires: 'Permissão: gestao',
    description: 'ERP + Financeiro integrado',
    module: 'gestao',
  },
  {
    path: '/conversores',
    name: 'Conversores',
    type: 'module',
    requires: 'Permissão: conversores',
    description: 'Conversão de arquivos',
    module: 'conversores',
  },
  {
    path: '/messenger',
    name: 'Messenger',
    type: 'module',
    requires: 'Permissão: messenger',
    description: 'Comunicação via WhatsApp Business',
    module: 'messenger',
  },
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Obtém rotas por tipo
 */
export function getRoutesByType(type: RouteType): SystemRoute[] {
  return SYSTEM_ROUTES.filter(r => r.type === type);
}

/**
 * Obtém rota de um módulo
 */
export function getModuleRoute(module: AppModule): SystemRoute | undefined {
  return SYSTEM_ROUTES.find(r => r.module === module);
}

/**
 * Obtém todas as rotas de módulos
 */
export function getModuleRoutes(): SystemRoute[] {
  return SYSTEM_ROUTES.filter(r => r.type === 'module');
}

/**
 * Verifica se uma rota existe
 */
export function isValidRoute(path: string): boolean {
  return SYSTEM_ROUTES.some(r => r.path === path);
}
