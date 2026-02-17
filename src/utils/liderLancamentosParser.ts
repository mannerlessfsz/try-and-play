/**
 * Transformador de lançamentos (TXT 0100/0200/0300) + exportação em formato tabular.
 * Convertido de Python para TypeScript.
 * 
 * Leitura (layout validado):
 * - 0100 e 0200: posicionais fixos
 * - 0300: prefixo numérico até o primeiro espaço (45 chars), histórico no meio, sufixo final de 7 dígitos
 *   No prefixo 0300:
 *     lote          = [4:9]   (5)
 *     conta_debito  = [9:16]  (7)
 *     conta_credito = [16:23] (7)
 *     valor_raw     = [23:38] (15) com 2 casas implícitas (valor=int/100)
 *     trailer7      = [38:45] (7)
 * 
 * Transformação (por grupo):
 * - Agrupa por: (data, titulo_extraido, fornecedor_extraido)
 * - Só aplica a transformação quando existir ao menos 1 PAGTO e 1 TARIFA no grupo.
 * - Ordem do output do grupo:
 *     1) PAGTO(s):   somente débito (crédito vazio)
 *     2) TARIFA(s):  somente débito (crédito vazio)
 *     3) NOVA:       somente crédito (débito vazio) com valor = soma(PAGTO) + soma(TARIFA)
 *     4) DESCONTO(s): linha(s) original(is), sem alteração, ao final
 */

// -------------------------
// Interfaces
// -------------------------

export interface Reg0100 {
  cnpj: string;
  codigo: string;
  dataIni: Date;
  dataFim: Date;
  indicador: string;
  versao: string;
  sequencial: string;
  raw: string;
}

export interface Reg0200 {
  lote: string;
  flag: string;
  data: Date;
  usuario: string;
  raw: string;
}

export interface Reg0300 {
  lote: string;
  contaDebito: string;
  contaCredito: string;
  valor: number;
  trailer7: string;
  historico: string;
  suffix7: string;
  raw: string;
  requerRevisao?: boolean; // true quando len=44 (trailer com 6 dígitos)
}

export interface Lancamento {
  header: Reg0200;
  detalhe: Reg0300;
}

export interface OutputRow {
  data: string;
  contaDebito: string;
  contaCredito: string;
  valor: string;
  historico: string;
  loteFlag: boolean;
  requerRevisao?: boolean; // true quando len=44 (trailer com 6 dígitos) - obriga correção do usuário

  // Mantém as contas originais do 0300 para permitir regras de exclusão por débito/crédito
  // mesmo quando a transformação zera um dos lados (ex.: PAGTO/TARIFA saem com crédito vazio).
  contaDebitoOriginal?: string;
  contaCreditoOriginal?: string;
}

export interface TransformResult {
  outputLines: string[];
  outputRows: OutputRow[];
  warnings: string[];
  erros: string[];
  totalLancamentos: number;
  totalLinhas: number;
  header0100: Reg0100 | null;
}

// -------------------------
// Utilitários
// -------------------------

function isDigits(s: string): boolean {
  return /^\d+$/.test(s);
}

function parseDateDDMMYYYY(s: string): Date {
  const parts = s.split('/');
  if (parts.length !== 3) {
    throw new Error(`Data inválida (esperado dd/mm/aaaa): ${s}`);
  }
  const [day, month, year] = parts.map(p => parseInt(p, 10));
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (isNaN(date.getTime())) {
    throw new Error(`Data inválida (esperado dd/mm/aaaa): ${s}`);
  }
  return date;
}

function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatValorBR(v: number): string {
  return v.toFixed(2).replace('.', ',');
}

function linhaSaida(data: Date, debito: string | null, credito: string | null, valor: number, historico: string): string {
  const d = formatDateDDMMYYYY(data);
  return `${d} | ${debito || ''} | ${credito || ''} | ${formatValorBR(valor)} | ${historico}`;
}

// -------------------------
// Parsers
// -------------------------

