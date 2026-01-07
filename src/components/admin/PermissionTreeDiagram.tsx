import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Sparkles,
  CheckSquare,
  Layers,
  MessageCircle,
  RefreshCw,
  ClipboardList,
  ChevronRight,
  Users,
  Building2,
  Package,
  ShoppingCart,
  Truck,
  Receipt,
  Landmark,
  Target,
  BarChart3,
  FileText,
  Upload,
  Clock,
  Briefcase,
  Bell,
  Zap,
  FileUp,
  Home,
  MessageSquare,
  Phone,
  Send,
  Archive,
  PieChart,
  FolderOpen,
  UserPlus,
  Settings,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipo para item de permissão
interface PermissionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: PermissionItem[];
  proOnly?: boolean;
}

// Tipo para módulo
interface ModuleTree {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  children: PermissionItem[];
}

// Árvore de permissões BÁSICO
const basicPermissionTree: ModuleTree[] = [
  {
    id: 'taskvault',
    label: 'TASKVAULT',
    icon: <ClipboardList className="w-5 h-5" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 border-red-500/30',
    children: [
      {
        id: 'tarefas',
        label: 'Tarefas',
        icon: <CheckSquare className="w-4 h-4" />,
        children: [
          { id: 'view', label: 'Visualizar lista/kanban' },
          { id: 'create', label: 'Criar tarefas manuais' },
          { id: 'edit', label: 'Editar tarefas' },
          { id: 'delete', label: 'Excluir tarefas' },
          { id: 'status', label: 'Alterar status/progresso' },
        ]
      },
      {
        id: 'anexos',
        label: 'Anexos',
        icon: <FileUp className="w-4 h-4" />,
        children: [
          { id: 'view', label: 'Visualizar anexos' },
          { id: 'upload', label: 'Fazer upload' },
          { id: 'delete', label: 'Excluir anexos' },
        ]
      },
      {
        id: 'relatorios',
        label: 'Relatórios',
        icon: <BarChart3 className="w-4 h-4" />,
        children: [
          { id: 'export_csv', label: 'Exportar lista (CSV)' },
        ]
      },
    ]
  },
  {
    id: 'gestao',
    label: 'GESTÃO',
    icon: <Layers className="w-5 h-5" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    children: [
      {
        id: 'financeiro',
        label: 'Financeiro',
        icon: <Receipt className="w-4 h-4" />,
        children: [
          {
            id: 'transacoes',
            label: 'Transações',
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'delete', label: 'Excluir' },
            ]
          },
          {
            id: 'contas_bancarias',
            label: 'Contas Bancárias',
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'delete', label: 'Excluir' },
            ]
          },
          {
            id: 'categorias',
            label: 'Categorias',
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'delete', label: 'Excluir' },
            ]
          },
          {
            id: 'centros_custo',
            label: 'Centros de Custo',
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'delete', label: 'Excluir' },
            ]
          },
        ]
      },
      {
        id: 'erp',
        label: 'ERP (Comercial)',
        icon: <Package className="w-4 h-4" />,
        children: [
          {
            id: 'produtos',
            label: 'Produtos/Serviços',
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'delete', label: 'Excluir' },
            ]
          },
          {
            id: 'clientes',
            label: 'Clientes',
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'delete', label: 'Excluir' },
            ]
          },
          {
            id: 'fornecedores',
            label: 'Fornecedores',
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'delete', label: 'Excluir' },
            ]
          },
          {
            id: 'vendas',
            label: 'Vendas',
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'cancel', label: 'Cancelar' },
            ]
          },
          {
            id: 'compras',
            label: 'Compras',
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'cancel', label: 'Cancelar' },
            ]
          },
          {
            id: 'estoque',
            label: 'Estoque',
            children: [
              { id: 'view_saldo', label: 'Visualizar saldo' },
              { id: 'view_mov', label: 'Ver movimentações' },
            ]
          },
          {
            id: 'orcamentos',
            label: 'Orçamentos',
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'pdf', label: 'Gerar PDF' },
            ]
          },
        ]
      },
    ]
  },
  {
    id: 'conversores',
    label: 'CONVERSORES',
    icon: <RefreshCw className="w-5 h-5" />,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    children: [
      {
        id: 'fiscal',
        label: 'Fiscal',
        icon: <FileText className="w-4 h-4" />,
        children: [
          { id: 'ajustasped', label: 'Ajusta SPED (processar)' },
          { id: 'lancaapae', label: 'Lança APAE (importar)' },
          { id: 'download', label: 'Download arquivos convertidos' },
        ]
      },
      {
        id: 'extrato',
        label: 'Extrato',
        icon: <Landmark className="w-4 h-4" />,
        children: [
          { id: 'ofx', label: 'Converter OFX' },
          { id: 'pdf', label: 'Converter PDF' },
          { id: 'download', label: 'Download arquivos' },
        ]
      },
      {
        id: 'sistemas',
        label: 'Sistemas Legados',
        icon: <Home className="w-4 h-4" />,
        children: [
          { id: 'casa', label: 'Conversor CASA' },
          { id: 'lider', label: 'Conversor LÍDER' },
        ]
      },
    ]
  },
  {
    id: 'messenger',
    label: 'MESSENGER',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    children: [
      {
        id: 'conversas_internas',
        label: 'Conversas Internas',
        icon: <MessageSquare className="w-4 h-4" />,
        children: [
          { id: 'view', label: 'Visualizar' },
          { id: 'send', label: 'Enviar mensagens' },
          { id: 'edit_own', label: 'Editar mensagens próprias' },
          { id: 'delete_own', label: 'Excluir mensagens próprias' },
        ]
      },
      {
        id: 'conversas_externas',
        label: 'Conversas Externas (WhatsApp)',
        icon: <Phone className="w-4 h-4" />,
        children: [
          { id: 'view', label: 'Visualizar' },
          { id: 'send', label: 'Enviar mensagens' },
        ]
      },
      {
        id: 'contatos_internos',
        label: 'Contatos Internos',
        icon: <Users className="w-4 h-4" />,
        children: [
          { id: 'view', label: 'Visualizar lista' },
        ]
      },
      {
        id: 'contatos_externos',
        label: 'Contatos Externos',
        icon: <UserPlus className="w-4 h-4" />,
        children: [
          { id: 'view', label: 'Visualizar lista' },
        ]
      },
    ]
  },
];

