import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, ChevronLeft, ChevronRight, Download, DollarSign, FileText, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FiscalRelatorioServicoProps {
  notas: any[];
}

export function FiscalRelatorioServico({ notas }: FiscalRelatorioServicoProps) {
  const PAGE_SIZE = 100;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(notas.length / PAGE_SIZE));
  const paginatedNotas = notas.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const fv = (v: number) => {
    if (!v || isNaN(v)) return "R$ 0,00";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

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
    const headers = ["Data", "Número", "Série", "Prestador", "CNPJ Prestador", "Tomador", "CNPJ/CPF Tomador", "Valor Serviços", "ISS", "IR", "PIS", "COFINS", "CSLL", "INSS", "ISS Ret.", "Total Retenções", "Valor Líquido"];
    const rows = notas.map(n => {
      const retTotal = (n.retencoes?.ir || 0) + (n.retencoes?.pis || 0) + (n.retencoes?.cofins || 0) + (n.retencoes?.csll || 0) + (n.retencoes?.inss || 0) + (n.retencoes?.iss || 0);
      return [
        n.data_emissao || "",
        n.numero || "",
        n.serie || "",
        n.prestador?.razao_social || "",
        n.prestador?.cnpj || "",
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
      </div>

      {/* Retenções por tipo */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-5">
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
          ].map((ret, i) => (
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
          <h3 className="text-sm font-bold">Detalhamento por Nota</h3>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-7 text-xs gap-1.5">
            <Download className="w-3 h-3" /> Exportar CSV
          </Button>
        </div>
        <ScrollArea className="max-h-[500px]">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-foreground/5 bg-foreground/[0.02]">
                  <th className="text-left p-2.5 font-semibold text-muted-foreground whitespace-nowrap">Data</th>
                  <th className="text-left p-2.5 font-semibold text-muted-foreground whitespace-nowrap">Nº</th>
                  <th className="text-left p-2.5 font-semibold text-muted-foreground whitespace-nowrap">Série</th>
                  <th className="text-left p-2.5 font-semibold text-muted-foreground whitespace-nowrap">Prestador</th>
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
                  const retTotal = (n.retencoes?.ir || 0) + (n.retencoes?.pis || 0) + (n.retencoes?.cofins || 0) + (n.retencoes?.csll || 0) + (n.retencoes?.inss || 0) + (n.retencoes?.iss || 0);
                  return (
                    <tr key={i} className="border-b border-foreground/[0.03] hover:bg-foreground/[0.02] transition-colors">
                      <td className="p-2.5 whitespace-nowrap">{n.data_emissao || "—"}</td>
                      <td className="p-2.5 font-mono font-medium whitespace-nowrap">{n.numero || "—"}</td>
                      <td className="p-2.5 whitespace-nowrap">{n.serie || "U"}</td>
                      <td className="p-2.5 max-w-[180px] truncate">{n.prestador?.razao_social || "—"}</td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">{fv(n.servico?.valor_servicos)}</td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">{n.retencoes?.ir > 0 ? fv(n.retencoes.ir) : "—"}</td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">{n.retencoes?.pis > 0 ? fv(n.retencoes.pis) : "—"}</td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">{n.retencoes?.cofins > 0 ? fv(n.retencoes.cofins) : "—"}</td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">{n.retencoes?.csll > 0 ? fv(n.retencoes.csll) : "—"}</td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">{n.retencoes?.inss > 0 ? fv(n.retencoes.inss) : "—"}</td>
                      <td className="p-2.5 text-right font-mono whitespace-nowrap">{n.retencoes?.iss > 0 ? fv(n.retencoes.iss) : "—"}</td>
                      <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap" style={{ color: accentColor }}>
                        {fv(n.valor_liquido || n.servico?.valor_servicos)}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-foreground/[0.04] font-bold border-t border-foreground/10">
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
        </ScrollArea>
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
