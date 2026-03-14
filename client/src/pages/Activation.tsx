import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CheckCircle, Loader2, Clock, XCircle, RefreshCw,
  ShieldCheck, ChevronRight, ChevronLeft, Phone, Globe,
  AlertCircle, ArrowLeft, AlertTriangle, ExternalLink, Wrench
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import sikaLogo from "@assets/1764438802465_1773510898637.jpg";

// ─── Config pays & opérateurs ────────────────────────────────────────────────
const COUNTRIES = [
  { code: "BJ",  name: "Bénin",             flag: "🇧🇯", prefix: "229", operators: ["mtn","moov"] },
  { code: "CI",  name: "Côte d'Ivoire",     flag: "🇨🇮", prefix: "225", operators: ["mtn","moov","orange","wave"] },
  { code: "SN",  name: "Sénégal",           flag: "🇸🇳", prefix: "221", operators: ["orange","wave","free"] },
  { code: "BF",  name: "Burkina Faso",      flag: "🇧🇫", prefix: "226", operators: ["moov","orange"] },
  { code: "TG",  name: "Togo",              flag: "🇹🇬", prefix: "228", operators: ["moov","tmoney"] },
  { code: "CM",  name: "Cameroun",          flag: "🇨🇲", prefix: "237", operators: ["mtn","orange"] },
];

type MethodType = "ussd" | "otp" | "redirect";

const OPERATORS: Record<string, {
  name: string; full: string; bg: string; text: string; border: string; initials: string;
  method: MethodType; methodLabel: string;
}> = {
  mtn:    { name: "MTN",     full: "MTN Mobile Money",  bg: "#FFCC00", text: "#1a1a1a", border: "#e6b800", initials: "MTN", method: "ussd",     methodLabel: "USSD Push" },
  moov:   { name: "Moov",    full: "Moov Money",        bg: "#005BAA", text: "#fff",    border: "#004d99", initials: "MV",  method: "ussd",     methodLabel: "USSD Push" },
  orange: { name: "Orange",  full: "Orange Money",      bg: "#FF6600", text: "#fff",    border: "#e55c00", initials: "OM",  method: "otp",      methodLabel: "Code OTP requis" },
  wave:   { name: "Wave",    full: "Wave",              bg: "#1B6FEE", text: "#fff",    border: "#1560d4", initials: "W",   method: "redirect", methodLabel: "Redirection Wave" },
  tmoney: { name: "T-Money", full: "T-Money",           bg: "#C8102E", text: "#fff",    border: "#a50d25", initials: "TM",  method: "ussd",     methodLabel: "USSD Push" },
  free:   { name: "Free",    full: "Free Money",        bg: "#00923F", text: "#fff",    border: "#007a34", initials: "FM",  method: "ussd",     methodLabel: "USSD Push" },
  airtel: { name: "Airtel",  full: "Airtel Money",      bg: "#E40000", text: "#fff",    border: "#c20000", initials: "AM",  method: "ussd",     methodLabel: "USSD Push" },
};

