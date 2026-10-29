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

/** Keep uncertain/in-flight attempts, but never restore a failure already acknowledged for retry. */
export function shouldResumeDnsAttempt(transactionId: string, payment: DnsPaymentStatus | undefined): boolean {
  return !(payment?.status === "failed" && payment.retryRequested && payment.transactionId === transactionId);
}

export function discardAcknowledgedDnsAttempts(
  storage: Pick<Storage, "length" | "key" | "getItem" | "removeItem">,
  payment: DnsPaymentStatus,
): void {
  if (payment.status !== "failed" || !payment.retryRequested || !payment.transactionId) return;
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
): "loading" | "intro" | "form" | "failed" | "pending" | "unconfirmed" | "completed" | "outdated" {
  if (!payment) return "loading";
  if (payment.status === "completed" || payment.status === "pending" || payment.status === "unconfirmed") return payment.status;
  if (formRequested || (payment.status === "failed" && payment.retryRequested)) return "form";
  if (payment.status === "outdated") return "outdated";
  return payment.status === "failed" ? "failed" : "intro";
}
