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
  socios: { nome: string; qualificacao: string }[];
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
export async function fetchCnpjData(cnpj: string): Promise<CnpjData> {
  const digits = cleanCnpj(cnpj);
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);

  if (!response.ok) {
    if (response.status === 404) throw new Error('CNPJ não encontrado na base da Receita Federal');
    if (response.status === 429) throw new Error('Muitas consultas. Aguarde alguns segundos e tente novamente.');
    throw new Error('Erro ao consultar CNPJ. Tente novamente.');
  }

  const raw = await response.json();

  const socios = Array.isArray(raw.qsa)
    ? raw.qsa.map((s: any) => ({
        nome: s.nome_socio || s.nome || '',
        qualificacao: s.qualificacao_socio || s.qual || '',
      }))
    : [];

  const cnaesSecundarios: CnaeInfo[] = Array.isArray(raw.cnaes_secundarios)
    ? raw.cnaes_secundarios
        .filter((c: any) => c.codigo && c.codigo !== 0)
        .map((c: any) => ({
          codigo: String(c.codigo),
          descricao: c.descricao || '',
        }))
    : [];

  return {
    razao_social: raw.razao_social || '',
    nome_fantasia: raw.nome_fantasia || null,
    cnpj: digits,
    situacao_cadastral: raw.descricao_situacao_cadastral || '',
    data_situacao_cadastral: raw.data_situacao_cadastral || null,
    data_inicio_atividade: raw.data_inicio_atividade || null,
    tipo: raw.identificador_matriz_filial === 1 ? 'MATRIZ' : raw.identificador_matriz_filial === 2 ? 'FILIAL' : null,

    telefone: formatPhone(raw.ddd_telefone_1),
    telefone2: formatPhone(raw.ddd_telefone_2),
    email: raw.email && raw.email.trim() !== '' ? raw.email.toLowerCase().trim() : null,

    logradouro: raw.logradouro
      ? `${raw.descricao_tipo_de_logradouro || ''} ${raw.logradouro}`.trim()
      : null,
    numero: raw.numero || null,
    complemento: raw.complemento || null,
    bairro: raw.bairro || null,
    cep: formatCep(raw.cep),
    municipio: raw.municipio || null,
    uf: raw.uf || null,

    natureza_juridica: raw.natureza_juridica
      ? `${raw.codigo_natureza_juridica || ''} - ${raw.natureza_juridica}`.trim()
      : null,
    porte: raw.descricao_porte || raw.porte || null,
    capital_social: raw.capital_social ?? null,

    cnae_principal: raw.cnae_fiscal
      ? { codigo: String(raw.cnae_fiscal), descricao: raw.cnae_fiscal_descricao || '' }
      : null,
    cnaes_secundarios: cnaesSecundarios,

    socios,
  };
}
