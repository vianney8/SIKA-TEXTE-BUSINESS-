const COUNTRY_MODE_KEYS = new Set([
  "bj_activation_mode", "ci_activation_mode", "sn_activation_mode",
  "bf_activation_mode", "tg_activation_mode", "cm_activation_mode",
]);

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
  const next = { ...settings, [key]: value };
  // Selecting the automatic gateway must also enable its site-wide switch.
  // An explicit global disable and the presentation choice remain independent.
  if (COUNTRY_MODE_KEYS.has(key) && value === "solvexpay") {
    next.solvexpay_enabled = "true";
  }
  return next;
}
