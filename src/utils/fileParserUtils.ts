/**
 * Utilitários compartilhados para parsing de arquivos Excel/CSV
 * Consolidado para evitar duplicação em parsers específicos
 */

import * as XLSX from "xlsx";

/**
 * Normaliza uma string para busca/comparação de cabeçalhos
 * Remove acentos, espaços e caracteres especiais, deixando apenas letras e números em minúsculo
 */
export function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Expande células mescladas em uma planilha Excel,
 * copiando o valor da célula inicial para todas as células do range mesclado
 */
export function expandMergedCells(worksheet: XLSX.WorkSheet): void {
  const merges = (worksheet as any)["!merges"] as XLSX.Range[] | undefined;
  if (!merges || merges.length === 0) return;

  for (const merge of merges) {
    const startAddr = XLSX.utils.encode_cell(merge.s);
    const startCell = (worksheet as any)[startAddr];
    if (!startCell || startCell.v === undefined) continue;

    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = (worksheet as any)[addr];
        if (!cell || cell.v === undefined || String(cell.v).trim() === "") {
          (worksheet as any)[addr] = { t: startCell.t ?? "s", v: startCell.v };
        }
      }
    }
  }
}

/**
 * Retorna valor de uma célula como string, tratando índices inválidos
 */
export function asStringCell(row: any[], idx: number): string {
  if (idx < 0) return "";
  return String(row?.[idx] ?? "").trim();
}

/**
 * Lê um arquivo Excel e retorna as linhas como array bidimensional
 */
export async function readExcelFile(file: File): Promise<any[][]> {
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

  if (!sheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[sheetName];
  expandMergedCells(worksheet);

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  }) as any[][];

  return rows;
}

/**
 * Decodifica um buffer de CSV tentando diferentes encodings
 * Primeiro tenta UTF-8, depois fallback para Latin1 se detectar mojibake
 */
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  // Remove BOM se presente
  const bytes = new Uint8Array(buffer);
  let start = 0;
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    start = 3; // UTF-8 BOM
  }
  
  const sliced = start > 0 ? buffer.slice(start) : buffer;
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(sliced);

  // Heurística de detecção de mojibake / replacement — inclui padrões comuns de Latin1→UTF8
  if (utf8.includes("\uFFFD") || utf8.includes("Ã£") || utf8.includes("Ã§") || utf8.includes("Ã©") || utf8.includes("�")) {
    return new TextDecoder("latin1").decode(sliced);
  }

  return utf8;
}

/**
 * Parseia conteúdo CSV para array bidimensional
 * Suporta campos entre aspas com delimitadores internos
 */
export function parseCsvContent(text: string, delimiter?: string): any[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Auto-detecta delimitador: conta ocorrências de ; e , na primeira linha (fora de aspas)
  const firstLine = lines[0];
  const sep = delimiter ?? (countOutsideQuotes(firstLine, ";") >= countOutsideQuotes(firstLine, ",") ? ";" : ",");
  
  return lines.map((line) => splitCsvLine(line, sep));
}

/** Conta ocorrências de um caractere fora de campos entre aspas */
function countOutsideQuotes(line: string, char: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === char && !inQuotes) {
      count++;
    }
  }
  return count;
}

/** Divide uma linha CSV respeitando campos entre aspas */
function splitCsvLine(line: string, sep: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parseia valor monetário brasileiro para número
 * Ex: "1.234,56" => 1234.56
 */
export function parseValorBR(valorStr: string): number {
  if (!valorStr) return 0;
  const cleaned = valorStr
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");
  return parseFloat(cleaned) || 0;
}

/**
 * Parseia data brasileira (DD/MM/YYYY) para formato ISO (YYYY-MM-DD)
 */
export function parseDataBR(dataStr: string): string {
  if (!dataStr) return "";
  const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return dataStr;
}

/**
 * Limpa CPF/CNPJ removendo caracteres especiais e máscaras
 */
export function cleanCpfCnpj(value: string): string {
  return value.replace(/[^\d]/g, "");
}
