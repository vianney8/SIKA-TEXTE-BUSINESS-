/** Prices are stored as decimal strings, never accepted as NaN/Infinity/zero. */
export function serviceAmount(value: unknown, currency = "XOF"): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  if (currency === "XOF" && !Number.isInteger(amount)) return null;
  return Number.isFinite(amount) && amount > 0 && amount < 1e13 ? amount.toFixed(2) : null;
}

export function linkedPriceIds(id: string): string[] {
  return ["codepcs", "d3e5479d"].includes(id) ? ["codepcs", "d3e5479d"] : [id];
}

/** Older clients omit quotes; new checkouts must never debit a changed price. */
export function matchesServiceQuote(
  expected: { amount?: number; currency?: string },
  actual: { amount: number; currency: string },
): boolean {
  if (expected.amount === undefined && expected.currency === undefined) return true;
  return expected.amount === actual.amount && expected.currency === actual.currency;
}
