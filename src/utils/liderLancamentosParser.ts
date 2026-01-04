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
  if (prefix.length < 45) {
    throw new Error(`L${lineNo}: prefixo 0300 muito curto (len=${prefix.length}; esperado >=45).`);
  }

  const lote = prefix.slice(4, 9);
  const contaDebito = prefix.slice(9, 16);
  const contaCredito = prefix.slice(16, 23);
  const valorRaw = prefix.slice(23, 38);
  const trailer7 = prefix.slice(38, 45);

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
  if (!isDigits(trailer7) || trailer7.length !== 7) {
    throw new Error(`L${lineNo}: trailer7 inválido em 0300 (7 dígitos): ${trailer7}`);
  }

  const valor = parseInt(valorRaw, 10) / 100.0;

  const trimmed = line.trimEnd();
  if (trimmed.length < 7 || !isDigits(trimmed.slice(-7))) {
    throw new Error(`L${lineNo}: sufixo final de 7 dígitos não encontrado no 0300.`);
  }
  const suffix7 = trimmed.slice(-7);
  const historico = trimmed.slice(firstSpace + 1, -7).trimEnd();

  return { lote, contaDebito, contaCredito, valor, trailer7, historico, suffix7, raw: line };
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

function lerLancamentos(content: string): LerLancamentosResult {
  const lines = content.split(/\r?\n/).map(ln => ln.replace(/\r$/, ''));

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

  const emitRow = (data: Date, deb: string | null, cred: string | null, val: number, hist: string, loteFlag: boolean) => {
    outputLines.push(linhaSaida(data, deb, cred, val, hist));
    outputRows.push({
      data: formatDateDDMMYYYY(data),
      contaDebito: deb || "",
      contaCredito: cred || "",
      valor: formatValorBR(val),
      historico: hist,
      loteFlag,
    });
  };

  const emitOriginal = (groupItems: ItemProcessamento[]) => {
    const sorted = [...groupItems].sort((a, b) => a.idx - b.idx);
    for (const x of sorted) {
      const lan = x.lan;
      emitRow(lan.header.data, lan.detalhe.contaDebito, lan.detalhe.contaCredito, lan.detalhe.valor, lan.detalhe.historico, true);
    }
  };

  for (const key of orderKeys) {
    const g = groups.get(key)!;

    if (key.startsWith("__NO_TITULO__")) {
      const lan = g[0].lan;
      emitRow(lan.header.data, lan.detalhe.contaDebito, lan.detalhe.contaCredito, lan.detalhe.valor, lan.detalhe.historico, true);
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

      // Permite múltiplos PAGTO somente se a conta crédito for única
      const creditosPagto = [...new Set(pagtos.map(x => x.lan.detalhe.contaCredito))].sort();
      if (creditosPagto.length !== 1) {
        warnings.push(`Grupo ${key}: múltiplas contas_credito em PAGTO (${creditosPagto.join(', ')}). Mantido original.`);
        emitOriginal(g);
        continue;
      }

      const pagtosSorted = [...pagtos].sort((a, b) => a.idx - b.idx);
      const tarifasSorted = [...tarifas].sort((a, b) => a.idx - b.idx);
      const descontosSorted = [...descontos].sort((a, b) => a.idx - b.idx);

      const somaPagto = pagtosSorted.reduce((acc, p) => acc + p.lan.detalhe.valor, 0);
      const somaTarifas = tarifasSorted.reduce((acc, t) => acc + t.lan.detalhe.valor, 0);
      const credito = creditosPagto[0];

      // Buffer para validar antes de efetivar
      const bufRows: Array<{ data: Date; deb: string | null; cred: string | null; val: number; hist: string; loteFlag: boolean }> = [];

      // 1) PAGTO(s) só débito: lote_flag=True somente na primeira linha
      pagtosSorted.forEach((p, i) => {
        const lanP = p.lan;
        bufRows.push({
          data: lanP.header.data,
          deb: lanP.detalhe.contaDebito,
          cred: null,
          val: lanP.detalhe.valor,
          hist: lanP.detalhe.historico,
          loteFlag: i === 0,
        });
      });

      // 2) TARIFA(s) só débito: lote_flag=False
      for (const t of tarifasSorted) {
        const lanT = t.lan;
        bufRows.push({
          data: lanT.header.data,
          deb: lanT.detalhe.contaDebito,
          cred: null,
          val: lanT.detalhe.valor,
          hist: lanT.detalhe.historico,
          loteFlag: false,
        });
      }

      // 3) NOVA linha só crédito: lote_flag=False
      const histRef = pagtosSorted[0].lan.detalhe.historico;
      const dataRef = pagtosSorted[0].lan.header.data;
      bufRows.push({
        data: dataRef,
        deb: null,
        cred: credito,
        val: somaPagto + somaTarifas,
        hist: histRef,
        loteFlag: false,
      });

      // 4) DESCONTO(s) original(is): lote_flag=True
      for (const dsc of descontosSorted) {
        const lanD = dsc.lan;
        bufRows.push({
          data: lanD.header.data,
          deb: lanD.detalhe.contaDebito,
          cred: lanD.detalhe.contaCredito,
          val: lanD.detalhe.valor,
          hist: lanD.detalhe.historico,
          loteFlag: true,
        });
      }

      // Validação de balanceamento
      let debTotal = somaPagto + somaTarifas;
      let creTotal = somaPagto + somaTarifas;

      for (const dsc of descontosSorted) {
        const lanD = dsc.lan;
        const hasDeb = lanD.detalhe.contaDebito && lanD.detalhe.contaDebito !== "0000000";
        const hasCre = lanD.detalhe.contaCredito && lanD.detalhe.contaCredito !== "0000000";

        if (hasDeb && !hasCre) {
          debTotal += lanD.detalhe.valor;
        } else if (hasCre && !hasDeb) {
          creTotal += lanD.detalhe.valor;
        } else if (hasDeb && hasCre) {
          debTotal += lanD.detalhe.valor;
          creTotal += lanD.detalhe.valor;
        }
      }

      if (Math.abs(debTotal - creTotal) > 0.01) {
        warnings.push(`Grupo ${key}: balanceamento falhou (D=${debTotal.toFixed(2)}, C=${creTotal.toFixed(2)}). Mantido original.`);
        emitOriginal(g);
        continue;
      }

      // Efetivar
      for (const row of bufRows) {
        emitRow(row.data, row.deb, row.cred, row.val, row.hist, row.loteFlag);
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

export function gerarCSV(rows: OutputRow[]): string {
  const header = "Data;Conta Débito;Conta Crédito;Valor;Histórico;Lote";
  let loteNumero = 0;
  const lines = rows.map(row => {
    if (row.loteFlag) {
      loteNumero++;
    }
    const loteOutput = row.loteFlag ? String(loteNumero) : '';
    return `${row.data};${row.contaDebito};${row.contaCredito};${row.valor};${row.historico.toUpperCase()};${loteOutput}`;
  });
  return [header, ...lines].join('\n');
}

export function gerarTXT(rows: OutputRow[]): string {
  return rows.map(row => 
    `${row.data} | ${row.contaDebito} | ${row.contaCredito} | ${row.valor} | ${row.historico}`
  ).join('\n');
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
