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
import { 
  Layers, 
  Users, 
  Shield, 
  GitBranch, 
  Database,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Building2,
  Key,
  FileText,
  Workflow
} from 'lucide-react';

const SystemArchitectureViewer = () => {
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

      <Tabs defaultValue="navigation" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="navigation" className="flex items-center gap-2">
            <Workflow className="w-4 h-4" />
            Navegação
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Módulos
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Hierarquia
          </TabsTrigger>
          <TabsTrigger value="flow" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Fluxo Auth
          </TabsTrigger>
        </TabsList>

        {/* Navigation Flow Tab */}
        <TabsContent value="navigation" className="space-y-4 mt-4">
          <NavigationFlowDiagram />
        </TabsContent>

        {/* Módulos Tab */}
        <TabsContent value="modules" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Estrutura de Módulos e Recursos
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Tipos de Permissão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PERMISSION_TYPES.map((perm) => (
                  <div key={perm.value} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{perm.label}</Badge>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">
                        {perm.value}
                      </code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getPermissionDescription(perm.value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matriz de Permissões por Recurso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Módulo</th>
                      <th className="text-left py-2 px-3">Recurso</th>
                      {PERMISSION_TYPES.map(p => (
                        <th key={p.value} className="text-center py-2 px-2">
                          {p.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {APP_MODULES.filter(m => !['financialace', 'erp', 'ajustasped'].includes(m.value)).map((moduleConfig) => {
                      const module = moduleConfig.value;
                      const resources = MODULE_RESOURCES[module] || [];
                      if (resources.length === 0) {
                        return (
                          <tr key={module} className="border-b">
                            <td className="py-2 px-3">
                              <Badge variant="outline">{MODULE_LABELS[module]}</Badge>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground italic">
                              (módulo inteiro)
                            </td>
                            {PERMISSION_TYPES.map(p => (
                              <td key={p.value} className="text-center py-2 px-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                              </td>
                            ))}
                          </tr>
                        );
                      }
                      return resources.map((resource, idx) => (
                        <tr key={`${module}-${resource.value}`} className="border-b">
                          {idx === 0 && (
                            <td className="py-2 px-3" rowSpan={resources.length}>
                              <Badge variant="outline">{MODULE_LABELS[module]}</Badge>
                            </td>
                          )}
                          <td className="py-2 px-3">{resource.label}</td>
                          {PERMISSION_TYPES.map(p => (
                            <td key={p.value} className="text-center py-2 px-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                            </td>
                          ))}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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

                {/* Resource Permission Flow */}
                <div>
                  <h3 className="font-medium mb-3">3. Autorização por Recurso</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <FlowStep label="Ação no Recurso" sublabel="ex: criar transação" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <FlowStep label="useResourcePermissions" sublabel="Verificação" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <FlowStep label="user_resource_permissions" sublabel="Tabela" />
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
                  name="user_permissions" 
                  description="Permissões por módulo"
                  fields={['user_id', 'empresa_id', 'module', 'permission']}
                />
                <TableCard 
                  name="user_resource_permissions" 
                  description="Permissões granulares"
                  fields={['user_id', 'empresa_id', 'module', 'resource', 'can_*']}
                />
                <TableCard 
                  name="permission_profiles" 
                  description="Templates de permissão"
                  fields={['id', 'nome', 'role_padrao']}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Navigation Flow Diagram Component
const NavigationFlowDiagram = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            Mapa de Navegação do Sistema
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
                    <NavigationNode 
                      route="/" 
                      label="Landing Page" 
                      description="Página pública"
                      variant="public"
                    />
                    <div className="w-px h-6 bg-border" />
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <NavigationNode 
                          route="/auth" 
                          label="Login Cliente" 
                          description="Email + senha"
                          variant="auth"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <NavigationNode 
                          route="/master" 
                          label="Login Master" 
                          description="Username + senha"
                          variant="auth"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Branch - Authenticated */}
                  <div className="flex flex-col items-center">
                    <div className="bg-green-500/20 text-green-700 rounded px-3 py-1 text-sm font-medium mb-2">
                      SIM
                    </div>
                    <div className="w-px h-6 bg-border" />
                    <NavigationNode 
                      route="/dashboard" 
                      label="Dashboard" 
                      description="Hub principal"
                      variant="protected"
                    />
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
                        <NavigationNode 
                          route="/admin" 
                          label="Painel Admin" 
                          description="Gestão completa"
                          variant="admin"
                        />
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
                          <NavigationNode 
                            route="/taskvault" 
                            label="TaskVault" 
                            variant="module"
                            small
                          />
                          <NavigationNode 
                            route="/gestao" 
                            label="GESTÃO" 
                            variant="module"
                            small
                          />
                          <NavigationNode 
                            route="/conversores" 
                            label="Conversores" 
                            variant="module"
                            small
                          />
                          <NavigationNode 
                            route="/conferesped" 
                            label="ConfereSped" 
                            variant="module"
                            small
                          />
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-500/20 border border-slate-500" />
              <span className="text-sm">Rota Pública</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500" />
              <span className="text-sm">Autenticação</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500" />
              <span className="text-sm">Rota Protegida</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500" />
              <span className="text-sm">Admin Only</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500" />
              <span className="text-sm">Módulo</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complete Route List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Todas as Rotas do Sistema</CardTitle>
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
                <RouteRow route="/" name="Landing Page" type="public" requires="-" description="Página inicial pública" />
                <RouteRow route="/auth" name="Login Cliente" type="auth" requires="-" description="Autenticação por email" />
                <RouteRow route="/master" name="Login Master" type="auth" requires="-" description="Autenticação do administrador" />
                <RouteRow route="/dashboard" name="Dashboard" type="protected" requires="Autenticação" description="Hub central do usuário" />
                <RouteRow route="/admin" name="Painel Admin" type="admin" requires="Role: admin" description="Gestão de usuários, empresas e permissões" />
                <RouteRow route="/taskvault" name="TaskVault" type="module" requires="Permissão: taskvault" description="Gestão de tarefas" />
                <RouteRow route="/gestao" name="GESTÃO" type="module" requires="Permissão: gestao" description="ERP + Financeiro integrado" />
                <RouteRow route="/conversores" name="Conversores" type="module" requires="Permissão: conversores" description="Conversão de arquivos" />
                <RouteRow route="/conferesped" name="ConfereSped" type="module" requires="Permissão: conferesped" description="Conferência de SPED" />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
  type: 'public' | 'auth' | 'protected' | 'admin' | 'module';
  requires: string;
  description: string;
}) => {
  const typeColors = {
    public: 'bg-slate-500/20 text-slate-700',
    auth: 'bg-amber-500/20 text-amber-700',
    protected: 'bg-blue-500/20 text-blue-700',
    admin: 'bg-red-500/20 text-red-700',
    module: 'bg-green-500/20 text-green-700'
  };

  const typeLabels = {
    public: 'Pública',
    auth: 'Autenticação',
    protected: 'Protegida',
    admin: 'Admin',
    module: 'Módulo'
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
