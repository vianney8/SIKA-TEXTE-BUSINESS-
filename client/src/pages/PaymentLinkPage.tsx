import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { CheckCircle, ChevronLeft, ChevronRight, Clock, Copy, ExternalLink, ImageIcon, Loader2, Upload, XCircle, ShieldCheck, AlertTriangle, AlertCircle, Info, Wrench } from "lucide-react";

// ─── Config pays & opérateurs ────────────────────────────────────────────────
const COUNTRIES = [
  { code: "BJ",  name: "Bénin",             flag: "🇧🇯", prefix: "229", phonePlaceholder: "01 23 45 67 89", operators: ["mtn","moov"] },
  { code: "CI",  name: "Côte d'Ivoire",     flag: "🇨🇮", prefix: "225", phonePlaceholder: "05 12 34 56 78", operators: ["mtn","moov","orange","wave"] },
  { code: "SN",  name: "Sénégal",           flag: "🇸🇳", prefix: "221", phonePlaceholder: "01 23 45 67",    operators: ["orange","wave","free"] },
  { code: "BF",  name: "Burkina Faso",      flag: "🇧🇫", prefix: "226", phonePlaceholder: "01 23 45 67",    operators: ["moov","orange","wave"] },
  { code: "TG",  name: "Togo",              flag: "🇹🇬", prefix: "228", phonePlaceholder: "01 23 45 67",    operators: ["moov","tmoney"] },
  { code: "CM",  name: "Cameroun",          flag: "🇨🇲", prefix: "237", phonePlaceholder: "6 12 34 56 78",  operators: ["mtn","orange"] },
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

function OperatorLogo({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
  const op = OPERATORS[code];
  if (!op) return null;
  const sizes = { sm: "w-10 h-10 text-xs", md: "w-14 h-14 text-sm", lg: "w-16 h-16 text-base" };
  return (
    <div className={`${sizes[size]} rounded-2xl flex items-center justify-center font-black shadow-sm border-2 flex-shrink-0`}
      style={{ backgroundColor: op.bg, color: op.text, borderColor: op.border }}>
      {op.initials}
    </div>
  );
}

type Step = "form" | "manual" | "pending" | "success" | "failed" | "redirected" | "submitted";

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
  return <span className="font-mono text-blue-300 font-bold">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
}

function AnimatedDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      {[0,1,2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-current inline-block"
          style={{ animation: `bounce 1.2s ${i*0.2}s infinite ease-in-out` }} />
      ))}
    </span>
  );
}

function OperatorBadge({ code, size = "md" }: { code: string; size?: "sm" | "md" }) {
  const op = OPERATORS[code];
  if (!op) return null;
  const cls = size === "sm" ? "w-10 h-10 text-xs" : "w-12 h-12 text-sm";
  return (
    <div className={`${cls} rounded-2xl flex items-center justify-center font-black shadow-sm border-2 flex-shrink-0`}
      style={{ backgroundColor: op.bg, color: op.text, borderColor: op.border }}>
      {op.initials}
    </div>
  );
}

