const COUNTRY_MODE_KEYS = new Set([
  "bj_activation_mode", "ci_activation_mode", "sn_activation_mode",
  "bf_activation_mode", "tg_activation_mode", "cm_activation_mode",
]);

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