// Árvore de permissões PRO (inclui tudo do básico + extras)
const proPermissionTree: ModuleTree[] = [
  {
    id: 'taskvault',
    label: 'TASKVAULT PRO',
    icon: <ClipboardList className="w-5 h-5" />,
    color: 'text-red-500',
    bgColor: 'bg-gradient-to-r from-red-500/10 to-amber-500/10 border-red-500/30',
    children: [
      {
        id: 'tarefas',
        label: 'Tarefas (Básico +)',
        icon: <CheckSquare className="w-4 h-4" />,
        children: [
          { id: 'bulk', label: 'Gestão em massa (bulk actions)', proOnly: true },
          { id: 'assign', label: 'Atribuir responsáveis', proOnly: true },
        ]
      },
      {
        id: 'modelos',
        label: 'Modelos de Tarefa',
        icon: <FileText className="w-4 h-4" />,
        proOnly: true,
        children: [
          { id: 'view', label: 'Visualizar modelos' },
          { id: 'create', label: 'Criar modelos' },
          { id: 'edit', label: 'Editar modelos' },
          { id: 'delete', label: 'Excluir modelos' },
          { id: 'regimes', label: 'Vincular a regimes tributários' },
        ]
      },
      {
        id: 'automacoes',
        label: 'Automações',
        icon: <Zap className="w-4 h-4" />,
        proOnly: true,
        children: [
          { id: 'auto_gen', label: 'Configurar geração automática' },
          { id: 'email', label: 'Configurar envio de e-mail' },
          { id: 'notif', label: 'Gerenciar notificações' },
        ]
      },
      {
        id: 'departamentos',
        label: 'Departamentos',
        icon: <Briefcase className="w-4 h-4" />,
        proOnly: true,
        children: [
          { id: 'config', label: 'Configurar departamentos' },
        ]
      },
      {
        id: 'relatorios_adv',
        label: 'Relatórios Avançados',
        icon: <BarChart3 className="w-4 h-4" />,
        proOnly: true,
        children: [
          { id: 'dashboard', label: 'Dashboards analíticos' },
          { id: 'export', label: 'Exportar relatórios (PDF/Excel)' },
          { id: 'history', label: 'Histórico de atividades' },
        ]
      },
    ]
  },
  {
    id: 'gestao',
    label: 'GESTÃO PRO',
    icon: <Layers className="w-5 h-5" />,
    color: 'text-blue-500',
    bgColor: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30',
    children: [
      {
        id: 'financeiro',
        label: 'Financeiro (Básico +)',
        icon: <Receipt className="w-4 h-4" />,
        children: [
          {
            id: 'recorrencias',
            label: 'Recorrências',
            proOnly: true,
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'delete', label: 'Excluir' },
            ]
          },
          {
            id: 'metas',
            label: 'Metas Financeiras',
            proOnly: true,
            children: [
              { id: 'view', label: 'Visualizar' },
              { id: 'create', label: 'Criar' },
              { id: 'edit', label: 'Editar' },
              { id: 'delete', label: 'Excluir' },
            ]
          },
          {
            id: 'importacoes',
            label: 'Importações',
            proOnly: true,
            children: [
              { id: 'import', label: 'Importar extratos (OFX/PDF)' },
              { id: 'history', label: 'Ver histórico de importações' },
            ]
          },
          {
            id: 'conciliacao',
            label: 'Conciliação Bancária',
            proOnly: true,
            children: [
              { id: 'conciliar', label: 'Conciliar transações' },
              { id: 'desfazer', label: 'Desfazer conciliação' },
            ]
          },
          {
            id: 'relatorios_fin',
            label: 'Relatórios Financeiros',
            proOnly: true,
            children: [
              { id: 'dashboard', label: 'Dashboard completo' },
              { id: 'dre', label: 'DRE (Demonstrativo)' },
              { id: 'fluxo', label: 'Fluxo de caixa' },
              { id: 'export', label: 'Exportar relatórios' },
            ]
          },
        ]
      },
      {
        id: 'erp',
        label: 'ERP (Básico +)',
        icon: <Package className="w-4 h-4" />,
        children: [
          {
            id: 'estoque_adv',
            label: 'Estoque Avançado',
            proOnly: true,
            children: [
              { id: 'adjust', label: 'Ajustar estoque manual' },
              { id: 'transfer', label: 'Transferências entre locais' },
              { id: 'alerts', label: 'Alertas de estoque mínimo' },
            ]
          },
          {
            id: 'nfe',
            label: 'Importação NF-e',
            proOnly: true,
            children: [
              { id: 'xml', label: 'Importar XML' },
              { id: 'pdf', label: 'Importar PDF (IA)' },
              { id: 'auto', label: 'Cadastro automático' },
            ]
          },
          {
            id: 'relatorios_erp',
            label: 'Relatórios ERP',
            proOnly: true,
            children: [
              { id: 'ranking', label: 'Ranking de produtos' },
              { id: 'clientes', label: 'Análise de clientes' },
              { id: 'export', label: 'Exportar relatórios' },
            ]
          },
        ]
      },
    ]
  },
  {
    id: 'conversores',
    label: 'CONVERSORES PRO',
    icon: <RefreshCw className="w-5 h-5" />,
    color: 'text-cyan-500',
    bgColor: 'bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border-cyan-500/30',
    children: [
      {
        id: 'fiscal',
        label: 'Fiscal (Básico +)',
        icon: <FileText className="w-4 h-4" />,
        children: [
          { id: 'conferesped', label: 'Conferir SPED (validação)', proOnly: true },
          { id: 'relatorios', label: 'Relatórios de conferência', proOnly: true },
          { id: 'historico', label: 'Histórico de conversões', proOnly: true },
        ]
      },
      {
        id: 'extrato',
        label: 'Extrato (Básico +)',
        icon: <Landmark className="w-4 h-4" />,
        children: [
          { id: 'batch', label: 'Processamento em lote (batch)', proOnly: true },
        ]
      },
      {
        id: 'sistemas',
        label: 'Sistemas (Básico +)',
        icon: <Home className="w-4 h-4" />,
        children: [
          { id: 'regras', label: 'Regras de exclusão personalizadas', proOnly: true },
          { id: 'export_config', label: 'Exportar configurações', proOnly: true },
        ]
      },
      {
        id: 'contabil',
        label: 'Contábil',
        icon: <PieChart className="w-4 h-4" />,
        proOnly: true,
        children: [
          { id: 'balancete', label: 'Converter Balancete' },
          { id: 'dre', label: 'Converter DRE' },
          { id: 'plano', label: 'Converter Plano de Contas' },
        ]
      },
    ]
  },
  {
    id: 'messenger',
    label: 'MESSENGER PRO',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'text-orange-500',
    bgColor: 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30',
    children: [
      {
        id: 'conversas_internas',
        label: 'Conversas Internas (Básico +)',
        icon: <MessageSquare className="w-4 h-4" />,
        children: [
          { id: 'grupos', label: 'Criar grupos', proOnly: true },
          { id: 'participantes', label: 'Gerenciar participantes', proOnly: true },
          { id: 'fixar', label: 'Fixar conversas', proOnly: true },
          { id: 'arquivar', label: 'Arquivar conversas', proOnly: true },
        ]
      },
      {
        id: 'conversas_externas',
        label: 'Conversas Externas (Básico +)',
        icon: <Phone className="w-4 h-4" />,
        children: [
          { id: 'create', label: 'Criar contatos externos', proOnly: true },
          { id: 'edit', label: 'Editar contatos externos', proOnly: true },
          { id: 'delete', label: 'Excluir contatos externos', proOnly: true },
          { id: 'files', label: 'Enviar arquivos/documentos', proOnly: true },
          { id: 'vincular', label: 'Vincular a cliente/fornecedor', proOnly: true },
        ]
      },
      {
        id: 'contatos',
        label: 'Contatos (Básico +)',
        icon: <Users className="w-4 h-4" />,
        children: [
          { id: 'tags', label: 'Gerenciar tags/categorias', proOnly: true },
          { id: 'export', label: 'Exportar lista de contatos', proOnly: true },
        ]
      },
      {
        id: 'templates',
        label: 'Templates de Mensagem',
        icon: <FileText className="w-4 h-4" />,
        proOnly: true,
        children: [
          { id: 'view', label: 'Visualizar templates' },
          { id: 'create', label: 'Criar templates' },
          { id: 'edit', label: 'Editar templates' },
          { id: 'delete', label: 'Excluir templates' },
        ]
      },
      {
        id: 'relatorios_msg',
        label: 'Relatórios',
        icon: <BarChart3 className="w-4 h-4" />,
        proOnly: true,
        children: [
          { id: 'metricas', label: 'Métricas de atendimento' },
          { id: 'export', label: 'Exportar histórico' },
        ]
      },
    ]
  },
];

