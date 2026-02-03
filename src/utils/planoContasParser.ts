/**
 * Parser de Plano de Contas (Excel/CSV)
 * Utiliza utilitários compartilhados de src/utils/fileParserUtils.ts
 */

import { 
  normalizeKey, 
  expandMergedCells, 
  asStringCell, 
  readExcelFile,
  decodeCsvBuffer,
  parseCsvContent 
} from "./fileParserUtils";

export type PlanoContasItem = {
  descricao: string;
  codigo: string;
  classificacao: string;
  cnpj: string; // "00000000000000" quando não existir
};

function findHeaderRow(rows: any[][]): { rowIndex: number; colIndex: Record<string, number> } | null {
  const maxScan = Math.min(rows.length, 80);

  for (let r = 0; r < maxScan; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const normalized = row.map((c) => normalizeKey(c));
    const idxClass = normalized.findIndex((v) => v.includes("classifica"));
    const idxCod = normalized.findIndex((v) => v.includes("codigo") || v === "cod" || v.includes("conta"));
    const idxDesc = normalized.findIndex((v) => v.includes("descricao") || v.includes("descri"));
    const idxCnpj = normalized.findIndex((v) => v.includes("cnpj"));

    // Considera header se encontrar pelo menos 3 colunas-chave
    const hits = [idxClass, idxCod, idxDesc, idxCnpj].filter((i) => i >= 0).length;
    if (hits >= 3 && idxClass >= 0 && idxCod >= 0 && idxDesc >= 0) {
      return {
        rowIndex: r,
        colIndex: {
          classificacao: idxClass,
          codigo: idxCod,
          descricao: idxDesc,
          cnpj: idxCnpj,
        },
      };
    }
  }

  return null;
}

export function parsePlanoContasFromRows(rows: any[][]): PlanoContasItem[] {
  if (!rows || rows.length === 0) return [];

  const header = findHeaderRow(rows);

  // Fallback: assume colunas fixas (A-D)
  const headerRowIndex = header?.rowIndex ?? rows.findIndex((row) => row?.some((c) => String(c ?? "").trim() !== ""));
  if (headerRowIndex === -1) return [];

  const idx = header?.colIndex ?? {
    descricao: 0,
    codigo: 1,
    classificacao: 2,
    cnpj: 3,
  };

  const out: PlanoContasItem[] = [];
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const descricao = asStringCell(row, idx.descricao);
    const codigo = asStringCell(row, idx.codigo);
    const classificacao = asStringCell(row, idx.classificacao);
    const cnpjRaw = idx.cnpj >= 0 ? asStringCell(row, idx.cnpj) : "";
    const cnpj = cnpjRaw ? cnpjRaw.replace(/\D/g, "") : "00000000000000";

    // Ignorar linhas claramente não-dados
    const allBlank = !descricao && !codigo && !classificacao && (!cnpjRaw || cnpjRaw === "0" || cnpjRaw === "00000000000000");
    if (allBlank) continue;

    // Exigir pelo menos descrição ou código para considerar linha válida
    if (!descricao && !codigo) continue;

    out.push({
      descricao,
      codigo,
      classificacao,
      cnpj: cnpj || "00000000000000",
    });
  }

  return out;
}

export async function parsePlanoContasFromCsvFile(file: File): Promise<PlanoContasItem[]> {
  const buffer = await file.arrayBuffer();
  const text = decodeCsvBuffer(buffer);
  const rows = parseCsvContent(text);
  return parsePlanoContasFromRows(rows);
}

export async function parsePlanoContasFromExcelFile(file: File): Promise<PlanoContasItem[]> {
  const rows = await readExcelFile(file);
  return parsePlanoContasFromRows(rows);
}
