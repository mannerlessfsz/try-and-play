import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaskNotificationRequest {
  contatoNome: string;
  contatoEmail: string;
  tarefaTitulo: string;
  tarefaDescricao?: string;
  empresaNome: string;
  departamento?: string;
  prioridade: string;
  dataVencimento?: string;
}

const getPrioridadeLabel = (prioridade: string): string => {
  const labels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente"
  };
  return labels[prioridade] || prioridade;
};

const getPrioridadeColor = (prioridade: string): string => {
  const colors: Record<string, string> = {
    baixa: "#22c55e",
    media: "#eab308",
    alta: "#f97316",
    urgente: "#ef4444"
  };
  return colors[prioridade] || "#6b7280";
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Task notification function called");

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
      prioridade,
      dataVencimento
    }: TaskNotificationRequest = await req.json();

    console.log(`Sending notification to: ${contatoEmail} for task: ${tarefaTitulo}`);

    const prioridadeLabel = getPrioridadeLabel(prioridade);
    const prioridadeColor = getPrioridadeColor(prioridade);

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
                    <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 40px;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                        📋 Nova Tarefa Atribuída
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
                        Uma nova tarefa foi atribuída a você pela empresa <strong>${empresaNome}</strong>.
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
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #6b7280; font-size: 14px;">Prioridade:</span>
                              <span style="display: inline-block; margin-left: 8px; padding: 4px 12px; background-color: ${prioridadeColor}; color: #ffffff; border-radius: 9999px; font-size: 12px; font-weight: 600;">
                                ${prioridadeLabel}
                              </span>
                            </td>
                          </tr>
                          ${departamento ? `
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Departamento:</span>
                                <span style="margin-left: 8px; color: #374151; font-size: 14px; font-weight: 500;">${departamento}</span>
                              </td>
                            </tr>
                          ` : ''}
                          ${dataVencimento ? `
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Vencimento:</span>
                                <span style="margin-left: 8px; color: #374151; font-size: 14px; font-weight: 500;">${dataVencimento}</span>
                              </td>
                            </tr>
                          ` : ''}
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

    const emailResponse = await resend.emails.send({
      from: "VAULT <onboarding@resend.dev>",
      to: [contatoEmail],
      subject: `Nova Tarefa: ${tarefaTitulo}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
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
