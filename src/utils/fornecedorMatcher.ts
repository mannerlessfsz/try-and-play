/**
 * Validação de fornecedor × conta débito
 * Compara o nome do fornecedor extraído do histórico do lançamento
 * com as descrições do plano de contas, usando normalização fuzzy.
 */

import type { PlanoContasItem } from "./planoContasParser";

// Palavras genéricas ignoradas na comparação
const STOP_WORDS = new Set([
  "ltda", "sa", "me", "epp", "eireli", "ss", "cia", "de", "do", "da", "dos", "das",
  "e", "em", "com", "para", "por", "s", "a", "o", "no", "na", "ao", "as", "os",
  "industria", "comercio", "servicos", "distribuidora", "filial",
]);

/**
 * Normaliza um nome para comparação:
 * - Maiúsculas
 * - Remove acentos
 * - Remove pontuação (pontos, vírgulas, traços, barras)
 * - Colapsa espaços múltiplos
 */
function normalizarNome(nome: string): string {
  return nome
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[.\-\/,;:'"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrai palavras significativas (remove stop words e palavras com ≤1 caractere)
 */
function palavrasSignificativas(nomeNormalizado: string): string[] {
  return nomeNormalizado
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));
}

export interface MatchResult {
  encontrou: boolean;
  contaPlano?: string; // código da conta no plano
  descricaoPlano?: string; // descrição da conta no plano
  score?: number; // percentual de match (0-1)
}

/**
 * Busca um fornecedor no plano de contas por nome normalizado.
 * Retorna o melhor match se o score for ≥ 0.6 (60% das palavras significativas).
 * 
 * Lógica:
 * 1. Normaliza o nome do fornecedor
 * 2. Extrai palavras significativas
 * 3. Para cada conta do plano, calcula quantas palavras do fornecedor aparecem na descrição
 * 4. Retorna a conta com maior score (se ≥ threshold)
 */
export function buscarFornecedorNoPlano(
  fornecedorNome: string,
  planoContas: PlanoContasItem[],
  threshold = 0.6
): MatchResult {
  if (!fornecedorNome || planoContas.length === 0) {
    return { encontrou: false };
  }

  const fornecedorNorm = normalizarNome(fornecedorNome);
  const palavrasFornecedor = palavrasSignificativas(fornecedorNorm);

  if (palavrasFornecedor.length === 0) {
    return { encontrou: false };
  }

  let melhorScore = 0;
  let melhorConta: PlanoContasItem | null = null;

  for (const conta of planoContas) {
    const descNorm = normalizarNome(conta.descricao);

    // Match exato do nome normalizado completo
    if (descNorm === fornecedorNorm) {
      return {
        encontrou: true,
        contaPlano: conta.codigo,
        descricaoPlano: conta.descricao,
        score: 1,
      };
    }

    // Match por palavras significativas
    const palavrasDesc = palavrasSignificativas(descNorm);
    if (palavrasDesc.length === 0) continue;

    // Conta quantas palavras do fornecedor aparecem na descrição da conta
    let hits = 0;
    for (const pf of palavrasFornecedor) {
      if (palavrasDesc.some((pd) => pd === pf || pd.includes(pf) || pf.includes(pd))) {
        hits++;
      }
    }

    const score = hits / palavrasFornecedor.length;
    if (score > melhorScore) {
      melhorScore = score;
      melhorConta = conta;
    }
  }

  if (melhorScore >= threshold && melhorConta) {
    return {
      encontrou: true,
      contaPlano: melhorConta.codigo,
      descricaoPlano: melhorConta.descricao,
      score: melhorScore,
    };
  }

  return { encontrou: false };
}

/**
 * Verifica inconsistência entre a conta débito do lançamento e o código do fornecedor no plano.
 * 
 * @param contaDebito - Conta débito do lançamento (7 dígitos, ex: "0010055")
 * @param fornecedorNome - Nome do fornecedor extraído do histórico
 * @param planoContas - Plano de contas carregado
 * @returns Objeto com detalhes da inconsistência, ou null se OK
 */
export function verificarInconsistenciaFornecedor(
  contaDebito: string,
  fornecedorNome: string,
  planoContas: PlanoContasItem[]
): {
  inconsistente: boolean;
  contaEsperada?: string;
  descricaoEsperada?: string;
  fornecedorNome?: string;
  score?: number;
} | null {
  if (!fornecedorNome || !contaDebito || planoContas.length === 0) {
    return null;
  }

  const match = buscarFornecedorNoPlano(fornecedorNome, planoContas);
  if (!match.encontrou || !match.contaPlano) {
    return null; // Fornecedor não encontrado no plano — não é inconsistência
  }

  // Normaliza ambos os códigos para comparação (remove zeros à esquerda)
  const debLimpo = contaDebito.replace(/^0+/, "") || "0";
  const planoLimpo = match.contaPlano.replace(/^0+/, "") || "0";

  if (debLimpo === planoLimpo) {
    return null; // Contas iguais — sem inconsistência
  }

  return {
    inconsistente: true,
    contaEsperada: match.contaPlano,
    descricaoEsperada: match.descricaoPlano,
    fornecedorNome,
    score: match.score,
  };
}
