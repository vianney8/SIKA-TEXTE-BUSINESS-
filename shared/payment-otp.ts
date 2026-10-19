/** Orange's payment-code requirement for automatic SolvexPay checkouts. */
export function requiresPaymentOtp(country: string, operator: string): boolean {
  return operator.toLowerCase() === "orange" && ["CI", "BF"].includes(country.toUpperCase());
}

export function paymentOtpInstructions(country: string): string {
  return country.toUpperCase() === "BF"
    ? "Obtenez votre code de paiement à usage unique dans le menu Orange Money Burkina Faso, puis saisissez-le ici."
    : "Composez le #144# pour obtenir votre code de paiement Orange Money Côte d’Ivoire, puis saisissez-le ici.";
}

export function paymentOtpError(country: string, operator: string, otp: unknown): string | null {
  if (!requiresPaymentOtp(country, operator)) return null;
  return typeof otp === "string" && /^\d{4,10}$/.test(otp.trim())
    ? null
    : "Saisissez un code de paiement Orange Money valide (4 à 10 chiffres).";
}
