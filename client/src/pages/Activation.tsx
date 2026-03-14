import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2, Clock, XCircle, RefreshCw, ShieldCheck, Smartphone, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const OPERATOR_LABELS: Record<string, { name: string; color: string; bg: string }> = {
  mtn:    { name: "MTN Mobile Money",  color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  moov:   { name: "Moov Money",        color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  orange: { name: "Orange Money",      color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  wave:   { name: "Wave",              color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  tmoney: { name: "T-Money",           color: "text-red-700",    bg: "bg-red-50 border-red-200" },
  free:   { name: "Free Money",        color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  airtel: { name: "Airtel Money",      color: "text-red-700",    bg: "bg-red-50 border-red-200" },
};

function UpayLogo() {
  return (
    <div className="flex flex-col items-center pt-6 pb-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
          <ShieldCheck className="text-white" size={20} />
        </div>
        <div className="leading-tight">
          <p className="font-black text-blue-800 text-lg tracking-tight">UPAY</p>
          <p className="font-bold text-blue-500 text-[10px] tracking-widest uppercase">SIKA TEXTE</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 font-medium">Paiement mobile sécurisé</p>
    </div>
  );
}

export default function Activation() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: activationStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/activation/status"],
  }) as any;

  const { data: paymentInfo, isLoading: paymentInfoLoading } = useQuery({
    queryKey: ["/api/activation/payment-info"],
  }) as any;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"pending" | "completed" | "failed" | null>(null);
  const [checkCount, setCheckCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handlePay = async () => {
    setLoading(true);
    try {
      const body: Record<string, any> = {};
      if (otp.trim()) body.otp = otp.trim();

      const res = await fetch("/api/activation/init-solvexpay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur lors de l'initiation du paiement");

      setTransactionId(data.transactionId);
      setTxStatus("pending");
      toast({ title: "Paiement initié !", description: data.message || "Validez sur votre téléphone." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible d'initier le paiement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTransactionId(null);
    setTxStatus(null);
    setCheckCount(0);
    setOtp("");
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const operatorInfo = paymentInfo ? OPERATOR_LABELS[paymentInfo.operator] || { name: paymentInfo.operator?.toUpperCase(), color: "text-gray-700", bg: "bg-gray-50 border-gray-200" } : null;
  const activationAmount = paymentInfo?.activationAmount
    ? parseInt(paymentInfo.activationAmount).toLocaleString('fr-FR')
    : '3 600';

  // Compte déjà activé
  if (activationStatus?.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="border-0 shadow-2xl w-full max-w-sm overflow-hidden rounded-2xl">
          <UpayLogo />
          <CardContent className="px-8 pb-8 text-center">
            <div className="bg-green-100 w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Compte activé !</h2>
            <p className="text-gray-500 text-sm mb-6">Vous avez accès à toutes les fonctionnalités.</p>
            <Button asChild className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl">
              <Link href="/">Retour au tableau de bord</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Écran de paiement en cours (USSD)
  if (transactionId && txStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="border-0 shadow-2xl w-full max-w-sm overflow-hidden rounded-2xl">
          <UpayLogo />
          <CardContent className="px-8 pb-8 space-y-5">
            {txStatus === "pending" && (
              <div className="text-center space-y-4">
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-50" />
                  <div className="w-16 h-16 rounded-full bg-white border-4 border-blue-600 flex items-center justify-center shadow-lg">
                    <Smartphone className="text-blue-600" size={26} />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">En attente de confirmation</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Validez le paiement de <strong>{activationAmount} FCFA</strong> sur votre téléphone.
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 space-y-2 text-left">
                  <p className="font-semibold text-blue-900">Instructions :</p>
                  <p>📱 Une notification USSD a été envoyée</p>
                  <p>✅ Confirmez le paiement sur votre téléphone</p>
                  <p>🔄 Vérification automatique toutes les 5 sec</p>
                  <p className="text-blue-400 pt-1">Tentative #{checkCount + 1}…</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" />
                  Actualisation en cours…
                </div>
              </div>
            )}
            {txStatus === "completed" && (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={40} />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-xl">Paiement confirmé !</p>
                  <p className="text-gray-600 text-sm mt-1">Votre compte est maintenant actif.</p>
                </div>
                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-3">
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
                  <p className="text-gray-600 text-sm mt-1">Vérifiez votre solde Mobile Money et réessayez.</p>
                </div>
                <Button onClick={handleReset} variant="outline" className="w-full rounded-xl py-3 font-semibold">
                  <RefreshCw size={14} className="mr-2" /> Réessayer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Page principale de paiement
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-5 pt-5 pb-8">
        <Link href="/" className="flex items-center gap-2 text-blue-200 hover:text-white text-sm mb-4">
          <ArrowLeft size={16} /> Retour
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold">Upay</p>
            <h1 className="text-xl font-black leading-tight">Activation de compte</h1>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 max-w-md mx-auto space-y-4">
        {/* Carte montant */}
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-5 text-white">
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">Montant à payer</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black">{activationAmount}</span>
              <span className="text-lg font-bold text-blue-200 mb-1">FCFA</span>
            </div>
            <p className="text-blue-200 text-xs mt-1">Paiement unique — activation définitive</p>
          </div>
          <CardContent className="p-4 bg-white space-y-2">
            {[
              "Accès illimité au travail quotidien",
              "Retraits sans limitation",
              "Bonus et récompenses supplémentaires",
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Carte paiement */}
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
              <ShieldCheck size={18} className="text-blue-700" />
              <p className="font-bold text-gray-800">Payer via Mobile Money</p>
            </div>

            {paymentInfoLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-blue-600" size={28} />
              </div>
            ) : !paymentInfo?.hasPhone ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Numéro manquant</p>
                  <p>Ajoutez votre numéro de téléphone dans les <Link href="/settings" className="underline font-semibold">Paramètres</Link> pour continuer.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Numéro et opérateur détectés */}
                <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${operatorInfo?.bg || 'bg-gray-50 border-gray-200'}`}>
                  <Smartphone size={20} className={operatorInfo?.color || 'text-gray-600'} />
                  <div>
                    <p className={`font-bold text-sm ${operatorInfo?.color || 'text-gray-700'}`}>{operatorInfo?.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{paymentInfo?.maskedPhone}</p>
                  </div>
                </div>

                {/* Champ OTP pour Orange CI/SN */}
                {paymentInfo?.requiresOTP && (
                  <div className="space-y-2">
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex gap-2">
                      <AlertCircle size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-800">
                        <span className="font-bold">OTP requis pour Orange — </span>
                        {paymentInfo?.otpInstructions}
                      </p>
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Entrez votre OTP (6 chiffres)"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="rounded-xl text-center text-lg font-bold tracking-widest border-orange-300 focus:border-orange-500"
                    />
                  </div>
                )}

                {/* Bouton payer */}
                <Button
                  onClick={handlePay}
                  disabled={loading || (paymentInfo?.requiresOTP && otp.length < 4)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold py-4 rounded-xl text-base shadow-lg"
                >
                  {loading
                    ? <><Loader2 size={18} className="animate-spin mr-2" />Connexion en cours…</>
                    : <>Payer {activationAmount} FCFA</>
                  }
                </Button>

                <p className="text-center text-xs text-gray-400">
                  Vous recevrez une confirmation USSD sur votre téléphone
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer sécurité */}
        <div className="text-center space-y-1 pb-4">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
            <ShieldCheck size={12} />
            <span>Paiement sécurisé — Upay SIKA TEXTE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
