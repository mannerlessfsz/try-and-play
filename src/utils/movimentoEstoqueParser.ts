/**
 * Parser para relatório "Movimento Individual do Produto"
 * Suporta CSV com separador `;` e formato numérico brasileiro.
 *
 * Layout de colunas (índices após split por `;`):
 *  0  – Data
 *  5  – Documento (NF xxxx / Saldo Anterior / Transporte…)
 * 10  – Entrada Quantidade
 * 12  – Entrada Valor Unitário
 * 16  – Entrada Valor Total
 * 18  – Saída Quantidade
 * 20  – Saída Valor Unitário
 * 24  – Saída Valor Total
 * 27  – Saldo Físico
 * 30  – Saldo Valor Médio
 * 35  – Saldo Valor Total
 */

export interface MovimentoEstoqueRow {
  data: string;            // dd/mm/yyyy
  documento: string;       // "NF 16460"
  nfNumero: string | null; // "16460" (extraído)
  tipo: "entrada" | "saida";
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  saldoFisico: number;
  saldoValorMedio: number;
  saldoValorTotal: number;
}

export interface MovimentoEstoqueParsed {
  empresa: string;
  produto: string;
  periodo: string;
  saldoAnteriorQtd: number;
  saldoAnteriorValorMedio: number;
  saldoAnteriorValorTotal: number;
  movimentos: MovimentoEstoqueRow[];
  totalEntradas: number;
  totalSaidas: number;
  totalEntradaValor: number;
  totalSaidaValor: number;
}

/* ── helpers ── */

function parseBRL(raw: string | undefined): number {
  if (!raw || raw.trim() === "") return 0;
  // "1.919,000" → 1919   |  "127.702,48" → 127702.48
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function extractNfNumber(doc: string): string | null {
  const m = doc.match(/NF\s*(\d+)/i);
  return m ? m[1] : null;
}

const SKIP_DOCS = ["saldo anterior", "transporte da folha anterior", "totais"];

function isSkippable(doc: string): boolean {
  const lower = doc.toLowerCase().trim();
  return SKIP_DOCS.some(s => lower.includes(s));
}

/* ── main parser ── */

export function parseMovimentoEstoqueCSV(content: string): MovimentoEstoqueParsed {
  const lines = content.split(/\r?\n/);

  // Extract metadata from header lines
  const empresa = extractField(lines, 0, 5);
  const periodoLine = lines[1] || "";
  const periodoParts = periodoLine.split(";");
  const periodo = `${(periodoParts[5] || "").trim()} até ${(periodoParts[10] || "").trim()}`;
  const produto = extractField(lines, 2, 5);

  let saldoAnteriorQtd = 0;
  let saldoAnteriorValorMedio = 0;
  let saldoAnteriorValorTotal = 0;
  const movimentos: MovimentoEstoqueRow[] = [];

  for (let i = 10; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === "") continue;

    const cols = line.split(";");
    const data = (cols[0] || "").trim();
    const documento = (cols[5] || "").trim();

    if (!data && !documento) continue;

    // Saldo Anterior line
    if (documento.toLowerCase().includes("saldo anterior")) {
      saldoAnteriorQtd = parseBRL(cols[27]);
      saldoAnteriorValorMedio = parseBRL(cols[30]);
      saldoAnteriorValorTotal = parseBRL(cols[35]);
      continue;
    }

    // Skip non-movement lines
    if (isSkippable(documento)) continue;

    // TOTAIS line (starts with ;TOTAIS)
    const col1 = (cols[1] || "").trim().toLowerCase();
    if (col1 === "totais") continue;

    // Must have a date to be a valid movement line
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) continue;

    const entradaQtd = parseBRL(cols[10]);
    const entradaValUn = parseBRL(cols[12]);
    const entradaValTotal = parseBRL(cols[16]);
    const saidaQtd = parseBRL(cols[18]);
    const saidaValUn = parseBRL(cols[20]);
    const saidaValTotal = parseBRL(cols[24]);
    const saldoFisico = parseBRL(cols[27]);
    const saldoValorMedio = parseBRL(cols[30]);
    const saldoValorTotal = parseBRL(cols[35]);

    if (entradaQtd > 0) {
      movimentos.push({
        data,
        documento,
        nfNumero: extractNfNumber(documento),
        tipo: "entrada",
        quantidade: entradaQtd,
        valorUnitario: entradaValUn,
        valorTotal: entradaValTotal,
        saldoFisico,
        saldoValorMedio,
        saldoValorTotal,
      });
    }

    if (saidaQtd > 0) {
      movimentos.push({
        data,
        documento,
        nfNumero: extractNfNumber(documento),
        tipo: "saida",
        quantidade: saidaQtd,
        valorUnitario: saidaValUn,
        valorTotal: saidaValTotal,
        saldoFisico,
        saldoValorMedio,
        saldoValorTotal,
      });
    }
  }

  const totalEntradas = movimentos
    .filter(m => m.tipo === "entrada")
    .reduce((s, m) => s + m.quantidade, 0);
  const totalSaidas = movimentos
    .filter(m => m.tipo === "saida")
    .reduce((s, m) => s + m.quantidade, 0);
  const totalEntradaValor = movimentos
    .filter(m => m.tipo === "entrada")
    .reduce((s, m) => s + m.valorTotal, 0);
  const totalSaidaValor = movimentos
    .filter(m => m.tipo === "saida")
    .reduce((s, m) => s + m.valorTotal, 0);

  return {
    empresa,
    produto,
    periodo,
    saldoAnteriorQtd,
    saldoAnteriorValorMedio,
    saldoAnteriorValorTotal,
    movimentos,
    totalEntradas,
    totalSaidas,
    totalEntradaValor,
    totalSaidaValor,
  };
}

function extractField(lines: string[], lineIndex: number, colIndex: number): string {
  const line = lines[lineIndex] || "";
  const cols = line.split(";");
  return (cols[colIndex] || "").trim();
}
