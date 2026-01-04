import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Trash2, 
  Table, 
  Columns, 
  Shield, 
  Copy, 
  Download,
  Code,
  AlertTriangle,
  CheckCircle2,
  Database,
  Link,
  Zap,
  FileText,
  Users,
  History,
  Package,
  XCircle,
  Info,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";

// Tipos
interface ColumnDefinition {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  references?: {
    table: string;
    column: string;
    onDelete: string;
  };
}

interface TableDefinition {
  id: string;
  name: string;
  columns: ColumnDefinition[];
  enableRLS: boolean;
  policies: PolicyDefinition[];
}

interface PolicyDefinition {
  id: string;
  name: string;
  command: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "ALL";
  using: string;
  withCheck: string;
}

interface AlterOperation {
  id: string;
  type: "add_column" | "drop_column" | "alter_column" | "rename_column" | "add_constraint" | "drop_constraint";
  table: string;
  details: Record<string, string>;
}

interface ValidationIssue {
  type: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
  table?: string;
  column?: string;
}

interface MigrationTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "basic" | "relationship" | "audit" | "business";
  generate: () => TableDefinition;
}

const POSTGRES_TYPES = [
  "uuid", "text", "varchar(255)", "integer", "bigint", "numeric", "decimal(10,2)",
  "boolean", "date", "timestamp with time zone", "time", "jsonb", "json",
  "text[]", "integer[]", "uuid[]"
];

const EXISTING_TABLES = [
  "profiles", "empresas", "user_empresas", "user_roles", "user_permissions",
  "tarefas", "atividades", "transacoes", "categorias_financeiras", "centros_custo",
  "contas_bancarias", "produtos", "clientes", "fornecedores", "vendas", "compras",
  "orcamentos_servico", "recorrencias", "metas_financeiras", "audit_logs",
  "permission_profiles", "permission_profile_items", "venda_itens", "compra_itens"
];

const RESERVED_WORDS = [
  "user", "order", "group", "table", "select", "insert", "update", "delete",
  "where", "from", "join", "index", "key", "primary", "foreign", "constraint"
];

