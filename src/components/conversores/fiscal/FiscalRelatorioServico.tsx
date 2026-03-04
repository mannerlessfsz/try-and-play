import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, CheckCircle2, ChevronLeft, ChevronRight, Download, DollarSign, FileText, Info, Shield, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRegrasRetencao, validarRetencoes, detectRegimePrestador, type ValidacaoNota, type DivergenciaRetencao } from "@/hooks/useRegrasRetencao";

interface FiscalRelatorioServicoProps {
  notas: any[];
  empresaRegime?: string | null;
}

function DivergenciaTooltip({ divergencias, fv }: { divergencias: DivergenciaRetencao[]; fv: (v: number) => string }) {
  return (
    <div className="space-y-2 text-[11px] max-w-[280px]">
      <p className="font-bold text-destructive flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> {divergencias.length} divergência(s)
      </p>
      {divergencias.map((d, i) => (
        <div key={i} className="p-1.5 rounded bg-destructive/10 border border-destructive/20 space-y-0.5">
          <div className="flex justify-between font-semibold">
            <span>{d.imposto}</span>
            <span className="text-destructive">Δ {fv(d.diferenca)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Lido: {fv(d.valorLido)}</span>
            <span className="text-green-500">Correto: {fv(d.valorCalculado)}</span>
          </div>
          <div className="text-muted-foreground">
            Alíquota: {(d.aliquota * 100).toFixed(2)}%
          </div>
          {d.motivo && (
            <div className="text-[10px] text-yellow-500 mt-0.5 italic">{d.motivo}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function CellRetencao({ valor, divergencia, fv }: { valor: number; divergencia?: DivergenciaRetencao; fv: (v: number) => string }) {
  if (!divergencia) {
    return <span>{valor > 0 ? fv(valor) : "—"}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help border-b border-dashed border-destructive text-destructive font-bold">
            {valor > 0 ? fv(valor) : "—"} ⚠
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-popover border shadow-lg">
          <div className="text-[11px] space-y-1">
            <p className="text-destructive font-semibold">{divergencia.imposto}: Divergência</p>
            <p>Lido: {fv(divergencia.valorLido)}</p>
            <p className="text-green-500">Calculado: {fv(divergencia.valorCalculado)} ({(divergencia.aliquota * 100).toFixed(2)}%)</p>
            <p>Diferença: {fv(divergencia.diferenca)}</p>
            {divergencia.motivo && <p className="text-yellow-500 italic">{divergencia.motivo}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function FiscalRelatorioServico({ notas, empresaRegime }: FiscalRelatorioServicoProps) {
  const PAGE_SIZE = 100;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(notas.length / PAGE_SIZE));
  const paginatedNotas = notas.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const { data: regras = [] } = useRegrasRetencao();

  const fv = (v: number) => {
    if (!v || isNaN(v)) return "R$ 0,00";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const validacoes = useMemo(() => {
    if (regras.length === 0) return new Map<number, ValidacaoNota>();
    const map = new Map<number, ValidacaoNota>();
    notas.forEach((n, i) => {
      const regime = detectRegimePrestador(n);
      map.set(i, validarRetencoes(n, regras, regime));
    });
    return map;
  }, [notas, regras]);

  const totalDivergencias = useMemo(() => {
    let count = 0;
    validacoes.forEach(v => { count += v.totalDivergencias; });
    return count;
  }, [validacoes]);

  const simplesCount = useMemo(() => {
    let count = 0;
    notas.forEach(n => {
      const r = detectRegimePrestador(n);
      if (r === "simples_nacional" || r === "mei") count++;
    });
    return count;
  }, [notas]);

  const totais = useMemo(() => {
    let valorServicos = 0, valorISS = 0, retIR = 0, retPIS = 0, retCOFINS = 0, retCSLL = 0, retINSS = 0, retISS = 0, valorLiquido = 0;
    
    for (const n of notas) {
      valorServicos += n.servico?.valor_servicos || 0;
      valorISS += n.servico?.valor_iss || 0;
      retIR += n.retencoes?.ir || 0;
      retPIS += n.retencoes?.pis || 0;
      retCOFINS += n.retencoes?.cofins || 0;
      retCSLL += n.retencoes?.csll || 0;
      retINSS += n.retencoes?.inss || 0;
      retISS += n.retencoes?.iss || 0;
      valorLiquido += n.valor_liquido || n.servico?.valor_servicos || 0;
    }

    const totalRetencoes = retIR + retPIS + retCOFINS + retCSLL + retINSS + retISS;

    return { valorServicos, valorISS, retIR, retPIS, retCOFINS, retCSLL, retINSS, retISS, totalRetencoes, valorLiquido };
  }, [notas]);

  const exportCSV = () => {
    const headers = ["Data", "Número", "Série", "Prestador", "CNPJ Prestador", "Regime Prestador", "Tomador", "CNPJ/CPF Tomador", "Valor Serviços", "ISS", "IR", "PIS", "COFINS", "CSLL", "INSS", "ISS Ret.", "Total Retenções", "Valor Líquido", "Status Validação", "Dispensas"];
    const rows = notas.map((n, idx) => {
      const retTotal = (n.retencoes?.ir || 0) + (n.retencoes?.pis || 0) + (n.retencoes?.cofins || 0) + (n.retencoes?.csll || 0) + (n.retencoes?.inss || 0) + (n.retencoes?.iss || 0);
      const val = validacoes.get(idx);
      const regime = detectRegimePrestador(n);
      const statusVal = !val?.temRegra ? "Sem regra" : val.totalDivergencias > 0 ? `${val.totalDivergencias} divergência(s)` : "OK";
      return [
        n.data_emissao || "",
        n.numero || "",
        n.serie || "",
        n.prestador?.razao_social || "",
        n.prestador?.cnpj || "",
        regime || "",
        n.tomador?.razao_social || "",
        n.tomador?.cpf_cnpj || "",
        (n.servico?.valor_servicos || 0).toFixed(2),
        (n.servico?.valor_iss || 0).toFixed(2),
        (n.retencoes?.ir || 0).toFixed(2),
        (n.retencoes?.pis || 0).toFixed(2),
        (n.retencoes?.cofins || 0).toFixed(2),
        (n.retencoes?.csll || 0).toFixed(2),
        (n.retencoes?.inss || 0).toFixed(2),
        (n.retencoes?.iss || 0).toFixed(2),
        retTotal.toFixed(2),
        (n.valor_liquido || n.servico?.valor_servicos || 0).toFixed(2),
        statusVal,
        val?.dispensas?.join("; ") || "",
      ].map(v => `"${v}"`).join(";");
    });
    const csv = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_nfse_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const accentColor = "hsl(var(--cyan))";

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="glass rounded-xl p-4 text-center">
          <FileText className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-2xl font-bold">{notas.length}</p>
          <p className="text-[10px] text-muted-foreground">Notas</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-xl p-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1.5" style={{ color: accentColor }} />
          <p className="text-lg font-bold font-mono" style={{ color: accentColor }}>{fv(totais.valorServicos)}</p>
          <p className="text-[10px] text-muted-foreground">Valor Total</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1.5 text-destructive" />
          <p className="text-lg font-bold font-mono text-destructive">{fv(totais.totalRetencoes)}</p>
          <p className="text-[10px] text-muted-foreground">Total Retenções</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-xl p-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1.5 text-green-500" />
          <p className="text-lg font-bold font-mono text-green-500">{fv(totais.valorLiquido)}</p>
          <p className="text-[10px] text-muted-foreground">Valor Líquido</p>
        </motion.div>
        {/* Simples Nacional count */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }} className="glass rounded-xl p-4 text-center">
          <Shield className="w-5 h-5 mx-auto mb-1.5 text-yellow-500" />
          <p className="text-2xl font-bold text-yellow-500">{simplesCount}</p>
          <p className="text-[10px] text-muted-foreground">Simples/MEI</p>
        </motion.div>
        {/* Validation card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`glass rounded-xl p-4 text-center ${totalDivergencias > 0 ? "ring-1 ring-destructive/30" : ""}`}>
          {totalDivergencias > 0 ? (
            <>
              <AlertTriangle className="w-5 h-5 mx-auto mb-1.5 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{totalDivergencias}</p>
              <p className="text-[10px] text-muted-foreground">Divergências</p>
            </>
          ) : regras.length > 0 ? (
            <>
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1.5 text-green-500" />
              <p className="text-lg font-bold text-green-500">OK</p>
              <p className="text-[10px] text-muted-foreground">Validado</p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-sm font-bold text-muted-foreground">—</p>
              <p className="text-[10px] text-muted-foreground">Sem regras</p>
            </>
          )}
        </motion.div>
      </div>

      {/* Retenções por tipo */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: accentColor }} />
            <h3 className="text-sm font-bold">Retenções por Tipo</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "IR", value: totais.retIR, color: "hsl(var(--orange))" },
            { label: "PIS", value: totais.retPIS, color: "hsl(var(--blue))" },
            { label: "COFINS", value: totais.retCOFINS, color: "hsl(var(--cyan))" },
            { label: "CSLL", value: totais.retCSLL, color: "hsl(var(--yellow))" },
            { label: "INSS", value: totais.retINSS, color: "hsl(270 80% 60%)" },
            { label: "ISS", value: totais.retISS, color: "hsl(var(--magenta))" },
          ].map((ret) => (
            <div key={ret.label} className="p-3 rounded-xl border bg-foreground/[0.02]" style={{ borderColor: ret.color + "20" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ret.color }} />
                <span className="text-[11px] font-semibold">{ret.label}</span>
              </div>
              <p className="text-sm font-bold font-mono" style={{ color: ret.value > 0 ? ret.color : undefined }}>
                {fv(ret.value)}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabela de notas */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-foreground/5">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold">Detalhamento por Nota</h3>
            {totalDivergencias > 0 && (
              <Badge variant="destructive" className="text-[9px] gap-1">
                <AlertTriangle className="w-3 h-3" /> {totalDivergencias} divergência(s)
              </Badge>
            )}
            {simplesCount > 0 && (
              <Badge variant="outline" className="text-[9px] gap-1 border-yellow-500/40 text-yellow-500">
                <Shield className="w-3 h-3" /> {simplesCount} Simples/MEI
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-7 text-xs gap-1.5">
            <Download className="w-3 h-3" /> Exportar CSV
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-foreground/5 bg-foreground/[0.02]">
                  <th className="text-center p-2.5 font-semibold text-muted-foreground whitespace-nowrap w-8">✓</th>
                  <th className="text-left p-2.5 font-semibold text-muted-foreground whitespace-nowrap">Data</th>
                  <th className="text-left p-2.5 font-semibold text-muted-foreground whitespace-nowrap">Nº</th>
                  <th className="text-left p-2.5 font-semibold text-muted-foreground whitespace-nowrap">Prestador</th>
                  <th className="text-center p-2.5 font-semibold text-muted-foreground whitespace-nowrap">Regime</th>
                  <th className="text-right p-2.5 font-semibold text-muted-foreground whitespace-nowrap">Valor</th>
                  <th className="text-right p-2.5 font-semibold text-muted-foreground whitespace-nowrap">IR</th>
                  <th className="text-right p-2.5 font-semibold text-muted-foreground whitespace-nowrap">PIS</th>
                  <th className="text-right p-2.5 font-semibold text-muted-foreground whitespace-nowrap">COFINS</th>
                  <th className="text-right p-2.5 font-semibold text-muted-foreground whitespace-nowrap">CSLL</th>
                  <th className="text-right p-2.5 font-semibold text-muted-foreground whitespace-nowrap">INSS</th>
                  <th className="text-right p-2.5 font-semibold text-muted-foreground whitespace-nowrap">ISS</th>
                  <th className="text-right p-2.5 font-semibold text-muted-foreground whitespace-nowrap">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {paginatedNotas.map((n, i) => {
                  const globalIdx = page * PAGE_SIZE + i;
                  const validacao = validacoes.get(globalIdx);
                  const getDivergencia = (imposto: string) => validacao?.divergencias.find(d => d.imposto === imposto);
                  const temDivergencia = validacao && validacao.totalDivergencias > 0;
                  const regime = detectRegimePrestador(n);
                  const isSimplesOrMei = regime === "simples_nacional" || regime === "mei";

                  return (
                    <tr key={i} className={`border-b border-foreground/[0.03] hover:bg-foreground/[0.02] transition-colors ${temDivergencia ? "bg-destructive/[0.03]" : ""}`}>
                      <td className="p-2.5 text-center">
                        {!validacao?.temRegra ? (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        ) : temDivergencia ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-3.5 h-3.5 text-destructive mx-auto" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="bg-popover border shadow-lg p-3">
                                <DivergenciaTooltip divergencias={validacao.divergencias} fv={fv} />
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mx-auto" />
                        )}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">{n.data_emissao || "—"}</td>
                      <td className="p-2.5 font-mono font-medium whitespace-nowrap">{n.numero || "—"}</td>
                      <td className="p-2.5 max-w-[180px] truncate">{n.prestador?.razao_social || "—"}</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {isSimplesOrMei ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 border-yellow-500/40 text-yellow-500">
                                  {regime === "mei" ? "MEI" : "SN"}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="text-[11px]">
                                {validacao?.dispensas?.map((d, idx) => <p key={idx}>{d}</p>) || (
                                  <p>{regime === "mei" ? "MEI — retenções dispensadas" : "Simples Nacional — IR/PIS/COFINS/CSLL dispensados"}</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : regime && regime !== "normal" ? (
                          <Badge variant="outline" className="text-[8px] px-1 py-0">
                            {regime === "lucro_presumido" ? "LP" : regime === "lucro_real" ? "LR" : regime}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">{fv(n.servico?.valor_servicos)}</td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">
                        <CellRetencao valor={n.retencoes?.ir || 0} divergencia={getDivergencia("IR")} fv={fv} />
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">
                        <CellRetencao valor={n.retencoes?.pis || 0} divergencia={getDivergencia("PIS")} fv={fv} />
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">
                        <CellRetencao valor={n.retencoes?.cofins || 0} divergencia={getDivergencia("COFINS")} fv={fv} />
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">
                        <CellRetencao valor={n.retencoes?.csll || 0} divergencia={getDivergencia("CSLL")} fv={fv} />
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">
                        <CellRetencao valor={n.retencoes?.inss || 0} divergencia={getDivergencia("INSS")} fv={fv} />
                      </td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">
                        <CellRetencao valor={n.retencoes?.iss || 0} divergencia={getDivergencia("ISS")} fv={fv} />
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap" style={{ color: accentColor }}>
                        {fv(n.valor_liquido || n.servico?.valor_servicos)}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-foreground/[0.04] font-bold border-t border-foreground/10">
                  <td className="p-2.5" />
                  <td colSpan={4} className="p-2.5 text-right">TOTAIS</td>
                  <td className="p-2.5 text-right font-mono">{fv(totais.valorServicos)}</td>
                  <td className="p-2.5 text-right font-mono">{fv(totais.retIR)}</td>
                  <td className="p-2.5 text-right font-mono">{fv(totais.retPIS)}</td>
                  <td className="p-2.5 text-right font-mono">{fv(totais.retCOFINS)}</td>
                  <td className="p-2.5 text-right font-mono">{fv(totais.retCSLL)}</td>
                  <td className="p-2.5 text-right font-mono">{fv(totais.retINSS)}</td>
                  <td className="p-2.5 text-right font-mono">{fv(totais.retISS)}</td>
                  <td className="p-2.5 text-right font-mono" style={{ color: accentColor }}>{fv(totais.valorLiquido)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="p-3 border-t border-foreground/5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, notas.length)} de {notas.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-mono">{page + 1}/{totalPages}</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
