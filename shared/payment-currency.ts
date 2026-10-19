/** CFA service prices keep their numeric amount; Cameroon settles in XAF. */
export function paymentCurrency(country: string | null | undefined, currency: string | null): string {
  const code = (currency ?? "").trim().toUpperCase();
  return country?.toUpperCase() === "CM" && (code === "XOF" || code === "XAF") ? "XAF" : code;
}

/** Repair only the historical Cameroon XOF label, never arbitrary currency mismatches. */
export function matchesPaymentCurrency(
  country: string | null | undefined,
  recordedCurrency: string | null,
  providerCurrency: string,
): boolean {
  return providerCurrency.trim().toUpperCase() === paymentCurrency(country, recordedCurrency);
}
