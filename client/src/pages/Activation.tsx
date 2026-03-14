import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CheckCircle, Loader2, Clock, XCircle, RefreshCw,
  ShieldCheck, ChevronRight, ChevronLeft, Phone, Globe, AlertCircle, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

// ─── Config pays & opérateurs ────────────────────────────────────────────────
const COUNTRIES = [
  { code: "BJ",  name: "Bénin",             flag: "🇧🇯", prefix: "229", operators: ["mtn","moov"] },
  { code: "CI",  name: "Côte d'Ivoire",     flag: "🇨🇮", prefix: "225", operators: ["mtn","moov","orange","wave"] },
  { code: "SN",  name: "Sénégal",           flag: "🇸🇳", prefix: "221", operators: ["orange","wave","free"] },
  { code: "BF",  name: "Burkina Faso",      flag: "🇧🇫", prefix: "226", operators: ["moov","orange"] },
  { code: "TG",  name: "Togo",              flag: "🇹🇬", prefix: "228", operators: ["moov","tmoney"] },
  { code: "CM",  name: "Cameroun",          flag: "🇨🇲", prefix: "237", operators: ["mtn","orange"] },
  { code: "COG", name: "Congo-Brazzaville", flag: "🇨🇬", prefix: "242", operators: ["mtn","airtel"] },
];

const OPERATORS: Record<string, { name: string; full: string; bg: string; text: string; border: string; initials: string }> = {
  mtn:    { name: "MTN",     full: "MTN Mobile Money", bg: "#FFCC00", text: "#1a1a1a", border: "#e6b800", initials: "MTN" },
  moov:   { name: "Moov",    full: "Moov Money",       bg: "#005BAA", text: "#fff",    border: "#004d99", initials: "MV"  },
  orange: { name: "Orange",  full: "Orange Money",     bg: "#FF6600", text: "#fff",    border: "#e55c00", initials: "OM"  },
  wave:   { name: "Wave",    full: "Wave",             bg: "#1B6FEE", text: "#fff",    border: "#1560d4", initials: "W"   },
  tmoney: { name: "T-Money", full: "T-Money",          bg: "#C8102E", text: "#fff",    border: "#a50d25", initials: "TM"  },
  free:   { name: "Free",    full: "Free Money",       bg: "#00923F", text: "#fff",    border: "#007a34", initials: "FM"  },
  airtel: { name: "Airtel",  full: "Airtel Money",     bg: "#E40000", text: "#fff",    border: "#c20000", initials: "AM"  },
};

