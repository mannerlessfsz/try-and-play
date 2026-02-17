import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2, ArrowRight, ArrowLeft, Loader2, PlayCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { ApaeRelatorioLinha, ApaeResultado, ApaePlanoContas, ApaeSessaoTipo } from "@/hooks/useApaeSessoes";
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

/** Extrai código da conta do texto "CÓDIGO - DESCRIÇÃO" */
function extractCodigoConta(text: string): string | null {
  if (!text) return null;
  const parts = text.split(" - ");
  const codigo = parts[0]?.trim();
  return codigo || null;
}

/** Resolve conta banco via nome_relatorio lookup */
function resolveContaBanco(contaRaw: string, lookup: Map<string, string>, textKeys: string[]): string | null {
  const norm = normalizeRelatorioName(contaRaw);
  // 1) Exact
  const exact = lookup.get(norm);
  if (exact) return exact;
  // 2) Partial
  if (norm) {
    for (const key of textKeys) {
      if (key.length < 4) continue;
      if (norm.includes(key) || key.includes(norm)) {
        return lookup.get(key) || null;
      }
    }
    // 3) Digits fallback
    const digits = contaRaw.replace(/\D/g, "");
    if (digits.length >= 3) {
      for (const [key, codigo] of lookup.entries()) {
        if (!key.startsWith("__digits__")) continue;
        const bd = key.replace("__digits__", "");
        if (bd.includes(digits) || digits.includes(bd)) return codigo;
      }
    }
  }
  return null;
}

