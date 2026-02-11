/**
 * Parser especializado para arquivos APAE
 * Lê células diretamente do worksheet para evitar problemas com sheet_to_json
 */
import * as XLSX from "xlsx";
import { expandMergedCells } from "@/utils/fileParserUtils";

/** Lê o valor de uma célula diretamente do worksheet */
function getCellValue(ws: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = ws[addr];
  if (!cell || cell.v === undefined || cell.v === null) return "";
  // For dates, format them
  if (cell.t === "d" && cell.v instanceof Date) {
    const d = cell.v;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return String(cell.v).trim();
}

export interface ApaeRowPair {
  /** 0-based row index of the odd (data) row in the worksheet */
  oddRowIdx: number;
  /** Cell values keyed by column index, from both rows */
  oddCells: Record<number, string>;
  evenCells: Record<number, string>;
}

/**
 * Lê um arquivo Excel APAE e retorna pares de linhas com acesso direto às células
 */
export async function readExcelFileRaw(file: File): Promise<ApaeRowPair[]> {
  const arrayBuffer = await file.arrayBuffer();

  const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
    type: "array",
    cellDates: true,
    sheetStubs: true,
  });

  const sheetName =
    workbook.SheetNames.find((name) => {
      const ws = workbook.Sheets[name];
      return !!ws && !!(ws as any)["!ref"];
    }) ?? workbook.SheetNames[0];

  if (!sheetName) return [];

  const ws = workbook.Sheets[sheetName];
  expandMergedCells(ws);

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const maxCol = Math.min(range.e.c, 8); // columns A-I (0-8)

  const pairs: ApaeRowPair[] = [];

  // Row 0 = header. Pairs start at row 1: odd=data, even=history
  for (let r = 1; r <= range.e.r - 1; r += 2) {
    const oddCells: Record<number, string> = {};
    const evenCells: Record<number, string> = {};

    for (let c = 0; c <= maxCol; c++) {
      oddCells[c] = getCellValue(ws, r, c);
      evenCells[c] = getCellValue(ws, r + 1, c);
    }

    // Skip if the pair looks empty (no fornecedor)
    if (!oddCells[1]) continue;

    pairs.push({ oddRowIdx: r, oddCells, evenCells });
  }

  return pairs;
}