function parse0100(line: string, lineNo: number): Reg0100 {
  if (!line.startsWith("0100")) {
    throw new Error(`L${lineNo}: registro 0100 esperado.`);
  }
  if (line.length < 54) {
    throw new Error(`L${lineNo}: 0100 muito curto (len=${line.length}; esperado >=54).`);
  }

  const cnpj = line.slice(4, 18);
  const codigo = line.slice(18, 23);
  const dtIni = line.slice(23, 33);
  const dtFim = line.slice(33, 43);
  const indicador = line.slice(43, 44);
  const versao = line.slice(44, 46);
  const sequencial = line.slice(46, 54);

  if (!isDigits(cnpj) || cnpj.length !== 14) {
    throw new Error(`L${lineNo}: CNPJ inválido em 0100: ${cnpj}`);
  }
  if (!isDigits(codigo) || codigo.length !== 5) {
    throw new Error(`L${lineNo}: 'codigo' inválido em 0100: ${codigo}`);
  }
  const dataIni = parseDateDDMMYYYY(dtIni);
  const dataFim = parseDateDDMMYYYY(dtFim);
  if (indicador.length !== 1) {
    throw new Error(`L${lineNo}: indicador inválido em 0100: ${indicador}`);
  }
  if (!isDigits(versao) || versao.length !== 2) {
    throw new Error(`L${lineNo}: versao inválida em 0100: ${versao}`);
  }
  if (!isDigits(sequencial) || sequencial.length !== 8) {
    throw new Error(`L${lineNo}: sequencial inválido em 0100: ${sequencial}`);
  }

  return { cnpj, codigo, dataIni, dataFim, indicador, versao, sequencial, raw: line };
}

function parse0200(line: string, lineNo: number): Reg0200 {
  if (!line.startsWith("0200")) {
    throw new Error(`L${lineNo}: registro 0200 esperado.`);
  }
  if (line.length < 40) {
    throw new Error(`L${lineNo}: 0200 muito curto (len=${line.length}; esperado >=40).`);
  }

  const lote = line.slice(4, 9);
  const flag = line.slice(9, 10);
  const dt = line.slice(10, 20);
  const usuario = line.slice(20, 40).trimEnd();

  if (!isDigits(lote) || lote.length !== 5) {
    throw new Error(`L${lineNo}: lote inválido em 0200: ${lote}`);
  }
  if (flag.length !== 1) {
    throw new Error(`L${lineNo}: flag inválida em 0200: ${flag}`);
  }
  const data = parseDateDDMMYYYY(dt);

  return { lote, flag, data, usuario, raw: line };
}

function parse0300(line: string, lineNo: number): Reg0300 {
  if (!line.startsWith("0300")) {
    throw new Error(`L${lineNo}: registro 0300 esperado.`);
  }

  const firstSpace = line.indexOf(" ");
  if (firstSpace === -1) {
    throw new Error(`L${lineNo}: 0300 sem espaço separador (prefixo/histórico).`);
  }

  const prefix = line.slice(0, firstSpace);
  
  // Tratamento especial: se o prefixo tem exatamente 44 caracteres (1 a menos que o esperado),
  // assumimos que o trailer7 tem 6 dígitos em vez de 7
  const isShortPrefix = prefix.length === 44;
  
  if (prefix.length < 44) {
    throw new Error(`L${lineNo}: prefixo 0300 muito curto (len=${prefix.length}; esperado >=44).`);
  }

  const lote = prefix.slice(4, 9);
  const contaDebito = prefix.slice(9, 16);
  const contaCredito = prefix.slice(16, 23);
  const valorRaw = prefix.slice(23, 38);
  
  // Se o prefixo é curto, pega apenas 6 dígitos do trailer, senão pega 7
  const trailer7 = isShortPrefix ? prefix.slice(38, 44) : prefix.slice(38, 45);
  const trailerExpectedLen = isShortPrefix ? 6 : 7;

  if (!isDigits(lote) || lote.length !== 5) {
    throw new Error(`L${lineNo}: lote inválido em 0300: ${lote}`);
  }
  if (!isDigits(contaDebito) || contaDebito.length !== 7) {
    throw new Error(`L${lineNo}: conta_debito inválida em 0300 (7 dígitos): ${contaDebito}`);
  }
  if (!isDigits(contaCredito) || contaCredito.length !== 7) {
    throw new Error(`L${lineNo}: conta_credito inválida em 0300 (7 dígitos): ${contaCredito}`);
  }
  if (!isDigits(valorRaw) || valorRaw.length !== 15) {
    throw new Error(`L${lineNo}: valor_raw inválido em 0300 (15 dígitos): ${valorRaw}`);
  }
  if (!isDigits(trailer7) || trailer7.length !== trailerExpectedLen) {
    throw new Error(`L${lineNo}: trailer inválido em 0300 (${trailerExpectedLen} dígitos): ${trailer7}`);
  }

  const valor = parseInt(valorRaw, 10) / 100.0;

  const trimmed = line.trimEnd();
  if (trimmed.length < 7 || !isDigits(trimmed.slice(-7))) {
    throw new Error(`L${lineNo}: sufixo final de 7 dígitos não encontrado no 0300.`);
  }
  const suffix7 = trimmed.slice(-7);
  const historico = trimmed.slice(firstSpace + 1, -7).trimEnd();

  return { 
    lote, contaDebito, contaCredito, valor, trailer7, historico, suffix7, raw: line,
    requerRevisao: isShortPrefix // Marca para revisão obrigatória quando len=44
  };
}

