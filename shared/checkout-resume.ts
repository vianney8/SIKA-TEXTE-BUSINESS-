import { shouldResumeDnsAttempt, type DnsPaymentStatus } from "./dns-payment-state";

interface SavedCheckout {
  transactionId: string;
  providerAccepted?: unknown;
  message?: unknown;
  amount?: unknown;
  currency?: unknown;
}

/** The authenticated server's pending attempt wins over browser-local history. */
export function resolveCheckoutResume(
  serverTransactionId: string | undefined,
  cached: unknown,
  dnsPayment?: DnsPaymentStatus,
  isDns = false,
): SavedCheckout | null {
  const saved = cached && typeof cached === "object" ? cached as Partial<SavedCheckout> : null;
  const id = serverTransactionId || saved?.transactionId;
  if (typeof id !== "string" || !id || (isDns && !shouldResumeDnsAttempt(id, dnsPayment))) return null;
  return saved?.transactionId === id ? { ...saved, transactionId: id } : { transactionId: id };
}
