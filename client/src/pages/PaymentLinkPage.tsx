import { useState, useEffect, useRef } from "react";
import PaymentCheckout, { useCheckoutMode } from "@/components/PaymentCheckout";
import { useParams } from "wouter";
import {
  CheckCircle, ChevronLeft, ChevronRight, Clock, Copy, ExternalLink, Globe, ImageIcon,
  Info, Loader2, Phone, ShieldCheck, Upload, Wrench, XCircle, AlertCircle, AlertTriangle
} from "lucide-react";

// ─── Config pays & opérateurs ────────────────────────────────────────────────
const COUNTRIES = [
  { code: "BJ",  name: "Bénin",         flag: "🇧🇯", prefix: "229", phonePlaceholder: "01 23 45 67 89", operators: ["mtn","moov","celtis"] },
  { code: "CI",  name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "225", phonePlaceholder: "05 12 34 56 78", operators: ["mtn","moov","orange","wave"] },
  { code: "SN",  name: "Sénégal",       flag: "🇸🇳", prefix: "221", phonePlaceholder: "01 23 45 67", operators: ["orange","wave","free","expresso"] },
  { code: "BF",  name: "Burkina Faso",  flag: "🇧🇫", prefix: "226", phonePlaceholder: "01 23 45 67", operators: ["moov","orange","wave"] },
  { code: "TG",  name: "Togo",          flag: "🇹🇬", prefix: "228", phonePlaceholder: "01 23 45 67", operators: ["moov","tmoney"] },
  { code: "CM",  name: "Cameroun",      flag: "🇨🇲", prefix: "237", phonePlaceholder: "6 12 34 56 78", operators: ["mtn","orange"] },
];

const ROBOTPAY_OPERATORS: Record<string, string[]> = {
  BJ: ["moov", "mtn"],
  CI: ["moov", "mtn", "orange"],
  SN: ["mixx", "orange", "wave"],
  BF: ["moov", "orange", "wave"],
  TG: ["moov", "tmoney"],
  CM: ["mtn", "orange"],
};

const OPERATORS: Record<string, { name: string; full: string; bg: string; text: string; border: string; initials: string }> = {
  celtis: { name: "Celtis", full: "Celtis Cash", bg: "#006B52", text: "#fff", border: "#00513e", initials: "CC" },
  expresso: { name: "Expresso", full: "Expresso", bg: "#005E9E", text: "#fff", border: "#004a7d", initials: "EX" },
  mtn:    { name: "MTN",     full: "MTN Mobile Money", bg: "#FFCC00", text: "#1a1a1a", border: "#e6b800", initials: "MTN" },
  moov:   { name: "Moov",    full: "Moov Money",       bg: "#005BAA", text: "#fff", border: "#004d99", initials: "MV" },
  orange: { name: "Orange",  full: "Orange Money",     bg: "#FF6600", text: "#fff", border: "#e55c00", initials: "OM" },
  wave:   { name: "Wave",    full: "Wave",             bg: "#1B6FEE", text: "#fff", border: "#1560d4", initials: "W" },
  tmoney: { name: "T-Money", full: "T-Money",          bg: "#C8102E", text: "#fff", border: "#a50d25", initials: "TM" },
  free:   { name: "Free",    full: "Free Money",       bg: "#00923F", text: "#fff", border: "#007a34", initials: "FM" },
  airtel: { name: "Airtel",  full: "Airtel Money",     bg: "#E40000", text: "#fff", border: "#c20000", initials: "AM" },
  mixx:   { name: "Mixx",    full: "Mixx by Yas",      bg: "#F5C400", text: "#16213E", border: "#D9AD00", initials: "MX" },
};

// ─── Design tokens ─────────────────────────────────────────────────────────
const PG    = "#EFF2F7";
const HDR   = "linear-gradient(135deg, #1a237e 0%, #283593 40%, #1565c0 100%)";
const EM1   = "#10B981";
const EM2   = "#059669";
const BLU   = "#1565c0";
const BLU2  = "#0d47a1";

// ─── Sous-composants ────────────────────────────────────────────────────────
function OperatorBadge({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
  const op = OPERATORS[code];
  if (!op) return null;
  const s = size === "sm" ? "w-10 h-10 text-xs" : size === "lg" ? "w-16 h-16 text-base" : "w-12 h-12 text-sm";
  return (
    <div className={`${s} rounded-2xl flex items-center justify-center font-black shadow border-2 flex-shrink-0`}
      style={{ backgroundColor: op.bg, color: op.text, borderColor: op.border }}>
      {op.initials}
    </div>
  );
}

function MaintenanceBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600">
      <Wrench size={9} /> Maintenance
    </span>
  );
}

function AnimatedDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      {[0,1,2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-current inline-block"
          style={{ animation: `bounceDot 1.2s ${i*0.2}s infinite ease-in-out` }} />
      ))}
    </span>
  );
}


