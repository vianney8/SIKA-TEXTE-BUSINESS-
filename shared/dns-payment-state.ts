import type { DnsRelease } from "./dns-version";

export interface DnsPaymentStatus {
  status: "none" | "pending" | "unconfirmed" | "completed" | "failed" | "outdated";
  transactionId?: string;
  paymentMode?: "manual" | "solvexpay" | "robotpay";
  retryRequested?: boolean;
  currentVersion?: string;
  installedVersion?: string | null;
  announcement?: DnsRelease | null;
}

/** Do not restore an old attempt explicitly acknowledged for retry. */
export function shouldResumeDnsAttempt(transactionId: string, payment: DnsPaymentStatus | undefined): boolean {
  return !((payment?.status === "failed" || payment?.status === "unconfirmed") && payment.retryRequested && payment.transactionId === transactionId);
}

export function discardAcknowledgedDnsAttempts(
  storage: Pick<Storage, "length" | "key" | "getItem" | "removeItem">,
  payment: DnsPaymentStatus,
): void {
  if (!["failed", "unconfirmed"].includes(payment.status) || !payment.retryRequested || !payment.transactionId) return;
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) {
    if (!key?.startsWith("sika-checkout:")) continue;
    try {
      const saved = JSON.parse(storage.getItem(key) || "null");
      if (saved?.transactionId === payment.transactionId) storage.removeItem(key);
    } catch {
      // An unrelated malformed cache entry must not interrupt the acknowledged retry.
    }
  }
}

export function getDnsPaymentView(
  payment: DnsPaymentStatus | undefined,
  formRequested: boolean,
): "loading" | "intro" | "form" | "failed" | "pending" | "automatic-pending" | "unconfirmed" | "completed" | "outdated" {
  if (!payment) return "loading";
  if (payment.status === "pending") return payment.paymentMode === "solvexpay" ? "automatic-pending" : "pending";
  if (payment.status === "completed") return "completed";
  if (payment.status === "unconfirmed") return payment.retryRequested ? "form" : "unconfirmed";
  if (formRequested || (payment.status === "failed" && payment.retryRequested)) return "form";
  if (payment.status === "outdated") return "outdated";
  return payment.status === "failed" ? "failed" : "intro";
}
