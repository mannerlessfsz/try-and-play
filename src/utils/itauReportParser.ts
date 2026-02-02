import * as XLSX from "xlsx";

export type ItauPagamentoItem = {
  favorecido: string;
  cpf_cnpj: string;
  tipo_pagamento: string;
  referencia: string;
  data_pagamento: string;
  valor: number;
  status: string;
};

function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function findHeaderRow(rows: any[][]): { rowIndex: number; colIndex: Record<string, number> } | null {
  const maxScan = Math.min(rows.length, 50);

  for (let r = 0; r < maxScan; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const normalized = row.map((c) => normalizeKey(c));
    
    // Procura as colunas do relatório Itaú
    const idxFavorecido = normalized.findIndex((v) => 
      v.includes("favorecido") || v.includes("beneficiario")
    );
    const idxCpfCnpj = normalized.findIndex((v) => 
      v.includes("cpfcnpj") || v.includes("cpf") || v.includes("cnpj")
    );
    const idxTipo = normalized.findIndex((v) => 
      v.includes("tipodepagamento") || v.includes("tipo")
    );
    const idxRef = normalized.findIndex((v) => 
      v.includes("referencia") || v.includes("referenciadaempresa")
    );
    const idxData = normalized.findIndex((v) => 
      v.includes("datadopagamento") || v.includes("data")
    );
    const idxValor = normalized.findIndex((v) => 
      v.includes("valor") || v.includes("valorrs")
    );
    const idxStatus = normalized.findIndex((v) => 
      v.includes("status")
    );

    // Considera header se encontrar pelo menos 4 colunas-chave
    const hits = [idxFavorecido, idxCpfCnpj, idxTipo, idxData, idxValor, idxStatus].filter((i) => i >= 0).length;
    if (hits >= 4 && idxFavorecido >= 0 && idxValor >= 0) {
      return {
        rowIndex: r,
        colIndex: {
          favorecido: idxFavorecido,
          cpf_cnpj: idxCpfCnpj,
          tipo_pagamento: idxTipo,
          referencia: idxRef,
          data_pagamento: idxData,
          valor: idxValor,
          status: idxStatus,
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

function parseValor(valorStr: string): number {
  if (!valorStr) return 0;
  // Remove pontos de milhar e troca vírgula por ponto
  const cleaned = valorStr
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function parseDataBR(dataStr: string): string {
  if (!dataStr) return "";
  // Formato DD/MM/YYYY para YYYY-MM-DD
  const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return dataStr;
}

function cleanCpfCnpj(value: string): string {
  // Remove asteriscos de mascaramento e caracteres especiais
  return value.replace(/[^\d]/g, "");
}

export function parseItauReportFromRows(rows: any[][]): ItauPagamentoItem[] {
  if (!rows || rows.length === 0) return [];

  const header = findHeaderRow(rows);
  if (!header) return [];

  const idx = header.colIndex;
  const out: ItauPagamentoItem[] = [];

  for (let r = header.rowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const favorecido = asStringCell(row, idx.favorecido);
    const cpf_cnpj = cleanCpfCnpj(asStringCell(row, idx.cpf_cnpj));
    const tipo_pagamento = asStringCell(row, idx.tipo_pagamento);
    const referencia = asStringCell(row, idx.referencia);
    const data_pagamento = parseDataBR(asStringCell(row, idx.data_pagamento));
    const valorStr = asStringCell(row, idx.valor);
    const valor = parseValor(valorStr);
    const status = asStringCell(row, idx.status);

    // Ignorar linhas sem dados relevantes
    if (!favorecido && !valor) continue;

    out.push({
      favorecido,
      cpf_cnpj,
      tipo_pagamento,
      referencia,
      data_pagamento,
      valor,
      status,
    });
  }

  return out;
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

export async function parseItauReportFromExcelFile(file: File): Promise<ItauPagamentoItem[]> {
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

  return parseItauReportFromRows(rows);
}
