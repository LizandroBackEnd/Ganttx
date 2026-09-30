import "server-only";

export interface SendEmailOptions {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text?: string;
}

export interface SendEmailResult {
  readonly success: boolean;
  readonly messageId?: string;
  readonly error?: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getGmailAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedAccessToken && now < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("[EmailService] Failed to refresh Google OAuth token:", errData);
      return null;
    }

    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) {
      return null;
    }

    cachedAccessToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in ?? 3600) * 1000;
    return cachedAccessToken;
  } catch (err) {
    console.error("[EmailService] Error refreshing OAuth token:", err);
    return null;
  }
}

function encodeRfc2822Base64Url(from: string, to: string, subject: string, html: string): string {
  const base64Subject = Buffer.from(subject, "utf-8").toString("base64");
  const utf8Subject = `=?utf-8?B?${base64Subject}?=`;

  const emailLines = [
    `From: Ganttx <${from}>`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
  ];

  const rawMessage = emailLines.join("\r\n");
  return Buffer.from(rawMessage, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<SendEmailResult> {
  const senderEmail = process.env.EMAIL_USER;
  if (!senderEmail) {
    return {
      success: false,
      error: "EMAIL_USER no está configurado en las variables de entorno.",
    };
  }

  const accessToken = await getGmailAccessToken();
  if (!accessToken) {
    return {
      success: false,
      error: "No se pudo obtener el token de acceso para la API de Gmail. Verifica GMAIL_REFRESH_TOKEN.",
    };
  }

  try {
    const rawEncoded = encodeRfc2822Base64Url(senderEmail, to, subject, html);

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawEncoded }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("[EmailService] Gmail send error:", errBody);
      return {
        success: false,
        error: `Error al enviar correo vía Gmail: HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as { id?: string };
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err) {
    console.error("[EmailService] Unexpected error sending email:", err);
    return {
      success: false,
      error: "Error inesperado al enviar el correo.",
    };
  }
}
