import { useState, useEffect } from "react";
import { useParams } from "wouter";

const COUNTRIES: {
  code: string; name: string; flag: string; prefix: string; currency: string;
  phoneDigits: number; phonePlaceholder: string;
  operators: { code: string; name: string; color: string; label: string }[];
}[] = [
  {
    code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", currency: "XOF",
    phoneDigits: 10, phonePlaceholder: "01 23 45 67 89",
    operators: [
      { code: "mtn", name: "MTN Money", label: "MTN", color: "#FFD700" },
      { code: "moov", name: "Moov Money", label: "MOOV", color: "#0057A8" },
    ],
  },
  {
    code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", currency: "XOF",
    phoneDigits: 8, phonePlaceholder: "01 23 45 67",
    operators: [
      { code: "mtn", name: "MTN Money", label: "MTN", color: "#FFD700" },
      { code: "moov", name: "Moov Money", label: "MOOV", color: "#0057A8" },
      { code: "orange", name: "Orange Money", label: "ORAN", color: "#FF6900" },
      { code: "wave", name: "Wave", label: "WAVE", color: "#1AC8DB" },
    ],
  },
  {
    code: "SN", name: "Sénégal", flag: "🇸🇳", prefix: "+221", currency: "XOF",
    phoneDigits: 8, phonePlaceholder: "01 23 45 67",
    operators: [
      { code: "orange", name: "Orange Money", label: "ORAN", color: "#FF6900" },
      { code: "wave", name: "Wave", label: "WAVE", color: "#1AC8DB" },
      { code: "free", name: "Free Money", label: "FREE", color: "#CC0000" },
    ],
  },
  {
    code: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", currency: "XOF",
    phoneDigits: 8, phonePlaceholder: "01 23 45 67",
    operators: [
      { code: "moov", name: "Moov Money", label: "MOOV", color: "#0057A8" },
      { code: "orange", name: "Orange Money", label: "ORAN", color: "#FF6900" },
    ],
  },
  {
    code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", currency: "XOF",
    phoneDigits: 8, phonePlaceholder: "01 23 45 67",
    operators: [
      { code: "moov", name: "Moov Money", label: "MOOV", color: "#0057A8" },
      { code: "tmoney", name: "T-Money", label: "T-MNY", color: "#E30613" },
    ],
  },
  {
    code: "CM", name: "Cameroun", flag: "🇨🇲", prefix: "+237", currency: "XAF",
    phoneDigits: 9, phonePlaceholder: "6 90 12 34 56",
    operators: [
      { code: "mtn", name: "MTN Money", label: "MTN", color: "#FFD700" },
      { code: "orange", name: "Orange Money", label: "ORAN", color: "#FF6900" },
    ],
  },
  {
    code: "COG", name: "Congo-Brazzaville", flag: "🇨🇬", prefix: "+242", currency: "XAF",
    phoneDigits: 8, phonePlaceholder: "01 23 45 67",
    operators: [
      { code: "mtn", name: "MTN Money", label: "MTN", color: "#FFD700" },
      { code: "airtel", name: "Airtel Money", label: "AIRT", color: "#E40000" },
    ],
  },
];

type Step = "form" | "otp" | "pending" | "success" | "failed";

