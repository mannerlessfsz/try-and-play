import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NFSeData {
  numero: string;
  serie: string;
  data_emissao: string;
  codigo_verificacao: string;
  prestador: {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string | null;
    inscricao_municipal: string | null;
    municipio: string | null;
    uf: string | null;
  };
  tomador: {
    cpf_cnpj: string;
    razao_social: string;
    endereco: string | null;
    municipio: string | null;
    uf: string | null;
    email: string | null;
  };
  servico: {
    discriminacao: string;
    codigo_servico: string | null;
    valor_servicos: number;
    valor_deducoes: number;
    base_calculo: number;
    aliquota_iss: number;
    valor_iss: number;
    iss_retido: boolean;
  };
  retencoes: {
    ir: number;
    pis: number;
    cofins: number;
    csll: number;
    inss: number;
    iss: number;
  };
  valor_liquido: number;
  optante_simples: boolean;
  natureza_operacao: string | null;
}

async function parseNFSePDF(base64Content: string): Promise<NFSeData> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const prompt = `Analise este PDF de uma Nota Fiscal de Serviço Eletrônica (NFS-e) e extraia TODAS as informações em formato JSON.

IMPORTANTE: Extraia com máxima precisão:
1. Número da nota, série, data de emissão, código de verificação
2. Dados do PRESTADOR (quem emitiu): CNPJ, razão social, nome fantasia, inscrição municipal, município, UF
3. Dados do TOMADOR (cliente): CPF/CNPJ, razão social, endereço, município, UF, email
4. Serviço: discriminação completa, código do serviço, valor dos serviços, deduções, base de cálculo, alíquota ISS (em %), valor ISS, se ISS é retido
5. Retenções federais: IR, PIS, COFINS, CSLL, INSS, ISS retido
6. Valor líquido da nota
7. Se é optante do Simples Nacional
8. Natureza da operação

Retorne APENAS um JSON válido sem markdown ou explicações:
{
  "numero": "string",
  "serie": "string",
  "data_emissao": "DD/MM/YYYY",
  "codigo_verificacao": "string",
  "prestador": {
    "cnpj": "string com pontuação",
    "razao_social": "string",
    "nome_fantasia": "string ou null",
    "inscricao_municipal": "string ou null",
    "municipio": "string ou null",
    "uf": "string ou null"
  },
  "tomador": {
    "cpf_cnpj": "string com pontuação",
    "razao_social": "string",
    "endereco": "string ou null",
    "municipio": "string ou null",
    "uf": "string ou null",
    "email": "string ou null"
  },
  "servico": {
    "discriminacao": "string completa",
    "codigo_servico": "string ou null",
    "valor_servicos": number,
    "valor_deducoes": number,
    "base_calculo": number,
    "aliquota_iss": number,
    "valor_iss": number,
    "iss_retido": boolean
  },
  "retencoes": {
    "ir": number,
    "pis": number,
    "cofins": number,
    "csll": number,
    "inss": number,
    "iss": number
  },
  "valor_liquido": number,
  "optante_simples": boolean,
  "natureza_operacao": "string ou null"
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
  
  console.log("AI response length:", content.length);

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse AI response as JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  // Ensure retencoes exists with defaults
  parsed.retencoes = {
    ir: parsed.retencoes?.ir || 0,
    pis: parsed.retencoes?.pis || 0,
    cofins: parsed.retencoes?.cofins || 0,
    csll: parsed.retencoes?.csll || 0,
    inss: parsed.retencoes?.inss || 0,
    iss: parsed.retencoes?.iss || 0,
  };

  return parsed as NFSeData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tipo = formData.get('tipo') as string || 'servico';
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.xml')) {
      return new Response(
        JSON.stringify({ success: false, error: 'File must be PDF or XML' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing fiscal file: ${file.name}, tipo: ${tipo}`);

    if (tipo === 'servico') {
      if (fileName.endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const data = await parseNFSePDF(base64);
        
        return new Response(
          JSON.stringify({ success: true, data, tipo: 'servico', source: 'pdf' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // XML - read and return content for client-side parsing
        const content = await file.text();
        return new Response(
          JSON.stringify({ success: true, xml_content: content, tipo: 'servico', source: 'xml' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // comercio - delegate to existing parse-nfe logic or return xml
    if (fileName.endsWith('.xml')) {
      const content = await file.text();
      return new Response(
        JSON.stringify({ success: true, xml_content: content, tipo: 'comercio', source: 'xml' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PDF comercio - use AI similar approach
    const buffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const prompt = `Analise este PDF de uma Nota Fiscal Eletrônica (NF-e de comércio/mercadoria) e extraia as informações em JSON.
Retorne APENAS JSON válido:
{
  "numero": "string", "serie": "string", "data_emissao": "DD/MM/YYYY",
  "chave_acesso": "string 44 digitos",
  "natureza_operacao": "string",
  "emitente": { "cnpj": "string", "razao_social": "string", "nome_fantasia": "string|null", "ie": "string|null", "municipio": "string|null", "uf": "string|null" },
  "destinatario": { "cpf_cnpj": "string", "razao_social": "string", "ie": "string|null", "municipio": "string|null", "uf": "string|null" },
  "itens": [{ "numero": number, "codigo": "string", "descricao": "string", "ncm": "string", "cfop": "string", "unidade": "string", "quantidade": number, "valor_unitario": number, "valor_total": number }],
  "totais": { "valor_produtos": number, "valor_icms": number, "valor_ipi": number, "valor_frete": number, "valor_desconto": number, "valor_total": number },
  "informacoes_adicionais": "string|null"
}`;

    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` } }] }],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse AI response');
    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ success: true, data: parsed, tipo: 'comercio', source: 'pdf' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing fiscal file:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
