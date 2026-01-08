/**
 * VISUALIZADOR DE ARQUITETURA COMPLETO
 * 
 * Permite:
 * - Visualizar toda a estrutura do projeto
 * - Identificar problemas e inconsistências
 * - Editar a estrutura
 * - Exportar para JSON/PNG
 * - Definir regras de propagação
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Upload, RefreshCw, Filter, Search, ZoomIn, ZoomOut,
  AlertTriangle, AlertCircle, Info, Check, X, ChevronRight, ChevronDown,
  FileCode, Database, Layers, Box, GitBranch, Settings, Eye, EyeOff,
  Maximize2, Minimize2, Copy, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  generateProjectStructure, 
  analyzeProject, 
  generateArchitectureGraph,
  type AnalysisResult 
} from '@/lib/architectureAnalyzer';
import { NODE_STATUS_COLORS, NODE_TYPE_LABELS } from '@/types/architecture';

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

interface TreeNodeProps {
  name: string;
  type: string;
  status?: string;
  path?: string;
  children?: React.ReactNode;
  depth?: number;
  issues?: string[];
  onSelect?: () => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  name, type, status = 'active', path, children, depth = 0, issues, onSelect 
}) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const hasChildren = React.Children.count(children) > 0;

  const statusColor = {
    active: 'bg-green-500',
    deprecated: 'bg-yellow-500',
    broken: 'bg-red-500',
    orphan: 'bg-gray-500',
    duplicate: 'bg-orange-500',
  }[status] || 'bg-gray-500';

  const typeIcon = {
    page: FileCode,
    hook: GitBranch,
    component: Box,
    context: Layers,
    table: Database,
    function: Settings,
  }[type] || Box;

  const Icon = typeIcon;

  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer
          hover:bg-accent/50 transition-colors
          ${issues?.length ? 'bg-destructive/10' : ''}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (hasChildren) setIsOpen(!isOpen);
          onSelect?.();
        }}
      >
        {hasChildren ? (
          isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                   <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <div className="w-4" />
        )}
        
        <Icon className="w-4 h-4 text-muted-foreground" />
        
        <span className="flex-1 text-sm font-medium truncate">{name}</span>
        
        <div className={`w-2 h-2 rounded-full ${statusColor}`} title={status} />
        
        {issues?.length ? (
          <Badge variant="destructive" className="text-xs px-1">
            {issues.length}
          </Badge>
        ) : null}
      </div>
      
      {hasChildren && isOpen && (
        <div>{children}</div>
      )}
    </div>
  );
};

interface IssueCardProps {
  issue: AnalysisResult['issues'][0];
  onDismiss?: () => void;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  
  const severityConfig = {
    error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  }[issue.severity];

  const Icon = severityConfig.icon;

  return (
    <Card className={`${severityConfig.bg} border-l-4 ${issue.severity === 'error' ? 'border-l-destructive' : issue.severity === 'warning' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${severityConfig.color} mt-0.5`} />
          <div className="flex-1">
            <CardTitle className="text-sm font-medium">{issue.title}</CardTitle>
            <CardDescription className="text-xs mt-1">{issue.description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 px-4 pb-3">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Arquivos afetados:</span>
              <ul className="mt-1 space-y-1">
                {issue.affectedFiles.map(file => (
                  <li key={file} className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                    <FileCode className="w-3 h-3" />
                    {file}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-medium">Sugestão:</span>
              <p className="text-xs text-muted-foreground mt-1">{issue.suggestion}</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ProjectArchitectureViewer: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Gerar estrutura e análise
  const structure = useMemo(() => generateProjectStructure(), []);
  const analysis = useMemo(() => analyzeProject(structure), [structure]);
  const graph = useMemo(() => generateArchitectureGraph(structure), [structure]);

  // Filtrar por busca
  const filteredHooks = useMemo(() => {
    return structure.hooks.filter(h => 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (!showOnlyIssues || h.status !== 'active')
    );
  }, [structure.hooks, searchQuery, showOnlyIssues]);

  const filteredPages = useMemo(() => {
    return structure.pages.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [structure.pages, searchQuery]);

  // Exportar JSON
  const handleExportJSON = useCallback(() => {
    const data = {
      structure,
      analysis,
      graph,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-architecture-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exportado', description: 'Arquivo JSON gerado com sucesso.' });
  }, [structure, analysis, graph, toast]);

  // Copiar para clipboard
  const handleCopyStructure = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(structure, null, 2));
    toast({ title: 'Copiado', description: 'Estrutura copiada para a área de transferência.' });
  }, [structure, toast]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Arquitetura do Projeto</h2>
          <p className="text-sm text-muted-foreground">
            {analysis.stats.totalFiles} arquivos • {analysis.issues.length} problemas detectados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyStructure}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="w-4 h-4 mr-2" />
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 p-4 border-b">
        <Card className="p-3">
          <div className="text-2xl font-bold">{structure.pages.length}</div>
          <div className="text-xs text-muted-foreground">Páginas</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold">{structure.hooks.length}</div>
          <div className="text-xs text-muted-foreground">Hooks</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold">{structure.components.length}</div>
          <div className="text-xs text-muted-foreground">Componentes</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold">{structure.database.tables.length}</div>
          <div className="text-xs text-muted-foreground">Tabelas</div>
        </Card>
        <Card className={`p-3 ${analysis.issues.length > 0 ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
          <div className="text-2xl font-bold">{analysis.issues.length}</div>
          <div className="text-xs text-muted-foreground">Problemas</div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Tree View */}
        <div className="w-1/3 border-r flex flex-col">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                id="show-issues" 
                checked={showOnlyIssues}
                onCheckedChange={setShowOnlyIssues}
              />
              <Label htmlFor="show-issues" className="text-xs">Mostrar apenas com problemas</Label>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2">
              {/* Páginas */}
              <TreeNode name="Páginas" type="layer" depth={0}>
                {filteredPages.map(page => (
                  <TreeNode 
                    key={page.name}
                    name={page.name}
                    type="page"
                    path={page.path}
                    depth={1}
                    onSelect={() => setSelectedNode(page.name)}
                  />
                ))}
              </TreeNode>

              {/* Hooks */}
              <TreeNode name="Hooks" type="layer" depth={0}>
                {filteredHooks.map(hook => (
                  <TreeNode 
                    key={hook.name}
                    name={hook.name}
                    type="hook"
                    status={hook.status}
                    path={hook.path}
                    depth={1}
                    issues={hook.issues}
                    onSelect={() => setSelectedNode(hook.name)}
                  />
                ))}
              </TreeNode>

              {/* Contextos */}
              <TreeNode name="Contextos" type="layer" depth={0}>
                {structure.contexts.map(ctx => (
                  <TreeNode 
                    key={ctx.name}
                    name={ctx.name}
                    type="context"
                    path={ctx.path}
                    depth={1}
                    onSelect={() => setSelectedNode(ctx.name)}
                  />
                ))}
              </TreeNode>

              {/* Banco de Dados */}
              <TreeNode name="Banco de Dados" type="layer" depth={0}>
                <TreeNode name="Tabelas" type="layer" depth={1}>
                  {structure.database.tables.map(table => (
                    <TreeNode 
                      key={table.name}
                      name={table.name}
                      type="table"
                      depth={2}
                      onSelect={() => setSelectedNode(table.name)}
                    />
                  ))}
                </TreeNode>
                <TreeNode name="Funções" type="layer" depth={1}>
                  {structure.database.functions.map(fn => (
                    <TreeNode 
                      key={fn.name}
                      name={fn.name}
                      type="function"
                      depth={2}
                      onSelect={() => setSelectedNode(fn.name)}
                    />
                  ))}
                </TreeNode>
              </TreeNode>
            </div>
          </ScrollArea>
        </div>

        {/* Details / Issues Panel */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="issues">
                Problemas
                {analysis.issues.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{analysis.issues.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="dependencies">Dependências</TabsTrigger>
              <TabsTrigger value="propagation">Propagação</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 p-4 overflow-auto">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estrutura de Módulos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {structure.pages.filter(p => p.module).map(page => (
                        <div key={page.name} className="p-3 rounded-lg border bg-card">
                          <div className="font-medium">{page.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {page.route} • {page.hooks.length} hooks • {page.components.length} componentes
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Legenda de Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      {Object.entries(NODE_STATUS_COLORS).map(([status, color]) => (
                        <div key={status} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color}`} />
                          <span className="text-sm capitalize">{status}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="issues" className="flex-1 p-4 overflow-auto">
              <div className="space-y-3">
                {analysis.issues.length === 0 ? (
                  <Card className="bg-green-500/10">
                    <CardContent className="flex items-center gap-3 py-4">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>Nenhum problema detectado!</span>
                    </CardContent>
                  </Card>
                ) : (
                  analysis.issues.map(issue => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="dependencies" className="flex-1 p-4 overflow-auto">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hooks mais utilizados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {structure.hooks
                        .sort((a, b) => b.usedBy.length - a.usedBy.length)
                        .slice(0, 10)
                        .map(hook => (
                          <div key={hook.name} className="flex items-center justify-between">
                            <span className="text-sm font-mono">{hook.name}</span>
                            <Badge variant="outline">{hook.usedBy.length} usos</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tabelas mais acessadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {structure.database.tables
                        .sort((a, b) => b.usedByHooks.length - a.usedByHooks.length)
                        .slice(0, 10)
                        .map(table => (
                          <div key={table.name} className="flex items-center justify-between">
                            <span className="text-sm font-mono">{table.name}</span>
                            <Badge variant="outline">{table.usedByHooks.length} hooks</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="propagation" className="flex-1 p-4 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Regras de Propagação</CardTitle>
                  <CardDescription>
                    Configure como mudanças devem se propagar pelo sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Mudança em Permissões</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Quando alterar usePermissions ou useModulePermissions, verificar:
                          </div>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <ul className="mt-3 text-sm space-y-1 text-muted-foreground">
                        <li>• ProtectedRoute.tsx</li>
                        <li>• ModulePermissionsEditor.tsx</li>
                        <li>• Todas as páginas de módulo</li>
                        <li>• RLS policies no banco</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Mudança em Empresa</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Quando alterar useEmpresas ou useEmpresaAtiva, verificar:
                          </div>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <ul className="mt-3 text-sm space-y-1 text-muted-foreground">
                        <li>• Todos os hooks que usam empresa_id</li>
                        <li>• Todos os managers de módulos</li>
                        <li>• Contexto EmpresaAtivaContext</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Mudança em Tabela</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Quando alterar schema de tabela, verificar:
                          </div>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <ul className="mt-3 text-sm space-y-1 text-muted-foreground">
                        <li>• Hook correspondente à tabela</li>
                        <li>• Tipos em types.ts</li>
                        <li>• RLS policies</li>
                        <li>• Triggers relacionados</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProjectArchitectureViewer;
