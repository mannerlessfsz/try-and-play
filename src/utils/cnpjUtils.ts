/**
 * Utilitários para validação e consulta de CNPJ
 */

/**
 * Remove formatação do CNPJ, mantendo apenas dígitos
 */
export function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Formata CNPJ com máscara XX.XXX.XXX/XXXX-XX
 */
export function formatCnpj(value: string): string {
  const digits = cleanCnpj(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/**
 * Valida CNPJ com algoritmo oficial (dígitos verificadores)
 */
export function isValidCnpj(cnpj: string): boolean {
  const digits = cleanCnpj(cnpj);
  if (digits.length !== 14) return false;

  // Rejeita CNPJs com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (slice: string, weights: number[]): number => {
    const sum = weights.reduce((acc, w, i) => acc + parseInt(slice[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calc(digits, w1);
  const d2 = calc(digits, w2);

  return parseInt(digits[12]) === d1 && parseInt(digits[13]) === d2;
}

/**
 * CNAE (atividade econômica)
 */
export interface CnaeInfo {
  codigo: string;
  descricao: string;
}

/**
 * Dados completos retornados pela consulta CNPJ
 */
export interface CnpjData {
  // Identificação
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string | null;
  data_inicio_atividade: string | null;
  tipo: string | null; // MATRIZ / FILIAL

  // Contato
  telefone: string | null;
  telefone2: string | null;
  email: string | null;

  // Endereço
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  uf: string | null;

  // Natureza e porte
  natureza_juridica: string | null;
  porte: string | null;
  capital_social: number | null;

  // Atividades
  cnae_principal: CnaeInfo | null;
  cnaes_secundarios: CnaeInfo[];

  // Sócios
  socios: { nome: string; qualificacao: string; cpf_cnpj: string | null; percentual_capital_social: number | null }[];
}

function formatPhone(dddTelefone: string | null): string | null {
  if (!dddTelefone || dddTelefone.trim() === '') return null;
  const clean = dddTelefone.replace(/\D/g, '');
  if (clean.length < 10) return dddTelefone.trim();
  const ddd = clean.substring(0, 2);
  const num = clean.substring(2);
  if (num.length === 9) {
    return `(${ddd}) ${num.substring(0, 5)}-${num.substring(5)}`;
  }
  return `(${ddd}) ${num.substring(0, 4)}-${num.substring(4)}`;
}

function formatCep(cep: string | null): string | null {
  if (!cep) return null;
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return cep;
  return `${digits.substring(0, 5)}-${digits.substring(5)}`;
}

/**
 * Consulta dados completos do CNPJ via BrasilAPI (gratuita, sem chave)
 */
async function fetchWithRetry(url: string, retries = 2, delayMs = 1500): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) return response;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      return response;
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Falha após múltiplas tentativas');
}

export async function fetchCnpjData(cnpj: string): Promise<CnpjData> {
  const digits = cleanCnpj(cnpj);
  
  let response: Response;
  try {
    response = await fetchWithRetry(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  } catch {
    // Fallback: ReceitaWS (also free, no key)
    try {
      response = await fetchWithRetry(`https://receitaws.com.br/v1/cnpj/${digits}`);
    } catch {
      throw new Error('Não foi possível consultar o CNPJ. Verifique sua conexão e tente novamente.');
    }
  }

  if (!response.ok) {
    if (response.status === 404) throw new Error('CNPJ não encontrado na base da Receita Federal');
    if (response.status === 429) throw new Error('Muitas consultas. Aguarde alguns segundos e tente novamente.');
    throw new Error('Erro ao consultar CNPJ. Tente novamente.');
  }

  const raw = await response.json();

  // Detect if response is from ReceitaWS (has 'status' field) vs BrasilAPI
  const isReceitaWS = 'status' in raw && !('identificador_matriz_filial' in raw);

  const socios = Array.isArray(raw.qsa)
    ? raw.qsa.map((s: any) => ({
        nome: s.nome_socio || s.nome || '',
        qualificacao: s.qualificacao_socio || s.qual || '',
        cpf_cnpj: s.cnpj_cpf_do_socio && !s.cnpj_cpf_do_socio.includes('*') ? s.cnpj_cpf_do_socio.replace(/\D/g, '') : null,
        percentual_capital_social: s.percentual_capital_social != null ? Number(s.percentual_capital_social) : null,
      }))
    : [];

  const cnaesSecundarios: CnaeInfo[] = Array.isArray(raw.cnaes_secundarios)
    ? raw.cnaes_secundarios
        .filter((c: any) => c.codigo && c.codigo !== 0)
        .map((c: any) => ({
          codigo: String(c.codigo),
          descricao: c.descricao || '',
        }))
    : isReceitaWS && Array.isArray(raw.atividades_secundarias)
    ? raw.atividades_secundarias
        .filter((c: any) => c.code && c.code !== '00.00-0-00')
        .map((c: any) => ({ codigo: c.code?.replace(/[.\-\/]/g, '') || '', descricao: c.text || '' }))
    : [];

  // ReceitaWS uses 'telefone' directly, BrasilAPI uses 'ddd_telefone_1'
  const telefone1 = isReceitaWS ? raw.telefone : raw.ddd_telefone_1;
  const telefone2 = isReceitaWS ? null : raw.ddd_telefone_2;
  const logradouroFull = isReceitaWS
    ? raw.logradouro
    : raw.logradouro ? `${raw.descricao_tipo_de_logradouro || ''} ${raw.logradouro}`.trim() : null;
  const situacao = isReceitaWS ? raw.situacao : raw.descricao_situacao_cadastral;
  const tipoMatriz = isReceitaWS
    ? (raw.tipo === 'MATRIZ' ? 'MATRIZ' : raw.tipo === 'FILIAL' ? 'FILIAL' : null)
    : (raw.identificador_matriz_filial === 1 ? 'MATRIZ' : raw.identificador_matriz_filial === 2 ? 'FILIAL' : null);
  const cnaePrincipal = isReceitaWS
    ? (raw.atividade_principal?.[0] ? { codigo: raw.atividade_principal[0].code?.replace(/[.\-\/]/g, '') || '', descricao: raw.atividade_principal[0].text || '' } : null)
    : (raw.cnae_fiscal ? { codigo: String(raw.cnae_fiscal), descricao: raw.cnae_fiscal_descricao || '' } : null);

  return {
    razao_social: raw.razao_social || raw.nome || '',
    nome_fantasia: raw.nome_fantasia || raw.fantasia || null,
    cnpj: digits,
    situacao_cadastral: situacao || '',
    data_situacao_cadastral: raw.data_situacao_cadastral || raw.data_situacao || null,
    data_inicio_atividade: raw.data_inicio_atividade || raw.abertura || null,
    tipo: tipoMatriz,

    telefone: formatPhone(telefone1),
    telefone2: formatPhone(telefone2),
    email: raw.email && raw.email.trim() !== '' ? raw.email.toLowerCase().trim() : null,

    logradouro: logradouroFull,
    numero: raw.numero || null,
    complemento: raw.complemento || null,
    bairro: raw.bairro || null,
    cep: formatCep(raw.cep),
    municipio: raw.municipio || null,
    uf: raw.uf || null,

    natureza_juridica: raw.natureza_juridica
      ? `${raw.codigo_natureza_juridica || ''} - ${raw.natureza_juridica}`.replace(/^\s*-\s*/, '').trim()
      : null,
    porte: raw.descricao_porte || raw.porte || null,
    capital_social: raw.capital_social ? Number(raw.capital_social) : null,

    cnae_principal: cnaePrincipal,
    cnaes_secundarios: cnaesSecundarios,

    socios,
  };
}
