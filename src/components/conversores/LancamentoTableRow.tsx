import React, { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { type PlanoContasItem } from "@/utils/planoContasParser";

export type LancamentoRowData = {
  id: string;
  lote: number;
  data: string;
  favorecidoOriginal: string;
  historico: string;
  contaDebito: string;
  contaDebitoDescricao: string;
  valor: number;
  vinculoAutomatico: boolean;
};

type Props = {
  item: LancamentoRowData;
  planoContas: PlanoContasItem[];
  onContaDebitoChange: (id: string, codigo: string) => void;
};

const LancamentoTableRow = memo(({ item, planoContas, onContaDebitoChange }: Props) => {
  return (
    <TableRow className={cn(
      "hover:bg-muted/30",
      !item.contaDebito && "bg-red-500/5"
    )}>
      <TableCell className="text-xs py-2 font-mono text-muted-foreground">
        {item.lote}
      </TableCell>
      <TableCell className="text-xs py-2">
        {item.data ? formatDate(item.data) : "-"}
      </TableCell>
      <TableCell className="text-xs py-2">
        <div>
          <p className="font-medium truncate max-w-[200px]" title={item.favorecidoOriginal}>
            {item.favorecidoOriginal}
          </p>
          <p className="text-muted-foreground text-[10px] truncate max-w-[280px]" title={item.historico}>
            {item.historico}
          </p>
        </div>
      </TableCell>
      <TableCell className="text-xs py-2">
        <Select 
          value={item.contaDebito} 
          onValueChange={(v) => onContaDebitoChange(item.id, v)}
        >
          <SelectTrigger className={cn(
            "h-8 text-xs",
            !item.contaDebito && "border-red-500 bg-red-500/10"
          )}>
            <SelectValue placeholder="Selecionar conta..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {planoContas.map((conta) => (
              <SelectItem key={conta.codigo} value={conta.codigo}>
                <span className="font-mono text-xs mr-2">{conta.codigo}</span>
                <span className="text-xs truncate">{conta.descricao}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {item.contaDebitoDescricao && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {item.contaDebitoDescricao}
          </p>
        )}
      </TableCell>
      <TableCell className="text-xs py-2 text-right font-mono">
        {formatCurrency(item.valor)}
      </TableCell>
      <TableCell className="text-xs py-2 text-center">
        {item.contaDebito ? (
          <Badge variant="outline" className={cn(
            "text-[10px]",
            item.vinculoAutomatico 
              ? "border-blue-500 text-blue-500" 
              : "border-green-500 text-green-500"
          )}>
            {item.vinculoAutomatico ? "Auto" : "Manual"}
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px]">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.contaDebito === nextProps.item.contaDebito &&
    prevProps.item.contaDebitoDescricao === nextProps.item.contaDebitoDescricao &&
    prevProps.item.vinculoAutomatico === nextProps.item.vinculoAutomatico
  );
});

LancamentoTableRow.displayName = "LancamentoTableRow";

export default LancamentoTableRow;