/** Processamento para sessões "contas_a_pagar" — lógica original intacta */
function processarContasAPagar(
  pares: { parId: number; dados?: ApaeRelatorioLinha; historico?: ApaeRelatorioLinha }[],
  planoByDescricao: Map<string, ApaePlanoContas>,
  planoByCodigo: Map<string, ApaePlanoContas>,
  lookup: Map<string, string>,
  textKeys: string[],
): Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[] {
  const resultados: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[] = [];

  for (const par of pares) {
    const d = par.dados;
    const h = par.historico;
    if (!d) continue;

    const fornecedor = (h?.col_b || "").trim();
    const contaCreditoRaw = (d.col_c || "").trim();
    const centroCusto = (d.col_d || "").trim();
    const historicoOriginal = (d.col_b || "").trim();
    const nDoc = (h?.col_e || "").trim();
    const dataPagto = (d.col_h || "").trim();
    const valorPago = (d.col_i || "").trim();

    let contaDebitoCodigo: string | null = null;
    const matchDebito = planoByDescricao.get(fornecedor.toLowerCase()) || planoByCodigo.get(fornecedor);
    if (matchDebito) contaDebitoCodigo = matchDebito.codigo;

    const contaCreditoCodigo = resolveContaBanco(contaCreditoRaw, lookup, textKeys);

    const parts: string[] = [fornecedor, historicoOriginal];
    if (nDoc) parts.push(nDoc);
    if (centroCusto) parts.push(`(CENTRO ${centroCusto})`);
    parts.push(`PAGO EM ${contaCreditoRaw}`);
    const historicoConcatenado = extractHistoricoFromGrupo(toUpperNoAccents(parts.join(" ")));

    const status = contaDebitoCodigo && contaCreditoCodigo ? "vinculado" : "pendente";

    resultados.push({
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
  }
  return resultados;
}

/** Processamento para sessões "movimento_caixa"
 *  col_a=DATA, col_b=HISTÓRICO, col_c=CONTA(banco), col_d=CENTRO CUSTO(código conta), col_e=VALOR, col_f=OP(E/S)
 *  E (Entrada) → débito=banco, crédito=código da col_d
 *  S (Saída)   → débito=código da col_d, crédito=banco
 */
function processarMovimentoCaixa(
  linhas: ApaeRelatorioLinha[],
  planoByCodigo: Map<string, ApaePlanoContas>,
  lookup: Map<string, string>,
  textKeys: string[],
): Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[] {
  const resultados: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[] = [];

  const dados = linhas.filter(l => l.tipo_linha === "dados").sort((a, b) => a.linha_numero - b.linha_numero);

  for (const l of dados) {
    const data = (l.col_a || "").trim();
    const historico = (l.col_b || "").trim();
    const contaBancoRaw = (l.col_c || "").trim();
    const centroCustoRaw = (l.col_d || "").trim();
    const valor = (l.col_e || "").trim();
    const op = (l.col_f || "").trim().toUpperCase();

    // Extrair código da conta do centro de custo (formato "CÓDIGO - DESCRIÇÃO")
    const codigoConta = extractCodigoConta(centroCustoRaw);

    // Resolver conta banco via nome_relatorio
    const contaBancoCodigo = resolveContaBanco(contaBancoRaw, lookup, textKeys);

    // Verificar se o código da conta existe no plano
    const contaExiste = codigoConta ? planoByCodigo.has(codigoConta) : false;

    let contaDebitoCodigo: string | null = null;
    let contaCreditoCodigo: string | null = null;

    if (op === "E") {
      // Entrada: débito = banco, crédito = código conta
      contaDebitoCodigo = contaBancoCodigo;
      contaCreditoCodigo = contaExiste ? codigoConta : null;
    } else {
      // Saída: débito = código conta, crédito = banco
      contaDebitoCodigo = contaExiste ? codigoConta : null;
      contaCreditoCodigo = contaBancoCodigo;
    }

    // Histórico concatenado: B + "PAGO EM" + C + "(CENTRO DE CUSTO" + D + ")" + sufixo
    const partes = [historico];
    if (contaBancoRaw) partes.push("PAGO EM " + contaBancoRaw);
    if (centroCustoRaw) partes.push("(CENTRO DE CUSTO " + centroCustoRaw + ")");
    partes.push("CONFORME RELATORIO ERP ARGUS DO PERIODO");
    const historicoConcatenado = toUpperNoAccents(partes.join(" "));

    const status = contaDebitoCodigo && contaCreditoCodigo ? "vinculado" : "pendente";

    resultados.push({
      par_id: l.par_id || 0,
      fornecedor: historico,
      conta_debito: op === "S" ? centroCustoRaw : contaBancoRaw,
      conta_debito_codigo: contaDebitoCodigo,
      centro_custo: centroCustoRaw,
      n_doc: null,
      vencimento: null,
      valor,
      data_pagto: data,
      valor_pago: valor,
      historico_original: historico,
      historico_concatenado: historicoConcatenado,
      conta_credito_codigo: contaCreditoCodigo,
      status,
    });
  }
  return resultados;
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
  sessaoTipo: ApaeSessaoTipo;
}

export function ApaeStep4Processamento({ linhas, planoContas, mapeamentos, codigoEmpresa, resultados, onProcessar, onNext, onBack, saving, mapeamentosLoading, refreshMapeamentos, onSaveResultadoConta, onSaveResultadosLote, onSaveStatusResultados, onRefreshResultados, sessaoTipo }: Props) {
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
  const bancoOptions = useMemo(() => planoContas.map(c => ({ codigo: c.codigo, descricao: c.descricao })), [planoContas]);

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

      let resultadosProcessados: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[];

      if (sessaoTipo === "movimento_caixa") {
        resultadosProcessados = processarMovimentoCaixa(linhas, planoByCodigo, lookup, textKeys);
      } else {
        resultadosProcessados = processarContasAPagar(pares, planoByDescricao, planoByCodigo, lookup, textKeys);
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
    // Só aplicar em registros onde débito está vazio
    const idsVazios = ids.filter((id) => {
      const editado = editados[id];
      if (editado?.debito) return false;
      const original = resultados.find((r) => r.id === id);
      return !original?.conta_debito_codigo;
    });
    if (idsVazios.length === 0) {
      toast.info("Todos os lançamentos filtrados já possuem conta débito preenchida");
      return;
    }
    setEditados((prev) => {
      const next = { ...prev };
      for (const id of idsVazios) {
        next[id] = { ...next[id], debito: codigo };
      }
      return next;
    });
    try {
      await onSaveResultadosLote(idsVazios, { conta_debito_codigo: codigo });
      scheduleStatusFlush(idsVazios);
      const conta = planoOptions.find(c => c.codigo === codigo);
      const pulados = ids.length - idsVazios.length;
      toast.success(`Conta débito "${conta?.codigo || codigo}" salva em ${idsVazios.length} lançamento(s)${pulados > 0 ? ` (${pulados} já preenchido(s) mantido(s))` : ""}`);
    } catch {
      toast.error("Erro ao salvar em lote");
    }
  }, [onSaveResultadosLote, scheduleStatusFlush, planoOptions, editados, resultados]);

  const handleBatchCredito = useCallback(async (ids: string[], codigo: string) => {
    // Só aplicar em registros onde crédito está vazio
    const idsVazios = ids.filter((id) => {
      const editado = editados[id];
      if (editado?.credito) return false;
      const original = resultados.find((r) => r.id === id);
      return !original?.conta_credito_codigo;
    });
    if (idsVazios.length === 0) {
      toast.info("Todos os lançamentos filtrados já possuem conta crédito preenchida");
      return;
    }
    setEditados((prev) => {
      const next = { ...prev };
      for (const id of idsVazios) {
        next[id] = { ...next[id], credito: codigo };
      }
      return next;
    });
    try {
      await onSaveResultadosLote(idsVazios, { conta_credito_codigo: codigo });
      scheduleStatusFlush(idsVazios);
      const conta = bancoOptions.find(c => c.codigo === codigo);
      const pulados = ids.length - idsVazios.length;
      toast.success(`Conta crédito "${conta?.codigo || codigo}" salva em ${idsVazios.length} lançamento(s)${pulados > 0 ? ` (${pulados} já preenchido(s) mantido(s))` : ""}`);
    } catch {
      toast.error("Erro ao salvar em lote");
    }
  }, [onSaveResultadosLote, scheduleStatusFlush, bancoOptions, editados, resultados]);

  const filteredIds = useMemo(() => filtrado.map((r) => r.id), [filtrado]);
  const pendentesIds = useMemo(() => filtrado.filter((r) => r.status === "pendente").map((r) => r.id), [filtrado]);

  const vinculados = resultadosComEdits.filter((r) => r.status === "vinculado").length;
  const pendentes = resultadosComEdits.filter((r) => r.status === "pendente").length;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Processamento</span>
          </div>
          {/* Stats pills with glow */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => { setFiltroStatus("todos"); setPagina(1); }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                filtroStatus === "todos"
                  ? "bg-[hsl(var(--cyan)/0.2)] text-[hsl(var(--cyan))] ring-1 ring-[hsl(var(--cyan)/0.4)] shadow-[0_0_10px_hsl(var(--cyan)/0.15)]"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {resultadosComEdits.length} total
            </button>
            <span className="text-[10px] font-mono text-muted-foreground/40">{pares.length}p · {planoContas.length}c · {bancos.length}b</span>
            {resultadosComEdits.length > 0 && (
              <>
                <button
                  onClick={() => { setFiltroStatus(filtroStatus === "vinculado" ? "todos" : "vinculado"); setPagina(1); }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                    filtroStatus === "vinculado"
                      ? "bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-500/40 shadow-[0_0_10px_hsl(160_100%_50%/0.15)]"
                      : "bg-emerald-500/10 text-emerald-400/70 hover:bg-emerald-500/20"
                  }`}
                >
                  ✓ {vinculados}
                </button>
                {pendentes > 0 && (
                  <button
                    onClick={() => { setFiltroStatus(filtroStatus === "pendente" ? "todos" : "pendente"); setPagina(1); }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                      filtroStatus === "pendente"
                        ? "bg-rose-500/25 text-rose-300 ring-1 ring-rose-500/40 shadow-[0_0_10px_hsl(0_85%_55%/0.15)]"
                        : "bg-rose-500/10 text-rose-400/70 hover:bg-rose-500/20"
                    }`}
                  >
                    ⚠ {pendentes}
                  </button>
                )}
              </>
            )}
          </div>

          {resultados.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Settings2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Clique em "Processar" para gerar os lançamentos</p>
              <Button size="sm" onClick={handleProcessar} disabled={processing || saving || pares.length === 0 || mapeamentosLoading}>
                {processing || saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 mr-1.5" />}
                Processar
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleProcessar} disabled={processing || saving || mapeamentosLoading}>
                  {processing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 mr-1" />}
                  Reprocessar
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                  className="pl-8 h-8 text-xs"
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
                  <span className="text-[11px] text-muted-foreground">
                    {filtrado.length} lanç. — Pág. {pagina}/{totalPaginas}
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
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Voltar
        </Button>
        <Button size="sm" onClick={onNext} disabled={resultados.length === 0}>
          Próximo <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
