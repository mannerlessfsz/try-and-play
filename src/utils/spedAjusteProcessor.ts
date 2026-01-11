/**
 * SPED Fiscal Adjustment Processor
 * Processa arquivos SPED e aplica ajustes baseados em planilha de ajustes
 */

export interface AjusteData {
  NF: string;
  NF_KEY: string;
  DT_VENC: Date | string;
  DT_PAG: Date | string;
  DT_DOC_ENTRADA: Date | string;
  VL_AJ_APUR: number;
  ICMS_PROPRIO: number;
  ICMS_ST: number;
  NUM_NF_ENTRADA: string | number;
  AUTENTICACAO: string;
  COD_PART: number;
  SERIE: string;
  SUBSERIE: string;
  CHAVE_NFE: string;
}

export interface ProcessamentoConfig {
  gerarAmbosC197: boolean; // Se true, gera ambos C197; se false, apenas valores > 0
}

export interface ProcessamentoResultado {
  sucesso: boolean;
  conteudoAjustado: string;
  notasProcessadas: number;
  erros: string[];
}

/**
 * Formata valor numérico para o padrão SPED Fiscal:
 * - Duas casas decimais
 * - Vírgula como separador decimal
 * - SEM separador de milhar
 * Ex: 19943.73 -> "19943,73"
 */
export function formatBrlCorrect(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return '';
  }
  
  try {
    const floatValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(floatValue)) {
      return String(value);
    }
    // Formata com 2 casas decimais e troca ponto por vírgula
    return floatValue.toFixed(2).replace('.', ',');
  } catch {
    return String(value);
  }
}

/**
 * Formata data para o padrão SPED: DDMMAAAA
 */
