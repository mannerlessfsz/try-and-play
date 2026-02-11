import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, ArrowLeft, Search, ChevronLeft, ChevronRight, FileDown, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import type { ApaeResultado } from "@/hooks/useApaeSessoes";

const ITEMS_PER_PAGE = 100;

interface Props {
  resultados: ApaeResultado[];
  codigoEmpresa: string;
  onBack: () => void;
  sessaoStatus: string;
  onEncerrarSessao: () => Promise<void>;
  onReabrirSessao: () => Promise<void>;
}

export function ApaeStep5Conferencia({ resultados, codigoEmpresa, onBack, sessaoStatus, onEncerrarSessao, onReabrirSessao }: Props) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "vinculado" | "pendente">("todos");

  const vinculados = useMemo(() => resultados.filter((r) => r.status === "vinculado").length, [resultados]);
  const pendentes = resultados.length - vinculados;

  const filtrado = useMemo(() => {
    let lista = resultados;
    if (filtroStatus !== "todos") lista = lista.filter((r) => r.status === filtroStatus);
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

  const handleExportar = async () => {
    if (resultados.length === 0) return;

    const header = "Data;Conta Débito;Conta Crédito;Valor;Histórico;Lote;Código Empresa";
    const lines = resultados.map((r, idx) =>
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
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Conferência</span>
              <Badge variant="secondary" className="text-[10px]">{resultados.length} lanç.</Badge>
              <Badge className="bg-emerald-600 text-[10px]">{vinculados} ok</Badge>
              {pendentes > 0 && <Badge variant="destructive" className="text-[10px]">{pendentes} pend.</Badge>}
            </div>
            <Button size="sm" onClick={handleExportar} disabled={resultados.length === 0}>
              <FileDown className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
            </Button>
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
              {(["todos", "vinculado", "pendente"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filtroStatus === f ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => { setFiltroStatus(f); setPagina(1); }}
                >
                  {f === "todos" ? "Todos" : f === "vinculado" ? "Ok" : "Pend."}
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
                      <TableRow key={r.id}>
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
        <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Sessão encerrada</span>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onReabrirSessao}>
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
