/**
 * Shared formatting utilities for the application
 * Centralizes currency, date, and other formatting functions
 */

/**
 * Format a number as Brazilian currency (BRL)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
}

/**
 * Parse a date string safely, avoiding timezone issues.
 * For date-only strings (YYYY-MM-DD), adds T12:00:00 to avoid UTC midnight conversion issues.
 */
function parseDateSafe(dateStr: string): Date {
  // If it's a date-only string (YYYY-MM-DD), add time to avoid timezone issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T12:00:00');
  }
  return new Date(dateStr);
}

/**
 * Format a date string to Brazilian locale (dd/mm/yyyy)
 */
export function formatDate(dateStr: string): string {
  return parseDateSafe(dateStr).toLocaleDateString('pt-BR');
}

/**
 * Format a date string to Brazilian locale short (dd/mm)
 */
export function formatDateShort(dateStr: string): string {
  return parseDateSafe(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * Format a date string to Brazilian locale with time (dd/mm/yyyy HH:mm)
 */
export function formatDateTime(dateStr: string): string {
  const date = parseDateSafe(dateStr);
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`;
}

/**
 * Format a number with Brazilian locale
 */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format a CPF (000.000.000-00)
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Format a CNPJ (00.000.000/0000-00)
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Format a phone number
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Format a CEP (00000-000)
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return cep;
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}
