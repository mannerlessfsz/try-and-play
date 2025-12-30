import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NFeProduto {
  codigo: string;
  nome: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface NFeData {
  numero: string;
  serie: string;
  data_emissao: string;
  chave_acesso: string;
  natureza_operacao: string;
  emitente: {
    cnpj: string;
    nome: string;
    nome_fantasia: string | null;
    endereco: string | null;
    cidade: string | null;
    uf: string | null;
  };
  destinatario: {
    cnpj: string;
    nome: string;
    endereco: string | null;
    cidade: string | null;
    uf: string | null;
  };
  produtos: NFeProduto[];
  total_produtos: number;
  total_icms: number;
  total_ipi: number;
  total_pis: number;
  total_cofins: number;
  total_nfe: number;
  forma_pagamento: string | null;
  condicao_pagamento: string | null;
}

// Parse XML NF-e
function parseNFeXML(xmlContent: string): NFeData {
  console.log("Parsing NF-e XML...");
  
  // Helper to extract value between tags
  const getTagValue = (xml: string, tag: string): string => {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  };

  // Helper to extract nested content
  const getTagContent = (xml: string, tag: string): string => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  };

  // Extract main NFe info
  const infNFe = getTagContent(xmlContent, 'infNFe');
  const ide = getTagContent(infNFe, 'ide');
  const emit = getTagContent(infNFe, 'emit');
  const dest = getTagContent(infNFe, 'dest');
  const total = getTagContent(infNFe, 'total');
  const icmsTot = getTagContent(total, 'ICMSTot');
  const pag = getTagContent(infNFe, 'pag');

  // Extract chave de acesso from Id attribute
  const idMatch = infNFe.match(/Id="NFe(\d+)"/);
  const chaveAcesso = idMatch ? idMatch[1] : '';

  // Parse data emissao
  const dhEmi = getTagValue(ide, 'dhEmi') || getTagValue(ide, 'dEmi');
  const dataEmissao = dhEmi ? dhEmi.split('T')[0] : '';

  // Parse emitente
  const enderecoEmit = getTagContent(emit, 'enderEmit');
  const emitente = {
    cnpj: getTagValue(emit, 'CNPJ'),
    nome: getTagValue(emit, 'xNome'),
    nome_fantasia: getTagValue(emit, 'xFant') || null,
    endereco: getTagValue(enderecoEmit, 'xLgr') || null,
    cidade: getTagValue(enderecoEmit, 'xMun') || null,
    uf: getTagValue(enderecoEmit, 'UF') || null,
  };

  // Parse destinatario
  const enderecoDest = getTagContent(dest, 'enderDest');
  const destinatario = {
    cnpj: getTagValue(dest, 'CNPJ') || getTagValue(dest, 'CPF'),
    nome: getTagValue(dest, 'xNome'),
    endereco: getTagValue(enderecoDest, 'xLgr') || null,
    cidade: getTagValue(enderecoDest, 'xMun') || null,
    uf: getTagValue(enderecoDest, 'UF') || null,
  };

  // Parse produtos
  const produtos: NFeProduto[] = [];
  const detRegex = /<det[^>]*>([\s\S]*?)<\/det>/gi;
  let detMatch;
  
  while ((detMatch = detRegex.exec(infNFe)) !== null) {
    const det = detMatch[1];
    const prod = getTagContent(det, 'prod');
    
    produtos.push({
      codigo: getTagValue(prod, 'cProd'),
      nome: getTagValue(prod, 'xProd'),
      ncm: getTagValue(prod, 'NCM'),
      cfop: getTagValue(prod, 'CFOP'),
      unidade: getTagValue(prod, 'uCom'),
      quantidade: parseFloat(getTagValue(prod, 'qCom')) || 0,
      valor_unitario: parseFloat(getTagValue(prod, 'vUnCom')) || 0,
      valor_total: parseFloat(getTagValue(prod, 'vProd')) || 0,
    });
  }

  // Parse forma de pagamento
  const detPag = getTagContent(pag, 'detPag');
  const tPag = getTagValue(detPag, 'tPag');
  const formasPagamento: Record<string, string> = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão de Crédito',
    '04': 'Cartão de Débito',
    '05': 'Crédito Loja',
    '10': 'Vale Alimentação',
    '11': 'Vale Refeição',
    '12': 'Vale Presente',
    '13': 'Vale Combustível',
    '14': 'Duplicata Mercantil',
    '15': 'Boleto Bancário',
    '16': 'Depósito Bancário',
    '17': 'PIX',
    '18': 'Transferência',
    '19': 'Programa de Fidelidade',
    '90': 'Sem Pagamento',
    '99': 'Outros',
  };

  return {
    numero: getTagValue(ide, 'nNF'),
    serie: getTagValue(ide, 'serie'),
    data_emissao: dataEmissao,
    chave_acesso: chaveAcesso,
    natureza_operacao: getTagValue(ide, 'natOp'),
    emitente,
    destinatario,
    produtos,
    total_produtos: parseFloat(getTagValue(icmsTot, 'vProd')) || 0,
    total_icms: parseFloat(getTagValue(icmsTot, 'vICMS')) || 0,
    total_ipi: parseFloat(getTagValue(icmsTot, 'vIPI')) || 0,
    total_pis: parseFloat(getTagValue(icmsTot, 'vPIS')) || 0,
    total_cofins: parseFloat(getTagValue(icmsTot, 'vCOFINS')) || 0,
    total_nfe: parseFloat(getTagValue(icmsTot, 'vNF')) || 0,
    forma_pagamento: formasPagamento[tPag] || null,
    condicao_pagamento: null,
  };
}

