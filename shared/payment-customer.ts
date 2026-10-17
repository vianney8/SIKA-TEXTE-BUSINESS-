/** Account payments always use the session owner's email, never a client override. */
export function paymentCustomerEmail(submitted?: string | null, accountEmail?: string | null): string {
  return String(accountEmail || submitted || "").trim().toLowerCase();
}

export function linkManualPaymentAllowed(options: {
  solvexEnabled: boolean;
  globalManualEnabled: boolean;
  linkManualMode: boolean;
  countryMode: string;
  country: string;
  operator: string;
}): boolean {
  const mode = options.countryMode;
  if (mode === "solvexpay") return false;
  return (options.globalManualEnabled && mode === "manual")
    || (options.country.toLowerCase() === "ci"
      && options.operator.toLowerCase() === "wave" && mode === "robotpay");
}
