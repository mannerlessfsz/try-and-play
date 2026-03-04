/**
 * Parser dinâmico baseado em layouts cadastrados no banco de dados.
 * Consulta layout_documentos e layout_campos para saber quais tags buscar.
 */

import { supabase } from "@/integrations/supabase/client";

export interface LayoutDocumento {
  id: string;
  nome: string;
  tipo: string;
  versao: string;
  namespace_pattern: string | null;
  root_element_pattern: string | null;
}

export interface LayoutCampo {
  id: string;
  layout_id: string;
  grupo: string;
  campo_destino: string;
  tipo_dado: string;
  caminhos_xpath: string[];
  posicao_inicio: number | null;
  posicao_fim: number | null;
  transformacao: string | null;
  valor_padrao: string | null;
  obrigatorio: boolean;
  ordem: number;
}

export interface ParsedDocument {
  layout_nome: string;
  layout_id: string;
  campos: Record<string, Record<string, string>>;  // grupo -> campo -> valor
}

// Cache de layouts para evitar queries repetidas
let layoutsCache: { layouts: LayoutDocumento[]; campos: Map<string, LayoutCampo[]> } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function loadLayouts(): Promise<typeof layoutsCache> {
  const now = Date.now();
  if (layoutsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return layoutsCache;
  }

  const { data: layouts, error: layoutError } = await supabase
    .from('layout_documentos')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (layoutError || !layouts) {
    console.error('[LayoutParser] Erro ao carregar layouts:', layoutError);
    return null;
  }

  const { data: campos, error: camposError } = await supabase
    .from('layout_campos')
    .select('*')
    .in('layout_id', layouts.map(l => l.id))
    .order('ordem');

  if (camposError || !campos) {
    console.error('[LayoutParser] Erro ao carregar campos:', camposError);
    return null;
  }

  const camposMap = new Map<string, LayoutCampo[]>();
  for (const campo of campos) {
    const existing = camposMap.get(campo.layout_id) || [];
    existing.push(campo as LayoutCampo);
    camposMap.set(campo.layout_id, existing);
  }

  layoutsCache = { layouts: layouts as LayoutDocumento[], campos: camposMap };
  cacheTimestamp = now;
  return layoutsCache;
}

/**
 * Detecta qual layout usar para um XML baseado no namespace e root element
 */
export function detectLayout(xmlContent: string, layouts: LayoutDocumento[]): LayoutDocumento | null {
  // Verificar namespace primeiro (mais específico)
  for (const layout of layouts) {
    if (layout.namespace_pattern) {
      try {
        const regex = new RegExp(layout.namespace_pattern, 'i');
        if (regex.test(xmlContent)) {
          console.log(`[LayoutParser] Layout detectado por namespace: ${layout.nome}`);
          return layout;
        }
      } catch { /* ignore bad regex */ }
    }
  }

  // Verificar root element
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");
  const rootTag = doc.documentElement?.localName || doc.documentElement?.tagName || "";

  for (const layout of layouts) {
    if (layout.root_element_pattern) {
      try {
        const regex = new RegExp(`^(${layout.root_element_pattern})$`, 'i');
        if (regex.test(rootTag)) {
          console.log(`[LayoutParser] Layout detectado por root element "${rootTag}": ${layout.nome}`);
          return layout;
        }
      } catch { /* ignore bad regex */ }
    }
  }

  console.warn(`[LayoutParser] Nenhum layout detectado para root element: ${rootTag}`);
  return null;
}

/**
 * Busca um valor no XML usando múltiplos caminhos (tags) em ordem de prioridade
 */
function findValueByPaths(
  doc: Document,
  parentElement: Element | null,
  paths: string[],
): string {
  const searchIn = parentElement || doc;
  const allElements = searchIn.getElementsByTagName("*");

  for (const path of paths) {
    // Busca case-insensitive por localName
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (el.localName.toLowerCase() === path.toLowerCase() || el.tagName.toLowerCase() === path.toLowerCase()) {
        const text = el.textContent?.trim();
        if (text) return text;
      }
    }
  }
  return "";
}

