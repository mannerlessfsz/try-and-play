/**
 * Parser de Relatório de Pagamentos Itaú SISPAG (Excel)
 * Utiliza utilitários compartilhados de src/utils/fileParserUtils.ts
 */

import { 
  normalizeKey, 
  asStringCell, 
  readExcelFile,
  parseValorBR,
  parseDataBR,
  cleanCpfCnpj 
} from "./fileParserUtils";

export type ItauPagamentoItem = {
  favorecido: string;
  cpf_cnpj: string;
  tipo_pagamento: string;
  referencia: string;
  data_pagamento: string;
  valor: number;
  status: string;
};

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
    const valor = parseValorBR(valorStr);
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

export async function parseItauReportFromExcelFile(file: File): Promise<ItauPagamentoItem[]> {
  const rows = await readExcelFile(file);
  return parseItauReportFromRows(rows);
}