// Use AI to parse PDF NF-e
async function parseNFePDF(base64Content: string): Promise<NFeData> {
  console.log("Parsing NF-e PDF with AI...");
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const prompt = `Analise esta imagem de uma Nota Fiscal Eletrônica (NF-e) e extraia as informações em formato JSON.

Extraia:
1. Número da NF-e, série e data de emissão
2. Chave de acesso (44 dígitos)
3. Natureza da operação
4. Dados do emitente (CNPJ, nome, nome fantasia, endereço, cidade, UF)
5. Dados do destinatário (CNPJ/CPF, nome, endereço, cidade, UF)
6. Lista de produtos com: código, descrição, NCM, CFOP, unidade, quantidade, valor unitário, valor total
7. Totais: valor dos produtos, ICMS, IPI, PIS, COFINS, total da NF-e
8. Forma de pagamento

Retorne APENAS um JSON válido no seguinte formato (sem explicações):
{
  "numero": "string",
  "serie": "string",
  "data_emissao": "YYYY-MM-DD",
  "chave_acesso": "string 44 digitos",
  "natureza_operacao": "string",
  "emitente": {
    "cnpj": "string",
    "nome": "string",
    "nome_fantasia": "string ou null",
    "endereco": "string ou null",
    "cidade": "string ou null",
    "uf": "string ou null"
  },
  "destinatario": {
    "cnpj": "string",
    "nome": "string",
    "endereco": "string ou null",
    "cidade": "string ou null",
    "uf": "string ou null"
  },
  "produtos": [
    {
      "codigo": "string",
      "nome": "string",
      "ncm": "string",
      "cfop": "string",
      "unidade": "string",
      "quantidade": number,
      "valor_unitario": number,
      "valor_total": number
    }
  ],
  "total_produtos": number,
  "total_icms": number,
  "total_ipi": number,
  "total_pis": number,
  "total_cofins": number,
  "total_nfe": number,
  "forma_pagamento": "string ou null",
  "condicao_pagamento": "string ou null"
}`;

  const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:application/pdf;base64,${base64Content}` }
            }
          ]
        }
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';
  
  console.log("AI response:", content);

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse AI response as JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed as NFeData;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileName = file.name.toLowerCase();
    const isXML = fileName.endsWith('.xml');
    const isPDF = fileName.endsWith('.pdf');

    if (!isXML && !isPDF) {
      return new Response(
        JSON.stringify({ success: false, error: 'File must be XML or PDF' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing NF-e file: ${file.name}, type: ${isXML ? 'XML' : 'PDF'}`);

    let nfeData: NFeData;

    if (isXML) {
      const content = await file.text();
      nfeData = parseNFeXML(content);
    } else {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      nfeData = await parseNFePDF(base64);
    }

    console.log(`Parsed NF-e: #${nfeData.numero}, ${nfeData.produtos.length} products, total: ${nfeData.total_nfe}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: nfeData,
        source: isXML ? 'xml' : 'pdf'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing NF-e:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
