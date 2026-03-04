import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Lock, Smartphone, Loader2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useAppSetting } from "@/hooks/useAppSettings";
import { apiRequest } from "@/lib/queryClient";
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
  CI: "Côte d'Ivoire",
  BJ: "Bénin",
  SN: "Sénégal",
  CM: "Cameroun",
  TG: "Togo",
  BF: "Burkina Faso",
  ML: "Mali",
  COD: "RD Congo",
  COG: "Congo",
};

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
  const [paymentSent, setPaymentSent] = useState(false);

  const activationAmount = activationAmountSetting
    ? parseInt(activationAmountSetting).toLocaleString('fr-FR')
    : '3 600';
  const activationAmountRaw = activationAmountSetting || '3600';

  const { data: activationStatus } = useQuery({
    queryKey: ["/api/activation/status"],
  }) as any;

  const solvexpayMutation = useMutation({
    mutationFn: async (data: { phone: string; operator: string; country: string }) =>
      apiRequest("POST", "/api/activation/init-solvexpay", data),
    onSuccess: () => {
      setPaymentSent(true);
      toast({
        title: "Demande envoyée",
        description: "Vérifiez votre téléphone et validez le paiement Mobile Money.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de paiement",
        description: error?.message || "Impossible d'initier le paiement. Vérifiez vos informations.",
        variant: "destructive",
      });
    },
  });

  const handleSolvexPay = () => {
    if (!phone.trim()) {
      toast({ title: "Numéro requis", description: "Veuillez saisir votre numéro de téléphone.", variant: "destructive" });
      return;
    }
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    solvexpayMutation.mutate({ phone: formattedPhone, operator, country });
  };

  const handleBKAPay = () => {
    if (activationLink) window.location.href = activationLink;
  };

  const handleCountryChange = (c: string) => {
    setCountry(c);
    const ops = OPERATORS_BY_COUNTRY[c];
    if (ops && !ops.includes(operator)) setOperator(ops[0]);
  };

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
          <Card className="border-0 shadow-lg bg-white">
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
        {/* Prix */}
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
              {[
                "Accès illimité au travail quotidien",
                "Retraits sans limite",
                "Bonus et récompenses supplémentaires",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SolvexPay */}
        {showSolvexPay && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="text-primary" size={20} />
                Payer via Mobile Money — SolvexPay
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentSent ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center space-y-2">
                  <CheckCircle className="text-green-600 mx-auto" size={36} />
                  <p className="font-semibold text-green-800">Demande envoyée !</p>
                  <p className="text-sm text-green-700">
                    Vérifiez votre téléphone <strong>{phone}</strong> et validez le paiement de <strong>{activationAmount} FCFA</strong> via votre opérateur {operator}.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Votre compte sera activé automatiquement dès confirmation du paiement.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setPaymentSent(false)}
                  >
                    Modifier mes informations
                  </Button>
                </div>
              ) : (
                <>
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
                      {(OPERATORS_BY_COUNTRY[country] || []).map((op) => (
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
                    <span>Vous recevrez une notification sur votre téléphone pour valider le paiement de <strong>{activationAmount} FCFA</strong>.</span>
                  </div>

                  <Button
                    onClick={handleSolvexPay}
                    disabled={solvexpayMutation.isPending}
                    className="w-full bg-gradient-to-r from-primary to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl"
                    data-testid="button-pay-solvexpay"
                  >
                    {solvexpayMutation.isPending ? (
                      <><Loader2 className="animate-spin mr-2" size={16} />Traitement en cours...</>
                    ) : (
                      `Payer ${activationAmount} FCFA via ${operator}`
                    )}
                  </Button>
                </>
              )}
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
              <p className="text-xs text-center text-gray-500 mt-2">
                Vous serez redirigé vers BKAPay pour sécuriser votre paiement
              </p>
            </CardContent>
          </Card>
        )}

        {!showSolvexPay && !showBKAPay && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  ⚠️ Aucune passerelle de paiement n'est configurée. Veuillez contacter le support.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
