import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import {
  CheckCircle, ChevronRight, Clock, Copy, ExternalLink, ImageIcon,
  Loader2, Upload, XCircle, ShieldCheck, AlertTriangle, AlertCircle, Info, Wrench, Globe, Phone
} from "lucide-react";

// ─── Config pays & opérateurs ────────────────────────────────────────────────
const COUNTRIES = [
  { code: "BJ",  name: "Bénin",         flag: "🇧🇯", prefix: "229", phonePlaceholder: "01 23 45 67 89", operators: ["mtn","moov"] },
  { code: "CI",  name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "225", phonePlaceholder: "05 12 34 56 78", operators: ["mtn","moov","orange","wave"] },
  { code: "SN",  name: "Sénégal",       flag: "🇸🇳", prefix: "221", phonePlaceholder: "01 23 45 67",    operators: ["orange","wave","free"] },
  { code: "BF",  name: "Burkina Faso",  flag: "🇧🇫", prefix: "226", phonePlaceholder: "01 23 45 67",    operators: ["moov","orange","wave"] },
  { code: "TG",  name: "Togo",          flag: "🇹🇬", prefix: "228", phonePlaceholder: "01 23 45 67",    operators: ["moov","tmoney"] },
  { code: "CM",  name: "Cameroun",      flag: "🇨🇲", prefix: "237", phonePlaceholder: "6 12 34 56 78",  operators: ["mtn","orange"] },
];

