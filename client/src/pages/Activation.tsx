import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  { code: "BJ",  name: "Bénin",             flag: "🇧🇯", prefix: "229", operators: ["mtn","moov"] },
  { code: "CI",  name: "Côte d'Ivoire",     flag: "🇨🇮", prefix: "225", operators: ["mtn","moov","orange","wave"] },
  { code: "SN",  name: "Sénégal",           flag: "🇸🇳", prefix: "221", operators: ["orange","wave","free"] },
  { code: "BF",  name: "Burkina Faso",      flag: "🇧🇫", prefix: "226", operators: ["moov","orange","wave"] },
  { code: "TG",  name: "Togo",              flag: "🇹🇬", prefix: "228", operators: ["moov","tmoney"] },
  { code: "CM",  name: "Cameroun",          flag: "🇨🇲", prefix: "237", operators: ["mtn","orange"] },
];

type MethodType = "ussd" | "redirect";

const OPERATORS: Record<string, {
  name: string; full: string; bg: string; text: string; border: string; initials: string;
  method: MethodType; methodLabel: string;
}> = {
  mtn:    { name: "MTN",     full: "MTN Mobile Money",  bg: "#FFCC00", text: "#1a1a1a", border: "#e6b800", initials: "MTN", method: "ussd",     methodLabel: "USSD Push" },
  moov:   { name: "Moov",    full: "Moov Money",        bg: "#005BAA", text: "#fff",    border: "#004d99", initials: "MV",  method: "ussd",     methodLabel: "USSD Push" },
  orange: { name: "Orange",  full: "Orange Money",      bg: "#FF6600", text: "#fff",    border: "#e55c00", initials: "OM",  method: "ussd",     methodLabel: "USSD Push" },
  wave:   { name: "Wave",    full: "Wave",              bg: "#1B6FEE", text: "#fff",    border: "#1560d4", initials: "W",   method: "redirect", methodLabel: "Redirection Wave" },
  tmoney: { name: "T-Money", full: "T-Money",           bg: "#C8102E", text: "#fff",    border: "#a50d25", initials: "TM",  method: "ussd",     methodLabel: "USSD Push" },
  free:   { name: "Free",    full: "Free Money",        bg: "#00923F", text: "#fff",    border: "#007a34", initials: "FM",  method: "ussd",     methodLabel: "USSD Push" },
  airtel: { name: "Airtel",  full: "Airtel Money",      bg: "#E40000", text: "#fff",    border: "#c20000", initials: "AM",  method: "ussd",     methodLabel: "USSD Push" },
};

