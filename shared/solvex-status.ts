export type SolvexCheckoutStatus = "completed" | "failed" | "pending";

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
