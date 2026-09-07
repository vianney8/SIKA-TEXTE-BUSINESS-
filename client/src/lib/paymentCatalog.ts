export type PaymentCountry = {
  code: string;
  name: string;
  westPayName: string;
  flag: string;
  prefix: string;
  phonePlaceholder: string;
  currency: string;
  operators: string[];
};

export const PAYMENT_COUNTRIES: PaymentCountry[] = [
  { code: "TG", name: "Togo", westPayName: "Togo", flag: "🇹🇬", prefix: "228", phonePlaceholder: "90 12 34 56", currency: "XOF", operators: ["moov", "tmoney"] },
  { code: "BJ", name: "Bénin", westPayName: "Benin", flag: "🇧🇯", prefix: "229", phonePlaceholder: "01 23 45 67 89", currency: "XOF", operators: ["mtn"] },
  { code: "BF", name: "Burkina Faso", westPayName: "Burkina Faso", flag: "🇧🇫", prefix: "226", phonePlaceholder: "70 12 34 56", currency: "XOF", operators: ["moov", "orange"] },
  { code: "CI", name: "Côte d'Ivoire", westPayName: "Cote d'Ivoire", flag: "🇨🇮", prefix: "225", phonePlaceholder: "05 12 34 56 78", currency: "XOF", operators: ["moov", "mtn", "orange", "wave"] },
  { code: "SN", name: "Sénégal", westPayName: "Senegal", flag: "🇸🇳", prefix: "221", phonePlaceholder: "77 123 45 67", currency: "XOF", operators: ["mixx", "orange", "wave"] },
  { code: "ML", name: "Mali", westPayName: "Mali", flag: "🇲🇱", prefix: "223", phonePlaceholder: "76 12 34 56", currency: "XOF", operators: ["orange"] },
  { code: "CM", name: "Cameroun", westPayName: "Cameroun", flag: "🇨🇲", prefix: "237", phonePlaceholder: "6 12 34 56 78", currency: "XAF", operators: ["mtn", "orange"] },
  { code: "CG", name: "Congo-Brazzaville", westPayName: "Congo Brazzaville", flag: "🇨🇬", prefix: "242", phonePlaceholder: "06 123 45 67", currency: "XAF", operators: ["mtn"] },
  { code: "CD", name: "Congo RDC", westPayName: "Congo RDC", flag: "🇨🇩", prefix: "243", phonePlaceholder: "81 234 56 78", currency: "CDF", operators: ["orange", "mpesa"] },
  { code: "GA", name: "Gabon", westPayName: "Gabon", flag: "🇬🇦", prefix: "241", phonePlaceholder: "06 12 34 56", currency: "XAF", operators: ["airtel", "moov"] },
  { code: "GN", name: "Guinée", westPayName: "Guinée", flag: "🇬🇳", prefix: "224", phonePlaceholder: "620 12 34 56", currency: "GNF", operators: ["mtn", "orange"] },
  { code: "NE", name: "Niger", westPayName: "Niger", flag: "🇳🇪", prefix: "227", phonePlaceholder: "90 12 34 56", currency: "XOF", operators: ["airtel", "moov", "zamani", "amana", "mynita"] },
  { code: "KE", name: "Kenya", westPayName: "Kenya", flag: "🇰🇪", prefix: "254", phonePlaceholder: "712 345 678", currency: "KES", operators: ["airtel", "safaricom", "mpesa"] },
  { code: "GH", name: "Ghana", westPayName: "Ghana", flag: "🇬🇭", prefix: "233", phonePlaceholder: "24 123 4567", currency: "GHS", operators: ["mtn", "airteltigo", "vodafone"] },
  { code: "NG", name: "Nigeria", westPayName: "Nigeria", flag: "🇳🇬", prefix: "234", phonePlaceholder: "803 123 4567", currency: "NGN", operators: ["mtn", "airtel", "opay", "palmpay"] },
  { code: "PK", name: "Pakistan", westPayName: "Pakistan", flag: "🇵🇰", prefix: "92", phonePlaceholder: "300 1234567", currency: "PKR", operators: ["easypaisa", "jazzcash", "nayapay", "sadapay"] },
  { code: "PH", name: "Philippines", westPayName: "Philippines", flag: "🇵🇭", prefix: "63", phonePlaceholder: "917 123 4567", currency: "PHP", operators: ["gcash", "maya"] },
  { code: "IN", name: "Inde", westPayName: "India", flag: "🇮🇳", prefix: "91", phonePlaceholder: "98765 43210", currency: "INR", operators: ["upi", "phonepe", "gpay"] },
];

