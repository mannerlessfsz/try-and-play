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

      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