export function formatDateSped(date: Date | string): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}${month}${year}`;
}

/**
 * Processa arquivo SPED aplicando ajustes da planilha
 */
export function processarSpedComAjustes(
  spedContent: string,
  ajustes: AjusteData[],
  config: ProcessamentoConfig
): ProcessamentoResultado {
  const erros: string[] = [];
  let notasProcessadas = 0;
  
  // Cria dicionário de ajustes indexado por NF_KEY
  const ajustesDict = new Map<string, AjusteData>();
  for (const ajuste of ajustes) {
    // Remove prefixo "NF " se existir
    const nfKey = ajuste.NF.replace(/^NF\s*/i, '').trim();
    ajustesDict.set(nfKey, { ...ajuste, NF_KEY: nfKey });
  }
  
  // Divide o SPED em linhas
  const linhasOriginais = spedContent.split(/\r?\n/);
  const novoConteudo: string[] = [];
  
  let i = 0;
  while (i < linhasOriginais.length) {
    const linha = linhasOriginais[i];
    const campos = linha.split('|');
    
    // Detecta registro C100 (Documento Fiscal)
    if (campos.length > 8 && campos[1] === 'C100') {
      const nfAtual = campos[8]; // Campo 08 = NUM_DOC (número da NF)
      
      if (ajustesDict.has(nfAtual)) {
        const ajuste = ajustesDict.get(nfAtual)!;
        
        try {
          // Formata datas e valores
          const venc = formatDateSped(ajuste.DT_VENC);
          const pag = formatDateSped(ajuste.DT_PAG);
          const entrada = formatDateSped(ajuste.DT_DOC_ENTRADA);
          const vlAj = formatBrlCorrect(ajuste.VL_AJ_APUR);
          const icmsProprio = formatBrlCorrect(ajuste.ICMS_PROPRIO);
          const icmsSt = formatBrlCorrect(ajuste.ICMS_ST);
          const numDoc = String(ajuste.NUM_NF_ENTRADA);
          
          // Coleta bloco original (até próximo C100 ou fim)
          const blocoOriginal: string[] = [linha];
          let j = i + 1;
          while (j < linhasOriginais.length && !linhasOriginais[j].startsWith('|C100|')) {
            blocoOriginal.push(linhasOriginais[j]);
            j++;
          }
          
          // Extrai C101 e C190 do bloco original
          const c101 = blocoOriginal.find(l => l.startsWith('|C101|')) || '';
          const c190 = blocoOriginal.find(l => l.startsWith('|C190|')) || '';
          
          // Monta bloco ajustado
          const blocoAjustado: string[] = [linha]; // C100 original
          
          // C101
          if (c101) {
            blocoAjustado.push(c101);
          } else {
            blocoAjustado.push('|C101|0,00|0,00|0,00|');
          }
          
          // C110 - Informação Complementar
          blocoAjustado.push('|C110|4||');
          
          // C112 - Documento de Arrecadação
          blocoAjustado.push(`|C112|0|RJ|${numDoc}|${ajuste.AUTENTICACAO}|${vlAj}|${venc}|${pag}|`);
          
          // C113 - Documento Fiscal Referenciado
          const codPart = String(ajuste.COD_PART).padStart(6, '0');
          blocoAjustado.push(`|C113|0|1|FOR${codPart}|55|${ajuste.SERIE}|${ajuste.SUBSERIE}|${ajuste.NUM_NF_ENTRADA}|${entrada}|${ajuste.CHAVE_NFE}|`);
          
          // C190
          if (c190) {
            blocoAjustado.push(c190);
          }
          
          // C195 - Observações do Lançamento
          blocoAjustado.push('|C195|3||');
          
          // C197 - Outras Obrigações Tributárias
          if (config.gerarAmbosC197) {
            // Gera ambos registros
            blocoAjustado.push(`|C197|RJ10000000|Credito proporcional referente a devolucao de ICMS-ST conforme art. 16 da Resolucao SEFAZ-RJ||||${icmsProprio}||`);
            blocoAjustado.push(`|C197|RJ11100000|Credito proporcional referente a devolucao de ICMS-ST conforme art. 16 da Resolucao SEFAZ-RJ||||${icmsSt}||`);
          } else {
            // Gera apenas os que têm valor > 0
            if (ajuste.ICMS_PROPRIO > 0) {
              blocoAjustado.push(`|C197|RJ10000000|Credito proporcional referente a devolucao de ICMS-ST conforme art. 16 da Resolucao SEFAZ-RJ||||${icmsProprio}||`);
            }
            if (ajuste.ICMS_ST > 0) {
              blocoAjustado.push(`|C197|RJ11100000|Credito proporcional referente a devolucao de ICMS-ST conforme art. 16 da Resolucao SEFAZ-RJ||||${icmsSt}||`);
            }
          }
          
          // Adiciona bloco ajustado ao conteúdo
          novoConteudo.push(...blocoAjustado);
          notasProcessadas++;
          
          // Avança ponteiro para depois do bloco original
          i = j;
          continue;
        } catch (err) {
          erros.push(`Erro ao processar NF ${nfAtual}: ${err}`);
          novoConteudo.push(linha);
        }
      } else {
        novoConteudo.push(linha);
      }
    } else {
      novoConteudo.push(linha);
    }
    
    i++;
  }
  
  return {
    sucesso: erros.length === 0,
    conteudoAjustado: novoConteudo.join('\n'),
    notasProcessadas,
    erros
  };
}

/**
 * Parse de arquivo Excel/CSV de ajustes para array de AjusteData
 */
export function parseAjustesFromCsv(csvContent: string): AjusteData[] {
  const linhas = csvContent.split(/\r?\n/).filter(l => l.trim());
  if (linhas.length < 2) return [];
  
  // Primeira linha é cabeçalho
  const header = linhas[0].split(/[,;\t]/).map(h => h.trim().toUpperCase());
  const ajustes: AjusteData[] = [];
  
  for (let i = 1; i < linhas.length; i++) {
    const valores = linhas[i].split(/[,;\t]/);
    const obj: Record<string, string | number> = {};
    
    header.forEach((col, idx) => {
      obj[col] = valores[idx]?.trim() || '';
    });
    
    try {
      ajustes.push({
        NF: String(obj['NF'] || ''),
        NF_KEY: String(obj['NF'] || '').replace(/^NF\s*/i, ''),
        DT_VENC: obj['DT_VENC'] as string,
        DT_PAG: obj['DT_PAG'] as string,
        DT_DOC_ENTRADA: obj['DT_DOC_ENTRADA'] as string,
        VL_AJ_APUR: parseFloat(String(obj['VL_AJ_APUR'] || '0').replace(',', '.')),
        ICMS_PROPRIO: parseFloat(String(obj['ICMS_PROPRIO'] || '0').replace(',', '.')),
        ICMS_ST: parseFloat(String(obj['ICMS_ST'] || '0').replace(',', '.')),
        NUM_NF_ENTRADA: obj['NUM_NF_ENTRADA'] as string,
        AUTENTICACAO: String(obj['AUTENTICACAO'] || ''),
        COD_PART: parseInt(String(obj['COD_PART'] || '0')),
        SERIE: String(obj['SERIE'] || ''),
        SUBSERIE: String(obj['SUBSERIE'] || ''),
        CHAVE_NFE: String(obj['CHAVE_NFE'] || '')
      });
    } catch {
      console.warn(`Linha ${i + 1} ignorada: formato inválido`);
    }
  }
  
  return ajustes;
}
