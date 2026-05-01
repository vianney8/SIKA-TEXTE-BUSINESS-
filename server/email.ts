import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = "support <support@sikatexte.site>";

// Base URL de l'app pour le logo
const APP_URL = process.env.APP_BASE_URL
  || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "");

const LOGO_URL = `${APP_URL}/logo.jpg`;

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(to: string, fullName: string, code: string): Promise<boolean> {
  if (!resend) { console.warn("[EMAIL] RESEND_API_KEY not set, skipping email"); return false; }
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

export function generatePcsCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PCS-${seg()}-${seg()}-${seg()}-${seg()}`;
}

const COUNTRY_NAMES: Record<string, string> = {
  BJ: "Bénin", CI: "Côte d'Ivoire", SN: "Sénégal", BF: "Burkina Faso",
  TG: "Togo", CM: "Cameroun", COG: "Congo-Brazzaville",
};

export async function sendPcsEmail(params: {
  to: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  pcsCode: string;
  issuedAt: Date;
}): Promise<boolean> {
  if (!resend) { console.warn("[EMAIL] RESEND_API_KEY not set, skipping email"); return false; }
  const { to, firstName, lastName, countryCode, pcsCode, issuedAt } = params;
  const countryName = COUNTRY_NAMES[countryCode] || countryCode;
  const dateStr = issuedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Votre Code PCS SIKA TEXTE — ${pcsCode}`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- Header -->
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#1e293b,#1a3a6e);border-radius:20px;padding:24px 40px;text-align:center;border:1px solid rgba(255,255,255,0.08);">
                  ${LOGO_URL ? `<img src="${LOGO_URL}" alt="SIKApay" width="56" height="56" style="border-radius:14px;display:block;margin:0 auto 12px;" />` : ""}
                  <div style="color:white;font-size:22px;font-weight:900;letter-spacing:3px;">SIKApay</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding-bottom:20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1e293b;border-radius:16px;padding:20px 24px;border:1px solid rgba(255,255,255,0.06);">
                  <p style="color:#e2e8f0;font-size:15px;margin:0;">Chers Client,</p>
                  <p style="color:#94a3b8;font-size:14px;margin:10px 0 0;line-height:1.6;">
                    Voici les informations de votre <strong style="color:#e2e8f0;">Code PCS SIKA TEXTE</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- PCS Code highlight -->
        <tr>
          <td style="padding-bottom:20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#1e3a5f,#1e293b);border-radius:16px;padding:28px 16px;border:2px solid #3b82f6;">
                  <p style="color:#93c5fd;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px;font-weight:700;">Code PCS</p>
                  <p style="color:#ffffff;font-size:26px;font-weight:900;font-family:monospace;letter-spacing:4px;margin:0;">${pcsCode}</p>
                  <p style="color:#ef4444;font-size:12px;font-weight:700;margin:12px 0 0;letter-spacing:1px;">● INACTIF</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Info table -->
        <tr>
          <td style="padding-bottom:20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
              ${[
                ["Nom", lastName],
                ["Prénom", firstName],
                ["Pays", countryName],
                ["Type", "PCS Secure Pay"],
                ["Date d'émission", dateStr],
                ["Statut", "Inactif"],
                ["E-mail", to],
                ["Fonction", "Liaison du numéro Mobile Money au système européen pour réception immédiate des paiements"],
              ].map(([label, value], i) => `
              <tr style="border-top:${i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)'};">
                <td style="padding:12px 20px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:0.5px;width:38%;">${label}</td>
                <td style="padding:12px 20px;color:#e2e8f0;font-size:13px;font-weight:600;">${value}</td>
              </tr>`).join('')}
            </table>
          </td>
        </tr>

        <!-- Note importante -->
        <tr>
          <td style="padding-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#451a03;border-left:4px solid #f97316;border-radius:0 12px 12px 0;padding:16px 20px;">
                  <p style="color:#fed7aa;font-size:13px;font-weight:700;margin:0 0 6px;">⚠️ Note importante</p>
                  <p style="color:#fdba74;font-size:13px;margin:0;line-height:1.6;">
                    L'activation du code est obligatoire avant que le transfert automatique vers Mobile Money fonctionne.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Signature -->
        <tr>
          <td style="padding-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1e293b;border-radius:12px;padding:16px 20px;border:1px solid rgba(255,255,255,0.05);">
                  <p style="color:#94a3b8;font-size:13px;margin:0;">Cordialement,</p>
                  <p style="color:#e2e8f0;font-size:14px;font-weight:800;margin:4px 0 0;letter-spacing:1px;">Direction Général SIKApay</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Automated message notice -->
        <tr>
          <td style="padding-bottom:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1e293b;border-radius:10px;padding:12px 16px;border:1px solid rgba(255,255,255,0.05);text-align:center;">
                  <p style="color:#475569;font-size:11px;margin:0;line-height:1.7;">
                    Ceci est un message automatique. Merci de ne pas répondre à cet email.<br/>
                    Pour toute assistance, contactez le support depuis la plateforme <strong style="color:#64748b;">SIKA TEXTE BUSINESS</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center">
            <p style="color:#334155;font-size:11px;margin:0;">© SIKApay · SIKA TEXTE · support@sikatexte.site</p>
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
      console.error("[EMAIL] PCS email error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EMAIL] Failed to send PCS email:", err);
    return false;
  }
}

