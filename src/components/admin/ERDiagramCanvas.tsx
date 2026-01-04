import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Key, 
  Lock, 
  ArrowRight, 
  Download, 
  Image as ImageIcon,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GripVertical
} from "lucide-react";
import { motion } from "framer-motion";
import { toPng, toSvg } from "html-to-image";
import { toast } from "sonner";

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
  policies: { id: string; name: string; command: string; using: string; withCheck: string }[];
}

interface TablePosition {
  id: string;
  x: number;
  y: number;
}

interface ERDiagramCanvasProps {
  tables: TableDefinition[];
  existingTables: string[];
  onReorder?: (tables: TableDefinition[]) => void;
}

export default function ERDiagramCanvas({ tables, existingTables, onReorder }: ERDiagramCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<TablePosition[]>([]);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize positions in a grid layout
  useEffect(() => {
    const cols = 3;
    const cardWidth = 280;
    const cardHeight = 320;
    const gap = 40;

    const allTableIds = [
      ...tables.map(t => t.id),
      ...getReferencedExistingTables().map(t => `existing-${t}`)
    ];

    const newPositions = allTableIds.map((id, index) => {
      const existing = positions.find(p => p.id === id);
      if (existing) return existing;

      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        id,
        x: col * (cardWidth + gap) + 20,
        y: row * (cardHeight + gap) + 20
      };
    });

    setPositions(newPositions);
  }, [tables.length]);

  // Get referenced existing tables
  const getReferencedExistingTables = useCallback(() => {
    const referenced = new Set<string>();
    tables.forEach(t => {
      t.columns.forEach(c => {
        if (c.references && existingTables.includes(c.references.table)) {
          referenced.add(c.references.table);
        }
      });
    });
    return Array.from(referenced);
  }, [tables, existingTables]);

  const referencedExisting = useMemo(() => getReferencedExistingTables(), [getReferencedExistingTables]);

  // Calculate relationships for SVG lines
  const relationships = useMemo(() => {
    const rels: { fromId: string; toId: string; fromTable: string; toTable: string; column: string }[] = [];
    tables.forEach(t => {
      t.columns.forEach(c => {
        if (c.references) {
          const targetIsNew = tables.some(nt => nt.name === c.references?.table);
          const targetId = targetIsNew 
            ? tables.find(nt => nt.name === c.references?.table)?.id 
            : `existing-${c.references.table}`;
          
          if (targetId) {
            rels.push({
              fromId: t.id,
              toId: targetId,
              fromTable: t.name || "sem_nome",
              toTable: c.references.table,
              column: c.name
            });
          }
        }
      });
    });
    return rels;
  }, [tables]);

  // Handle drag
  const handleDrag = (id: string, x: number, y: number) => {
    setPositions(prev => prev.map(p => 
      p.id === id ? { ...p, x: Math.max(0, x), y: Math.max(0, y) } : p
    ));
  };

  // Get position for a table
  const getPosition = (id: string) => {
    return positions.find(p => p.id === id) || { x: 0, y: 0 };
  };

  // Export as PNG
  const exportAsPNG = async () => {
    if (!diagramRef.current) return;
    setIsExporting(true);
    
    try {
      const dataUrl = await toPng(diagramRef.current, {
        backgroundColor: '#1a1a2e',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      const link = document.createElement('a');
      link.download = `er-diagram-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Diagrama exportado como PNG!");
    } catch (error) {
      toast.error("Erro ao exportar PNG");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export as SVG
  const exportAsSVG = async () => {
    if (!diagramRef.current) return;
    setIsExporting(true);
    
    try {
      const dataUrl = await toSvg(diagramRef.current, {
        backgroundColor: '#1a1a2e'
      });
      
      const link = document.createElement('a');
      link.download = `er-diagram-${new Date().toISOString().split('T')[0]}.svg`;
      link.href = dataUrl;
      link.click();
      toast.success("Diagrama exportado como SVG!");
    } catch (error) {
      toast.error("Erro ao exportar SVG");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  // Reset positions
  const resetLayout = () => {
    const cols = 3;
    const cardWidth = 280;
    const cardHeight = 320;
    const gap = 40;

    const allTableIds = [
      ...tables.map(t => t.id),
      ...referencedExisting.map(t => `existing-${t}`)
    ];

    const newPositions = allTableIds.map((id, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        id,
        x: col * (cardWidth + gap) + 20,
        y: row * (cardHeight + gap) + 20
      };
    });

    setPositions(newPositions);
    toast.success("Layout resetado!");
  };

  // Calculate canvas size based on positions
  const canvasSize = useMemo(() => {
    if (positions.length === 0) return { width: 900, height: 600 };
    const maxX = Math.max(...positions.map(p => p.x)) + 320;
    const maxY = Math.max(...positions.map(p => p.y)) + 380;
    return { width: Math.max(900, maxX), height: Math.max(600, maxY) };
  }, [positions]);

  // Render SVG connection lines
  const renderConnectionLines = () => {
    return relationships.map((rel, index) => {
      const fromPos = getPosition(rel.fromId);
      const toPos = getPosition(rel.toId);
      
      // Calculate connection points (center right of from, center left of to)
      const fromX = fromPos.x + 260;
      const fromY = fromPos.y + 80;
      const toX = toPos.x;
      const toY = toPos.y + 80;

      // Create curved path
      const midX = (fromX + toX) / 2;
      const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

      return (
        <g key={`rel-${index}`}>
          {/* Shadow line */}
          <path
            d={path}
            fill="none"
            stroke="rgba(59, 130, 246, 0.2)"
            strokeWidth="6"
          />
          {/* Main line */}
          <path
            d={path}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            strokeDasharray="5,3"
            markerEnd="url(#arrowhead)"
          />
          {/* Label */}
          <text
            x={midX}
            y={(fromY + toY) / 2 - 8}
            fill="rgb(148, 163, 184)"
            fontSize="10"
            textAnchor="middle"
            className="font-mono"
          >
            {rel.column}
          </text>
        </g>
      );
    });
  };

  const TableCard = ({ table, isExisting = false }: { table: TableDefinition | string; isExisting?: boolean }) => {
    const tableData = isExisting ? null : (table as TableDefinition);
    const tableName = isExisting ? (table as string) : (tableData?.name || "sem_nome");
    const tableId = isExisting ? `existing-${table}` : (tableData?.id || "");
    const pos = getPosition(tableId);

    const referencingTables = isExisting ? tables.filter(t =>
      t.columns.some(c => c.references?.table === tableName)
    ) : [];

    return (
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        onDrag={(_, info) => {
          handleDrag(tableId, pos.x + info.delta.x, pos.y + info.delta.y);
        }}
        onDragStart={() => setDraggedTable(tableId)}
        onDragEnd={() => setDraggedTable(null)}
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: 260,
          zIndex: draggedTable === tableId ? 100 : 1,
          cursor: 'grab'
        }}
        whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
        className="select-none"
      >
        <Card className={`border-2 shadow-lg ${
          isExisting 
            ? 'border-amber-500/50 bg-gradient-to-br from-background to-amber-500/10' 
            : 'border-primary/50 bg-gradient-to-br from-background to-primary/10'
        }`}>
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <div className={`w-3 h-3 rounded-full ${isExisting ? 'bg-amber-500' : 'bg-primary'}`} />
                <CardTitle className={`text-sm font-mono ${isExisting ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                  {tableName}
                </CardTitle>
              </div>
              {isExisting ? (
                <Badge variant="outline" className="text-[10px] text-amber-600">existente</Badge>
              ) : tableData?.enableRLS && (
                <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-500">
                  <Lock className="h-3 w-3" />
                  RLS
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[200px] overflow-hidden">
            {isExisting ? (
              <div className="p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-2">Referenciada por:</p>
                {referencingTables.map(ref => {
                  const fkCols = ref.columns.filter(c => c.references?.table === tableName);
                  return fkCols.map(fk => (
                    <div key={fk.id} className="flex items-center gap-1 py-0.5">
                      <span className="text-green-500">←</span>
                      <span className="font-mono">{ref.name || "sem_nome"}.{fk.name}</span>
                    </div>
                  ));
                })}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {tableData?.columns.slice(0, 6).map(col => (
                  <div key={col.id} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                    {col.isPrimaryKey ? (
                      <Key className="h-3 w-3 text-yellow-500 shrink-0" />
                    ) : col.references ? (
                      <ArrowRight className="h-3 w-3 text-blue-500 shrink-0" />
                    ) : (
                      <span className="w-3 h-3 shrink-0" />
                    )}
                    <span className="font-mono font-medium truncate">{col.name || "—"}</span>
                    <span className="text-muted-foreground truncate flex-1 text-right text-[10px]">
                      {col.type.replace("timestamp with time zone", "timestamptz")}
                    </span>
                  </div>
                ))}
                {(tableData?.columns.length || 0) > 6 && (
                  <div className="px-3 py-1.5 text-xs text-muted-foreground text-center">
                    +{(tableData?.columns.length || 0) - 6} mais...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (tables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetLayout}>
            <Maximize2 className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportAsPNG}
            disabled={isExporting}
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            PNG
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportAsSVG}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-1" />
            SVG
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <span>Arraste para mover</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Nova Tabela</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Tabela Existente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgb(59, 130, 246) 0, rgb(59, 130, 246) 5px, transparent 5px, transparent 8px)' }} />
          <span>Foreign Key</span>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="relative overflow-auto border rounded-lg bg-gradient-to-br from-slate-900/50 to-slate-800/50"
        style={{ height: '500px' }}
      >
        <div 
          ref={diagramRef}
          className="relative"
          style={{ 
            width: canvasSize.width * zoom, 
            height: canvasSize.height * zoom,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            minWidth: canvasSize.width,
            minHeight: canvasSize.height
          }}
        >
          {/* SVG Layer for connection lines */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            width={canvasSize.width}
            height={canvasSize.height}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="rgb(59, 130, 246)"
                />
              </marker>
            </defs>
            {renderConnectionLines()}
          </svg>

          {/* Table Cards */}
          {tables.map(table => (
            <TableCard key={table.id} table={table} />
          ))}

          {/* Existing Referenced Tables */}
          {referencedExisting.map(tableName => (
            <TableCard key={`existing-${tableName}`} table={tableName} isExisting />
          ))}
        </div>
      </div>

      {/* Relationship Summary */}
      {relationships.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-blue-500" />
              Conexões ({relationships.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {relationships.map((rel, i) => (
                <Badge key={i} variant="outline" className="font-mono text-xs gap-1">
                  {rel.fromTable}
                  <ArrowRight className="h-3 w-3" />
                  {rel.toTable}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
