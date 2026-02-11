import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CheckCircle, ChevronDown, ChevronRight, Calendar, 
  Edit2, Eye, ChevronLeft, ChevronRight as ChevronRightIcon
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { type LancamentoAjustado } from "./AjustarLancamentosStep";

const ITEMS_PER_PAGE = 100;

const MESES_LABEL: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

export type CompetenciaConfirmada = {
  id: string;
  mes: string;
  ano: string;
  lancamentos: LancamentoAjustado[];
  contaCredito: string;
  codigoEmpresa: string;
  dataExportacao: string;
  valorTotal: number;
};

type Props = {
  competencias: CompetenciaConfirmada[];
  onEditar: (competencia: CompetenciaConfirmada) => void;
};

const CompetenciasConfirmadas = ({ competencias, onEditar }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paginasPorCompetencia, setPaginasPorCompetencia] = useState<Record<string, number>>({});

  if (competencias.length === 0) return null;

  const getPagina = (id: string) => paginasPorCompetencia[id] || 1;
  const setPagina = (id: string, pagina: number) => {
    setPaginasPorCompetencia(prev => ({ ...prev, [id]: pagina }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <h4 className="font-medium text-sm">Competências Confirmadas</h4>
        <Badge variant="secondary" className="text-xs">{competencias.length}</Badge>
      </div>
      
      <div className="space-y-2">
        {competencias.map((comp) => {
          const isExpanded = expandedId === comp.id;
          const pagina = getPagina(comp.id);
          const totalPaginas = Math.ceil(comp.lancamentos.length / ITEMS_PER_PAGE);
          const lancamentosPaginados = comp.lancamentos.slice(
            (pagina - 1) * ITEMS_PER_PAGE,
            pagina * ITEMS_PER_PAGE
          );

          return (
            <Collapsible 
              key={comp.id} 
              open={isExpanded}
              onOpenChange={(open) => setExpandedId(open ? comp.id : null)}
            >
              <div className={cn(
                "border rounded-lg transition-all",
                isExpanded ? "border-green-500/50 bg-green-500/5" : "border-border hover:border-green-500/30"
              )}>
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center gap-3 text-left">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "bg-green-500/20 text-green-500"
                    )}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {MESES_LABEL[comp.mes]}/{comp.ano}
                        </span>
                        <Badge variant="outline" className="border-green-500/50 text-green-500 text-[10px]">
                          Confirmado
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{comp.lancamentos.length} lançamentos</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">{formatCurrency(comp.valorTotal)}</span>
                        <span>•</span>
                        <span>Exportado em {formatDate(comp.dataExportacao)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-3">
                    {/* Info cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-muted/30 rounded text-center">
                        <p className="text-[10px] text-muted-foreground">Conta Crédito</p>
                        <p className="text-xs font-mono font-medium truncate">{comp.contaCredito}</p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded text-center">
                        <p className="text-[10px] text-muted-foreground">Cód. Empresa</p>
                        <p className="text-xs font-mono font-medium">{comp.codigoEmpresa}</p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded text-center">
                        <p className="text-[10px] text-muted-foreground">Total</p>
                        <p className="text-xs font-medium">{formatCurrency(comp.valorTotal)}</p>
                      </div>
                    </div>

                    {/* Tabela de lançamentos */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-[10px] py-2">#</TableHead>
                            <TableHead className="text-[10px] py-2">Data</TableHead>
                            <TableHead className="text-[10px] py-2">Favorecido</TableHead>
                            <TableHead className="text-[10px] py-2">Conta Débito</TableHead>
                            <TableHead className="text-[10px] py-2 text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lancamentosPaginados.map((lanc, idx) => (
                            <TableRow key={lanc.id} className="hover:bg-muted/30">
                              <TableCell className="text-[10px] py-1.5 text-muted-foreground">
                                {(pagina - 1) * ITEMS_PER_PAGE + idx + 1}
                              </TableCell>
                              <TableCell className="text-[10px] py-1.5 font-mono">
                                {lanc.data ? formatDate(lanc.data) : "-"}
                              </TableCell>
                              <TableCell className="text-[10px] py-1.5 max-w-[150px] truncate">
                                {lanc.favorecidoOriginal}
                              </TableCell>
                              <TableCell className="text-[10px] py-1.5 font-mono">
                                {lanc.contaDebito}
                              </TableCell>
                              <TableCell className="text-[10px] py-1.5 text-right font-mono">
                                {formatCurrency(lanc.valor)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Paginação */}
                    {totalPaginas > 1 && (
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">
                          {((pagina - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(pagina * ITEMS_PER_PAGE, comp.lancamentos.length)} de {comp.lancamentos.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={(e) => { e.stopPropagation(); setPagina(comp.id, Math.max(1, pagina - 1)); }}
                            disabled={pagina === 1}
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </Button>
                          <span className="px-1 text-[10px]">{pagina}/{totalPaginas}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={(e) => { e.stopPropagation(); setPagina(comp.id, Math.min(totalPaginas, pagina + 1)); }}
                            disabled={pagina === totalPaginas}
                          >
                            <ChevronRightIcon className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onEditar(comp); }}
                        className="h-7 text-xs"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Editar Competência
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default CompetenciasConfirmadas;
