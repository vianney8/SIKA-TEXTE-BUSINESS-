import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle, Loader2, Clock, XCircle, RefreshCw,
  ShieldCheck, ChevronRight, ChevronLeft, Phone, Globe,
  AlertCircle, ArrowLeft, AlertTriangle, ExternalLink, Wrench,
  Copy, Upload, ImageIcon, Info
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import sikaLogo from "@assets/1764438802465_1773510898637.jpg";

// ─── Config pays & opérateurs ────────────────────────────────────────────────
const COUNTRIES = [
  { code: "BJ",  name: "Bénin",         flag: "🇧🇯", prefix: "229", operators: ["mtn","moov"] },
  { code: "CI",  name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "225", operators: ["mtn","moov","orange","wave"] },
  { code: "SN",  name: "Sénégal",       flag: "🇸🇳", prefix: "221", operators: ["orange","wave","free"] },
  { code: "BF",  name: "Burkina Faso",  flag: "🇧🇫", prefix: "226", operators: ["moov","orange","wave"] },
  { code: "TG",  name: "Togo",          flag: "🇹🇬", prefix: "228", operators: ["moov","tmoney"] },
  { code: "CM",  name: "Cameroun",      flag: "🇨🇲", prefix: "237", operators: ["mtn","orange"] },
];

type MethodType = "ussd" | "redirect";

const OPERATORS: Record<string, {
  name: string; full: string; bg: string; text: string; border: string; initials: string;
  method: MethodType; methodLabel: string;
}> = {
  mtn:    { name: "MTN",     full: "MTN Mobile Money",  bg: "#FFCC00", text: "#1a1a1a", border: "#e6b800", initials: "MTN", method: "ussd",     methodLabel: "USSD Push" },
  moov:   { name: "Moov",    full: "Moov Money",        bg: "#005BAA", text: "#fff",    border: "#004d99", initials: "MV",  method: "ussd",     methodLabel: "USSD Push" },
  orange: { name: "Orange",  full: "Orange Money",      bg: "#FF6600", text: "#fff",    border: "#e55c00", initials: "OM",  method: "ussd",     methodLabel: "USSD Push" },
  wave:   { name: "Wave",    full: "Wave",              bg: "#1B6FEE", text: "#fff",    border: "#1560d4", initials: "W",   method: "redirect", methodLabel: "Redirection" },
  tmoney: { name: "T-Money", full: "T-Money",           bg: "#C8102E", text: "#fff",    border: "#a50d25", initials: "TM",  method: "ussd",     methodLabel: "USSD Push" },
  free:   { name: "Free",    full: "Free Money",        bg: "#00923F", text: "#fff",    border: "#007a34", initials: "FM",  method: "ussd",     methodLabel: "USSD Push" },
  airtel: { name: "Airtel",  full: "Airtel Money",      bg: "#E40000", text: "#fff",    border: "#c20000", initials: "AM",  method: "ussd",     methodLabel: "USSD Push" },
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const PG  = "#EFF2F7";
const HDR = "#0D1B2A";
const EM1 = "#10B981";
const EM2 = "#059669";

// ─── Sous-composants ─────────────────────────────────────────────────────────

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

function MethodPill({ method }: { method: MethodType }) {
  const labels: Record<MethodType, string> = { ussd: "USSD Push", redirect: "Redirection" };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
      {method === "ussd" ? "📱" : "↗️"} {labels[method]}
    </span>
  );
}

function MaintenanceBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600">
      <Wrench size={9} /> Maintenance
    </span>
  );
}

