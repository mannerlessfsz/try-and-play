import { readExcelFile } from "@/utils/fileParserUtils";

export interface RazaoLinha {
  conta_codigo: string;
  conta_descricao: string;
  data: string;
  historico: string;
  cta_c_part: string;
  debito: string;
  credito: string;
  saldo: string;
  linha_numero: number;
}

/**
 * Parses a Razão Contábil XLS file.
 * Structure: account headers ("Conta: ...") followed by transaction rows.
 */
export async function parseRazaoContabil(file: File): Promise<RazaoLinha[]> {
  const rows = await readExcelFile(file);
  const resultado: RazaoLinha[] = [];

  let contaCodigo = "";
  let contaDescricao = "";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] ?? "").trim();

    // Detect account header: "Conta:" in first cell
    if (col0.toLowerCase().startsWith("conta:")) {
      // Parse: "Conta:" | number | code | description (or variations)
      // The parsed doc shows: Conta: | 5 | 1.1.1.01.00001 | CAIXA
      // But in the raw XLS it could be differently structured
      // Let's try to extract from the row cells
      const allCells = row.map((c: any) => String(c ?? "").trim()).filter(Boolean);
      
      // Remove "Conta:" prefix from first cell
      const withoutPrefix = col0.replace(/^conta:\s*/i, "").trim();
      
      if (withoutPrefix) {
        // "Conta:5" format - code is in same cell
        // Try to find the account code (digits with dots)
        const codeMatch = allCells.join(" ").match(/(\d+\.\d+[\d.]*)/);
        if (codeMatch) {
          contaCodigo = codeMatch[1];
          // Description is everything after the code
          const fullText = allCells.join(" ");
          const codeIdx = fullText.indexOf(contaCodigo);
          contaDescricao = fullText.substring(codeIdx + contaCodigo.length).trim();
          // Clean up description - remove leading pipes, numbers, etc.
          contaDescricao = contaDescricao.replace(/^[\s|]+/, "").trim();
        } else {
          contaCodigo = withoutPrefix;
          contaDescricao = allCells.slice(1).join(" ");
        }
      } else {
        // "Conta:" is alone, code is in next cells
        const remaining = allCells.slice(1);
        // Find the code pattern
        const codeCell = remaining.find((c: string) => /^\d+\.\d+/.test(c));
        if (codeCell) {
          contaCodigo = codeCell;
          const codeIdx = remaining.indexOf(codeCell);
          contaDescricao = remaining.slice(codeIdx + 1).join(" ").replace(/^[\s|]+/, "").trim();
        } else if (remaining.length >= 2) {
          contaCodigo = remaining[0] || "";
          contaDescricao = remaining.slice(1).join(" ");
        }
      }
      continue;
    }

    // Skip non-data rows (headers, empty, SALDO ANTERIOR, totals)
    if (!contaCodigo) continue;
    if (col0.toLowerCase().includes("saldo anterior")) continue;
    if (col0.toLowerCase().includes("total")) continue;
    if (col0.toLowerCase() === "data") continue;
    if (col0.toLowerCase().includes("razão")) continue;
    if (col0.toLowerCase().includes("empresa:")) continue;
    if (col0.toLowerCase().includes("c.n.p.j")) continue;
    if (col0.toLowerCase().includes("período")) continue;
    if (col0.toLowerCase().includes("consolidado")) continue;
    if (col0.toLowerCase().includes("página")) continue;

    // Try to detect a date in col0 (e.g., "1/1/25", "12/31/25")
    const dateMatch = col0.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/);
    if (!dateMatch) continue;

    // This is a data row
    // Columns: Data | Lote | Histórico (spans multiple cols) | Cta.C.Part. | Débito | Crédito | ... | Saldo
    const data = col0;
    // Histórico is typically in cols 2-6 (merged), Cta.C.Part. col 7, Débito col 8, Crédito col 9
    // But the exact mapping depends on the file. Let's be flexible.
    
    // Find Cta.C.Part. - it's usually a numeric code (digits only, no dots for the code reference)
    // Looking at the data: 2006, 2005, 10225, 10208, etc.
    // The history text often contains text with parentheses (CENTRO ...)
    
    // Strategy: collect all non-empty cells after col 0 and col 1 (lote)
    const historicoParts: string[] = [];
    let ctaCPart = "";
    let debito = "";
    let credito = "";
    let saldo = "";

    // Col 1 is Lote (batch number) - skip
    // Cols 2+ contain history, then Cta.C.Part, then amounts
    const cells = row.map((c: any) => String(c ?? "").trim());
    
    // Find amounts from the right side
    // The last non-empty value is usually Saldo
    // Before that are Crédito and Débito
    const nonEmptyFromRight: { idx: number; val: string }[] = [];
    for (let j = cells.length - 1; j >= 2; j--) {
      if (cells[j]) {
        nonEmptyFromRight.push({ idx: j, val: cells[j] });
      }
    }

    // Parse the numeric values from right
    // Pattern: ... | Cta.C.Part | Débito | Crédito | [empty cols] | Saldo
    // Or: ... | Cta.C.Part | Débito | [empty] | [empty] | Saldo (when only debit)
    // Or: ... | Cta.C.Part | [empty] | Crédito | [empty] | Saldo (when only credit)
    
    // Let's use column positions more directly based on the parsed structure
    // From the parsed document, the structure seems to be:
    // 0:Data, 1:Lote, 2-6:Histórico, 7:Cta.C.Part, 8:Débito, 9:Crédito, 10-12:empty, 13:Saldo
    
    // But with merged cells in Excel, the actual indices might differ
    // Let's try fixed positions first, then fall back
    if (cells.length >= 10) {
      // Try standard layout
      ctaCPart = cells[7] || "";
      debito = cells[8] || "";
      credito = cells[9] || "";
      // Saldo could be at various positions
      for (let j = cells.length - 1; j >= 10; j--) {
        if (cells[j] && /[\d.,]+/.test(cells[j])) {
          saldo = cells[j];
          break;
        }
      }
      // History is cols 2-6
      for (let j = 2; j <= 6 && j < cells.length; j++) {
        if (cells[j]) historicoParts.push(cells[j]);
      }
    } else {
      // Shorter row - try to parse dynamically
      // Everything between lote and the last few numeric values is history
      for (let j = 2; j < cells.length; j++) {
        if (cells[j]) historicoParts.push(cells[j]);
      }
    }

    // If ctaCPart looks like a number, validate
    if (ctaCPart && !/^\d+$/.test(ctaCPart)) {
      // Might be part of history, push it there
      if (ctaCPart) historicoParts.push(ctaCPart);
      ctaCPart = "";
    }

    const historico = historicoParts.join(" ").trim();
    if (!historico && !ctaCPart) continue;

    resultado.push({
      conta_codigo: contaCodigo,
      conta_descricao: contaDescricao,
      data,
      historico,
      cta_c_part: ctaCPart,
      debito,
      credito,
      saldo,
      linha_numero: i + 1,
    });
  }

  return resultado;
}
