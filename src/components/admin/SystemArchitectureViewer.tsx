import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  APP_MODULES, 
  MODULE_LABELS, 
  MODULE_RESOURCES, 
  PERMISSION_TYPES, 
  ROLES,
  LEGACY_MODULE_MAP,
  type AppModule 
} from '@/constants/modules';
import { SYSTEM_ROUTES, type RouteType } from '@/constants/routes';
import DatabaseRelationshipsDiagram from './DatabaseRelationshipsDiagram';
import MigrationGenerator from './MigrationGenerator';
import PermissionTreeDiagram from './PermissionTreeDiagram';
import ProjectArchitectureViewer from './ProjectArchitectureViewer';
import { 
  Layers, 
  Users, 
  Shield, 
  GitBranch, 
  Database,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Building2,
  Key,
  FileText,
  Workflow,
  BookOpen,
  CheckSquare,
  AlertTriangle,
  Info,
  Wand2,
  FolderTree
} from 'lucide-react';

const SystemArchitectureViewer = () => {
  // Estatísticas dinâmicas
  const activeModules = APP_MODULES.filter(m => !['financialace', 'erp', 'ajustasped'].includes(m.value));
  const totalResources = Object.values(MODULE_RESOURCES).flat().length;
  const totalRoutes = SYSTEM_ROUTES.length;
  const moduleRoutes = SYSTEM_ROUTES.filter(r => r.type === 'module').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Workflow className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Arquitetura do Sistema</h2>
          <p className="text-sm text-muted-foreground">
            Visualização completa da estrutura de módulos, permissões e fluxos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{activeModules.length}</div>
            <p className="text-xs text-muted-foreground">Módulos Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{totalResources}</div>
            <p className="text-xs text-muted-foreground">Recursos Totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{totalRoutes}</div>
            <p className="text-xs text-muted-foreground">Rotas do Sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{ROLES.length}</div>
            <p className="text-xs text-muted-foreground">Papéis de Usuário</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="project" className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="project" className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            <span className="hidden sm:inline">Projeto</span>
          </TabsTrigger>
          <TabsTrigger value="navigation" className="flex items-center gap-2">
            <Workflow className="w-4 h-4" />
            <span className="hidden sm:inline">Navegação</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Banco</span>
          </TabsTrigger>
          <TabsTrigger value="migrations" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline">Migrations</span>
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Módulos</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Permissões</span>
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Hierarquia</span>
          </TabsTrigger>
          <TabsTrigger value="flow" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Fluxo Auth</span>
          </TabsTrigger>
          <TabsTrigger value="standards" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Padrões</span>
          </TabsTrigger>
        </TabsList>

        {/* Project Architecture Tab */}
        <TabsContent value="project" className="space-y-4 mt-4">
          <ProjectArchitectureViewer />
        </TabsContent>

        {/* Navigation Flow Tab */}
        <TabsContent value="navigation" className="space-y-4 mt-4">
          <NavigationFlowDiagram />
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4 mt-4">
          <DatabaseRelationshipsDiagram />
        </TabsContent>

        {/* Migrations Generator Tab */}
        <TabsContent value="migrations" className="space-y-4 mt-4">
          <MigrationGenerator />
        </TabsContent>

        {/* Módulos Tab */}
        <TabsContent value="modules" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Estrutura de Módulos e Recursos
                <Badge variant="outline" className="ml-auto">
                  {activeModules.length} ativos | {Object.keys(LEGACY_MODULE_MAP).length} legados
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {APP_MODULES.map((moduleConfig) => {
                  const module = moduleConfig.value;
                  const resources = MODULE_RESOURCES[module] || [];
                  const isLegacy = ['financialace', 'erp', 'ajustasped'].includes(module);
                  const legacyTarget = LEGACY_MODULE_MAP[module as keyof typeof LEGACY_MODULE_MAP];
                  
                  return (
                    <div 
                      key={module}
                      className={`border rounded-lg p-4 ${isLegacy ? 'bg-muted/50 border-dashed' : 'bg-card'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={isLegacy ? "secondary" : "default"}>
                            {MODULE_LABELS[module]}
                          </Badge>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">
                            {module}
                          </code>
                          {isLegacy && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              migrado para <code className="bg-muted px-1 rounded">{legacyTarget}</code>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isLegacy && resources.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {resources.length} recursos
                            </Badge>
                          )}
                          {isLegacy ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Legado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              Ativo
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {resources.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-2">Recursos:</p>
                          <div className="flex flex-wrap gap-2">
                            {resources.map((resource) => (
                              <div 
                                key={resource.value}
                                className="flex items-center gap-1 bg-background border rounded px-2 py-1"
                              >
                                <FileText className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{resource.label}</span>
                                <code className="text-xs text-muted-foreground ml-1">
                                  ({resource.value})
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {resources.length === 0 && !isLegacy && (
                        <p className="text-xs text-muted-foreground italic">
                          Módulo sem recursos granulares definidos
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legenda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Legenda</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">Módulo</Badge>
                <span className="text-sm text-muted-foreground">Módulo ativo</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Módulo</Badge>
                <span className="text-sm text-muted-foreground">Módulo legado (compatibilidade)</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-0.5 rounded">codigo</code>
                <span className="text-sm text-muted-foreground">Identificador no banco</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissões Tab */}
        <TabsContent value="permissions" className="space-y-4 mt-4">
          <PermissionTreeDiagram />
        </TabsContent>

        {/* Hierarquia Tab */}
        <TabsContent value="hierarchy" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Hierarquia de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                {/* Admin Level */}
                <div className="w-full max-w-md">
                  <div className="bg-red-500/10 border-2 border-red-500 rounded-lg p-4 text-center">
                    <Badge className="bg-red-500 mb-2">ADMIN</Badge>
                    <p className="text-sm font-medium">Administrador Master</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Acesso total ao sistema e plataforma
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-1">
                      <Badge variant="outline" className="text-xs">Gerencia usuários</Badge>
                      <Badge variant="outline" className="text-xs">Gerencia empresas</Badge>
                      <Badge variant="outline" className="text-xs">Acesso global</Badge>
                    </div>
                  </div>
                </div>

                <ArrowDown className="w-6 h-6 text-muted-foreground" />

                {/* Manager Level */}
                <div className="w-full max-w-md">
                  <div className="bg-blue-500/10 border-2 border-blue-500 rounded-lg p-4 text-center">
                    <Badge className="bg-blue-500 mb-2">MANAGER</Badge>
                    <p className="text-sm font-medium">Gerente de Empresa</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Acesso elevado dentro da empresa designada
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-1">
                      <Badge variant="outline" className="text-xs">Gerencia subordinados</Badge>
                      <Badge variant="outline" className="text-xs">Acesso aos módulos</Badge>
                      <Badge variant="outline" className="text-xs">Limitado à empresa</Badge>
                    </div>
                  </div>
                </div>

                <ArrowDown className="w-6 h-6 text-muted-foreground" />

                {/* User Level */}
                <div className="w-full max-w-md">
                  <div className="bg-green-500/10 border-2 border-green-500 rounded-lg p-4 text-center">
                    <Badge className="bg-green-500 mb-2">USER</Badge>
                    <p className="text-sm font-medium">Usuário Padrão</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Acesso baseado em permissões específicas
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-1">
                      <Badge variant="outline" className="text-xs">Permissões granulares</Badge>
                      <Badge variant="outline" className="text-xs">Por módulo/recurso</Badge>
                      <Badge variant="outline" className="text-xs">Limitado à empresa</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Papéis Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {ROLES.map((role) => (
                  <div key={role.value} className="border rounded-lg p-4">
                    <Badge style={{ backgroundColor: role.color }} className="mb-2">
                      {role.label}
                    </Badge>
                    <code className="block text-xs bg-muted px-2 py-1 rounded mt-2">
                      {role.value}
                    </code>
                    <p className="text-sm text-muted-foreground mt-2">
                      {getRoleDescription(role.value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fluxo de Autenticação Tab */}
        <TabsContent value="flow" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Fluxo de Autenticação e Autorização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Auth Flow */}
                <div>
                  <h3 className="font-medium mb-3">1. Autenticação</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <FlowStep label="Login" sublabel="/auth ou /master" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <FlowStep label="Supabase Auth" sublabel="Validação" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <FlowStep label="AuthContext" sublabel="Sessão" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <FlowStep label="Dashboard" sublabel="/dashboard" variant="success" />
                  </div>
                </div>

                {/* Authorization Flow */}
                <div>
                  <h3 className="font-medium mb-3">2. Autorização por Módulo</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <FlowStep label="Acesso Módulo" sublabel="ex: /gestao" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <FlowStep label="ProtectedRoute" sublabel="Verificação" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <FlowStep label="usePermissions" sublabel="Checagem" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-col gap-2">
                      <FlowStep label="Autorizado" variant="success" />
                      <FlowStep label="Negado → Login" variant="error" />
                    </div>
                  </div>
                </div>

                {/* Module Permission Flow */}
                <div>
                  <h3 className="font-medium mb-3">3. Autorização por Módulo</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <FlowStep label="Ação no Módulo" sublabel="ex: acessar gestão" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <FlowStep label="useModulePermissions" sublabel="Verificação" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <FlowStep label="user_module_permissions" sublabel="Tabela" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-col gap-2">
                      <FlowStep label="Permitido" variant="success" />
                      <FlowStep label="Bloqueado" variant="error" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tabelas de Dados Envolvidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <TableCard 
                  name="profiles" 
                  description="Dados dos usuários"
                  fields={['id', 'email', 'full_name', 'ativo']}
                />
                <TableCard 
                  name="user_roles" 
                  description="Papéis dos usuários"
                  fields={['user_id', 'role']}
                />
                <TableCard 
                  name="user_empresas" 
                  description="Vínculo usuário-empresa"
                  fields={['user_id', 'empresa_id', 'is_owner']}
                />
                <TableCard 
                  name="user_module_permissions" 
                  description="Permissões por módulo"
                  fields={['user_id', 'empresa_id', 'module', 'can_view', 'can_create', 'can_edit', 'can_delete']}
                />
                <TableCard 
                  name="empresa_modulos"
                  description="Templates de permissão"
                  fields={['id', 'nome', 'role_padrao']}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Padrões de Desenvolvimento Tab */}
        <TabsContent value="standards" className="space-y-4 mt-4">
          <DevelopmentStandards />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Development Standards Component
const DevelopmentStandards = () => {
  return (
    <div className="space-y-4">
      {/* Intro */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Padrões de Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Mantenha a consistência!</p>
              <p className="text-sm text-muted-foreground">
                Siga os padrões abaixo para garantir que novas funcionalidades se integrem 
                corretamente ao sistema e que os diagramas se atualizem automaticamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist: Novo Módulo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="w-5 h-5" />
            Checklist: Adicionar Novo Módulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ChecklistItem 
              step={1}
              title="Definir módulo em src/constants/modules.ts"
              description="Adicionar ao APP_MODULES, MODULE_LABELS e MODULE_RESOURCES"
              code="APP_MODULES.push({ value: 'novo', label: 'Novo Módulo', ... })"
            />
            <ChecklistItem 
              step={2}
              title="Definir rota em src/constants/routes.ts"
              description="Adicionar ao SYSTEM_ROUTES com type 'module'"
              code="SYSTEM_ROUTES.push({ path: '/novo', module: 'novo', type: 'module', ... })"
            />
            <ChecklistItem 
              step={3}
              title="Executar migração do banco"
              description="Adicionar ao enum app_module no PostgreSQL"
              code="ALTER TYPE app_module ADD VALUE 'novo';"
            />
            <ChecklistItem 
              step={4}
              title="Criar página do módulo"
              description="Criar em src/pages/NovoModulo.tsx"
            />
            <ChecklistItem 
              step={5}
              title="Adicionar rota em App.tsx"
              description="Usar ProtectedRoute com module='novo'"
              code='<Route path="/novo" element={<ProtectedRoute module="novo"><NovoModulo /></ProtectedRoute>} />'
            />
            <ChecklistItem 
              step={6}
              title="Adicionar card no Dashboard"
              description="Incluir card na página Index.tsx para acesso ao módulo"
            />
            <ChecklistItem 
              step={7}
              title="Testar permissões"
              description="Verificar no painel Admin que as permissões estão funcionando"
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist: Nova Rota */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="w-5 h-5" />
            Checklist: Adicionar Nova Rota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ChecklistItem 
              step={1}
              title="Definir rota em src/constants/routes.ts"
              description="Adicionar ao SYSTEM_ROUTES com tipo apropriado"
            />
            <ChecklistItem 
              step={2}
              title="Criar componente/página"
              description="Criar arquivo em src/pages/ ou src/components/"
            />
            <ChecklistItem 
              step={3}
              title="Adicionar rota em App.tsx"
              description="Com ou sem ProtectedRoute conforme necessário"
            />
            <ChecklistItem 
              step={4}
              title="Adicionar navegação"
              description="Links em menus, botões ou breadcrumbs relevantes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist: Novo Recurso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="w-5 h-5" />
            Checklist: Adicionar Novo Recurso a Módulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ChecklistItem 
              step={1}
              title="Definir módulo em src/constants/modules.ts"
              description="Incluir o módulo na lista de módulos disponíveis"
              code="ALL_MODULES.push('novo_modulo')"
            />
            <ChecklistItem 
              step={2}
              title="Configurar permissões via Admin"
              description="Usar o editor de permissões para conceder acesso aos usuários"
            />
            <ChecklistItem 
              step={3}
              title="Implementar verificação de permissão"
              description="Usar useModulePermissions no componente"
              code="const { permissions } = useModulePermissions('novo_modulo', empresaId)"
            />
            <ChecklistItem 
              step={4}
              title="Testar no painel Admin"
              description="Verificar que o módulo aparece na configuração de permissões"
            />
          </div>
        </CardContent>
      </Card>

      {/* Arquivos Importantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            Arquivos Fonte de Verdade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <FileReference 
              path="src/constants/modules.ts"
              description="Definição central de módulos e permissões"
            />
            <FileReference 
              path="src/constants/routes.ts"
              description="Definição central de todas as rotas do sistema"
            />
            <FileReference 
              path="src/App.tsx"
              description="Configuração de rotas React Router"
            />
            <FileReference 
              path="src/hooks/usePermissions.ts"
              description="Hook de verificação de permissões por módulo"
            />
            <FileReference 
              path="src/hooks/useModulePermissions.ts"
              description="Hook de permissões de módulo por empresa"
            />
            <FileReference 
              path="src/components/ProtectedRoute.tsx"
              description="Componente de proteção de rotas"
            />
          </div>
        </CardContent>
      </Card>

      {/* Avisos */}
      <Card className="border-amber-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Atenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span>Nunca defina módulos diretamente em componentes - use sempre <code className="bg-muted px-1 rounded">modules.ts</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span>Ao alterar o enum <code className="bg-muted px-1 rounded">app_module</code> no banco, o arquivo <code className="bg-muted px-1 rounded">types.ts</code> será atualizado automaticamente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span>Módulos legados (financialace, erp, ajustasped) devem ser mantidos para compatibilidade com dados existentes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span>Sempre teste as permissões após adicionar novos módulos ou recursos</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

// Checklist Item Component
const ChecklistItem = ({ 
  step, 
  title, 
  description, 
  code 
}: { 
  step: number; 
  title: string; 
  description: string; 
  code?: string;
}) => (
  <div className="flex items-start gap-3 p-3 border rounded-lg">
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
      {step}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {code && (
        <code className="block text-xs bg-muted px-2 py-1 rounded mt-2 overflow-x-auto">
          {code}
        </code>
      )}
    </div>
  </div>
);

// File Reference Component
const FileReference = ({ path, description }: { path: string; description: string }) => (
  <div className="flex items-center gap-3 p-3 border rounded-lg">
    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    <div>
      <code className="text-sm font-medium">{path}</code>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);

// Navigation Flow Diagram Component (uses dynamic data)
const NavigationFlowDiagram = () => {
  const publicRoutes = SYSTEM_ROUTES.filter(r => r.type === 'public');
  const authRoutes = SYSTEM_ROUTES.filter(r => r.type === 'auth');
  const protectedRoutes = SYSTEM_ROUTES.filter(r => r.type === 'protected');
  const adminRoutes = SYSTEM_ROUTES.filter(r => r.type === 'admin');
  const moduleRoutes = SYSTEM_ROUTES.filter(r => r.type === 'module');
  const redirectRoutes = SYSTEM_ROUTES.filter(r => r.type === 'redirect');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            Mapa de Navegação do Sistema
            <Badge variant="outline" className="ml-auto">
              {SYSTEM_ROUTES.length} rotas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px] p-4">
              {/* Root Level */}
              <div className="flex flex-col items-center">
                {/* Entry Point */}
                <div className="bg-primary text-primary-foreground rounded-lg px-6 py-3 font-bold text-lg shadow-lg">
                  / (Raiz)
                </div>
                
                <div className="w-px h-8 bg-border" />
                
                {/* First Decision */}
                <div className="bg-amber-500/20 border-2 border-amber-500 rounded-lg px-4 py-2 text-center">
                  <p className="font-medium">Usuário autenticado?</p>
                </div>
                
                {/* Branches */}
                <div className="flex items-start gap-4 mt-4">
                  {/* Left Branch - Not Authenticated */}
                  <div className="flex flex-col items-center">
                    <div className="bg-red-500/20 text-red-700 rounded px-3 py-1 text-sm font-medium mb-2">
                      NÃO
                    </div>
                    <div className="w-px h-6 bg-border" />
                    {publicRoutes.map(route => (
                      <NavigationNode 
                        key={route.path}
                        route={route.path} 
                        label={route.name} 
                        description={route.description}
                        variant="public"
                      />
                    ))}
                    <div className="w-px h-6 bg-border" />
                    <div className="flex gap-4">
                      {authRoutes.map(route => (
                        <div key={route.path} className="flex flex-col items-center">
                          <NavigationNode 
                            route={route.path} 
                            label={route.name} 
                            description={route.description}
                            variant="auth"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Branch - Authenticated */}
                  <div className="flex flex-col items-center">
                    <div className="bg-green-500/20 text-green-700 rounded px-3 py-1 text-sm font-medium mb-2">
                      SIM
                    </div>
                    <div className="w-px h-6 bg-border" />
                    {protectedRoutes.map(route => (
                      <NavigationNode 
                        key={route.path}
                        route={route.path} 
                        label={route.name} 
                        description={route.description}
                        variant="protected"
                      />
                    ))}
                    <div className="w-px h-6 bg-border" />
                    
                    {/* Second Decision - Role Check */}
                    <div className="bg-amber-500/20 border-2 border-amber-500 rounded-lg px-4 py-2 text-center mb-4">
                      <p className="font-medium text-sm">Qual papel?</p>
                    </div>
                    
                    <div className="flex gap-6">
                      {/* Admin Branch */}
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-red-500 text-white rounded px-3 py-1 text-sm font-medium">
                          ADMIN
                        </div>
                        {adminRoutes.map(route => (
                          <NavigationNode 
                            key={route.path}
                            route={route.path} 
                            label={route.name} 
                            description={route.description}
                            variant="admin"
                          />
                        ))}
                        <div className="text-xs text-muted-foreground text-center max-w-[120px]">
                          + Acesso a todos os módulos
                        </div>
                      </div>

                      {/* Manager/User Branch */}
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-blue-500 text-white rounded px-3 py-1 text-sm font-medium">
                          MANAGER / USER
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {moduleRoutes.map(route => (
                            <NavigationNode 
                              key={route.path}
                              route={route.path} 
                              label={route.name} 
                              variant="module"
                              small
                            />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground text-center max-w-[200px]">
                          Acesso conforme permissões configuradas
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legenda das Rotas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-500/20 border border-slate-500" />
              <span className="text-sm">Pública ({publicRoutes.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500" />
              <span className="text-sm">Autenticação ({authRoutes.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500" />
              <span className="text-sm">Protegida ({protectedRoutes.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500" />
              <span className="text-sm">Admin ({adminRoutes.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500" />
              <span className="text-sm">Módulo ({moduleRoutes.length})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complete Route List - Dynamic */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            Todas as Rotas do Sistema
            <Badge variant="outline" className="ml-2">{SYSTEM_ROUTES.length} rotas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Rota</th>
                  <th className="text-left py-2 px-3">Nome</th>
                  <th className="text-left py-2 px-3">Tipo</th>
                  <th className="text-left py-2 px-3">Requer</th>
                  <th className="text-left py-2 px-3">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {SYSTEM_ROUTES.map(route => (
                  <RouteRow 
                    key={route.path}
                    route={route.path} 
                    name={route.name} 
                    type={route.type} 
                    requires={route.requires} 
                    description={route.redirectTo ? `${route.description} → ${route.redirectTo}` : route.description} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Redirects if any */}
      {redirectRoutes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rotas de Redirecionamento (Legado)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {redirectRoutes.map(route => (
                <div key={route.path} className="flex items-center gap-2 text-sm">
                  <code className="bg-muted px-2 py-0.5 rounded">{route.path}</code>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <code className="bg-muted px-2 py-0.5 rounded">{route.redirectTo}</code>
                  <span className="text-muted-foreground">({route.description})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Navigation Node Component
const NavigationNode = ({ 
  route, 
  label, 
  description,
  variant = 'default',
  small = false
}: { 
  route: string; 
  label: string; 
  description?: string;
  variant?: 'public' | 'auth' | 'protected' | 'admin' | 'module' | 'default';
  small?: boolean;
}) => {
  const colors = {
    public: 'bg-slate-500/10 border-slate-500',
    auth: 'bg-amber-500/10 border-amber-500',
    protected: 'bg-blue-500/10 border-blue-500',
    admin: 'bg-red-500/10 border-red-500',
    module: 'bg-green-500/10 border-green-500',
    default: 'bg-muted border-border'
  };

  return (
    <div className={`border-2 rounded-lg text-center ${colors[variant]} ${small ? 'px-2 py-1' : 'px-4 py-2'}`}>
      <code className={`font-mono ${small ? 'text-xs' : 'text-sm'}`}>{route}</code>
      <p className={`font-medium ${small ? 'text-xs' : 'text-sm'}`}>{label}</p>
      {description && !small && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

// Route Row Component
const RouteRow = ({
  route,
  name,
  type,
  requires,
  description
}: {
  route: string;
  name: string;
  type: RouteType;
  requires: string;
  description: string;
}) => {
  const typeColors: Record<RouteType, string> = {
    public: 'bg-slate-500/20 text-slate-700',
    auth: 'bg-amber-500/20 text-amber-700',
    protected: 'bg-blue-500/20 text-blue-700',
    admin: 'bg-red-500/20 text-red-700',
    module: 'bg-green-500/20 text-green-700',
    redirect: 'bg-orange-500/20 text-orange-700'
  };

  const typeLabels: Record<RouteType, string> = {
    public: 'Pública',
    auth: 'Autenticação',
    protected: 'Protegida',
    admin: 'Admin',
    module: 'Módulo',
    redirect: 'Redirect'
  };

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-2 px-3">
        <code className="text-xs bg-muted px-2 py-0.5 rounded">{route}</code>
      </td>
      <td className="py-2 px-3 font-medium">{name}</td>
      <td className="py-2 px-3">
        <span className={`text-xs px-2 py-0.5 rounded ${typeColors[type]}`}>
          {typeLabels[type]}
        </span>
      </td>
      <td className="py-2 px-3 text-muted-foreground text-xs">{requires}</td>
      <td className="py-2 px-3 text-muted-foreground text-xs">{description}</td>
    </tr>
  );
}

// Helper Components
const FlowStep = ({ 
  label, 
  sublabel, 
  variant = 'default' 
}: { 
  label: string; 
  sublabel?: string; 
  variant?: 'default' | 'success' | 'error';
}) => {
  const colors = {
    default: 'bg-muted border-border',
    success: 'bg-green-500/10 border-green-500 text-green-700',
    error: 'bg-red-500/10 border-red-500 text-red-700'
  };

  return (
    <div className={`border rounded-lg px-3 py-2 text-center ${colors[variant]}`}>
      <p className="text-sm font-medium">{label}</p>
      {sublabel && (
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
};

const TableCard = ({ 
  name, 
  description, 
  fields 
}: { 
  name: string; 
  description: string; 
  fields: string[];
}) => (
  <div className="border rounded-lg p-3">
    <div className="flex items-center gap-2 mb-2">
      <Database className="w-4 h-4 text-primary" />
      <code className="text-sm font-medium">{name}</code>
    </div>
    <p className="text-xs text-muted-foreground mb-2">{description}</p>
    <div className="flex flex-wrap gap-1">
      {fields.map(f => (
        <code key={f} className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {f}
        </code>
      ))}
    </div>
  </div>
);

// Helper functions
function getPermissionDescription(permission: string): string {
  const descriptions: Record<string, string> = {
    view: 'Permite visualizar dados e listagens',
    create: 'Permite criar novos registros',
    edit: 'Permite editar registros existentes',
    delete: 'Permite excluir registros',
    export: 'Permite exportar dados (PDF, Excel, etc.)'
  };
  return descriptions[permission] || '';
}

function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    admin: 'Acesso total ao sistema, gerenciamento de usuários, empresas e configurações da plataforma.',
    manager: 'Gerenciamento da empresa designada, incluindo usuários subordinados e acesso aos módulos contratados.',
    user: 'Acesso operacional baseado nas permissões específicas configuradas para cada módulo e recurso.'
  };
  return descriptions[role] || '';
}

export default SystemArchitectureViewer;