const METHOD_INFO: Record<MethodType, { icon: string; color: string; bg: string; border: string }> = {
  ussd:     { icon: "📱", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  otp:      { icon: "🔐", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  redirect: { icon: "↗️", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
};

// ─── Composants visuels ───────────────────────────────────────────────────────
function UpayHeader({ amount }: { amount: string }) {
  return (
    <div className="bg-gradient-to-br from-[#0f2460] to-[#1a3a8f] text-white px-5 pt-6 pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* SIKA TEXTE logo */}
          <img
            src={sikaLogo}
            alt="Sika Services"
            className="w-11 h-11 rounded-2xl object-cover shadow-lg border-2 border-white/20"
          />
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
      {/* Upay branding */}
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

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 bg-white border-b border-gray-100">
      {[{ n: 1, label: "Coordonnées" }, { n: 2, label: "Confirmation" }].map(({ n, label }) => (
        <div key={n} className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step >= n ? "bg-blue-700 text-white shadow-md" : "bg-gray-200 text-gray-500"
          }`}>{step > n ? <CheckCircle size={14} /> : n}</div>
          <span className={`text-xs font-semibold ${step >= n ? "text-blue-700" : "text-gray-400"}`}>{label}</span>
          {n < 2 && <ChevronRight size={14} className="text-gray-300" />}
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
  const labels: Record<MethodType, string> = {
    ussd: "USSD Push",
    otp: "Code OTP",
    redirect: "Redirection",
  };
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

  const [step, setStep]         = useState<1 | 2>(1);
  const [country, setCountry]   = useState("");
  const [operator, setOperator] = useState("");
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");

  const [loading, setLoading]             = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [txStatus, setTxStatus]           = useState<"pending" | "completed" | "failed" | null>(null);
  const [checkCount, setCheckCount]       = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const selectedOp      = OPERATORS[operator];
  const requiresOTP     = operator === "orange" && (country === "CI" || country === "SN");
  const otpInstruction  = country === "CI" ? "Composez *144# puis validez" : "Composez *144*82# puis validez";
  const isWave          = operator === "wave";

  // Dynamic maintenance map from admin settings
  const maintenanceMap: Record<string, boolean> = paymentInfo?.maintenanceMap ?? {};
  const isOpMaintenance = (c: string, op: string) => maintenanceMap[`${c}_${op}`] === true;

  // Effective method label for orange (depends on country)
  const effectiveMethodLabel = operator === "orange"
    ? (requiresOTP ? "Code OTP requis" : "USSD Push")
    : selectedOp?.methodLabel;

  const activationAmount = paymentInfo?.activationAmount
    ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR")
    : "3 600";

  useEffect(() => {
    if (!transactionId || txStatus === "completed" || txStatus === "failed") return;
    const check = async () => {
      try {
        const res = await fetch(`/api/activation/check-solvexpay/${transactionId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setCheckCount(c => c + 1);
        if (data.status === "completed" || data.activated) {
          setTxStatus("completed");
          clearInterval(intervalRef.current!);
          refetchStatus();
        } else if (data.status === "failed") {
          setTxStatus("failed");
          clearInterval(intervalRef.current!);
        }
      } catch {}
    };
    check();
    intervalRef.current = setInterval(check, 5000);
    return () => clearInterval(intervalRef.current!);
  }, [transactionId]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const body: Record<string, any> = { phone, operator, country };
      if (otp.trim()) body.otp = otp.trim();

      const res = await fetch("/api/activation/init-solvexpay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur de paiement");

      // Wave → redirect to external URL
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

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
    setStep(1); setPhone(""); setOtp("");
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

  // ── USSD / Wave en cours ──────────────────────────────────────────────────
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

  // ── ÉTAPE 1 : Coordonnées ─────────────────────────────────────────────────
  if (step === 1) {
    const canContinue = country && operator && phone.replace(/\D/g, "").length >= 6
      && (!requiresOTP || otp.length >= 4)
      && !isOpMaintenance(country, operator);
    return (
      <div className="min-h-screen bg-gray-50">
        <UpayHeader amount={activationAmount} />

        {/* Bannière maintenance — visible seulement si des opérateurs du pays sélectionné sont en maintenance */}
        {selectedCountry && selectedCountry.operators.some(op => isOpMaintenance(country, op)) && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2">
            <Wrench size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              <strong>⚠ Maintenance :</strong> Certains opérateurs sont temporairement indisponibles pour ce pays.
            </p>
          </div>
        )}

        <div className="-mt-0 bg-gray-50 overflow-hidden">
          <StepIndicator step={1} />
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
                      country === c.code
                        ? "border-blue-700 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300"
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
                    const isOrange = op === "orange";
                    const displayMethod: MethodType = isOrange
                      ? (country === "CI" || country === "SN" ? "otp" : "ussd")
                      : info.method;
                    return (
                      <div
                        key={op}
                        onClick={() => {
                          if (inMaintenance) return;
                          setOperator(op);
                          setOtp("");
                        }}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all select-none ${
                          inMaintenance
                            ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                            : selected
                              ? "border-blue-700 bg-blue-50 shadow-sm cursor-pointer"
                              : "border-gray-200 bg-white hover:border-gray-300 cursor-pointer"
                        }`}
                      >
                        <div className={inMaintenance ? "grayscale" : ""}>
                          <OperatorLogo code={op} size="sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-bold ${inMaintenance ? "text-gray-400" : selected ? "text-blue-900" : "text-gray-800"}`}>
                              {info.name}
                            </p>
                            {inMaintenance && <MaintenanceBadge />}
                          </div>
                          <p className="text-[11px] text-gray-400 mb-1">{info.full}</p>
                          {!inMaintenance && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <MethodBadge method={displayMethod} />
                            </div>
                          )}
                          {inMaintenance && (
                            <p className="text-[10px] text-red-400 font-semibold mt-0.5">Indisponible — en maintenance</p>
                          )}
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
                    type="tel"
                    inputMode="numeric"
                    placeholder="Ex : 01 23 45 67"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                    className="flex-1 rounded-xl border-2 border-gray-200 focus:border-blue-600 py-3 text-base font-semibold"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 pl-1">Entrez votre numéro local (sans l'indicatif pays)</p>
              </div>
            )}

            {/* OTP pour Orange CI/SN */}
            {requiresOTP && (
              <div className="space-y-2">
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 flex gap-3">
                  <AlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-bold mb-0.5">Code OTP requis — Orange Money</p>
                    <p className="text-xs">{otpInstruction} pour recevoir votre code à 6 chiffres avant de payer.</p>
                  </div>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Code OTP (6 chiffres)"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="rounded-xl border-2 border-orange-300 focus:border-orange-500 text-center text-xl font-black tracking-[0.3em] py-3"
                />
              </div>
            )}

            {/* Maintenance warning sur l'opérateur sélectionné */}
            {operator && isOpMaintenance(country, operator) && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex gap-3">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-800">
                  <p className="font-bold mb-0.5">⚠ {selectedOp?.name} — En maintenance</p>
                  <p>SolvexPay signale une maintenance sur cet opérateur. Le paiement peut échouer ou être retardé. Réessayez ultérieurement si nécessaire.</p>
                </div>
              </div>
            )}

            {/* Bouton Continuer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg max-w-md mx-auto">
              <Button
                onClick={() => setStep(2)}
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

  // ── ÉTAPE 2 : Récapitulatif & confirmation ────────────────────────────────
  const op = selectedOp;
  const displayMethod: MethodType = operator === "orange"
    ? (requiresOTP ? "otp" : "ussd") : (op?.method ?? "ussd");
  const phoneDisplay = `+${selectedCountry?.prefix} ${phone}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <UpayHeader amount={activationAmount} />

      {/* Bannière maintenance */}
      {isOpMaintenance(country, operator) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <Wrench size={13} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            <strong>{op?.name}</strong> est en maintenance chez SolvexPay. Le paiement peut être retardé.
          </p>
        </div>
      )}

      <div className="bg-gray-50 overflow-hidden">
        <StepIndicator step={2} />
        <div className="px-5 pt-4 pb-28 space-y-4 max-w-md mx-auto">

          {/* Carte récapitulatif */}
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

          {/* Note Wave */}
          {isWave && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex gap-3">
              <ExternalLink size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-800">
                <strong>Redirection Wave :</strong> Vous serez redirigé vers la page de paiement Wave pour confirmer votre transaction.
              </p>
            </div>
          )}

          {/* Note info générale */}
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex gap-3">
            <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600">
              {isWave
                ? `En confirmant, vous serez redirigé vers Wave pour payer ${activationAmount} FCFA. Votre compte sera activé automatiquement après validation.`
                : `En confirmant, une notification USSD sera envoyée au ${phoneDisplay} sur ${op?.full}. Validez-la depuis votre téléphone.`
              }
            </p>
          </div>

          {/* Bouton confirmer */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg max-w-md mx-auto">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full font-bold py-4 rounded-2xl text-base shadow-xl flex items-center justify-center gap-2"
              style={{ background: loading ? "#9ca3af" : `linear-gradient(135deg, ${op?.bg}, ${op?.border})`, color: op?.text }}
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin mr-1" />Traitement…</>
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
