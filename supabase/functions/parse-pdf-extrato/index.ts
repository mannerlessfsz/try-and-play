// Parse PDF Extrato Edge Function

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
}

interface ParseResult {
  success: boolean;
  transactions: Transaction[];
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, transactions: [], error: 'Nenhum arquivo enviado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing PDF file: ${file.name}, size: ${file.size} bytes`);

    // Convert file to base64 for AI processing
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Use Lovable AI to extract transactions from PDF
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, transactions: [], error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling Lovable AI to parse PDF...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em extrair dados de extratos bancários em PDF.
Analise o documento do extrato bancário e extraia TODAS as transações encontradas.

Para cada transação, identifique:
- date: no formato YYYY-MM-DD
- description: descrição da transação
- amount: valor numérico (sempre positivo, sem formatação)
- type: "credit" para entradas/depósitos/créditos, "debit" para saídas/pagamentos/débitos

REGRAS CRÍTICAS:
- Valores com sinal negativo ou indicação de D/débito/saída são do tipo "debit"
- Valores com sinal positivo ou indicação de C/crédito/entrada são do tipo "credit"
- Retorne SOMENTE o JSON puro, SEM markdown, SEM backticks, SEM explicações
- Formato exato: {"transactions":[{"date":"YYYY-MM-DD","description":"...","amount":123.45,"type":"credit"}]}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia todas as transações deste extrato bancário. Retorne SOMENTE o JSON puro sem formatação markdown.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, transactions: [], error: 'Erro ao processar PDF com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    console.log('AI response received');

    const content = aiResult.choices?.[0]?.message?.content || '';
    console.log('AI content:', content.substring(0, 500));

    // Parse the JSON response from AI
    let transactions: Transaction[] = [];
    
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      
      // Remove markdown code blocks
      cleanContent = cleanContent.replace(/^```json\s*/i, '');
      cleanContent = cleanContent.replace(/^```\s*/i, '');
      cleanContent = cleanContent.replace(/\s*```$/i, '');
      cleanContent = cleanContent.trim();
      
      console.log('Cleaned content (first 200 chars):', cleanContent.substring(0, 200));
      
      // Try to extract JSON from the response
      const jsonMatch = cleanContent.match(/\{[\s\S]*"transactions"[\s\S]*\}/);
      if (jsonMatch) {
        // Try to fix common JSON issues - truncated arrays
        let jsonStr = jsonMatch[0];
        
        // If JSON appears truncated (missing closing brackets), try to fix it
        const openBrackets = (jsonStr.match(/\[/g) || []).length;
        const closeBrackets = (jsonStr.match(/\]/g) || []).length;
        const openBraces = (jsonStr.match(/\{/g) || []).length;
        const closeBraces = (jsonStr.match(/\}/g) || []).length;
        
        // Add missing closing brackets
        if (openBrackets > closeBrackets) {
          // Find last complete object and close the array there
          const lastCompleteObj = jsonStr.lastIndexOf('}');
          if (lastCompleteObj > 0) {
            jsonStr = jsonStr.substring(0, lastCompleteObj + 1);
            // Add missing array and object closings
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              jsonStr += ']';
            }
            for (let i = 0; i < openBraces - closeBraces - (openBrackets - closeBrackets); i++) {
              jsonStr += '}';
            }
          }
        }
        
        console.log('Attempting to parse JSON...');
        const parsed = JSON.parse(jsonStr);
        transactions = (parsed.transactions || []).map((t: any, index: number) => ({
          id: `pdf-${Date.now()}-${index}`,
          date: t.date || new Date().toISOString().split('T')[0],
          description: t.description || 'Transação não identificada',
          amount: Math.abs(parseFloat(String(t.amount).replace(/[^\d.-]/g, '')) || 0),
          type: t.type === 'credit' ? 'credit' : 'debit',
        }));
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw content length:', content.length);
    }

    console.log(`Extracted ${transactions.length} transactions from PDF`);

    const result: ParseResult = {
      success: true,
      transactions,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing PDF:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        transactions: [], 
        error: error instanceof Error ? error.message : 'Erro ao processar PDF' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
