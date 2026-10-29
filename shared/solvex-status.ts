export type SolvexCheckoutStatus = "completed" | "failed" | "pending";

/** Accept provider envelopes without mistaking their wrapper for a transaction. */
export function solvexTransactionData(payload: any): any {
  return payload?.transaction ?? payload?.data?.transaction ?? payload?.data ?? payload;
}

const COMPLETED_STATUSES = new Set([
  "completed", "complete", "success", "successful", "succeeded", "paid", "approved", "confirmed",
]);
const FAILED_STATUSES = new Set([
  "failed", "failure", "rejected", "declined", "cancelled", "canceled", "expired", "error", "denied",
]);

export function normalizeSolvexStatus(status: unknown, event?: unknown): SolvexCheckoutStatus {
  const raw = String(status ?? event ?? "").trim().toLowerCase();
  const value = raw.split(/[.:/]/).filter(Boolean).at(-1)?.replace(/[\s-]+/g, "_") ?? "";
  if (COMPLETED_STATUSES.has(value)) return "completed";
  if (FAILED_STATUSES.has(value)) return "failed";
  return "pending";
}