// Componente para renderizar item da árvore
const TreeItem = ({ 
  item, 
  level = 0,
  parentColor 
}: { 
  item: PermissionItem; 
  level?: number;
  parentColor?: string;
}) => {
  const hasChildren = item.children && item.children.length > 0;
  
  return (
    <div className={cn("relative", level > 0 && "ml-4 border-l border-border/50 pl-3")}>
      <div className={cn(
        "flex items-center gap-2 py-1.5 text-sm",
        item.proOnly && "text-amber-600"
      )}>
        {level > 0 && (
          <div className="absolute -left-[1px] top-3 w-3 h-px bg-border/50" />
        )}
        {item.icon && <span className={cn("flex-shrink-0", parentColor)}>{item.icon}</span>}
        <span className={cn("font-medium", !hasChildren && "font-normal")}>
          {item.label}
        </span>
        {item.proOnly && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Star className="w-2.5 h-2.5 mr-0.5" /> PRO
          </Badge>
        )}
      </div>
      {hasChildren && (
        <div className="mt-1">
          {item.children!.map((child, idx) => (
            <TreeItem 
              key={`${item.id}-${child.id}-${idx}`} 
              item={child} 
              level={level + 1}
              parentColor={parentColor}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Componente para renderizar módulo
const ModuleCard = ({ module }: { module: ModuleTree }) => {
  return (
    <Card className={cn("border-2", module.bgColor)}>
      <CardHeader className="pb-2">
        <CardTitle className={cn("flex items-center gap-2 text-lg", module.color)}>
          {module.icon}
          {module.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px] pr-4">
          {module.children.map((child, idx) => (
            <div key={`${module.id}-${child.id}-${idx}`} className="mb-3">
              <TreeItem item={child} parentColor={module.color} />
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Componente principal
export const PermissionTreeDiagram = () => {
  return (
    <div className="space-y-6">
      {/* Header com legenda */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Árvore de Permissões por Módulo</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Sistema hierárquico de permissões. Usuários vinculados a empresas só podem receber permissões 
                dos módulos que a empresa contratou. Usuários sem vínculo podem receber qualquer combinação.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs">Permissão Básica</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <Star className="w-2.5 h-2.5 mr-0.5" /> PRO
                  </Badge>
                  <span className="text-xs">Exclusivo Pro Mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs">Limitado à empresa</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para Básico vs Pro */}
      <Tabs defaultValue="basico" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basico" className="gap-2">
            <Shield className="w-4 h-4" />
            Modo Básico
          </TabsTrigger>
          <TabsTrigger value="pro" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Modo Pro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basico" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {basicPermissionTree.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pro" className="mt-4">
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <p className="text-sm">
              <strong>Modo Pro</strong> inclui todas as permissões do Modo Básico, mais funcionalidades avançadas 
              como automações, relatórios completos, importações e integrações.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {proPermissionTree.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Fluxo de alocação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5" />
            Fluxo de Alocação de Permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Com empresa */}
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold text-blue-500">Usuário COM Empresa</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span>Visualiza apenas módulos da empresa</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span>Permissões limitadas ao escopo contratado</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span>Pro Mode disponível se empresa tiver</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span>Dados isolados por empresa</span>
                </div>
              </div>
            </div>

            {/* Sem empresa */}
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold text-purple-500">Usuário SEM Empresa</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span>Pode receber qualquer módulo</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span>Permissões concedidas diretamente</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span>Pro Mode concedido individualmente</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span>Acesso global ou restrito por config</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionTreeDiagram;