export const PAYMENT_OPERATORS: Record<string, { name: string; full: string; bg: string; text: string; border: string; initials: string }> = {
  mtn: { name: "MTN", full: "MTN Mobile Money", bg: "#FFCC00", text: "#1a1a1a", border: "#e6b800", initials: "MTN" },
  moov: { name: "Moov", full: "Moov Money", bg: "#005BAA", text: "#fff", border: "#004d99", initials: "MV" },
  orange: { name: "Orange", full: "Orange Money", bg: "#FF6600", text: "#fff", border: "#e55c00", initials: "OM" },
  wave: { name: "Wave", full: "Wave", bg: "#1B6FEE", text: "#fff", border: "#1560d4", initials: "W" },
  tmoney: { name: "TMoney", full: "TMoney", bg: "#C8102E", text: "#fff", border: "#a50d25", initials: "TM" },
  mixx: { name: "Mixx", full: "Mixx by Yas", bg: "#7C3AED", text: "#fff", border: "#6D28D9", initials: "MX" },
  airtel: { name: "Airtel", full: "Airtel Money", bg: "#E40000", text: "#fff", border: "#c20000", initials: "AM" },
  mpesa: { name: "M-Pesa", full: "M-Pesa", bg: "#43A047", text: "#fff", border: "#2E7D32", initials: "MP" },
  zamani: { name: "Zamani", full: "Zamani", bg: "#00897B", text: "#fff", border: "#00695C", initials: "ZM" },
  amana: { name: "Amana", full: "Amana", bg: "#5E35B1", text: "#fff", border: "#4527A0", initials: "AN" },
  mynita: { name: "Mynita", full: "Mynita", bg: "#00796B", text: "#fff", border: "#00695C", initials: "MY" },
  safaricom: { name: "Safaricom", full: "Safaricom M-Pesa", bg: "#39B54A", text: "#fff", border: "#258B34", initials: "SF" },
  airteltigo: { name: "AirtelTigo", full: "AirtelTigo Money", bg: "#E91E63", text: "#fff", border: "#C2185B", initials: "AT" },
  vodafone: { name: "Vodafone", full: "Vodafone Cash", bg: "#E60000", text: "#fff", border: "#BD0000", initials: "VF" },
  opay: { name: "OPay", full: "OPay", bg: "#00B875", text: "#fff", border: "#008F5B", initials: "OP" },
  palmpay: { name: "PalmPay", full: "PalmPay", bg: "#6C4CE3", text: "#fff", border: "#5235BD", initials: "PP" },
  easypaisa: { name: "EasyPaisa", full: "EasyPaisa", bg: "#00A651", text: "#fff", border: "#007F3E", initials: "EP" },
  jazzcash: { name: "JazzCash", full: "JazzCash", bg: "#ED1C24", text: "#fff", border: "#B9151B", initials: "JC" },
  nayapay: { name: "NayaPay", full: "NayaPay", bg: "#232F5D", text: "#fff", border: "#17203F", initials: "NP" },
  sadapay: { name: "SadaPay", full: "SadaPay", bg: "#FF6B6B", text: "#fff", border: "#E05252", initials: "SP" },
  gcash: { name: "GCash", full: "GCash", bg: "#007DFE", text: "#fff", border: "#0064CB", initials: "GC" },
  maya: { name: "Maya", full: "Maya (PayMaya)", bg: "#00B86B", text: "#fff", border: "#008F54", initials: "MY" },
  upi: { name: "UPI", full: "UPI / IMPS", bg: "#097939", text: "#fff", border: "#065C2B", initials: "UPI" },
  phonepe: { name: "PhonePe", full: "PhonePe", bg: "#5F259F", text: "#fff", border: "#481C79", initials: "PE" },
  gpay: { name: "Google Pay", full: "Google Pay", bg: "#4285F4", text: "#fff", border: "#2C6BC4", initials: "GP" },
};