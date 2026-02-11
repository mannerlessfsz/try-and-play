import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2, ArrowRight, ArrowLeft, Loader2, PlayCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { ApaeRelatorioLinha, ApaeResultado, ApaePlanoContas } from "@/hooks/useApaeSessoes";
import { toast } from "sonner";
import type { ApaeBancoAplicacao } from "@/hooks/useApaeBancoAplicacoes";
import { LancamentoCard } from "./LancamentoCard";
import { BatchEditPanel } from "./BatchEditPanel";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const ITEMS_PER_PAGE = 100;

/** Remove acentos e converte para maiúsculas */
function toUpperNoAccents(str: string): string {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().trim();
}

/** Extrai o histórico a partir do marcador de grupo (S - / A - / S / A) */
function extractHistoricoFromGrupo(text: string): string {
  // Procura "S - " ou "A - " standalone (precedido por espaço, ":" ou início)
  for (const prefix of ["S - ", "A - ", "S -", "A -"]) {
    const idx = text.indexOf(prefix);
    if (idx >= 0 && (idx === 0 || /[\s:]/.test(text[idx - 1]))) {
      return text.substring(idx).trim();
    }
  }
  // Fallback: "S " ou "A " após ":"
  const colonMatch = text.match(/:\s*([SA])\s/);
  if (colonMatch && colonMatch.index !== undefined) {
    return text.substring(colonMatch.index + colonMatch[0].indexOf(colonMatch[1])).trim();
  }
  return text;
}

