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
  if (options.solvexEnabled) return false;
  const mode = options.countryMode === "solvexpay" ? "manual" : options.countryMode;
  return (options.globalManualEnabled && (options.linkManualMode || mode === "manual"))
    || (options.country.toLowerCase() === "ci"
      && options.operator.toLowerCase() === "wave" && mode === "robotpay");
}
