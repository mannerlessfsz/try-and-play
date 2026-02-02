import * as XLSX from "xlsx";

export type PlanoContasItem = {
  descricao: string;
  codigo: string;
  classificacao: string;
  cnpj: string; // "00000000000000" quando não existir
};

function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    // remove diacríticos
    .replace(/\p{Diacritic}/gu, "")
    // remove qualquer coisa que atrapalhe o match
    .replace(/[^a-z0-9]/g, "");
}

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

function asStringCell(row: any[], idx: number): string {
  if (idx < 0) return "";
  return String(row?.[idx] ?? "").trim();
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

function decodeCsvSmart(buffer: ArrayBuffer): string {
  // Primeiro tenta UTF-8
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

  // Heurística simples de "mojibake" / replacement
  if (utf8.includes("\uFFFD") || utf8.includes("Ã") || utf8.includes("�")) {
    // latin1 (ISO-8859-1) costuma ser o padrão desses exports
    return new TextDecoder("latin1").decode(buffer);
  }

  return utf8;
}

export async function parsePlanoContasFromCsvFile(file: File): Promise<PlanoContasItem[]> {
  const buffer = await file.arrayBuffer();
  const text = decodeCsvSmart(buffer);

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Normalmente vem em ';' (como seu exemplo). Se não, tenta ','
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const rows = lines.map((line) => line.split(delimiter));

  return parsePlanoContasFromRows(rows);
}

function expandMergedCells(worksheet: XLSX.WorkSheet) {
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

export async function parsePlanoContasFromExcelFile(file: File): Promise<PlanoContasItem[]> {
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

  return parsePlanoContasFromRows(rows);
}
