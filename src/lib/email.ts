import "server-only";

export interface EmailInlineAttachment {
  readonly filename: string;
  readonly contentType: string;
  readonly contentId: string;
  readonly contentBase64: string;
}

export interface SendEmailOptions {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text?: string;
  readonly inlineAttachments?: readonly EmailInlineAttachment[];
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

function encodeRfc2822Base64Url(
  from: string,
  to: string,
  subject: string,
  html: string,
  text?: string,
  inlineAttachments?: readonly EmailInlineAttachment[]
): string {
  const base64Subject = Buffer.from(subject, "utf-8").toString("base64");
  const utf8Subject = `=?utf-8?B?${base64Subject}?=`;
  const plainText = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const hasAttachments = inlineAttachments && inlineAttachments.length > 0;
  const altBoundary = `==_alt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}_==`;
  const relatedBoundary = `==_rel_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}_==`;

  const emailLines: string[] = [
    `From: Ganttx <${from}>`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).substring(2)}@gmail.com>`,
    `Reply-To: ${from}`,
    "MIME-Version: 1.0",
  ];

  if (hasAttachments) {
    emailLines.push(
      `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
      "",
      `--${relatedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      plainText,
      "",
      `--${altBoundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      html,
      "",
      `--${altBoundary}--`
    );

    for (const att of inlineAttachments) {
      emailLines.push(
        "",
        `--${relatedBoundary}`,
        `Content-Type: ${att.contentType}; name="${att.filename}"`,
        "Content-Transfer-Encoding: base64",
        `Content-ID: <${att.contentId}>`,
        `Content-Disposition: inline; filename="${att.filename}"`,
        "",
        att.contentBase64
      );
    }

    emailLines.push("", `--${relatedBoundary}--`);
  } else {
    emailLines.push(
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      plainText,
      "",
      `--${altBoundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      html,
      "",
      `--${altBoundary}--`
    );
  }

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
  text,
  inlineAttachments,
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
    const rawEncoded = encodeRfc2822Base64Url(senderEmail, to, subject, html, text, inlineAttachments);

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
