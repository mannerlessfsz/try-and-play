import { useState, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Table2, 
  Key, 
  Link2, 
  Search, 
  Maximize2,
  ArrowRight,
  ArrowDown,
  Shield,
  Clock,
  Hash,
  Type,
  ToggleLeft,
  Calendar,
  FileText,
  User,
  Building2,
  Package,
  ShoppingCart,
  Truck,
  Receipt,
  Wallet,
  Target,
  RefreshCw,
  ClipboardList,
  Bell,
  History,
  Settings,
  Layers,
  Download,
  Image,
  FileDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  GitBranch,
  ChevronRight,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Definição das tabelas do banco de dados
interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: { table: string; column: string };
}

interface RLSPolicy {
  name: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  using?: string;
  withCheck?: string;
}

interface TableSchema {
  name: string;
  displayName: string;
  category: 'core' | 'financial' | 'erp' | 'tasks' | 'admin' | 'config';
  icon: React.ReactNode;
  columns: Column[];
  description: string;
  rlsEnabled: boolean;
  rlsPolicies: RLSPolicy[];
}

// Schema do banco de dados com RLS policies
const DATABASE_SCHEMA: TableSchema[] = [
  // Core Tables
  {
    name: 'profiles',
    displayName: 'Perfis de Usuário',
    category: 'core',
    icon: <User className="w-4 h-4" />,
    description: 'Dados complementares dos usuários autenticados',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view own profile only', command: 'SELECT', using: 'auth.uid() = id' },
      { name: 'Admins can view all profiles', command: 'SELECT', using: 'is_admin(auth.uid())' },
      { name: 'Users can update own profile', command: 'UPDATE', using: 'auth.uid() = id' },
      { name: 'Admins can update all profiles', command: 'UPDATE', using: 'is_admin(auth.uid())' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: true, references: { table: 'auth.users', column: 'id' } },
      { name: 'email', type: 'text', nullable: false },
      { name: 'full_name', type: 'text', nullable: true },
      { name: 'avatar_url', type: 'text', nullable: true },
      { name: 'ativo', type: 'boolean', nullable: false, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'empresas',
    displayName: 'Empresas',
    category: 'core',
    icon: <Building2 className="w-4 h-4" />,
    description: 'Cadastro de empresas/clientes do sistema',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Owners/admins can view empresas', command: 'SELECT', using: 'is_admin(auth.uid()) OR is_empresa_owner(auth.uid(), id)' },
      { name: 'Only admins can insert empresas', command: 'INSERT', withCheck: 'is_admin(auth.uid())' },
      { name: 'Only admins can update empresas', command: 'UPDATE', using: 'is_admin(auth.uid())' },
      { name: 'Only admins can delete empresas', command: 'DELETE', using: 'is_admin(auth.uid())' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'cnpj', type: 'text', nullable: true },
      { name: 'email', type: 'text', nullable: true },
      { name: 'telefone', type: 'text', nullable: true },
      { name: 'manager_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'profiles', column: 'id' } },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'user_roles',
    displayName: 'Papéis de Usuários',
    category: 'core',
    icon: <Shield className="w-4 h-4" />,
    description: 'Relaciona usuários com empresas e define seus papéis',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view own roles', command: 'SELECT', using: 'auth.uid() = user_id OR is_admin(auth.uid())' },
      { name: 'Only admins can manage roles', command: 'ALL', using: 'is_admin(auth.uid())' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'user_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'profiles', column: 'id' } },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'role', type: 'app_role', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'user_permissions',
    displayName: 'Permissões de Usuários',
    category: 'core',
    icon: <Key className="w-4 h-4" />,
    description: 'Permissões granulares por módulo e recurso',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view own permissions', command: 'SELECT', using: 'auth.uid() = user_id OR is_admin(auth.uid())' },
      { name: 'Only admins can manage permissions', command: 'ALL', using: 'is_admin(auth.uid())' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'user_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'profiles', column: 'id' } },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'module', type: 'app_module', nullable: false },
      { name: 'resource', type: 'text', nullable: true },
      { name: 'permission', type: 'permission_type', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  // Config Tables
  {
    name: 'empresa_config',
    displayName: 'Configurações da Empresa',
    category: 'config',
    icon: <Settings className="w-4 h-4" />,
    description: 'Configurações específicas de cada empresa',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view empresa_config', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'Admins can manage empresa_config', command: 'ALL', using: 'is_admin(auth.uid())' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'tipo_empresa', type: 'tipo_empresa', nullable: false },
      { name: 'modulos_habilitados', type: 'jsonb', nullable: true },
      { name: 'configuracoes', type: 'jsonb', nullable: true },
      { name: 'campos_customizados', type: 'jsonb', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'empresa_modulos',
    displayName: 'Módulos da Empresa',
    category: 'config',
    icon: <Layers className="w-4 h-4" />,
    description: 'Módulos habilitados por empresa',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view empresa_modulos', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'Only admins can manage', command: 'ALL', using: 'is_admin(auth.uid())' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'modulo', type: 'app_module', nullable: false },
      { name: 'modo', type: 'text', nullable: false, default: 'basico' },
      { name: 'ativo', type: 'boolean', nullable: false, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'permission_profiles',
    displayName: 'Perfis de Permissão',
    category: 'config',
    icon: <Shield className="w-4 h-4" />,
    description: 'Templates de permissões reutilizáveis',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Admins can view/manage', command: 'ALL', using: 'is_admin(auth.uid())' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'descricao', type: 'text', nullable: true },
      { name: 'role_padrao', type: 'text', nullable: true },
      { name: 'ativo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'permission_profile_items',
    displayName: 'Itens de Perfil de Permissão',
    category: 'config',
    icon: <List className="w-4 h-4" />,
    description: 'Permissões detalhadas de cada perfil',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Admins can view/manage', command: 'ALL', using: 'is_admin(auth.uid())' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'profile_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'permission_profiles', column: 'id' } },
      { name: 'module', type: 'text', nullable: false },
      { name: 'resource', type: 'text', nullable: false },
      { name: 'can_view', type: 'boolean', nullable: true, default: 'false' },
      { name: 'can_create', type: 'boolean', nullable: true, default: 'false' },
      { name: 'can_edit', type: 'boolean', nullable: true, default: 'false' },
      { name: 'can_delete', type: 'boolean', nullable: true, default: 'false' },
      { name: 'can_export', type: 'boolean', nullable: true, default: 'false' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  // Financial Tables
  {
    name: 'contas_bancarias',
    displayName: 'Contas Bancárias',
    category: 'financial',
    icon: <Wallet className="w-4 h-4" />,
    description: 'Contas bancárias da empresa',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view with permission', command: 'SELECT', using: 'is_admin(auth.uid()) OR (has_empresa_access(auth.uid(), empresa_id) AND has_permission(..., view))' },
      { name: 'Users can insert with permission', command: 'INSERT', withCheck: 'is_admin(auth.uid()) OR (has_empresa_access(...) AND has_permission(..., create))' },
      { name: 'Users can update with permission', command: 'UPDATE', using: 'is_admin(auth.uid()) OR (has_empresa_access(...) AND has_permission(..., edit))' },
      { name: 'Users can delete with permission', command: 'DELETE', using: 'is_admin(auth.uid()) OR (has_empresa_access(...) AND has_permission(..., delete))' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'banco', type: 'text', nullable: false },
      { name: 'agencia', type: 'text', nullable: true },
      { name: 'conta', type: 'text', nullable: true },
      { name: 'tipo', type: 'text', nullable: false, default: 'corrente' },
      { name: 'saldo_inicial', type: 'numeric', nullable: true, default: '0' },
      { name: 'cor', type: 'text', nullable: true },
      { name: 'ativo', type: 'boolean', nullable: false, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'categorias_financeiras',
    displayName: 'Categorias Financeiras',
    category: 'financial',
    icon: <List className="w-4 h-4" />,
    description: 'Categorias para classificação de transações',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view categorias', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with permissions', command: 'ALL', using: 'is_admin(auth.uid()) OR (has_empresa_access(...) AND has_permission(...))' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'tipo', type: 'text', nullable: false },
      { name: 'icone', type: 'text', nullable: true, default: 'tag' },
      { name: 'cor', type: 'text', nullable: true },
      { name: 'ativo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'centros_custo',
    displayName: 'Centros de Custo',
    category: 'financial',
    icon: <Target className="w-4 h-4" />,
    description: 'Centros de custo para alocação de despesas',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view centros_custo', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with permissions', command: 'ALL', using: 'is_admin(auth.uid()) OR (has_empresa_access(...) AND has_permission(...))' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'descricao', type: 'text', nullable: true },
      { name: 'ativo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'transacoes',
    displayName: 'Transações Financeiras',
    category: 'financial',
    icon: <Receipt className="w-4 h-4" />,
    description: 'Movimentações financeiras (receitas e despesas)',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view transacoes', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with permissions', command: 'ALL', using: 'is_admin(auth.uid()) OR (has_empresa_access(...) AND has_permission(...))' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'conta_bancaria_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'contas_bancarias', column: 'id' } },
      { name: 'categoria_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'categorias_financeiras', column: 'id' } },
      { name: 'centro_custo_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'centros_custo', column: 'id' } },
      { name: 'tipo', type: 'text', nullable: false },
      { name: 'descricao', type: 'text', nullable: false },
      { name: 'valor', type: 'numeric', nullable: false },
      { name: 'data_vencimento', type: 'date', nullable: false },
      { name: 'data_pagamento', type: 'date', nullable: true },
      { name: 'status', type: 'text', nullable: false, default: 'pendente' },
      { name: 'parcela_atual', type: 'integer', nullable: true },
      { name: 'total_parcelas', type: 'integer', nullable: true },
      { name: 'recorrencia_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'recorrencias', column: 'id' } },
      { name: 'importacao_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'importacoes_extrato', column: 'id' } },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'recorrencias',
    displayName: 'Recorrências',
    category: 'financial',
    icon: <RefreshCw className="w-4 h-4" />,
    description: 'Transações recorrentes automáticas',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view recorrencias', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with permissions', command: 'ALL', using: 'is_admin(auth.uid()) OR (has_empresa_access(...) AND has_permission(...))' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'conta_bancaria_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'contas_bancarias', column: 'id' } },
      { name: 'categoria_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'categorias_financeiras', column: 'id' } },
      { name: 'centro_custo_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'centros_custo', column: 'id' } },
      { name: 'tipo', type: 'text', nullable: false },
      { name: 'descricao', type: 'text', nullable: false },
      { name: 'valor', type: 'numeric', nullable: false },
      { name: 'frequencia', type: 'text', nullable: false },
      { name: 'dia_vencimento', type: 'integer', nullable: true },
      { name: 'data_inicio', type: 'date', nullable: false },
      { name: 'data_fim', type: 'date', nullable: true },
      { name: 'proxima_geracao', type: 'date', nullable: false },
      { name: 'ativo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'gerar_automatico', type: 'boolean', nullable: true, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'metas_financeiras',
    displayName: 'Metas Financeiras',
    category: 'financial',
    icon: <Target className="w-4 h-4" />,
    description: 'Metas e objetivos financeiros',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view metas', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with permissions', command: 'ALL', using: 'is_admin(auth.uid()) OR (has_empresa_access(...) AND has_permission(...))' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'categoria_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'categorias_financeiras', column: 'id' } },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'descricao', type: 'text', nullable: true },
      { name: 'tipo', type: 'text', nullable: false },
      { name: 'valor_meta', type: 'numeric', nullable: false },
      { name: 'valor_atual', type: 'numeric', nullable: true, default: '0' },
      { name: 'data_inicio', type: 'date', nullable: false },
      { name: 'data_fim', type: 'date', nullable: false },
      { name: 'ativo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'importacoes_extrato',
    displayName: 'Importações de Extrato',
    category: 'financial',
    icon: <FileText className="w-4 h-4" />,
    description: 'Histórico de importações de extratos bancários',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view importacoes', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with permissions', command: 'ALL', using: 'is_admin(auth.uid()) OR (has_empresa_access(...) AND has_permission(...))' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'conta_bancaria_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'contas_bancarias', column: 'id' } },
      { name: 'nome_arquivo', type: 'text', nullable: false },
      { name: 'tipo_arquivo', type: 'text', nullable: false },
      { name: 'status', type: 'text', nullable: false, default: 'processando' },
      { name: 'total_transacoes', type: 'integer', nullable: true, default: '0' },
      { name: 'transacoes_importadas', type: 'integer', nullable: true, default: '0' },
      { name: 'transacoes_duplicadas', type: 'integer', nullable: true, default: '0' },
      { name: 'data_inicio', type: 'date', nullable: true },
      { name: 'data_fim', type: 'date', nullable: true },
      { name: 'created_by', type: 'uuid', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'orcamentos',
    displayName: 'Orçamentos Financeiros',
    category: 'financial',
    icon: <ClipboardList className="w-4 h-4" />,
    description: 'Planejamento orçamentário por categoria',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view orcamentos', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with permissions', command: 'ALL', using: 'is_admin(auth.uid()) OR (has_empresa_access(...) AND has_permission(...))' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'categoria_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'categorias_financeiras', column: 'id' } },
      { name: 'centro_custo_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'centros_custo', column: 'id' } },
      { name: 'mes', type: 'integer', nullable: false },
      { name: 'ano', type: 'integer', nullable: false },
      { name: 'valor_planejado', type: 'numeric', nullable: false, default: '0' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  // ERP Tables
  {
    name: 'clientes',
    displayName: 'Clientes',
    category: 'erp',
    icon: <User className="w-4 h-4" />,
    description: 'Cadastro de clientes',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view clientes', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with access', command: 'ALL', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'nome_fantasia', type: 'text', nullable: true },
      { name: 'tipo_pessoa', type: 'text', nullable: true, default: 'fisica' },
      { name: 'cpf_cnpj', type: 'text', nullable: true },
      { name: 'email', type: 'text', nullable: true },
      { name: 'telefone', type: 'text', nullable: true },
      { name: 'celular', type: 'text', nullable: true },
      { name: 'endereco', type: 'text', nullable: true },
      { name: 'cidade', type: 'text', nullable: true },
      { name: 'estado', type: 'text', nullable: true },
      { name: 'cep', type: 'text', nullable: true },
      { name: 'limite_credito', type: 'numeric', nullable: true, default: '0' },
      { name: 'ativo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'fornecedores',
    displayName: 'Fornecedores',
    category: 'erp',
    icon: <Truck className="w-4 h-4" />,
    description: 'Cadastro de fornecedores',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view fornecedores', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with access', command: 'ALL', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'nome_fantasia', type: 'text', nullable: true },
      { name: 'tipo_pessoa', type: 'text', nullable: true, default: 'juridica' },
      { name: 'cpf_cnpj', type: 'text', nullable: true },
      { name: 'email', type: 'text', nullable: true },
      { name: 'telefone', type: 'text', nullable: true },
      { name: 'contato_nome', type: 'text', nullable: true },
      { name: 'condicao_pagamento', type: 'text', nullable: true },
      { name: 'prazo_entrega_dias', type: 'integer', nullable: true },
      { name: 'ativo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'produtos',
    displayName: 'Produtos',
    category: 'erp',
    icon: <Package className="w-4 h-4" />,
    description: 'Cadastro de produtos e serviços',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view produtos', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with access', command: 'ALL', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'categoria_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'categorias_produtos', column: 'id' } },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'descricao', type: 'text', nullable: true },
      { name: 'codigo', type: 'text', nullable: true },
      { name: 'sku', type: 'text', nullable: true },
      { name: 'preco_custo', type: 'numeric', nullable: true, default: '0' },
      { name: 'preco_venda', type: 'numeric', nullable: true, default: '0' },
      { name: 'estoque_atual', type: 'numeric', nullable: true, default: '0' },
      { name: 'estoque_minimo', type: 'numeric', nullable: true, default: '0' },
      { name: 'controla_estoque', type: 'boolean', nullable: true, default: 'true' },
      { name: 'ativo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'categorias_produtos',
    displayName: 'Categorias de Produtos',
    category: 'erp',
    icon: <List className="w-4 h-4" />,
    description: 'Categorias para organização de produtos',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view categorias_produtos', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with access', command: 'ALL', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'descricao', type: 'text', nullable: true },
      { name: 'categoria_pai_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'categorias_produtos', column: 'id' } },
      { name: 'ativo', type: 'boolean', nullable: true, default: 'true' },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'vendas',
    displayName: 'Vendas',
    category: 'erp',
    icon: <ShoppingCart className="w-4 h-4" />,
    description: 'Registro de vendas',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view vendas', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with access', command: 'ALL', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'cliente_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'clientes', column: 'id' } },
      { name: 'numero', type: 'integer', nullable: true },
      { name: 'data_venda', type: 'date', nullable: false },
      { name: 'status', type: 'status_pedido', nullable: true, default: 'rascunho' },
      { name: 'subtotal', type: 'numeric', nullable: true, default: '0' },
      { name: 'desconto_valor', type: 'numeric', nullable: true, default: '0' },
      { name: 'total', type: 'numeric', nullable: true, default: '0' },
      { name: 'forma_pagamento', type: 'text', nullable: true },
      { name: 'observacoes', type: 'text', nullable: true },
      { name: 'created_by', type: 'uuid', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'venda_itens',
    displayName: 'Itens de Venda',
    category: 'erp',
    icon: <Receipt className="w-4 h-4" />,
    description: 'Itens das vendas',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view through vendas', command: 'SELECT', using: 'EXISTS(SELECT 1 FROM vendas WHERE vendas.id = venda_id AND has_empresa_access(...))' },
      { name: 'CRUD through vendas', command: 'ALL', using: 'EXISTS(SELECT 1 FROM vendas WHERE ...)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'venda_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'vendas', column: 'id' } },
      { name: 'produto_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'produtos', column: 'id' } },
      { name: 'quantidade', type: 'numeric', nullable: false, default: '1' },
      { name: 'preco_unitario', type: 'numeric', nullable: false },
      { name: 'desconto_valor', type: 'numeric', nullable: true, default: '0' },
      { name: 'total', type: 'numeric', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'compras',
    displayName: 'Compras',
    category: 'erp',
    icon: <ShoppingCart className="w-4 h-4" />,
    description: 'Registro de compras/pedidos',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view compras', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with access', command: 'ALL', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'fornecedor_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'fornecedores', column: 'id' } },
      { name: 'numero', type: 'integer', nullable: true },
      { name: 'data_compra', type: 'date', nullable: false },
      { name: 'status', type: 'status_pedido', nullable: true, default: 'rascunho' },
      { name: 'subtotal', type: 'numeric', nullable: true, default: '0' },
      { name: 'frete', type: 'numeric', nullable: true, default: '0' },
      { name: 'total', type: 'numeric', nullable: true, default: '0' },
      { name: 'forma_pagamento', type: 'text', nullable: true },
      { name: 'observacoes', type: 'text', nullable: true },
      { name: 'created_by', type: 'uuid', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'compra_itens',
    displayName: 'Itens de Compra',
    category: 'erp',
    icon: <Receipt className="w-4 h-4" />,
    description: 'Itens das compras',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view through compras', command: 'SELECT', using: 'EXISTS(SELECT 1 FROM compras WHERE compras.id = compra_id AND has_empresa_access(...))' },
      { name: 'CRUD through compras', command: 'ALL', using: 'EXISTS(SELECT 1 FROM compras WHERE ...)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'compra_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'compras', column: 'id' } },
      { name: 'produto_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'produtos', column: 'id' } },
      { name: 'quantidade', type: 'numeric', nullable: false, default: '1' },
      { name: 'preco_unitario', type: 'numeric', nullable: false },
      { name: 'quantidade_recebida', type: 'numeric', nullable: true, default: '0' },
      { name: 'total', type: 'numeric', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'estoque_movimentos',
    displayName: 'Movimentos de Estoque',
    category: 'erp',
    icon: <Package className="w-4 h-4" />,
    description: 'Histórico de movimentações de estoque',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view movimentos', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'Users can insert movimentos', command: 'INSERT', withCheck: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'produto_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'produtos', column: 'id' } },
      { name: 'tipo', type: 'tipo_movimento_estoque', nullable: false },
      { name: 'quantidade', type: 'numeric', nullable: false },
      { name: 'saldo_anterior', type: 'numeric', nullable: true },
      { name: 'saldo_posterior', type: 'numeric', nullable: true },
      { name: 'custo_unitario', type: 'numeric', nullable: true },
      { name: 'documento_tipo', type: 'text', nullable: true },
      { name: 'documento_id', type: 'uuid', nullable: true },
      { name: 'observacao', type: 'text', nullable: true },
      { name: 'created_by', type: 'uuid', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'orcamentos_servico',
    displayName: 'Orçamentos de Serviço',
    category: 'erp',
    icon: <ClipboardList className="w-4 h-4" />,
    description: 'Orçamentos para clientes',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view orcamentos', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with access', command: 'ALL', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'cliente_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'clientes', column: 'id' } },
      { name: 'numero', type: 'integer', nullable: true },
      { name: 'titulo', type: 'text', nullable: false },
      { name: 'data_orcamento', type: 'date', nullable: false },
      { name: 'data_validade', type: 'date', nullable: true },
      { name: 'status', type: 'text', nullable: false, default: 'rascunho' },
      { name: 'subtotal', type: 'numeric', nullable: true, default: '0' },
      { name: 'desconto_valor', type: 'numeric', nullable: true, default: '0' },
      { name: 'total', type: 'numeric', nullable: true, default: '0' },
      { name: 'observacoes', type: 'text', nullable: true },
      { name: 'created_by', type: 'uuid', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'orcamento_itens',
    displayName: 'Itens de Orçamento',
    category: 'erp',
    icon: <Receipt className="w-4 h-4" />,
    description: 'Itens dos orçamentos de serviço',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view through orcamentos', command: 'SELECT', using: 'EXISTS(SELECT 1 FROM orcamentos_servico WHERE ...)' },
      { name: 'CRUD through orcamentos', command: 'ALL', using: 'EXISTS(SELECT 1 FROM orcamentos_servico WHERE ...)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'orcamento_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'orcamentos_servico', column: 'id' } },
      { name: 'descricao', type: 'text', nullable: false },
      { name: 'unidade', type: 'text', nullable: true, default: 'UN' },
      { name: 'quantidade', type: 'numeric', nullable: false, default: '1' },
      { name: 'valor_unitario', type: 'numeric', nullable: false },
      { name: 'desconto_valor', type: 'numeric', nullable: true, default: '0' },
      { name: 'total', type: 'numeric', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  // Task Tables
  {
    name: 'tarefas',
    displayName: 'Tarefas',
    category: 'tasks',
    icon: <ClipboardList className="w-4 h-4" />,
    description: 'Gestão de tarefas e projetos',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view tarefas', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with access', command: 'ALL', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'titulo', type: 'text', nullable: false },
      { name: 'descricao', type: 'text', nullable: true },
      { name: 'status', type: 'text', nullable: false, default: 'backlog' },
      { name: 'prioridade', type: 'text', nullable: true, default: 'media' },
      { name: 'data_inicio', type: 'date', nullable: true },
      { name: 'data_fim', type: 'date', nullable: true },
      { name: 'responsavel_id', type: 'uuid', nullable: true },
      { name: 'created_by', type: 'uuid', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'updated_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'atividades',
    displayName: 'Atividades',
    category: 'tasks',
    icon: <History className="w-4 h-4" />,
    description: 'Registro de atividades e histórico',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view atividades', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'Users can insert atividades', command: 'INSERT', withCheck: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'tarefa_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'tarefas', column: 'id' } },
      { name: 'tipo', type: 'text', nullable: false },
      { name: 'descricao', type: 'text', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'tarefa_arquivos',
    displayName: 'Arquivos de Tarefas',
    category: 'tasks',
    icon: <FileText className="w-4 h-4" />,
    description: 'Anexos de tarefas',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view through tarefas', command: 'SELECT', using: 'EXISTS(SELECT 1 FROM tarefas WHERE ...)' },
      { name: 'CRUD through tarefas', command: 'ALL', using: 'EXISTS(SELECT 1 FROM tarefas WHERE ...)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'tarefa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'tarefas', column: 'id' } },
      { name: 'nome', type: 'text', nullable: false },
      { name: 'tipo', type: 'text', nullable: false },
      { name: 'tamanho', type: 'integer', nullable: false },
      { name: 'url', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  // Admin Tables
  {
    name: 'admin_notifications',
    displayName: 'Notificações Admin',
    category: 'admin',
    icon: <Bell className="w-4 h-4" />,
    description: 'Notificações do sistema para administradores',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Admins can view notifications', command: 'SELECT', using: 'is_admin(auth.uid())' },
      { name: 'Admins can update notifications', command: 'UPDATE', using: 'is_admin(auth.uid())' },
      { name: 'System can insert notifications', command: 'INSERT', withCheck: 'true' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: true, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'tipo', type: 'text', nullable: false },
      { name: 'titulo', type: 'text', nullable: false },
      { name: 'mensagem', type: 'text', nullable: false },
      { name: 'dados', type: 'jsonb', nullable: true },
      { name: 'lida', type: 'boolean', nullable: true, default: 'false' },
      { name: 'lida_por', type: 'uuid', nullable: true },
      { name: 'lida_em', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'audit_logs',
    displayName: 'Logs de Auditoria',
    category: 'admin',
    icon: <History className="w-4 h-4" />,
    description: 'Registro de todas as ações no sistema',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Admins can view audit logs', command: 'SELECT', using: 'is_admin(auth.uid())' },
      { name: 'Authenticated users can insert', command: 'INSERT', withCheck: 'auth.uid() IS NOT NULL' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'action', type: 'text', nullable: false },
      { name: 'table_name', type: 'text', nullable: false },
      { name: 'record_id', type: 'uuid', nullable: true },
      { name: 'old_data', type: 'jsonb', nullable: true },
      { name: 'new_data', type: 'jsonb', nullable: true },
      { name: 'ip_address', type: 'text', nullable: true },
      { name: 'user_agent', type: 'text', nullable: true },
      { name: 'details', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
  {
    name: 'conversoes_arquivos',
    displayName: 'Conversões de Arquivos',
    category: 'admin',
    icon: <FileText className="w-4 h-4" />,
    description: 'Histórico de conversões de arquivos',
    rlsEnabled: true,
    rlsPolicies: [
      { name: 'Users can view conversions', command: 'SELECT', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
      { name: 'CRUD with access', command: 'ALL', using: 'is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)' },
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { name: 'empresa_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'empresas', column: 'id' } },
      { name: 'modulo', type: 'text', nullable: false },
      { name: 'nome_arquivo_original', type: 'text', nullable: false },
      { name: 'nome_arquivo_convertido', type: 'text', nullable: true },
      { name: 'status', type: 'text', nullable: false, default: 'processando' },
      { name: 'total_linhas', type: 'integer', nullable: true, default: '0' },
      { name: 'linhas_processadas', type: 'integer', nullable: true, default: '0' },
      { name: 'linhas_erro', type: 'integer', nullable: true, default: '0' },
      { name: 'metadados', type: 'jsonb', nullable: true },
      { name: 'created_by', type: 'uuid', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ]
  },
];

// Categorias
const CATEGORIES = {
  core: { label: 'Core (Usuários & Empresas)', color: 'bg-blue-500' },
  config: { label: 'Configuração', color: 'bg-purple-500' },
  financial: { label: 'Financeiro', color: 'bg-green-500' },
  erp: { label: 'ERP (Vendas, Compras, Estoque)', color: 'bg-orange-500' },
  tasks: { label: 'Tarefas', color: 'bg-cyan-500' },
  admin: { label: 'Administração', color: 'bg-red-500' },
};

// Componente de tipo de coluna
const ColumnTypeIcon = ({ type }: { type: string }) => {
  if (type === 'uuid') return <Key className="w-3 h-3 text-yellow-500" />;
  if (type.includes('timestamp')) return <Clock className="w-3 h-3 text-blue-400" />;
  if (type === 'boolean') return <ToggleLeft className="w-3 h-3 text-green-400" />;
  if (type === 'numeric' || type === 'integer') return <Hash className="w-3 h-3 text-purple-400" />;
  if (type === 'date') return <Calendar className="w-3 h-3 text-orange-400" />;
  if (type === 'jsonb') return <FileText className="w-3 h-3 text-pink-400" />;
  return <Type className="w-3 h-3 text-muted-foreground" />;
};

// Badge de RLS
const RLSBadge = ({ enabled, policiesCount }: { enabled: boolean; policiesCount: number }) => (
  <div className="flex items-center gap-1">
    {enabled ? (
      <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 border-green-300 text-green-700 dark:text-green-400">
        <Lock className="w-3 h-3 mr-1" />
        RLS ({policiesCount})
      </Badge>
    ) : (
      <Badge variant="outline" className="text-xs bg-red-100 dark:bg-red-900/30 border-red-300 text-red-700 dark:text-red-400">
        <Unlock className="w-3 h-3 mr-1" />
        Sem RLS
      </Badge>
    )}
  </div>
);

// Componente de tabela interativa
const TableCard = ({ 
  table, 
  isSelected, 
  onSelect, 
  highlightedTables 
}: { 
  table: TableSchema; 
  isSelected: boolean; 
  onSelect: () => void;
  highlightedTables: string[];
}) => {
  const isHighlighted = highlightedTables.includes(table.name);
  const fkCount = table.columns.filter(c => c.isForeignKey).length;
  const pkCount = table.columns.filter(c => c.isPrimaryKey).length;
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-lg",
        isHighlighted && !isSelected && "ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-950/20"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded",
              CATEGORIES[table.category].color,
              "text-white"
            )}>
              {table.icon}
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{table.displayName}</CardTitle>
              <code className="text-xs text-muted-foreground">{table.name}</code>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-2">{table.description}</p>
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="text-[10px]">
            <Table2 className="w-2.5 h-2.5 mr-0.5" />
            {table.columns.length}
          </Badge>
          {pkCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300">
              {pkCount} PK
            </Badge>
          )}
          {fkCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-blue-100 dark:bg-blue-900/30 border-blue-300">
              {fkCount} FK
            </Badge>
          )}
          <RLSBadge enabled={table.rlsEnabled} policiesCount={table.rlsPolicies.length} />
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de detalhes da tabela
const TableDetails = ({ table, onNavigate }: { table: TableSchema; onNavigate: (tableName: string) => void }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded",
            CATEGORIES[table.category].color,
            "text-white"
          )}>
            {table.icon}
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {table.displayName}
            </CardTitle>
            <code className="text-sm text-muted-foreground">{table.name}</code>
          </div>
          <RLSBadge enabled={table.rlsEnabled} policiesCount={table.rlsPolicies.length} />
        </div>
        <p className="text-sm text-muted-foreground mt-2">{table.description}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="columns" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="columns">Colunas ({table.columns.length})</TabsTrigger>
            <TabsTrigger value="rls">RLS Policies ({table.rlsPolicies.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="columns" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-2 px-3">Nome</th>
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-center py-2 px-3">Null</th>
                    <th className="text-left py-2 px-3">Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {table.columns.map((col) => (
                    <tr key={col.name} className="border-t hover:bg-muted/30">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {col.isPrimaryKey && <Key className="w-3 h-3 text-yellow-500" />}
                          {col.isForeignKey && !col.isPrimaryKey && <Link2 className="w-3 h-3 text-blue-500" />}
                          <span className={cn(
                            col.isPrimaryKey && "font-semibold text-yellow-600 dark:text-yellow-400",
                            col.isForeignKey && !col.isPrimaryKey && "text-blue-600 dark:text-blue-400"
                          )}>
                            {col.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <ColumnTypeIcon type={col.type} />
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{col.type}</code>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {col.nullable ? (
                          <Badge variant="outline" className="text-[10px]">null</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">not null</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {col.references && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-blue-600 hover:text-blue-700 p-0"
                            onClick={() => onNavigate(col.references!.table)}
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            {col.references.table}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          <TabsContent value="rls" className="mt-4 space-y-2">
            {table.rlsPolicies.map((policy, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{policy.name}</span>
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    policy.command === 'SELECT' && "bg-blue-100 border-blue-300 text-blue-700",
                    policy.command === 'INSERT' && "bg-green-100 border-green-300 text-green-700",
                    policy.command === 'UPDATE' && "bg-yellow-100 border-yellow-300 text-yellow-700",
                    policy.command === 'DELETE' && "bg-red-100 border-red-300 text-red-700",
                    policy.command === 'ALL' && "bg-purple-100 border-purple-300 text-purple-700",
                  )}>
                    {policy.command}
                  </Badge>
                </div>
                {policy.using && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">USING: </span>
                    <code className="bg-muted px-1.5 py-0.5 rounded">{policy.using}</code>
                  </div>
                )}
                {policy.withCheck && (
                  <div className="text-xs mt-1">
                    <span className="text-muted-foreground">WITH CHECK: </span>
                    <code className="bg-muted px-1.5 py-0.5 rounded">{policy.withCheck}</code>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Componente de diagrama visual
const RelationshipsDiagram = ({ 
  tables, 
  selectedTable,
  onSelectTable 
}: { 
  tables: TableSchema[];
  selectedTable: string | null;
  onSelectTable: (name: string) => void;
}) => {
  const relations: { from: string; to: string; column: string }[] = [];
  tables.forEach(table => {
    table.columns.forEach(col => {
      if (col.isForeignKey && col.references) {
        relations.push({
          from: table.name,
          to: col.references.table,
          column: col.name
        });
      }
    });
  });

  const tablesByCategory = tables.reduce((acc, table) => {
    if (!acc[table.category]) acc[table.category] = [];
    acc[table.category].push(table);
    return acc;
  }, {} as Record<string, TableSchema[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Diagrama de Relacionamentos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Clique em uma tabela para ver seus detalhes e relacionamentos
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(tablesByCategory).map(([category, catTables]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  CATEGORIES[category as keyof typeof CATEGORIES].color
                )} />
                <h4 className="font-semibold text-sm">
                  {CATEGORIES[category as keyof typeof CATEGORIES].label}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {catTables.length} tabelas
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {catTables.map(table => {
                  const incomingRels = relations.filter(r => r.to === table.name);
                  const outgoingRels = relations.filter(r => r.from === table.name);
                  const isSelected = selectedTable === table.name;
                  
                  return (
                    <div
                      key={table.name}
                      onClick={() => onSelectTable(table.name)}
                      className={cn(
                        "border rounded-lg p-2 cursor-pointer transition-all",
                        "hover:shadow-md hover:border-primary/50",
                        isSelected && "ring-2 ring-primary bg-primary/5"
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {table.icon}
                        <span className="text-xs font-medium truncate">{table.name}</span>
                        {table.rlsEnabled ? (
                          <Lock className="w-3 h-3 text-green-500 ml-auto flex-shrink-0" />
                        ) : (
                          <Unlock className="w-3 h-3 text-red-500 ml-auto flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex gap-1">
                        {incomingRels.length > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1">
                            ←{incomingRels.length}
                          </Badge>
                        )}
                        {outgoingRels.length > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1">
                            →{outgoingRels.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2">Legenda</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Key className="w-3 h-3 text-yellow-500" />
              <span>Primary Key</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Link2 className="w-3 h-3 text-blue-500" />
              <span>Foreign Key</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-green-500" />
              <span>RLS Ativo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Unlock className="w-3 h-3 text-red-500" />
              <span>Sem RLS</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de Dependências em Cascata
const CascadeDependencies = ({ selectedTable }: { selectedTable: string | null }) => {
  const getDependencyTree = useCallback((tableName: string, visited: Set<string> = new Set(), depth = 0): { table: TableSchema; depth: number; type: 'references' | 'referenced-by' }[] => {
    if (visited.has(tableName) || depth > 5) return [];
    visited.add(tableName);
    
    const table = DATABASE_SCHEMA.find(t => t.name === tableName);
    if (!table) return [];

    const results: { table: TableSchema; depth: number; type: 'references' | 'referenced-by' }[] = [];
    
    // Tabelas que esta referencia
    table.columns.forEach(col => {
      if (col.references) {
        const refTable = DATABASE_SCHEMA.find(t => t.name === col.references!.table);
        if (refTable && !visited.has(refTable.name)) {
          results.push({ table: refTable, depth: depth + 1, type: 'references' });
        }
      }
    });
    
    // Tabelas que referenciam esta
    DATABASE_SCHEMA.forEach(t => {
      t.columns.forEach(col => {
        if (col.references?.table === tableName && !visited.has(t.name)) {
          results.push({ table: t, depth: depth + 1, type: 'referenced-by' });
        }
      });
    });
    
    return results;
  }, []);

  const selectedTableData = DATABASE_SCHEMA.find(t => t.name === selectedTable);
  
  const dependencies = useMemo(() => {
    if (!selectedTable) return { references: [], referencedBy: [] };
    
    const table = DATABASE_SCHEMA.find(t => t.name === selectedTable);
    if (!table) return { references: [], referencedBy: [] };
    
    // Tabelas que esta tabela referencia (FKs outgoing)
    const references: { table: TableSchema; column: string; refColumn: string }[] = [];
    table.columns.forEach(col => {
      if (col.references) {
        const refTable = DATABASE_SCHEMA.find(t => t.name === col.references!.table);
        if (refTable) {
          references.push({ 
            table: refTable, 
            column: col.name, 
            refColumn: col.references.column 
          });
        }
      }
    });
    
    // Tabelas que referenciam esta (FKs incoming)
    const referencedBy: { table: TableSchema; column: string }[] = [];
    DATABASE_SCHEMA.forEach(t => {
      t.columns.forEach(col => {
        if (col.references?.table === selectedTable) {
          referencedBy.push({ table: t, column: col.name });
        }
      });
    });
    
    return { references, referencedBy };
  }, [selectedTable]);

  if (!selectedTable || !selectedTableData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Selecione uma tabela para ver as dependências em cascata
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Dependências em Cascata: {selectedTableData.displayName}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualize o que acontece se esta tabela for modificada ou deletada
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tabelas que esta referencia */}
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-blue-600">
            <ArrowRight className="w-4 h-4" />
            Depende de ({dependencies.references.length} tabelas)
          </h4>
          {dependencies.references.length === 0 ? (
            <p className="text-sm text-muted-foreground italic pl-6">
              Não depende de nenhuma tabela
            </p>
          ) : (
            <div className="space-y-2">
              {dependencies.references.map((ref, idx) => (
                <div key={idx} className="flex items-center gap-2 pl-6 p-2 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className={cn("p-1 rounded", CATEGORIES[ref.table.category].color, "text-white")}>
                    {ref.table.icon}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-sm">{ref.table.displayName}</span>
                    <code className="text-xs text-muted-foreground ml-2">{ref.table.name}</code>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {ref.column} → {ref.refColumn}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {dependencies.references.length > 0 && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>Impacto:</strong> Se as tabelas acima forem modificadas ou deletadas, 
                  os registros em <strong>{selectedTableData.name}</strong> podem ficar órfãos ou causar erros de integridade.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tabelas que referenciam esta */}
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-600">
            <ArrowDown className="w-4 h-4" />
            É referenciada por ({dependencies.referencedBy.length} tabelas)
          </h4>
          {dependencies.referencedBy.length === 0 ? (
            <p className="text-sm text-muted-foreground italic pl-6">
              Não é referenciada por nenhuma tabela
            </p>
          ) : (
            <div className="space-y-2">
              {dependencies.referencedBy.map((ref, idx) => (
                <div key={idx} className="flex items-center gap-2 pl-6 p-2 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className={cn("p-1 rounded", CATEGORIES[ref.table.category].color, "text-white")}>
                    {ref.table.icon}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-sm">{ref.table.displayName}</span>
                    <code className="text-xs text-muted-foreground ml-2">{ref.table.name}</code>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    via {ref.column}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {dependencies.referencedBy.length > 0 && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400">
                  <strong>⚠️ ATENÇÃO:</strong> Se você deletar ou modificar registros em <strong>{selectedTableData.name}</strong>, 
                  as {dependencies.referencedBy.length} tabelas acima serão afetadas. Isso pode causar:
                </p>
              </div>
              <ul className="text-xs text-red-700 dark:text-red-400 ml-6 mt-1 list-disc">
                <li>Erros de integridade referencial</li>
                <li>Registros órfãos nas tabelas dependentes</li>
                <li>Falhas em consultas e relatórios</li>
              </ul>
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="pt-4 border-t">
          <h4 className="font-semibold text-sm mb-2">Resumo de Impacto</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                {dependencies.references.length === 0 ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                )}
                <span className="font-medium text-sm">Dependências</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {dependencies.references.length === 0 
                  ? 'Tabela independente' 
                  : `Depende de ${dependencies.references.length} tabela(s)`}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                {dependencies.referencedBy.length === 0 ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="font-medium text-sm">Risco de Cascata</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {dependencies.referencedBy.length === 0 
                  ? 'Pode ser modificada livremente' 
                  : `${dependencies.referencedBy.length} tabela(s) serão afetadas`}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente principal
const DatabaseRelationshipsDiagram = () => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyWithRelations, setShowOnlyWithRelations] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('diagram');
  const diagramRef = useRef<HTMLDivElement>(null);

  // Filtrar tabelas
  const filteredTables = useMemo(() => {
    return DATABASE_SCHEMA.filter(table => {
      const matchesSearch = 
        table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        table.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        table.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !selectedCategory || table.category === selectedCategory;
      
      const hasRelations = table.columns.some(c => c.isForeignKey);
      const matchesRelationFilter = !showOnlyWithRelations || hasRelations;
      
      return matchesSearch && matchesCategory && matchesRelationFilter;
    });
  }, [searchQuery, selectedCategory, showOnlyWithRelations]);

  // Tabelas relacionadas à selecionada
  const highlightedTables = useMemo(() => {
    if (!selectedTable) return [];
    
    const selected = DATABASE_SCHEMA.find(t => t.name === selectedTable);
    if (!selected) return [];

    const related: string[] = [];
    
    selected.columns.forEach(col => {
      if (col.references) {
        related.push(col.references.table);
      }
    });
    
    DATABASE_SCHEMA.forEach(table => {
      table.columns.forEach(col => {
        if (col.references?.table === selectedTable) {
          related.push(table.name);
        }
      });
    });
    
    return [...new Set(related)];
  }, [selectedTable]);

  const handleNavigate = useCallback((tableName: string) => {
    const table = DATABASE_SCHEMA.find(t => t.name === tableName || t.name === tableName.replace('auth.', ''));
    if (table) {
      setSelectedTable(table.name);
    }
  }, []);

  const selectedTableData = DATABASE_SCHEMA.find(t => t.name === selectedTable);

  // Estatísticas
  const stats = useMemo(() => {
    const totalTables = DATABASE_SCHEMA.length;
    const totalColumns = DATABASE_SCHEMA.reduce((sum, t) => sum + t.columns.length, 0);
    const totalFKs = DATABASE_SCHEMA.reduce((sum, t) => 
      sum + t.columns.filter(c => c.isForeignKey).length, 0);
    const tablesWithRLS = DATABASE_SCHEMA.filter(t => t.rlsEnabled).length;
    const totalPolicies = DATABASE_SCHEMA.reduce((sum, t) => sum + t.rlsPolicies.length, 0);
    
    return { totalTables, totalColumns, totalFKs, tablesWithRLS, totalPolicies };
  }, []);

  // Exportar para imagem/PDF
  const handleExport = useCallback(async (format: 'png' | 'pdf') => {
    try {
      // Gerar conteúdo para exportação
      const exportContent = {
        generatedAt: new Date().toISOString(),
        stats,
        tables: DATABASE_SCHEMA.map(t => ({
          name: t.name,
          displayName: t.displayName,
          category: t.category,
          description: t.description,
          columns: t.columns.map(c => ({
            name: c.name,
            type: c.type,
            nullable: c.nullable,
            isPrimaryKey: c.isPrimaryKey,
            isForeignKey: c.isForeignKey,
            references: c.references
          })),
          rlsEnabled: t.rlsEnabled,
          rlsPolicies: t.rlsPolicies
        }))
      };

      if (format === 'png') {
        // Para PNG, criar um JSON formatado
        const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database-schema-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Schema exportado como JSON!');
      } else {
        // Para PDF, usar jspdf
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        let y = 20;
        doc.setFontSize(20);
        doc.text('Diagrama do Banco de Dados', 20, y);
        y += 15;
        
        doc.setFontSize(12);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, y);
        y += 10;
        doc.text(`Total de Tabelas: ${stats.totalTables}`, 20, y);
        y += 7;
        doc.text(`Total de Colunas: ${stats.totalColumns}`, 20, y);
        y += 7;
        doc.text(`Foreign Keys: ${stats.totalFKs}`, 20, y);
        y += 7;
        doc.text(`Tabelas com RLS: ${stats.tablesWithRLS}`, 20, y);
        y += 7;
        doc.text(`Total de Policies: ${stats.totalPolicies}`, 20, y);
        y += 15;

        // Listar tabelas por categoria
        Object.entries(CATEGORIES).forEach(([catKey, cat]) => {
          const catTables = DATABASE_SCHEMA.filter(t => t.category === catKey);
          if (catTables.length === 0) return;

          if (y > 250) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(14);
          doc.text(cat.label, 20, y);
          y += 8;

          doc.setFontSize(10);
          catTables.forEach(table => {
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            const fkCount = table.columns.filter(c => c.isForeignKey).length;
            const rlsStatus = table.rlsEnabled ? `RLS(${table.rlsPolicies.length})` : 'SEM RLS';
            doc.text(`• ${table.name} - ${table.columns.length} cols, ${fkCount} FKs, ${rlsStatus}`, 25, y);
            y += 6;
          });
          y += 5;
        });

        doc.save(`database-schema-${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('PDF exportado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar');
    }
  }, [stats]);

  return (
    <div className="space-y-6" ref={diagramRef}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.totalTables}</div>
                <p className="text-xs text-muted-foreground">Tabelas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Table2 className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.totalColumns}</div>
                <p className="text-xs text-muted-foreground">Colunas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Link2 className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.totalFKs}</div>
                <p className="text-xs text-muted-foreground">Foreign Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.tablesWithRLS}/{stats.totalTables}</div>
                <p className="text-xs text-muted-foreground">Com RLS</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalPolicies}</div>
                <p className="text-xs text-muted-foreground">Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Export */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tabelas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Todas
              </Button>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <Button
                  key={key}
                  variant={selectedCategory === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className={selectedCategory === key ? cat.color : ""}
                >
                  {cat.label.split(' ')[0]}
                </Button>
              ))}
            </div>

            <Button
              variant={showOnlyWithRelations ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyWithRelations(!showOnlyWithRelations)}
            >
              <Link2 className="w-4 h-4 mr-1.5" />
              Com FKs
            </Button>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                <FileDown className="w-4 h-4 mr-1.5" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('png')}>
                <Download className="w-4 h-4 mr-1.5" />
                JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diagram">
            <Database className="w-4 h-4 mr-2" />
            Diagrama
          </TabsTrigger>
          <TabsTrigger value="cascade">
            <GitBranch className="w-4 h-4 mr-2" />
            Dependências
          </TabsTrigger>
          <TabsTrigger value="rls">
            <Shield className="w-4 h-4 mr-2" />
            RLS Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagram" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RelationshipsDiagram 
                tables={filteredTables}
                selectedTable={selectedTable}
                onSelectTable={setSelectedTable}
              />
            </div>
            <div>
              <ScrollArea className="h-[600px]">
                {selectedTableData ? (
                  <TableDetails 
                    table={selectedTableData} 
                    onNavigate={handleNavigate}
                  />
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center py-12">
                      <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Selecione uma tabela para ver os detalhes
                      </p>
                    </CardContent>
                  </Card>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cascade" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CascadeDependencies selectedTable={selectedTable} />
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Selecione uma Tabela</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-1">
                      {DATABASE_SCHEMA.map(table => (
                        <Button
                          key={table.name}
                          variant={selectedTable === table.name ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setSelectedTable(table.name)}
                        >
                          {table.icon}
                          <span className="ml-2 truncate">{table.displayName}</span>
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rls" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Visão Geral de RLS (Row Level Security)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Status de segurança de todas as tabelas do sistema
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DATABASE_SCHEMA.map(table => (
                  <div 
                    key={table.name}
                    className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md",
                      table.rlsEnabled 
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200" 
                        : "bg-red-50 dark:bg-red-950/20 border-red-200"
                    )}
                    onClick={() => {
                      setSelectedTable(table.name);
                      setActiveTab('diagram');
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("p-1.5 rounded", CATEGORIES[table.category].color, "text-white")}>
                        {table.icon}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-sm">{table.displayName}</span>
                        <code className="text-xs text-muted-foreground block">{table.name}</code>
                      </div>
                      {table.rlsEnabled ? (
                        <Lock className="w-5 h-5 text-green-600" />
                      ) : (
                        <Unlock className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        table.rlsEnabled 
                          ? "bg-green-100 border-green-300 text-green-700"
                          : "bg-red-100 border-red-300 text-red-700"
                      )}>
                        {table.rlsEnabled ? `${table.rlsPolicies.length} policies` : 'Sem proteção'}
                      </Badge>
                      <div className="flex gap-1">
                        {table.rlsPolicies.some(p => p.command === 'SELECT' || p.command === 'ALL') && (
                          <Badge variant="outline" className="text-[10px] bg-blue-50">S</Badge>
                        )}
                        {table.rlsPolicies.some(p => p.command === 'INSERT' || p.command === 'ALL') && (
                          <Badge variant="outline" className="text-[10px] bg-green-50">I</Badge>
                        )}
                        {table.rlsPolicies.some(p => p.command === 'UPDATE' || p.command === 'ALL') && (
                          <Badge variant="outline" className="text-[10px] bg-yellow-50">U</Badge>
                        )}
                        {table.rlsPolicies.some(p => p.command === 'DELETE' || p.command === 'ALL') && (
                          <Badge variant="outline" className="text-[10px] bg-red-50">D</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">Legenda de Policies</h4>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-blue-50">S</Badge>
                    <span>SELECT</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-green-50">I</Badge>
                    <span>INSERT</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-yellow-50">U</Badge>
                    <span>UPDATE</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-red-50">D</Badge>
                    <span>DELETE</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Table Cards Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Maximize2 className="w-5 h-5" />
              Todas as Tabelas ({filteredTables.length})
            </span>
            {selectedTable && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedTable(null)}>
                Limpar seleção
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTables.map(table => (
              <TableCard
                key={table.name}
                table={table}
                isSelected={selectedTable === table.name}
                onSelect={() => setSelectedTable(table.name)}
                highlightedTables={highlightedTables}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseRelationshipsDiagram;
