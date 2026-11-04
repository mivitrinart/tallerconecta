/**
 * Servicio de envío de correos electrónicos - Taller Conecta
 * Usa la API HTTP de Mailtrap (compatible con Cloudflare Workers vía fetch).
 * Variables de entorno: SMTP_API_URL, SMTP_API_KEY, SMTP_FROM
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export function generateVerificationCode(): string {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

export function verificationCodeEmail(
  nombre: string,
  code: string,
  tipo: "register" | "reset_password"
): EmailMessage {
  const esRegistro = tipo === "register";
  const titulo = esRegistro ? "Verifica tu cuenta de Taller Conecta" : "Código para restablecer tu contraseña";
  const accion = esRegistro ? "completar tu registro" : "restablecer tu contraseña";
  const expiracion = "10 minutos";

  return {
    to: "",
    subject: titulo,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:20px;">
          <tr>
            <td align="center" style="padding:20px 0;">
              <div style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:18px;">Taller Conecta</div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 20px;background:#f8fafc;border-radius:8px;">
              <h1 style="color:#1e293b;margin:0 0 20px 0;font-size:24px;">${titulo}</h1>
              <p style="color:#475569;font-size:16px;margin:0 0 20px 0;">Hola <strong>${nombre}</strong>,</p>
              <p style="color:#475569;font-size:16px;margin:0 0 30px 0;">Tu código de verificación para ${accion} es:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:#fff;border:2px solid #2563eb;color:#2563eb;font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 32px;border-radius:8px;">${code}</div>
                  </td>
                </tr>
              </table>
              <p style="color:#64748b;font-size:14px;margin:30px 0 0 0;">Este código expira en <strong>${expiracion}</strong>. Si no solicitaste este código, ignora este mensaje.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 Taller Conecta. Todos los derechos reservados.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hola ${nombre},\n\nTu código de verificación para ${accion} es: ${code}\n\nEste código expira en ${expiracion}. Si no solicitaste este código, ignora este mensaje.\n\n© 2026 Taller Conecta.`,
  };
}

export async function sendEmail(message: EmailMessage): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (process.env.NODE_ENV === "development" || !process.env.SMTP_API_URL) {
    console.log("┌─────────────────────────────────────────────────────────────");
    console.log("│ 📧 CORREO ELECTRÓNICO (modo desarrollo)");
    console.log("├─────────────────────────────────────────────────────────────");
    console.log(`│ Para: ${message.to}`);
    console.log(`│ Asunto: ${message.subject}`);
    console.log("├─────────────────────────────────────────────────────────────");
    console.log(`│ ${message.text || message.html}`);
    console.log("└─────────────────────────────────────────────────────────────\n");
    return { ok: true, messageId: `dev-${Date.now()}` };
  }

  try {
    const smtpApiUrl = process.env.SMTP_API_URL;
    const smtpApiKey = process.env.SMTP_API_KEY;
    const smtpFrom = process.env.SMTP_FROM || "Taller Conecta <no-reply@tallerconecta.co>";

    if (!smtpApiUrl || !smtpApiKey) {
      return { ok: false, error: "SMTP_API_URL y SMTP_API_KEY son requeridos" };
    }

    const fromEmail = smtpFrom.includes("<") ? smtpFrom.match(/<([^>]+)>/)![1] : smtpFrom;

    const res = await fetch(smtpApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${smtpApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: smtpFrom.split("<")[0].trim() || "Taller Conecta" },
        to: [{ email: message.to }],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { ok: true, messageId: data.message_id || `mailtrap-${Date.now()}` };
    }
    const errorData = await res.json().catch(() => ({}));
    return { ok: false, error: errorData.error?.message || `HTTP ${res.status}` };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Error desconocido enviando email" };
  }
}
