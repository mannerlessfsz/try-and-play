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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Body inválido ou vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const files = body?.files;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum arquivo enviado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const file of files) {
      try {
        const isPdf = file.filename.toLowerCase().endsWith(".pdf");
        const isExcel =
          file.filename.toLowerCase().endsWith(".xlsx") ||
          file.filename.toLowerCase().endsWith(".xls") ||
          file.filename.toLowerCase().endsWith(".csv");

        const mimeType = isPdf
          ? "application/pdf"
          : file.filename.toLowerCase().endsWith(".xlsx")
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : file.filename.toLowerCase().endsWith(".xls")
          ? "application/vnd.ms-excel"
          : "text/csv";

        // Build messages for Gemini with tool calling
        const messages: any[] = [
          {
            role: "system",
            content: `Você é um especialista em contabilidade brasileira. Analise o balancete/demonstração financeira enviado e extraia os dados solicitados com precisão.

REGRAS IMPORTANTES:
- Patrimônio Líquido (PL): Soma das contas do grupo 2.4 ou "Patrimônio Líquido" no balancete. Valor de SALDO FINAL/FECHAMENTO.
- LUCRO MENSAL (resultado_mensal): Este é o dado MAIS IMPORTANTE. É o resultado (lucro/prejuízo) APENAS do mês de referência do balancete, NÃO o acumulado do exercício. Se o balancete mostrar colunas "Mês" e "Exercício", use o valor da coluna "Mês". Se só tiver o acumulado, tente inferir o mensal pela diferença com o mês anterior, ou use o acumulado como fallback.
- LUCRO DO EXERCÍCIO (resultado_exercicio): É o resultado acumulado do exercício (desde janeiro até o mês de referência). Valor informativo.
- Dividendos: Se houver menção a dividendos propostos/declarados, extraia o valor. Caso contrário, informe 0.
- CNPJ: Extraia o CNPJ da empresa se visível no documento.
- Razão Social: Extraia o nome/razão social da empresa.
- Período: Identifique o período de referência (mês/ano).
- Valores devem ser numéricos (sem formatação). Use ponto como separador decimal. Valores negativos indicam prejuízo.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise este balancete/demonstração e extraia: PL (patrimônio líquido), resultado MENSAL (lucro/prejuízo do mês, NÃO o acumulado do exercício), resultado do EXERCÍCIO (acumulado), dividendos declarados, CNPJ, razão social e período de referência. PRIORIZE o resultado mensal. Arquivo: ${file.filename}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${file.content_base64}`,
                },
              },
            ],
          },
        ];

        const tools = [
          {
            type: "function",
            function: {
              name: "extrair_dados_balancete",
              description:
                "Extrai dados financeiros estruturados de um balancete ou demonstração contábil",
              parameters: {
                type: "object",
                properties: {
                  patrimonio_liquido: {
                    type: "number",
                    description:
                      "Patrimônio Líquido total (saldo final). Valor numérico sem formatação.",
                  },
                  resultado_mensal: {
                    type: "number",
                    description:
                      "Lucro ou Prejuízo líquido do MÊS de referência (não acumulado). Negativo se prejuízo.",
                  },
                  resultado_exercicio: {
                    type: "number",
                    description:
                      "Lucro ou Prejuízo líquido ACUMULADO do exercício (desde janeiro). Negativo se prejuízo. 0 se não identificado.",
                  },
                  dividendos_declarados: {
                    type: "number",
                    description:
                      "Dividendos propostos ou declarados. 0 se não identificado.",
                  },
                  cnpj: {
                    type: "string",
                    description:
                      "CNPJ da empresa no formato XX.XXX.XXX/XXXX-XX ou apenas números. Vazio se não encontrado.",
                  },
                  razao_social: {
                    type: "string",
                    description:
                      "Razão social ou nome da empresa conforme consta no documento.",
                  },
                  periodo_referencia: {
                    type: "string",
                    description:
                      "Período de referência no formato YYYY-MM (ex: 2025-12). Se não identificado, informar vazio.",
                  },
                  confianca: {
                    type: "string",
                    enum: ["alta", "media", "baixa"],
                    description:
                      "Nível de confiança na extração dos dados baseado na clareza do documento.",
                  },
                  observacoes: {
                    type: "string",
                    description:
                      "Observações relevantes sobre a extração ou possíveis ressalvas.",
                  },
                },
                required: [
                  "patrimonio_liquido",
                  "resultado_mensal",
                  "dividendos_declarados",
                  "confianca",
                ],
                additionalProperties: false,
              },
            },
          },
        ];

        const response = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages,
              tools,
              tool_choice: {
                type: "function",
                function: { name: "extrair_dados_balancete" },
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("AI gateway error:", response.status, errorText);

          if (response.status === 429) {
            results.push({
              filename: file.filename,
              empresa_id: file.empresa_id || null,
              success: false,
              error: "Limite de requisições excedido. Tente novamente em alguns instantes.",
            });
            continue;
          }
          if (response.status === 402) {
            results.push({
              filename: file.filename,
              empresa_id: file.empresa_id || null,
              success: false,
              error: "Créditos insuficientes para processar com IA.",
            });
            continue;
          }

          results.push({
            filename: file.filename,
            empresa_id: file.empresa_id || null,
            success: false,
            error: `Erro na API de IA: ${response.status}`,
          });
          continue;
        }

        const aiResult = await response.json();
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

        if (!toolCall || toolCall.function.name !== "extrair_dados_balancete") {
          results.push({
            filename: file.filename,
            empresa_id: file.empresa_id || null,
            success: false,
            error: "IA não retornou dados estruturados",
          });
          continue;
        }

        const extracted = JSON.parse(toolCall.function.arguments);

        results.push({
          filename: file.filename,
          empresa_id: file.empresa_id || null,
          empresa_nome: file.empresa_nome || null,
          success: true,
          data: {
            patrimonio_liquido: extracted.patrimonio_liquido || 0,
            resultado_mensal: extracted.resultado_mensal || 0,
            resultado_exercicio: extracted.resultado_exercicio || 0,
            dividendos_declarados: extracted.dividendos_declarados || 0,
            cnpj: extracted.cnpj || null,
            razao_social: extracted.razao_social || null,
            periodo_referencia: extracted.periodo_referencia || null,
            confianca: extracted.confianca || "baixa",
            observacoes: extracted.observacoes || null,
          },
        });
      } catch (fileError: any) {
        console.error(`Error processing file ${file.filename}:`, fileError);
        results.push({
          filename: file.filename,
          empresa_id: file.empresa_id || null,
          success: false,
          error: fileError.message || "Erro ao processar arquivo",
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("parse-balancete error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
