import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "Nenhum arquivo enviado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read file content as base64 for AI processing
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Use AI to analyze the document and extract keywords
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em documentos contábeis e fiscais brasileiros. 
Analise o documento enviado e extraia:
1. O tipo do documento (DARF, DAS, GFIP, DCTF, SPED, DEFIS, holerite, FGTS, CAGED, guia, declaração, certidão, folha, recibo, contrato, balanço, NF-e, ou outro)
2. O departamento relacionado (fiscal, contabil, departamento_pessoal)
3. Palavras-chave que identificam univocamente este tipo de documento (termos que sempre aparecem neste tipo de documento)
4. Uma descrição curta do documento
5. Um nome sugerido para o template

Retorne APENAS as informações solicitadas.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analise este documento PDF chamado "${file.name}" e extraia as informações para criar um template de validação.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`,
                  },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_template_data",
                description:
                  "Extrai dados estruturados do documento para criar um template",
                parameters: {
                  type: "object",
                  properties: {
                    nome: {
                      type: "string",
                      description: "Nome sugerido para o template",
                    },
                    tipo_documento: {
                      type: "string",
                      enum: [
                        "geral",
                        "balanco",
                        "das",
                        "dctf",
                        "sped",
                        "nfe",
                        "recibo",
                        "contrato",
                        "declaracao",
                        "guia",
                        "folha",
                        "certidao",
                      ],
                      description: "Tipo do documento",
                    },
                    departamento: {
                      type: "string",
                      enum: ["fiscal", "contabil", "departamento_pessoal"],
                      description: "Departamento relacionado",
                    },
                    descricao: {
                      type: "string",
                      description: "Descrição curta do documento",
                    },
                    palavras_chave: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Lista de palavras-chave que identificam este tipo de documento",
                    },
                  },
                  required: [
                    "nome",
                    "tipo_documento",
                    "departamento",
                    "descricao",
                    "palavras_chave",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_template_data" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-document error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro ao analisar documento",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
