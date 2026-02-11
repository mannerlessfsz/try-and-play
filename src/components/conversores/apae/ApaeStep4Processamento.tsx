import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2, ArrowRight, ArrowLeft, Loader2, PlayCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { ApaeRelatorioLinha, ApaeResultado, ApaePlanoContas } from "@/hooks/useApaeSessoes";
import type { ApaeBancoAplicacao } from "@/hooks/useApaeBancoAplicacoes";

const ITEMS_PER_PAGE = 100;

/** Remove acentos e converte para maiúsculas */
function toUpperNoAccents(str: string): string {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().trim();
}

interface Props {
  linhas: ApaeRelatorioLinha[];
  planoContas: ApaePlanoContas[];
  mapeamentos: ApaeBancoAplicacao[];
  codigoEmpresa: string;
  resultados: ApaeResultado[];
  onProcessar: (resultados: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[]) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export function ApaeStep4Processamento({ linhas, planoContas, mapeamentos, codigoEmpresa, resultados, onProcessar, onNext, onBack, saving }: Props) {
  const [processing, setProcessing] = useState(false);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  // Index plano de contas by descricao (lowercase) and codigo for fast lookup
  const planoByDescricao = useMemo(() => {
    const map = new Map<string, ApaePlanoContas>();
    planoContas.forEach((c) => map.set(c.descricao.toLowerCase().trim(), c));
    return map;
  }, [planoContas]);

  const planoByCodigo = useMemo(() => {
    const map = new Map<string, ApaePlanoContas>();
    planoContas.forEach((c) => map.set(c.codigo, c));
    return map;
  }, [planoContas]);

  // Build a set of banco codigos and map from banco descricao -> codigo
  const bancoByCodigo = useMemo(() => {
    const map = new Map<string, ApaePlanoContas>();
    planoContas.filter(c => c.is_banco).forEach((c) => {
      map.set(c.codigo, c);
      map.set(c.descricao.toLowerCase().trim(), c);
    });
    return map;
  }, [planoContas]);

  // Agrupa linhas em pares
  const pares = useMemo(() => {
    const map: Record<number, { dados?: ApaeRelatorioLinha; historico?: ApaeRelatorioLinha }> = {};
    linhas.forEach((l) => {
      if (l.par_id == null) return;
      if (!map[l.par_id]) map[l.par_id] = {};
      if (l.tipo_linha === "dados") map[l.par_id].dados = l;
      else map[l.par_id].historico = l;
    });
    return Object.entries(map)
      .map(([parId, pair]) => ({ parId: Number(parId), ...pair }))
      .sort((a, b) => a.parId - b.parId);
  }, [linhas]);

  // Search & pagination on resultados
  const filtrado = useMemo(() => {
    if (!busca.trim()) return resultados;
    const termo = busca.toLowerCase();
    return resultados.filter((r) =>
      r.historico_concatenado?.toLowerCase().includes(termo) ||
      r.conta_debito?.toLowerCase().includes(termo) ||
      r.conta_debito_codigo?.toLowerCase().includes(termo) ||
      r.conta_credito_codigo?.toLowerCase().includes(termo) ||
      r.data_pagto?.toLowerCase().includes(termo)
    );
  }, [resultados, busca]);

  const totalPaginas = Math.ceil(filtrado.length / ITEMS_PER_PAGE);
  const paginado = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE;
    return filtrado.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [filtrado, pagina]);

