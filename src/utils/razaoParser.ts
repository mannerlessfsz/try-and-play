/**
 * Parser de Razão Contábil (Excel/XLS)
 * Extrai lançamentos agrupados por conta contábil
 */

import { readExcelFile, asStringCell, normalizeKey } from "./fileParserUtils";

export type RazaoEntry = {
  contaCodigo: string;
  contaDescricao: string;
  data: string;
  lote: string;
  historico: string;
  ctaCPart: string;
  debito: number;
  credito: number;
};

/** Parse valor numérico no formato brasileiro (1.234,56) */
function parseValor(v: any): number {
  if (v == null || v === "") return 0;
  const s = String(v).replace(/\./g, "").replace(",", ".").trim();
  return parseFloat(s) || 0;
}

/** Detecta posições das colunas a partir do header do Razão */
function detectColumns(rows: any[][]): {
  colHistorico: number;
  colCtaCPart: number;
  colDebito: number;
  colCredito: number;
  headerRow: number;
} {
  const defaults = { colHistorico: 2, colCtaCPart: 7, colDebito: 8, colCredito: 9, headerRow: -1 };

  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const norm = row.map((c) => normalizeKey(c));

    const idxData = norm.findIndex((v) => v === "data");
    const idxHist = norm.findIndex((v) => v.includes("histor"));
    const idxCta = norm.findIndex((v) => v.includes("ctacpart") || v.includes("cpart") || v.includes("contrapartida"));
    const idxDeb = norm.findIndex((v) => v.includes("debito") || v.includes("deb"));
    const idxCred = norm.findIndex((v) => v.includes("credito") || v.includes("cred"));

    if (idxData >= 0 && idxDeb >= 0) {
      return {
        colHistorico: idxHist >= 0 ? idxHist : defaults.colHistorico,
        colCtaCPart: idxCta >= 0 ? idxCta : defaults.colCtaCPart,
        colDebito: idxDeb,
        colCredito: idxCred >= 0 ? idxCred : idxDeb + 1,
        headerRow: i,
      };
    }
  }

  return defaults;
}

/** Extrai código e descrição da conta de uma linha "Conta:" */
function parseContaHeader(row: any[]): { codigo: string; descricao: string } | null {
  let codigo = "";
  let descricao = "";

  for (let j = 1; j < row.length; j++) {
    const val = String(row[j] ?? "").trim();
    if (!val) continue;
    // Código da conta: padrão com pontos (X.X.X.XX.XXXXX)
    if (!codigo && /^\d+[\.\d]+\d$/.test(val)) {
      codigo = val;
    } else if (codigo && !descricao && !/^\d+$/.test(val)) {
      descricao = val;
      break;
    }
  }

  return codigo ? { codigo, descricao } : null;
}

export async function parseRazaoFromExcelFile(file: File): Promise<RazaoEntry[]> {
  const rows = await readExcelFile(file);
  const { colHistorico, colCtaCPart, colDebito, colCredito } = detectColumns(rows);

  const entries: RazaoEntry[] = [];
  let currentCodigo = "";
  let currentDescricao = "";

  for (const row of rows) {
    if (!Array.isArray(row) || row.length === 0) continue;

    const colA = String(row[0] ?? "").trim();

    // Detectar cabeçalho de conta: "Conta:" na coluna A
    if (colA.toLowerCase().startsWith("conta")) {
      const parsed = parseContaHeader(row);
      if (parsed) {
        currentCodigo = parsed.codigo;
        currentDescricao = parsed.descricao;
      }
      continue;
    }

    // Pular linhas sem data válida (DD/MM/YY ou DD/MM/YYYY)
    if (!/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(colA)) continue;

    const historico = asStringCell(row, colHistorico);

    // Pular "SALDO ANTERIOR" e "TOTAIS"
    const histUpper = historico.toUpperCase();
    if (histUpper.includes("SALDO ANTERIOR") || histUpper.includes("TOTAIS")) continue;

    const ctaCPart = asStringCell(row, colCtaCPart);
    const debito = parseValor(row[colDebito]);
    const credito = parseValor(row[colCredito]);

    if (!ctaCPart && debito === 0 && credito === 0) continue;

    entries.push({
      contaCodigo: currentCodigo,
      contaDescricao: currentDescricao,
      data: colA,
      lote: String(row[1] ?? "").trim(),
      historico,
      ctaCPart,
      debito,
      credito,
    });
  }

  return entries;
}

/**
 * Constrói lookup de fornecedor → código da conta débito a partir do Razão.
 * Lógica: se o fornecedor aparece no histórico de um lançamento a CRÉDITO,
 * o Cta.C.Part. é a conta que foi debitada.
 */
export function buildFornecedorDebitoLookup(entries: RazaoEntry[]): Map<string, string> {
  const lookup = new Map<string, string>();
  // Usar apenas entradas com crédito (pagamentos)
  const creditEntries = entries.filter((e) => e.credito > 0 && e.ctaCPart);

  for (const entry of creditEntries) {
    // Normalizar histórico para busca
    const histNorm = entry.historico
      .toUpperCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();

    if (histNorm && !lookup.has(histNorm)) {
      lookup.set(histNorm, entry.ctaCPart);
    }
  }

  return lookup;
}

/**
 * Constrói lookup de código CENTRO → código da conta débito a partir do Razão.
 * Extrai padrões como "(CENTRO X.X.X.X.X - ...)" e mapeia para o Cta.C.Part.
 * mais frequente.
 */
export function buildCentroDebitoLookup(entries: RazaoEntry[]): Map<string, string> {
  const centroFreq = new Map<string, Map<string, number>>(); // centro → (ctaCPart → count)

  for (const entry of entries) {
    if (!entry.ctaCPart) continue;
    // Extrair todos os códigos CENTRO do histórico
    const centroMatches = entry.historico.matchAll(/CENTRO\s+([\d\.]+)/gi);
    for (const match of centroMatches) {
      const centroCode = match[1].trim();
      if (!centroFreq.has(centroCode)) centroFreq.set(centroCode, new Map());
      const freq = centroFreq.get(centroCode)!;
      freq.set(entry.ctaCPart, (freq.get(entry.ctaCPart) || 0) + 1);
    }
  }

  // Para cada centro, pegar o ctaCPart mais frequente
  const lookup = new Map<string, string>();
  for (const [centro, freqMap] of centroFreq) {
    let maxCount = 0;
    let bestCode = "";
    for (const [code, count] of freqMap) {
      if (count > maxCount) {
        maxCount = count;
        bestCode = code;
      }
    }
    if (bestCode) lookup.set(centro, bestCode);
  }

  return lookup;
}
