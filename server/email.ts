import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "SIKA TEXTE <onboarding@resend.dev>";

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(to: string, fullName: string, code: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${code} - Votre code de vérification SIKA TEXTE`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f0f4f8; padding: 24px; border-radius: 16px;">
          <div style="background: linear-gradient(135deg, #0f172a, #1a4fa0); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 22px; margin: 0;">SIKA TEXTE</h1>
            <p style="color: #93c5fd; margin: 4px 0 0;">Business</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px;">
            <p style="color: #374151; font-size: 15px; margin-top: 0;">Bonjour <strong>${fullName}</strong>,</p>
            <p style="color: #374151; font-size: 14px;">Voici votre code de vérification :</p>
            <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1a4fa0;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 13px;">Ce code expire dans <strong>10 minutes</strong>.</p>
            <p style="color: #6b7280; font-size: 13px;">Si vous n'avez pas créé de compte SIKA TEXTE, ignorez cet email.</p>
          </div>
          <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 16px;">© SIKA TEXTE Business</p>
        </div>
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
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f0f4f8; padding: 24px; border-radius: 16px;">
          <div style="background: linear-gradient(135deg, #0f172a, #1a4fa0); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 22px; margin: 0;">SIKA TEXTE</h1>
            <p style="color: #93c5fd; margin: 4px 0 0;">Business</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px;">
            <p style="color: #374151; font-size: 15px; margin-top: 0;">Bonjour <strong>${fullName}</strong>,</p>
            <p style="color: #374151; font-size: 14px;">Voici votre code pour réinitialiser votre mot de passe :</p>
            <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #d97706;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 13px;">Ce code expire dans <strong>15 minutes</strong>.</p>
            <p style="color: #6b7280; font-size: 13px;">Si vous n'avez pas demandé ce changement, ignorez cet email.</p>
          </div>
          <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 16px;">© SIKA TEXTE Business</p>
        </div>
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
