import type { DnsRelease } from "./dns-version";

export interface DnsPaymentStatus {
  status: "none" | "pending" | "completed" | "failed" | "outdated";
  transactionId?: string;
  retryRequested?: boolean;
  currentVersion?: string;
  installedVersion?: string | null;
  announcement?: DnsRelease | null;
}

export function getDnsPaymentView(
  payment: DnsPaymentStatus | undefined,
  formRequested: boolean,
): "loading" | "intro" | "form" | "failed" | "pending" | "completed" | "outdated" {
  if (!payment) return "loading";
  if (payment.status === "completed" || payment.status === "pending") return payment.status;
  if (formRequested || (payment.status === "failed" && payment.retryRequested)) return "form";
  if (payment.status === "outdated") return "outdated";
  return payment.status === "failed" ? "failed" : "intro";
}