// Templates pré-definidos
const createTemplates = (): MigrationTemplate[] => [
  {
    id: "user_owned",
    name: "Tabela com User ID",
    description: "Tabela vinculada a usuários com RLS por user_id",
    icon: <Users className="h-4 w-4" />,
    category: "basic",
    generate: () => ({
      id: crypto.randomUUID(),
      name: "user_items",
      columns: [
        { id: crypto.randomUUID(), name: "id", type: "uuid", nullable: false, defaultValue: "gen_random_uuid()", isPrimaryKey: true, isUnique: false },
        { id: crypto.randomUUID(), name: "user_id", type: "uuid", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false, references: { table: "profiles", column: "id", onDelete: "CASCADE" } },
        { id: crypto.randomUUID(), name: "nome", type: "text", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "descricao", type: "text", nullable: true, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "ativo", type: "boolean", nullable: false, defaultValue: "true", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "created_at", type: "timestamp with time zone", nullable: false, defaultValue: "now()", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "updated_at", type: "timestamp with time zone", nullable: false, defaultValue: "now()", isPrimaryKey: false, isUnique: false }
      ],
      enableRLS: true,
      policies: [
        { id: crypto.randomUUID(), name: "Users can view own records", command: "SELECT", using: "auth.uid() = user_id", withCheck: "" },
        { id: crypto.randomUUID(), name: "Users can create own records", command: "INSERT", using: "", withCheck: "auth.uid() = user_id" },
        { id: crypto.randomUUID(), name: "Users can update own records", command: "UPDATE", using: "auth.uid() = user_id", withCheck: "auth.uid() = user_id" },
        { id: crypto.randomUUID(), name: "Users can delete own records", command: "DELETE", using: "auth.uid() = user_id", withCheck: "" }
      ]
    })
  },
  {
    id: "empresa_owned",
    name: "Tabela com Empresa ID",
    description: "Tabela vinculada a empresas com RLS usando has_empresa_access",
    icon: <Package className="h-4 w-4" />,
    category: "basic",
    generate: () => ({
      id: crypto.randomUUID(),
      name: "empresa_items",
      columns: [
        { id: crypto.randomUUID(), name: "id", type: "uuid", nullable: false, defaultValue: "gen_random_uuid()", isPrimaryKey: true, isUnique: false },
        { id: crypto.randomUUID(), name: "empresa_id", type: "uuid", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false, references: { table: "empresas", column: "id", onDelete: "CASCADE" } },
        { id: crypto.randomUUID(), name: "nome", type: "text", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "descricao", type: "text", nullable: true, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "ativo", type: "boolean", nullable: false, defaultValue: "true", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "created_at", type: "timestamp with time zone", nullable: false, defaultValue: "now()", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "updated_at", type: "timestamp with time zone", nullable: false, defaultValue: "now()", isPrimaryKey: false, isUnique: false }
      ],
      enableRLS: true,
      policies: [
        { id: crypto.randomUUID(), name: "Users can view records of their empresas", command: "SELECT", using: "is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)", withCheck: "" },
        { id: crypto.randomUUID(), name: "Users can create records in their empresas", command: "INSERT", using: "", withCheck: "is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)" },
        { id: crypto.randomUUID(), name: "Users can update records in their empresas", command: "UPDATE", using: "is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)", withCheck: "" },
        { id: crypto.randomUUID(), name: "Users can delete records in their empresas", command: "DELETE", using: "is_admin(auth.uid()) OR has_empresa_access(auth.uid(), empresa_id)", withCheck: "" }
      ]
    })
  },
  {
    id: "n_to_n",
    name: "Tabela N:N (Relacionamento)",
    description: "Tabela de junção para relacionamento muitos-para-muitos",
    icon: <Link className="h-4 w-4" />,
    category: "relationship",
    generate: () => ({
      id: crypto.randomUUID(),
      name: "item_tags",
      columns: [
        { id: crypto.randomUUID(), name: "id", type: "uuid", nullable: false, defaultValue: "gen_random_uuid()", isPrimaryKey: true, isUnique: false },
        { id: crypto.randomUUID(), name: "item_id", type: "uuid", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "tag_id", type: "uuid", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "created_at", type: "timestamp with time zone", nullable: false, defaultValue: "now()", isPrimaryKey: false, isUnique: false }
      ],
      enableRLS: true,
      policies: [
        { id: crypto.randomUUID(), name: "Authenticated users can view", command: "SELECT", using: "auth.uid() IS NOT NULL", withCheck: "" },
        { id: crypto.randomUUID(), name: "Authenticated users can manage", command: "ALL", using: "auth.uid() IS NOT NULL", withCheck: "auth.uid() IS NOT NULL" }
      ]
    })
  },
  {
    id: "audit_log",
    name: "Tabela de Auditoria",
    description: "Registro de alterações e ações do sistema",
    icon: <History className="h-4 w-4" />,
    category: "audit",
    generate: () => ({
      id: crypto.randomUUID(),
      name: "custom_audit_logs",
      columns: [
        { id: crypto.randomUUID(), name: "id", type: "uuid", nullable: false, defaultValue: "gen_random_uuid()", isPrimaryKey: true, isUnique: false },
        { id: crypto.randomUUID(), name: "user_id", type: "uuid", nullable: true, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "action", type: "text", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "entity_type", type: "text", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "entity_id", type: "uuid", nullable: true, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "old_data", type: "jsonb", nullable: true, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "new_data", type: "jsonb", nullable: true, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "ip_address", type: "text", nullable: true, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "user_agent", type: "text", nullable: true, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "created_at", type: "timestamp with time zone", nullable: false, defaultValue: "now()", isPrimaryKey: false, isUnique: false }
      ],
      enableRLS: true,
      policies: [
        { id: crypto.randomUUID(), name: "Admins can view audit logs", command: "SELECT", using: "is_admin(auth.uid())", withCheck: "" },
        { id: crypto.randomUUID(), name: "System can insert logs", command: "INSERT", using: "", withCheck: "true" }
      ]
    })
  },
  {
    id: "lookup_table",
    name: "Tabela de Lookup/Referência",
    description: "Tabela simples para valores de referência (status, tipos, etc)",
    icon: <FileText className="h-4 w-4" />,
    category: "basic",
    generate: () => ({
      id: crypto.randomUUID(),
      name: "status_types",
      columns: [
        { id: crypto.randomUUID(), name: "id", type: "uuid", nullable: false, defaultValue: "gen_random_uuid()", isPrimaryKey: true, isUnique: false },
        { id: crypto.randomUUID(), name: "codigo", type: "text", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: true },
        { id: crypto.randomUUID(), name: "nome", type: "text", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "descricao", type: "text", nullable: true, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "cor", type: "text", nullable: true, defaultValue: "'#6b7280'", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "ordem", type: "integer", nullable: true, defaultValue: "0", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "ativo", type: "boolean", nullable: false, defaultValue: "true", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "created_at", type: "timestamp with time zone", nullable: false, defaultValue: "now()", isPrimaryKey: false, isUnique: false }
      ],
      enableRLS: true,
      policies: [
        { id: crypto.randomUUID(), name: "Everyone can view", command: "SELECT", using: "true", withCheck: "" },
        { id: crypto.randomUUID(), name: "Only admins can manage", command: "ALL", using: "is_admin(auth.uid())", withCheck: "is_admin(auth.uid())" }
      ]
    })
  },
  {
    id: "itens_pedido",
    name: "Itens de Pedido",
    description: "Tabela para itens de pedidos/vendas/compras",
    icon: <Package className="h-4 w-4" />,
    category: "business",
    generate: () => ({
      id: crypto.randomUUID(),
      name: "pedido_itens",
      columns: [
        { id: crypto.randomUUID(), name: "id", type: "uuid", nullable: false, defaultValue: "gen_random_uuid()", isPrimaryKey: true, isUnique: false },
        { id: crypto.randomUUID(), name: "pedido_id", type: "uuid", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "produto_id", type: "uuid", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false, references: { table: "produtos", column: "id", onDelete: "RESTRICT" } },
        { id: crypto.randomUUID(), name: "quantidade", type: "numeric", nullable: false, defaultValue: "1", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "preco_unitario", type: "numeric", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "desconto_percentual", type: "numeric", nullable: true, defaultValue: "0", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "desconto_valor", type: "numeric", nullable: true, defaultValue: "0", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "total", type: "numeric", nullable: false, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "observacao", type: "text", nullable: true, defaultValue: "", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "created_at", type: "timestamp with time zone", nullable: false, defaultValue: "now()", isPrimaryKey: false, isUnique: false }
      ],
      enableRLS: true,
      policies: [
        { id: crypto.randomUUID(), name: "View through parent", command: "SELECT", using: "EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_id AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), p.empresa_id)))", withCheck: "" },
        { id: crypto.randomUUID(), name: "Manage through parent", command: "ALL", using: "EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_id AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), p.empresa_id)))", withCheck: "EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_id AND (is_admin(auth.uid()) OR has_empresa_access(auth.uid(), p.empresa_id)))" }
      ]
    })
  }
];