// -------------------------
// Leitor de Lançamentos
// -------------------------

interface LerLancamentosResult {
  header0100: Reg0100 | null;
  lancamentos: Lancamento[];
  trailer9900: string | null;
  erros: string[];
  totalLancamentos: number;
  totalLinhas: number;
}

/**
 * Normaliza linhas com prefixo alternativo (ex: 02ak012026 → 020000126, 03ak012026 → 030000126).
 * Padrão detectado: 02/03 + 2 letras + 6 dígitos (lote) → 0200/0300 + 5 dígitos (lote sem zero à esquerda).
 */
function normalizarLinha(line: string): string {
  // Detecta: 02 ou 03 + quaisquer 2 caracteres + 6 dígitos de lote
  const m = line.match(/^(0[23]).{2}(\d{6})(.*)$/);
  if (m) {
    const regBase = m[1] + "00"; // 02 → 0200, 03 → 0300
    const lote6 = m[2]; // ex: "012026"
    // Converte lote de 6 para 5 dígitos removendo o primeiro dígito (zero à esquerda)
    const lote5 = lote6.slice(1); // "012026" → "12026" ... mas o original é "00126"
    // Na verdade: o lote original "00126" vira "012026" com um '0' extra no início
    // Então remover o primeiro char do lote6 restaura os 5 dígitos originais
    const resto = m[3];
    return regBase + lote5 + resto;
  }
  return line;
}

