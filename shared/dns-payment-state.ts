export interface DnsPaymentStatus {
  status: "none" | "pending" | "completed" | "failed";
  transactionId?: string;
  retryRequested?: boolean;
}

export function getDnsPaymentView(
  payment: DnsPaymentStatus | undefined,
  formRequested: boolean,
): "loading" | "intro" | "form" | "failed" | "pending" | "completed" {
  if (!payment) return "loading";
  if (payment.status === "completed" || payment.status === "pending") return payment.status;
  if (formRequested || (payment.status === "failed" && payment.retryRequested)) return "form";
  return payment.status === "failed" ? "failed" : "intro";
}
