export const PAYMENT_COUNTRIES = ["BJ", "CI", "SN", "BF", "TG", "CM"] as const;
export type CountryPaymentMode = "solvexpay" | "manual" | "redirect";
export function countryPaymentMode(settings: Record<string, string>, country: string): CountryPaymentMode {
  const value = settings[`${country.toLowerCase()}_activation_mode`];
  // Old country settings must never initiate another retired-provider payment.
  if (value === "robotpay") return "solvexpay";
  return ["solvexpay", "manual", "redirect"].includes(value) ? value as CountryPaymentMode : "manual";
}

export function usesSolvexPaymentMode(service: string, mode?: string | null): boolean {
  return service === "dns" ? mode !== "manual" : !mode || mode === "solvexpay" || mode === "robotpay";
}

export const CHECKOUT_MODELS = ["legacy", "simple", "pro"] as const;
export type CheckoutModel = typeof CHECKOUT_MODELS[number];

export function checkoutModel(value?: string | null): CheckoutModel {
  return CHECKOUT_MODELS.includes(value as CheckoutModel) ? value as CheckoutModel : "simple";
}

export function usesUnifiedCheckout(model: CheckoutModel, directGateway = false): boolean {
  return directGateway || model === "simple" || model === "pro";
}

export function changeCheckoutSetting(
  settings: Record<string, string>, key: string, value: string,
): Record<string, string> {
  return { ...settings, [key]: value };
}