function ProgressBar({ step, isPcs }: { step: FormStep; isPcs?: boolean }) {
  const steps = isPcs
    ? ["country","operator","phone"] as FormStep[]
    : ["country","operator","phone"] as FormStep[];
  const labels = ["Demande", "Validation", "Confirmation"];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="px-5 pb-4 pt-1">
      <div className="flex items-center justify-between gap-1">
        {steps.map((s, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div className="flex-1 h-0.5 rounded-full"
                    style={{ background: done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)" }} />
                )}
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: done ? "rgba(255,255,255,0.9)" : active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)",
                    border: active ? "2px solid rgba(255,255,255,0.8)" : done ? "none" : "2px solid rgba(255,255,255,0.2)",
                  }}>
                  {done
                    ? <CheckCircle size={13} style={{ color: BLU }} />
                    : <span className="text-[10px] font-black" style={{ color: active ? "#fff" : "rgba(255,255,255,0.3)" }}>{i + 1}</span>
                  }
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-0.5 rounded-full"
                    style={{ background: done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)" }} />
                )}
              </div>
              <p className="text-[9px] font-bold tracking-wide"
                style={{ color: active ? "#fff" : done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}>
                {labels[i]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type FormStep = "country" | "operator" | "phone";
type Step = FormStep | "manual" | "pending" | "success" | "failed" | "redirected" | "submitted";

export default function PaymentLinkPage() {
  const { linkId } = useParams<{ linkId: string }>();
  return <PaymentCheckout service="link" linkId={linkId}><LegacyPaymentLinkPage /></PaymentCheckout>;
}

function LegacyPaymentLinkPage() {
  const { data: checkoutMode } = useCheckoutMode();
  const params = useParams<{ linkId: string }>();
  const linkId = params.linkId;

  const [link, setLink]           = useState<any>(null);
  const [loadError, setLoadError] = useState("");

  const [country, setCountry]   = useState("");
  const [operator, setOperator] = useState("");
  const [phone, setPhone]       = useState("");
  const [payerFullName, setPayerFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [depositInfo, setDepositInfo]               = useState<any>(null);
  const [depositLoading, setDepositLoading]         = useState(false);
  const [manualTxnId, setManualTxnId]               = useState("");
  const [screenshotFile, setScreenshotFile]         = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview]   = useState<string | null>(null);
  const [manualUploading, setManualUploading]       = useState(false);
  const [manualScreenshotUrl, setManualScreenshotUrl] = useState("");
  const [manualSubmitting, setManualSubmitting]     = useState(false);
  const [copied, setCopied]                         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [txnId, setTxnId]           = useState("");
  const [pollCount, setPollCount]   = useState(0);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [providerAccepted, setProviderAccepted] = useState(false);
  const recoveryKey = `sika-link-checkout:${checkoutMode?.customerId ?? "guest"}:${linkId ?? ""}`;
  const manualRecoveryKey = `sika-link-manual:${checkoutMode?.customerId ?? "guest"}:${linkId ?? ""}`;
  const [manualRequestId, setManualRequestId] = useState("");
  const [manualStatusError, setManualStatusError] = useState("");
  const [manualCode, setManualCode] = useState("");

  const [step, setStep]         = useState<Step>("country");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("localRef");
    let recovered: string | null = null;
    try { recovered = sessionStorage.getItem(recoveryKey); } catch { recovered = null; }
    const pendingId = ref?.startsWith("WST-LINK-") ? ref : recovered;
    if (pendingId) { setTxnId(pendingId); setStep("pending"); sessionStorage.setItem(recoveryKey, pendingId); }
  }, [recoveryKey]);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(manualRecoveryKey) || "null");
      if (typeof saved?.requestId === "string") {
        setManualRequestId(saved.requestId);
        setSubmittedAt(saved.createdAt || null);
        setStep("submitted");
      }
    } catch { /* Storage may be unavailable; current-page polling still works. */ }
  }, [manualRecoveryKey]);

  useEffect(() => {
    if (step !== "submitted" || !manualRequestId) return;
    let stopped = false;
    let checking = false;
    const poll = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(`/api/public/payment-links/${linkId}/manual-status/${manualRequestId}`, {
          credentials: "include", cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Vérification temporairement indisponible.");
        if (stopped) return;
        setManualStatusError("");
        if (data.status === "completed" || data.status === "failed") {
          try { sessionStorage.removeItem(manualRecoveryKey); } catch { /* Optional recovery storage. */ }
          setManualCode(data.pcsCode || "");
          setStep(data.status === "completed" ? "success" : "failed");
        }
      } catch (err: any) {
        if (!stopped) setManualStatusError(err.message || "La vérification reprendra automatiquement.");
      } finally { checking = false; }
    };
    void poll();
    const interval = setInterval(poll, 5000);
    return () => { stopped = true; clearInterval(interval); };
  }, [step, manualRequestId, linkId, manualRecoveryKey]);

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const selectedOp      = OPERATORS[operator];

  type PayMode = "manual" | "redirect" | "solvexpay" | "robotpay";
  const countryModes: Record<string, { mode: PayMode; redirectUrl: string }> = link?.countryModes ?? {};
  const ciMode: PayMode        = link?.ciMode ?? "redirect";
  const maintenanceMap: Record<string, boolean> = link?.maintenanceMap ?? {};
  const isOpMaintenance        = (c: string, op: string) => maintenanceMap[`${c}_${op}`] === true;
  const getMode                = (c: string): PayMode => { if (!c) return "manual"; if (c === "CI") return ciMode; return countryModes[c]?.mode ?? "manual"; };
  const getRedirectUrl         = (c: string): string  => { if (c === "CI") return link?.ciRedirectUrl || ""; return countryModes[c]?.redirectUrl || ""; };
  const visibleOperators = selectedCountry
    ? (getMode(selectedCountry.code) === "robotpay"
      ? (selectedCountry.code === "CI"
        ? Array.from(new Set([...(ROBOTPAY_OPERATORS.CI || []), "wave"]))
        : ROBOTPAY_OPERATORS[selectedCountry.code] || [])
      : selectedCountry.operators)
    : [];
  const currentMode            = getMode(country);
  const useRedirect            = country !== "" && currentMode === "redirect";
  const useCiWaveManual        = country === "CI" && operator === "wave" && currentMode === "robotpay";
  // Le mode RobotPay choisi par l'administrateur pour le pays est prioritaire.
  // Exception CI : Wave reste manuel car WestPay ne le prend pas en charge.
  const useManual              = country !== "" && (
    useCiWaveManual ||
    currentMode === "manual" ||
    (currentMode !== "robotpay" && !useRedirect && link?.manualMode === true)
  );

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!linkId) return;
    const fetchLink = () =>
      fetch(`/api/public/payment-links/${linkId}`, { cache: "no-store" })
        .then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.message || "Lien invalide"); }); return r.json(); })
        .then(data => setLink(data))
        .catch(err => setLoadError(err.message));
    fetchLink();
    const interval = setInterval(fetchLink, 30000);
    return () => clearInterval(interval);
  }, [linkId]);

  useEffect(() => {
    fetch("/api/auth/user", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.email) setCurrentUserEmail(data.email); })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  // Pour le lien PCS (champ visible) et pour le lien DNS Privé (champ caché,
  // capturé silencieusement) : on rattache le paiement au compte connecté via
  // son e-mail, pour que la vérification de statut se fasse sur le compte
  // réel plutôt que par déduction téléphone/prénom.
  const isDnsLink = link?.id === 'eedbc622';
  useEffect(() => { if ((link?.isPcs || isDnsLink) && currentUserEmail) setEmail(currentUserEmail); }, [link?.isPcs, isDnsLink, currentUserEmail]);

  useEffect(() => {
    if (!screenshotFile) { setScreenshotPreview(null); return; }
    const url = URL.createObjectURL(screenshotFile);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

  useEffect(() => {
    if (step === "manual" && country && operator && useManual) {
      setDepositLoading(true);
      fetch(`/api/public/payment-links/${linkId}/manual-deposit-info?country=${country}&operator=${operator}`)
        .then(r => r.json()).then(d => setDepositInfo(d)).catch(() => setDepositInfo(null)).finally(() => setDepositLoading(false));
    }
  }, [step, country, operator, useManual, linkId]);

  useEffect(() => {
    if (step !== "pending" || !txnId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res  = await fetch(`/api/public/payment-links/check/${txnId}`);
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.providerAccepted === "boolean") setProviderAccepted(data.providerAccepted);
        if (data.status === "completed") { sessionStorage.removeItem(recoveryKey); setStep("success"); return; }
        if (data.status === "failed")    { sessionStorage.removeItem(recoveryKey); setStep("failed");  return; }
        setPollCount(c => c + 1);
      } catch {}
    };
    const iv = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [step, txnId, recoveryKey]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const copyDepositNumber = () => {
    const num = depositInfo?.depositNumber || "";
    if (num) { navigator.clipboard.writeText(num); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleScreenshotSelect = async (file: File) => {
    setScreenshotFile(file);
    setManualUploading(true);
    setManualScreenshotUrl("");
    setError("");
    try {
      const form = new FormData();
      form.append("screenshot", file);
      const res  = await fetch(`/api/public/payment-links/${linkId}/manual-upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur upload");
      setManualScreenshotUrl(data.screenshotUrl);
    } catch (e: any) {
      setScreenshotFile(null);
      setManualScreenshotUrl("");
      setError(e?.message || "Impossible d'envoyer la capture. Vérifiez le format (JPG, PNG) et réessayez.");
    }
    finally { setManualUploading(false); }
  };

  const handleContinue = async () => {
    setError("");
    const customerName = payerFullName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!country)  { setError("Veuillez sélectionner un pays"); return; }
    if (!operator) { setError("Veuillez sélectionner un opérateur"); return; }
    if (!phone.replace(/\D/g, "").match(/^\d{6,}$/)) { setError("Veuillez saisir votre numéro Mobile Money"); return; }
    if (customerName.length < 3) { setError("Veuillez saisir le nom complet du payeur"); return; }
    if (link?.isPcs) {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Veuillez saisir une adresse e-mail valide"); return; }
      try {
        const r = await fetch(`/api/public/check-sika-email?email=${encodeURIComponent(email.trim())}`);
        const d = await r.json();
        if (!d.exists) { setError("Cet e-mail ne correspond à aucun compte Sika Texte."); return; }
      } catch { setError("Erreur de vérification de l'e-mail."); return; }
    }
    if (useRedirect) {
      const redirectUrl = getRedirectUrl(country);
      setSubmitting(true);
      try {
        await fetch(`/api/public/payment-links/${linkId}/ci-record`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone.replace(/\s/g, ""), operator, country,
            customerName, customerEmail: email.trim(),
          }),
        });
      } catch {}
      setSubmitting(false);
      if (redirectUrl) window.open(redirectUrl, "_blank");
      setStep("redirected");
    } else if (useManual) {
      setStep("manual");
    } else {
      setSubmitting(true);
      try {
        const res  = await fetch(`/api/public/payment-links/${linkId}/pay`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone.replace(/\s/g, ""), operator, country,
            customerName, customerEmail: email.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message || "Erreur lors du paiement"); return; }
        setTxnId(data.transactionId);
        setProviderAccepted(data.providerAccepted === true);
        sessionStorage.setItem(recoveryKey, data.transactionId);
        if (data.paymentUrl) { window.location.href = data.paymentUrl; return; }
        setStep("pending");
      } catch { setError("Erreur réseau. Vérifiez votre connexion."); }
      finally { setSubmitting(false); }
    }
  };

  const handleManualSubmit = async () => {
    if (!manualTxnId.trim()) { setError("Veuillez saisir l'ID de transaction"); return; }
    if (!manualScreenshotUrl) { setError("Veuillez charger la capture d'écran"); return; }
    setManualSubmitting(true); setError("");
    try {
      const res  = await fetch(`/api/public/payment-links/${linkId}/manual-submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: `${selectedCountry?.prefix}${phone.replace(/\s/g, "")}`,
          operator, country,
          customerName: payerFullName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim(),
          customerEmail: email.trim(),
          transactionId: manualTxnId.trim(),
          screenshotUrl: manualScreenshotUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur serveur");
      if (!data.id) throw new Error("La demande n’a pas retourné sa référence. Ne renvoyez pas votre paiement ; contactez l’administrateur.");
      const createdAt = data.createdAt || new Date().toISOString();
      setManualRequestId(data.id);
      try { sessionStorage.setItem(manualRecoveryKey, JSON.stringify({ requestId: data.id, createdAt })); } catch { /* Keep polling without storage. */ }
      setSubmittedAt(createdAt); setStep("submitted");
    } catch (e: any) { setError(e.message || "Erreur lors de l'envoi."); }
    finally { setManualSubmitting(false); }
  };

  const reset = () => {
    sessionStorage.removeItem(recoveryKey);
    sessionStorage.removeItem(manualRecoveryKey);
    setManualRequestId(""); setManualStatusError(""); setManualCode("");
    setStep("country"); setCountry(""); setOperator(""); setPhone(""); setFirstName(""); setLastName(""); setPayerFullName("");
    if (!link?.isPcs || !currentUserEmail) setEmail("");
    setDepositInfo(null); setManualTxnId(""); setScreenshotFile(null); setManualScreenshotUrl("");
    setTxnId(""); setPollCount(0); setProviderAccepted(false); setError("");
  };

  const amount = link ? parseFloat(link.amount).toLocaleString("fr-FR") : "—";
  const canSend = manualTxnId.trim().length >= 3 && !!manualScreenshotUrl;

  // ── Header commun avec montant ────────────────────────────────────────────
  function PageHeader({ onBack, showProgress = true, formStep }: {
    onBack?: () => void; showProgress?: boolean; formStep?: FormStep;
  }) {
    return (
      <div style={{ background: HDR }}>
        <div className="px-5 pt-6 pb-3 flex items-center justify-between">
          {onBack ? (
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/60 rounded-xl px-3 py-1.5"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              <ChevronLeft size={13} /> Retour
            </button>
          ) : <div className="w-16" />}
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="SIKApay" className="w-7 h-7 rounded-lg object-cover" />
            <p className="text-white font-black text-sm">SIKA TEXTE</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-bold text-white">Sécurisé</span>
          </div>
        </div>

        {link?.imageUrl && (
          <div className="mx-5 rounded-2xl overflow-hidden mb-3 ring-1 ring-white/10" style={{ maxHeight: 130 }}>
            <img src={link.imageUrl} alt={link.label} className="w-full object-cover" style={{ maxHeight: 130 }} />
          </div>
        )}

        <div className="px-5 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1 text-white/50">Total à payer</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-white leading-none">{amount}</span>
            <span className="text-xl font-bold text-white/40 mb-1">{link?.currency}</span>
          </div>
          <p className="text-white/60 text-sm mt-1 font-semibold">{link?.label}</p>
          {link?.description && <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{link.description}</p>}
        </div>

        {showProgress && formStep && (
          <ProgressBar step={formStep} isPcs={link?.isPcs} />
        )}
      </div>
    );
  }

  // ── Chargement ────────────────────────────────────────────────────────────
  if (!link && !loadError) return (
    <div className="payment-journey min-h-screen flex items-center justify-center" style={{ background: PG }}>
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${EM1}25`, animationDuration: "1.8s" }} />
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `${EM1}15`, border: `2px solid ${EM1}35` }}>
            <Loader2 size={26} className="animate-spin" style={{ color: EM1 }} />
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium">Chargement du lien…</p>
      </div>
    </div>
  );

  // ── Erreur ────────────────────────────────────────────────────────────────
  if (loadError) return (
    <div className="payment-journey min-h-screen flex items-center justify-center px-5" style={{ background: PG }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full">
        <div className="w-14 h-14 mb-4 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center"><Globe size={26} className="text-amber-600" /></div>
        <h2 className="font-bold text-slate-900 text-lg mb-2">Lien introuvable</h2>
        <p className="text-slate-500 text-sm">{loadError}</p>
      </div>
    </div>
  );

  // ── Succès (USSD) ─────────────────────────────────────────────────────────
  if (step === "success") return (
    <div className="payment-journey min-h-screen flex items-center justify-center px-5" style={{ background: PG }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${EM1}20`, animationDuration: "2s" }} />
          <div className="relative w-24 h-24 rounded-full flex items-center justify-center mx-auto" style={{ background: "#D1FAE5" }}>
            <CheckCircle size={48} style={{ color: EM2 }} />
          </div>
        </div>
        <h2 className="font-black text-slate-900 text-3xl mb-2">Payé !</h2>
        <p className="text-slate-500 text-base mb-1">
          <span className="text-slate-900 font-black text-xl">{amount} {link.currency}</span>
        </p>
        <p className="text-slate-400 text-sm">{link.label}</p>
        <div className="my-5 flex items-center justify-center gap-3 text-xs font-semibold text-violet-700" aria-label="Confirmation du paiement">
          <span>Demande</span><span aria-hidden="true">—</span><span>Validation</span><span aria-hidden="true">—</span><span>Confirmation</span>
        </div>
        {manualCode && <div className="mt-5 rounded-2xl bg-violet-50 p-4"><p className="text-xs text-violet-700">Votre code PCS</p><p className="mt-2 break-all font-mono font-bold text-violet-950">{manualCode}</p></div>}
        <button type="button" onClick={() => { window.location.href = "/"; }} className="mt-5 w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white">Terminé</button>
        <div className="mt-8 pt-5 border-t border-slate-100">
          <p className="text-slate-300 text-xs flex items-center justify-center gap-1">
            <ShieldCheck size={10} /> Paiement sécurisé par <span className="text-slate-400 font-bold ml-1">SIKApay</span>
          </p>
        </div>
      </div>
    </div>
  );

  // ── Échoué ────────────────────────────────────────────────────────────────
  if (step === "failed") return (
    <div className="payment-journey min-h-screen flex items-center justify-center px-5" style={{ background: PG }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <XCircle size={48} className="text-red-500" />
        </div>
        <h2 className="font-black text-slate-900 text-2xl mb-2">Paiement échoué</h2>
        <p className="text-slate-500 text-sm mb-8">Vérifiez votre solde et réessayez.</p>
        <button onClick={reset}
          className="w-full py-4 rounded-2xl font-black text-white text-sm"
          style={{ background: `linear-gradient(135deg,${EM1},${EM2})` }}>
          Réessayer
        </button>
      </div>
    </div>
  );

  // ── En attente USSD ───────────────────────────────────────────────────────
  if (step === "pending") return (
    <div className="payment-journey min-h-screen flex items-center justify-center px-5" style={{ background: PG }}>
      <style>{`@keyframes bounceDot{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full space-y-5">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: selectedOp?.bg || EM1 }} />
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: `${selectedOp?.bg || EM1}12`, border: `3px solid ${selectedOp?.bg || EM1}35` }}>
            <Clock size={28} style={{ color: selectedOp?.bg || EM1 }} />
          </div>
        </div>
        <div>
          <h2 className="font-black text-slate-900 text-2xl mb-2">{providerAccepted ? "Validez sur votre téléphone" : "Paiement en cours d'initialisation"}</h2>
          <p className="text-slate-500 text-sm">
            {providerAccepted
              ? <>Une demande de paiement a été acceptée par l’opérateur. Validez <span className="text-slate-900 font-black">{amount} {link.currency}</span> sur votre téléphone.</>
              : "Nous attendons la confirmation de l’opérateur. Ne relancez pas le paiement ; le statut sera actualisé automatiquement."}
          </p>
          {providerAccepted && <p className="text-slate-400 text-xs mt-2">Ligne : <span className="text-slate-600 font-semibold">+{selectedCountry?.prefix} {phone}</span></p>}
        </div>
        <div className="rounded-2xl px-4 py-3 bg-emerald-50 border border-emerald-100 flex items-center justify-center gap-2 text-sm text-emerald-700 font-medium">
          <Loader2 size={14} className="animate-spin" />
          <span>En attente</span>
          <AnimatedDots />
        </div>
        <button onClick={() => { sessionStorage.setItem(recoveryKey, txnId); window.history.back(); }}
          className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-800 transition-colors">
          Quitter cette page sans interrompre le paiement
        </button>
      </div>
    </div>
  );

  // ── Redirigé ──────────────────────────────────────────────────────────────
  if (step === "redirected") return (
    <div className="payment-journey min-h-screen flex items-center justify-center px-5" style={{ background: PG }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full space-y-5">
        <div className="w-24 h-24 mx-auto rounded-full bg-orange-50 flex items-center justify-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-50 text-sm font-black text-violet-700">{selectedCountry?.code || <Globe size={32} />}</span>
        </div>
        <div>
          <h2 className="font-black text-slate-900 text-2xl mb-2">Redirection effectuée</h2>
          <p className="text-slate-500 text-sm">Vous avez été redirigé vers la page de paiement sécurisée.</p>
        </div>
        <button onClick={() => { const u = getRedirectUrl(country); if (u) window.open(u, "_blank"); }}
          className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#ea580c,#f97316)" }}>
          <ExternalLink size={16} /> Ouvrir la page de paiement
        </button>
        <button onClick={reset} className="text-xs text-slate-300 hover:text-slate-500 transition-colors underline">Retour</button>
        <p className="text-slate-300 text-xs flex items-center justify-center gap-1">
          <ShieldCheck size={10} /> Paiement sécurisé · SIKApay
        </p>
      </div>
    </div>
  );

  // ── Demande soumise (manuel) ───────────────────────────────────────────────
  if (step === "submitted") {
    return (
      <div className="payment-journey min-h-screen pb-8" style={{ background: PG }}>
        <style>{`@keyframes bounceDot{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>
        <div className="px-5 pt-6 pb-4 flex flex-wrap items-center justify-between gap-3" style={{ background: HDR }}>
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="SIKApay" className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/15" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">SIKApay</p>
              <p className="text-white font-black text-sm">SIKA TEXTE</p>
            </div>
          </div>
          <div className="order-last flex w-full items-start justify-center gap-1.5 rounded-2xl bg-white p-4" aria-label="Progression du paiement : validation en cours">
            <div className="flex min-w-[58px] flex-col items-center gap-1 text-violet-700"><span className="grid h-7 w-7 place-items-center rounded-full bg-violet-700 text-white"><CheckCircle size={13} /></span><small className="text-[10px] font-semibold">Demande</small></div>
            <div className="mt-3.5 h-px flex-1 bg-violet-300" />
            <div className="flex min-w-[58px] flex-col items-center gap-1 text-violet-700"><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-violet-600 text-xs">2</span><small className="text-[10px] font-semibold">Validation</small></div>
            <div className="mt-3.5 h-px flex-1 bg-slate-200" />
            <div className="flex min-w-[58px] flex-col items-center gap-1 text-slate-400"><span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs">3</span><small className="text-[10px] font-semibold">Confirmation</small></div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 text-[11px] font-bold">En vérification</span>
          </div>
        </div>
        <div className="px-4 py-5 space-y-4 max-w-md mx-auto">
          <div className="text-center pb-1">
            <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-violet-600 bg-violet-50" aria-hidden="true">
              <span className="absolute inset-3 rounded-full border border-violet-200" />
              <span className="absolute inset-6 rounded-full border border-violet-200" />
              <ShieldCheck size={32} className="text-violet-700" />
            </div>
            <h1 className="text-slate-900 font-black text-2xl mb-1">Vérification en cours</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Votre demande a bien été reçue.<br />
              <span className="text-slate-700 font-semibold">Votre justificatif attend la validation de l’administrateur.</span>
            </p>
          </div>
          <div className="bg-white rounded-3xl shadow-md p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#D1FAE5" }}>
                    <ShieldCheck size={20} className="text-violet-700" />
            </div>
            <div className="flex-1">
               <p className="text-slate-900 font-black text-sm">Justificatif transmis</p>
               <p className="text-slate-400 text-xs">Votre demande attend la décision de l’administrateur.</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: EM1, animation: `bounceDot 1.4s ${i*0.25}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Avancement du dossier</p>
            </div>
            {[
              { icon: CheckCircle, label: "Demande envoyée avec succès",  state: "done"    },
              { icon: Info, label: "Vérification du paiement",     state: "active"  },
              { icon: ShieldCheck, label: "Génération du code PCS",       state: "waiting" },
            ].map((row, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-slate-50 last:border-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                  style={{
                    background: row.state === "done" ? "#D1FAE5" : row.state === "active" ? "#DBEAFE" : "#F1F5F9",
                    border: `1px solid ${row.state === "done" ? "#6EE7B7" : row.state === "active" ? "#BFDBFE" : "#E2E8F0"}`
                  }}>
                  <row.icon size={16} className={row.state === "done" ? "text-emerald-600" : row.state === "active" ? "text-blue-600" : "text-slate-400"} />
                </div>
                <p className={`flex-1 text-sm font-bold ${row.state === "done" ? "text-emerald-700" : row.state === "active" ? "text-blue-700" : "text-slate-300"}`}>
                  {row.label}
                </p>
                {row.state === "active" && <Loader2 size={14} className="text-blue-500 animate-spin flex-shrink-0" />}
                {row.state === "done"   && <CheckCircle size={14} style={{ color: EM1 }} className="flex-shrink-0" />}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-3xl shadow-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Récapitulatif</p>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Montant</span>
                <span className="text-slate-900 font-black text-base">{amount} <span className="text-slate-400 text-sm font-semibold">{link.currency}</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Service</span>
                <span className="text-slate-700 font-semibold text-sm truncate max-w-[160px]">{link.label}</span>
              </div>
              {manualTxnId && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Référence</span>
                  <span className="text-slate-600 font-mono text-xs">{manualTxnId}</span>
                </div>
              )}
            </div>
          </div>
          {manualStatusError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{manualStatusError} Votre paiement n’est pas annulé ; la vérification continue.</p>}
          <p className="text-center text-xs text-slate-500">Cette page se met à jour automatiquement après la décision de l’administrateur.</p>
          <button type="button" onClick={() => { window.location.href = "/"; }}
            className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-800">
            Quitter cette page
          </button>
          <p className="text-center text-xs text-slate-500">Quitter ne supprime pas la demande. Vous pourrez la retrouver en ouvrant ce lien dans ce navigateur.</p>
          <p className="text-slate-300 text-[10px] flex items-center justify-center gap-1.5 pb-2">
            <ShieldCheck size={9} /> Paiement sécurisé · SIKApay SIKA TEXTE
          </p>
        </div>
      </div>
    );
  }

  // ── Dépôt manuel ──────────────────────────────────────────────────────────
  if (step === "manual") {
    const depositNumber = depositInfo?.depositNumber || "";
    const fullPhone     = `+${selectedCountry?.prefix}${phone.replace(/\s/g,"")}`;

    return (
      <div className="payment-journey min-h-screen pb-10" style={{ background: PG }}>
        <style>{`@keyframes bounceDot{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>
        <div className="px-5 pt-6 pb-3 flex items-center justify-between" style={{ background: HDR }}>
          <button onClick={() => setStep("phone")}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/60 rounded-xl px-3 py-1.5"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            <ChevronLeft size={13} /> Retour
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="SIKApay" className="w-7 h-7 rounded-lg object-cover" />
            <p className="text-white font-black text-sm">SIKA TEXTE</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-[10px] font-bold text-white">Sécurisé</span>
          </div>
        </div>

        {depositLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={36} className="animate-spin" style={{ color: EM1 }} />
          </div>
        ) : depositInfo ? (
          <div className="px-4 pt-4 space-y-4 max-w-md mx-auto">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between" style={{ background: HDR }}>
                <div className="flex items-center gap-2.5">
                  <OperatorBadge code={operator} size="sm" />
                  <div>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Dépôt Mobile Money</p>
                    <p className="text-white font-black text-sm">{selectedOp?.name}</p>
                  </div>
                </div>
                <div className="rounded-xl px-2.5 py-1 bg-white/10">
                  <p className="text-white text-[10px] font-bold">{selectedCountry?.code} · {selectedCountry?.name}</p>
                </div>
              </div>
              <div className="mx-5 border-t-2 border-dashed border-slate-100" />
              <div className="px-5 py-5">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Numéro de dépôt</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-slate-900 font-black text-[28px] font-mono tracking-wide leading-none">
                    {depositNumber || "— — — — —"}
                  </p>
                  {depositNumber && (
                    <button onClick={copyDepositNumber}
                      className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold text-sm transition-all flex-shrink-0"
                      style={{
                        background: copied ? "#DBEAFE" : `${BLU}12`,
                        color: copied ? BLU2 : BLU,
                        border: `1px solid ${copied ? "#93C5FD" : `${BLU}30`}`
                      }}>
                      <Copy size={13} /> {copied ? "Copié" : "Copier"}
                    </button>
                  )}
                </div>
              </div>
              <div className="mx-5 border-t-2 border-dashed border-slate-100" />
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Montant exact</p>
                  <p className="text-slate-900 font-black text-2xl leading-none">
                    {depositInfo.depositAmount?.toLocaleString("fr-FR") || amount}{" "}
                    <span className="text-slate-400 text-sm font-bold">{link.currency}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Depuis</p>
                  <p className="text-slate-600 font-mono text-xs font-semibold">{fullPhone}</p>
                </div>
              </div>
            </div>

            {depositInfo.isInternational && depositInfo.internationalNote && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex gap-3">
                <Globe size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800 text-xs font-medium leading-relaxed">{depositInfo.internationalNote}</p>
              </div>
            )}

            {depositInfo.showInstruction && depositInfo.instruction && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex gap-3">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-blue-700 text-xs whitespace-pre-line leading-relaxed">{depositInfo.instruction}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Confirmer votre paiement</p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="bg-white rounded-3xl shadow-md p-4 space-y-4">
              <div>
                <label htmlFor="link-manual-txn" className="text-slate-500 text-[11px] font-black uppercase tracking-wider mb-2 block">
                  ID de transaction <span className="text-red-400">*</span>
                </label>
                <input id="link-manual-txn" type="text" value={manualTxnId} onChange={e => setManualTxnId(e.target.value)}
                  placeholder="ex: TXN20240125ABCDE"
                  className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-400 rounded-2xl px-4 py-3.5 text-sm font-semibold font-mono text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors" />
                <p className="text-slate-300 text-[10px] mt-1.5 pl-1">ID reçu par SMS après votre paiement</p>
              </div>

              <div>
                <p id="link-manual-screenshot-label" className="text-slate-500 text-[11px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ImageIcon size={11} /> Capture d'écran <span className="text-red-400">*</span>
                </p>
                <input ref={fileInputRef} id="link-manual-screenshot" aria-labelledby="link-manual-screenshot-label" type="file" accept="image/*,image/heic,image/heif,.heic,.heif,.pdf,.webp" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshotSelect(f); }} />
                {screenshotFile ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-slate-100">
                    {screenshotFile.type.startsWith("image/") && screenshotPreview ? (
                      <img src={screenshotPreview} alt="Capture" className="w-full max-h-44 object-contain bg-slate-50" />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 bg-blue-50">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${BLU}18` }}>
                          <CheckCircle size={22} style={{ color: BLU }} />
                        </div>
                        <p className="text-slate-700 font-semibold text-sm text-center">{screenshotFile.name}</p>
                        <p className="text-slate-400 text-xs">{(screenshotFile.size / 1024 / 1024).toFixed(1)} Mo</p>
                      </div>
                    )}
                    {manualUploading && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin" style={{ color: EM1 }} />
                      </div>
                    )}
                    {!manualUploading && (
                      <button type="button" aria-label="Retirer la capture" onClick={() => { setScreenshotFile(null); setManualScreenshotUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        <XCircle size={15} aria-hidden="true" />
                      </button>
                    )}
                    {manualScreenshotUrl && !manualUploading && (
                      <div className="absolute bottom-2 left-2 rounded-lg px-2 py-1 flex items-center gap-1"
                        style={{ background: "#D1FAE5", border: "1px solid #6EE7B7" }}>
                        <CheckCircle size={10} style={{ color: EM2 }} />
                        <span className="text-[10px] font-bold" style={{ color: EM2 }}>Envoyée</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl p-5 flex flex-col items-center gap-2.5 border-2 border-dashed border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${BLU}12` }}>
                      <Upload size={20} style={{ color: BLU }} />
                    </div>
                    <p className="text-slate-600 text-sm font-semibold">Ajouter une capture d'écran</p>
                    <p className="text-slate-400 text-xs">JPG, PNG, HEIC, PDF, WebP — Max 20 Mo</p>
                  </button>
                )}
              </div>

              {error && (
                <div className="rounded-2xl px-4 py-3 text-sm flex items-start gap-2 bg-red-50 border border-red-100">
            <AlertTriangle size={15} className="flex-shrink-0 text-red-500" />
                  <span className="text-red-600">{error}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-5 mt-5">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-red-600 font-semibold text-sm">Impossible de charger les informations. Veuillez réessayer.</p>
            </div>
          </div>
        )}

        <div className="payment-action-dock">
          <div className="bg-white border-t border-slate-100 shadow-2xl px-4 pt-3 pb-1">
            <div className="rounded-xl px-3 py-2 flex gap-2 bg-red-50 border border-red-100">
              <AlertCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-600 leading-snug">
                <strong>Important :</strong> Toute annulation après soumission entraîne un bannissement définitif du compte et de l'adresse IP.
              </p>
            </div>
          </div>
          <div className="bg-white px-4 pt-2 pb-5">
            <button onClick={handleManualSubmit}
              disabled={manualSubmitting || manualUploading || !depositInfo || !canSend}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2.5"
              style={{
                background: canSend && !manualSubmitting ? `linear-gradient(135deg,${EM1},${EM2})` : "#E2E8F0",
                color: canSend && !manualSubmitting ? "#fff" : "#94A3B8",
                boxShadow: canSend && !manualSubmitting ? `0 8px 32px ${EM1}35` : "none"
              }}>
              {manualSubmitting ? <><Loader2 size={18} className="animate-spin" /> Envoi en cours…</> : <><ShieldCheck size={18} /> Envoyer la demande</>}
            </button>
            <p className="text-center text-[10px] text-slate-300 mt-2 flex items-center justify-center gap-1">
              <ShieldCheck size={9} /> SIKApay · SIKA TEXTE · Sécurisé
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ÉTAPE 1 : Sélection du pays
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "country" || step === "operator" || step === "phone") {
    const canContinue = !!country && !!operator && phone.replace(/\D/g, "").length >= 6 &&
      payerFullName.trim().length >= 3 && (!link?.isPcs || !!email.trim());
    return (
      <div className="payment-journey min-h-[100dvh] pb-8" style={{ background: PG }}>
        <PageHeader onBack={() => window.history.back()} showProgress formStep="country" />
        <form className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-5" onSubmit={(event) => { event.preventDefault(); if (canContinue) void handleContinue(); }}>
          <div className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
            <label htmlFor="link-payer-name" className="mb-1.5 block text-xs font-bold text-slate-600">Nom complet du payeur</label>
            <input id="link-payer-name" autoComplete="name" value={payerFullName} onChange={e => setPayerFullName(e.target.value)}
              placeholder="Ex. Awa Kouassi" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="space-y-3 rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
            <div>
              <label htmlFor="link-country" className="mb-1.5 block text-xs font-bold text-slate-600">Pays</label>
              <select id="link-country" value={country} onChange={e => { setCountry(e.target.value); setOperator(""); setPhone(""); }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-violet-400" required>
                <option value="">Choisir un pays</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} (+{c.prefix})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="link-operator" className="mb-1.5 block text-xs font-bold text-slate-600">Opérateur Mobile Money</label>
              <select id="link-operator" value={operator} onChange={e => setOperator(e.target.value)} disabled={!country}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-violet-400 disabled:opacity-60" required>
                <option value="">Choisir un opérateur</option>
                {visibleOperators.map(code => <option key={code} value={code} disabled={isOpMaintenance(country, code)}>{OPERATORS[code]?.full}{isOpMaintenance(country, code) ? " — Maintenance" : ""}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="link-phone" className="mb-1.5 block text-xs font-bold text-slate-600">Numéro de téléphone</label>
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-violet-400">
                <span className="flex items-center border-r border-slate-200 px-3 text-sm font-semibold text-slate-500">+{selectedCountry?.prefix || "—"}</span>
                <input id="link-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder={selectedCountry?.phonePlaceholder || "Numéro local"} required className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none" />
              </div>
            </div>
            {link?.isPcs && (
              <div>
                <label htmlFor="link-email" className="mb-1.5 block text-xs font-bold text-slate-600">E-mail du compte SIKA TEXTE</label>
                <input id="link-email" type="email" autoComplete="email" value={email} onChange={e => { if (!currentUserEmail) setEmail(e.target.value); }}
                  readOnly={Boolean(currentUserEmail)} disabled={!authChecked} required placeholder="nom@exemple.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none read-only:text-slate-500 focus:border-violet-400" />
                {currentUserEmail && <p className="mt-1 text-xs text-slate-400">Adresse vérifiée de votre compte connecté.</p>}
              </div>
            )}
          </div>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={!canContinue || submitting}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 font-bold text-white shadow-md shadow-violet-900/15 transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-45">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {submitting ? "Préparation…" : <>Continuer · {amount} {link?.currency}<ChevronRight size={18} /></>}
          </button>
        </form>
      </div>
    );
  }

  if (step === "country") {
    return (
      <div className="payment-journey min-h-screen pb-10" style={{ background: PG }}>
        <PageHeader showProgress formStep="country" />
        <div className="px-4 pt-5 pb-10 space-y-4 max-w-md mx-auto">
          <div className="text-center pb-1">
            <p className="text-slate-700 font-black text-lg">Sélectionnez votre pays</p>
            <p className="text-slate-400 text-sm mt-0.5">Étape 1 sur 3 — Choisissez votre pays de résidence</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {COUNTRIES.map(c => (
              <button key={c.code}
                onClick={() => { setCountry(c.code); setOperator(""); setStep("operator"); }}
                className="flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-95"
                style={{
                  background: "#fff",
                  borderColor: "#E2E8F0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-xs font-black text-violet-700">{c.code}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight text-slate-800 truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">+{c.prefix}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl px-4 py-3 flex gap-2.5 bg-blue-50 border border-blue-100">
            <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Choisissez votre pays pour voir les réseaux Mobile Money disponibles dans votre zone.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ÉTAPE 2 : Sélection de l'opérateur
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "operator") {
    const modeForCountry = getMode(country);
    return (
      <div className="payment-journey min-h-screen pb-10" style={{ background: PG }}>
        <PageHeader onBack={() => setStep("country")} showProgress formStep="operator" />
        <div className="px-4 pt-5 pb-10 space-y-4 max-w-md mx-auto">

          <div className="flex items-center gap-2 pb-1">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-xs font-black text-violet-700">{selectedCountry?.code}</span>
            <div>
              <p className="text-slate-700 font-black text-lg leading-tight">Réseau Mobile Money</p>
              <p className="text-slate-400 text-sm">Étape 2 sur 3 — {selectedCountry?.name}</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {visibleOperators.map(op => {
              const info = OPERATORS[op];
              const inMaintenance = isOpMaintenance(country, op);
              return (
                <button key={op} disabled={inMaintenance}
                  onClick={() => { setOperator(op); setStep("phone"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: inMaintenance ? "#f8fafc" : "#fff",
                    borderColor: "#E2E8F0",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}>
                  <div className={inMaintenance ? "grayscale opacity-60" : ""}>
                    <OperatorBadge code={op} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800 text-sm">{info.name}</p>
                      {inMaintenance && <MaintenanceBadge />}
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{info.full}</p>
                    {inMaintenance && <p className="text-red-500 text-[10px] font-semibold mt-0.5">Indisponible — en maintenance</p>}
                  </div>
                  {!inMaintenance && <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {modeForCountry === "redirect" && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 flex gap-3">
              <ExternalLink size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-800">
                <strong>{selectedCountry?.name} :</strong> Vous serez redirigé vers la page de paiement sécurisée.
              </p>
            </div>
          )}

          {modeForCountry === "manual" && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex gap-3">
              <Info size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Le paiement pour <strong>{selectedCountry?.name}</strong> se fait par <strong>dépôt manuel</strong>. Vous recevrez un numéro de dépôt à l'étape suivante.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ÉTAPE 3 : Numéro + infos identité
  // ─────────────────────────────────────────────────────────────────────────────
  // step === "phone"
  const phoneValid = phone.replace(/\D/g, "").length >= 6;
  const nameValid  = !link?.isPcs || (firstName.trim() && lastName.trim());
  const emailValid = !link?.isPcs || (email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
  const canContinue = phoneValid && nameValid && emailValid && !isOpMaintenance(country, operator);

  return (
    <div className="payment-journey min-h-screen pb-10" style={{ background: PG }}>
      <style>{`@keyframes bounceDot{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>
      <PageHeader onBack={() => setStep("operator")} showProgress formStep="phone" />

      <div className="px-4 pt-5 space-y-4 max-w-md mx-auto">

        <div className="flex items-center gap-3 pb-1">
          <OperatorBadge code={operator} size="sm" />
          <div>
            <p className="text-slate-700 font-black text-lg leading-tight">Numéro Mobile Money</p>
            <p className="text-slate-400 text-sm">Étape 3 sur 3 — {selectedOp?.full}</p>
          </div>
        </div>

        {/* Numéro */}
        <div className="bg-white rounded-3xl shadow-md p-4 space-y-2">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <Phone size={11} /> Numéro Mobile Money
          </p>
          <div className="flex gap-2">
            <div className="flex items-center justify-center bg-slate-100 rounded-2xl px-3 text-sm font-bold text-slate-500 whitespace-nowrap flex-shrink-0">
              +{selectedCountry?.prefix}
            </div>
            <input type="tel" inputMode="numeric" autoFocus value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
              placeholder={`Ex : ${selectedCountry?.phonePlaceholder}`}
              className="flex-1 bg-slate-50 border-2 border-slate-100 focus:border-blue-400 rounded-2xl px-4 py-3 text-base font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors" />
          </div>
          <p className="text-slate-300 text-xs pl-1">Entrez votre numéro local (sans l'indicatif pays)</p>
        </div>

        {isOpMaintenance(country, operator) && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex gap-3">
            <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700"><strong>{selectedOp?.name}</strong> est en maintenance. Le paiement peut échouer.</p>
          </div>
        )}

        {useRedirect && operator && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 flex gap-3">
            <ExternalLink size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800">
              <strong>{selectedCountry?.name} :</strong> Vous serez redirigé vers la page de paiement sécurisée.
            </p>
          </div>
        )}

        {useManual && !useRedirect && operator && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex gap-3">
            <Info size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Le paiement pour <strong>{selectedCountry?.name}</strong> se fait par <strong>dépôt manuel</strong>. À l'étape suivante, vous recevrez un numéro de dépôt.
            </p>
          </div>
        )}

        {/* Prénom / Nom / Email */}
        <div className="bg-white rounded-3xl shadow-md p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Prénom", value: firstName, set: setFirstName, ph: "Jean" },
              { label: "Nom",    value: lastName,  set: setLastName,  ph: "Dupont" },
            ].map(f => (
              <div key={f.label}>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-wider mb-2">{f.label}</p>
                <input type="text" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-400 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors" />
              </div>
            ))}
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-wider mb-2">
              Email{link?.isPcs ? " — Compte Sika Texte" : ""}
            </p>
            {link?.isPcs && currentUserEmail ? (
              <div className="w-full border-2 border-emerald-200 bg-emerald-50 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle size={14} style={{ color: EM1 }} className="flex-shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            ) : (
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={link?.isPcs ? "Adresse e-mail de votre compte Sika" : "jean@exemple.com"}
                className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-400 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors" />
            )}
            {link?.isPcs && (
              <p className="text-slate-500 text-[10px] mt-1.5 flex items-center gap-1"><AlertTriangle size={11} /> Seuls les comptes Sika Texte sont acceptés.</p>
            )}
          </div>
        </div>

        {/* Récapitulatif */}
        {phoneValid && (
          <div className="bg-white rounded-3xl shadow-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Récapitulatif</p>
            </div>
            <div className="divide-y divide-slate-50">
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-slate-500 text-sm">Pays</p>
                <div className="flex items-center gap-1.5"><span className="text-xs font-black text-violet-700">{selectedCountry?.code}</span><span className="font-semibold text-slate-800 text-sm">{selectedCountry?.name}</span></div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-slate-500 text-sm">Réseau</p>
                <div className="flex items-center gap-2"><OperatorBadge code={operator} size="sm" /><span className="font-semibold text-slate-800 text-sm">{selectedOp?.name}</span></div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-slate-500 text-sm">Numéro</p>
                <p className="font-bold text-slate-800 font-mono">+{selectedCountry?.prefix} {phone}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm flex items-start gap-2">
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}
      </div>

      {/* CTA fixe */}
      <div className="payment-action-dock">
        <div className="bg-white border-t border-slate-100 shadow-2xl px-4 pt-3 pb-1 space-y-1.5">
          <div className="rounded-xl px-3 py-2 flex gap-2 bg-red-50 border border-red-100">
            <AlertCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-600 leading-snug">
              <strong>Important :</strong> Toute annulation après soumission entraîne le bannissement définitif du compte et de l'adresse IP.
            </p>
          </div>
          <div className="rounded-xl px-3 py-2 flex gap-2 bg-amber-50 border border-amber-100">
            <AlertCircle size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 leading-snug">Nos équipes sont mobilisées. Veuillez patienter après chaque paiement.</p>
          </div>
        </div>
        <div className="bg-white px-4 pt-2 pb-5">
          <button onClick={handleContinue}
            disabled={submitting || !canContinue}
            className="w-full py-4 rounded-2xl font-black text-white text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{
              background: useRedirect && operator
                ? "linear-gradient(135deg,#ea580c,#f97316)"
                : `linear-gradient(135deg,${BLU},${BLU2})`,
              boxShadow: `0 8px 24px ${useRedirect && operator ? "#f9731640" : `${BLU}50`}`
            }}>
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> Traitement<AnimatedDots /></>
              : useRedirect && operator
                ? <><ExternalLink size={18} /> Accéder au paiement ({amount} {link?.currency})</>
                : <>Continuer <ChevronRight size={18} /></>
            }
          </button>
          <p className="text-center text-[10px] text-slate-300 mt-2 flex items-center justify-center gap-1">
            <ShieldCheck size={10} /> Paiement sécurisé · SIKApay SIKA TEXTE
          </p>
        </div>
      </div>
    </div>
  );
}
