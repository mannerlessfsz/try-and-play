import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload, Package, ArrowDown, ArrowUp, FileText, Check, ChevronRight, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  parseMovimentoEstoqueCSV,
  type MovimentoEstoqueParsed,
  type MovimentoEstoqueRow,
} from "@/utils/movimentoEstoqueParser";
import type { UseMutationResult } from "@tanstack/react-query";
import type { SaldoNotaInsert } from "@/hooks/useSaldosNotas";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatQtd = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(v);

/* ── Types ── */

export interface EnrichedNotaRow {
  guia: { id: string; numero_nota: string; [key: string]: any };
  quantidade: number;
  saldoAnterior: number;
  saldoAtual: number;
  icmsProprio: number;
  icmsST: number;
  icmsProprioUn: number;
  icmsSTUn: number;
}

interface ConsumoNota {
  guiaId: string;
  numeroNota: string;
  saldoInicial: number;
  consumido: number;
  saldoFinal: number;
  zerou: boolean;
}

interface Props {
  notasUtilizaveis: EnrichedNotaRow[];
  onAvancar: () => void;
  empresaId?: string;
  competenciaAno?: number;
  competenciaMes?: number;
  salvarSaldos?: UseMutationResult<void, any, SaldoNotaInsert[], unknown>;
}

/* ── Component ── */