export async function sendPcsEmailBatch(params: {
  to: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  pcsCodesWithStatus: { code: string; status: 'actif' | 'inactif' }[];
  issuedAt: Date;
}): Promise<boolean> {
  if (!resend) { console.warn("[EMAIL] RESEND_API_KEY not set, skipping email"); return false; }
  const { to, firstName, lastName, countryCode, pcsCodesWithStatus, issuedAt } = params;
  const countryName = COUNTRY_NAMES[countryCode] || countryCode;
  const dateStr = issuedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const total = pcsCodesWithStatus.length;
  const allActif = pcsCodesWithStatus.every(x => x.status === 'actif');
  const overallStatus = allActif ? 'Actif' : (pcsCodesWithStatus.every(x => x.status === 'inactif') ? 'Inactif' : 'Mixte');

  const codesHtml = pcsCodesWithStatus.map(({ code, status }, i) => {
    const isActif = status === 'actif';
    const borderColor = isActif ? '#22c55e' : '#3b82f6';
    const statusColor = isActif ? '#22c55e' : '#ef4444';
    const statusLabel = isActif ? '● ACTIF' : '● INACTIF';
    return `
    <tr>
      <td align="center" style="background:linear-gradient(135deg,#1e3a5f,#1e293b);border-radius:16px;padding:22px 16px;border:2px solid ${borderColor};margin-bottom:12px;display:block;">
        <p style="color:#93c5fd;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;font-weight:700;">Code PCS ${total > 1 ? `#${i + 1}` : ''}</p>
        <p style="color:#ffffff;font-size:24px;font-weight:900;font-family:monospace;letter-spacing:4px;margin:0;">${code}</p>
        <p style="color:${statusColor};font-size:11px;font-weight:700;margin:10px 0 0;letter-spacing:1px;">${statusLabel}</p>
      </td>
    </tr>
    ${i < total - 1 ? '<tr><td style="height:12px;"></td></tr>' : ''}
  `}).join('');

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Vos Codes PCS SIKA TEXTE (${total} code${total > 1 ? 's' : ''})`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- Header -->
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#1e293b,#1a3a6e);border-radius:20px;padding:24px 40px;text-align:center;border:1px solid rgba(255,255,255,0.08);">
                  ${LOGO_URL ? `<img src="${LOGO_URL}" alt="SIKApay" width="56" height="56" style="border-radius:14px;display:block;margin:0 auto 12px;" />` : ""}
                  <div style="color:white;font-size:22px;font-weight:900;letter-spacing:3px;">SIKApay</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding-bottom:20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1e293b;border-radius:16px;padding:20px 24px;border:1px solid rgba(255,255,255,0.06);">
                  <p style="color:#e2e8f0;font-size:15px;margin:0;">Cher(e) <strong>${firstName} ${lastName}</strong>,</p>
                  <p style="color:#94a3b8;font-size:14px;margin:10px 0 0;line-height:1.6;">
                    Voici vo${total > 1 ? 's' : 'tre'} <strong style="color:#e2e8f0;">Code${total > 1 ? 's' : ''} PCS SIKA TEXTE</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- PCS Codes -->
        <tr>
          <td style="padding-bottom:20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${codesHtml}
            </table>
          </td>
        </tr>

        <!-- Info table -->
        <tr>
          <td style="padding-bottom:20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
              ${[
                ["Nom", lastName],
                ["Prénom", firstName],
                ["Pays", countryName],
                ["Type", "PCS Secure Pay"],
                ["Date d'émission", dateStr],
                ["Statut", overallStatus],
                ["E-mail", to],
                ["Fonction", "Liaison du numéro Mobile Money au système européen pour réception immédiate des paiements"],
              ].map(([label, value], i) => `
              <tr style="border-top:${i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)'};">
                <td style="padding:12px 20px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:0.5px;width:38%;">${label}</td>
                <td style="padding:12px 20px;color:${label === 'Statut' ? (overallStatus === 'Actif' ? '#22c55e' : overallStatus === 'Mixte' ? '#f59e0b' : '#ef4444') : '#e2e8f0'};font-size:13px;font-weight:700;">${value}</td>
              </tr>`).join('')}
            </table>
          </td>
        </tr>

        <!-- Note importante -->
        <tr>
          <td style="padding-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${allActif ? `
                <td style="background:#052e16;border-left:4px solid #22c55e;border-radius:0 12px 12px 0;padding:16px 20px;">
                  <p style="color:#bbf7d0;font-size:13px;font-weight:700;margin:0 0 6px;">✅ Carte active</p>
                  <p style="color:#86efac;font-size:13px;margin:0;line-height:1.6;">
                    La carte est active à compter du <strong>${dateStr}</strong>. Le transfert automatique vers Mobile Money est opérationnel.
                  </p>
                </td>
                ` : `
                <td style="background:#451a03;border-left:4px solid #f97316;border-radius:0 12px 12px 0;padding:16px 20px;">
                  <p style="color:#fed7aa;font-size:13px;font-weight:700;margin:0 0 6px;">⚠️ Note importante</p>
                  <p style="color:#fdba74;font-size:13px;margin:0;line-height:1.6;">
                    L'activation du code est obligatoire avant que le transfert automatique vers Mobile Money fonctionne.
                  </p>
                </td>
                `}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Signature -->
        <tr>
          <td style="padding-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1e293b;border-radius:12px;padding:16px 20px;border:1px solid rgba(255,255,255,0.05);">
                  <p style="color:#94a3b8;font-size:13px;margin:0;">Cordialement,</p>
                  <p style="color:#e2e8f0;font-size:14px;font-weight:800;margin:4px 0 0;letter-spacing:1px;">Direction Général SIKApay</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Automated message notice -->
        <tr>
          <td style="padding-bottom:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1e293b;border-radius:10px;padding:12px 16px;border:1px solid rgba(255,255,255,0.05);text-align:center;">
                  <p style="color:#475569;font-size:11px;margin:0;line-height:1.7;">
                    Ceci est un message automatique. Merci de ne pas répondre à cet email.<br/>
                    Pour toute assistance, contactez le support depuis la plateforme <strong style="color:#64748b;">SIKA TEXTE BUSINESS</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center">
            <p style="color:#334155;font-size:11px;margin:0;">© SIKApay · SIKA TEXTE · support@sikatexte.site</p>
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
      console.error("[EMAIL] PCS batch email error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EMAIL] Failed to send PCS batch email:", err);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, fullName: string, code: string): Promise<boolean> {
  if (!resend) { console.warn("[EMAIL] RESEND_API_KEY not set, skipping email"); return false; }
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
