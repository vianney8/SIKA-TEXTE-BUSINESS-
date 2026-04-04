import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "support <support@sikatexte.site>";

// Base URL de l'app pour le logo
const APP_URL = process.env.APP_BASE_URL
  || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "");

const LOGO_URL = `${APP_URL}/logo.jpg`;

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(to: string, fullName: string, code: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${code} - Code de vérification SIKA TEXTE`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

        <!-- Logo header -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#0f172a,#1a4fa0);border-radius:16px;padding:20px 32px;text-align:center;">
                  ${LOGO_URL ? `<img src="${LOGO_URL}" alt="SIKA TEXTE" width="52" height="52" style="border-radius:12px;display:block;margin:0 auto 10px;" />` : ""}
                  <div style="color:white;font-size:20px;font-weight:900;letter-spacing:2px;">SIKA TEXTE</div>
                  <div style="color:#93c5fd;font-size:12px;margin-top:2px;">Business</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:white;border-radius:20px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

            <p style="color:#111827;font-size:16px;margin:0 0 16px;">Bonjour <strong>${fullName}</strong>,</p>

            <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;">
              Pour finaliser la création de votre compte, veuillez entrer le code de vérification ci-dessous.
              Ce code est valide pendant <strong>15 minutes</strong>.
            </p>

            <!-- Code box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center" style="background:#eff6ff;border:2px solid #3b82f6;border-radius:16px;padding:24px 16px;">
                  <span style="font-size:42px;font-weight:900;letter-spacing:10px;color:#1a4fa0;font-family:monospace;">${code}</span>
                </td>
              </tr>
            </table>

            <!-- Warning -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#fff7ed;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:12px 16px;">
                  <p style="color:#92400e;font-size:13px;margin:0;font-weight:700;">🔒 Ne partagez ce code avec personne</p>
                </td>
              </tr>
            </table>

            <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
              Si vous n'avez pas créé de compte sur Sika Texte, ignorez cet email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding-top:20px;">
            <p style="color:#9ca3af;font-size:11px;margin:0;">© SIKA TEXTE Business · support@sikatexte.site</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    });
    if (error) {
      console.error("[EMAIL] Verification email error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EMAIL] Failed to send verification email:", err);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, fullName: string, code: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${code} - Réinitialisation de votre mot de passe SIKA TEXTE`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

        <!-- Logo header -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#0f172a,#1a4fa0);border-radius:16px;padding:20px 32px;text-align:center;">
                  ${LOGO_URL ? `<img src="${LOGO_URL}" alt="SIKA TEXTE" width="52" height="52" style="border-radius:12px;display:block;margin:0 auto 10px;" />` : ""}
                  <div style="color:white;font-size:20px;font-weight:900;letter-spacing:2px;">SIKA TEXTE</div>
                  <div style="color:#93c5fd;font-size:12px;margin-top:2px;">Business</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:white;border-radius:20px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

            <p style="color:#111827;font-size:16px;margin:0 0 16px;">Bonjour <strong>${fullName}</strong>,</p>

            <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;">
              Vous avez demandé la réinitialisation de votre mot de passe sur Sika Texte.
              Veuillez entrer le code ci-dessous pour créer un nouveau mot de passe.
              Ce code est valide pendant <strong>15 minutes</strong>.
            </p>

            <!-- Code box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center" style="background:#fffbeb;border:2px solid #f59e0b;border-radius:16px;padding:24px 16px;">
                  <span style="font-size:42px;font-weight:900;letter-spacing:10px;color:#d97706;font-family:monospace;">${code}</span>
                </td>
              </tr>
            </table>

            <!-- Warning -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#fff7ed;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:12px 16px;">
                  <p style="color:#92400e;font-size:13px;margin:0;font-weight:700;">🔒 Ne partagez ce code avec personne</p>
                </td>
              </tr>
            </table>

            <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
              Si vous n'avez pas demandé de réinitialisation de mot de passe sur Sika Texte, ignorez cet email.
              Votre mot de passe actuel reste inchangé.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding-top:20px;">
            <p style="color:#9ca3af;font-size:11px;margin:0;">© SIKA TEXTE Business · support@sikatexte.site</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    });
    if (error) {
      console.error("[EMAIL] Password reset email error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EMAIL] Failed to send password reset email:", err);
    return false;
  }
}