function lerLancamentos(content: string): LerLancamentosResult {
  const lines = content.split(/\r?\n/).map(ln => normalizarLinha(ln.replace(/\r$/, '')));

  let header0100: Reg0100 | null = null;
  let trailer9900: string | null = null;
  const erros: string[] = [];
  const lancamentos: Lancamento[] = [];
  let pending0200: Reg0200 | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (!line.trim()) continue;

    const reg = line.slice(0, 4);

    try {
      if (reg === "0100") {
        header0100 = parse0100(line, lineNo);
      } else if (reg === "0200") {
        if (pending0200 !== null) {
          throw new Error(`L${lineNo}: 0200 encontrado mas o 0200 anterior (lote ${pending0200.lote}) não teve 0300.`);
        }
        pending0200 = parse0200(line, lineNo);
      } else if (reg === "0300") {
        const det = parse0300(line, lineNo);
        if (pending0200 === null) {
          throw new Error(`L${lineNo}: 0300 encontrado sem 0200 anterior.`);
        }
        if (det.lote !== pending0200.lote) {
          throw new Error(`L${lineNo}: lote do 0300 (${det.lote}) difere do 0200 pendente (${pending0200.lote}).`);
        }
        lancamentos.push({ header: pending0200, detalhe: det });
        pending0200 = null;
      } else if (reg === "9900") {
        trailer9900 = line;
      } else {
        throw new Error(`L${lineNo}: registro desconhecido ${reg}.`);
      }
    } catch (e) {
      erros.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (pending0200 !== null) {
    erros.push(`EOF: 0200 pendente (lote ${pending0200.lote}) sem 0300 correspondente.`);
  }

  return {
    header0100,
    lancamentos,
    trailer9900,
    erros,
    totalLancamentos: lancamentos.length,
    totalLinhas: lines.length,
  };
}

// -------------------------
// Extrações e Classificação
// -------------------------

function extrairTitulo(historico: string): string | null {
  if (!historico) return null;

  const h = historico.trim();

  // PAGTO TITULO <TITULO>
  let m = h.match(/\bPAGTO\s+TITULO\s+(.+?)(?:\s+\|\s+|$)/i);
  if (m) {
    const titulo = m[1].trim();
    return titulo || null;
  }

  // TITULO NR <TITULO>
  m = h.match(/\bTITULO\s+NR\s+(.+?)(?:\s+\|\s+|$)/i);
  if (m) {
    const titulo = m[1].trim();
    return titulo || null;
  }

  return null;
}

function extrairFornecedor(historico: string): string | null {
  if (!historico) return null;
  if (!historico.includes(" | ")) return null;

  const parts = historico.split(" | ").map(p => p.trim()).filter(p => p);
  if (parts.length < 2) return null;

  return parts[parts.length - 1] || null;
}

type TipoLancamento = 'pagto' | 'tarifa' | 'desconto' | null;

function classificarTipo(historico: string): TipoLancamento {
  const h = historico || "";
  const hu = h.toUpperCase();

  // DESCONTO (variações)
  if (hu.includes("VLR DESCONTO") || hu.includes("VALOR DESCONTO") || hu.includes(" DESCONTO ")) {
    return "desconto";
  }

  // TARIFA(S) (variações)
  if (hu.includes("VLR TARIFAS") || hu.includes("VLR TARIFA") || hu.includes(" TARIFA ") || hu.includes(" TARIFAS ")) {
    return "tarifa";
  }

  // PAGTO TITULO (exato como palavras)
  if (/\bPAGTO\s+TITULO\b/.test(hu)) {
    return "pagto";
  }

  return null;
}

// -------------------------
// Transformação
// -------------------------

interface ItemProcessamento {
  idx: number;
  data: Date;
  titulo: string | null;
  fornecedor: string | null;
  tipo: TipoLancamento;
  lan: Lancamento;
}

export function transformarLancamentos(content: string): TransformResult {
  const res = lerLancamentos(content);
  const lancs = res.lancamentos;

  const items: ItemProcessamento[] = lancs.map((lan, idx) => {
    const data = lan.header.data;
    const hist = lan.detalhe.historico;
    const titulo = extrairTitulo(hist);
    const fornecedor = extrairFornecedor(hist);
    const tipo = classificarTipo(hist);
    return { idx, data, titulo, fornecedor, tipo, lan };
  });

  // Agrupa por (data, titulo, fornecedor) quando título existe; senão, grupo isolado por idx
  type GroupKey = string;
  const groups: Map<GroupKey, ItemProcessamento[]> = new Map();
  const orderKeys: GroupKey[] = [];

  for (const it of items) {
    let key: GroupKey;
    if (it.titulo === null) {
      key = `__NO_TITULO__:${it.idx}`;
    } else {
      key = `${formatDateDDMMYYYY(it.data)}:${it.titulo}:${it.fornecedor || ''}`;
    }
    if (!groups.has(key)) {
      groups.set(key, []);
      orderKeys.push(key);
    }
    groups.get(key)!.push(it);
  }

  const outputLines: string[] = [];
  const outputRows: OutputRow[] = [];
  const warnings: string[] = [];

  const emitRow = (
    data: Date,
    deb: string | null,
    cred: string | null,
    val: number,
    hist: string,
    loteFlag: boolean,
    requerRevisao?: boolean,
    origDeb?: string | null,
    origCred?: string | null
  ) => {
    outputLines.push(linhaSaida(data, deb, cred, val, hist));
    outputRows.push({
      data: formatDateDDMMYYYY(data),
      contaDebito: deb || "",
      contaCredito: cred || "",
      valor: formatValorBR(val),
      historico: hist,
      loteFlag,
      requerRevisao: requerRevisao || false,
      contaDebitoOriginal: (origDeb ?? deb) || "",
      contaCreditoOriginal: (origCred ?? cred) || "",
    });
  };

  const emitOriginal = (groupItems: ItemProcessamento[]) => {
    const sorted = [...groupItems].sort((a, b) => a.idx - b.idx);
    for (const x of sorted) {
      const lan = x.lan;
      emitRow(
        lan.header.data,
        lan.detalhe.contaDebito,
        lan.detalhe.contaCredito,
        lan.detalhe.valor,
        lan.detalhe.historico,
        true,
        lan.detalhe.requerRevisao,
        lan.detalhe.contaDebito,
        lan.detalhe.contaCredito
      );
    }
  };

  for (const key of orderKeys) {
    const g = groups.get(key)!;

    if (key.startsWith("__NO_TITULO__")) {
      const lan = g[0].lan;
      emitRow(
        lan.header.data,
        lan.detalhe.contaDebito,
        lan.detalhe.contaCredito,
        lan.detalhe.valor,
        lan.detalhe.historico,
        true,
        lan.detalhe.requerRevisao,
        lan.detalhe.contaDebito,
        lan.detalhe.contaCredito
      );
      continue;
    }

    const pagtos = g.filter(x => x.tipo === "pagto");
    const tarifas = g.filter(x => x.tipo === "tarifa");
    const descontos = g.filter(x => x.tipo === "desconto");
    const outros = g.filter(x => x.tipo !== "pagto" && x.tipo !== "tarifa" && x.tipo !== "desconto");

    // Aplica somente se houver PAGTO e TARIFA
    if (pagtos.length >= 1 && tarifas.length >= 1) {
      if (outros.length > 0) {
        warnings.push(`Grupo ${key}: há linhas não classificadas (${outros.length}). Mantido original.`);
        emitOriginal(g);
        continue;
      }

      const pagtosSorted = [...pagtos].sort((a, b) => a.idx - b.idx);
      const tarifasSorted = [...tarifas].sort((a, b) => a.idx - b.idx);
      const descontosSorted = [...descontos].sort((a, b) => a.idx - b.idx);

      // NOVA LÓGICA: Emparelhar 1 PAGTO + 1 TARIFA por vez
      // Cada par gera: 2 débitos (PAGTO + TARIFA) → 1 crédito (soma)
      const numPares = Math.min(pagtosSorted.length, tarifasSorted.length);
      
      // PAGTOs ou TARIFAs excedentes (sem par) serão emitidos como original
      const pagtosExcedentes = pagtosSorted.slice(numPares);
      const tarifasExcedentes = tarifasSorted.slice(numPares);

      // Processar cada par PAGTO + TARIFA
      for (let i = 0; i < numPares; i++) {
        const pagto = pagtosSorted[i];
        const tarifa = tarifasSorted[i];
        const lanP = pagto.lan;
        const lanT = tarifa.lan;

        const valorPagto = lanP.detalhe.valor;
        const valorTarifa = lanT.detalhe.valor;
        const valorCredito = valorPagto + valorTarifa;
        const credito = lanP.detalhe.contaCredito;

        const anyRequerRevisao = lanP.detalhe.requerRevisao || lanT.detalhe.requerRevisao;

        // 1) PAGTO só débito: lote_flag=True (inicia novo lote)
        emitRow(
          lanP.header.data,
          lanP.detalhe.contaDebito,
          null,
          valorPagto,
          lanP.detalhe.historico,
          true, // lote_flag = true (novo lote)
          lanP.detalhe.requerRevisao,
          lanP.detalhe.contaDebito,
          lanP.detalhe.contaCredito
        );

        // 2) TARIFA só débito: lote_flag=False
        emitRow(
          lanT.header.data,
          lanT.detalhe.contaDebito,
          null,
          valorTarifa,
          lanT.detalhe.historico,
          false, // lote_flag = false
          lanT.detalhe.requerRevisao,
          lanT.detalhe.contaDebito,
          lanT.detalhe.contaCredito
        );

        // 3) NOVA linha só crédito: lote_flag=False
        emitRow(
          lanP.header.data,
          null,
          credito,
          valorCredito,
          lanP.detalhe.historico,
          false, // lote_flag = false
          anyRequerRevisao,
          null,
          credito
        );
      }

      // Emitir PAGTOs excedentes (sem TARIFA correspondente) como original
      for (const p of pagtosExcedentes) {
        const lan = p.lan;
        emitRow(
          lan.header.data,
          lan.detalhe.contaDebito,
          lan.detalhe.contaCredito,
          lan.detalhe.valor,
          lan.detalhe.historico,
          true,
          lan.detalhe.requerRevisao,
          lan.detalhe.contaDebito,
          lan.detalhe.contaCredito
        );
      }

      // Emitir TARIFAs excedentes (sem PAGTO correspondente) como original
      for (const t of tarifasExcedentes) {
        const lan = t.lan;
        emitRow(
          lan.header.data,
          lan.detalhe.contaDebito,
          lan.detalhe.contaCredito,
          lan.detalhe.valor,
          lan.detalhe.historico,
          true,
          lan.detalhe.requerRevisao,
          lan.detalhe.contaDebito,
          lan.detalhe.contaCredito
        );
      }

      // 4) DESCONTO(s) original(is): lote_flag=True (cada um é lote separado)
      for (const dsc of descontosSorted) {
        const lanD = dsc.lan;
        emitRow(
          lanD.header.data,
          lanD.detalhe.contaDebito,
          lanD.detalhe.contaCredito,
          lanD.detalhe.valor,
          lanD.detalhe.historico,
          true,
          lanD.detalhe.requerRevisao,
          lanD.detalhe.contaDebito,
          lanD.detalhe.contaCredito
        );
      }
    } else {
      // Sem transformação: emitir original
      emitOriginal(g);
    }
  }

  return {
    outputLines,
    outputRows,
    warnings,
    erros: res.erros,
    totalLancamentos: res.totalLancamentos,
    totalLinhas: res.totalLinhas,
    header0100: res.header0100,
  };
}

// -------------------------
// Exportação CSV
// -------------------------

export function gerarCSV(rows: OutputRow[], codigoEmpresa?: string): string {
  let loteNumero = 0;
  const lines = rows.map(row => {
    if (row.loteFlag) {
      loteNumero++;
    }
    const loteOutput = row.loteFlag ? String(loteNumero) : '';
    const codigoOutput = codigoEmpresa || '';
    return `${row.data};${row.contaDebito};${row.contaCredito};${row.valor};${row.historico.toUpperCase()};${loteOutput};${codigoOutput}`;
  });
  return lines.join('\n');
}

export function gerarTXT(rows: OutputRow[], codigoEmpresa?: string): string {
  let loteNumero = 0;
  const lines = rows.map(row => {
    if (row.loteFlag) {
      loteNumero++;
    }
    const loteOutput = row.loteFlag ? String(loteNumero) : '';
    const codigoOutput = codigoEmpresa || '';
    return `${row.data};${row.contaDebito};${row.contaCredito};${row.valor};${row.historico.toUpperCase()};${loteOutput};${codigoOutput}`;
  });
  return lines.join('\n');
}

// -------------------------
// Leitura de arquivo
// -------------------------

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    // Tenta ISO-8859-1 (comum em arquivos contábeis brasileiros)
    reader.readAsText(file, 'ISO-8859-1');
  });
}
