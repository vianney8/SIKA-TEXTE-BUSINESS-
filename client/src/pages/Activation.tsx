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
  const [transactionId2, setTransactionId2]   = useState("");
  const [screenshotFile, setScreenshotFile]   = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualSubmitted, setManualSubmitted]   = useState(false);
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

  // CI manual activation flag
  const isCiManual = country === "CI" && paymentInfo?.ciManualActivation !== false;

  // Determine if current country/operator uses manual activation (non-CI)
  const isManualCountry = (c: string) => c !== "CI";

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

  // Step 1 → step 2 or step 3
  const handleStep1Continue = () => {
    if (country !== "CI" && !isCiManual) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  // Submit manual activation
  const handleManualSubmit = async () => {
    if (!transactionId2.trim()) {
      toast({ title: "Champ requis", description: "Veuillez saisir l'ID de transaction.", variant: "destructive" });
      return;
    }
    setManualSubmitting(true);
    try {
      const form = new FormData();
      form.append("country", country);
      form.append("operator", operator);
      form.append("phone", `+${selectedCountry?.prefix}${phone.replace(/\s/g, "")}`);
      form.append("transactionId", transactionId2.trim());
      if (screenshotFile) form.append("screenshot", screenshotFile);

      const res = await fetch("/api/activation/manual-submit", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur de soumission");
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
      if (isCiManual) {
        const res = await fetch("/api/activation/ci-manual-submit", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, operator, country }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Erreur");
        toast({ title: "Récapitulatif envoyé !", description: "Vous allez être redirigé vers la page de paiement." });
        setTimeout(() => { window.location.href = data.paymentUrl || "https://clp.ci/ETPXwo"; }, 1200);
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
    setStep(1); setPhone(""); setTransactionId2(""); setScreenshotFile(null);
    setManualSubmitted(false); setDepositInfo(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
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

  // ── DEMANDE MANUELLE SOUMISE (attente admin) ──────────────────────────────
  if (manualSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="border-0 shadow-2xl w-full max-w-sm rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#0f2460] to-[#1a3a8f] p-6 flex items-center gap-3">
            <img src={sikaLogo} alt="Sika Services" className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20" />
            <div className="text-white">
              <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">Sika Services</p>
              <p className="font-black text-lg">SIKA TEXTE</p>
            </div>
          </div>
          <CardContent className="p-8 text-center space-y-5">
            <div className="bg-amber-100 w-20 h-20 rounded-full mx-auto flex items-center justify-center">
              <Clock className="text-amber-600" size={40} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée !</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Votre demande d'activation a été transmise à l'administrateur. Votre compte sera activé après vérification du paiement, généralement sous <strong>quelques minutes à quelques heures</strong>.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left space-y-2">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Que faire maintenant ?</p>
              <div className="flex gap-2 text-xs text-blue-700"><span>📱</span><span>Gardez votre téléphone accessible</span></div>
              <div className="flex gap-2 text-xs text-blue-700"><span>✉️</span><span>Vous serez notifié dès l'activation</span></div>
              <div className="flex gap-2 text-xs text-blue-700"><span>🔄</span><span>Revenez sur cette page pour vérifier</span></div>
            </div>
            <Button
              onClick={() => refetchStatus()}
              variant="outline"
              className="w-full rounded-xl py-3 font-semibold border-2 border-blue-200 text-blue-700"
            >
              <RefreshCw size={14} className="mr-2" /> Vérifier l'activation
            </Button>
            <Button asChild variant="ghost" className="w-full text-sm text-gray-500">
              <Link href="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
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
          <div className="px-5 pt-4 pb-28 space-y-5 max-w-md mx-auto">

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

            {/* Note activation manuelle */}
            {country && isManualCountry(country) && operator && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex gap-3">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  L'activation pour <strong>{selectedCountry?.name}</strong> se fait par <strong>dépôt manuel</strong>. À l'étape suivante, vous recevrez un numéro de dépôt et devrez soumettre votre preuve de paiement.
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
          <div className="px-5 pt-4 pb-28 space-y-4 max-w-md mx-auto">

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
                  <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-black text-base mb-1">⚠️ Transfert INTERNATIONAL requis</p>
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

                {/* Formulaire */}
                <div className="space-y-4">
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
                      <ImageIcon size={13} /> Capture d'écran du paiement <span className="text-gray-400">(optionnel)</span>
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

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg max-w-md mx-auto">
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
        <div className="px-5 pt-4 pb-28 space-y-4 max-w-md mx-auto">
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
              {isCiManual
                ? `En confirmant, vous serez redirigé vers la page de paiement. Votre compte sera activé par l'administrateur après vérification.`
                : isWave
                  ? `En confirmant, vous serez redirigé vers Wave pour payer ${activationAmount} FCFA. Votre compte sera activé automatiquement après validation.`
                  : `En confirmant, une notification USSD sera envoyée au ${phoneDisplay} sur ${op?.full}. Validez-la depuis votre téléphone.`
              }
            </p>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg max-w-md mx-auto">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full font-bold py-4 rounded-2xl text-base shadow-xl flex items-center justify-center gap-2"
              style={{ background: loading ? "#9ca3af" : `linear-gradient(135deg, ${op?.bg}, ${op?.border})`, color: op?.text }}
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin mr-1" />Traitement…</>
                : isCiManual
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
  );
}
