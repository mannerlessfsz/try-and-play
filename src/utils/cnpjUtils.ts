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
 * Dados retornados pela consulta CNPJ
 */
export interface CnpjData {
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  telefone: string | null;
  email: string | null;
  situacao_cadastral: string;
  uf: string | null;
  municipio: string | null;
}

/**
 * Consulta dados do CNPJ via BrasilAPI (gratuita, sem chave)
 */
export async function fetchCnpjData(cnpj: string): Promise<CnpjData> {
  const digits = cleanCnpj(cnpj);
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);

  if (!response.ok) {
    if (response.status === 404) throw new Error('CNPJ não encontrado na base da Receita Federal');
    throw new Error('Erro ao consultar CNPJ. Tente novamente.');
  }

  const raw = await response.json();

  // Formata telefone se disponível
  let telefone: string | null = null;
  if (raw.ddd_telefone_1) {
    const ddd = raw.ddd_telefone_1.substring(0, 2);
    const num = raw.ddd_telefone_1.substring(2);
    telefone = `(${ddd}) ${num}`;
  }

  return {
    razao_social: raw.razao_social || '',
    nome_fantasia: raw.nome_fantasia || null,
    cnpj: digits,
    telefone,
    email: raw.email || null,
    situacao_cadastral: raw.descricao_situacao_cadastral || '',
    uf: raw.uf || null,
    municipio: raw.municipio || null,
  };
}
