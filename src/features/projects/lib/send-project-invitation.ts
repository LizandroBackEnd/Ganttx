import "server-only";

import fs from "node:fs";
import path from "node:path";
import { sendEmail, type SendEmailResult, type EmailInlineAttachment } from "@/lib/email";
import type { ProjectRole } from "@prisma/client";

let cachedIconBase64: string | null = null;

function getIconBase64(): string | null {
  if (cachedIconBase64) return cachedIconBase64;
  try {
    const iconPath = path.join(process.cwd(), "public", "ganttx-icon.png");
    if (fs.existsSync(iconPath)) {
      cachedIconBase64 = fs.readFileSync(iconPath).toString("base64");
      return cachedIconBase64;
    }
    const fullPath = path.join(process.cwd(), "public", "ganttx.png");
    if (fs.existsSync(fullPath)) {
      cachedIconBase64 = fs.readFileSync(fullPath).toString("base64");
      return cachedIconBase64;
    }
  } catch (err) {
    console.warn("[sendProjectInvitationEmail] Could not load logo file:", err);
  }
  return null;
}

export interface SendProjectInvitationParams {
  readonly toEmail: string;
  readonly projectName: string;
  readonly projectId: string;
  readonly inviterName: string;
  readonly role: ProjectRole;
}

export async function sendProjectInvitationEmail({
  toEmail,
  projectName,
  projectId,
  inviterName,
  role,
}: SendProjectInvitationParams): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const projectUrl = `${baseUrl}/projects/${projectId}`;

  const roleLabel = role === "ADMIN" ? "Administrador" : "Miembro";
  const roleDescription =
    role === "ADMIN"
      ? "Tienes permisos para administrar tareas, vistas y miembros del proyecto."
      : "Tienes permisos para ver y editar tareas, colaborar en el tablero y cronograma Gantt.";

  const subject = `Te invitaron a colaborar en el proyecto "${projectName}" en Ganttx`;
  const logoBase64 = getIconBase64();
  const inlineAttachments: EmailInlineAttachment[] = [];
  if (logoBase64) {
    inlineAttachments.push({
      filename: "ganttx-logo.png",
      contentType: "image/png",
      contentId: "ganttx-logo",
      contentBase64: logoBase64,
    });
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #121827; border: 1px solid #1f293d; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px; background: linear-gradient(135deg, rgba(0, 242, 142, 0.08) 0%, rgba(18, 24, 39, 0) 100%); border-bottom: 1px solid #1f293d;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          ${
                            logoBase64
                              ? `<img src="cid:ganttx-logo" alt="Ganttx" width="34" height="34" style="display: block; border-radius: 8px; width: 34px; height: 34px;" />`
                              : `<span style="display: inline-block; width: 14px; height: 14px; border-radius: 4px; background-color: #00f28e; box-shadow: 0 0 10px #00f28e;"></span>`
                          }
                        </td>
                        <td style="vertical-align: middle; padding-left: 10px;">
                          <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; line-height: 1;">Ganttx</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #f8fafc; line-height: 1.3;">
                ¡Hola! Has sido invitado a colaborar
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                <strong style="color: #f1f5f9;">${inviterName}</strong> te ha invitado a unirte al proyecto
                <span style="color: #00f28e; font-weight: 600;">"${projectName}"</span> en Ganttx.
              </p>

              <!-- Role card -->
              <table role="presentation" width="100%" style="margin-bottom: 28px; background-color: #0d121f; border: 1px solid #1e293b; border-radius: 10px; padding: 16px 20px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 4px;">
                      Rol asignado
                    </div>
                    <div style="font-size: 16px; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">
                      ${roleLabel}
                    </div>
                    <div style="font-size: 13px; color: #94a3b8; line-height: 1.4;">
                      ${roleDescription}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table role="presentation" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${projectUrl}" style="display: inline-block; background: linear-gradient(135deg, #00f28e 0%, #00d47e 100%); color: #04120a; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0, 242, 142, 0.35); text-align: center;">
                      Abrir Proyecto en Ganttx &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b; border-top: 1px solid #1e293b; pt: 20px; padding-top: 20px;">
                Si aún no has iniciado sesión en Ganttx, simplemente haz clic en el botón e ingresa con tu cuenta de Google (<strong style="color: #94a3b8;">${toEmail}</strong>) para acceder directamente al proyecto.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px 36px; background-color: #0e1320; border-top: 1px solid #1f293d; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #475569;">
                Ganttx &bull; Gestión colaborativa de proyectos y cronogramas en tiempo real.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
¡Hola! Has sido invitado a colaborar en Ganttx.

${inviterName} te ha invitado a unirte al proyecto "${projectName}" con el rol de ${roleLabel}.
${roleDescription}

Para abrir el proyecto, ingresa en el siguiente enlace:
${projectUrl}

Si aún no has iniciado sesión en Ganttx, simplemente abre el enlace e inicia sesión con tu cuenta de Google (${toEmail}).
  `.trim();

  return sendEmail({
    to: toEmail,
    subject,
    html,
    text,
    inlineAttachments,
  });
}
