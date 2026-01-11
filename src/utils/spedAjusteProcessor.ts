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
/**
 * Parse de número que pode estar em notação científica ou formato brasileiro
 * Ex: "1.23E+05" -> 123000, "1234,56" -> 1234.56
 */
export function parseNumeroSeguro(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  let strValue = String(value).trim();
  
  // Se contém E ou e (notação científica), parseFloat já lida
  if (/[eE]/.test(strValue)) {
    const parsed = parseFloat(strValue);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  // Remove pontos de milhar e troca vírgula decimal por ponto
  // Detecta se é formato brasileiro (1.234,56) ou americano (1,234.56)
  if (strValue.includes(',')) {
    // Se tem vírgula seguida de apenas 1-2 dígitos no final, é decimal brasileiro
    if (/,\d{1,2}$/.test(strValue)) {
      strValue = strValue.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano com vírgula como milhar
      strValue = strValue.replace(/,/g, '');
    }
  }
  
  const parsed = parseFloat(strValue);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatBrlCorrect(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return '';
  }
  
  try {
    const floatValue = typeof value === 'number' ? value : parseNumeroSeguro(value);
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
          
          // Coleta bloco original (até próximo C100, C200, C300, etc. ou fim do bloco C)
          const blocoOriginal: string[] = [linha];
          let j = i + 1;
          while (j < linhasOriginais.length) {
            const linhaProx = linhasOriginais[j];
            const camposProx = linhaProx.split('|');
            // Para se encontrar outro C100 ou registros de outro bloco
            if (camposProx[1] === 'C100' || 
                (camposProx[1]?.startsWith('C') && parseInt(camposProx[1].substring(1)) >= 200) ||
                camposProx[1]?.startsWith('D') ||
                camposProx[1]?.startsWith('E') ||
                camposProx[1]?.startsWith('G') ||
                camposProx[1]?.startsWith('H') ||
                camposProx[1]?.startsWith('K') ||
                camposProx[1] === '9999') {
              break;
            }
            blocoOriginal.push(linhaProx);
            j++;
          }
          
          // Agora vamos injetar os registros no bloco mantendo ordem correta
          // Ordem SPED: C100 > C101 > C105 > C110 > C111 > C112 > C113 > ... > C170 > ... > C190 > C195 > C197 > ...
          
          const novoBloco: string[] = [];
          let c110Inserido = false;
          let c195Inserido = false;
          
          // Monta registros a injetar
          const c110 = '|C110|4||';
          const c112 = `|C112|0|RJ|${numDoc}|${ajuste.AUTENTICACAO}|${vlAj}|${venc}|${pag}|`;
          const codPart = String(ajuste.COD_PART).padStart(6, '0');
          const c113 = `|C113|0|1|FOR${codPart}|55|${ajuste.SERIE}|${ajuste.SUBSERIE}|${ajuste.NUM_NF_ENTRADA}|${entrada}|${ajuste.CHAVE_NFE}|`;
          const c195 = '|C195|3||';
          
          const c197Lines: string[] = [];
          if (config.gerarAmbosC197) {
            c197Lines.push(`|C197|RJ10000000|Credito proporcional referente a devolucao de ICMS-ST conforme art. 16 da Resolucao SEFAZ-RJ||||${icmsProprio}||`);
            c197Lines.push(`|C197|RJ11100000|Credito proporcional referente a devolucao de ICMS-ST conforme art. 16 da Resolucao SEFAZ-RJ||||${icmsSt}||`);
          } else {
            if (ajuste.ICMS_PROPRIO > 0) {
              c197Lines.push(`|C197|RJ10000000|Credito proporcional referente a devolucao de ICMS-ST conforme art. 16 da Resolucao SEFAZ-RJ||||${icmsProprio}||`);
            }
            if (ajuste.ICMS_ST > 0) {
              c197Lines.push(`|C197|RJ11100000|Credito proporcional referente a devolucao de ICMS-ST conforme art. 16 da Resolucao SEFAZ-RJ||||${icmsSt}||`);
            }
          }
          
          for (const linhaBloco of blocoOriginal) {
            const camposBloco = linhaBloco.split('|');
            const regType = camposBloco[1];
            
            // Antes de C170 ou qualquer registro >= C114, injetamos C110, C112, C113
            if (!c110Inserido && regType && regType.startsWith('C')) {
              const regNum = parseInt(regType.substring(1));
              if (regNum >= 114 || regNum === 170) {
                novoBloco.push(c110);
                novoBloco.push(c112);
                novoBloco.push(c113);
                c110Inserido = true;
              }
            }
            
            // Antes de C197, C990 ou após C190, injetamos C195
            if (!c195Inserido && regType && regType.startsWith('C')) {
              const regNum = parseInt(regType.substring(1));
              if (regNum >= 195) {
                novoBloco.push(c195);
                // Se já chegou em C197 ou depois, injetamos C197 também
                if (regNum >= 197) {
                  novoBloco.push(...c197Lines);
                }
                c195Inserido = true;
              }
            }
            
            novoBloco.push(linhaBloco);
          }
          
          // Se não inserimos ainda (bloco não tinha C170 ou C190), inserir no final
          if (!c110Inserido) {
            // Insere após C100/C101/C105
            const insertIdx = novoBloco.findIndex((l, idx) => {
              if (idx === 0) return false;
              const c = l.split('|')[1];
              return c && c.startsWith('C') && parseInt(c.substring(1)) > 113;
            });
            if (insertIdx > 0) {
              novoBloco.splice(insertIdx, 0, c110, c112, c113);
            } else {
              // Insere no final antes de fechar
              novoBloco.push(c110, c112, c113);
            }
          }
          
          if (!c195Inserido) {
            novoBloco.push(c195);
            novoBloco.push(...c197Lines);
          }
          
          novoConteudo.push(...novoBloco);
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
        VL_AJ_APUR: parseNumeroSeguro(obj['VL_AJ_APUR']),
        ICMS_PROPRIO: parseNumeroSeguro(obj['ICMS_PROPRIO']),
        ICMS_ST: parseNumeroSeguro(obj['ICMS_ST']),
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