// ─── Composants visuels ───────────────────────────────────────────────────────
function UpayHeader({ amount }: { amount: string }) {
  return (
    <div className="bg-gradient-to-br from-[#0f2460] to-[#1a3a8f] text-white px-5 pt-8 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shadow-inner">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-[10px] text-blue-300 uppercase tracking-[0.2em] font-bold">Upay</p>
            <p className="font-black text-lg leading-tight">SIKA TEXTE</p>
          </div>
        </div>
        <Link href="/withdrawal">
          <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-1.5 text-xs font-semibold text-white/80">
            <ArrowLeft size={13} /> Retour
          </button>
        </Link>
      </div>
      <p className="text-blue-200 text-xs font-semibold mb-1 uppercase tracking-wider">Frais d'activation</p>
      <div className="flex items-end gap-1">
        <span className="text-5xl font-black">{amount}</span>
        <span className="text-xl font-bold text-blue-300 mb-1">FCFA</span>
      </div>
      <p className="text-blue-300 text-xs mt-1">Paiement unique · Accès définitif</p>
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
      className={`${sizes[size]} rounded-2xl flex items-center justify-center font-black shadow-sm border-2`}
      style={{ backgroundColor: op.bg, color: op.text, borderColor: op.border }}
    >
      {op.initials}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Activation() {
  const { toast } = useToast();

  const { data: activationStatus, refetch: refetchStatus } = useQuery({ queryKey: ["/api/activation/status"] }) as any;
  const { data: paymentInfo } = useQuery({ queryKey: ["/api/activation/payment-info"] }) as any;

  // Étape 1 : formulaire
  const [step, setStep]       = useState<1 | 2>(1);
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [phone, setPhone]     = useState("");
  const [otp, setOtp]         = useState("");

  // Étape 3 : attente USSD
  const [loading, setLoading]             = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [txStatus, setTxStatus]           = useState<"pending" | "completed" | "failed" | null>(null);
  const [checkCount, setCheckCount]       = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedCountry  = COUNTRIES.find(c => c.code === country);
  const requiresOTP      = operator === "orange" && (country === "CI" || country === "SN");
  const otpInstruction   = country === "CI" ? "Composez *144# puis validez" : "Composez *144*82# puis validez";

  const activationAmount = paymentInfo?.activationAmount
    ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR")
    : "3 600";

  // Polling après paiement
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
          <div className="bg-gradient-to-br from-[#0f2460] to-[#1a3a8f] p-6 flex justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="text-white" size={24} />
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

  // ── USSD en cours ─────────────────────────────────────────────────────────
  if (transactionId && txStatus) {
    const op = OPERATORS[operator];
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="border-0 shadow-2xl w-full max-w-sm rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#0f2460] to-[#1a3a8f] p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-white" size={20} />
              <p className="text-white font-bold">Upay SIKA TEXTE</p>
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

  // ── ÉTAPE 1 : Coordonnées de paiement ─────────────────────────────────────
  if (step === 1) {
    const canContinue = country && operator && phone.replace(/\D/g, "").length >= 6 && (!requiresOTP || otp.length >= 4);
    return (
      <div className="min-h-screen bg-gray-50">
        <UpayHeader amount={activationAmount} />
        <div className="-mt-5 rounded-t-3xl bg-gray-50 overflow-hidden">
          <StepIndicator step={1} />
          <div className="px-5 pt-4 pb-24 space-y-5 max-w-md mx-auto">

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
                    <div>
                      <p className={`text-xs font-bold leading-tight ${country === c.code ? "text-blue-800" : "text-gray-700"}`}>{c.name}</p>
                      <p className="text-[10px] text-gray-400">+{c.prefix}</p>
                    </div>
                    {country === c.code && <CheckCircle size={14} className="text-blue-600 ml-auto flex-shrink-0" />}
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
                <div className="grid grid-cols-2 gap-2">
                  {selectedCountry.operators.map(op => {
                    const info = OPERATORS[op];
                    const selected = operator === op;
                    return (
                      <button
                        key={op}
                        onClick={() => { setOperator(op); setOtp(""); }}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                          selected ? "border-blue-700 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <OperatorLogo code={op} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold leading-tight ${selected ? "text-blue-900" : "text-gray-800"}`}>{info?.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{info?.full}</p>
                        </div>
                        {selected && <CheckCircle size={14} className="text-blue-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
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
                    <p className="font-bold mb-0.5">Code OTP requis pour Orange</p>
                    <p className="text-xs">{otpInstruction} pour recevoir votre code à 6 chiffres</p>
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

  // ── ÉTAPE 2 : Récapitulatif & confirmation ─────────────────────────────────
  const op = OPERATORS[operator];
  const phoneDisplay = `+${selectedCountry?.prefix} ${phone}`;
  return (
    <div className="min-h-screen bg-gray-50">
      <UpayHeader amount={activationAmount} />
      <div className="-mt-5 rounded-t-3xl bg-gray-50 overflow-hidden">
        <StepIndicator step={2} />
        <div className="px-5 pt-4 pb-24 space-y-4 max-w-md mx-auto">

          {/* Carte récapitulatif */}
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
            <div className="px-5 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-gray-800">Récapitulatif du paiement</p>
              <button onClick={() => setStep(1)} className="text-blue-600 text-sm font-semibold flex items-center gap-1 hover:text-blue-700">
                <ChevronLeft size={14} /> Modifier
              </button>
            </div>
            <CardContent className="p-0">
              {/* Montant */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <p className="text-sm text-gray-500 font-medium">Montant</p>
                <p className="font-black text-2xl text-blue-900">{activationAmount} <span className="text-base font-bold text-blue-400">FCFA</span></p>
              </div>
              {/* Pays */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <p className="text-sm text-gray-500 font-medium">Pays</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedCountry?.flag}</span>
                  <p className="font-semibold text-gray-800">{selectedCountry?.name}</p>
                </div>
              </div>
              {/* Réseau */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <p className="text-sm text-gray-500 font-medium">Réseau</p>
                <div className="flex items-center gap-2.5">
                  <OperatorLogo code={operator} size="sm" />
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{op?.name}</p>
                    <p className="text-xs text-gray-400">{op?.full}</p>
                  </div>
                </div>
              </div>
              {/* Numéro */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <p className="text-sm text-gray-500 font-medium">Numéro</p>
                <p className="font-bold text-gray-800 font-mono">{phoneDisplay}</p>
              </div>
              {/* Type */}
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm text-gray-500 font-medium">Méthode</p>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">USSD Push</span>
              </div>
            </CardContent>
          </Card>

          {/* Infos */}
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex gap-3">
            <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600">
              En confirmant, une notification USSD sera envoyée sur le <strong>{op?.full}</strong> au <strong>{phoneDisplay}</strong>. 
              Vous devrez la valider depuis votre téléphone.
            </p>
          </div>

          {/* Bouton confirmer */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg max-w-md mx-auto">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full text-white font-bold py-4 rounded-2xl text-base shadow-xl flex items-center justify-center gap-2"
              style={{ background: loading ? "#9ca3af" : `linear-gradient(135deg, ${op?.bg}, ${op?.border})`, color: op?.text }}
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin mr-1" />Traitement…</>
                : <><CheckCircle size={18} className="mr-1" />Confirmer et payer {activationAmount} FCFA</>
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
