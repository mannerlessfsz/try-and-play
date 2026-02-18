import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, ArrowLeft, Search, ChevronLeft, ChevronRight, FileDown, Lock, Unlock, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import type { ApaeResultado } from "@/hooks/useApaeSessoes";
import type { DuplicadoCP } from "./ApaeStep4Processamento";

const ITEMS_PER_PAGE = 100;

interface Props {
  resultados: ApaeResultado[];
  codigoEmpresa: string;
  onBack: () => void;
  sessaoStatus: string;
  onEncerrarSessao: () => Promise<void>;
  onReabrirSessao: () => Promise<void>;
  duplicadosCP?: DuplicadoCP[];
}

export function ApaeStep5Conferencia({ resultados, codigoEmpresa, onBack, sessaoStatus, onEncerrarSessao, onReabrirSessao, duplicadosCP = [] }: Props) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "vinculado" | "pendente" | "ignorado">("todos");

  const ativos = useMemo(() => resultados.filter((r) => r.status !== "ignorado"), [resultados]);
  const vinculados = useMemo(() => resultados.filter((r) => r.status === "vinculado").length, [resultados]);
  const pendentes = useMemo(() => resultados.filter((r) => r.status === "pendente").length, [resultados]);
  const ignorados = useMemo(() => resultados.filter((r) => r.status === "ignorado").length, [resultados]);

  const filtrado = useMemo(() => {
    let lista = resultados;
    if (filtroStatus === "ignorado") {
      lista = lista.filter((r) => r.status === "ignorado");
    } else if (filtroStatus !== "todos") {
      lista = lista.filter((r) => r.status === filtroStatus);
    } else {
      lista = lista.filter((r) => r.status !== "ignorado");
    }
    if (!busca.trim()) return lista;
    const termo = busca.toLowerCase();
    return lista.filter(
      (r) =>
        r.fornecedor?.toLowerCase().includes(termo) ||
        r.historico_concatenado?.toLowerCase().includes(termo) ||
        r.conta_debito_codigo?.toLowerCase().includes(termo) ||
        r.conta_credito_codigo?.toLowerCase().includes(termo)
    );
  }, [resultados, busca, filtroStatus]);

  const totalPaginas = Math.ceil(filtrado.length / ITEMS_PER_PAGE);
  const paginado = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE;
    return filtrado.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [filtrado, pagina]);

  const handleExportarIgnoradosPdf = () => {
    const lista = resultados.filter((r) => r.status === "ignorado");
    if (lista.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = margin;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Lançamentos Ignorados", margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Empresa: ${codigoEmpresa}  |  Gerado em: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}  |  Total: ${lista.length}`, margin, y);
    y += 8;

    doc.setFillColor(60, 60, 70);
    doc.rect(margin, y, pageW - margin * 2, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const cols = [margin + 2, margin + 25, margin + 55, margin + 85, margin + 110, pageW - margin - 2];
    doc.text("Data", cols[0], y + 5);
    doc.text("Débito", cols[1], y + 5);
    doc.text("Crédito", cols[2], y + 5);
    doc.text("Valor", cols[3], y + 5);
    doc.text("Histórico", cols[4], y + 5);
    doc.text("Fornecedor", cols[5], y + 5, { align: "right" });
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 35);
    const maxHistW = cols[5] - cols[4] - 30;

    lista.forEach((r, idx) => {
      if (y > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = margin;
      }
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(245, 245, 250);
        doc.rect(margin, y, pageW - margin * 2, 6, "F");
      }
      doc.setFontSize(7);
      doc.text(r.data_pagto || "-", cols[0], y + 4.5);
      doc.text(r.conta_debito_codigo || "-", cols[1], y + 4.5);
      doc.text(r.conta_credito_codigo || "-", cols[2], y + 4.5);
      doc.text(r.valor_pago || r.valor || "-", cols[3], y + 4.5);
      const hist = r.historico_concatenado || "-";
      const truncHist = doc.getTextWidth(hist) > maxHistW ? hist.substring(0, 80) + "..." : hist;
      doc.text(truncHist, cols[4], y + 4.5);
      const forn = r.fornecedor || "-";
      doc.text(forn.length > 30 ? forn.substring(0, 30) + "..." : forn, cols[5], y + 4.5, { align: "right" });
      y += 6;
    });

    doc.save(`ignorados_${codigoEmpresa}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF de ignorados exportado!");
  };

  const handleExportarDuplicadosPdf = () => {
    if (duplicadosCP.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = margin;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Lançamentos Duplicados (Contas a Pagar × Mov. Caixa)", margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Empresa: ${codigoEmpresa}  |  Gerado em: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}  |  Total: ${duplicadosCP.length}`, margin, y);
    y += 8;

    doc.setFillColor(60, 60, 70);
    doc.rect(margin, y, pageW - margin * 2, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const cols = [margin + 2, margin + 25, margin + 55, margin + 85, margin + 115, pageW - margin - 2];
    doc.text("Data", cols[0], y + 5);
    doc.text("Débito", cols[1], y + 5);
    doc.text("Crédito (Banco)", cols[2], y + 5);
    doc.text("Valor", cols[3], y + 5);
    doc.text("Histórico", cols[4], y + 5);
    doc.text("Sessão C.P.", cols[5], y + 5, { align: "right" });
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 35);
    const maxHistW = cols[5] - cols[4] - 40;

    duplicadosCP.forEach((d, idx) => {
      const r = d.movimento_caixa;
      if (y > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = margin;
      }
      if (idx % 2 === 0) {
        doc.setFillColor(255, 250, 240);
        doc.rect(margin, y, pageW - margin * 2, 6, "F");
      }
      doc.setFontSize(7);
      doc.text(r.data_pagto || "-", cols[0], y + 4.5);
      doc.text(r.conta_debito_codigo || "-", cols[1], y + 4.5);
      doc.text(r.conta_credito_codigo || "-", cols[2], y + 4.5);
      doc.text(r.valor_pago || r.valor || "-", cols[3], y + 4.5);
      const hist = r.historico_concatenado || "-";
      const truncHist = doc.getTextWidth(hist) > maxHistW ? hist.substring(0, 80) + "..." : hist;
      doc.text(truncHist, cols[4], y + 4.5);
      const sessaoNome = d.contas_pagar_sessao_nome || d.contas_pagar_sessao_id.slice(0, 8);
      doc.text(sessaoNome.length > 25 ? sessaoNome.substring(0, 25) + "..." : sessaoNome, cols[5], y + 4.5, { align: "right" });
      y += 6;
    });

    doc.save(`duplicados_cp_mc_${codigoEmpresa}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF de duplicados exportado!");
  };

  const handleExportar = async () => {
    if (ativos.length === 0) return;

    const header = "Data;Conta Débito;Conta Crédito;Valor;Histórico;Lote;Código Empresa";
    const lines = ativos.map((r, idx) =>
      [
        r.data_pagto || "",
        r.conta_debito_codigo || "",
        r.conta_credito_codigo || "",
        r.valor_pago || r.valor || "",
        r.historico_concatenado || "",
        (idx + 1).toString(),
        codigoEmpresa,
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(";")
    );

    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apae_lancamentos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
    if (sessaoStatus !== "concluido") {
      await onEncerrarSessao();
    }
  };

  return (
    <div className="space-y-3">
      {/* Duplicados CP card */}
      {duplicadosCP.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">Lançamentos encontrados em Contas a Pagar</span>
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                  {duplicadosCP.length} duplicado(s)
                </Badge>
              </div>
              <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={handleExportarDuplicadosPdf}>
                <FileText className="w-3.5 h-3.5 mr-1.5" /> PDF Duplicados
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Estes lançamentos de saída do Movimento Caixa já constam em sessões de Contas a Pagar (mesma data e banco) e foram removidos do lote principal.
            </p>
            <ScrollArea className="max-h-[30vh]">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Data</TableHead>
                      <TableHead className="text-[11px]">Débito</TableHead>
                      <TableHead className="text-[11px]">Crédito</TableHead>
                      <TableHead className="text-[11px]">Valor</TableHead>
                      <TableHead className="text-[11px] min-w-[200px]">Histórico</TableHead>
                      <TableHead className="text-[11px]">Sessão C.P.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {duplicadosCP.map((d, idx) => (
                      <TableRow key={idx} className="opacity-70">
                        <TableCell className="text-[11px] whitespace-nowrap py-1">{d.movimento_caixa.data_pagto}</TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap font-mono py-1">{d.movimento_caixa.conta_debito_codigo}</TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap font-mono py-1">{d.movimento_caixa.conta_credito_codigo}</TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap py-1">{d.movimento_caixa.valor_pago || d.movimento_caixa.valor}</TableCell>
                        <TableCell className="text-[10px] font-mono break-all py-1">{d.movimento_caixa.historico_concatenado}</TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap py-1 text-amber-400">{d.contas_pagar_sessao_nome || d.contas_pagar_sessao_id.slice(0, 8)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Conferência</span>
              <Badge variant="secondary" className="text-[10px]">{ativos.length} lanç.</Badge>
              <Badge className="bg-emerald-600 text-[10px]">{vinculados} ok</Badge>
              {pendentes > 0 && <Badge variant="destructive" className="text-[10px]">{pendentes} pend.</Badge>}
              {ignorados > 0 && <Badge variant="outline" className="text-[10px] text-muted-foreground">{ignorados} ignorado(s)</Badge>}
            </div>
            <div className="flex items-center gap-1.5">
              {ignorados > 0 && (
                <Button size="sm" variant="outline" onClick={handleExportarIgnoradosPdf}>
                  <FileText className="w-3.5 h-3.5 mr-1.5" /> PDF Ignorados
                </Button>
              )}
              <Button size="sm" onClick={handleExportar} disabled={ativos.length === 0}>
                <FileDown className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex gap-0.5">
              {(["todos", "vinculado", "pendente", "ignorado"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filtroStatus === f ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => { setFiltroStatus(f); setPagina(1); }}
                >
                  {f === "todos" ? "Todos" : f === "vinculado" ? "Ok" : f === "pendente" ? "Pend." : "Ignorados"}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Data</TableHead>
                    <TableHead className="text-[11px]">Débito</TableHead>
                    <TableHead className="text-[11px]">Crédito</TableHead>
                    <TableHead className="text-[11px]">Valor</TableHead>
                    <TableHead className="text-[11px] min-w-[300px]">Histórico</TableHead>
                    <TableHead className="text-[11px] w-12">Lote</TableHead>
                    <TableHead className="text-[11px]">Empresa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginado.map((r, idx) => {
                    const globalIdx = (pagina - 1) * ITEMS_PER_PAGE + idx + 1;
                    return (
                      <TableRow key={r.id} className={r.status === "ignorado" ? "opacity-40 line-through" : ""}>
                        <TableCell className="text-[11px] whitespace-nowrap py-1">{r.data_pagto}</TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap font-mono py-1">{r.conta_debito_codigo}</TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap font-mono py-1">{r.conta_credito_codigo}</TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap py-1">{r.valor_pago || r.valor}</TableCell>
                        <TableCell className="text-[10px] font-mono break-all py-1">{r.historico_concatenado}</TableCell>
                        <TableCell className="text-[11px] text-center py-1">{globalIdx}</TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap py-1">{codigoEmpresa}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {filtrado.length} resultado(s) — Pág. {pagina}/{totalPaginas}
              </span>
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {sessaoStatus === "concluido" && (
        <div className="glass rounded-xl px-4 py-2.5 flex items-center justify-between border-emerald-500/20 shadow-[0_0_15px_hsl(160_100%_50%/0.05)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_hsl(160_100%_50%/0.5)] animate-pulse" />
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">Sessão encerrada</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={onReabrirSessao}
          >
            <Unlock className="w-3 h-3 mr-1" /> Reabrir
          </Button>
        </div>
      )}

      <div className="flex justify-start">
        <Button variant="outline" size="sm" onClick={onBack} disabled={sessaoStatus === "concluido"}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Voltar
        </Button>
      </div>
    </div>
  );
}