/**
 * Encontra um elemento pai por múltiplos nomes possíveis
 */
function findParentElement(doc: Document, paths: string[]): Element | null {
  const allElements = doc.getElementsByTagName("*");
  for (const path of paths) {
    for (let i = 0; i < allElements.length; i++) {
      if (allElements[i].localName.toLowerCase() === path.toLowerCase()) {
        return allElements[i];
      }
    }
  }
  return null;
}

/**
 * Parseia um XML usando os campos cadastrados no layout
 */
export function parseXmlWithLayout(
  xmlContent: string,
  layout: LayoutDocumento,
  campos: LayoutCampo[]
): ParsedDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");

  // Separar campos de contexto (parents) dos campos de dados
  const contextoCampos = campos.filter(c => c.grupo === 'contexto');
  const dadosCampos = campos.filter(c => c.grupo !== 'contexto');

  // Resolver elementos pai
  const parents: Record<string, Element | null> = {};
  for (const ctx of contextoCampos) {
    parents[ctx.campo_destino] = findParentElement(doc, ctx.caminhos_xpath);
  }

  // Mapear qual grupo usa qual parent
  const grupoToParent: Record<string, string> = {
    'prestador': 'prestador_parent',
    'tomador': 'tomador_parent',
    'servico': 'servico_parent',
    'retencoes': 'tributos_parent',
    'emitente': 'emitente_parent',
    'destinatario': 'destinatario_parent',
    'totais': 'totais_parent',
    'itens': 'itens_parent',
  };

  // Extrair valores de cada campo
  const result: Record<string, Record<string, string>> = {};

  for (const campo of dadosCampos) {
    if (!result[campo.grupo]) result[campo.grupo] = {};

    // Determinar o parent element para busca contextual
    const parentKey = grupoToParent[campo.grupo];
    const parentEl = parentKey ? parents[parentKey] : null;

    // Buscar o valor - primeiro no parent, depois no doc inteiro
    let value = "";
    if (parentEl) {
      value = findValueByPaths(doc, parentEl, campo.caminhos_xpath);
    }
    if (!value) {
      value = findValueByPaths(doc, null, campo.caminhos_xpath);
    }

    // Aplicar transformação se houver
    if (value && campo.transformacao) {
      value = applyTransformation(value, campo.transformacao);
    }

    // Usar valor padrão se não encontrou
    if (!value && campo.valor_padrao) {
      value = campo.valor_padrao;
    }

    // Formatar conforme tipo
    if (campo.tipo_dado === 'data' && value) {
      value = value.split('T')[0]; // Remove time part
    }

    result[campo.grupo][campo.campo_destino] = value;
  }

  return {
    layout_nome: layout.nome,
    layout_id: layout.id,
    campos: result,
  };
}

function applyTransformation(value: string, transformation: string): string {
  if (transformation.startsWith('split:')) {
    const parts = transformation.split(':');
    const separator = parts[1];
    const index = parseInt(parts[2]) || 0;
    return value.split(separator)[index] || value;
  }
  if (transformation.startsWith('regex:')) {
    try {
      const regex = new RegExp(transformation.substring(6));
      const match = value.match(regex);
      return match?.[1] || match?.[0] || value;
    } catch { return value; }
  }
  return value;
}

/**
 * Converte ParsedDocument para o formato NotaServico esperado pelo ConversorFiscal
 */
