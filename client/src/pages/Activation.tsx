import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Lock, Smartphone, Loader2, Clock, XCircle, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAppSetting } from "@/hooks/useAppSettings";

export default function Activation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();

  const isReturnFromPayment = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('return') === '1';

  const { data: solvexpayEnabled } = useAppSetting('solvexpay_enabled');
  const { data: solvexpayName } = useAppSetting('solvexpay_name');
  const { data: activationAmountSetting } = useAppSetting('activation_amount');

  const activationAmount = activationAmountSetting
    ? parseInt(activationAmountSetting).toLocaleString('fr-FR')
    : '3 600';

  const { data: activationStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/activation/status"],
  }) as any;

  // Return from Wave payment — poll account status
  const [returnPollCount, setReturnPollCount] = useState(0);
  const returnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isReturnFromPayment || activationStatus?.isActive) return;
    const poll = async () => {
      await refetchStatus();
      setReturnPollCount(c => c + 1);
    };
    poll();
    returnIntervalRef.current = setInterval(poll, 3000);
    return () => clearInterval(returnIntervalRef.current!);
  }, [isReturnFromPayment]);

  useEffect(() => {
    if (activationStatus?.isActive && returnIntervalRef.current) {
      clearInterval(returnIntervalRef.current);
    }
  }, [activationStatus?.isActive]);

  // SolvexPay API flow states
  const [svxLoading, setSvxLoading] = useState(false);
  const [svxTransactionId, setSvxTransactionId] = useState<string | null>(null);
  const [svxTxStatus, setSvxTxStatus] = useState<"pending" | "completed" | "failed" | null>(null);
  const [svxCheckCount, setSvxCheckCount] = useState(0);
  const [svxRedirecting, setSvxRedirecting] = useState(false);
  const svxIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll SolvexPay transaction status
  useEffect(() => {
    if (!svxTransactionId || svxTxStatus === "completed" || svxTxStatus === "failed") return;
    const check = async () => {
      try {
        const res = await fetch(`/api/activation/check-solvexpay/${svxTransactionId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setSvxCheckCount(c => c + 1);
        if (data.status === "completed" || data.activated) {
          setSvxTxStatus("completed");
          clearInterval(svxIntervalRef.current!);
          refetchStatus();
        } else if (data.status === "failed") {
          setSvxTxStatus("failed");
          clearInterval(svxIntervalRef.current!);
        }
      } catch {}
    };
    check();
    svxIntervalRef.current = setInterval(check, 5000);
    return () => clearInterval(svxIntervalRef.current!);
  }, [svxTransactionId]);

  const handleSolvexPay = async () => {
    setSvxLoading(true);
    try {
      const res = await fetch("/api/activation/init-solvexpay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur lors de l'initiation du paiement");

      if (data.paymentUrl) {
        setSvxRedirecting(true);
        setTimeout(() => { window.location.href = data.paymentUrl; }, 600);
        return;
      }
      setSvxTransactionId(data.transactionId);
      setSvxTxStatus("pending");
      toast({ title: "USSD envoyé !", description: "Vérifiez votre téléphone et validez le paiement." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible d'initier le paiement", variant: "destructive" });
    } finally {
      setSvxLoading(false);
    }
  };

  const handleReset = () => {
    setSvxTransactionId(null);
    setSvxTxStatus(null);
    setSvxCheckCount(0);
    setSvxRedirecting(false);
    if (svxIntervalRef.current) clearInterval(svxIntervalRef.current);
  };

  const showSolvexPay = solvexpayEnabled !== 'false';

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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="border-0 shadow-xl w-full max-w-sm overflow-hidden">
          <Logo />
          <CardContent className="p-8 text-center">
            <div className="bg-green-100 w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Compte activé !</h2>
            <p className="text-gray-600 mb-6">Votre compte est actif. Vous avez accès à toutes les fonctionnalités.</p>
            <Button asChild className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 rounded-xl">
              <Link href="/">Retour au tableau de bord</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Return from Wave/external payment — waiting for webhook to activate
  if (isReturnFromPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="border-0 shadow-xl w-full max-w-sm overflow-hidden">
          <Logo />
          <CardContent className="p-8 text-center space-y-5">
            {returnPollCount < 20 ? (
              <>
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-60" />
                  <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-primary flex items-center justify-center">
                    <Loader2 className="text-primary animate-spin" size={30} />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">Vérification en cours…</p>
                  <p className="text-gray-500 text-sm mt-1">Votre paiement est en cours de confirmation. Cela peut prendre quelques secondes.</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                  Ne fermez pas cette page. Vérification automatique en cours…
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-amber-100 mx-auto flex items-center justify-center">
                  <Clock className="text-amber-600" size={36} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">Vérification en attente</p>
                  <p className="text-gray-500 text-sm mt-1">Si votre paiement a bien été effectué, votre compte sera activé dans quelques minutes. Revenez vérifier plus tard.</p>
                </div>
                <Button asChild className="w-full bg-primary hover:bg-blue-700 text-white font-semibold rounded-xl">
                  <Link href="/">Retour au tableau de bord</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect loading screen
  if (svxRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="border-0 shadow-xl w-full max-w-sm overflow-hidden">
          <Logo />
          <CardContent className="p-8 text-center space-y-5">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-60" />
              <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-primary flex items-center justify-center">
                <Loader2 className="text-primary animate-spin" size={30} />
              </div>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">Redirection en cours…</p>
              <p className="text-gray-500 text-sm mt-1">Vous allez être redirigé vers la page de paiement sécurisée.</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
              Ne fermez pas cette fenêtre.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // USSD verification screen
  if (svxTransactionId && svxTxStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="border-0 shadow-xl w-full max-w-sm overflow-hidden">
          <Logo />
          <CardContent className="p-8 space-y-5">
            {svxTxStatus === "pending" && (
              <div className="text-center space-y-4">
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-60" />
                  <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-primary flex items-center justify-center">
                    <Clock className="text-primary" size={26} />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">En attente de confirmation</p>
                  <p className="text-gray-500 text-sm mt-1">Validez le paiement de <strong>{activationAmount} FCFA</strong> sur votre téléphone.</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 space-y-1 text-left">
                  <p>📱 Notification USSD envoyée</p>
                  <p>⏱ Vérification automatique toutes les 5 secondes</p>
                  <p className="text-blue-400">Tentative #{svxCheckCount + 1}</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" />
                  Actualisation en cours…
                </div>
              </div>
            )}
            {svxTxStatus === "completed" && (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={40} />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-xl">Paiement confirmé !</p>
                  <p className="text-gray-600 text-sm mt-1">Votre compte est en cours d'activation.</p>
                </div>
                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl">
                  <Link href="/">Retour au tableau de bord</Link>
                </Button>
              </div>
            )}
            {svxTxStatus === "failed" && (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-red-100 mx-auto flex items-center justify-center">
                  <XCircle className="text-red-600" size={40} />
                </div>
                <div>
                  <p className="font-bold text-red-800 text-xl">Paiement échoué</p>
                  <p className="text-gray-600 text-sm mt-1">Vérifiez votre solde et réessayez.</p>
                </div>
                <Button onClick={handleReset} className="w-full" variant="outline">
                  <RefreshCw size={14} className="mr-2" />Réessayer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
      <div className="gradient-bg text-primary-foreground p-6">
        <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80">
          <ArrowLeft size={20} />Retour
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

        {/* SolvexPay — API push */}
        {showSolvexPay && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <Logo />
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="text-primary" size={20} />
                <p className="font-semibold text-gray-800 text-sm">Payer via Mobile Money</p>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Le paiement de <strong>{activationAmount} FCFA</strong> sera envoyé automatiquement sur le numéro associé à votre compte.
              </p>
              <Button
                onClick={handleSolvexPay}
                disabled={svxLoading}
                className="w-full bg-gradient-to-r from-primary to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                data-testid="button-pay-solvexpay"
              >
                {svxLoading
                  ? <><Loader2 size={16} className="animate-spin" />Connexion en cours…</>
                  : solvexpayName || "Payer via SolvexPay"}
              </Button>
            </CardContent>
          </Card>
        )}

        {!showSolvexPay && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                <p className="text-sm text-red-700">⚠️ La passerelle de paiement n'est pas disponible. Veuillez contacter le support.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