const OPERATORS: Record<string, { name: string; full: string; bg: string; text: string; border: string; initials: string }> = {
  mtn:    { name: "MTN",     full: "MTN Mobile Money",  bg: "#FFCC00", text: "#1a1a1a", border: "#e6b800", initials: "MTN" },
  moov:   { name: "Moov",    full: "Moov Money",        bg: "#005BAA", text: "#fff",    border: "#004d99", initials: "MV"  },
  orange: { name: "Orange",  full: "Orange Money",      bg: "#FF6600", text: "#fff",    border: "#e55c00", initials: "OM"  },
  wave:   { name: "Wave",    full: "Wave",              bg: "#1B6FEE", text: "#fff",    border: "#1560d4", initials: "W"   },
  tmoney: { name: "T-Money", full: "T-Money",           bg: "#C8102E", text: "#fff",    border: "#a50d25", initials: "TM"  },
  free:   { name: "Free",    full: "Free Money",        bg: "#00923F", text: "#fff",    border: "#007a34", initials: "FM"  },
  airtel: { name: "Airtel",  full: "Airtel Money",      bg: "#E40000", text: "#fff",    border: "#c20000", initials: "AM"  },
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

function OperatorLogo({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
  return <OperatorBadge code={code} size={size} />;
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

function ElapsedTimer({ since }: { since: string | null }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!since) return;
    const start = new Date(since).getTime();
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [since]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span className="font-mono font-bold" style={{ color: EM1 }}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</span>;
}

type Step = "form" | "manual" | "pending" | "success" | "failed" | "redirected" | "submitted";

export default function PaymentLinkPage() {
  const params = useParams<{ linkId: string }>();
  const linkId = params.linkId;

  const [link, setLink]         = useState<any>(null);
  const [loadError, setLoadError] = useState("");

  const [country, setCountry]   = useState("");
  const [operator, setOperator] = useState("");
  const [phone, setPhone]       = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

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

  const [step, setStep]         = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const selectedOp      = OPERATORS[operator];

  type PayMode = "manual" | "redirect" | "solvexpay";
  const countryModes: Record<string, { mode: PayMode; redirectUrl: string }> = link?.countryModes ?? {};
  const ciMode: PayMode       = link?.ciMode ?? "redirect";
  const maintenanceMap: Record<string, boolean> = link?.maintenanceMap ?? {};
  const isOpMaintenance       = (c: string, op: string) => maintenanceMap[`${c}_${op}`] === true;
  const getMode               = (c: string): PayMode  => { if (!c) return "manual"; if (c === "CI") return ciMode; return countryModes[c]?.mode ?? "manual"; };
  const getRedirectUrl        = (c: string): string   => { if (c === "CI") return link?.ciRedirectUrl || ""; return countryModes[c]?.redirectUrl || ""; };
  const currentMode           = getMode(country);
  const useRedirect           = country !== "" && currentMode === "redirect";
  const useManual             = country !== "" && (currentMode === "manual" || (!useRedirect && link?.manualMode === true));

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
      .catch(() => {});
  }, []);

  useEffect(() => { if (link?.isPcs && currentUserEmail) setEmail(currentUserEmail); }, [link?.isPcs, currentUserEmail]);

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
        if (data.status === "completed") { setStep("success"); return; }
        if (data.status === "failed")    { setStep("failed");  return; }
        setPollCount(c => c + 1);
      } catch {}
    };
    const iv = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [step, txnId]);

  const copyDepositNumber = () => {
    const num = depositInfo?.depositNumber || "";
    if (num) { navigator.clipboard.writeText(num); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleScreenshotSelect = async (file: File) => {
    setScreenshotFile(file);
    setManualUploading(true);
    setManualScreenshotUrl("");
    try {
      const form = new FormData();
      form.append("screenshot", file);
      const res  = await fetch(`/api/public/payment-links/${linkId}/manual-upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur upload");
      setManualScreenshotUrl(data.screenshotUrl);
    } catch { setScreenshotFile(null); }
    finally  { setManualUploading(false); }
  };

  const handleContinue = async () => {
    setError("");
    if (!country)  { setError("Veuillez sélectionner un pays"); return; }
    if (!operator) { setError("Veuillez sélectionner un opérateur"); return; }
    if (!phone.replace(/\D/g, "").match(/^\d{6,}$/)) { setError("Veuillez saisir votre numéro Mobile Money"); return; }
    if (link?.isPcs) {
      if (!firstName.trim() || !lastName.trim()) { setError("Veuillez saisir votre prénom et nom"); return; }
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
            customerName: `${firstName.trim()} ${lastName.trim()}`, customerEmail: email.trim(),
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
            customerName: `${firstName.trim()} ${lastName.trim()}`, customerEmail: email.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message || "Erreur lors du paiement"); return; }
        setTxnId(data.transactionId); setStep("pending");
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
          customerName: `${firstName.trim()} ${lastName.trim()}`,
          customerEmail: email.trim(),
          transactionId: manualTxnId.trim(),
          screenshotUrl: manualScreenshotUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur serveur");
      setSubmittedAt(new Date().toISOString()); setStep("submitted");
    } catch (e: any) { setError(e.message || "Erreur lors de l'envoi."); }
    finally { setManualSubmitting(false); }
  };

  const reset = () => {
    setStep("form"); setCountry(""); setOperator(""); setPhone(""); setFirstName(""); setLastName("");
    if (!link?.isPcs || !currentUserEmail) setEmail("");
    setDepositInfo(null); setManualTxnId(""); setScreenshotFile(null); setManualScreenshotUrl("");
    setTxnId(""); setPollCount(0); setError("");
  };

  const amount = link ? parseFloat(link.amount).toLocaleString("fr-FR") : "—";
  const canSend = manualTxnId.trim().length >= 3 && !!manualScreenshotUrl;

  // ── Chargement ────────────────────────────────────────────────────────────
  if (!link && !loadError) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: PG }}>
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
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: PG }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="font-bold text-slate-900 text-lg mb-2">Lien introuvable</h2>
        <p className="text-slate-500 text-sm">{loadError}</p>
      </div>
    </div>
  );

  // ── Succès (USSD) ─────────────────────────────────────────────────────────
  if (step === "success") return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: PG }}>
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
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: PG }}>
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
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: PG }}>
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
          <h2 className="font-black text-slate-900 text-2xl mb-2">Validation en cours</h2>
          <p className="text-slate-500 text-sm">
            Confirmez le paiement de{" "}
            <span className="text-slate-900 font-black">{amount} {link.currency}</span>{" "}
            sur votre téléphone.
          </p>
          <p className="text-slate-400 text-xs mt-2">
            Notification sur <span className="text-slate-600 font-semibold">+{selectedCountry?.prefix} {phone}</span>
          </p>
        </div>
        <div className="rounded-2xl px-4 py-3 bg-emerald-50 border border-emerald-100 flex items-center justify-center gap-2 text-sm text-emerald-700 font-medium">
          <Loader2 size={14} className="animate-spin" />
          <span>En attente</span>
          <AnimatedDots />
        </div>
        <button onClick={reset} className="text-xs text-slate-300 hover:text-slate-500 transition-colors underline">
          Annuler
        </button>
      </div>
    </div>
  );

  // ── Redirigé ──────────────────────────────────────────────────────────────
  if (step === "redirected") return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: PG }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full space-y-5">
        <div className="w-24 h-24 mx-auto rounded-full bg-orange-50 flex items-center justify-center">
          <span className="text-5xl">{selectedCountry?.flag || "🌍"}</span>
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
      <div className="min-h-screen pb-8" style={{ background: PG }}>
        <style>{`@keyframes bounceDot{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>

        <div className="px-5 pt-6 pb-4 flex items-center justify-between" style={{ background: HDR }}>
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="SIKApay" className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/15" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">SIKApay</p>
              <p className="text-white font-black text-sm">SIKA TEXTE</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 text-[11px] font-bold">En vérification</span>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4 max-w-md mx-auto">
          <div className="text-center pb-1">
            <h1 className="text-slate-900 font-black text-2xl mb-1">Vérification en cours</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Votre demande a bien été reçue.<br />
              <span className="text-slate-700 font-semibold">Nos agents vérifient votre paiement.</span>
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${EM1}12` }}>
                <Clock size={16} style={{ color: EM1 }} />
              </div>
              <span className="text-slate-500 text-sm font-medium">Temps écoulé</span>
            </div>
            <ElapsedTimer since={submittedAt} />
          </div>

          <div className="bg-white rounded-3xl shadow-md p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#D1FAE5" }}>
              <span className="text-xl">👥</span>
            </div>
            <div className="flex-1">
              <p className="text-slate-900 font-black text-sm">Équipes mobilisées</p>
              <p className="text-slate-400 text-xs">Nos agents vérifient votre paiement activement</p>
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
              { emoji: "✅", label: "Demande envoyée avec succès",  state: "done"    },
              { emoji: "🔍", label: "Vérification du paiement",     state: "active"  },
              { emoji: "🔑", label: "Génération du code PCS",       state: "waiting" },
            ].map((row, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-slate-50 last:border-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                  style={{
                    background: row.state === "done" ? "#D1FAE5" : row.state === "active" ? "#DBEAFE" : "#F1F5F9",
                    border: `1px solid ${row.state === "done" ? "#6EE7B7" : row.state === "active" ? "#BFDBFE" : "#E2E8F0"}`
                  }}>
                  {row.emoji}
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
      <div className="min-h-screen pb-52" style={{ background: PG }}>
        <style>{`@keyframes bounceDot{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>

        <div className="px-5 pt-6 pb-3 flex items-center justify-between" style={{ background: HDR }}>
          <button onClick={() => setStep("form")}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/60 rounded-xl px-3 py-1.5"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            ← Retour
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

            {/* Carte bon de virement (style ticket/reçu) */}
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
                  <p className="text-white text-[10px] font-bold">{selectedCountry?.flag} {selectedCountry?.name}</p>
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
                      <Copy size={13} /> {copied ? "Copié ✓" : "Copier"}
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
                <p className="text-slate-500 text-[11px] font-black uppercase tracking-wider mb-2">
                  ID de transaction <span className="text-red-400">*</span>
                </p>
                <input type="text" value={manualTxnId} onChange={e => setManualTxnId(e.target.value)}
                  placeholder="ex: TXN20240125ABCDE"
                  className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-400 rounded-2xl px-4 py-3.5 text-sm font-semibold font-mono text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors" />
                <p className="text-slate-300 text-[10px] mt-1.5 pl-1">ID reçu par SMS après votre paiement</p>
              </div>

              <div>
                <p className="text-slate-500 text-[11px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ImageIcon size={11} /> Capture d'écran <span className="text-red-400">*</span>
                </p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshotSelect(f); }} />
                {screenshotPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-slate-100">
                    <img src={screenshotPreview} alt="Capture" className="w-full max-h-44 object-contain bg-slate-50" />
                    {manualUploading && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin" style={{ color: EM1 }} />
                      </div>
                    )}
                    {!manualUploading && (
                      <button onClick={() => { setScreenshotFile(null); setManualScreenshotUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center">
                        ✕
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
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl p-5 flex flex-col items-center gap-2.5 border-2 border-dashed border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${BLU}12` }}>
                      <Upload size={20} style={{ color: BLU }} />
                    </div>
                    <p className="text-slate-600 text-sm font-semibold">Ajouter une capture d'écran</p>
                    <p className="text-slate-400 text-xs">JPG, PNG — Max 10 Mo</p>
                  </button>
                )}
              </div>

              {error && (
                <div className="rounded-2xl px-4 py-3 text-sm flex items-start gap-2 bg-red-50 border border-red-100">
                  <span className="flex-shrink-0 text-red-500">⚠️</span>
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

        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto">
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

  // ── Formulaire principal (étape 1) ────────────────────────────────────────
  return (
    <div className="min-h-screen pb-52" style={{ background: PG }}>
      <style>{`@keyframes bounceDot{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>

      {/* Header sombre avec montant */}
      <div style={{ background: HDR }}>
        <div className="px-5 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="SIKApay" className="w-10 h-10 rounded-2xl object-cover ring-2 ring-white/10" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">SIKApay</p>
              <p className="text-white font-black text-sm">SIKA TEXTE</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-bold text-white">Sécurisé</span>
          </div>
        </div>

        {link.imageUrl && (
          <div className="mx-5 rounded-2xl overflow-hidden mb-3 ring-1 ring-white/10" style={{ maxHeight: 130 }}>
            <img src={link.imageUrl} alt={link.label} className="w-full object-cover" style={{ maxHeight: 130 }} />
          </div>
        )}

        <div className="px-5 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1 text-white/50">Total à payer</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-white leading-none">{amount}</span>
            <span className="text-xl font-bold text-white/40 mb-1">{link.currency}</span>
          </div>
          <p className="text-white/60 text-sm mt-1 font-semibold">{link.label}</p>
          {link.description && <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{link.description}</p>}
        </div>

      </div>

      <div className="px-4 pt-4 space-y-4 max-w-md mx-auto">

        {/* Pays */}
        <div className="bg-white rounded-3xl shadow-md p-4">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Globe size={11} /> Pays
          </p>
          <div className="grid grid-cols-2 gap-2">
            {COUNTRIES.map(c => (
              <button key={c.code} onClick={() => { setCountry(c.code); setOperator(""); }}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all ${
                  country === c.code ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-slate-50 hover:border-slate-200"
                }`}>
                <span className="text-2xl">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold leading-tight truncate ${country === c.code ? "text-blue-900" : "text-slate-700"}`}>{c.name}</p>
                  <p className="text-[10px] text-slate-400">+{c.prefix}</p>
                </div>
                {country === c.code && <CheckCircle size={13} style={{ color: BLU }} className="flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Opérateur */}
        {selectedCountry && (
          <div className="bg-white rounded-3xl shadow-md p-4">
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-3">Réseau Mobile Money</p>
            <div className="space-y-2">
              {selectedCountry.operators.map(op => {
                const info = OPERATORS[op];
                const selected = operator === op;
                const inMaintenance = isOpMaintenance(country, op);
                return (
                  <div key={op}
                    onClick={() => { if (!inMaintenance) setOperator(op); }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all select-none ${
                      inMaintenance ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                        : selected ? "border-blue-500 bg-blue-50 cursor-pointer"
                        : "border-slate-100 bg-slate-50 cursor-pointer hover:border-slate-200"
                    }`}>
                    <div className={inMaintenance ? "grayscale opacity-50" : ""}><OperatorBadge code={op} size="sm" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${inMaintenance ? "text-slate-400" : selected ? "text-blue-900" : "text-slate-700"}`}>{info.name}</p>
                        {inMaintenance && <MaintenanceBadge />}
                      </div>
                      <p className="text-[11px] text-slate-400">{info.full}</p>
                      {inMaintenance && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Indisponible — en maintenance</p>}
                    </div>
                    {selected && !inMaintenance && <CheckCircle size={16} style={{ color: BLU }} className="flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Note redirection */}
        {useRedirect && operator && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 flex gap-3">
            <ExternalLink size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800">
              <strong>{selectedCountry?.name} :</strong> Vous serez redirigé vers la page de paiement sécurisée.
            </p>
          </div>
        )}

        {/* Note dépôt manuel */}
        {useManual && !useRedirect && operator && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex gap-3">
            <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Le paiement pour <strong>{selectedCountry?.name}</strong> se fait par <strong>dépôt manuel</strong>. À l'étape suivante, vous recevrez un numéro de dépôt.
            </p>
          </div>
        )}

        {/* Numéro */}
        {operator && (
          <div className="bg-white rounded-3xl shadow-md p-4">
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Phone size={11} /> Numéro Mobile Money
            </p>
            <div className="flex gap-2">
              <div className="flex items-center justify-center bg-slate-100 rounded-2xl px-3 text-sm font-bold text-slate-500 whitespace-nowrap">
                +{selectedCountry?.prefix}
              </div>
              <input type="tel" inputMode="numeric" value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder={`Ex : ${selectedCountry?.phonePlaceholder}`}
                className="flex-1 bg-slate-50 border-2 border-slate-100 focus:border-blue-400 rounded-2xl px-4 py-3 text-base font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors" />
            </div>
            <p className="text-slate-300 text-xs mt-2 pl-1">Entrez votre numéro local (sans l'indicatif pays)</p>
          </div>
        )}

        {/* Prénom / Nom / Email */}
        {operator && (
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
                <p className="text-slate-300 text-[10px] mt-1.5">⚠️ Seuls les comptes Sika Texte sont acceptés.</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">⚠️</span><span>{error}</span>
          </div>
        )}
      </div>

      {/* CTA fixe */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto">
        <div className="bg-white border-t border-slate-100 shadow-2xl px-4 pt-3 pb-1 space-y-1.5">
          <div className="rounded-xl px-3 py-2 flex gap-2 bg-red-50 border border-red-100">
            <AlertCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-600 leading-snug">
              <strong>Important :</strong> Toute annulation après soumission entraîne le bannissement définitif du compte et de l'adresse IP.
            </p>
          </div>
          <div className="rounded-xl px-3 py-2 flex gap-2 bg-amber-50 border border-amber-100">
            <AlertCircle size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 leading-snug">
              Nos équipes sont mobilisées. Veuillez patienter après chaque paiement.
            </p>
          </div>
        </div>
        <div className="bg-white px-4 pt-2 pb-5">
          <button onClick={handleContinue}
            disabled={submitting || !country || !operator || isOpMaintenance(country, operator)}
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
                ? <><ExternalLink size={18} /> Accéder au paiement ({amount} {link.currency})</>
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