export function MovimentoEstoqueStep({ notasUtilizaveis, onAvancar, empresaId, competenciaAno, competenciaMes, salvarSaldos }: Props) {
  const [parsed, setParsed] = useState<MovimentoEstoqueParsed | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseMovimentoEstoqueCSV(text);
      setParsed(result);
      setFileName(file.name);
      toast.success(`${result.movimentos.length} movimentos importados`);
    } catch (err) {
      toast.error("Erro ao processar arquivo");
      console.error(err);
    }

    e.target.value = "";
  }, []);

  // Cross-reference exits with notas utilizáveis (FIFO)
  const consumo = useMemo<ConsumoNota[]>(() => {
    if (!parsed) return [];

    const totalSaidas = parsed.totalSaidas;

    // Sort notas by numero_nota ascending (oldest first = FIFO)
    const sorted = [...notasUtilizaveis].sort(
      (a, b) => parseInt(a.guia.numero_nota) - parseInt(b.guia.numero_nota)
    );

    let remaining = totalSaidas;
    const result: ConsumoNota[] = [];

    for (const nota of sorted) {
      if (remaining <= 0) {
        result.push({
          guiaId: nota.guia.id,
          numeroNota: nota.guia.numero_nota,
          saldoInicial: nota.saldoAtual,
          consumido: 0,
          saldoFinal: nota.saldoAtual,
          zerou: false,
        });
        continue;
      }

      const consumido = Math.min(remaining, nota.saldoAtual);
      const saldoFinal = nota.saldoAtual - consumido;
      remaining -= consumido;

      result.push({
        guiaId: nota.guia.id,
        numeroNota: nota.guia.numero_nota,
        saldoInicial: nota.saldoAtual,
        consumido,
        saldoFinal,
        zerou: saldoFinal <= 0,
      });
    }

    return result;
  }, [parsed, notasUtilizaveis]);

  const notasZeradas = consumo.filter(c => c.zerou).length;

  if (!parsed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-8 text-center space-y-4"
      >
        <Package className="w-12 h-12 mx-auto text-muted-foreground" />
        <div className="space-y-1">
          <h4 className="font-semibold text-sm">Importar Movimento de Estoque</h4>
          <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
            Importe o relatório <strong>Movimento Individual do Produto</strong> em formato CSV.
            O sistema irá cruzar as saídas com as notas utilizáveis do Passo 1 (FIFO).
          </p>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <Button variant="default" size="sm" className="gap-2 text-xs" asChild>
            <span>
              <Upload className="w-3.5 h-3.5" />
              Selecionar Arquivo CSV
            </span>
          </Button>
          <input
            type="file"
            accept=".csv,.CSV"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header info */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold">{parsed.produto}</p>
            <p className="text-[10px] text-muted-foreground">
              {parsed.periodo} · {fileName}
            </p>
          </div>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5" asChild>
              <span>
                <Upload className="w-3 h-3" />
                Reimportar
              </span>
            </Button>
            <input
              type="file"
              accept=".csv,.CSV"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SummaryCard
            label="Saldo Anterior"
            value={formatQtd(parsed.saldoAnteriorQtd)}
            sub={formatCurrency(parsed.saldoAnteriorValorTotal)}
          />
          <SummaryCard
            label="Entradas"
            value={formatQtd(parsed.totalEntradas)}
            sub={formatCurrency(parsed.totalEntradaValor)}
            icon={<ArrowDown className="w-3 h-3 text-emerald-500" />}
          />
          <SummaryCard
            label="Saídas"
            value={formatQtd(parsed.totalSaidas)}
            sub={formatCurrency(parsed.totalSaidaValor)}
            icon={<ArrowUp className="w-3 h-3 text-rose-500" />}
          />
          <SummaryCard
            label="Saldo Final"
            value={formatQtd(parsed.saldoAnteriorQtd + parsed.totalEntradas - parsed.totalSaidas)}
            sub={`${parsed.movimentos.length} movimentos`}
          />
        </div>
      </div>

      {/* Consumo das notas */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold">Consumo das Notas Utilizáveis (FIFO)</h4>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              {notasZeradas} nota(s) zerada(s)
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {formatQtd(parsed.totalSaidas)} un. consumidas
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[9px] px-2">Nº Nota</TableHead>
                <TableHead className="text-[9px] px-2 text-right">Saldo Inicial</TableHead>
                <TableHead className="text-[9px] px-2 text-right">Consumido</TableHead>
                <TableHead className="text-[9px] px-2 text-right">Saldo Final</TableHead>
                <TableHead className="text-[9px] px-2 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumo.map(c => (
                <TableRow key={c.guiaId} className={c.zerou ? "bg-emerald-500/5" : ""}>
                  <TableCell className="text-[11px] px-2 font-mono">{c.numeroNota}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">
                    {formatQtd(c.saldoInicial)}
                  </TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono text-rose-400">
                    {c.consumido > 0 ? `-${formatQtd(c.consumido)}` : "-"}
                  </TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">
                    {formatQtd(c.saldoFinal)}
                  </TableCell>
                  <TableCell className="text-[11px] px-2 text-center">
                    {c.zerou ? (
                      <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-600 hover:bg-emerald-600">
                        UTILIZADO
                      </Badge>
                    ) : c.consumido > 0 ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-amber-400 border-amber-500/30">
                        PARCIAL
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                        PENDENTE
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Movimentos table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
          <h4 className="text-xs font-semibold">Movimentações do Período</h4>
          <Badge variant="outline" className="text-[10px]">
            {parsed.movimentos.length} registros
          </Badge>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <TableHead className="text-[9px] px-2">Data</TableHead>
                <TableHead className="text-[9px] px-2">Documento</TableHead>
                <TableHead className="text-[9px] px-2 text-center">Tipo</TableHead>
                <TableHead className="text-[9px] px-2 text-right">Quantidade</TableHead>
                <TableHead className="text-[9px] px-2 text-right">Valor Unit.</TableHead>
                <TableHead className="text-[9px] px-2 text-right">Valor Total</TableHead>
                <TableHead className="text-[9px] px-2 text-right">Saldo Físico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsed.movimentos.map((mov, idx) => (
                <MovimentoRow key={idx} mov={mov} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Salvar Saldos + Avançar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end gap-2"
      >
        {salvarSaldos && empresaId && competenciaAno && competenciaMes && (
          <Button
            variant="outline"
            className="gap-2 text-xs"
            onClick={() => {
              const items: SaldoNotaInsert[] = consumo.map(c => ({
                empresa_id: empresaId,
                guia_id: c.guiaId,
                numero_nota: c.numeroNota,
                competencia_ano: competenciaAno,
                competencia_mes: competenciaMes,
                saldo_remanescente: c.saldoFinal,
                quantidade_original: c.saldoInicial,
                quantidade_consumida: c.consumido,
              }));
              salvarSaldos.mutate(items);
            }}
            disabled={salvarSaldos.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            {salvarSaldos.isPending ? "Salvando..." : "Salvar Saldos Remanescentes"}
          </Button>
        )}
        <Button onClick={onAvancar} className="gap-2 text-xs">
          Avançar para Notas Fora Estado
          <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

/* ── Sub-components ── */

function SummaryCard({
  label, value, sub, icon,
}: {
  label: string; value: string; sub: string; icon?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-bold font-mono">{value}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{sub}</p>
    </div>
  );
}

function MovimentoRow({ mov }: { mov: MovimentoEstoqueRow }) {
  const isEntrada = mov.tipo === "entrada";
  return (
    <TableRow className={`${isEntrada ? "border-l-2 border-l-emerald-500/60" : "border-l-2 border-l-rose-500/60"}`}>
      <TableCell className="text-[11px] px-2 font-mono">{mov.data}</TableCell>
      <TableCell className="text-[11px] px-2 font-mono">{mov.documento}</TableCell>
      <TableCell className="text-[11px] px-2 text-center">
        {isEntrada ? (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-emerald-400 border-emerald-500/30">
            <ArrowDown className="w-2.5 h-2.5 mr-0.5" /> ENT
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-rose-400 border-rose-500/30">
            <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> SAI
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-[11px] px-2 text-right font-mono">{formatQtd(mov.quantidade)}</TableCell>
      <TableCell className="text-[11px] px-2 text-right font-mono">{formatCurrency(mov.valorUnitario)}</TableCell>
      <TableCell className="text-[11px] px-2 text-right font-mono">{formatCurrency(mov.valorTotal)}</TableCell>
      <TableCell className="text-[11px] px-2 text-right font-mono">{formatQtd(mov.saldoFisico)}</TableCell>
    </TableRow>
  );
}
