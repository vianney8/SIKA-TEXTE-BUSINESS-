import { useState, useEffect } from "react";
import { useParams } from "wouter";

const COUNTRIES: {
  code: string; name: string; flag: string; prefix: string; currency: string;
  phonePlaceholder: string; phoneDigits: number;
  operators: { code: string; name: string; short: string; color: string; bg: string }[];
}[] = [
  {
    code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", currency: "XOF",
    phonePlaceholder: "01 23 45 67 89", phoneDigits: 10,
    operators: [
      { code: "mtn", name: "MTN Money", short: "MTN", color: "#fff", bg: "#FFCC00" },
      { code: "moov", name: "Moov Money", short: "MOOV", color: "#fff", bg: "#0057A8" },
    ],
  },
  {
    code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", currency: "XOF",
    phonePlaceholder: "05 12 34 56 78", phoneDigits: 10,
    operators: [
      { code: "mtn", name: "MTN Money", short: "MTN", color: "#fff", bg: "#FFCC00" },
      { code: "moov", name: "Moov Money", short: "MOOV", color: "#fff", bg: "#0057A8" },
      { code: "orange", name: "Orange Money", short: "ORAN", color: "#fff", bg: "#FF6900" },
      { code: "wave", name: "Wave", short: "WAVE", color: "#fff", bg: "#1AC8DB" },
    ],
  },
  {
    code: "SN", name: "Sénégal", flag: "🇸🇳", prefix: "+221", currency: "XOF",
    phonePlaceholder: "01 23 45 67", phoneDigits: 8,
    operators: [
      { code: "orange", name: "Orange Money", short: "ORAN", color: "#fff", bg: "#FF6900" },
      { code: "wave", name: "Wave", short: "WAVE", color: "#fff", bg: "#1AC8DB" },
      { code: "free", name: "Free Money", short: "FREE", color: "#fff", bg: "#CC0000" },
    ],
  },
  {
    code: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", currency: "XOF",
    phonePlaceholder: "01 23 45 67", phoneDigits: 8,
    operators: [
      { code: "moov", name: "Moov Money", short: "MOOV", color: "#fff", bg: "#0057A8" },
      { code: "orange", name: "Orange Money", short: "ORAN", color: "#fff", bg: "#FF6900" },
    ],
  },
  {
    code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", currency: "XOF",
    phonePlaceholder: "01 23 45 67", phoneDigits: 8,
    operators: [
      { code: "moov", name: "Moov Money", short: "MOOV", color: "#fff", bg: "#0057A8" },
      { code: "tmoney", name: "T-Money", short: "T-MNY", color: "#fff", bg: "#E30613" },
    ],
  },
  {
    code: "CM", name: "Cameroun", flag: "🇨🇲", prefix: "+237", currency: "XAF",
    phonePlaceholder: "6 90 12 34 56", phoneDigits: 9,
    operators: [
      { code: "mtn", name: "MTN Money", short: "MTN", color: "#fff", bg: "#FFCC00" },
      { code: "orange", name: "Orange Money", short: "ORAN", color: "#fff", bg: "#FF6900" },
    ],
  },
  {
    code: "COG", name: "Congo-Brazzaville", flag: "🇨🇬", prefix: "+242", currency: "XAF",
    phonePlaceholder: "01 23 45 67", phoneDigits: 8,
    operators: [
      { code: "mtn", name: "MTN Money", short: "MTN", color: "#fff", bg: "#FFCC00" },
      { code: "airtel", name: "Airtel Money", short: "AIRT", color: "#fff", bg: "#E40000" },
    ],
  },
];

type Step = "form" | "pending" | "success" | "failed" | "redirected" | "manual_deposit" | "manual_submitted";

function AnimatedDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-current inline-block"
          style={{ animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out` }} />
      ))}
    </span>
  );
}

export default function PaymentLinkPage() {
  const params = useParams<{ linkId: string }>();
  const linkId = params.linkId;

  const [link, setLink] = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const [visible, setVisible] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [selectedOperator, setSelectedOperator] = useState(COUNTRIES[0].operators[0]);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [txnId, setTxnId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [pollCount, setPollCount] = useState(0);

  // Manual deposit state
  const [manualTxnId, setManualTxnId] = useState("");
  const [manualScreenshotFile, setManualScreenshotFile] = useState<File | null>(null);
  const [manualScreenshotPreview, setManualScreenshotPreview] = useState("");
  const [manualScreenshotUrl, setManualScreenshotUrl] = useState("");
  const [manualUploading, setManualUploading] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");
  const [copied, setCopied] = useState(false);
  const [manualInfo, setManualInfo] = useState<{
    depositNumber: string;
    depositLabel: string;
    instruction: string;
    showInstruction: boolean;
  } | null>(null);
  const [manualInfoLoading, setManualInfoLoading] = useState(false);

  const isCiRedirect = selectedCountry.code === "CI" && link?.ciRedirect === true && !link?.manualMode;

  useEffect(() => {
    if (!linkId) return;
    fetch(`/api/public/payment-links/${linkId}`)
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.message || "Lien invalide"); });
        return r.json();
      })
      .then(data => { setLink(data); setTimeout(() => setVisible(true), 80); })
      .catch(err => setLoadError(err.message));
  }, [linkId]);

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
  };

  const handleFormNext = async () => {
    setError("");
    if (!phone.trim()) { setError("Veuillez saisir votre numéro Mobile Money"); return; }
    if (!firstName.trim() || !lastName.trim()) { setError("Veuillez saisir votre prénom et nom"); return; }
    if (!email.trim()) { setError("Veuillez saisir votre adresse e-mail"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { setError("Veuillez saisir une adresse e-mail valide"); return; }
    // Mode dépôt manuel
    if (link?.manualMode) {
      setManualInfoLoading(true);
      setStep("manual_deposit");
      try {
        const res = await fetch(`/api/public/payment-links/${linkId}/manual-deposit-info?country=${selectedCountry.code}&operator=${selectedOperator.code}`);
        const data = await res.json();
        if (res.ok) {
          setManualInfo({
            depositNumber: data.depositNumber || "",
            depositLabel: data.depositLabel || `Numéro ${selectedOperator.name}`,
            instruction: data.instruction || "",
            showInstruction: !!data.showInstruction,
          });
        } else {
          setManualInfo({ depositNumber: "", depositLabel: `Numéro ${selectedOperator.name}`, instruction: "", showInstruction: false });
        }
      } catch {
        setManualInfo({ depositNumber: "", depositLabel: `Numéro ${selectedOperator.name}`, instruction: "", showInstruction: false });
      } finally {
        setManualInfoLoading(false);
      }
      return;
    }
    // CI redirect: enregistre la transaction en attente PUIS redirige
    if (isCiRedirect) {
      setSubmitting(true);
      try {
        await fetch(`/api/public/payment-links/${linkId}/ci-record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone.replace(/\s/g, ""),
            operator: selectedOperator.code,
            country: selectedCountry.code,
            customerName: `${firstName.trim()} ${lastName.trim()}`,
            customerEmail: email.trim(),
          }),
        });
      } catch {
        // Non-bloquant : on redirige quand même si l'enregistrement échoue
      } finally {
        setSubmitting(false);
      }
      window.open(link.ciRedirectUrl, "_blank");
      setStep("redirected");
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/payment-links/${linkId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/\s/g, ""),
          operator: selectedOperator.code,
          country: selectedCountry.code,
          customerName: `${firstName.trim()} ${lastName.trim()}`,
          customerEmail: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Erreur lors du paiement"); return; }
      setTxnId(data.transactionId);
      setStep("pending");
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  };

  const BG = "min-h-screen" ;
  const bgStyle = { background: "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" };

  // ── Loading ──
  if (!link && !loadError) return (
    <div className={`${BG} flex items-center justify-center`} style={bgStyle}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin" />
        </div>
        <p className="text-white/40 text-sm font-medium tracking-wide">Chargement</p>
      </div>
    </div>
  );

  // ── Error ──
  if (loadError) return (
    <div className={`${BG} flex items-center justify-center px-5`} style={bgStyle}>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="font-bold text-white text-lg mb-2">Lien introuvable</h2>
        <p className="text-white/50 text-sm">{loadError}</p>
      </div>
    </div>
  );

  // ── Success ──
  if (step === "success") return (
    <div className={`${BG} flex items-center justify-center px-5`} style={bgStyle}>
      <div className="text-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
            <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="font-black text-white text-3xl mb-2">Payé !</h2>
        <p className="text-white/60 text-base mb-1">
          <span className="text-white font-bold text-xl">{parseFloat(link.amount).toLocaleString("fr-FR")} {link.currency}</span>
        </p>
        <p className="text-white/40 text-sm">{link.label}</p>
        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="text-white/30 text-xs">Paiement sécurisé par <span className="text-white/50 font-bold">SIKApay</span></p>
        </div>
      </div>
    </div>
  );

  // ── Failed ──
  if (step === "failed") return (
    <div className={`${BG} flex items-center justify-center px-5`} style={bgStyle}>
      <div className="text-center max-w-sm w-full">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="font-black text-white text-2xl mb-2">Paiement échoué</h2>
        <p className="text-white/50 text-sm mb-8">{statusMessage}</p>
        <button
          onClick={() => { setStep("form"); setTxnId(""); setPollCount(0); setError(""); }}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
        >Réessayer</button>
      </div>
    </div>
  );

  // ── Pending ──
  if (step === "pending") return (
    <div className={`${BG} flex items-center justify-center px-5`} style={bgStyle}>
      <div className="text-center max-w-sm w-full">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-white/5" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 border-r-blue-300 animate-spin" style={{ animationDuration: "1s" }} />
          <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
        </div>
        <h2 className="font-black text-white text-2xl mb-3">Validation en cours</h2>
        <p className="text-white/60 text-sm mb-1">
          Confirmez le paiement de{" "}
          <span className="text-white font-bold">{parseFloat(link.amount).toLocaleString("fr-FR")} {link.currency}</span>{" "}
          sur votre téléphone.
        </p>
        <p className="text-white/30 text-xs mt-3">
          Message USSD sur <span className="text-white/50">{selectedCountry.prefix} {phone}</span>
        </p>
        <div className="mt-6 mx-auto max-w-xs bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
          <p className="text-blue-300 text-sm font-medium flex items-center justify-center gap-2">
            <span>⏳</span>
            <span>En attente</span>
            <AnimatedDots />
            <span className="text-white/30 text-xs ml-1">({Math.floor(pollCount * 5 / 60)}m{String((pollCount * 5) % 60).padStart(2, "0")}s)</span>
          </p>
        </div>
        <button
          onClick={() => { setStep("form"); setTxnId(""); setPollCount(0); }}
          className="mt-6 text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
        >Annuler</button>
      </div>
    </div>
  );

  // ── CI Redirected ──
  if (step === "redirected") return (
    <div className={`${BG} flex items-center justify-center px-5`} style={bgStyle}>
      <div className="text-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-pulse" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/30">
            <span className="text-5xl">🇨🇮</span>
          </div>
        </div>
        <h2 className="font-black text-white text-2xl mb-3">Redirection en cours</h2>
        <p className="text-white/60 text-sm mb-1">
          Vous avez été redirigé vers la page de paiement sécurisée.
        </p>
        <p className="text-white/40 text-xs mb-6">
          Si la page ne s'est pas ouverte, cliquez sur le bouton ci-dessous.
        </p>
        <button
          onClick={() => window.open(link.ciRedirectUrl, "_blank")}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm mb-4"
          style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}
        >
          Ouvrir la page de paiement
        </button>
        <button
          onClick={() => setStep("form")}
          className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
        >Retour</button>
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="text-white/25 text-xs">Paiement sécurisé par <span className="text-white/40 font-bold">SIKApay</span></p>
        </div>
      </div>
    </div>
  );

  // ── Manual deposit upload ──
  const handleManualScreenshot = async (file: File) => {
    setManualScreenshotFile(file);
    setManualScreenshotPreview(URL.createObjectURL(file));
    setManualUploading(true);
    try {
      const form = new FormData();
      form.append("screenshot", file);
      const res = await fetch(`/api/public/payment-links/${linkId}/manual-upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur upload");
      setManualScreenshotUrl(data.screenshotUrl);
    } catch (e: any) {
      setManualError("Erreur lors du chargement de la capture. Réessayez.");
      setManualScreenshotPreview("");
      setManualScreenshotUrl("");
    } finally {
      setManualUploading(false);
    }
  };

  const handleManualSubmit = async () => {
    setManualError("");
    if (!manualTxnId.trim()) { setManualError("Veuillez saisir l'ID de transaction."); return; }
    if (!manualScreenshotUrl) { setManualError("Veuillez uploader la capture d'écran."); return; }
    setManualSubmitting(true);
    try {
      const res = await fetch(`/api/public/payment-links/${linkId}/manual-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: `${selectedCountry.prefix}${phone.replace(/\s/g, "")}`,
          operator: selectedOperator.code,
          country: selectedCountry.code,
          customerName: `${firstName.trim()} ${lastName.trim()}`,
          customerEmail: email.trim(),
          transactionId: manualTxnId.trim(),
          screenshotUrl: manualScreenshotUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur serveur");
      setStep("manual_submitted");
    } catch (e: any) {
      setManualError(e.message || "Erreur lors de l'envoi. Réessayez.");
    } finally {
      setManualSubmitting(false);
    }
  };

  const copyDepositNumber = () => {
    const num = manualInfo?.depositNumber || "";
    if (num) { navigator.clipboard.writeText(num); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // ── Manual deposit step ──
  if (step === "manual_deposit") {
    const depositNumber = manualInfo?.depositNumber || "";
    const depositLabel = manualInfo?.depositLabel || `Numéro ${selectedOperator.name}`;
    const instruction = manualInfo?.instruction || "";
    return (
      <div className="min-h-screen pb-12" style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
        <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); opacity: 0.3 } 40% { transform: scale(1); opacity: 1 } }`}</style>
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="SIKApay" className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/20" />
            <span className="font-black text-white text-sm tracking-wide">SIKApay</span>
          </div>
          <button onClick={() => setStep("form")} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-1.5 text-xs font-semibold text-white/80">
            ← Retour
          </button>
        </div>
        <div className="max-w-md mx-auto px-4 space-y-3">
          {/* Amount reminder */}
          <div className="bg-gradient-to-br from-orange-600/30 to-amber-700/30 border border-orange-500/20 rounded-3xl p-5 text-center">
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-1">Montant à déposer</p>
            <p className="font-black text-white leading-none" style={{ fontSize: "clamp(2rem,8vw,2.8rem)" }}>
              {parseFloat(link.amount).toLocaleString("fr-FR")}
              <span className="text-white/40 text-lg ml-2 font-bold">{link.currency}</span>
            </p>
            <p className="text-white/60 text-sm mt-1 font-semibold">{link.label}</p>
          </div>

          {/* Deposit number */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
            <p className="text-white/40 text-[11px] uppercase tracking-widest font-semibold">Étape 1 — Effectuer le dépôt</p>
            {manualInfoLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-7 h-7 border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : !depositNumber ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center">
                <p className="text-red-300 text-sm font-semibold mb-1">⚠️ Numéro non configuré</p>
                <p className="text-red-300/80 text-xs">
                  Aucun numéro de dépôt n'est configuré pour {selectedOperator.name} ({selectedCountry.name}). Contactez l'administrateur.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white/8 border border-white/15 rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">{depositLabel}</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-white text-xl font-mono tracking-wider">{depositNumber}</p>
                    <button
                      onClick={copyDepositNumber}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)", color: copied ? "#4ade80" : "#fff" }}
                    >
                      {copied ? "✓ Copié" : "Copier"}
                    </button>
                  </div>
                </div>
                {instruction && (
                  <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl px-4 py-3 text-amber-300 text-sm">
                    ℹ️ {instruction}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Activation directe — note importante */}
          <div className="rounded-3xl p-4 flex gap-3 border" style={{ background: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.30)" }}>
            <span className="text-emerald-400 text-lg flex-shrink-0">⚡</span>
            <div className="text-sm text-emerald-100">
              <p className="font-bold mb-1 text-emerald-300">Validation automatique possible</p>
              <p className="leading-relaxed text-emerald-100/90">
                Votre paiement sera <strong className="text-white">validé immédiatement</strong> si la transaction est effectuée (en temps réel) et si les informations saisies (ID, capture, numéro) sont correctes.
              </p>
            </div>
          </div>

          {/* Upload + Transaction ID */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
            <p className="text-white/40 text-[11px] uppercase tracking-widest font-semibold">Étape 2 — Confirmer le paiement</p>

            {/* Screenshot */}
            <div>
              <p className="text-white/60 text-xs font-semibold mb-2">Capture d'écran du reçu *</p>
              {manualScreenshotPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-white/10">
                  <img src={manualScreenshotPreview} alt="Reçu" className="w-full max-h-48 object-cover" />
                  {manualUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  {manualScreenshotUrl && !manualUploading && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">✓ Chargée</div>
                  )}
                  <label className="absolute bottom-2 right-2 bg-white/20 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer hover:bg-white/30 transition">
                    Changer
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleManualScreenshot(f); }} />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)" }}>
                  <span className="text-3xl mb-1">📷</span>
                  <span className="text-white/50 text-xs font-semibold">Choisir une capture</span>
                  <span className="text-white/25 text-[10px]">JPG, PNG — max 10 Mo</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleManualScreenshot(f); }} />
                </label>
              )}
            </div>

            {/* Transaction ID */}
            <div>
              <p className="text-white/60 text-xs font-semibold mb-2">ID / Référence de transaction *</p>
              <input
                type="text"
                value={manualTxnId}
                onChange={e => setManualTxnId(e.target.value)}
                placeholder="ex: TXN20240125ABCDE"
                className="w-full border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold font-mono text-white placeholder:text-white/25 focus:outline-none focus:border-orange-400/60"
                style={{ background: "rgba(255,255,255,0.07)" }}
              />
            </div>
          </div>

          {manualError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-400 text-sm">
              ⚠️ {manualError}
            </div>
          )}

          <button
            onClick={handleManualSubmit}
            disabled={manualSubmitting || manualUploading}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all"
            style={{ background: (manualSubmitting || manualUploading) ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #ea580c, #f97316)" }}
          >
            {manualSubmitting ? "Envoi en cours…" : manualUploading ? "Chargement…" : "Envoyer la demande"}
          </button>
        </div>
      </div>
    );
  }

  // ── Manual submitted ──
  if (step === "manual_submitted") return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      <div className="text-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-pulse" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
            <span className="text-5xl">⏳</span>
          </div>
        </div>
        <h2 className="font-black text-white text-2xl mb-2">Demande envoyée !</h2>
        <p className="text-white/60 text-sm mb-1">
          Votre demande de paiement a été transmise.
        </p>
        <p className="text-white/40 text-xs mb-6">
          Notre équipe va vérifier votre dépôt et valider la transaction sous peu.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-left space-y-1.5 mb-6">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Récapitulatif</p>
          <p className="text-white text-sm"><span className="text-white/40">Montant :</span> <span className="font-bold">{parseFloat(link.amount).toLocaleString("fr-FR")} {link.currency}</span></p>
          <p className="text-white text-sm"><span className="text-white/40">Lien :</span> {link.label}</p>
          <p className="text-white text-sm"><span className="text-white/40">Référence :</span> <span className="font-mono text-xs">{manualTxnId}</span></p>
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="text-white/25 text-xs">Paiement sécurisé par <span className="text-white/40 font-bold">SIKApay</span></p>
        </div>
      </div>
    </div>
  );

  // ── Main form ──
  return (
    <div className={`${BG} pb-12`} style={bgStyle}>
      <style>{`
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); opacity: 0.3 } 40% { transform: scale(1); opacity: 1 } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .shine { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); background-size: 200% 100%; animation: shimmer 2.5s infinite; }
      `}</style>

      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="SIKApay" className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/20" />
          <span className="font-black text-white text-sm tracking-wide">SIKApay</span>
        </div>
        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-semibold">Sécurisé</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-3"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)", transition: "all 0.4s ease" }}>

        {/* Link image */}
        {link.imageUrl && (
          <div className="rounded-3xl overflow-hidden ring-1 ring-white/10" style={{ maxHeight: 180 }}>
            <img src={link.imageUrl} alt={link.label} className="w-full object-cover" style={{ maxHeight: 180 }} />
          </div>
        )}

        {/* Amount card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/30 to-indigo-700/30 border border-blue-500/20 rounded-3xl p-6 text-center shine">
          <p className="text-white/40 text-xs uppercase tracking-[0.15em] font-semibold mb-2">Total à payer</p>
          <p className="font-black text-white leading-none" style={{ fontSize: "clamp(2.5rem,10vw,3.5rem)" }}>
            {parseFloat(link.amount).toLocaleString("fr-FR")}
            <span className="text-white/40 text-xl ml-2 font-bold">{link.currency}</span>
          </p>
          <p className="text-white/70 font-semibold mt-2 text-sm uppercase tracking-wide">{link.label}</p>
          {link.description && <p className="text-white/70 text-sm mt-2 leading-relaxed">{link.description}</p>}
        </div>

        {/* Country + Operator + Phone */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-5">
          {/* Country */}
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-[0.12em] font-semibold mb-2">Pays</p>
            <div className="relative">
              <select
                value={selectedCountry.code}
                onChange={e => handleCountryChange(e.target.value)}
                className="w-full appearance-none bg-white/8 border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-blue-400/50 cursor-pointer"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code} style={{ background: "#1e293b" }}>
                    {c.flag} {c.name} ({c.currency})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Operator */}
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-[0.12em] font-semibold mb-2">Opérateur Mobile Money</p>
            <div className={`grid gap-2 ${selectedCountry.operators.length > 2 ? "grid-cols-2" : "grid-cols-2"}`}>
              {selectedCountry.operators.map(op => {
                const active = selectedOperator.code === op.code;
                return (
                  <button
                    key={op.code}
                    onClick={() => { setSelectedOperator(op); }}
                    className={`p-3 rounded-2xl border-2 text-center transition-all duration-200 ${
                      active ? "border-blue-400/70 bg-blue-500/15 scale-[1.02]" : "border-white/10 bg-white/5 hover:bg-white/8"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center font-black text-[11px] shadow-lg"
                      style={{ background: op.bg, color: op.bg === "#FFCC00" ? "#333" : "#fff",
                        boxShadow: active ? `0 4px 20px ${op.bg}55` : "none" }}>
                      {op.short}
                    </div>
                    <p className="text-xs font-semibold leading-tight"
                      style={{ color: active ? "#fff" : "rgba(255,255,255,0.55)" }}>{op.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phone */}
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-[0.12em] font-semibold mb-2">Numéro Mobile Money</p>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-3 rounded-2xl border border-white/10 text-sm font-bold text-white/70 whitespace-nowrap flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <span>{selectedCountry.flag}</span>
                <span>{selectedCountry.prefix}</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={selectedCountry.phonePlaceholder}
                className="flex-1 bg-white/7 border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/50"
                style={{ background: "rgba(255,255,255,0.07)" }}
              />
            </div>
          </div>
        </div>

        {/* Name + Email */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Prénom", value: firstName, set: setFirstName, ph: "Jean" },
              { label: "Nom", value: lastName, set: setLastName, ph: "Dupont" },
            ].map(f => (
              <div key={f.label}>
                <p className="text-white/40 text-[11px] uppercase tracking-[0.12em] font-semibold mb-2">{f.label}</p>
                <input type="text" value={f.value} onChange={e => f.set(e.target.value)}
                  placeholder={f.ph}
                  className="w-full border border-white/15 rounded-2xl px-3 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/50"
                  style={{ background: "rgba(255,255,255,0.07)" }} />
              </div>
            ))}
          </div>
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-[0.12em] font-semibold mb-2">Email</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="jean@exemple.com"
              className="w-full border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/50"
              style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-400 text-sm flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleFormNext}
          disabled={submitting}
          className="w-full py-4 rounded-2xl font-black text-base text-white shadow-xl active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
          style={{
            background: isCiRedirect
              ? "linear-gradient(135deg, #ea580c, #f97316)"
              : "linear-gradient(135deg, #2563eb, #4f46e5)",
            boxShadow: isCiRedirect
              ? "0 8px 32px rgba(234,88,12,0.4)"
              : "0 8px 32px rgba(79,70,229,0.4)"
          }}
        >
          {submitting
            ? <span className="flex items-center justify-center gap-2">Initiation<AnimatedDots /></span>
            : isCiRedirect
              ? <span className="flex items-center justify-center gap-2">
                  Accéder au paiement <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </span>
              : `Payer ${parseFloat(link.amount).toLocaleString("fr-FR")} ${link.currency}`
          }
        </button>

        <p className="text-center text-white/20 text-xs pb-4">
          Paiement sécurisé par <span className="text-white/35 font-bold">SIKApay</span>
        </p>
      </div>
    </div>
  );
}