const METHOD_INFO: Record<MethodType, { icon: string; color: string; bg: string; border: string }> = {
  ussd:     { icon: "📱", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  redirect: { icon: "↗️", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
};

// ─── Composants visuels ───────────────────────────────────────────────────────
function UpayHeader({ amount }: { amount: string }) {
  return (
    <div className="bg-gradient-to-br from-[#0f2460] to-[#1a3a8f] text-white px-5 pt-6 pb-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <img src={sikaLogo} alt="Sika Services" className="w-11 h-11 rounded-2xl object-cover shadow-lg border-2 border-white/20" />
          <div>
            <p className="text-[10px] text-blue-300 uppercase tracking-[0.2em] font-bold">Sika Services</p>
            <p className="font-black text-lg leading-tight">SIKA TEXTE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center">
            <ShieldCheck size={15} className="text-blue-200" />
          </div>
          <Link href="/withdrawal">
            <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-1.5 text-xs font-semibold text-white/80">
              <ArrowLeft size={13} /> Retour
            </button>
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] text-blue-300 uppercase tracking-widest font-bold">Upay · Paiement sécurisé</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <p className="text-blue-200 text-xs font-semibold mb-1 uppercase tracking-wider">Frais d'activation</p>
      <div className="flex items-end gap-1">
        <span className="text-5xl font-black">{amount}</span>
        <span className="text-xl font-bold text-blue-300 mb-1">FCFA</span>
      </div>
    </div>
  );
}

function StepIndicator({ step, manual }: { step: 1 | 2 | 3; manual?: boolean }) {
  const steps = manual
    ? [{ n: 1 as const, label: "Coordonnées" }, { n: 2 as const, label: "Dépôt" }, { n: 3 as const, label: "Confirmation" }]
    : [{ n: 1 as const, label: "Coordonnées" }, { n: 3 as const, label: "Confirmation" }];
  return (
    <div className="flex items-center justify-center gap-2 py-4 bg-white border-b border-gray-100">
      {steps.map(({ n, label }, i) => (
        <div key={n} className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step >= n ? "bg-blue-700 text-white shadow-md" : "bg-gray-200 text-gray-500"
          }`}>{step > n ? <CheckCircle size={14} /> : i + 1}</div>
          <span className={`text-xs font-semibold ${step >= n ? "text-blue-700" : "text-gray-400"}`}>{label}</span>
          {i < steps.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
        </div>
      ))}
    </div>
  );
}

function OperatorLogo({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
  const op = OPERATORS[code];
  if (!op) return null;
  const sizes = { sm: "w-10 h-10 text-xs", md: "w-14 h-14 text-sm", lg: "w-16 h-16 text-base" };
  return (
    <div
      className={`${sizes[size]} rounded-2xl flex items-center justify-center font-black shadow-sm border-2 flex-shrink-0`}
      style={{ backgroundColor: op.bg, color: op.text, borderColor: op.border }}
    >
      {op.initials}
    </div>
  );
}

function MethodBadge({ method }: { method: MethodType }) {
  const info = METHOD_INFO[method];
  const labels: Record<MethodType, string> = { ussd: "USSD Push", redirect: "Redirection" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${info.color} ${info.bg} ${info.border}`}>
      {info.icon} {labels[method]}
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

function CountdownCircle({ createdAt }: { createdAt: string }) {
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress] = useState(1);
  useEffect(() => {
    const deadline = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, deadline - now);
      setRemaining(diff);
      setProgress(diff / (24 * 60 * 60 * 1000));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [createdAt]);
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const R = 52;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(1, Math.max(0, progress)));
  const expired = remaining === 0;
  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg width="144" height="144" className="-rotate-90 absolute inset-0">
        <circle cx="72" cy="72" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="72" cy="72" r={R} fill="none"
          stroke={expired ? "#ef4444" : "url(#timerGrad)"}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <defs>
          <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        {expired ? (
          <span className="text-red-400 text-xs font-bold">Expiré</span>
        ) : (
          <>
            <span className="text-white font-black text-xl font-mono tracking-tight leading-none">
              {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </span>
            <span className="text-white/35 text-[10px] mt-1 font-semibold uppercase tracking-wider">restant</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Activation() {
  const { toast } = useToast();

  const { data: activationStatus, refetch: refetchStatus } = useQuery({ queryKey: ["/api/activation/status"] }) as any;
  const { data: paymentInfo } = useQuery({ queryKey: ["/api/activation/payment-info"] }) as any;

  const [step, setStep]         = useState<1 | 2 | 3>(1);
  const [country, setCountry]   = useState("");
  const [operator, setOperator] = useState("");
  const [phone, setPhone]       = useState("");

  // Manual activation state
  const [depositInfo, setDepositInfo]         = useState<{ enabled: boolean; depositNumber: string; activationAmount: number; isInternational: boolean; alertText: string; depositLabel: string; instruction: string; showInstruction: boolean } | null>(null);
  const [depositLoading, setDepositLoading]   = useState(false);
  const [payerName, setPayerName]             = useState("");
  const [transactionId2, setTransactionId2]   = useState("");
  const [screenshotFile, setScreenshotFile]   = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualSubmitted, setManualSubmitted]   = useState(false);
  const [pendingCreatedAt, setPendingCreatedAt] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote]       = useState<string | null>(null);
  const [statusChecking, setStatusChecking]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SolvexPay state
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

  const phonePlaceholder = country === "BJ"
    ? "01 23 45 67 89"
    : country === "CM"
      ? "6 12 34 56 78"
      : country === "CI"
        ? "05 12 34 56 78"
        : "01 23 45 67";

  // Mode CI (compat)
  const ciMode: "redirect" | "manual" | "solvexpay" = paymentInfo?.ciMode ?? "redirect";
  const ciRedirectUrl = paymentInfo?.ciRedirectUrl || "https://clp.ci/ETPXwo";

  // Mode dynamique par pays
  type PayMode = "manual" | "redirect" | "solvexpay";
  const countryModes: Record<string, { mode: PayMode; redirectUrl: string }> = paymentInfo?.countryModes ?? {};
  const getCountryMode = (c: string): PayMode => {
    if (c === "CI") return ciMode;
    return countryModes[c]?.mode ?? "manual";
  };
  const getCountryRedirectUrl = (c: string): string => {
    if (c === "CI") return ciRedirectUrl;
    return countryModes[c]?.redirectUrl || "";
  };

  // CI compat flag
  const isCiManual = country === "CI" && ciMode === "redirect";
  // Un pays utilise le dépôt manuel si son mode est "manual"
  const isManualCountry = (c: string) => getCountryMode(c) === "manual";
  // Un pays utilise la redirection
  const isRedirectCountry = (c: string) => getCountryMode(c) === "redirect";

  // Fetch deposit info when entering step 2 manual
  useEffect(() => {
    if (step === 2 && country && operator && isManualCountry(country)) {
      setDepositLoading(true);
      fetch(`/api/activation/manual-deposit-info?country=${country}&operator=${operator}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setDepositInfo(d))
        .catch(() => setDepositInfo(null))
        .finally(() => setDepositLoading(false));
    }
  }, [step, country, operator]);

  // Screenshot preview
  useEffect(() => {
    if (!screenshotFile) { setScreenshotPreview(null); return; }
    const url = URL.createObjectURL(screenshotFile);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

  // Auto-polling du statut quand demande en attente
  useEffect(() => {
    if (!manualSubmitted) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/activation/my-pending-request", { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "approved") {
          setManualSubmitted(false);
          refetchStatus();
        } else if (data.status === "rejected") {
          setManualSubmitted(false);
          setRejectionNote(data.adminNote || "");
        }
      } catch {}
    };
    const iv = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [manualSubmitted]);

  // SolvexPay polling
  useEffect(() => {
    if (!transactionId || txStatus === "completed" || txStatus === "failed") return;
    const check = async () => {
      try {
        const res = await fetch(`/api/activation/check-solvexpay/${transactionId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setCheckCount(c => c + 1);
        if (data.status === "completed" || data.activated) {
          setTxStatus("completed"); clearInterval(intervalRef.current!); refetchStatus();
        } else if (data.status === "failed") {
          setTxStatus("failed"); clearInterval(intervalRef.current!);
        }
      } catch {}
    };
    check();
    intervalRef.current = setInterval(check, 5000);
    return () => clearInterval(intervalRef.current!);
  }, [transactionId]);

  // Copy deposit number
  const copyDepositNumber = async () => {
    if (!depositInfo?.depositNumber) return;
    try {
      await navigator.clipboard.writeText(depositInfo.depositNumber);
      toast({ title: "Numéro copié !" });
    } catch {
      toast({ title: "Copié", description: depositInfo.depositNumber });
    }
  };

  // Step 1 → step 2 (manuel) ou step 3 (CI redirect / SolvexPay)
  const handleStep1Continue = () => {
    if (isManualCountry(country)) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  // Submit manual activation
  const handleManualSubmit = async () => {
    if (!payerName.trim() || payerName.trim().length < 3) {
      toast({ title: "Nom requis", description: "Veuillez saisir le nom et prénom réels de la carte SIM de paiement.", variant: "destructive" });
      return;
    }
    if (!transactionId2.trim()) {
      toast({ title: "Champ requis", description: "Veuillez saisir l'ID de transaction.", variant: "destructive" });
      return;
    }
    if (!screenshotFile) {
      toast({ title: "Capture requise", description: "Veuillez joindre la capture d'écran de votre paiement.", variant: "destructive" });
      return;
    }
    setManualSubmitting(true);
    try {
      const form = new FormData();
      form.append("country", country);
      form.append("operator", operator);
      form.append("phone", `+${selectedCountry?.prefix}${phone.replace(/\s/g, "")}`);
      form.append("payerName", payerName.trim());
      form.append("transactionId", transactionId2.trim());
      form.append("screenshot", screenshotFile);

      const res = await fetch("/api/activation/manual-submit", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur de soumission");
      if (data.createdAt) setPendingCreatedAt(new Date(data.createdAt).toISOString());
      else setPendingCreatedAt(new Date().toISOString());
      setManualSubmitted(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setManualSubmitting(false);
    }
  };

  // SolvexPay confirm
  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (isRedirectCountry(country)) {
        const redirectUrl = getCountryRedirectUrl(country);
        // Pour CI : envoyer le récapitulatif au bot Telegram d'abord
        if (country === "CI") {
          const res = await fetch("/api/activation/ci-manual-submit", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, operator, country }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || "Erreur");
          toast({ title: "Récapitulatif envoyé !", description: "Vous allez être redirigé vers la page de paiement." });
          setTimeout(() => { window.location.href = data.paymentUrl || redirectUrl; }, 1200);
        } else {
          // Autres pays en mode redirection : redirection directe
          toast({ title: "Redirection en cours…", description: "Vous allez être redirigé vers la page de paiement." });
          setTimeout(() => { window.location.href = redirectUrl; }, 800);
        }
        return;
      }

      const res = await fetch("/api/activation/init-solvexpay", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, operator, country }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur de paiement");
      if (data.paymentUrl) { window.location.href = data.paymentUrl; return; }
      setTransactionId(data.transactionId);
      setTxStatus("pending");
      toast({ title: "Paiement envoyé !", description: data.message || "Validez sur votre téléphone." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTransactionId(null); setTxStatus(null); setCheckCount(0);
    setStep(1); setPhone(""); setPayerName(""); setTransactionId2(""); setScreenshotFile(null);
    setManualSubmitted(false); setDepositInfo(null);
    setPendingCreatedAt(null); setRejectionNote(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const checkPendingStatus = async () => {
    setStatusChecking(true);
    try {
      const res = await fetch("/api/activation/my-pending-request", { credentials: "include" });
      const data = await res.json();
      if (data.status === "approved") {
        setManualSubmitted(false);
        refetchStatus();
      } else if (data.status === "rejected") {
        setManualSubmitted(false);
        setRejectionNote(data.adminNote || "");
      } else {
        toast({ title: "Toujours en attente", description: "Votre demande est en cours de vérification par nos équipes." });
      }
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de vérifier le statut.", variant: "destructive" });
    } finally {
      setStatusChecking(false);
    }
  };

  // ── Compte déjà activé ────────────────────────────────────────────────────
  if (activationStatus?.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="border-0 shadow-2xl w-full max-w-sm rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#0f2460] to-[#1a3a8f] p-6 flex items-center gap-3">
            <img src={sikaLogo} alt="Sika Services" className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20" />
            <div className="text-white">
              <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">Sika Services</p>
              <p className="font-black text-lg">SIKA TEXTE</p>
            </div>
          </div>
          <CardContent className="p-8 text-center">
            <div className="bg-green-100 w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Compte activé !</h2>
            <p className="text-gray-500 text-sm mb-6">Vous avez accès à toutes les fonctionnalités de la plateforme.</p>
            <Button asChild className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 rounded-xl">
              <Link href="/">Accéder au tableau de bord</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── SolvexPay en cours ────────────────────────────────────────────────────
  if (transactionId && txStatus) {
    const op = selectedOp;
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="border-0 shadow-2xl w-full max-w-sm rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#0f2460] to-[#1a3a8f] p-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={sikaLogo} alt="Sika" className="w-8 h-8 rounded-xl object-cover" />
              <p className="text-white font-bold text-sm">Upay SIKA TEXTE</p>
            </div>
            <OperatorLogo code={operator} size="sm" />
          </div>
          <CardContent className="p-7 space-y-5">
            {txStatus === "pending" && (
              <>
                <div className="text-center space-y-3">
                  <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: op?.bg || "#1B6FEE" }} />
                    <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center bg-white shadow-lg" style={{ borderColor: op?.bg || "#1B6FEE" }}>
                      <Clock size={26} style={{ color: op?.bg || "#1B6FEE" }} />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Confirmation en attente</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Validez <strong>{activationAmount} FCFA</strong> sur le <strong>{op?.full}</strong>
                    </p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2 text-sm text-blue-900">
                  <p className="font-semibold text-blue-800 mb-1">Que faire maintenant ?</p>
                  <div className="flex gap-2"><span>📱</span><span>Une notification USSD a été envoyée sur votre téléphone</span></div>
                  <div className="flex gap-2"><span>✅</span><span>Confirmez le paiement dès que vous le recevez</span></div>
                  <div className="flex gap-2"><span>🔄</span><span>Vérification automatique toutes les 5 secondes</span></div>
                  <p className="text-xs text-blue-400 pt-1 text-right">Tentative #{checkCount + 1}…</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" /> Actualisation en cours…
                </div>
              </>
            )}
            {txStatus === "completed" && (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={40} />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-2xl">Paiement confirmé !</p>
                  <p className="text-gray-500 text-sm mt-1">Votre compte est maintenant actif.</p>
                </div>
                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl">
                  <Link href="/">Accéder au tableau de bord</Link>
                </Button>
              </div>
            )}
            {txStatus === "failed" && (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-red-100 mx-auto flex items-center justify-center">
                  <XCircle className="text-red-600" size={40} />
                </div>
                <div>
                  <p className="font-bold text-red-800 text-xl">Paiement échoué</p>
                  <p className="text-gray-500 text-sm mt-1">Vérifiez votre solde et réessayez.</p>
                </div>
                <Button onClick={handleReset} variant="outline" className="w-full rounded-xl py-3 font-semibold border-2">
                  <RefreshCw size={14} className="mr-2" /> Réessayer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── DEMANDE REJETÉE ───────────────────────────────────────────────────────
  if (rejectionNote !== null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-5"
        style={{ background: "linear-gradient(160deg, #1a0608 0%, #2d0a0e 60%, #1a0608 100%)" }}>
        <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <img src={sikaLogo} alt="Sika" className="w-9 h-9 rounded-xl object-cover border border-white/15" />
            <div>
              <p className="text-[9px] text-red-400 uppercase tracking-[0.2em] font-bold">Sika Services</p>
              <p className="font-black text-white text-sm leading-tight">SIKA TEXTE</p>
            </div>
          </div>
          <div className="text-center mb-8">
            <div className="relative w-24 h-24 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600/40 to-rose-700/40 border border-red-500/40 flex items-center justify-center mx-auto">
                <XCircle size={44} className="text-red-400" />
              </div>
            </div>
            <h1 className="text-white font-black text-2xl mb-2">Demande rejetée</h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Votre demande d'activation n'a pas été validée par nos équipes.
            </p>
          </div>
          {rejectionNote && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-5">
              <p className="text-red-300/60 text-[10px] uppercase tracking-wider font-bold mb-1">Motif</p>
              <p className="text-red-200 text-sm leading-relaxed">{rejectionNote}</p>
            </div>
          )}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-2">
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Que faire ?</p>
            <div className="flex gap-3 text-sm text-white/60"><span>🔄</span><span>Vérifiez votre paiement et réessayez</span></div>
            <div className="flex gap-3 text-sm text-white/60"><span>📸</span><span>Assurez-vous que la capture est lisible</span></div>
            <div className="flex gap-3 text-sm text-white/60"><span>💬</span><span>Contactez l'assistance si nécessaire</span></div>
          </div>
          <Button
            onClick={handleReset}
            className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 mb-3"
            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff" }}
          >
            <RefreshCw size={16} /> Soumettre une nouvelle demande
          </Button>
          <Button asChild variant="ghost" className="w-full text-sm text-white/30 hover:text-white/60">
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── DEMANDE MANUELLE SOUMISE (attente admin) ──────────────────────────────
  if (manualSubmitted) {
    return (
      <div className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(160deg, #060c1a 0%, #0d1530 60%, #060c1a 100%)" }}>
        <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>

        {/* Barre du haut */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img src={sikaLogo} alt="Sika" className="w-9 h-9 rounded-xl object-cover border border-white/15" />
            <div>
              <p className="text-[9px] text-blue-400 uppercase tracking-[0.2em] font-bold">Sika Services</p>
              <p className="font-black text-white text-sm leading-tight">SIKA TEXTE</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-400/30 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 text-[11px] font-bold">En vérification</span>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col items-center px-5 py-4 overflow-y-auto">

          {/* Icône centrale animée */}
          <div className="relative mb-5 flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-blue-500/15 animate-ping" style={{ animationDuration: "2.5s" }} />
            <div className="relative w-20 h-20 rounded-full border border-blue-400/30 bg-blue-500/10 flex items-center justify-center">
              <ShieldCheck size={36} className="text-blue-300" />
            </div>
          </div>

          <h1 className="text-white font-black text-2xl text-center mb-1 flex-shrink-0">Vérification en cours</h1>
          <p className="text-white/45 text-sm text-center mb-5 max-w-xs flex-shrink-0">
            Votre demande a bien été reçue et est en cours d'examen par nos agents.
          </p>

          {/* Compte à rebours */}
          {pendingCreatedAt && (
            <div className="flex flex-col items-center mb-5 flex-shrink-0">
              <p className="text-white/25 text-[10px] uppercase tracking-widest font-bold mb-3">Délai maximum de traitement</p>
              <CountdownCircle createdAt={pendingCreatedAt} />
            </div>
          )}

          {/* Badge équipes mobilisées */}
          <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">👥</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold leading-tight">Équipes mobilisées</p>
              <p className="text-white/35 text-xs">Nos agents vérifient votre paiement</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{ animation: `bounce 1.2s ${i * 0.3}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>

          {/* Étapes de vérification */}
          <div className="w-full max-w-sm space-y-2 mb-6 flex-shrink-0">
            {[
              { icon: "✅", label: "Demande envoyée avec succès", state: "done" },
              { icon: "🔍", label: "Vérification du paiement en cours", state: "active" },
              { icon: "🚀", label: "Activation du compte", state: "pending" },
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
                {row.state === "active" && (
                  <Loader2 size={12} className="text-blue-400 animate-spin ml-auto flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Boutons */}
          <div className="w-full max-w-sm space-y-3 flex-shrink-0">
            <Button
              onClick={checkPendingStatus}
              disabled={statusChecking}
              className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-white/15"
              style={{ background: "rgba(255,255,255,0.07)", color: "#fff" }}
            >
              {statusChecking
                ? <><Loader2 size={14} className="animate-spin" /> Vérification…</>
                : <><RefreshCw size={14} /> Actualiser le statut</>
              }
            </Button>
            <Button asChild variant="ghost" className="w-full text-sm text-white/30 hover:text-white/60">
              <Link href="/">Retour à l'accueil</Link>
            </Button>
          </div>
        </div>

        {/* Pied de page */}
        <div className="px-5 pb-6 text-center flex-shrink-0">
          <p className="text-white/18 text-[10px] flex items-center justify-center gap-1.5">
            <ShieldCheck size={9} /> Vérification sécurisée · Mise à jour automatique toutes les 30 s
          </p>
        </div>
      </div>
    );
  }

  // ── ÉTAPE 1 : Coordonnées ─────────────────────────────────────────────────
  if (step === 1) {
    const canContinue = country && operator && phone.replace(/\D/g, "").length >= 6
      && !isOpMaintenance(country, operator);
    return (
      <div className="min-h-screen bg-gray-50">
        <UpayHeader amount={activationAmount} />
        <div className="-mt-0 bg-gray-50 overflow-hidden">
          <StepIndicator step={1} manual={isManualCountry(country)} />
          <div className="px-5 pt-4 pb-60 space-y-5 max-w-md mx-auto">

            {/* Sélection pays */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                <Globe size={13} /> Pays
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COUNTRIES.map(c => (
                  <button
                    key={c.code}
                    onClick={() => { setCountry(c.code); setOperator(""); }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all ${
                      country === c.code ? "border-blue-700 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold leading-tight truncate ${country === c.code ? "text-blue-800" : "text-gray-700"}`}>{c.name}</p>
                      <p className="text-[10px] text-gray-400">+{c.prefix}</p>
                    </div>
                    {country === c.code && <CheckCircle size={14} className="text-blue-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélection opérateur */}
            {selectedCountry && (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                  Réseau Mobile Money
                </label>
                <div className="space-y-2">
                  {selectedCountry.operators.map(op => {
                    const info = OPERATORS[op];
                    const selected = operator === op;
                    const inMaintenance = isOpMaintenance(country, op);
                    return (
                      <div
                        key={op}
                        onClick={() => { if (!inMaintenance) setOperator(op); }}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all select-none ${
                          inMaintenance ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                            : selected ? "border-blue-700 bg-blue-50 shadow-sm cursor-pointer"
                            : "border-gray-200 bg-white hover:border-gray-300 cursor-pointer"
                        }`}
                      >
                        <div className={inMaintenance ? "grayscale" : ""}><OperatorLogo code={op} size="sm" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-bold ${inMaintenance ? "text-gray-400" : selected ? "text-blue-900" : "text-gray-800"}`}>{info.name}</p>
                            {inMaintenance && <MaintenanceBadge />}
                          </div>
                          <p className="text-[11px] text-gray-400 mb-1">{info.full}</p>
                          {!inMaintenance && <div className="flex items-center gap-1.5 flex-wrap"><MethodBadge method={info.method} /></div>}
                          {inMaintenance && <p className="text-[10px] text-red-400 font-semibold mt-0.5">Indisponible — en maintenance</p>}
                        </div>
                        {selected && !inMaintenance && <CheckCircle size={16} className="text-blue-600 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Note Wave */}
            {isWave && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex gap-3">
                <ExternalLink size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-indigo-800">
                  <p className="font-bold mb-0.5">Paiement Wave</p>
                  <p className="text-xs">Vous serez redirigé vers la page de paiement Wave pour finaliser votre transaction.</p>
                </div>
              </div>
            )}

            {/* Numéro de paiement */}
            {operator && (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                  <Phone size={13} /> Numéro de paiement
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center bg-white border-2 border-gray-200 rounded-xl px-3 text-sm font-bold text-gray-600 whitespace-nowrap">
                    +{selectedCountry?.prefix}
                  </div>
                  <Input
                    type="tel" inputMode="numeric"
                    placeholder={`Ex : ${phonePlaceholder}`}
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                    className="flex-1 rounded-xl border-2 border-gray-200 focus:border-blue-600 py-3 text-base font-semibold"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 pl-1">Entrez votre numéro local (sans l'indicatif pays)</p>
              </div>
            )}

            {/* Maintenance warning */}
            {operator && isOpMaintenance(country, operator) && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex gap-3">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-800">
                  <p className="font-bold mb-0.5">⚠ {selectedOp?.name} — En maintenance</p>
                  <p>SolvexPay signale une maintenance sur cet opérateur. Le paiement peut échouer ou être retardé.</p>
                </div>
              </div>
            )}

            {/* Note dépôt manuel */}
            {country && operator && isManualCountry(country) && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex gap-3">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  L'activation pour <strong>{selectedCountry?.name}</strong> se fait par <strong>dépôt manuel</strong>. À l'étape suivante, vous recevrez un numéro de dépôt et devrez soumettre votre preuve de paiement.
                </p>
              </div>
            )}

            {/* Note redirection */}
            {country && operator && isRedirectCountry(country) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex gap-3">
                <ExternalLink size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-800">
                  Vous serez redirigé vers la <strong>page de paiement sécurisée</strong> de votre opérateur pour finaliser l'activation.
                </p>
              </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg max-w-md mx-auto">
              <Button
                onClick={handleStep1Continue}
                disabled={!canContinue}
                className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-base shadow-xl flex items-center justify-center gap-2"
              >
                Continuer <ChevronRight size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ÉTAPE 2 : Dépôt manuel ────────────────────────────────────────────────
  if (step === 2) {
    const canSubmit = transactionId2.trim().length >= 3;
    const opInfo = selectedOp;
    const fullPhone = `+${selectedCountry?.prefix}${phone.replace(/\s/g, "")}`;

    return (
      <div className="min-h-screen bg-gray-50">
        <UpayHeader amount={activationAmount} />
        <div className="bg-gray-50 overflow-hidden">
          <StepIndicator step={2} manual={true} />
          <div className="px-5 pt-4 pb-60 space-y-4 max-w-md mx-auto">

            {/* Back button */}
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-blue-700 text-sm font-semibold">
              <ChevronLeft size={16} /> Modifier les coordonnées
            </button>

            {depositLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 size={28} className="animate-spin" />
              </div>
            ) : depositInfo ? (
              <>
                {/* Alerte transfert international */}
                {depositInfo.isInternational && operator !== 'wave' && (
                  <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-black text-base mb-1 text-green-700">⚠️ Transfert INTERNATIONAL requis</p>
                      <p className="leading-relaxed">
                        {depositInfo.alertText || <>Effectuez un <strong>transfert international</strong> sur ce numéro {opInfo?.name}.</>}
                      </p>
                    </div>
                  </div>
                )}

                {/* Numéro de dépôt */}
                <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                  <div className="px-5 py-4 bg-white border-b border-gray-100">
                    <p className="font-bold text-gray-800 text-base">
                      {depositInfo.depositLabel || (operator === 'wave' ? 'Numéro WAVE' : `Numéro de dépôt ${opInfo?.name}`)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Effectuez votre paiement sur ce numéro</p>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-semibold mb-0.5">Numéro {opInfo?.name}</p>
                        <p className="text-2xl font-black text-gray-900 tracking-wider font-mono">
                          {depositInfo.depositNumber || "Non configuré"}
                        </p>
                      </div>
                      {depositInfo.depositNumber && (
                        <button
                          onClick={copyDepositNumber}
                          className="flex items-center gap-1.5 bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-blue-800 transition-colors flex-shrink-0"
                        >
                          <Copy size={14} /> Copier
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm text-gray-500">Montant exact à envoyer</span>
                      <span className="text-xl font-black text-blue-800">
                        {depositInfo.activationAmount?.toLocaleString("fr-FR")} <span className="text-sm font-bold text-blue-400">FCFA</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm text-gray-500">Votre numéro</span>
                      <span className="font-bold text-gray-700 font-mono text-sm">{fullPhone}</span>
                    </div>
                  </CardContent>
                </Card>


                {/* Instruction personnalisée (si activée par l'admin) */}
                {depositInfo.showInstruction && depositInfo.instruction && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
                    <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800 whitespace-pre-line">{depositInfo.instruction}</p>
                  </div>
                )}

                {/* Activation directe — note importante */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3">
                  <CheckCircle size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-900">
                    <p className="font-bold mb-1">⚡ Activation automatique</p>
                    <p className="leading-relaxed">
                      Votre compte sera <strong>activé immédiatement</strong> si :
                    </p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-emerald-800">
                      <li>la transaction est effectuée (en temps réel) ;</li>
                      <li>les informations saisies sont correctes (ID transaction, capture, numéro).</li>
                    </ul>
                  </div>
                </div>

                {/* Formulaire */}
                <div className="space-y-4">
                  {/* Nom & prénom du payeur (carte SIM) */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Nom et prénom du payeur <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Ex : KOUASSI Jean"
                      value={payerName}
                      onChange={e => setPayerName(e.target.value)}
                      className="rounded-xl border-2 border-gray-200 focus:border-blue-600 py-3 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1 pl-1">
                      Saisissez le <strong>vrai nom et prénom</strong> de la carte SIM utilisée pour le paiement.
                    </p>
                  </div>

                  {/* ID Transaction */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      ID de transaction <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Ex : TXN1234567890"
                      value={transactionId2}
                      onChange={e => setTransactionId2(e.target.value)}
                      className="rounded-xl border-2 border-gray-200 focus:border-blue-600 py-3 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1 pl-1">Copiez l'ID reçu par SMS après votre paiement</p>
                  </div>

                  {/* Capture d'écran */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      <ImageIcon size={13} /> Capture d'écran du paiement <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) setScreenshotFile(f);
                      }}
                    />
                    {screenshotPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-blue-200">
                        <img src={screenshotPreview} alt="Capture" className="w-full max-h-48 object-contain bg-gray-50" />
                        <button
                          onClick={() => { setScreenshotFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                      >
                        <Upload size={24} />
                        <p className="text-sm font-semibold">Appuyez pour ajouter une capture</p>
                        <p className="text-xs">JPG, PNG — Max 10 Mo</p>
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center text-red-700 text-sm">
                Impossible de charger les informations de dépôt. Veuillez réessayer.
              </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg max-w-md mx-auto">
              <div className="px-4 pt-3 pb-1 space-y-1.5">
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex gap-2">
                  <AlertCircle size={13} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700 leading-snug">
                    <strong>Important :</strong> Toute annulation de paiement après soumission est synonyme de bannissement définitif du compte et de l'adresse IP.
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex gap-2">
                  <AlertCircle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 leading-snug">
                    Nos équipes sont mobilisées. Veuillez patienter après chaque paiement afin que le service puisse traiter votre requête.
                  </p>
                </div>
              </div>
              <div className="px-4 pt-2 pb-4">
                <Button
                  onClick={handleManualSubmit}
                  disabled={!canSubmit || manualSubmitting || depositLoading || !depositInfo}
                  className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-base shadow-xl flex items-center justify-center gap-2"
                >
                  {manualSubmitting
                    ? <><Loader2 size={18} className="animate-spin mr-1" />Envoi…</>
                    : <><CheckCircle size={18} className="mr-1" />Soumettre ma demande</>
                  }
                </Button>
                <p className="text-center text-[10px] text-gray-400 mt-2 flex items-center justify-center gap-1">
                  <ShieldCheck size={11} /> Votre demande sera vérifiée sous peu
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ÉTAPE 3 : Récapitulatif & confirmation (CI USSD / SolvexPay) ──────────
  const op = selectedOp;
  const displayMethod: MethodType = op?.method ?? "ussd";
  const phoneDisplay = `+${selectedCountry?.prefix} ${phone}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <UpayHeader amount={activationAmount} />
      {isOpMaintenance(country, operator) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <Wrench size={13} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            <strong>{op?.name}</strong> est en maintenance chez SolvexPay. Le paiement peut être retardé.
          </p>
        </div>
      )}
      <div className="bg-gray-50 overflow-hidden">
        <StepIndicator step={3} manual={false} />
        <div className="px-5 pt-4 pb-60 space-y-4 max-w-md mx-auto">
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
            <div className="px-5 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-gray-800">Récapitulatif du paiement</p>
              <button onClick={() => setStep(1)} className="text-blue-600 text-sm font-semibold flex items-center gap-1 hover:text-blue-700">
                <ChevronLeft size={14} /> Modifier
              </button>
            </div>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <p className="text-sm text-gray-500 font-medium">Montant</p>
                <p className="font-black text-2xl text-blue-900">{activationAmount} <span className="text-base font-bold text-blue-400">FCFA</span></p>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <p className="text-sm text-gray-500 font-medium">Pays</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedCountry?.flag}</span>
                  <p className="font-semibold text-gray-800">{selectedCountry?.name}</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <p className="text-sm text-gray-500 font-medium">Réseau</p>
                <div className="flex items-center gap-2.5">
                  <OperatorLogo code={operator} size="sm" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-gray-800 text-sm">{op?.name}</p>
                      {isOpMaintenance(country, operator) && <MaintenanceBadge />}
                    </div>
                    <p className="text-xs text-gray-400">{op?.full}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <p className="text-sm text-gray-500 font-medium">Numéro</p>
                <p className="font-bold text-gray-800 font-mono">{phoneDisplay}</p>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm text-gray-500 font-medium">Méthode</p>
                <MethodBadge method={displayMethod} />
              </div>
            </CardContent>
          </Card>

          {isWave && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex gap-3">
              <ExternalLink size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-800">
                <strong>Redirection Wave :</strong> Vous serez redirigé vers la page de paiement Wave pour confirmer votre transaction.
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex gap-3">
            <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600">
              {isRedirectCountry(country)
                ? `En confirmant, vous serez redirigé vers la page de paiement sécurisée. Votre compte sera activé après vérification.`
                : isWave
                  ? `En confirmant, vous serez redirigé vers Wave pour payer ${activationAmount} FCFA. Votre compte sera activé automatiquement après validation.`
                  : `En confirmant, une notification USSD sera envoyée au ${phoneDisplay} sur ${op?.full}. Validez-la depuis votre téléphone.`
              }
            </p>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg max-w-md mx-auto">
            <div className="px-4 pt-3 pb-1 space-y-1.5">
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex gap-2">
                <AlertCircle size={13} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-700 leading-snug">
                  <strong>Important :</strong> Toute annulation de paiement après soumission est synonyme de bannissement définitif du compte et de l'adresse IP.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex gap-2">
                <AlertCircle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 leading-snug">
                  Nos équipes sont mobilisées. Veuillez patienter après chaque paiement afin que le service puisse traiter votre requête.
                </p>
              </div>
            </div>
            <div className="px-4 pt-2 pb-4">
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full font-bold py-4 rounded-2xl text-base shadow-xl flex items-center justify-center gap-2"
                style={{ background: loading ? "#9ca3af" : `linear-gradient(135deg, ${op?.bg}, ${op?.border})`, color: op?.text }}
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin mr-1" />Traitement…</>
                  : isRedirectCountry(country)
                    ? <><ExternalLink size={18} className="mr-1" />Confirmer et payer — {activationAmount} FCFA</>
                    : isWave
                      ? <><ExternalLink size={18} className="mr-1" />Payer via Wave — {activationAmount} FCFA</>
                      : <><CheckCircle size={18} className="mr-1" />Confirmer et payer — {activationAmount} FCFA</>
                }
              </Button>
              <p className="text-center text-[10px] text-gray-400 mt-2 flex items-center justify-center gap-1">
                <ShieldCheck size={11} /> Paiement sécurisé · Upay SIKA TEXTE
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
