import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, CheckCircle, Lock, Smartphone, Loader2, AlertCircle,
  RefreshCw, XCircle, Clock
} from "lucide-react";
import { Link } from "wouter";
import { useAppSetting } from "@/hooks/useAppSettings";
import { useToast } from "@/hooks/use-toast";

const OPERATORS_BY_COUNTRY: Record<string, string[]> = {
  CI: ["MTN", "ORANGE", "WAVE", "MOOV"],
  BJ: ["MTN", "MOOV"],
  SN: ["ORANGE", "WAVE", "FREE"],
  CM: ["MTN", "ORANGE"],
  TG: ["TMONEY", "MOOV"],
  BF: ["ORANGE", "MOOV"],
  ML: ["ORANGE", "MOOV"],
  COD: ["AIRTEL", "VODACOM"],
  COG: ["MTN", "AIRTEL"],
};

const COUNTRY_LABELS: Record<string, string> = {
  CI: "Côte d'Ivoire", BJ: "Bénin", SN: "Sénégal", CM: "Cameroun",
  TG: "Togo", BF: "Burkina Faso", ML: "Mali", COD: "RD Congo", COG: "Congo",
};

type TxStatus = "pending" | "completed" | "failed" | null;

export default function Activation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: activationLink } = useAppSetting('activation_link');
  const { data: solvexpayEnabled } = useAppSetting('solvexpay_enabled');
  const { data: bkapayEnabled } = useAppSetting('bkapay_enabled');
  const { data: activationAmountSetting } = useAppSetting('activation_amount');

  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("CI");
  const [operator, setOperator] = useState("MTN");
  const [loading, setLoading] = useState(false);

  // Verification state
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>(null);
  const [checkCount, setCheckCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activationAmount = activationAmountSetting
    ? parseInt(activationAmountSetting).toLocaleString('fr-FR')
    : '3 600';

  const { data: activationStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/activation/status"],
  }) as any;

  // Polling when transactionId is set
  useEffect(() => {
    if (!transactionId || txStatus === "completed" || txStatus === "failed") return;

    const check = async () => {
      try {
        const res = await fetch(`/api/activation/check-solvexpay/${transactionId}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setTxStatus(data.status as TxStatus);
        setCheckCount(c => c + 1);
        if (data.status === "completed" || data.activated) {
          setTxStatus("completed");
          clearInterval(intervalRef.current!);
          refetchStatus();
        } else if (data.status === "failed") {
          clearInterval(intervalRef.current!);
        }
      } catch {}
    };

    check();
    intervalRef.current = setInterval(check, 5000);
    return () => clearInterval(intervalRef.current!);
  }, [transactionId]);

  const handleSolvexPay = async () => {
    if (!phone.trim()) {
      toast({ title: "Numéro requis", description: "Veuillez saisir votre numéro de téléphone.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      const res = await fetch("/api/activation/init-solvexpay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone, operator, country }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur lors de la création du paiement");
      setTransactionId(data.transactionId);
      setTxStatus("pending");
      toast({ title: "USSD envoyé !", description: "Vérifiez votre téléphone et validez le paiement." });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible d'initier le paiement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBKAPay = () => {
    if (activationLink) window.location.href = activationLink;
  };

  const handleCountryChange = (c: string) => {
    setCountry(c);
    const ops = OPERATORS_BY_COUNTRY[c];
    if (ops && !ops.includes(operator)) setOperator(ops[0]);
  };

  const handleRetry = () => {
    setTransactionId(null);
    setTxStatus(null);
    setCheckCount(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Logo header component
  const Logo = () => (
    <div className="flex flex-col items-center py-5 bg-white border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center">
          <span className="text-white font-black text-xs">ST</span>
        </div>
        <div className="leading-none">
          <p className="font-black text-primary text-base tracking-tight">SIKA TEXTE</p>
          <p className="font-semibold text-blue-700 text-[10px] tracking-widest uppercase">Business</p>
        </div>
      </div>
    </div>
  );

  if (activationStatus?.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
        <div className="gradient-bg text-primary-foreground p-6">
          <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80">
            <ArrowLeft size={20} />
            Retour
          </Link>
          <h1 className="text-2xl font-bold mt-4">Activation de compte</h1>
        </div>
        <div className="p-6 max-w-md mx-auto">
          <Card className="border-0 shadow-lg bg-white overflow-hidden">
            <Logo />
            <CardContent className="p-8 text-center">
              <div className="bg-green-100 w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Compte activé !</h2>
              <p className="text-gray-600 mb-6">
                Votre compte a été activé avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités.
              </p>
              <Button asChild className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 rounded-xl">
                <Link href="/">Retour au tableau de bord</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const showSolvexPay = solvexpayEnabled !== 'false';
  const showBKAPay = bkapayEnabled !== 'false' && activationLink && activationLink !== 'https:/';

  // ──── Verification screen ────
  if (transactionId && txStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
        <div className="gradient-bg text-primary-foreground p-6">
          <button onClick={handleRetry} className="flex items-center gap-2 text-white hover:opacity-80">
            <ArrowLeft size={20} />
            Retour
          </button>
          <h1 className="text-2xl font-bold mt-4">Vérification du paiement</h1>
        </div>
        <div className="p-6 max-w-md mx-auto">
          <Card className="border-0 shadow-lg bg-white overflow-hidden">
            <Logo />
            <CardContent className="p-6 space-y-6">

              {/* Pending */}
              {txStatus === "pending" && (
                <div className="text-center space-y-4">
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-60" />
                    <div className="w-20 h-20 rounded-full bg-blue-50 border-4 border-primary flex items-center justify-center">
                      <Clock className="text-primary" size={36} />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">En attente de confirmation</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Validez le paiement de <strong>{activationAmount} FCFA</strong> sur votre téléphone <strong>{phone}</strong> via <strong>{operator}</strong>
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-1">
                    <p>📱 Une notification USSD a été envoyée sur votre téléphone</p>
                    <p>⏱ Vérification automatique en cours...</p>
                    <p className="text-xs text-blue-500 mt-2">Vérification #{checkCount + 1}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <Loader2 size={14} className="animate-spin" />
                    Actualisation automatique toutes les 5 secondes
                  </div>
                </div>
              )}

              {/* Completed */}
              {txStatus === "completed" && (
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={48} />
                  </div>
                  <div>
                    <p className="font-bold text-green-800 text-xl">Paiement confirmé !</p>
                    <p className="text-gray-600 text-sm mt-1">
                      Votre compte est en cours d'activation. Vous serez redirigé automatiquement.
                    </p>
                  </div>
                  <Button
                    onClick={() => window.location.href = '/'}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl"
                  >
                    Aller au tableau de bord
                  </Button>
                </div>
              )}

              {/* Failed */}
              {txStatus === "failed" && (
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-red-100 mx-auto flex items-center justify-center">
                    <XCircle className="text-red-600" size={48} />
                  </div>
                  <div>
                    <p className="font-bold text-red-800 text-xl">Paiement échoué</p>
                    <p className="text-gray-600 text-sm mt-1">
                      Le paiement n'a pas pu être confirmé. Vérifiez votre solde Mobile Money et réessayez.
                    </p>
                  </div>
                  <Button onClick={handleRetry} className="w-full" variant="outline">
                    <RefreshCw size={16} className="mr-2" />
                    Réessayer
                  </Button>
                </div>
              )}

              {/* Info box */}
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1 border">
                <p><span className="font-medium">Numéro :</span> {phone}</p>
                <p><span className="font-medium">Opérateur :</span> {operator} — {COUNTRY_LABELS[country]}</p>
                <p><span className="font-medium">Montant :</span> {activationAmount} FCFA</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ──── Main payment form ────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
      <div className="gradient-bg text-primary-foreground p-6">
        <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80">
          <ArrowLeft size={20} />
          Retour
        </Link>
        <h1 className="text-2xl font-bold mt-4">Activation de compte</h1>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-4">
        {/* Price info */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="text-primary" size={24} />
              Activez votre compte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-gray-700 mb-1 font-semibold">Coût d'activation :</p>
              <div className="text-3xl font-bold text-primary">{activationAmount} FCFA</div>
              <p className="text-xs text-gray-600 mt-1">Paiement unique</p>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              {["Accès illimité au travail quotidien", "Retraits sans limite", "Bonus et récompenses supplémentaires"].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SolvexPay form */}
        {showSolvexPay && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <Logo />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="text-primary" size={20} />
                Payer via Mobile Money — SolvexPay
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opérateur</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  {(OPERATORS_BY_COUNTRY[country] || []).map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2250700000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Format international, ex: +2250700000000</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-xs text-amber-800">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>Vous recevrez une notification USSD sur votre téléphone pour valider le paiement de <strong>{activationAmount} FCFA</strong>.</span>
              </div>

              <Button
                onClick={handleSolvexPay}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl"
                data-testid="button-pay-solvexpay"
              >
                {loading ? (
                  <><Loader2 className="animate-spin mr-2" size={16} />Traitement en cours...</>
                ) : (
                  `Payer ${activationAmount} FCFA via ${operator}`
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* BKAPay */}
        {showBKAPay && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payer via BKAPay</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleBKAPay}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl"
                data-testid="button-pay-activation"
              >
                Payer {activationAmount} FCFA via BKAPay
              </Button>
            </CardContent>
          </Card>
        )}

        {!showSolvexPay && !showBKAPay && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                <p className="text-sm text-red-700">⚠️ Aucune passerelle de paiement n'est configurée. Veuillez contacter le support.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