  const handleProcessar = async () => {
    setProcessing(true);
    try {
      const resultadosProcessados: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[] = [];

      let lote = 1;
      for (const par of pares) {
        const d = par.dados;
        const h = par.historico;
        if (!d) continue;

        // Dados brutos do relatório
        const fornecedor = (d.col_b || "").trim();        // Col B ímpar = Fornecedor
        const contaDebitoRaw = (d.col_c || "").trim();     // Col C ímpar = Conta débito
        const centroCusto = (d.col_d || "").trim();        // Col D ímpar = Centro custo
        const historicoOriginal = (h?.col_b || "").trim(); // Col B par = Histórico
        const contaCreditoRaw = (d.col_c || "").trim();    // Col C par (linha par) = Conta crédito (banco)
        const nDoc = (h?.col_e || "").trim();              // Col E par = N° Doc
        const dataPagto = (d.col_h || "").trim();          // Col H ímpar = Data
        const valorPago = (d.col_i || "").trim();          // Col I ímpar = Valor

        // --- Conta Débito: procurar fornecedor (Col B par) no plano de contas ---
        let contaDebitoCodigo: string | null = null;
        const matchDebito = planoByDescricao.get(fornecedor.toLowerCase()) || planoByCodigo.get(fornecedor);
        if (matchDebito) {
          contaDebitoCodigo = matchDebito.codigo;
        }

        // --- Conta Crédito: procurar col C par (conta pagamento) nas contas banco ---
        let contaCreditoCodigo: string | null = null;
        const matchCredito = bancoByCodigo.get(contaCreditoRaw.toLowerCase()) || bancoByCodigo.get(contaCreditoRaw);
        if (matchCredito) {
          contaCreditoCodigo = matchCredito.codigo;
        }

        // --- Histórico concatenado ---
        // [Fornecedor (Col B odd) + History (Col B even) + Doc # (Col E even, if present) + (CENTRO + Cost Center Col D odd) + PAGO EM + Account (Col C even)]
        const parts: string[] = [fornecedor, historicoOriginal];
        if (nDoc) parts.push(nDoc);
        if (centroCusto) parts.push(`(CENTRO ${centroCusto})`);
        parts.push(`PAGO EM ${contaCreditoRaw}`);
        const historicoConcatenado = toUpperNoAccents(parts.join(" "));

        const status = contaDebitoCodigo && contaCreditoCodigo ? "vinculado" : "pendente";

        resultadosProcessados.push({
          par_id: par.parId,
          fornecedor,
          conta_debito: contaDebitoRaw,
          conta_debito_codigo: contaDebitoCodigo,
          centro_custo: centroCusto,
          n_doc: nDoc || null,
          vencimento: (d.col_f || "").trim() || null,
          valor: valorPago,
          data_pagto: dataPagto,
          valor_pago: valorPago,
          historico_original: historicoOriginal,
          historico_concatenado: historicoConcatenado,
          conta_credito_codigo: contaCreditoCodigo,
          status,
        });
        lote++;
      }

      await onProcessar(resultadosProcessados);
      setPagina(1);
      setBusca("");
    } finally {
      setProcessing(false);
    }
  };

  const vinculados = resultados.filter((r) => r.status === "vinculado").length;
  const pendentes = resultados.filter((r) => r.status === "pendente").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="w-5 h-5 text-primary" />
            Passo 4: Processamento
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gera os lançamentos com histórico formatado, vinculando contas débito e crédito ao plano de contas
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary">{pares.length} par(es) para processar</Badge>
            <Badge variant="secondary">{planoContas.length} contas no plano</Badge>
            <Badge variant="secondary">{planoContas.filter(c => c.is_banco).length} banco(s)</Badge>
            {resultados.length > 0 && (
              <>
                <Badge className="bg-primary text-primary-foreground">{vinculados} vinculado(s)</Badge>
                {pendentes > 0 && <Badge variant="destructive">{pendentes} pendente(s)</Badge>}
              </>
            )}
          </div>

          {resultados.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Settings2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                Clique em "Processar" para gerar os lançamentos
              </p>
              <Button onClick={handleProcessar} disabled={processing || saving || pares.length === 0}>
                {processing || saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                Processar Relatório
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleProcessar} disabled={processing || saving}>
                  {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
                  Reprocessar
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nos resultados..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="max-h-[70vh]">
                <div className="min-w-[900px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Data</TableHead>
                        <TableHead>Conta Débito</TableHead>
                        <TableHead>Conta Crédito</TableHead>
                        <TableHead className="w-24">Valor</TableHead>
                        <TableHead className="min-w-[250px]">Histórico</TableHead>
                        <TableHead className="w-10">Lote</TableHead>
                        <TableHead className="w-28">Cód. Empresa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginado.map((r, idx) => {
                        const loteNum = (pagina - 1) * ITEMS_PER_PAGE + idx + 1;
                        return (
                          <TableRow key={r.id} className={r.status === "pendente" ? "bg-destructive/5" : ""}>
                            <TableCell className="text-xs whitespace-nowrap">{r.data_pagto || "—"}</TableCell>
                            <TableCell className="text-xs">
                              {r.conta_debito_codigo ? (
                                <span className="font-mono">{r.conta_debito_codigo}</span>
                              ) : (
                                <span className="text-destructive font-medium">{r.conta_debito || "?"}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {r.conta_credito_codigo ? (
                                <span className="font-mono">{r.conta_credito_codigo}</span>
                              ) : (
                                <span className="text-destructive font-medium">?</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap font-mono">{r.valor || "—"}</TableCell>
                            <TableCell className="text-xs max-w-[300px]">
                              <span className="break-words">{r.historico_concatenado}</span>
                            </TableCell>
                            <TableCell className="text-xs font-mono">{loteNum}</TableCell>
                            <TableCell className="text-xs font-mono">{codigoEmpresa}</TableCell>
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
                    {filtrado.length} lançamento(s) — Página {pagina}/{totalPaginas}
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
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={resultados.length === 0}>
          Próximo: Conferência <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
