const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Arquivo {
  nome: string;
  url: string;
  tipo: string;
}

interface TaskCompletionRequest {
  contatoNome: string;
  contatoEmail: string;
  tarefaTitulo: string;
  tarefaDescricao?: string;
  empresaNome: string;
  departamento?: string;
  arquivos: Arquivo[];
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Task completion notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      contatoNome, 
      contatoEmail, 
      tarefaTitulo, 
      tarefaDescricao,
      empresaNome,
      departamento,
      arquivos
    }: TaskCompletionRequest = await req.json();

    console.log(`Sending completion notification to: ${contatoEmail} for task: ${tarefaTitulo}`);
    console.log(`Number of attachments: ${arquivos.length}`);

    const arquivosHtml = arquivos.map(arq => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <a href="${arq.url}" target="_blank" style="color: #3b82f6; text-decoration: none; font-size: 14px; font-weight: 500;">
            📎 ${arq.nome}
          </a>
        </td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px 40px;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                        ✅ Tarefa Concluída
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                        Olá <strong>${contatoNome}</strong>,
                      </p>
                      
                      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                        A tarefa abaixo foi concluída pela empresa <strong>${empresaNome}</strong> e os documentos estão disponíveis para download.
                      </p>
                      
                      <!-- Task Card -->
                      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                          ${tarefaTitulo}
                        </h2>
                        
                        ${tarefaDescricao ? `
                          <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                            ${tarefaDescricao}
                          </p>
                        ` : ''}
                        
                        ${departamento ? `
                          <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            <strong>Departamento:</strong> ${departamento}
                          </p>
                        ` : ''}
                      </div>
                      
                      <!-- Attachments -->
                      <div style="margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600;">
                          📁 Documentos Anexados (${arquivos.length})
                        </h3>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                          ${arquivosHtml}
                        </table>
                      </div>
                      
                      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Caso tenha dúvidas, entre em contato com a empresa responsável.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                        Este e-mail foi enviado automaticamente pelo sistema VAULT.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "VAULT <onboarding@resend.dev>",
        to: [contatoEmail],
        subject: `Tarefa Concluída: ${tarefaTitulo}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending task notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
