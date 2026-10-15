/** Keep local digits intact, including local numbers beginning with a dial code. */
export function localPaymentPhone(phone: string, prefix: string, localLength: number): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === localLength && !phone.trim().startsWith("+")) return digits;
  return digits.startsWith(prefix) ? digits.slice(prefix.length) : digits;
}
