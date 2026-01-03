import { AlertTriangle, Clock, CalendarClock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/formatters";
import type { ParcelaAlerta } from "@/hooks/useParcelasAlerta";

interface ParcelasAlertaWidgetProps {
  parcelasVencendo: ParcelaAlerta[];
  parcelasAtrasadas: ParcelaAlerta[];
  totalValorVencendo: number;
  totalValorAtrasadas: number;
  onVerTransacoes?: () => void;
}

export function ParcelasAlertaWidget({
  parcelasVencendo,
  parcelasAtrasadas,
  totalValorVencendo,
  totalValorAtrasadas,
  onVerTransacoes,
}: ParcelasAlertaWidgetProps) {
  const hasAtrasadas = parcelasAtrasadas.length > 0;
  const hasVencendo = parcelasVencendo.length > 0;

  if (!hasAtrasadas && !hasVencendo) {
    return null;
  }

  const formatDias = (dias: number) => {
    if (dias === 0) return "Hoje";
    if (dias === 1) return "Amanhã";
    if (dias < 0) return `${Math.abs(dias)} dias atrás`;
    return `Em ${dias} dias`;
  };

  const formatVencimento = (dataStr: string) => {
    const date = new Date(dataStr + "T12:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 border-amber-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <CardTitle className="text-sm font-medium">Alertas de Vencimento</CardTitle>
          </div>
          {onVerTransacoes && (
            <button
              onClick={onVerTransacoes}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3">
          {hasAtrasadas && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-300">Atrasadas</span>
              </div>
              <p className="text-lg font-bold text-red-400">{parcelasAtrasadas.length}</p>
              <p className="text-xs text-red-300/70">{formatCurrency(totalValorAtrasadas)}</p>
            </div>
          )}
          {hasVencendo && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <CalendarClock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-300">Próximos 7 dias</span>
              </div>
              <p className="text-lg font-bold text-amber-400">{parcelasVencendo.length}</p>
              <p className="text-xs text-amber-300/70">{formatCurrency(totalValorVencendo)}</p>
            </div>
          )}
        </div>

        {/* Lista de parcelas */}
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {/* Atrasadas primeiro */}
            {parcelasAtrasadas.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.descricao}
                    </p>
                    {p.parcela_numero && p.parcela_total && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/30 text-red-300">
                        {p.parcela_numero}/{p.parcela_total}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-red-400">{formatDias(p.dias)}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{formatVencimento(p.data_vencimento)}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-red-400 ml-2">
                  {formatCurrency(p.valor)}
                </span>
              </div>
            ))}

            {/* Vencendo */}
            {parcelasVencendo.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/10"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.descricao}
                    </p>
                    {p.parcela_numero && p.parcela_total && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-300">
                        {p.parcela_numero}/{p.parcela_total}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-amber-400">{formatDias(p.dias)}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{formatVencimento(p.data_vencimento)}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-amber-400 ml-2">
                  {formatCurrency(p.valor)}
                </span>
              </div>
            ))}

            {/* Mostrar quantos mais existem */}
            {(parcelasAtrasadas.length > 3 || parcelasVencendo.length > 3) && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                + {Math.max(0, parcelasAtrasadas.length - 3) + Math.max(0, parcelasVencendo.length - 3)} outros alertas
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