export default function PaymentLinkPage() {
  const params = useParams<{ linkId: string }>();
  const linkId = params.linkId;

  const [link, setLink] = useState<any>(null);
  const [loadError, setLoadError] = useState("");

  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [selectedOperator, setSelectedOperator] = useState(COUNTRIES[0].operators[0]);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [txnId, setTxnId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [pollCount, setPollCount] = useState(0);

  const requiresOtp = selectedOperator.code === "orange" &&
    (selectedCountry.code === "CI" || selectedCountry.code === "SN");

  const otpUssdCode = selectedCountry.code === "CI" ? "#144#" : "#144*82#";

  // Load link details
  useEffect(() => {
    if (!linkId) return;
    fetch(`/api/public/payment-links/${linkId}`)
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.message || "Lien invalide"); });
        return r.json();
      })
      .then(data => setLink(data))
      .catch(err => setLoadError(err.message));
  }, [linkId]);

  // Poll status after payment initiated
  useEffect(() => {
    if (step !== "pending" || !txnId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/public/payment-links/check/${txnId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "completed") { setStep("success"); return; }
        if (data.status === "failed") { setStep("failed"); setStatusMessage("Paiement échoué ou expiré."); return; }
        setPollCount(c => c + 1);
      } catch { /* ignore */ }
    };
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [step, txnId]);

  useEffect(() => {
    if (step === "pending" && pollCount >= 36) {
      setStep("failed");
      setStatusMessage("Délai dépassé. Vérifiez votre téléphone ou réessayez.");
    }
  }, [pollCount, step]);

  const handleCountryChange = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
    setSelectedCountry(country);
    setSelectedOperator(country.operators[0]);
    setPhone("");
    setOtp("");
  };

  // Step 1 → validate form, then either go to OTP step or submit directly
  const handleFormNext = () => {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (!digits) { setError("Veuillez saisir votre numéro Mobile Money"); return; }
    if (digits.length !== selectedCountry.phoneDigits) {
      setError(`Le numéro doit contenir ${selectedCountry.phoneDigits} chiffres pour ${selectedCountry.name}`);
      return;
    }
    if (!firstName.trim() || !lastName.trim()) { setError("Veuillez saisir votre prénom et nom"); return; }
    if (requiresOtp) {
      setStep("otp");
      return;
    }
    doSubmit("");
  };

  // Step 2 → confirm OTP and submit
  const handleOtpConfirm = () => {
    setError("");
    if (!otp.trim()) { setError("Veuillez saisir l'OTP reçu"); return; }
    doSubmit(otp.trim());
  };

  const doSubmit = async (otpValue: string) => {
    setSubmitting(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const res = await fetch(`/api/public/payment-links/${linkId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: digits,
          operator: selectedOperator.code,
          country: selectedCountry.code,
          otp: otpValue || undefined,
          customerName: `${firstName.trim()} ${lastName.trim()}`,
          customerEmail: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erreur lors de l'initiation du paiement");
        if (requiresOtp) setStep("otp");
        return;
      }
      setTxnId(data.transactionId);
      setStep("pending");
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Header ──
  const Header = () => (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="SIKApay" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-black text-blue-700 text-sm">SIKApay</span>
        </div>
        <span className="text-xs text-gray-400">🔒 Paiement sécurisé</span>
      </div>
    </div>
  );

  // ── Loading ──
  if (!link && !loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0f4f8" }}>
        <div className="text-center text-gray-400">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p>Chargement…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "#f0f4f8" }}>
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-lg">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="font-bold text-gray-800 text-lg mb-2">Lien invalide</h2>
          <p className="text-gray-500 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "#f0f4f8" }}>
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="font-black text-gray-800 text-xl mb-2">Paiement réussi !</h2>
          <p className="text-gray-500 text-sm mb-1">
            <strong>{parseFloat(link.amount).toLocaleString("fr-FR")} {link.currency}</strong> reçu avec succès.
          </p>
          <p className="text-gray-400 text-xs">{link.label}</p>
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400">Paiement sécurisé par <strong className="text-blue-700">SIKApay</strong></p>
          </div>
        </div>
      </div>
    );
  }

  // ── Failed ──
  if (step === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "#f0f4f8" }}>
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-lg">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="font-black text-gray-800 text-xl mb-2">Paiement échoué</h2>
          <p className="text-gray-500 text-sm mb-4">{statusMessage}</p>
          <button
            onClick={() => { setStep("form"); setTxnId(""); setPollCount(0); setError(""); setOtp(""); }}
            className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm"
          >Réessayer</button>
        </div>
      </div>
    );
  }

  // ── Pending ──
  if (step === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "#f0f4f8" }}>
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-lg">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <h2 className="font-black text-gray-800 text-xl mb-2">Validation en cours…</h2>
          <p className="text-gray-500 text-sm mb-1">
            Confirmez le paiement de <strong>{parseFloat(link.amount).toLocaleString("fr-FR")} {link.currency}</strong> sur votre téléphone.
          </p>
          <p className="text-gray-400 text-xs mt-3">
            Un message USSD va apparaître sur le numéro <strong>{selectedCountry.prefix} {phone}</strong>
          </p>
          <div className="mt-5 bg-blue-50 rounded-2xl p-3 text-xs text-blue-700">
            ⏳ En attente de validation… ({Math.floor(pollCount * 5 / 60)}m{(pollCount * 5) % 60}s)
          </div>
          <button
            onClick={() => { setStep("form"); setTxnId(""); setPollCount(0); }}
            className="mt-4 text-xs text-gray-400 underline"
          >Annuler</button>
        </div>
      </div>
    );
  }

  // ── OTP Step (2nd screen) ──
  if (step === "otp") {
    return (
      <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
        <Header />
        <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
          {/* Recap card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total à payer</p>
            <p className="font-black text-4xl text-gray-900">
              {parseFloat(link.amount).toLocaleString("fr-FR")}
              <span className="text-xl ml-2 text-gray-500">{link.currency}</span>
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-1">{link.label}</p>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>{selectedCountry.flag}</span>
              <span className="font-medium">{selectedCountry.prefix} {phone}</span>
              <span>·</span>
              <span
                className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                style={{ background: selectedOperator.color }}
              >{selectedOperator.name}</span>
            </div>
          </div>

          {/* OTP instructions card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm"
                style={{ background: selectedOperator.color }}>
                {selectedOperator.label}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Code OTP requis</p>
                <p className="text-xs text-gray-400">Orange Money {selectedCountry.name}</p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
              <p className="text-sm font-bold text-orange-800 mb-1">📱 Étape 1 — Obtenez votre OTP</p>
              <p className="text-sm text-orange-700">
                Composez le <strong className="text-orange-900 text-base">{otpUssdCode}</strong> sur votre téléphone.
              </p>
              <p className="text-xs text-orange-500 mt-1">L'OTP reçu est valable 5 minutes.</p>
            </div>

            <p className="text-sm font-bold text-gray-700 mb-2">✏️ Étape 2 — Saisissez l'OTP</p>
            <input
              type="number"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="• • • • • •"
              maxLength={6}
              autoFocus
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-2xl font-black text-center focus:outline-none focus:border-orange-400 bg-gray-50 tracking-[0.5em]"
            />
            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
                ❌ {error}
              </div>
            )}
          </div>

          <button
            onClick={handleOtpConfirm}
            disabled={submitting || !otp.trim()}
            className="w-full py-4 rounded-2xl font-black text-base text-white shadow-lg active:scale-[0.97] transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}
          >
            {submitting ? "Validation…" : "Confirmer le paiement"}
          </button>

          <button
            onClick={() => { setStep("form"); setOtp(""); setError(""); }}
            className="w-full text-center text-sm text-gray-400 underline py-2"
          >← Retour</button>

          <div className="text-center pb-4">
            <p className="text-xs text-gray-400">Paiement sécurisé par <strong className="text-gray-600">SIKApay</strong></p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form (Step 1) ──
  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
      <Header />

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {/* Link image */}
        {link.imageUrl && (
          <div className="rounded-3xl overflow-hidden shadow-sm w-full" style={{ maxHeight: 200 }}>
            <img src={link.imageUrl} alt={link.label} className="w-full object-cover" style={{ maxHeight: 200 }} />
          </div>
        )}

        {/* Amount card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total à payer</p>
          <p className="font-black text-5xl text-gray-900">
            {parseFloat(link.amount).toLocaleString("fr-FR")}
            <span className="text-2xl ml-2 text-gray-500">{link.currency}</span>
          </p>
          <p className="font-bold text-gray-700 mt-2 text-base uppercase tracking-wide">{link.label}</p>
          {link.description && (
            <p className="text-gray-400 text-xs mt-1">{link.description}</p>
          )}
        </div>

        {/* Country + Operator + Phone */}
        <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
          {/* Country */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pays Mobile Money</p>
            <select
              value={selectedCountry.code}
              onChange={e => handleCountryChange(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.currency})</option>
              ))}
            </select>
          </div>

          {/* Operator */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Opérateur Mobile Money</p>
            <div className="grid grid-cols-2 gap-2">
              {selectedCountry.operators.map(op => (
                <button
                  key={op.code}
                  onClick={() => { setSelectedOperator(op); setOtp(""); }}
                  className={`p-3 rounded-2xl border-2 text-center transition-all ${
                    selectedOperator.code === op.code
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center text-white font-black text-xs"
                    style={{ background: op.color }}>
                    {op.label}
                  </div>
                  <p className="text-xs font-semibold text-gray-700 leading-tight">{op.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Numéro Mobile Money</p>
            <div className="flex gap-2">
              <div className="flex items-center px-3 py-3 bg-gray-100 rounded-2xl text-sm font-semibold text-gray-600 border border-gray-200 whitespace-nowrap">
                {selectedCountry.flag} {selectedCountry.prefix}
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={selectedCountry.phonePlaceholder}
                maxLength={selectedCountry.phoneDigits + 4}
                className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 ml-1">{selectedCountry.phoneDigits} chiffres requis</p>
          </div>

          {/* OTP hint (info only — not the input) */}
          {requiresOtp && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-start gap-2">
              <span className="text-orange-500 text-base mt-0.5">⚠️</span>
              <div>
                <p className="text-xs font-bold text-orange-700">OTP requis pour Orange Money</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  Un code OTP vous sera demandé à l'étape suivante. Préparez-le en composant le <strong>{otpUssdCode}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Name + Email */}
        <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Prénom</p>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Jean"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nom</p>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Dupont"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email (optionnel)</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="jean@exemple.com"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50" />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
            ❌ {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleFormNext}
          disabled={submitting}
          className="w-full py-4 rounded-2xl font-black text-base text-white shadow-lg active:scale-[0.97] transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
        >
          {requiresOtp
            ? `Suivant — Saisir l'OTP`
            : `Payer ${parseFloat(link.amount).toLocaleString("fr-FR")} ${link.currency}`
          }
        </button>

        <div className="text-center pb-4">
          <p className="text-xs text-gray-400">Paiement sécurisé par <strong className="text-gray-600">SIKApay</strong></p>
        </div>
      </div>
    </div>
  );
}