export default function MigrationGenerator() {
  const [activeTab, setActiveTab] = useState("templates");
  const [newTables, setNewTables] = useState<TableDefinition[]>([]);
  const [alterOperations, setAlterOperations] = useState<AlterOperation[]>([]);
  const [generatedSQL, setGeneratedSQL] = useState("");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  const templates = useMemo(() => createTemplates(), []);

  // Validar schema
  const validateSchema = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Validar novas tabelas
    newTables.forEach(table => {
      // Nome da tabela
      if (!table.name) {
        issues.push({ type: "error", message: "Tabela sem nome definido", table: table.id });
      } else {
        // Conflito com tabela existente
        if (EXISTING_TABLES.includes(table.name.toLowerCase())) {
          issues.push({ 
            type: "error", 
            message: `Tabela "${table.name}" já existe no banco de dados`,
            suggestion: `Renomeie para "${table.name}_v2" ou escolha outro nome`,
            table: table.name 
          });
        }

        // Palavras reservadas
        if (RESERVED_WORDS.includes(table.name.toLowerCase())) {
          issues.push({ 
            type: "error", 
            message: `"${table.name}" é uma palavra reservada do PostgreSQL`,
            suggestion: `Renomeie para "${table.name}s" ou "tbl_${table.name}"`,
            table: table.name 
          });
        }

        // Naming convention
        if (table.name !== table.name.toLowerCase()) {
          issues.push({ 
            type: "warning", 
            message: `Nome da tabela "${table.name}" deve ser em snake_case`,
            suggestion: `Use "${table.name.toLowerCase().replace(/\s+/g, '_')}"`,
            table: table.name 
          });
        }
      }

      // Validar colunas
      const columnNames = new Set<string>();
      table.columns.forEach(col => {
        if (!col.name) {
          issues.push({ type: "error", message: "Coluna sem nome", table: table.name });
        } else {
          // Duplicidade
          if (columnNames.has(col.name)) {
            issues.push({ 
              type: "error", 
              message: `Coluna "${col.name}" duplicada na tabela "${table.name}"`,
              table: table.name,
              column: col.name
            });
          }
          columnNames.add(col.name);

          // Palavras reservadas
          if (RESERVED_WORDS.includes(col.name.toLowerCase())) {
            issues.push({ 
              type: "warning", 
              message: `"${col.name}" é uma palavra reservada`,
              suggestion: `Considere usar "${col.name}_value" ou "${col.name}_id"`,
              table: table.name,
              column: col.name
            });
          }
        }

        // FK para tabela inexistente
        if (col.references && !EXISTING_TABLES.includes(col.references.table) && !newTables.some(t => t.name === col.references?.table)) {
          issues.push({ 
            type: "error", 
            message: `FK referencia tabela inexistente "${col.references.table}"`,
            suggestion: `Crie a tabela "${col.references.table}" primeiro ou escolha outra tabela`,
            table: table.name,
            column: col.name
          });
        }

        // NOT NULL sem default
        if (!col.nullable && !col.defaultValue && !col.isPrimaryKey) {
          issues.push({ 
            type: "warning", 
            message: `Coluna "${col.name}" é NOT NULL mas não tem default`,
            suggestion: `Adicione um valor default ou torne nullable`,
            table: table.name,
            column: col.name
          });
        }
      });

      // Validar primary key
      const hasPK = table.columns.some(c => c.isPrimaryKey);
      if (!hasPK) {
        issues.push({ 
          type: "error", 
          message: `Tabela "${table.name}" não tem primary key`,
          suggestion: `Adicione uma coluna id com PRIMARY KEY`,
          table: table.name 
        });
      }

      // RLS sem policies
      if (table.enableRLS && table.policies.length === 0) {
        issues.push({ 
          type: "warning", 
          message: `RLS habilitado mas sem policies em "${table.name}"`,
          suggestion: `Adicione pelo menos uma policy para SELECT`,
          table: table.name 
        });
      }

      // Policies sem nome
      table.policies.forEach(policy => {
        if (!policy.name) {
          issues.push({ type: "error", message: `Policy sem nome na tabela "${table.name}"`, table: table.name });
        }
        if (!policy.using && !policy.withCheck) {
          issues.push({ 
            type: "error", 
            message: `Policy "${policy.name}" sem condição USING ou WITH CHECK`,
            table: table.name 
          });
        }
      });

      // Boas práticas
      const hasCreatedAt = table.columns.some(c => c.name === "created_at");
      const hasUpdatedAt = table.columns.some(c => c.name === "updated_at");
      if (!hasCreatedAt) {
        issues.push({ 
          type: "info", 
          message: `Considere adicionar "created_at" em "${table.name}"`,
          suggestion: `Adicione: created_at timestamp with time zone NOT NULL DEFAULT now()`,
          table: table.name 
        });
      }
      if (hasCreatedAt && !hasUpdatedAt) {
        issues.push({ 
          type: "info", 
          message: `Considere adicionar "updated_at" em "${table.name}"`,
          suggestion: `Adicione: updated_at timestamp with time zone NOT NULL DEFAULT now()`,
          table: table.name 
        });
      }
    });

    // Validar operações de alteração
    alterOperations.forEach(op => {
      if (!op.table) {
        issues.push({ type: "error", message: "Operação sem tabela selecionada" });
      } else if (!EXISTING_TABLES.includes(op.table)) {
        issues.push({ 
          type: "error", 
          message: `Tabela "${op.table}" não existe no banco`,
          suggestion: `Crie a tabela primeiro na aba "Criar Tabelas"`,
          table: op.table
        });
      }

      if (op.type === "add_column" && !op.details.columnName) {
        issues.push({ type: "error", message: "ADD COLUMN sem nome da coluna", table: op.table });
      }
      if (op.type === "drop_column" && !op.details.columnName) {
        issues.push({ type: "error", message: "DROP COLUMN sem nome da coluna", table: op.table });
      }
    });

    return issues;
  };

  // Aplicar template
  const applyTemplate = (template: MigrationTemplate) => {
    const newTable = template.generate();
    setNewTables([...newTables, newTable]);
    setActiveTab("create");
    toast.success(`Template "${template.name}" aplicado!`);
  };

  // Adicionar nova tabela vazia
  const addNewTable = () => {
    const newTable: TableDefinition = {
      id: crypto.randomUUID(),
      name: "",
      columns: [
        { id: crypto.randomUUID(), name: "id", type: "uuid", nullable: false, defaultValue: "gen_random_uuid()", isPrimaryKey: true, isUnique: false },
        { id: crypto.randomUUID(), name: "created_at", type: "timestamp with time zone", nullable: false, defaultValue: "now()", isPrimaryKey: false, isUnique: false },
        { id: crypto.randomUUID(), name: "updated_at", type: "timestamp with time zone", nullable: false, defaultValue: "now()", isPrimaryKey: false, isUnique: false }
      ],
      enableRLS: true,
      policies: []
    };
    setNewTables([...newTables, newTable]);
  };

  // Adicionar coluna a uma tabela
  const addColumnToTable = (tableId: string) => {
    setNewTables(tables => tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          columns: [...t.columns, {
            id: crypto.randomUUID(),
            name: "",
            type: "text",
            nullable: true,
            defaultValue: "",
            isPrimaryKey: false,
            isUnique: false
          }]
        };
      }
      return t;
    }));
  };

  // Atualizar coluna
  const updateColumn = (tableId: string, columnId: string, field: keyof ColumnDefinition, value: any) => {
    setNewTables(tables => tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          columns: t.columns.map(c => 
            c.id === columnId ? { ...c, [field]: value } : c
          )
        };
      }
      return t;
    }));
  };

  // Remover coluna
  const removeColumn = (tableId: string, columnId: string) => {
    setNewTables(tables => tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          columns: t.columns.filter(c => c.id !== columnId)
        };
      }
      return t;
    }));
  };

  // Adicionar policy
  const addPolicy = (tableId: string) => {
    setNewTables(tables => tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          policies: [...t.policies, {
            id: crypto.randomUUID(),
            name: "",
            command: "SELECT",
            using: "auth.uid() IS NOT NULL",
            withCheck: ""
          }]
        };
      }
      return t;
    }));
  };

  // Adicionar operação de alteração
  const addAlterOperation = (type: AlterOperation["type"]) => {
    setAlterOperations([...alterOperations, {
      id: crypto.randomUUID(),
      type,
      table: "",
      details: {}
    }]);
  };

  // Gerar SQL para CREATE TABLE
  const generateCreateTableSQL = (table: TableDefinition): string => {
    if (!table.name) return "";

    const lines: string[] = [];
    
    lines.push(`-- Criar tabela ${table.name}`);
    lines.push(`CREATE TABLE public.${table.name} (`);
    
    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      if (!col.nullable) def += " NOT NULL";
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      if (col.isPrimaryKey) def += " PRIMARY KEY";
      if (col.isUnique && !col.isPrimaryKey) def += " UNIQUE";
      return def;
    });
    
    const fkDefs = table.columns
      .filter(col => col.references)
      .map(col => `  CONSTRAINT fk_${table.name}_${col.name} FOREIGN KEY (${col.name}) REFERENCES public.${col.references!.table}(${col.references!.column}) ON DELETE ${col.references!.onDelete}`);
    
    lines.push([...columnDefs, ...fkDefs].join(",\n"));
    lines.push(");");
    lines.push("");

    if (table.enableRLS) {
      lines.push(`-- Habilitar RLS`);
      lines.push(`ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;`);
      lines.push("");
    }

    if (table.policies.length > 0) {
      lines.push(`-- Políticas RLS`);
      table.policies.forEach(policy => {
        if (!policy.name) return;
        lines.push(`CREATE POLICY "${policy.name}"`);
        lines.push(`ON public.${table.name}`);
        lines.push(`FOR ${policy.command}`);
        if (policy.using) lines.push(`USING (${policy.using})`);
        if (policy.withCheck && ["INSERT", "UPDATE", "ALL"].includes(policy.command)) {
          lines.push(`WITH CHECK (${policy.withCheck})`);
        }
        lines.push(";");
        lines.push("");
      });
    }

    if (table.columns.some(c => c.name === "updated_at")) {
      lines.push(`-- Trigger para updated_at`);
      lines.push(`CREATE TRIGGER update_${table.name}_updated_at`);
      lines.push(`BEFORE UPDATE ON public.${table.name}`);
      lines.push(`FOR EACH ROW`);
      lines.push(`EXECUTE FUNCTION public.update_updated_at_column();`);
      lines.push("");
    }

    return lines.join("\n");
  };

  // Gerar SQL para ALTER TABLE
  const generateAlterSQL = (op: AlterOperation): string => {
    if (!op.table) return "";
    
    const lines: string[] = [];
    
    switch (op.type) {
      case "add_column":
        if (op.details.columnName && op.details.columnType) {
          lines.push(`-- Adicionar coluna ${op.details.columnName} em ${op.table}`);
          let sql = `ALTER TABLE public.${op.table} ADD COLUMN ${op.details.columnName} ${op.details.columnType}`;
          if (op.details.nullable === "false") sql += " NOT NULL";
          if (op.details.defaultValue) sql += ` DEFAULT ${op.details.defaultValue}`;
          lines.push(sql + ";");
        }
        break;
        
      case "drop_column":
        if (op.details.columnName) {
          lines.push(`-- Remover coluna ${op.details.columnName} de ${op.table}`);
          lines.push(`ALTER TABLE public.${op.table} DROP COLUMN ${op.details.columnName};`);
        }
        break;
        
      case "alter_column":
        if (op.details.columnName) {
          lines.push(`-- Alterar coluna ${op.details.columnName} em ${op.table}`);
          if (op.details.newType) {
            lines.push(`ALTER TABLE public.${op.table} ALTER COLUMN ${op.details.columnName} TYPE ${op.details.newType};`);
          }
          if (op.details.setNotNull === "true") {
            lines.push(`ALTER TABLE public.${op.table} ALTER COLUMN ${op.details.columnName} SET NOT NULL;`);
          }
          if (op.details.dropNotNull === "true") {
            lines.push(`ALTER TABLE public.${op.table} ALTER COLUMN ${op.details.columnName} DROP NOT NULL;`);
          }
          if (op.details.setDefault) {
            lines.push(`ALTER TABLE public.${op.table} ALTER COLUMN ${op.details.columnName} SET DEFAULT ${op.details.setDefault};`);
          }
        }
        break;
        
      case "rename_column":
        if (op.details.oldName && op.details.newName) {
          lines.push(`-- Renomear coluna ${op.details.oldName} para ${op.details.newName}`);
          lines.push(`ALTER TABLE public.${op.table} RENAME COLUMN ${op.details.oldName} TO ${op.details.newName};`);
        }
        break;
        
      case "add_constraint":
        if (op.details.constraintName && op.details.constraintType) {
          lines.push(`-- Adicionar constraint ${op.details.constraintName}`);
          if (op.details.constraintType === "foreign_key" && op.details.column && op.details.refTable && op.details.refColumn) {
            lines.push(`ALTER TABLE public.${op.table} ADD CONSTRAINT ${op.details.constraintName}`);
            lines.push(`  FOREIGN KEY (${op.details.column}) REFERENCES public.${op.details.refTable}(${op.details.refColumn})`);
            lines.push(`  ON DELETE ${op.details.onDelete || "CASCADE"};`);
          } else if (op.details.constraintType === "unique" && op.details.columns) {
            lines.push(`ALTER TABLE public.${op.table} ADD CONSTRAINT ${op.details.constraintName} UNIQUE (${op.details.columns});`);
          } else if (op.details.constraintType === "check" && op.details.expression) {
            lines.push(`ALTER TABLE public.${op.table} ADD CONSTRAINT ${op.details.constraintName} CHECK (${op.details.expression});`);
          }
        }
        break;
        
      case "drop_constraint":
        if (op.details.constraintName) {
          lines.push(`-- Remover constraint ${op.details.constraintName}`);
          lines.push(`ALTER TABLE public.${op.table} DROP CONSTRAINT ${op.details.constraintName};`);
        }
        break;
    }
    
    return lines.join("\n");
  };

  // Gerar todo o SQL
  const generateAllSQL = () => {
    // Validar primeiro
    const issues = validateSchema();
    setValidationIssues(issues);

    const hasErrors = issues.some(i => i.type === "error");
    if (hasErrors) {
      toast.error("Corrija os erros antes de gerar o SQL");
      setActiveTab("preview");
      return;
    }

    const parts: string[] = [];
    
    parts.push("-- Migration gerada automaticamente");
    parts.push(`-- Data: ${new Date().toISOString()}`);
    parts.push("");

    if (newTables.length > 0) {
      parts.push("-- ========================================");
      parts.push("-- CRIAR NOVAS TABELAS");
      parts.push("-- ========================================");
      parts.push("");
      newTables.forEach(table => {
        const sql = generateCreateTableSQL(table);
        if (sql) parts.push(sql);
      });
    }

    if (alterOperations.length > 0) {
      parts.push("-- ========================================");
      parts.push("-- ALTERAÇÕES EM TABELAS EXISTENTES");
      parts.push("-- ========================================");
      parts.push("");
      alterOperations.forEach(op => {
        const sql = generateAlterSQL(op);
        if (sql) parts.push(sql + "\n");
      });
    }

    const finalSQL = parts.join("\n");
    setGeneratedSQL(finalSQL);
    setActiveTab("preview");
    toast.success("SQL gerado com sucesso!");
    return finalSQL;
  };

  const copySQL = () => {
    navigator.clipboard.writeText(generatedSQL);
    toast.success("SQL copiado para a área de transferência!");
  };

  const downloadSQL = () => {
    const blob = new Blob([generatedSQL], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `migration_${new Date().toISOString().split("T")[0]}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo SQL baixado!");
  };

  const errorCount = validationIssues.filter(i => i.type === "error").length;
  const warningCount = validationIssues.filter(i => i.type === "warning").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Gerador de Migrations</h3>
          {(newTables.length > 0 || alterOperations.length > 0) && (
            <Badge variant="outline">{newTables.length} tabelas, {alterOperations.length} alterações</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={generateAllSQL} className="gap-2">
            <Zap className="h-4 w-4" />
            Gerar SQL
          </Button>
          {generatedSQL && (
            <>
              <Button variant="outline" onClick={copySQL} className="gap-2">
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
              <Button variant="outline" onClick={downloadSQL} className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2">
            <Table className="h-4 w-4" />
            Criar Tabelas
            {newTables.length > 0 && <Badge variant="secondary" className="ml-1">{newTables.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="alter" className="gap-2">
            <Columns className="h-4 w-4" />
            Alterar Tabelas
            {alterOperations.length > 0 && <Badge variant="secondary" className="ml-1">{alterOperations.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Code className="h-4 w-4" />
            Preview
            {errorCount > 0 && <Badge variant="destructive" className="ml-1">{errorCount}</Badge>}
            {errorCount === 0 && warningCount > 0 && <Badge variant="outline" className="ml-1 text-amber-500">{warningCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use templates pré-definidos para criar tabelas rapidamente seguindo as melhores práticas
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => applyTemplate(template)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {template.icon}
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                  <Badge variant="outline" className="text-xs">{template.category}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center pt-4 border-t">
            <Button variant="outline" onClick={addNewTable} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Tabela em Branco
            </Button>
          </div>
        </TabsContent>

        {/* Create Tables Tab */}
        <TabsContent value="create" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Defina novas tabelas com colunas, constraints e políticas RLS
            </p>
            <Button onClick={addNewTable} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Tabela
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
              {newTables.map((table, tableIndex) => (
                <Card key={table.id} className="border-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Badge variant="secondary">Tabela {tableIndex + 1}</Badge>
                        <Input
                          placeholder="nome_da_tabela"
                          value={table.name}
                          onChange={(e) => setNewTables(tables => 
                            tables.map(t => t.id === table.id ? {...t, name: e.target.value} : t)
                          )}
                          className="max-w-xs font-mono"
                        />
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`rls-${table.id}`}
                            checked={table.enableRLS}
                            onCheckedChange={(checked) => setNewTables(tables =>
                              tables.map(t => t.id === table.id ? {...t, enableRLS: !!checked} : t)
                            )}
                          />
                          <Label htmlFor={`rls-${table.id}`} className="text-sm">RLS</Label>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setNewTables(tables => tables.filter(t => t.id !== table.id))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Colunas */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Columns className="h-4 w-4" />
                          Colunas ({table.columns.length})
                        </Label>
                        <Button size="sm" variant="outline" onClick={() => addColumnToTable(table.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Coluna
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {table.columns.map((col) => (
                          <div key={col.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            <Input
                              placeholder="nome"
                              value={col.name}
                              onChange={(e) => updateColumn(table.id, col.id, "name", e.target.value)}
                              className="w-28 font-mono text-sm"
                            />
                            <Select value={col.type} onValueChange={(v) => updateColumn(table.id, col.id, "type", v)}>
                              <SelectTrigger className="w-44">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {POSTGRES_TYPES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1">
                              <Checkbox checked={!col.nullable} onCheckedChange={(c) => updateColumn(table.id, col.id, "nullable", !c)} />
                              <span className="text-xs">NOT NULL</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Checkbox checked={col.isPrimaryKey} onCheckedChange={(c) => updateColumn(table.id, col.id, "isPrimaryKey", !!c)} />
                              <span className="text-xs">PK</span>
                            </div>
                            <Input
                              placeholder="default"
                              value={col.defaultValue}
                              onChange={(e) => updateColumn(table.id, col.id, "defaultValue", e.target.value)}
                              className="w-28 font-mono text-xs"
                            />
                            <Select
                              value={col.references?.table || "none"}
                              onValueChange={(v) => {
                                if (v === "none") {
                                  updateColumn(table.id, col.id, "references", undefined);
                                } else {
                                  updateColumn(table.id, col.id, "references", { table: v, column: "id", onDelete: "CASCADE" });
                                }
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="FK →" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem FK</SelectItem>
                                {EXISTING_TABLES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeColumn(table.id, col.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Policies */}
                    {table.enableRLS && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Políticas RLS ({table.policies.length})
                          </Label>
                          <Button size="sm" variant="outline" onClick={() => addPolicy(table.id)}>
                            <Plus className="h-3 w-3 mr-1" />
                            Policy
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {table.policies.map((policy) => (
                            <div key={policy.id} className="p-2 bg-muted/50 rounded-lg space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Nome da policy"
                                  value={policy.name}
                                  onChange={(e) => setNewTables(tables => tables.map(t => {
                                    if (t.id === table.id) {
                                      return { ...t, policies: t.policies.map(p => p.id === policy.id ? {...p, name: e.target.value} : p) };
                                    }
                                    return t;
                                  }))}
                                  className="flex-1"
                                />
                                <Select
                                  value={policy.command}
                                  onValueChange={(v: PolicyDefinition["command"]) => setNewTables(tables => tables.map(t => {
                                    if (t.id === table.id) {
                                      return { ...t, policies: t.policies.map(p => p.id === policy.id ? {...p, command: v} : p) };
                                    }
                                    return t;
                                  }))}
                                >
                                  <SelectTrigger className="w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SELECT">SELECT</SelectItem>
                                    <SelectItem value="INSERT">INSERT</SelectItem>
                                    <SelectItem value="UPDATE">UPDATE</SelectItem>
                                    <SelectItem value="DELETE">DELETE</SelectItem>
                                    <SelectItem value="ALL">ALL</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" onClick={() => setNewTables(tables => tables.map(t => {
                                  if (t.id === table.id) {
                                    return {...t, policies: t.policies.filter(p => p.id !== policy.id)};
                                  }
                                  return t;
                                }))}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">USING</Label>
                                  <Input
                                    placeholder="auth.uid() = user_id"
                                    value={policy.using}
                                    onChange={(e) => setNewTables(tables => tables.map(t => {
                                      if (t.id === table.id) {
                                        return { ...t, policies: t.policies.map(p => p.id === policy.id ? {...p, using: e.target.value} : p) };
                                      }
                                      return t;
                                    }))}
                                    className="font-mono text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">WITH CHECK</Label>
                                  <Input
                                    placeholder="auth.uid() = user_id"
                                    value={policy.withCheck}
                                    onChange={(e) => setNewTables(tables => tables.map(t => {
                                      if (t.id === table.id) {
                                        return { ...t, policies: t.policies.map(p => p.id === policy.id ? {...p, withCheck: e.target.value} : p) };
                                      }
                                      return t;
                                    }))}
                                    className="font-mono text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {newTables.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tabela definida</p>
                  <p className="text-sm">Use um template ou clique em "Nova Tabela"</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Alter Tables Tab */}
        <TabsContent value="alter" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Defina alterações em tabelas existentes</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addAlterOperation("add_column")}>
                <Plus className="h-3 w-3 mr-1" />Add Coluna
              </Button>
              <Button variant="outline" size="sm" onClick={() => addAlterOperation("drop_column")}>
                <Trash2 className="h-3 w-3 mr-1" />Drop Coluna
              </Button>
              <Button variant="outline" size="sm" onClick={() => addAlterOperation("alter_column")}>
                <Columns className="h-3 w-3 mr-1" />Alterar
              </Button>
              <Button variant="outline" size="sm" onClick={() => addAlterOperation("add_constraint")}>
                <Link className="h-3 w-3 mr-1" />Constraint
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {alterOperations.map((op) => (
                <Card key={op.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <Badge variant={op.type === "add_column" ? "default" : op.type === "drop_column" ? "destructive" : "secondary"}>
                        {op.type.replace("_", " ").toUpperCase()}
                      </Badge>
                      
                      <Select value={op.table} onValueChange={(v) => setAlterOperations(ops => ops.map(o => o.id === op.id ? {...o, table: v} : o))}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Selecionar tabela" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXISTING_TABLES.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {op.type === "add_column" && (
                          <>
                            <Input placeholder="Nome da coluna" value={op.details.columnName || ""} onChange={(e) => setAlterOperations(ops => ops.map(o => o.id === op.id ? {...o, details: {...o.details, columnName: e.target.value}} : o))} />
                            <Select value={op.details.columnType || "text"} onValueChange={(v) => setAlterOperations(ops => ops.map(o => o.id === op.id ? {...o, details: {...o.details, columnType: v}} : o))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{POSTGRES_TYPES.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                            </Select>
                            <Input placeholder="Default value" value={op.details.defaultValue || ""} onChange={(e) => setAlterOperations(ops => ops.map(o => o.id === op.id ? {...o, details: {...o.details, defaultValue: e.target.value}} : o))} />
                            <Select value={op.details.nullable || "true"} onValueChange={(v) => setAlterOperations(ops => ops.map(o => o.id === op.id ? {...o, details: {...o.details, nullable: v}} : o))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Nullable</SelectItem>
                                <SelectItem value="false">NOT NULL</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        )}
                        {op.type === "drop_column" && (
                          <Input placeholder="Nome da coluna" value={op.details.columnName || ""} onChange={(e) => setAlterOperations(ops => ops.map(o => o.id === op.id ? {...o, details: {...o.details, columnName: e.target.value}} : o))} />
                        )}
                        {op.type === "alter_column" && (
                          <>
                            <Input placeholder="Nome da coluna" value={op.details.columnName || ""} onChange={(e) => setAlterOperations(ops => ops.map(o => o.id === op.id ? {...o, details: {...o.details, columnName: e.target.value}} : o))} />
                            <Select value={op.details.newType || ""} onValueChange={(v) => setAlterOperations(ops => ops.map(o => o.id === op.id ? {...o, details: {...o.details, newType: v}} : o))}>
                              <SelectTrigger><SelectValue placeholder="Novo tipo" /></SelectTrigger>
                              <SelectContent>{POSTGRES_TYPES.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                            </Select>
                          </>
                        )}
                        {op.type === "add_constraint" && (
                          <>
                            <Input placeholder="Nome do constraint" value={op.details.constraintName || ""} onChange={(e) => setAlterOperations(ops => ops.map(o => o.id === op.id ? {...o, details: {...o.details, constraintName: e.target.value}} : o))} />
                            <Select value={op.details.constraintType || "foreign_key"} onValueChange={(v) => setAlterOperations(ops => ops.map(o => o.id === op.id ? {...o, details: {...o.details, constraintType: v}} : o))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="foreign_key">Foreign Key</SelectItem>
                                <SelectItem value="unique">Unique</SelectItem>
                                <SelectItem value="check">Check</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        )}
                      </div>

                      <Button variant="ghost" size="icon" onClick={() => setAlterOperations(ops => ops.filter(o => o.id !== op.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {alterOperations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Columns className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma alteração definida</p>
                  <p className="text-sm">Use os botões acima para adicionar operações</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {/* Validation Issues */}
          {validationIssues.length > 0 && (
            <Card className={errorCount > 0 ? "border-destructive" : warningCount > 0 ? "border-amber-500" : "border-blue-500"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {errorCount > 0 ? <XCircle className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  Validação ({errorCount} erros, {warningCount} avisos)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {validationIssues.map((issue, i) => (
                      <div key={i} className={`p-2 rounded text-sm flex items-start gap-2 ${
                        issue.type === "error" ? "bg-destructive/10 text-destructive" :
                        issue.type === "warning" ? "bg-amber-500/10 text-amber-700" :
                        "bg-blue-500/10 text-blue-700"
                      }`}>
                        {issue.type === "error" ? <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> :
                         issue.type === "warning" ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> :
                         <Info className="h-4 w-4 mt-0.5 shrink-0" />}
                        <div>
                          <p>{issue.message}</p>
                          {issue.suggestion && (
                            <p className="text-xs opacity-80 mt-1">💡 {issue.suggestion}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Generated SQL */}
          {generatedSQL ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">SQL gerado com sucesso</span>
                <Badge variant="outline">{generatedSQL.split("\n").length} linhas</Badge>
              </div>
              <Card className="bg-muted/50">
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <pre className="p-4 text-sm font-mono whitespace-pre-wrap">{generatedSQL}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Revise o SQL antes de executar. Migrations são irreversíveis.</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum SQL gerado ainda</p>
              <p className="text-sm">Defina tabelas ou alterações e clique em "Gerar SQL"</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