export default function PaymentLinkPage() {
  const params = useParams<{ linkId: string }>();
  const linkId = params.linkId;

  const [link, setLink] = useState<any>(null);
  const [loadError, setLoadError] = useState("");

  // Form state
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Manual deposit state
  const [depositInfo, setDepositInfo] = useState<any>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [manualTxnId, setManualTxnId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [manualUploading, setManualUploading] = useState(false);
  const [manualScreenshotUrl, setManualScreenshotUrl] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // USSD state
  const [txnId, setTxnId] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const selectedOp = OPERATORS[operator];

  // Mode par pays depuis la config admin
  type PayMode = "manual" | "redirect" | "solvexpay";
  const countryModes: Record<string, { mode: PayMode; redirectUrl: string }> = link?.countryModes ?? {};
  const ciMode: PayMode = link?.ciMode ?? "redirect";
  const maintenanceMap: Record<string, boolean> = link?.maintenanceMap ?? {};
  const isOpMaintenance = (c: string, op: string) => maintenanceMap[`${c}_${op}`] === true;

  const getMode = (c: string): PayMode => {
    if (!c) return "manual";
    if (c === "CI") return ciMode;
    return countryModes[c]?.mode ?? "manual";
  };
  const getRedirectUrl = (c: string): string => {
    if (c === "CI") return link?.ciRedirectUrl || "";
    return countryModes[c]?.redirectUrl || "";
  };

  const currentMode = getMode(country);
  const useRedirect = country !== "" && currentMode === "redirect";
  const useManual   = country !== "" && (currentMode === "manual" || (!useRedirect && link?.manualMode === true));

  // Load link info
  useEffect(() => {
    if (!linkId) return;
    fetch(`/api/public/payment-links/${linkId}`, { cache: 'no-store' })
      .then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.message || "Lien invalide"); }); return r.json(); })
      .then(data => setLink(data))
      .catch(err => setLoadError(err.message));
  }, [linkId]);

  // Load current user email for PCS pre-fill
  useEffect(() => {
    fetch('/api/auth/user', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.email) setCurrentUserEmail(data.email); })
      .catch(() => {});
  }, []);

  // Pre-fill email for PCS links
  useEffect(() => {
    if (link?.isPcs && currentUserEmail) setEmail(currentUserEmail);
  }, [link?.isPcs, currentUserEmail]);

  // Screenshot preview
  useEffect(() => {
    if (!screenshotFile) { setScreenshotPreview(null); return; }
    const url = URL.createObjectURL(screenshotFile);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

  // Fetch deposit info when entering manual step
  useEffect(() => {
    if (step === "manual" && country && operator && useManual) {
      setDepositLoading(true);
      fetch(`/api/public/payment-links/${linkId}/manual-deposit-info?country=${country}&operator=${operator}`)
        .then(r => r.json())
        .then(d => setDepositInfo(d))
        .catch(() => setDepositInfo(null))
        .finally(() => setDepositLoading(false));
    }
  }, [step, country, operator, useManual, linkId]);

  // USSD polling
  useEffect(() => {
    if (step !== "pending" || !txnId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/public/payment-links/check/${txnId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "completed") { setStep("success"); return; }
        if (data.status === "failed") { setStep("failed"); return; }
        setPollCount(c => c + 1);
      } catch {}
    };
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [step, txnId]);

  const copyDepositNumber = () => {
    const num = depositInfo?.depositNumber || "";
    if (num) { navigator.clipboard.writeText(num); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // Upload screenshot
  const handleScreenshotSelect = async (file: File) => {
    setScreenshotFile(file);
    setManualUploading(true);
    setManualScreenshotUrl("");
    try {
      const form = new FormData();
      form.append("screenshot", file);
      const res = await fetch(`/api/public/payment-links/${linkId}/manual-upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur upload");
      setManualScreenshotUrl(data.screenshotUrl);
    } catch {
      setScreenshotFile(null);
    } finally {
      setManualUploading(false);
    }
  };

  // Step 1 → next
  const handleContinue = async () => {
    setError("");
    if (!country) { setError("Veuillez sélectionner un pays"); return; }
    if (!operator) { setError("Veuillez sélectionner un opérateur"); return; }
    if (!phone.replace(/\D/g, "").match(/^\d{6,}$/)) { setError("Veuillez saisir votre numéro Mobile Money"); return; }
    if (link?.isPcs) {
      if (!firstName.trim() || !lastName.trim()) { setError("Veuillez saisir votre prénom et nom"); return; }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Veuillez saisir une adresse e-mail valide"); return; }
      // Vérifier que l'email appartient à un compte Sika
      try {
        const r = await fetch(`/api/public/check-sika-email?email=${encodeURIComponent(email.trim())}`);
        const d = await r.json();
        if (!d.exists) { setError("Cet e-mail ne correspond à aucun compte Sika Texte. Veuillez utiliser l'adresse e-mail de votre compte."); return; }
      } catch { setError("Erreur de vérification de l'e-mail. Réessayez."); return; }
    }

    if (useRedirect) {
      // Redirection vers le lien configuré (CI ou autre pays)
      const redirectUrl = getRedirectUrl(country);
      setSubmitting(true);
      try {
        await fetch(`/api/public/payment-links/${linkId}/ci-record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone.replace(/\s/g, ""),
            operator,
            country,
            customerName: `${firstName.trim()} ${lastName.trim()}`,
            customerEmail: email.trim(),
          }),
        });
      } catch {}
      setSubmitting(false);
      if (redirectUrl) window.open(redirectUrl, "_blank");
      setStep("redirected");
    } else if (useManual) {
      setStep("manual");
    } else {
      // USSD direct
      setSubmitting(true);
      try {
        const res = await fetch(`/api/public/payment-links/${linkId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone.replace(/\s/g, ""),
            operator,
            country,
            customerName: `${firstName.trim()} ${lastName.trim()}`,
            customerEmail: email.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message || "Erreur lors du paiement"); return; }
        setTxnId(data.transactionId);
        setStep("pending");
      } catch { setError("Erreur réseau. Vérifiez votre connexion."); }
      finally { setSubmitting(false); }
    }
  };

  // Manual submit
  const handleManualSubmit = async () => {
    if (!manualTxnId.trim()) { setError("Veuillez saisir l'ID de transaction"); return; }
    if (!manualScreenshotUrl) { setError("Veuillez charger la capture d'écran"); return; }
    setManualSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/public/payment-links/${linkId}/manual-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: `${selectedCountry?.prefix}${phone.replace(/\s/g, "")}`,
          operator,
          country,
          customerName: `${firstName.trim()} ${lastName.trim()}`,
          customerEmail: email.trim(),
          transactionId: manualTxnId.trim(),
          screenshotUrl: manualScreenshotUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur serveur");
      setSubmittedAt(new Date().toISOString());
      setStep("submitted");
    } catch (e: any) { setError(e.message || "Erreur lors de l'envoi. Réessayez."); }
    finally { setManualSubmitting(false); }
  };

  const reset = () => {
    setStep("form"); setCountry(""); setOperator(""); setPhone(""); setFirstName(""); setLastName("");
    if (!link?.isPcs || !currentUserEmail) setEmail("");
    setDepositInfo(null); setManualTxnId(""); setScreenshotFile(null); setManualScreenshotUrl("");
    setTxnId(""); setPollCount(0); setError("");
  };

  const BG = { background: "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" };
  const amount = link ? parseFloat(link.amount).toLocaleString("fr-FR") : "—";

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!link && !loadError) return (
    <div className="min-h-screen flex items-center justify-center" style={BG}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin" />
        </div>
        <p className="text-white/40 text-sm font-medium">Chargement</p>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────────
  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center px-5" style={BG}>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="font-bold text-white text-lg mb-2">Lien introuvable</h2>
        <p className="text-white/50 text-sm">{loadError}</p>
      </div>
    </div>
  );

  // ── Success (USSD) ───────────────────────────────────────────────────────────
  if (step === "success") return (
    <div className="min-h-screen flex items-center justify-center px-5" style={BG}>
      <div className="text-center max-w-sm w-full">
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30 mx-auto">
            <CheckCircle size={56} className="text-white" />
          </div>
        </div>
        <h2 className="font-black text-white text-3xl mb-2">Payé !</h2>
        <p className="text-white/60 text-base mb-1">
          <span className="text-white font-bold text-xl">{amount} {link.currency}</span>
        </p>
        <p className="text-white/40 text-sm">{link.label}</p>
        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="text-white/30 text-xs">Paiement sécurisé par <span className="text-white/50 font-bold">SIKApay</span></p>
        </div>
      </div>
    </div>
  );

  // ── Failed ───────────────────────────────────────────────────────────────────
  if (step === "failed") return (
    <div className="min-h-screen flex items-center justify-center px-5" style={BG}>
      <div className="text-center max-w-sm w-full">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <XCircle size={48} className="text-red-400" />
        </div>
        <h2 className="font-black text-white text-2xl mb-2">Paiement échoué</h2>
        <p className="text-white/50 text-sm mb-8">Vérifiez votre solde et réessayez.</p>
        <button onClick={reset}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
          Réessayer
        </button>
      </div>
    </div>
  );

  // ── Pending (USSD polling) ───────────────────────────────────────────────────
  if (step === "pending") return (
    <div className="min-h-screen flex items-center justify-center px-5" style={BG}>
      <div className="text-center max-w-sm w-full">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-white/5" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 border-r-blue-300 animate-spin" style={{ animationDuration: "1s" }} />
          <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
        </div>
        <h2 className="font-black text-white text-2xl mb-3">Validation en cours</h2>
        <p className="text-white/60 text-sm mb-1">
          Confirmez le paiement de{" "}
          <span className="text-white font-bold">{amount} {link.currency}</span>{" "}
          sur votre téléphone.
        </p>
        <p className="text-white/30 text-xs mt-2">
          Notification USSD sur <span className="text-white/50">+{selectedCountry?.prefix} {phone}</span>
        </p>
        <div className="mt-6 mx-auto max-w-xs bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
          <p className="text-blue-300 text-sm font-medium flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            <span>En attente</span>
            <AnimatedDots />
          </p>
        </div>
        <button onClick={reset} className="mt-6 text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2">
          Annuler
        </button>
      </div>
    </div>
  );

  // ── Redirected (CI) ──────────────────────────────────────────────────────────
  if (step === "redirected") return (
    <div className="min-h-screen flex items-center justify-center px-5" style={BG}>
      <div className="text-center max-w-sm w-full">
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-pulse" />
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/30 mx-auto">
            <span className="text-5xl">🇨🇮</span>
          </div>
        </div>
        <h2 className="font-black text-white text-2xl mb-3">Redirection en cours</h2>
        <p className="text-white/60 text-sm mb-6">Vous avez été redirigé vers la page de paiement sécurisée.</p>
        <button onClick={() => { const u = getRedirectUrl(country); if (u) window.open(u, "_blank"); }}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm mb-4"
          style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}>
          Ouvrir la page de paiement
        </button>
        <button onClick={reset} className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2">Retour</button>
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="text-white/25 text-xs">Paiement sécurisé par <span className="text-white/40 font-bold">SIKApay</span></p>
        </div>
      </div>
    </div>
  );

  // ── Manual submitted ─────────────────────────────────────────────────────────
  if (step === "submitted") {
    return (
      <div className="min-h-screen flex flex-col" style={BG}>
        <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>

        {/* Top bar */}
        <div style={{ background: "linear-gradient(135deg,#0f2460,#1a3a8f)" }} className="px-5 pt-6 pb-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="SIKApay" className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/20" />
            <div>
              <p className="text-[9px] text-blue-300 uppercase tracking-[0.2em] font-bold">SIKApay</p>
              <p className="font-black text-white text-sm leading-tight">SIKA TEXTE</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-400/30 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 text-[11px] font-bold">En vérification</span>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center px-5 py-6 overflow-y-auto">

          {/* Pulsing icon */}
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-blue-500/15 animate-ping" style={{ animationDuration: "2.5s" }} />
            <div className="relative w-20 h-20 rounded-full border border-blue-400/30 bg-blue-500/10 flex items-center justify-center">
              <ShieldCheck size={36} className="text-blue-300" />
            </div>
          </div>

          <h1 className="text-white font-black text-2xl text-center mb-1">Vérification en cours</h1>
          <p className="text-white/45 text-sm text-center mb-5 max-w-xs leading-relaxed">
            Votre demande a bien été reçue et est en cours d'examen par nos agents.
          </p>

          {/* Elapsed time */}
          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex items-center justify-between w-full max-w-sm mb-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-white/40" />
              <span className="text-white/40 text-xs font-semibold">Temps écoulé depuis l'envoi</span>
            </div>
            <ElapsedTimer since={submittedAt} />
          </div>

          {/* Teams mobilized */}
          <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">👥</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">Équipes mobilisées</p>
              <p className="text-white/35 text-xs">Nos agents vérifient votre paiement</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{ animation: `bounce 1.2s ${i*0.3}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="w-full max-w-sm space-y-2 mb-5">
            {[
              { icon: "✅", label: "Demande envoyée avec succès", state: "done" },
              { icon: "🔍", label: "Vérification du paiement", state: "active" },
              { icon: "🔑", label: "Génération du code PCS", state: "pending" },
            ].map((row, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${
                row.state === "done" ? "bg-emerald-500/8 border border-emerald-400/20"
                : row.state === "active" ? "bg-blue-500/10 border border-blue-400/25"
                : "bg-white/3 border border-white/6"
              }`}>
                <span className="text-base flex-shrink-0">{row.icon}</span>
                <p className={`text-sm font-semibold ${
                  row.state === "done" ? "text-emerald-300"
                  : row.state === "active" ? "text-blue-300"
                  : "text-white/25"
                }`}>{row.label}</p>
                {row.state === "active" && <Loader2 size={12} className="text-blue-400 animate-spin ml-auto flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* Recap card */}
          <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-6">
            <p className="text-white/35 text-[10px] uppercase tracking-widest font-bold mb-3">Récapitulatif</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Montant</span>
                <span className="text-white font-black text-base">{amount} <span className="text-white/50 text-sm font-semibold">{link.currency}</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Service</span>
                <span className="text-white font-semibold text-sm truncate max-w-[160px]">{link.label}</span>
              </div>
              {manualTxnId && (
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-sm">Référence</span>
                  <span className="text-white/70 font-mono text-xs">{manualTxnId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full max-w-sm border-t border-white/8 pt-4 text-center">
            <p className="text-white/20 text-[11px] flex items-center justify-center gap-1.5">
              <ShieldCheck size={9} /> Paiement sécurisé · SIKApay SIKA TEXTE
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Manual deposit step ──────────────────────────────────────────────────────
  if (step === "manual") {
    const depositNumber = depositInfo?.depositNumber || "";
    const opCardGradient: Record<string, string> = {
      mtn:     "linear-gradient(135deg, #d97706 0%, #f59e0b 40%, #fbbf24 100%)",
      orange:  "linear-gradient(135deg, #c2410c 0%, #ea580c 40%, #f97316 100%)",
      moov:    "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #3b82f6 100%)",
      wave:    "linear-gradient(135deg, #0369a1 0%, #0284c7 40%, #06b6d4 100%)",
      togocel: "linear-gradient(135deg, #991b1b 0%, #b91c1c 40%, #dc2626 100%)",
      tmoney:  "linear-gradient(135deg, #166534 0%, #16a34a 40%, #22c55e 100%)",
    };
    const cardBg = opCardGradient[operator] || "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #3b82f6 100%)";
    const canSend = !!manualTxnId.trim() && !manualUploading;

    return (
      <div className="min-h-screen pb-52" style={{ background: "linear-gradient(180deg, #060b18 0%, #0a1628 100%)" }}>
        {/* Top nav */}
        <div className="px-5 pt-8 pb-3 flex items-center justify-between">
          <button onClick={() => setStep("form")}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronLeft size={20} className="text-white" />
          </button>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-300 text-[11px] font-bold">Paiement sécurisé</span>
          </div>
          <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-white/15">
            <img src="/logo.jpg" alt="SIKApay" className="w-full h-full object-cover" />
          </div>
        </div>

        {depositLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={36} className="text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Carte de virement ── */}
            <div className="px-5 mt-3 mb-5">
              {!depositNumber ? (
                <div className="rounded-3xl p-5 text-center"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertTriangle size={24} className="text-red-400 mx-auto mb-3" />
                  <p className="text-red-300 font-bold mb-1">Numéro non configuré</p>
                  <p className="text-red-300/60 text-xs">Aucun numéro de dépôt pour {selectedOp?.name} ({selectedCountry?.name}). Contactez l'administrateur.</p>
                </div>
              ) : (
                <div className="relative rounded-3xl overflow-hidden p-6"
                  style={{ background: cardBg, boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)" }}>
                  {/* Décorations */}
                  <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="absolute right-6 -bottom-10 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="absolute left-1/2 -bottom-6 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />

                  <div className="relative">
                    {/* En-tête carte */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.2)" }}>
                          <OperatorLogo code={operator} size="sm" />
                        </div>
                        <div>
                          <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.15em]">Dépôt Mobile Money</p>
                          <p className="text-white font-black text-sm leading-tight">{selectedOp?.name}</p>
                        </div>
                      </div>
                      <div className="rounded-xl px-2.5 py-1" style={{ background: "rgba(255,255,255,0.15)" }}>
                        <p className="text-white text-[10px] font-bold">{selectedCountry?.flag} {selectedCountry?.name}</p>
                      </div>
                    </div>

                    {/* Numéro central */}
                    <div className="mb-5">
                      <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1.5">Numéro de dépôt</p>
                      <p className="text-white font-black text-[27px] tracking-[0.06em] font-mono leading-none">
                        {depositNumber}
                      </p>
                    </div>

                    {/* Montant + Copier */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-0.5">Montant exact</p>
                        <p className="text-white font-black text-2xl leading-none">
                          {amount} <span className="text-white/60 text-sm font-bold">{link.currency}</span>
                        </p>
                      </div>
                      <button onClick={copyDepositNumber}
                        className="flex items-center gap-2 rounded-2xl px-4 py-2.5 font-bold text-sm transition-all"
                        style={{ background: copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.2)", color: copied ? "#4ade80" : "#fff" }}>
                        <Copy size={14} /> {copied ? "Copié ✓" : "Copier"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pills d'info */}
            <div className="px-5 flex gap-2 mb-5">
              <div className="flex-1 rounded-2xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-1">Service</p>
                <p className="text-white/70 text-sm font-semibold truncate">{link.label}</p>
              </div>
              {depositInfo?.isInternational && depositNumber && (
                <div className="flex-1 rounded-2xl px-4 py-3"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <p className="text-amber-400/80 text-[10px] font-bold uppercase tracking-wider mb-1">⚠ Type</p>
                  <p className="text-amber-300 text-sm font-bold">International</p>
                </div>
              )}
            </div>

            {/* Instruction admin */}
            {depositInfo?.showInstruction && depositInfo?.instruction && (
              <div className="px-5 mb-4">
                <div className="rounded-2xl px-4 py-3 flex gap-3"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-300/80 text-xs whitespace-pre-line leading-relaxed">{depositInfo.instruction}</p>
                </div>
              </div>
            )}

            {/* Séparateur */}
            <div className="px-5 flex items-center gap-3 mb-5">
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
              <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest">Confirmer votre paiement</p>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Champs formulaire */}
            <div className="px-5 space-y-3">
              {/* Capture d'écran */}
              <div>
                <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ImageIcon size={11} /> Capture d'écran du reçu <span className="text-red-400">*</span>
                </p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshotSelect(f); }} />
                {screenshotPreview ? (
                  <div className="relative rounded-2xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                    <img src={screenshotPreview} alt="Capture" className="w-full max-h-44 object-contain"
                      style={{ background: "rgba(255,255,255,0.04)" }} />
                    {manualUploading && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.5)" }}>
                        <Loader2 size={24} className="text-white animate-spin" />
                      </div>
                    )}
                    <button onClick={() => { setScreenshotFile(null); setManualScreenshotUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <XCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl p-5 flex flex-col items-center gap-2 transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1.5px dashed rgba(255,255,255,0.1)" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.07)" }}>
                      <Upload size={20} className="text-white/40" />
                    </div>
                    <p className="text-white/50 text-sm font-semibold">Ajouter une capture d'écran</p>
                    <p className="text-white/20 text-xs">JPG, PNG — Max 10 Mo</p>
                  </button>
                )}
              </div>

              {/* ID Transaction */}
              <div>
                <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-2">
                  ID / Référence de transaction <span className="text-red-400">*</span>
                </p>
                <input type="text" value={manualTxnId} onChange={e => setManualTxnId(e.target.value)}
                  placeholder="ex: TXN20240125ABCDE"
                  className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold font-mono text-white placeholder:text-white/20 focus:outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
                />
                <p className="text-white/20 text-[10px] mt-1.5 pl-1">ID reçu par SMS après votre paiement</p>
              </div>

              {error && (
                <div className="rounded-2xl px-4 py-3 text-sm flex items-start gap-2"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <span className="flex-shrink-0 text-red-400">⚠️</span>
                  <span className="text-red-300">{error}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Barre fixe en bas */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto">
          <div className="px-5 pb-5 pt-4 space-y-3"
            style={{ background: "linear-gradient(to top, #060b18 65%, transparent)" }}>
            <div className="rounded-2xl px-3 py-2.5 flex gap-2"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <AlertCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-white/40 leading-snug">
                <span className="text-red-400 font-bold">Important :</span> Toute annulation après soumission entraîne un bannissement définitif du compte et de l'adresse IP.
              </p>
            </div>
            <button onClick={handleManualSubmit}
              disabled={manualSubmitting || manualUploading || !depositInfo || !canSend}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2.5"
              style={{
                background: canSend && !manualSubmitting ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)" : "rgba(255,255,255,0.08)",
                boxShadow: canSend && !manualSubmitting ? "0 8px 32px rgba(37,99,235,0.35)" : "none"
              }}>
              {manualSubmitting
                ? <><Loader2 size={18} className="animate-spin" /> Envoi en cours…</>
                : <><ShieldCheck size={18} /> Envoyer la demande</>
              }
            </button>
            <p className="text-center text-[10px] text-white/20 flex items-center justify-center gap-1">
              <ShieldCheck size={9} /> SIKApay · SIKA TEXTE · Sécurisé
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form (Step 1) ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-60" style={BG}>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1} }`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f2460,#1a3a8f)" }} className="px-5 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="SIKApay" className="w-10 h-10 rounded-2xl object-cover ring-2 ring-white/20" />
            <div>
              <p className="text-[10px] text-blue-300 uppercase tracking-wider font-bold">SIKApay</p>
              <p className="font-black text-white text-sm leading-tight">SIKA TEXTE</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-semibold">Sécurisé</span>
          </div>
        </div>

        {link.imageUrl && (
          <div className="rounded-2xl overflow-hidden mb-4 ring-1 ring-white/10" style={{ maxHeight: 140 }}>
            <img src={link.imageUrl} alt={link.label} className="w-full object-cover" style={{ maxHeight: 140 }} />
          </div>
        )}

        <p className="text-blue-200 text-xs font-semibold mb-1 uppercase tracking-wider">Total à payer</p>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-black text-white">{amount}</span>
          <span className="text-lg font-bold text-blue-300 mb-0.5">{link.currency}</span>
        </div>
        <p className="text-blue-300 text-sm mt-1 font-semibold">{link.label}</p>
        {link.description && <p className="text-blue-200/70 text-xs mt-1 leading-relaxed">{link.description}</p>}
      </div>

      {/* Step indicator */}
      <div className="bg-white/5 border-b border-white/5 px-5 py-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
          <span className="text-blue-800 text-xs font-black">1</span>
        </div>
        <span className="text-white text-xs font-semibold">Coordonnées</span>
        <ChevronRight size={14} className="text-white/20" />
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-white/40 text-xs font-bold">2</span>
        </div>
        <span className="text-white/40 text-xs font-semibold">Paiement</span>
      </div>

      <div className="px-5 pt-4 space-y-4 max-w-md mx-auto">

        {/* Pays */}
        <div>
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2.5">🌍 Pays</p>
          <div className="grid grid-cols-2 gap-2">
            {COUNTRIES.map(c => (
              <button key={c.code} onClick={() => { setCountry(c.code); setOperator(""); }}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all ${
                  country === c.code ? "border-blue-400 bg-blue-500/15" : "border-white/10 bg-white/5"
                }`}>
                <span className="text-2xl">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold leading-tight truncate ${country === c.code ? "text-white" : "text-white/70"}`}>{c.name}</p>
                  <p className="text-[10px] text-white/30">+{c.prefix}</p>
                </div>
                {country === c.code && <CheckCircle size={13} className="text-blue-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Opérateur */}
        {selectedCountry && (
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2.5">Réseau Mobile Money</p>
            <div className="space-y-2">
              {selectedCountry.operators.map(op => {
                const info = OPERATORS[op];
                const selected = operator === op;
                const inMaintenance = isOpMaintenance(country, op);
                return (
                  <button key={op}
                    onClick={() => !inMaintenance && setOperator(op)}
                    disabled={inMaintenance}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                      inMaintenance
                        ? "border-white/5 bg-white/3 opacity-50 cursor-not-allowed"
                        : selected ? "border-blue-400 bg-blue-500/15" : "border-white/10 bg-white/5"
                    }`}>
                    <OperatorBadge code={op} size="sm" />
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${inMaintenance ? "text-white/30" : selected ? "text-white" : "text-white/70"}`}>{info.name}</p>
                      {inMaintenance
                        ? <p className="text-[10px] text-red-400 font-semibold">Indisponible — en maintenance</p>
                        : <p className="text-[11px] text-white/30">{info.full}</p>
                      }
                    </div>
                    {selected && !inMaintenance && <CheckCircle size={16} className="text-blue-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Maintenance warning */}
        {operator && isOpMaintenance(country, operator) && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 flex gap-3">
            <Wrench size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-snug">
              <strong>{selectedOp?.name}</strong> est actuellement en maintenance. Veuillez choisir un autre opérateur ou réessayer plus tard.
            </p>
          </div>
        )}

        {/* Note redirection */}
        {useRedirect && operator && (
          <div className="bg-orange-500/10 border border-orange-400/20 rounded-2xl p-3.5 flex gap-3">
            <ExternalLink size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-300">
              <strong>{selectedCountry?.name} :</strong> Vous serez redirigé vers la page de paiement sécurisée pour finaliser votre transaction.
            </p>
          </div>
        )}

        {/* Note dépôt manuel */}
        {useManual && !useRedirect && operator && (
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-3.5 flex gap-3">
            <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              Le paiement pour <strong>{selectedCountry?.name}</strong> se fait par <strong>dépôt manuel</strong>. À l'étape suivante, vous recevrez un numéro de dépôt.
            </p>
          </div>
        )}

        {/* Numéro Mobile Money */}
        {operator && (
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2.5">📱 Numéro Mobile Money</p>
            <div className="flex gap-2">
              <div className="flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl px-3 text-sm font-bold text-white/60 whitespace-nowrap">
                +{selectedCountry?.prefix}
              </div>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder={`Ex : ${selectedCountry?.phonePlaceholder}`}
                className="flex-1 border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/50"
                style={{ background: "rgba(255,255,255,0.07)" }} />
            </div>
            <p className="text-white/25 text-xs mt-1.5 pl-1">Entrez votre numéro local (sans l'indicatif pays)</p>
          </div>
        )}

        {/* Nom + Prénom + Email (pour PCS ou si renseignement demandé) */}
        {operator && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Prénom", value: firstName, set: setFirstName, ph: "Jean" },
                { label: "Nom", value: lastName, set: setLastName, ph: "Dupont" },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-white/40 text-[11px] uppercase tracking-wider font-semibold mb-2">{f.label}</p>
                  <input type="text" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    className="w-full border border-white/15 rounded-2xl px-3 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/50"
                    style={{ background: "rgba(255,255,255,0.07)" }} />
                </div>
              ))}
            </div>

            {/* Email */}
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-wider font-semibold mb-2">
                Email{link?.isPcs ? " — Compte Sika Texte" : ""}
              </p>
              {link?.isPcs && currentUserEmail ? (
                <div className="w-full border border-green-500/30 rounded-2xl px-4 py-3 text-sm font-semibold text-white flex items-center gap-2"
                  style={{ background: "rgba(34,197,94,0.07)" }}>
                  <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              ) : (
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={link?.isPcs ? "Adresse e-mail de votre compte Sika" : "jean@exemple.com"}
                  className="w-full border border-white/15 rounded-2xl px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/50"
                  style={{ background: "rgba(255,255,255,0.07)" }} />
              )}
              {link?.isPcs && (
                <p className="text-white/30 text-[10px] mt-1.5">⚠️ Seuls les comptes Sika Texte sont acceptés.</p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-400 text-sm flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">⚠️</span><span>{error}</span>
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto">
        <div className="bg-[#0f172a] border-t border-white/5 px-4 pt-3 pb-1 space-y-1.5">
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-3 py-2 flex gap-2">
            <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-300 leading-snug">
              <strong>Important :</strong> Toute annulation après soumission entraîne le bannissement définitif du compte et de l'adresse IP.
            </p>
          </div>
          <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl px-3 py-2 flex gap-2">
            <AlertCircle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-300 leading-snug">
              Nos équipes sont mobilisées. Veuillez patienter après chaque paiement afin que le service traite votre requête.
            </p>
          </div>
        </div>
        <div className="bg-[#0f172a] px-4 pt-2 pb-4">
          <button onClick={handleContinue} disabled={submitting || !country || !operator || isOpMaintenance(country, operator)}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: useRedirect && operator
              ? "linear-gradient(135deg, #ea580c, #f97316)"
              : "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> Traitement<AnimatedDots /></>
              : useRedirect && operator
                ? <><ExternalLink size={18} /> Accéder au paiement ({amount} {link.currency})</>
                : <>Continuer <ChevronRight size={18} /></>
            }
          </button>
          <p className="text-center text-[10px] text-white/25 mt-2 flex items-center justify-center gap-1">
            <ShieldCheck size={10} /> Paiement sécurisé · SIKApay SIKA TEXTE
          </p>
        </div>
      </div>
    </div>
  );
}
