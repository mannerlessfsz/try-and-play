import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Trash2, 
  Table, 
  Columns, 
  Key, 
  Shield, 
  Copy, 
  Download,
  Code,
  AlertTriangle,
  CheckCircle2,
  Database,
  Link,
  Zap
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

const POSTGRES_TYPES = [
  "uuid", "text", "varchar(255)", "integer", "bigint", "numeric", "decimal(10,2)",
  "boolean", "date", "timestamp with time zone", "time", "jsonb", "json",
  "text[]", "integer[]", "uuid[]"
];

const EXISTING_TABLES = [
  "profiles", "empresas", "user_empresas", "user_roles", "user_permissions",
  "tarefas", "atividades", "transacoes", "categorias_financeiras", "centros_custo",
  "contas_bancarias", "produtos", "clientes", "fornecedores", "vendas", "compras",
  "orcamentos_servico", "recorrencias", "metas_financeiras", "audit_logs"
];

export default function MigrationGenerator() {
  const [activeTab, setActiveTab] = useState("create");
  const [newTables, setNewTables] = useState<TableDefinition[]>([]);
  const [alterOperations, setAlterOperations] = useState<AlterOperation[]>([]);
  const [generatedSQL, setGeneratedSQL] = useState("");

  // Adicionar nova tabela
  const addNewTable = () => {
    const newTable: TableDefinition = {
      id: crypto.randomUUID(),
      name: "",
      columns: [
        {
          id: crypto.randomUUID(),
          name: "id",
          type: "uuid",
          nullable: false,
          defaultValue: "gen_random_uuid()",
          isPrimaryKey: true,
          isUnique: false
        },
        {
          id: crypto.randomUUID(),
          name: "created_at",
          type: "timestamp with time zone",
          nullable: false,
          defaultValue: "now()",
          isPrimaryKey: false,
          isUnique: false
        },
        {
          id: crypto.randomUUID(),
          name: "updated_at",
          type: "timestamp with time zone",
          nullable: false,
          defaultValue: "now()",
          isPrimaryKey: false,
          isUnique: false
        }
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
    
    // Comentário
    lines.push(`-- Criar tabela ${table.name}`);
    lines.push(`CREATE TABLE public.${table.name} (`);
    
    // Colunas
    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      if (!col.nullable) def += " NOT NULL";
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      if (col.isPrimaryKey) def += " PRIMARY KEY";
      if (col.isUnique && !col.isPrimaryKey) def += " UNIQUE";
      return def;
    });
    
    // Foreign keys
    const fkDefs = table.columns
      .filter(col => col.references)
      .map(col => `  CONSTRAINT fk_${table.name}_${col.name} FOREIGN KEY (${col.name}) REFERENCES public.${col.references!.table}(${col.references!.column}) ON DELETE ${col.references!.onDelete}`);
    
    lines.push([...columnDefs, ...fkDefs].join(",\n"));
    lines.push(");");
    lines.push("");

    // RLS
    if (table.enableRLS) {
      lines.push(`-- Habilitar RLS`);
      lines.push(`ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;`);
      lines.push("");
    }

    // Policies
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

    // Trigger updated_at
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
    const parts: string[] = [];
    
    // Header
    parts.push("-- Migration gerada automaticamente");
    parts.push(`-- Data: ${new Date().toISOString()}`);
    parts.push("");

    // Create tables
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

    // Alter operations
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
    return finalSQL;
  };

  // Copiar SQL
  const copySQL = () => {
    navigator.clipboard.writeText(generatedSQL);
    toast.success("SQL copiado para a área de transferência!");
  };

  // Download SQL
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Gerador de Migrations</h3>
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
          <TabsTrigger value="create" className="gap-2">
            <Table className="h-4 w-4" />
            Criar Tabelas
          </TabsTrigger>
          <TabsTrigger value="alter" className="gap-2">
            <Columns className="h-4 w-4" />
            Alterar Tabelas
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Code className="h-4 w-4" />
            Preview SQL
          </TabsTrigger>
        </TabsList>

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
                          <Label htmlFor={`rls-${table.id}`} className="text-sm">
                            Habilitar RLS
                          </Label>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setNewTables(tables => tables.filter(t => t.id !== table.id))}
                      >
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
                          Colunas
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
                              className="w-32 font-mono text-sm"
                            />
                            <Select
                              value={col.type}
                              onValueChange={(v) => updateColumn(table.id, col.id, "type", v)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {POSTGRES_TYPES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1">
                              <Checkbox
                                checked={!col.nullable}
                                onCheckedChange={(c) => updateColumn(table.id, col.id, "nullable", !c)}
                              />
                              <span className="text-xs">NOT NULL</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Checkbox
                                checked={col.isPrimaryKey}
                                onCheckedChange={(c) => updateColumn(table.id, col.id, "isPrimaryKey", !!c)}
                              />
                              <span className="text-xs">PK</span>
                            </div>
                            <Input
                              placeholder="default"
                              value={col.defaultValue}
                              onChange={(e) => updateColumn(table.id, col.id, "defaultValue", e.target.value)}
                              className="w-32 font-mono text-xs"
                            />
                            <Select
                              value={col.references?.table || "none"}
                              onValueChange={(v) => {
                                if (v === "none") {
                                  updateColumn(table.id, col.id, "references", undefined);
                                } else {
                                  updateColumn(table.id, col.id, "references", {
                                    table: v,
                                    column: "id",
                                    onDelete: "CASCADE"
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder="FK →" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem FK</SelectItem>
                                {EXISTING_TABLES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeColumn(table.id, col.id)}
                            >
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
                            Políticas RLS
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
                                      return {
                                        ...t,
                                        policies: t.policies.map(p =>
                                          p.id === policy.id ? {...p, name: e.target.value} : p
                                        )
                                      };
                                    }
                                    return t;
                                  }))}
                                  className="flex-1"
                                />
                                <Select
                                  value={policy.command}
                                  onValueChange={(v: PolicyDefinition["command"]) => setNewTables(tables => tables.map(t => {
                                    if (t.id === table.id) {
                                      return {
                                        ...t,
                                        policies: t.policies.map(p =>
                                          p.id === policy.id ? {...p, command: v} : p
                                        )
                                      };
                                    }
                                    return t;
                                  }))}
                                >
                                  <SelectTrigger className="w-32">
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setNewTables(tables => tables.map(t => {
                                    if (t.id === table.id) {
                                      return {...t, policies: t.policies.filter(p => p.id !== policy.id)};
                                    }
                                    return t;
                                  }))}
                                >
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
                                        return {
                                          ...t,
                                          policies: t.policies.map(p =>
                                            p.id === policy.id ? {...p, using: e.target.value} : p
                                          )
                                        };
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
                                        return {
                                          ...t,
                                          policies: t.policies.map(p =>
                                            p.id === policy.id ? {...p, withCheck: e.target.value} : p
                                          )
                                        };
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
                  <p className="text-sm">Clique em "Nova Tabela" para começar</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="alter" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Defina alterações em tabelas existentes
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addAlterOperation("add_column")}>
                <Plus className="h-3 w-3 mr-1" />
                Add Coluna
              </Button>
              <Button variant="outline" size="sm" onClick={() => addAlterOperation("drop_column")}>
                <Trash2 className="h-3 w-3 mr-1" />
                Drop Coluna
              </Button>
              <Button variant="outline" size="sm" onClick={() => addAlterOperation("alter_column")}>
                <Columns className="h-3 w-3 mr-1" />
                Alterar Coluna
              </Button>
              <Button variant="outline" size="sm" onClick={() => addAlterOperation("add_constraint")}>
                <Link className="h-3 w-3 mr-1" />
                Add Constraint
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {alterOperations.map((op) => (
                <Card key={op.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <Badge variant={
                        op.type === "add_column" ? "default" :
                        op.type === "drop_column" ? "destructive" :
                        "secondary"
                      }>
                        {op.type.replace("_", " ").toUpperCase()}
                      </Badge>
                      
                      <Select
                        value={op.table}
                        onValueChange={(v) => setAlterOperations(ops =>
                          ops.map(o => o.id === op.id ? {...o, table: v} : o)
                        )}
                      >
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
                            <Input
                              placeholder="Nome da coluna"
                              value={op.details.columnName || ""}
                              onChange={(e) => setAlterOperations(ops =>
                                ops.map(o => o.id === op.id ? {...o, details: {...o.details, columnName: e.target.value}} : o)
                              )}
                            />
                            <Select
                              value={op.details.columnType || "text"}
                              onValueChange={(v) => setAlterOperations(ops =>
                                ops.map(o => o.id === op.id ? {...o, details: {...o.details, columnType: v}} : o)
                              )}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {POSTGRES_TYPES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Default value"
                              value={op.details.defaultValue || ""}
                              onChange={(e) => setAlterOperations(ops =>
                                ops.map(o => o.id === op.id ? {...o, details: {...o.details, defaultValue: e.target.value}} : o)
                              )}
                            />
                            <Select
                              value={op.details.nullable || "true"}
                              onValueChange={(v) => setAlterOperations(ops =>
                                ops.map(o => o.id === op.id ? {...o, details: {...o.details, nullable: v}} : o)
                              )}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Nullable</SelectItem>
                                <SelectItem value="false">NOT NULL</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        )}

                        {op.type === "drop_column" && (
                          <Input
                            placeholder="Nome da coluna"
                            value={op.details.columnName || ""}
                            onChange={(e) => setAlterOperations(ops =>
                              ops.map(o => o.id === op.id ? {...o, details: {...o.details, columnName: e.target.value}} : o)
                            )}
                          />
                        )}

                        {op.type === "alter_column" && (
                          <>
                            <Input
                              placeholder="Nome da coluna"
                              value={op.details.columnName || ""}
                              onChange={(e) => setAlterOperations(ops =>
                                ops.map(o => o.id === op.id ? {...o, details: {...o.details, columnName: e.target.value}} : o)
                              )}
                            />
                            <Select
                              value={op.details.newType || ""}
                              onValueChange={(v) => setAlterOperations(ops =>
                                ops.map(o => o.id === op.id ? {...o, details: {...o.details, newType: v}} : o)
                              )}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Novo tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {POSTGRES_TYPES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Novo default"
                              value={op.details.setDefault || ""}
                              onChange={(e) => setAlterOperations(ops =>
                                ops.map(o => o.id === op.id ? {...o, details: {...o.details, setDefault: e.target.value}} : o)
                              )}
                            />
                          </>
                        )}

                        {op.type === "add_constraint" && (
                          <>
                            <Input
                              placeholder="Nome do constraint"
                              value={op.details.constraintName || ""}
                              onChange={(e) => setAlterOperations(ops =>
                                ops.map(o => o.id === op.id ? {...o, details: {...o.details, constraintName: e.target.value}} : o)
                              )}
                            />
                            <Select
                              value={op.details.constraintType || "foreign_key"}
                              onValueChange={(v) => setAlterOperations(ops =>
                                ops.map(o => o.id === op.id ? {...o, details: {...o.details, constraintType: v}} : o)
                              )}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="foreign_key">Foreign Key</SelectItem>
                                <SelectItem value="unique">Unique</SelectItem>
                                <SelectItem value="check">Check</SelectItem>
                              </SelectContent>
                            </Select>
                            {op.details.constraintType === "foreign_key" && (
                              <>
                                <Input
                                  placeholder="Coluna local"
                                  value={op.details.column || ""}
                                  onChange={(e) => setAlterOperations(ops =>
                                    ops.map(o => o.id === op.id ? {...o, details: {...o.details, column: e.target.value}} : o)
                                  )}
                                />
                                <Select
                                  value={op.details.refTable || ""}
                                  onValueChange={(v) => setAlterOperations(ops =>
                                    ops.map(o => o.id === op.id ? {...o, details: {...o.details, refTable: v}} : o)
                                  )}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Tabela ref" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {EXISTING_TABLES.map(t => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAlterOperations(ops => ops.filter(o => o.id !== op.id))}
                      >
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

        <TabsContent value="preview" className="space-y-4">
          {generatedSQL ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">SQL gerado com sucesso</span>
                <Badge variant="outline">{generatedSQL.split("\n").length} linhas</Badge>
              </div>
              <Card className="bg-muted/50">
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                      {generatedSQL}
                    </pre>
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