function CountdownHero({ createdAt }: { createdAt: string }) {
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress]   = useState(1);
  const TOTAL = 24 * 60 * 60 * 1000;
  useEffect(() => {
    const deadline = new Date(createdAt).getTime() + TOTAL;
    const update = () => {
      const diff = Math.max(0, deadline - Date.now());
      setRemaining(diff);
      setProgress(diff / TOTAL);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [createdAt]);
  const h   = Math.floor(remaining / 3600000);
  const m   = Math.floor((remaining % 3600000) / 60000);
  const s   = Math.floor((remaining % 60000) / 1000);
  const pct = Math.round((1 - progress) * 100);
  const urgency = progress < 0.25;
  const expired = remaining === 0;

  return (
    <div className="bg-white rounded-3xl shadow-md overflow-hidden w-full">
      <div className="px-5 py-3.5 flex items-center gap-3"
        style={{ background: urgency ? "#FFF7F7" : "#F0FDF9", borderBottom: `1px solid ${urgency ? "#FECDD3" : "#A7F3D0"}` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: urgency ? "#FEE2E2" : "#D1FAE5" }}>
          <Clock size={16} style={{ color: urgency ? "#EF4444" : EM1 }} />
        </div>
        <div className="flex-1">
          <p className="text-slate-900 font-bold text-sm">Délai de traitement</p>
          <p className="text-slate-400 text-xs">Maximum 24 h après la soumission</p>
        </div>
      </div>
      <div className="px-6 py-5 text-center">
        {expired ? (
          <p className="text-red-600 font-black text-3xl">Délai expiré</p>
        ) : (
          <p className={`font-black text-4xl font-mono tracking-wider leading-none ${urgency ? "text-red-600" : "text-slate-900"}`}>
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </p>
        )}
        <p className="text-slate-400 text-xs mt-2 font-semibold uppercase tracking-widest">temps restant</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs font-semibold mb-2">
            <span className="text-slate-400">Avancement</span>
            <span style={{ color: urgency ? "#EF4444" : EM1 }}>{pct}% écoulé</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden bg-slate-100">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${pct}%`,
                background: urgency ? "linear-gradient(90deg,#f97316,#ef4444)" : `linear-gradient(90deg,${EM1},${EM2})`
              }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Activation() {
  const { toast } = useToast();

  const { data: activationStatus, refetch: refetchStatus } = useQuery({ queryKey: ["/api/activation/status"] }) as any;
  const { data: paymentInfo }                               = useQuery({ queryKey: ["/api/activation/payment-info"], refetchInterval: 30000 }) as any;

  const [step, setStep]       = useState<1 | 2 | 3>(1);
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [phone, setPhone]     = useState("");
  const [initializing, setInitializing] = useState(true);

  const [depositInfo, setDepositInfo]               = useState<any>(null);
  const [depositLoading, setDepositLoading]         = useState(false);
  const [payerName, setPayerName]                   = useState("");
  const [transactionId2, setTransactionId2]         = useState("");
  const [screenshotFile, setScreenshotFile]         = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview]   = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting]     = useState(false);
  const [manualSubmitted, setManualSubmitted]       = useState(false);
  const [pendingCreatedAt, setPendingCreatedAt]     = useState<string | null>(null);
  const [rejectionNote, setRejectionNote]           = useState<string | null>(null);
  const [statusChecking, setStatusChecking]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading]             = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [txStatus, setTxStatus]           = useState<"pending" | "completed" | "failed" | null>(null);
  const [checkCount, setCheckCount]       = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const selectedOp      = OPERATORS[operator];
  const isWave          = operator === "wave";

  const maintenanceMap: Record<string, boolean> = paymentInfo?.maintenanceMap ?? {};
  const isOpMaintenance = (c: string, op: string) => maintenanceMap[`${c}_${op}`] === true;

  const activationAmount = paymentInfo?.activationAmount
    ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR")
    : "3 600";

  const phonePlaceholder = country === "BJ" ? "01 23 45 67 89"
    : country === "CM" ? "6 12 34 56 78"
    : country === "CI" ? "05 12 34 56 78"
    : "01 23 45 67";

  const ciMode: "redirect" | "manual" | "solvexpay" = paymentInfo?.ciMode ?? "redirect";
  const ciRedirectUrl = paymentInfo?.ciRedirectUrl || "https://clp.ci/ETPXwo";

  type PayMode = "manual" | "redirect" | "solvexpay";
  const countryModes: Record<string, { mode: PayMode; redirectUrl: string }> = paymentInfo?.countryModes ?? {};
  const getCountryMode     = (c: string): PayMode  => { if (c === "CI") return ciMode; return countryModes[c]?.mode ?? "manual"; };
  const getCountryRedirectUrl = (c: string): string => { if (c === "CI") return ciRedirectUrl; return countryModes[c]?.redirectUrl || ""; };
  const isManualCountry    = (c: string) => getCountryMode(c) === "manual";
  const isRedirectCountry  = (c: string) => getCountryMode(c) === "redirect";

  // Effects
  useEffect(() => {
    if (step !== 2 || !country || !operator) return;
    setDepositLoading(true);
    fetch(`/api/activation/manual-deposit-info?country=${country}&operator=${operator}`, { credentials: "include" })
      .then(r => r.json()).then(d => setDepositInfo(d)).catch(() => setDepositInfo(null)).finally(() => setDepositLoading(false));
  }, [step, country, operator]);

  useEffect(() => {
    if (!screenshotFile) { setScreenshotPreview(null); return; }
    const url = URL.createObjectURL(screenshotFile);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

  useEffect(() => {
    if (!manualSubmitted) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/activation/my-pending-request", { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "approved") { setManualSubmitted(false); refetchStatus(); }
        else if (data.status === "rejected") { setManualSubmitted(false); setRejectionNote(data.adminNote || ""); }
      } catch {}
    };
    const iv = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [manualSubmitted]);

  useEffect(() => {
    if (activationStatus === undefined) return;
    if (activationStatus?.isActive) { setInitializing(false); return; }
    if (manualSubmitted || rejectionNote !== null) { setInitializing(false); return; }
    fetch("/api/activation/my-pending-request", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (!data.found) return;
        const createdAt   = new Date(data.createdAt);
        const hoursDiff   = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        if (data.status === "pending" && hoursDiff < 24) {
          setPendingCreatedAt(createdAt.toISOString()); setManualSubmitted(true);
        } else if (data.status === "rejected") {
          const dismissedAt  = localStorage.getItem("sika_rejection_dismissed_at");
          const requestTime  = new Date(data.createdAt).getTime();
          if (!dismissedAt || requestTime > parseInt(dismissedAt)) setRejectionNote(data.adminNote || "");
        }
      })
      .catch(() => {})
      .finally(() => setInitializing(false));
  }, [activationStatus]);

  useEffect(() => {
    if (!transactionId || txStatus === "completed" || txStatus === "failed") return;
    const check = async () => {
      try {
        const res  = await fetch(`/api/activation/check-solvexpay/${transactionId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setCheckCount(c => c + 1);
        if (data.status === "completed" || data.activated) { setTxStatus("completed"); clearInterval(intervalRef.current!); refetchStatus(); }
        else if (data.status === "failed") { setTxStatus("failed"); clearInterval(intervalRef.current!); }
      } catch {}
    };
    check();
    intervalRef.current = setInterval(check, 5000);
    return () => clearInterval(intervalRef.current!);
  }, [transactionId]);

  // Handlers
  const copyDepositNumber = async () => {
    if (!depositInfo?.depositNumber) return;
    try { await navigator.clipboard.writeText(depositInfo.depositNumber); toast({ title: "Numéro copié !" }); }
    catch { toast({ title: "Copié", description: depositInfo.depositNumber }); }
  };

  const handleStep1Continue = () => {
    if (isManualCountry(country)) setStep(2); else setStep(3);
  };

  const handleManualSubmit = async () => {
    if (!payerName.trim() || payerName.trim().length < 3) {
      toast({ title: "Nom requis", description: "Veuillez saisir le nom et prénom de la carte SIM.", variant: "destructive" }); return;
    }
    if (!transactionId2.trim()) {
      toast({ title: "Champ requis", description: "Veuillez saisir l'ID de transaction.", variant: "destructive" }); return;
    }
    if (!screenshotFile) {
      toast({ title: "Capture requise", description: "Veuillez joindre la capture d'écran.", variant: "destructive" }); return;
    }
    setManualSubmitting(true);
    try {
      const form = new FormData();
      form.append("country", country); form.append("operator", operator);
      form.append("phone", `+${selectedCountry?.prefix}${phone.replace(/\s/g, "")}`);
      form.append("payerName", payerName.trim()); form.append("transactionId", transactionId2.trim());
      form.append("screenshot", screenshotFile);
      const res  = await fetch("/api/activation/manual-submit", { method: "POST", credentials: "include", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur de soumission");
      setPendingCreatedAt(data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString());
      setManualSubmitted(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setManualSubmitting(false); }
  };

  const handleReset = () => {
    localStorage.setItem("sika_rejection_dismissed_at", Date.now().toString());
    setTransactionId(null); setTxStatus(null); setCheckCount(0);
    setStep(1); setPhone(""); setPayerName(""); setTransactionId2(""); setScreenshotFile(null);
    setManualSubmitted(false); setDepositInfo(null); setPendingCreatedAt(null); setRejectionNote(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const checkPendingStatus = async () => {
    setStatusChecking(true);
    try {
      const res  = await fetch("/api/activation/my-pending-request", { credentials: "include" });
      const data = await res.json();
      if (data.status === "approved")  { setManualSubmitted(false); refetchStatus(); }
      else if (data.status === "rejected") { setManualSubmitted(false); setRejectionNote(data.adminNote || ""); }
      else toast({ title: "Toujours en attente", description: "Votre demande est en cours de vérification." });
    } catch { toast({ title: "Erreur réseau", description: "Impossible de vérifier.", variant: "destructive" }); }
    finally  { setStatusChecking(false); }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (isRedirectCountry(country)) {
        const redirectUrl = getCountryRedirectUrl(country);
        if (country === "CI") {
          const res  = await fetch("/api/activation/ci-manual-submit", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, operator, country }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || "Erreur");
          toast({ title: "Récapitulatif envoyé !", description: "Redirection vers la page de paiement…" });
          setTimeout(() => { window.location.href = data.paymentUrl || redirectUrl; }, 1200);
        } else {
          toast({ title: "Redirection en cours…" });
          setTimeout(() => { window.location.href = redirectUrl; }, 800);
        }
        return;
      }
      const res  = await fetch("/api/activation/init-solvexpay", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, operator, country }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur de paiement");
      if (data.paymentUrl) { window.location.href = data.paymentUrl; return; }
      setTransactionId(data.transactionId); setTxStatus("pending");
      toast({ title: "Paiement envoyé !", description: data.message || "Validez sur votre téléphone." });
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  // ── Chargement ────────────────────────────────────────────────────────────
  if (initializing || activationStatus === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PG }}>
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${EM1}25`, animationDuration: "1.8s" }} />
            <div className="relative w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: `${EM1}15`, border: `2px solid ${EM1}35` }}>
              <Loader2 size={26} className="animate-spin" style={{ color: EM1 }} />
            </div>
          </div>
          <div>
            <p className="text-slate-800 font-bold">Chargement…</p>
            <p className="text-slate-400 text-sm">Vérification de votre statut</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Compte déjà activé ────────────────────────────────────────────────────
  if (activationStatus?.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5" style={{ background: PG }}>
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3" style={{ background: HDR }}>
            <img src={sikaLogo} alt="Sika" className="w-10 h-10 rounded-2xl object-cover" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: EM1 }}>Sika Services</p>
              <p className="text-white font-black text-base">SIKA TEXTE</p>
            </div>
          </div>
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: "#D1FAE5" }}>
              <CheckCircle size={40} style={{ color: EM2 }} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Compte activé !</h2>
            <p className="text-slate-500 text-sm mb-7">Vous avez accès à toutes les fonctionnalités de la plateforme.</p>
            <Link href="/">
              <button className="w-full py-4 rounded-2xl font-black text-white text-base"
                style={{ background: `linear-gradient(135deg,${EM1},${EM2})`, boxShadow: `0 8px 24px ${EM1}40` }}>
                Accéder au tableau de bord
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── SolvexPay en cours ────────────────────────────────────────────────────
  if (transactionId && txStatus) {
    const op = selectedOp;
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: PG }}>
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: HDR }}>
            <div className="flex items-center gap-2.5">
              <img src={sikaLogo} alt="Sika" className="w-9 h-9 rounded-xl object-cover" />
              <p className="text-white font-black text-sm">SIKA TEXTE</p>
            </div>
            <OperatorBadge code={operator} size="sm" />
          </div>
          <div className="p-6 space-y-5">
            {txStatus === "pending" && (
              <>
                <div className="text-center space-y-4">
                  <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: op?.bg || EM1 }} />
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: `${op?.bg || EM1}12`, border: `3px solid ${op?.bg || EM1}35` }}>
                      <Clock size={28} style={{ color: op?.bg || EM1 }} />
                    </div>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-xl">Confirmation en attente</p>
                    <p className="text-slate-500 text-sm mt-1">Validez <strong>{activationAmount} FCFA</strong> sur <strong>{op?.full}</strong></p>
                  </div>
                </div>
                <div className="rounded-2xl p-4 space-y-2 text-sm bg-emerald-50 border border-emerald-100">
                  <p className="font-bold text-slate-700 mb-1">Que faire maintenant ?</p>
                  <div className="flex gap-2 text-slate-600"><span>📱</span><span>Une notification USSD a été envoyée</span></div>
                  <div className="flex gap-2 text-slate-600"><span>✅</span><span>Confirmez le paiement sur votre téléphone</span></div>
                  <div className="flex gap-2 text-slate-600"><span>🔄</span><span>Vérification automatique toutes les 5 s</span></div>
                  <p className="text-xs text-slate-400 pt-1 text-right">Tentative #{checkCount + 1}…</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 size={12} className="animate-spin" /> Actualisation en cours…
                </div>
              </>
            )}
            {txStatus === "completed" && (
              <div className="text-center space-y-5">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ background: "#D1FAE5" }}>
                  <CheckCircle style={{ color: EM2 }} size={40} />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-2xl">Paiement confirmé !</p>
                  <p className="text-slate-500 text-sm mt-1">Votre compte est maintenant actif.</p>
                </div>
                <Link href="/">
                  <button className="w-full py-4 rounded-2xl font-black text-white"
                    style={{ background: `linear-gradient(135deg,${EM1},${EM2})` }}>
                    Accéder au tableau de bord
                  </button>
                </Link>
              </div>
            )}
            {txStatus === "failed" && (
              <div className="text-center space-y-5">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-red-50">
                  <XCircle className="text-red-500" size={40} />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-xl">Paiement échoué</p>
                  <p className="text-slate-500 text-sm mt-1">Vérifiez votre solde et réessayez.</p>
                </div>
                <button onClick={handleReset}
                  className="w-full py-3.5 rounded-2xl font-bold border-2 border-slate-200 text-slate-700 flex items-center justify-center gap-2 bg-white">
                  <RefreshCw size={14} /> Réessayer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── DEMANDE REJETÉE ───────────────────────────────────────────────────────
  if (rejectionNote !== null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: PG }}>
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-red-50 shadow-md">
            <XCircle size={38} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-slate-900 font-black text-2xl mb-2">Demande rejetée</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Votre demande n'a pas été validée.<br />
              Vérifiez vos informations et assurez-vous que le paiement a bien été effectué{" "}
              <strong className="text-slate-700">en temps réel</strong> avant de resoumettre.
            </p>
          </div>
          {rejectionNote && (
            <div className="w-full rounded-2xl px-4 py-3.5 text-left bg-red-50 border border-red-200">
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1">Motif</p>
              <p className="text-red-700 text-sm leading-relaxed">{rejectionNote}</p>
            </div>
          )}
          <button onClick={handleReset}
            className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg,${EM1},${EM2})`, boxShadow: `0 8px 24px ${EM1}40` }}>
            <RefreshCw size={16} /> Refaire ma demande
          </button>
        </div>
      </div>
    );
  }

  // ── DEMANDE EN ATTENTE (admin) ────────────────────────────────────────────
  if (manualSubmitted) {
    return (
      <div className="min-h-screen pb-8" style={{ background: PG }}>
        <style>{`@keyframes bounceScale{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>

        <div className="px-5 pt-6 pb-4 flex items-center justify-between" style={{ background: HDR }}>
          <div className="flex items-center gap-2.5">
            <img src={sikaLogo} alt="Sika" className="w-9 h-9 rounded-xl object-cover" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: EM1 }}>Sika Services</p>
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
            <h1 className="text-slate-900 font-black text-2xl mb-1">vérification en cours</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Votre demande a bien été reçue.<br />
              <span className="text-slate-700 font-semibold">Nos équipes sont mobilisées</span> pour la traiter rapidement.
            </p>
          </div>

          {pendingCreatedAt ? (
            <CountdownHero createdAt={pendingCreatedAt} />
          ) : (
            <div className="bg-white rounded-3xl shadow-md p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${EM1}15` }}>
                <Clock size={22} style={{ color: EM1 }} />
              </div>
              <div>
                <p className="text-slate-900 font-bold">Délai maximum</p>
                <p className="text-slate-500 text-sm">24 heures de traitement</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-md p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#D1FAE5" }}>
              <span className="text-xl">👥</span>
            </div>
            <div className="flex-1">
              <p className="text-slate-900 font-black text-sm">Équipes mobilisées</p>
              <p className="text-slate-400 text-xs">Nos agents traitent votre dossier activement</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: EM1, animation: `bounceScale 1.4s ${i*0.25}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Avancement du dossier</p>
            </div>
            {[
              { emoji: "✅", label: "Demande reçue",            sub: "Votre dossier est enregistré",        state: "done"    },
              { emoji: "🔍", label: "Vérification du paiement", sub: "Nos agents contrôlent la transaction", state: "active"  },
              { emoji: "⚡", label: "Activation du compte",      sub: "Votre accès sera déverrouillé",       state: "waiting" },
            ].map((row, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-slate-50 last:border-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                  style={{
                    background: row.state === "done" ? "#D1FAE5" : row.state === "active" ? "#DBEAFE" : "#F1F5F9",
                    border: `1px solid ${row.state === "done" ? "#6EE7B7" : row.state === "active" ? "#BFDBFE" : "#E2E8F0"}`
                  }}>
                  {row.emoji}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${row.state === "done" ? "text-emerald-700" : row.state === "active" ? "text-blue-700" : "text-slate-300"}`}>{row.label}</p>
                  <p className="text-slate-400 text-xs">{row.sub}</p>
                </div>
                {row.state === "active" && <Loader2 size={14} className="text-blue-500 animate-spin flex-shrink-0" />}
                {row.state === "done"   && <CheckCircle size={14} style={{ color: EM1 }} className="flex-shrink-0" />}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-md p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 flex-shrink-0">
                <Info size={14} className="text-blue-500" />
              </div>
              <p className="text-slate-800 font-black text-sm">En attendant…</p>
            </div>
            <ul className="space-y-2">
              {[
                "Gardez votre téléphone à portée — vous serez notifié",
                "Ne soumettez pas une autre demande pour le même paiement",
                "Vérifiez que votre SMS de confirmation est bien reçu",
              ].map((txt, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-500 text-xs leading-snug">
                  <span style={{ color: EM1 }} className="flex-shrink-0 mt-0.5 font-bold">→</span>{txt}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 pt-1">
            <button onClick={checkPendingStatus} disabled={statusChecking}
              className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${EM1},${EM2})`, boxShadow: `0 6px 20px ${EM1}35` }}>
              {statusChecking ? <><Loader2 size={15} className="animate-spin" /> Vérification…</> : <><RefreshCw size={15} /> Actualiser mon statut</>}
            </button>
            <Link href="/">
              <button className="w-full py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-slate-600 border border-slate-200 bg-white">
                Retour à l'accueil
              </button>
            </Link>
          </div>

          <p className="text-slate-300 text-[10px] flex items-center justify-center gap-1.5 pb-2">
            <ShieldCheck size={9} /> Traitement sécurisé · Actualisation auto toutes les 30 s
          </p>
        </div>
      </div>
    );
  }

  // ── ÉTAPE 1 : Coordonnées ─────────────────────────────────────────────────
  if (step === 1) {
    const canContinue = !!(country && operator && phone.replace(/\D/g, "").length >= 6 && !isOpMaintenance(country, operator));
    return (
      <div className="min-h-screen pb-52" style={{ background: PG }}>
        <div style={{ background: HDR }}>
          <div className="px-5 pt-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={sikaLogo} alt="Sika" className="w-10 h-10 rounded-2xl object-cover ring-2 ring-white/10" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: EM1 }}>Sika Services</p>
                <p className="text-white font-black text-sm">SIKA TEXTE</p>
              </div>
            </div>
            <Link href="/withdrawal">
              <button className="flex items-center gap-1.5 text-xs font-semibold text-white/60 rounded-xl px-3 py-1.5"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <ArrowLeft size={13} /> Retour
              </button>
            </Link>
          </div>
          <div className="px-5 pt-3 pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: `${EM1}90` }}>Frais d'activation</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-white leading-none">{activationAmount}</span>
              <span className="text-xl font-bold text-white/40 mb-1">FCFA</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <ShieldCheck size={11} style={{ color: EM1 }} />
              <span className="text-xs font-semibold" style={{ color: `${EM1}80` }}>Upay · Paiement sécurisé</span>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4 max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-md p-4">
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Globe size={11} /> Pays
            </p>
            <div className="grid grid-cols-2 gap-2">
              {COUNTRIES.map(c => (
                <button key={c.code} onClick={() => { setCountry(c.code); setOperator(""); }}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all ${
                    country === c.code ? "border-emerald-400 bg-emerald-50" : "border-slate-100 bg-slate-50 hover:border-slate-200"
                  }`}>
                  <span className="text-2xl">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold leading-tight truncate ${country === c.code ? "text-emerald-800" : "text-slate-700"}`}>{c.name}</p>
                    <p className="text-[10px] text-slate-400">+{c.prefix}</p>
                  </div>
                  {country === c.code && <CheckCircle size={13} style={{ color: EM1 }} className="flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

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
                          : selected ? "border-emerald-400 bg-emerald-50 cursor-pointer"
                          : "border-slate-100 bg-slate-50 cursor-pointer hover:border-slate-200"
                      }`}>
                      <div className={inMaintenance ? "grayscale opacity-50" : ""}><OperatorBadge code={op} size="sm" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-bold ${inMaintenance ? "text-slate-400" : selected ? "text-emerald-800" : "text-slate-700"}`}>{info.name}</p>
                          {inMaintenance && <MaintenanceBadge />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-1">{info.full}</p>
                        {!inMaintenance && <MethodPill method={info.method} />}
                        {inMaintenance && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Indisponible — en maintenance</p>}
                      </div>
                      {selected && !inMaintenance && <CheckCircle size={16} style={{ color: EM1 }} className="flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isWave && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex gap-3">
              <ExternalLink size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-indigo-800 text-sm mb-0.5">Paiement Wave</p>
                <p className="text-xs text-indigo-600">Vous serez redirigé vers Wave pour finaliser votre transaction.</p>
              </div>
            </div>
          )}

          {operator && (
            <div className="bg-white rounded-3xl shadow-md p-4">
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Phone size={11} /> Numéro de paiement
              </p>
              <div className="flex gap-2">
                <div className="flex items-center justify-center bg-slate-100 rounded-2xl px-3 text-sm font-bold text-slate-500 whitespace-nowrap">
                  +{selectedCountry?.prefix}
                </div>
                <input type="tel" inputMode="numeric"
                  placeholder={`Ex : ${phonePlaceholder}`} value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                  className="flex-1 bg-slate-50 border-2 border-slate-100 focus:border-emerald-300 rounded-2xl px-4 py-3 text-base font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors" />
              </div>
              <p className="text-slate-300 text-xs mt-2 pl-1">Entrez votre numéro local (sans l'indicatif pays)</p>
            </div>
          )}

          {operator && isOpMaintenance(country, operator) && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex gap-3">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700">
                <p className="font-bold mb-0.5">⚠ {selectedOp?.name} — En maintenance</p>
                <p>SolvexPay signale une maintenance sur cet opérateur. Le paiement peut échouer.</p>
              </div>
            </div>
          )}

          {country && operator && isManualCountry(country) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex gap-3">
              <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                L'activation pour <strong>{selectedCountry?.name}</strong> se fait par <strong>dépôt manuel</strong>. À l'étape suivante, vous recevrez un numéro de dépôt.
              </p>
            </div>
          )}

          {country && operator && isRedirectCountry(country) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex gap-3">
              <ExternalLink size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-800">
                Vous serez redirigé vers la <strong>page de paiement sécurisée</strong> de votre opérateur.
              </p>
            </div>
          )}
        </div>

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
            <button onClick={handleStep1Continue} disabled={!canContinue}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{
                background: canContinue ? `linear-gradient(135deg,${EM1},${EM2})` : "#E2E8F0",
                color: canContinue ? "#fff" : "#94A3B8",
                boxShadow: canContinue ? `0 8px 24px ${EM1}35` : "none"
              }}>
              Continuer <ChevronRight size={18} />
            </button>
            <p className="text-center text-[10px] text-slate-300 mt-2 flex items-center justify-center gap-1">
              <ShieldCheck size={10} /> Paiement sécurisé · Upay SIKA TEXTE
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── ÉTAPE 2 : Dépôt manuel ─────────────────────────────────────────────────
  if (step === 2) {
    const canSubmit  = transactionId2.trim().length >= 3;
    const fullPhone  = `+${selectedCountry?.prefix}${phone.replace(/\s/g, "")}`;

    return (
      <div className="min-h-screen pb-52" style={{ background: PG }}>
        <div className="px-5 pt-6 pb-3 flex items-center justify-between" style={{ background: HDR }}>
          <button onClick={() => setStep(1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            <ChevronLeft size={18} className="text-white" />
          </button>
          <div className="flex items-center gap-2">
            <img src={sikaLogo} alt="Sika" className="w-7 h-7 rounded-lg object-cover" />
            <p className="text-white font-black text-sm">SIKA TEXTE</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
            style={{ background: `${EM1}18`, border: `1px solid ${EM1}40` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: EM1 }} />
            <span className="text-[10px] font-bold" style={{ color: EM1 }}>Sécurisé</span>
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
                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Dépôt Mobile Money</p>
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
                    {depositInfo.depositNumber || "— — — — —"}
                  </p>
                  {depositInfo.depositNumber && (
                    <button onClick={copyDepositNumber}
                      className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold text-sm transition-all flex-shrink-0"
                      style={{ background: `${EM1}12`, color: EM1, border: `1px solid ${EM1}30` }}>
                      <Copy size={13} /> Copier
                    </button>
                  )}
                </div>
              </div>
              <div className="mx-5 border-t-2 border-dashed border-slate-100" />
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Montant exact</p>
                  <p className="text-slate-900 font-black text-2xl leading-none">
                    {depositInfo.activationAmount?.toLocaleString("fr-FR")}{" "}
                    <span className="text-slate-400 text-sm font-bold">FCFA</span>
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
                <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">{depositInfo.internationalNote}</p>
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
                  Nom & Prénom du payeur <span className="text-red-400">*</span>
                </p>
                <input type="text" placeholder="Ex : KOUASSI Jean" value={payerName}
                  onChange={e => setPayerName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-300 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors" />
                <p className="text-slate-300 text-[10px] mt-1.5 pl-1">Nom enregistré sur la carte SIM utilisée</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px] font-black uppercase tracking-wider mb-2">
                  ID de transaction <span className="text-red-400">*</span>
                </p>
                <input type="text" placeholder="Ex : TXN1234567890" value={transactionId2}
                  onChange={e => setTransactionId2(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-300 rounded-2xl px-4 py-3.5 text-sm font-semibold font-mono text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors" />
                <p className="text-slate-300 text-[10px] mt-1.5 pl-1">ID reçu par SMS après votre paiement</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ImageIcon size={11} /> Capture d'écran <span className="text-red-400">*</span>
                </p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setScreenshotFile(f); }} />
                {screenshotPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-slate-100">
                    <img src={screenshotPreview} alt="Capture" className="w-full max-h-44 object-contain bg-slate-50" />
                    <button onClick={() => { setScreenshotFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <XCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl p-5 flex flex-col items-center gap-2.5 border-2 border-dashed border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${EM1}12` }}>
                      <Upload size={20} style={{ color: EM1 }} />
                    </div>
                    <p className="text-slate-600 text-sm font-semibold">Ajouter une capture d'écran</p>
                    <p className="text-slate-400 text-xs">JPG, PNG — Max 10 Mo</p>
                  </button>
                )}
              </div>
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
                <strong>Important :</strong> Toute annulation après soumission entraîne un bannissement définitif.
              </p>
            </div>
          </div>
          <div className="bg-white px-4 pt-2 pb-5">
            <button onClick={handleManualSubmit}
              disabled={!canSubmit || manualSubmitting || depositLoading || !depositInfo}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2.5"
              style={{
                background: canSubmit && !manualSubmitting ? `linear-gradient(135deg,${EM1},${EM2})` : "#E2E8F0",
                color: canSubmit && !manualSubmitting ? "#fff" : "#94A3B8",
                boxShadow: canSubmit && !manualSubmitting ? `0 8px 32px ${EM1}35` : "none"
              }}>
              {manualSubmitting ? <><Loader2 size={18} className="animate-spin" /> Envoi en cours…</> : <><ShieldCheck size={18} /> Soumettre ma demande</>}
            </button>
            <p className="text-center text-[10px] text-slate-300 mt-2 flex items-center justify-center gap-1">
              <ShieldCheck size={9} /> Upay · SIKA TEXTE · Sécurisé
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── ÉTAPE 3 : Récapitulatif & confirmation ────────────────────────────────
  const op            = selectedOp;
  const displayMethod: MethodType = op?.method ?? "ussd";
  const phoneDisplay  = `+${selectedCountry?.prefix} ${phone}`;

  return (
    <div className="min-h-screen pb-60" style={{ background: PG }}>
      <div style={{ background: HDR }} className="px-5 pt-6 pb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <img src={sikaLogo} alt="Sika" className="w-10 h-10 rounded-2xl object-cover" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: EM1 }}>Sika Services</p>
              <p className="text-white font-black text-sm">SIKA TEXTE</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
            style={{ background: `${EM1}18`, border: `1px solid ${EM1}40` }}>
            <ShieldCheck size={11} style={{ color: EM1 }} />
            <span className="text-[10px] font-bold" style={{ color: EM1 }}>Upay Sécurisé</span>
          </div>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: `${EM1}80` }}>Frais d'activation</p>
        <div className="flex items-end gap-2">
          <span className="text-5xl font-black text-white">{activationAmount}</span>
          <span className="text-xl font-bold text-white/40 mb-1">FCFA</span>
        </div>
      </div>

      {isOpMaintenance(country, operator) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <Wrench size={13} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-800"><strong>{op?.name}</strong> est en maintenance. Le paiement peut être retardé.</p>
        </div>
      )}

      <div className="px-4 pt-4 space-y-4 max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-md overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-slate-50">
            <p className="font-black text-slate-800">Récapitulatif</p>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm font-semibold" style={{ color: EM1 }}>
              <ChevronLeft size={14} /> Modifier
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm text-slate-500">Montant</p>
              <p className="font-black text-2xl text-slate-900">{activationAmount} <span className="text-base font-bold text-slate-400">FCFA</span></p>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="text-sm text-slate-500">Pays</p>
              <div className="flex items-center gap-2"><span className="text-xl">{selectedCountry?.flag}</span><p className="font-semibold text-slate-800">{selectedCountry?.name}</p></div>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="text-sm text-slate-500">Réseau</p>
              <div className="flex items-center gap-2.5">
                <OperatorBadge code={operator} size="sm" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-800 text-sm">{op?.name}</p>
                    {isOpMaintenance(country, operator) && <MaintenanceBadge />}
                  </div>
                  <p className="text-xs text-slate-400">{op?.full}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="text-sm text-slate-500">Numéro</p>
              <p className="font-bold text-slate-800 font-mono">{phoneDisplay}</p>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="text-sm text-slate-500">Méthode</p>
              <MethodPill method={displayMethod} />
            </div>
          </div>
        </div>

        {isWave && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex gap-3">
            <ExternalLink size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-800"><strong>Redirection Wave :</strong> Vous serez redirigé vers Wave pour confirmer votre transaction.</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex gap-3">
          <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            {isRedirectCountry(country)
              ? "En confirmant, vous serez redirigé vers la page de paiement sécurisée."
              : isWave
                ? `En confirmant, vous serez redirigé vers Wave pour payer ${activationAmount} FCFA.`
                : `En confirmant, une notification USSD sera envoyée au ${phoneDisplay} sur ${op?.full}.`
            }
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-2xl max-w-md mx-auto">
        <div className="px-4 pt-3 pb-1 space-y-1.5">
          <div className="rounded-xl px-3 py-2 flex gap-2 bg-red-50 border border-red-100">
            <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-600 leading-snug">
              <strong>Important :</strong> Toute annulation de paiement après soumission est synonyme de bannissement définitif du compte et de l'adresse IP.
            </p>
          </div>
          <div className="rounded-xl px-3 py-2 flex gap-2 bg-amber-50 border border-amber-100">
            <AlertCircle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 leading-snug">
              Nos équipes sont mobilisées. Veuillez patienter après chaque paiement.
            </p>
          </div>
        </div>
        <div className="px-4 pt-2 pb-5">
          <Button onClick={handleConfirm} disabled={loading}
            className="w-full font-black py-4 rounded-2xl text-base shadow-lg flex items-center justify-center gap-2"
            style={{
              background: loading ? "#E2E8F0" : `linear-gradient(135deg,${op?.bg || EM1},${op?.border || EM2})`,
              color: loading ? "#94A3B8" : op?.text || "#fff",
              boxShadow: loading ? "none" : `0 8px 24px ${op?.bg || EM1}40`
            }}>
            {loading
              ? <><Loader2 size={18} className="animate-spin mr-1" />Traitement…</>
              : isRedirectCountry(country)
                ? <><ExternalLink size={18} className="mr-1" />Confirmer et payer — {activationAmount} FCFA</>
                : isWave
                  ? <><ExternalLink size={18} className="mr-1" />Payer via Wave — {activationAmount} FCFA</>
                  : <><CheckCircle size={18} className="mr-1" />Confirmer et payer — {activationAmount} FCFA</>
            }
          </Button>
          <p className="text-center text-[10px] text-slate-300 mt-2 flex items-center justify-center gap-1">
            <ShieldCheck size={10} /> Paiement sécurisé · Upay SIKA TEXTE
          </p>
        </div>
      </div>
    </div>
  );
}