export function parsedDocToNotaServico(parsed: ParsedDocument, fileName: string, regimeEmpresa: string | null) {
  const ide = parsed.campos.ide || {};
  const prest = parsed.campos.prestador || {};
  const toma = parsed.campos.tomador || {};
  const serv = parsed.campos.servico || {};
  const ret = parsed.campos.retencoes || {};
  const regime = parsed.campos.regime || {};

  const formatCnpj = (v: string) => {
    if (!v || v.length !== 14) return v;
    return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };
  const formatCpfCnpj = (v: string) => {
    if (!v) return "";
    if (v.length === 11) return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    return formatCnpj(v);
  };

  const optSN = regime.optante_simples;
  const isOptante = optSN === '1' || optSN === '4' || optSN?.toLowerCase() === 'sim' || optSN === 'true';

  return {
    numero: ide.numero || 'S/N',
    serie: ide.serie || 'U',
    data_emissao: ide.data_emissao || '',
    codigo_verificacao: ide.codigo_verificacao || '',
    prestador: {
      cnpj: formatCnpj(prest.cnpj || ''),
      razao_social: prest.razao_social || '',
      nome_fantasia: prest.nome_fantasia || '',
      inscricao_municipal: prest.inscricao_municipal || '',
      municipio: prest.municipio || ide.local_emissao || '',
      uf: prest.uf || '',
    },
    tomador: {
      cpf_cnpj: formatCpfCnpj(toma.cpf_cnpj || ''),
      razao_social: toma.razao_social || '',
      endereco: toma.endereco || '',
      municipio: toma.municipio || '',
      uf: toma.uf || '',
      email: toma.email || '',
    },
    servico: {
      discriminacao: serv.discriminacao || '',
      codigo_servico: serv.codigo_servico || '',
      valor_servicos: parseFloat(serv.valor_servicos) || 0,
      valor_deducoes: parseFloat(serv.valor_deducoes) || 0,
      base_calculo: parseFloat(serv.base_calculo) || parseFloat(serv.valor_servicos) || 0,
      aliquota_iss: parseFloat(serv.aliquota_iss) || 0,
      valor_iss: parseFloat(serv.valor_iss) || 0,
      iss_retido: parseFloat(ret.iss_retido || '0') > 0,
    },
    retencoes: {
      ir: parseFloat(ret.ir) || 0,
      pis: parseFloat(ret.pis) || 0,
      cofins: parseFloat(ret.cofins) || 0,
      csll: parseFloat(ret.csll) || 0,
      inss: parseFloat(ret.inss) || 0,
      iss: parseFloat(ret.iss_retido) || 0,
    },
    valor_liquido: parseFloat(serv.valor_liquido) || parseFloat(serv.valor_servicos) || 0,
    optante_simples: isOptante,
    natureza_operacao: ide.natureza_operacao || '',
    _arquivo: fileName,
    _regime_tomador: regimeEmpresa,
    _layout: parsed.layout_nome,
  };
}

/**
 * Parser principal: detecta layout e extrai dados
 */
export async function parseXmlDynamic(
  xmlContent: string,
  fileName: string,
  regimeEmpresa: string | null
): Promise<{ success: boolean; data?: any; layout?: string; error?: string }> {
  try {
    const cache = await loadLayouts();
    if (!cache) {
      return { success: false, error: 'Não foi possível carregar layouts do banco' };
    }

    // Filtrar apenas layouts XML
    const xmlLayouts = cache.layouts.filter(l => l.tipo === 'xml');
    
    const layout = detectLayout(xmlContent, xmlLayouts);
    if (!layout) {
      return { success: false, error: `Formato XML não reconhecido para ${fileName}` };
    }

    const campos = cache.campos.get(layout.id) || [];
    if (campos.length === 0) {
      return { success: false, error: `Layout "${layout.nome}" não tem campos mapeados` };
    }

    const parsed = parseXmlWithLayout(xmlContent, layout, campos);
    const nota = parsedDocToNotaServico(parsed, fileName, regimeEmpresa);

    console.log(`[LayoutParser] ${fileName} parseado com layout "${layout.nome}": numero=${nota.numero}, valor=${nota.servico.valor_servicos}, IR=${nota.retencoes.ir}, PIS=${nota.retencoes.pis}`);

    return {
      success: true,
      data: nota,
      layout: layout.nome,
    };
  } catch (err) {
    console.error(`[LayoutParser] Erro ao parsear ${fileName}:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}