function normalizeRelatorioName(str: string): string {
  return toUpperNoAccents(str)
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

interface Props {
  linhas: ApaeRelatorioLinha[];
  planoContas: ApaePlanoContas[];
  mapeamentos: ApaeBancoAplicacao[];
  mapeamentosLoading?: boolean;
  refreshMapeamentos?: () => Promise<ApaeBancoAplicacao[]>;
  codigoEmpresa: string;
  resultados: ApaeResultado[];
  onProcessar: (resultados: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[]) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
  onSaveResultadoConta: (id: string, updates: { conta_debito_codigo?: string; conta_credito_codigo?: string }) => Promise<void>;
  onSaveResultadosLote: (ids: string[], updates: { conta_debito_codigo?: string; conta_credito_codigo?: string }) => Promise<void>;
  onSaveStatusResultados: (ids: string[]) => Promise<void>;
  onRefreshResultados: () => Promise<void>;
}

export function ApaeStep4Processamento({ linhas, planoContas, mapeamentos, codigoEmpresa, resultados, onProcessar, onNext, onBack, saving, mapeamentosLoading, refreshMapeamentos, onSaveResultadoConta, onSaveResultadosLote, onSaveStatusResultados, onRefreshResultados }: Props) {
  const [processing, setProcessing] = useState(false);
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebouncedValue(busca, 250);
  const [pagina, setPagina] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "vinculado" | "pendente">("todos");
  const [editados, setEditados] = useState<Record<string, { debito?: string; credito?: string }>>({});

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

  // Only use bank accounts mapped in step 2 (not applications)
  // Build a lookup: nome_relatorio (normalized) → banco.codigo
  const creditoLookup = useMemo(() => {
    const bancosCodigos = new Set(mapeamentos.map((m) => String(m.banco_codigo).trim()));
    const bancosList = planoContas.filter((c) => c.is_banco && bancosCodigos.has(String(c.codigo).trim()));

    const lookup = new Map<string, string>(); // normalized nome_relatorio → banco.codigo
    for (const m of mapeamentos) {
      if (m.nome_relatorio) {
        // Store both exact and normalized versions
        lookup.set(m.nome_relatorio.trim().toLowerCase(), m.banco_codigo);
        // Also store digits-only for fallback
        const digitsOnly = m.nome_relatorio.replace(/\D/g, "");
        if (digitsOnly.length >= 3) {
          lookup.set(`__digits__${digitsOnly}`, m.banco_codigo);
        }
      }
    }
    return { bancosList, lookup };
  }, [mapeamentos, planoContas]);

  const bancosMapeados = creditoLookup.bancosList;

  const bancos = bancosMapeados;

  // Pre-compute lightweight option arrays (stable references for memo)
  const planoOptions = useMemo(() => planoContas.map(c => ({ codigo: c.codigo, descricao: c.descricao })), [planoContas]);
  const bancoOptions = useMemo(() => bancosMapeados.map(c => ({ codigo: c.codigo, descricao: c.descricao })), [bancosMapeados]);

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

  // Apply user edits on top of resultados
  const resultadosComEdits = useMemo(() => {
    return resultados.map((r) => {
      const edit = editados[r.id];
      if (!edit) return r;
      return {
        ...r,
        conta_debito_codigo: edit.debito ?? r.conta_debito_codigo,
        conta_credito_codigo: edit.credito ?? r.conta_credito_codigo,
        status: (edit.debito || r.conta_debito_codigo) && (edit.credito || r.conta_credito_codigo) ? "vinculado" : "pendente",
      };
    });
  }, [resultados, editados]);

  const filtrado = useMemo(() => {
    let lista = resultadosComEdits;
    if (filtroStatus !== "todos") {
      lista = lista.filter((r) => r.status === filtroStatus);
    }
    if (!buscaDebounced.trim()) return lista;
    const termo = buscaDebounced.toLowerCase();
    return lista.filter((r) =>
      r.historico_concatenado?.toLowerCase().includes(termo) ||
      r.conta_debito?.toLowerCase().includes(termo) ||
      r.conta_debito_codigo?.toLowerCase().includes(termo) ||
      r.conta_credito_codigo?.toLowerCase().includes(termo) ||
      r.fornecedor?.toLowerCase().includes(termo) ||
      r.data_pagto?.toLowerCase().includes(termo)
    );
  }, [resultadosComEdits, buscaDebounced, filtroStatus]);

  const totalPaginas = Math.ceil(filtrado.length / ITEMS_PER_PAGE);
  const paginado = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE;
    return filtrado.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [filtrado, pagina]);

  const handleProcessar = async () => {
    setProcessing(true);
    try {
      const mapeamentosAtual = refreshMapeamentos ? await refreshMapeamentos() : mapeamentos;

      // Build lookup: normalized nome_relatorio → banco_codigo
      const lookup = new Map<string, string>();
      const textKeys: string[] = [];
      for (const m of mapeamentosAtual) {
        if (!m.nome_relatorio) continue;
        const key = normalizeRelatorioName(m.nome_relatorio);
        if (key) {
          const codigo = String(m.banco_codigo).trim();
          lookup.set(key, codigo);
          textKeys.push(key);
        }
        const digitsOnly = m.nome_relatorio.replace(/\D/g, "");
        if (digitsOnly.length >= 3) {
          lookup.set(`__digits__${digitsOnly}`, String(m.banco_codigo).trim());
        }
      }
      textKeys.sort((a, b) => b.length - a.length);

      const resultadosProcessados: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[] = [];

      let lote = 1;
      for (const par of pares) {
        const d = par.dados;
        const h = par.historico;
        if (!d) continue;

        const fornecedor = (h?.col_b || "").trim();
        const contaCreditoRaw = (d.col_c || "").trim();
        const centroCusto = (d.col_d || "").trim();
        const historicoOriginalRaw = (d.col_b || "").trim();
        const historicoOriginal = extractHistoricoFromGrupo(historicoOriginalRaw);
        const nDoc = (h?.col_e || "").trim();
        const dataPagto = (d.col_h || "").trim();
        const valorPago = (d.col_i || "").trim();

        let contaDebitoCodigo: string | null = null;
        const matchDebito = planoByDescricao.get(fornecedor.toLowerCase()) || planoByCodigo.get(fornecedor);
        if (matchDebito) contaDebitoCodigo = matchDebito.codigo;

        // Match credit account using nome_relatorio from Step 2 mappings
        let contaCreditoCodigo: string | null = null;
        const contaCreditoNorm = normalizeRelatorioName(contaCreditoRaw);

        // 1) Exact match
        const exactMatch = lookup.get(contaCreditoNorm);
        if (exactMatch) {
          contaCreditoCodigo = exactMatch;
        } else if (contaCreditoNorm) {
          // 2) Partial match (prefer longest key)
          for (const key of textKeys) {
            if (key.length < 4) continue;
            if (contaCreditoNorm.includes(key) || key.includes(contaCreditoNorm)) {
              contaCreditoCodigo = lookup.get(key) || null;
              break;
            }
          }

          // 3) Fallback: digits-only comparison
          if (!contaCreditoCodigo) {
            const reportDigits = contaCreditoRaw.replace(/\D/g, "");
            if (reportDigits.length >= 3) {
              for (const [key, codigo] of lookup.entries()) {
                if (!key.startsWith("__digits__")) continue;
                const bancoDigits = key.replace("__digits__", "");
                if (bancoDigits.includes(reportDigits) || reportDigits.includes(bancoDigits)) {
                  contaCreditoCodigo = codigo;
                  break;
                }
              }
            }
          }
        }

        const parts: string[] = [fornecedor, historicoOriginal];
        if (nDoc) parts.push(nDoc);
        if (centroCusto) parts.push(`(CENTRO ${centroCusto})`);
        parts.push(`PAGO EM ${contaCreditoRaw}`);
        const historicoConcatenado = toUpperNoAccents(parts.join(" "));

        const status = contaDebitoCodigo && contaCreditoCodigo ? "vinculado" : "pendente";

        resultadosProcessados.push({
          par_id: par.parId,
          fornecedor,
          conta_debito: fornecedor,
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

      setEditados({});
      await onProcessar(resultadosProcessados);
      setPagina(1);
      setBusca("");
    } finally {
      setProcessing(false);
    }
  };

  // Debounced DB save — collects IDs and flushes status updates
  const pendingSaveIds = useRef<Set<string>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleStatusFlush = useCallback((ids: string[]) => {
    ids.forEach(id => pendingSaveIds.current.add(id));
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(async () => {
      const idsToFlush = Array.from(pendingSaveIds.current);
      pendingSaveIds.current.clear();
      try {
        await onSaveStatusResultados(idsToFlush);
      } catch {}
    }, 500);
  }, [onSaveStatusResultados]);

  const handleUpdateDebito = useCallback(async (id: string, codigo: string) => {
    setEditados((prev) => ({ ...prev, [id]: { ...prev[id], debito: codigo } }));
    try {
      await onSaveResultadoConta(id, { conta_debito_codigo: codigo });
      scheduleStatusFlush([id]);
    } catch {
      toast.error("Erro ao salvar conta débito");
    }
  }, [onSaveResultadoConta, scheduleStatusFlush]);

  const handleUpdateCredito = useCallback(async (id: string, codigo: string) => {
    setEditados((prev) => ({ ...prev, [id]: { ...prev[id], credito: codigo } }));
    try {
      await onSaveResultadoConta(id, { conta_credito_codigo: codigo });
      scheduleStatusFlush([id]);
    } catch {
      toast.error("Erro ao salvar conta crédito");
    }
  }, [onSaveResultadoConta, scheduleStatusFlush]);

  const handleBatchDebito = useCallback(async (ids: string[], codigo: string) => {
    setEditados((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        next[id] = { ...next[id], debito: codigo };
      }
      return next;
    });
    try {
      await onSaveResultadosLote(ids, { conta_debito_codigo: codigo });
      scheduleStatusFlush(ids);
      const conta = planoOptions.find(c => c.codigo === codigo);
      toast.success(`Conta débito "${conta?.codigo || codigo}" salva em ${ids.length} lançamento(s)`);
    } catch {
      toast.error("Erro ao salvar em lote");
    }
  }, [onSaveResultadosLote, scheduleStatusFlush, planoOptions]);

  const handleBatchCredito = useCallback(async (ids: string[], codigo: string) => {
    setEditados((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        next[id] = { ...next[id], credito: codigo };
      }
      return next;
    });
    try {
      await onSaveResultadosLote(ids, { conta_credito_codigo: codigo });
      scheduleStatusFlush(ids);
      const conta = bancoOptions.find(c => c.codigo === codigo);
      toast.success(`Conta crédito "${conta?.codigo || codigo}" salva em ${ids.length} lançamento(s)`);
    } catch {
      toast.error("Erro ao salvar em lote");
    }
  }, [onSaveResultadosLote, scheduleStatusFlush, bancoOptions]);

  const filteredIds = useMemo(() => filtrado.map((r) => r.id), [filtrado]);
  const pendentesIds = useMemo(() => filtrado.filter((r) => r.status === "pendente").map((r) => r.id), [filtrado]);

  const vinculados = resultadosComEdits.filter((r) => r.status === "vinculado").length;
  const pendentes = resultadosComEdits.filter((r) => r.status === "pendente").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="w-5 h-5 text-primary" />
            Passo 4: Processamento
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gera os lançamentos com histórico formatado. Corrija contas não encontradas usando os seletores.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setFiltroStatus("todos"); setPagina(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filtroStatus === "todos" ? "bg-muted-foreground text-background ring-2 ring-muted-foreground/50" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {resultadosComEdits.length} total
            </button>
            <button
              onClick={() => { setFiltroStatus("todos"); setPagina(1); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
            >
              {pares.length} par(es)
            </button>
            <button
              onClick={() => { setFiltroStatus("todos"); setPagina(1); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
            >
              {planoContas.length} contas
            </button>
            <button
              onClick={() => { setFiltroStatus("todos"); setPagina(1); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
            >
              {bancos.length} banco(s)
            </button>
            {resultadosComEdits.length > 0 && (
              <>
                <button
                  onClick={() => { setFiltroStatus(filtroStatus === "vinculado" ? "todos" : "vinculado"); setPagina(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filtroStatus === "vinculado" ? "bg-emerald-500 text-white ring-2 ring-emerald-500/50 scale-105" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}
                >
                  {vinculados} vinculado(s)
                </button>
                {pendentes > 0 && (
                  <button
                    onClick={() => { setFiltroStatus(filtroStatus === "pendente" ? "todos" : "pendente"); setPagina(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filtroStatus === "pendente" ? "bg-rose-500 text-white ring-2 ring-rose-500/50 scale-105" : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"}`}
                  >
                    {pendentes} pendente(s)
                  </button>
                )}
              </>
            )}
          </div>

          {resultados.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Settings2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                Clique em "Processar" para gerar os lançamentos
              </p>
              <Button onClick={handleProcessar} disabled={processing || saving || pares.length === 0 || mapeamentosLoading}>
                {processing || saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                Processar Relatório
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleProcessar} disabled={processing || saving || mapeamentosLoading}>
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

              {pendentesIds.length > 0 && (buscaDebounced.trim() || filtroStatus !== "todos") && (
                <BatchEditPanel
                  filteredIds={pendentesIds}
                  filteredCount={pendentesIds.length}
                  planoOptions={planoOptions}
                  bancoOptions={bancoOptions}
                  onBatchDebito={handleBatchDebito}
                  onBatchCredito={handleBatchCredito}
                />
              )}

              <div className="space-y-2">
                {paginado.map((r, idx) => {
                  const loteNum = (pagina - 1) * ITEMS_PER_PAGE + idx + 1;
                  return (
                    <LancamentoCard
                      key={r.id}
                      resultado={r}
                      lote={loteNum}
                      codigoEmpresa={codigoEmpresa}
                      planoOptions={planoOptions}
                      bancoOptions={bancoOptions}
                      onUpdateDebito={handleUpdateDebito}
                      onUpdateCredito={handleUpdateCredito}
                    />
                  );
                })}
              </div>

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
