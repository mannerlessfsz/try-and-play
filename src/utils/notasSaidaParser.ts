/**
 * Parser para relatório "Relação de Notas de Saída" (Domínio Sistemas)
 * CSV com separador `;` e colunas vazias intercaladas.
 *
 * Layout (índices após split por `;`):
 *  0  – Emissão (dd/mm/yyyy)
 *  7  – Estado (UF destino)
 * 10  – Documento (número da nota, sem prefixo)
 * 13  – Acumulador
 * 15  – Valor Contábil (formato BR)
 * 17  – CFOP
 */

export interface NotaSaidaRow {
  emissao: string;          // dd/mm/yyyy
  estado: string;           // UF destino (MT, SP, MG…)
  documento: string;        // Normalizado: "NF 6591"
  documentoNumero: string;  // Número puro: "6591"
  acumulador: string;
  valorContabil: number;
  cfop: string;
}

export interface NotasSaidaParsed {
  empresa: string;
  cnpj: string;
  dataEmissaoRelatorio: string;
  notas: NotaSaidaRow[];
  totalValor: number;
}

/* ── helpers ── */

function parseBRL(raw: string | undefined): number {
  if (!raw || raw.trim() === "") return 0;
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Normaliza número de documento para formato "NF xxxx"
 * Se já tem prefixo "NF", mantém; senão adiciona.
 */
export function normalizeNF(doc: string): string {
  const trimmed = doc.trim();
  if (/^NF\s+/i.test(trimmed)) return trimmed;
  return `NF ${trimmed}`;
}

/* ── main parser ── */

export function parseNotasSaidaCSV(content: string): NotasSaidaParsed {
  const lines = content.split(/\r?\n/);

  // Metadata from header lines
  const empresaLine = lines[0] || "";
  const empresaCols = empresaLine.split(";");
  const empresa = (empresaCols[3] || "").trim();

  const cnpjLine = lines[1] || "";
  const cnpjCols = cnpjLine.split(";");
  const cnpj = (cnpjCols[3] || "").trim();

  const emissaoRelatorio = (cnpjCols[20] || cnpjCols[19] || "").trim();

  // Find header row (contains "Emissão")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    if (lines[i].toLowerCase().includes("emiss")) {
      headerIdx = i;
      break;
    }
  }

  const notas: NotaSaidaRow[] = [];
  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 8;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === "") continue;

    const cols = line.split(";");
    const emissao = (cols[0] || "").trim();

    // Must have a valid date to be a data line
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(emissao)) continue;

    const estado = (cols[7] || "").trim();
    const documentoNumero = (cols[10] || "").trim();
    const acumulador = (cols[13] || "").trim();
    const valorContabil = parseBRL(cols[15]);
    const cfop = (cols[17] || "").trim();

    if (!documentoNumero) continue;

    notas.push({
      emissao,
      estado,
      documento: normalizeNF(documentoNumero),
      documentoNumero,
      acumulador,
      valorContabil,
      cfop,
    });
  }

  const totalValor = notas.reduce((s, n) => s + n.valorContabil, 0);

  return {
    empresa,
    cnpj,
    dataEmissaoRelatorio: emissaoRelatorio,
    notas,
    totalValor,
  };
}
