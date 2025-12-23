// OFX Parser utility - parses OFX files client-side

export interface OFXTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
}

export interface OFXParseResult {
  bankId?: string;
  accountId?: string;
  accountType?: string;
  startDate?: string;
  endDate?: string;
  transactions: OFXTransaction[];
}

export function parseOFX(content: string): OFXParseResult {
  const result: OFXParseResult = {
    transactions: [],
  };

  try {
    // Extract bank info
    const bankIdMatch = content.match(/<BANKID>([^<\n]+)/);
    if (bankIdMatch) result.bankId = bankIdMatch[1].trim();

    const accountIdMatch = content.match(/<ACCTID>([^<\n]+)/);
    if (accountIdMatch) result.accountId = accountIdMatch[1].trim();

    const accountTypeMatch = content.match(/<ACCTTYPE>([^<\n]+)/);
    if (accountTypeMatch) result.accountType = accountTypeMatch[1].trim();

    // Extract date range
    const startDateMatch = content.match(/<DTSTART>([^<\n]+)/);
    if (startDateMatch) result.startDate = formatOFXDate(startDateMatch[1].trim());

    const endDateMatch = content.match(/<DTEND>([^<\n]+)/);
    if (endDateMatch) result.endDate = formatOFXDate(endDateMatch[1].trim());

    // Extract transactions - find all STMTTRN blocks
    const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = transactionRegex.exec(content)) !== null) {
      const transactionBlock = match[1];

      // Extract transaction details
      const typeMatch = transactionBlock.match(/<TRNTYPE>([^<\n]+)/);
      const dateMatch = transactionBlock.match(/<DTPOSTED>([^<\n]+)/);
      const amountMatch = transactionBlock.match(/<TRNAMT>([^<\n]+)/);
      const fitidMatch = transactionBlock.match(/<FITID>([^<\n]+)/);
      const memoMatch = transactionBlock.match(/<MEMO>([^<\n]+)/);
      const nameMatch = transactionBlock.match(/<NAME>([^<\n]+)/);

      if (dateMatch && amountMatch) {
        const amount = parseFloat(amountMatch[1].trim().replace(',', '.'));
        const description = (memoMatch?.[1] || nameMatch?.[1] || 'Sem descrição').trim();
        const transactionType = typeMatch?.[1]?.trim().toUpperCase();

        result.transactions.push({
          id: fitidMatch?.[1]?.trim() || `trn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: formatOFXDate(dateMatch[1].trim()),
          description: description,
          amount: Math.abs(amount),
          type: amount >= 0 || transactionType === 'CREDIT' || transactionType === 'DEP' ? 'credit' : 'debit',
        });
      }
    }

    // Sort transactions by date (newest first)
    result.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error('Error parsing OFX:', error);
  }

  return result;
}

function formatOFXDate(ofxDate: string): string {
  // OFX date format: YYYYMMDDHHMMSS or YYYYMMDD
  if (!ofxDate) return new Date().toISOString().split('T')[0];

  // Remove timezone info if present (e.g., [-3:BRT])
  const cleanDate = ofxDate.replace(/\[.*\]/, '').trim();

  // Extract date parts
  const year = cleanDate.substring(0, 4);
  const month = cleanDate.substring(4, 6);
  const day = cleanDate.substring(6, 8);

  if (year && month && day) {
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file, 'ISO-8859-1'); // OFX files often use this encoding
  });
}
