import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    toast.success("Arquivo CSV exportado!");
    // Encerrar sessão após exportar
    if (sessaoStatus !== "concluido") {
      await onEncerrarSessao();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="w-5 h-5 text-primary" />
            Passo 5: Conferência e Exportação
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Confira os lançamentos processados e exporte o arquivo final
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge>{resultados.length} lançamento(s)</Badge>
            <Badge className="bg-green-600">{resultados.filter((r) => r.status === "vinculado").length} vinculado(s)</Badge>
            <Badge variant="destructive">{resultados.filter((r) => r.status === "pendente").length} pendente(s)</Badge>
            <div className="flex-1" />
            <Button onClick={handleExportar} disabled={resultados.length === 0}>
              <FileDown className="w-4 h-4 mr-2" /> Exportar CSV
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {(["todos", "vinculado", "pendente"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filtroStatus === f ? "default" : "ghost"}
                  size="sm"
                  onClick={() => { setFiltroStatus(f); setPagina(1); }}
                >
                  {f === "todos" ? "Todos" : f === "vinculado" ? "Vinculados" : "Pendentes"}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="max-h-[70vh]">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Conta Débito</TableHead>
                    <TableHead>Conta Crédito</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="min-w-[350px]">Histórico</TableHead>
                    <TableHead className="w-16">Lote</TableHead>
                    <TableHead>Cód. Empresa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginado.map((r, idx) => {
                    const globalIdx = (pagina - 1) * ITEMS_PER_PAGE + idx + 1;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm whitespace-nowrap">{r.data_pagto}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{r.conta_debito_codigo}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{r.conta_credito_codigo}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{r.valor_pago || r.valor}</TableCell>
                        <TableCell className="text-xs font-mono break-all">{r.historico_concatenado}</TableCell>
                        <TableCell className="text-sm text-center">{globalIdx}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{codigoEmpresa}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {filtrado.length} resultado(s) — Página {pagina}/{totalPaginas}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {sessaoStatus === "concluido" && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Sessão encerrada — CSV exportado com sucesso</span>
            </div>
            <Button variant="outline" size="sm" onClick={onReabrirSessao}>
              <Unlock className="w-4 h-4 mr-2" /> Reabrir para edição
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={sessaoStatus === "concluido"}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    </div>
  );
}
