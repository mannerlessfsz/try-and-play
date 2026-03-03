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

REGRAS CRÍTICAS — LEIA COM ATENÇÃO:

1. RESULTADO MENSAL vs RESULTADO DO EXERCÍCIO — ESTA É A DISTINÇÃO MAIS IMPORTANTE:
   - "resultado_mensal" = lucro/prejuízo SOMENTE do mês de referência. É o valor que será usado no cálculo de equivalência patrimonial.
   - "resultado_exercicio" = lucro/prejuízo ACUMULADO desde janeiro até o mês de referência.
   - ESTES SÃO VALORES DIFERENTES. O resultado mensal é SEMPRE menor ou igual ao do exercício (em módulo) quando não há prejuízos alternados.
   - Se o balancete tiver colunas "Mês"/"Movimento do Mês" e "Exercício"/"Acumulado", use:
     * "Mês"/"Movimento do Mês" → resultado_mensal
     * "Exercício"/"Acumulado" → resultado_exercicio
   - Se o balancete SÓ tiver o acumulado do exercício e NÃO tiver o valor mensal separado, coloque o acumulado em "resultado_exercicio" e deixe "resultado_mensal" como 0. NÃO copie o valor do exercício para o campo mensal.
   - O resultado geralmente está nas contas do grupo 3 (Resultado) ou na diferença entre receitas (grupo 3.1) e despesas (grupo 3.2/4).

2. Patrimônio Líquido (PL): Soma das contas do grupo 2.4 ou "Patrimônio Líquido". Valor de SALDO FINAL.

3. Dividendos: Se houver menção a dividendos propostos/declarados, extraia o valor. Caso contrário, 0.

4. CNPJ: Extraia se visível no documento.

5. Razão Social: Nome/razão social da empresa.

6. Período: Formato YYYY-MM.

7. Valores numéricos com ponto decimal. Negativos = prejuízo.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise este balancete/demonstração e extraia SEPARADAMENTE:
1) PL (patrimônio líquido - saldo final)
2) resultado_mensal = lucro/prejuízo APENAS do mês (coluna "Mês" ou "Movimento"). Se não existir coluna mensal separada, retorne 0 — NÃO use o acumulado do exercício neste campo.
3) resultado_exercicio = lucro/prejuízo ACUMULADO do exercício (coluna "Exercício" ou "Acumulado")
4) dividendos declarados
5) CNPJ e razão social
6) período de referência (YYYY-MM)
ATENÇÃO: resultado_mensal e resultado_exercicio são valores DIFERENTES. Não copie um para o outro. Arquivo: ${file.filename}`,
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
        console.log(`[parse-balancete] ${file.filename} => resultado_mensal: ${extracted.resultado_mensal}, resultado_exercicio: ${extracted.resultado_exercicio}, PL: ${extracted.patrimonio_liquido}`);

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
