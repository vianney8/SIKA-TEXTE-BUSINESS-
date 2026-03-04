import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Lock, Smartphone, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useAppSetting } from "@/hooks/useAppSettings";

export default function Activation() {
  const { user } = useAuth();

  const { data: activationLink } = useAppSetting('activation_link');
  const { data: solvexpayEnabled } = useAppSetting('solvexpay_enabled');
  const { data: solvexpayName } = useAppSetting('solvexpay_name');
  const { data: solvexpayLink } = useAppSetting('solvexpay_link');
  const { data: bkapayEnabled } = useAppSetting('bkapay_enabled');
  const { data: bkapayName } = useAppSetting('bkapay_name');
  const { data: activationAmountSetting } = useAppSetting('activation_amount');

  const activationAmount = activationAmountSetting
    ? parseInt(activationAmountSetting).toLocaleString('fr-FR')
    : '3 600';

  const { data: activationStatus } = useQuery({
    queryKey: ["/api/activation/status"],
  }) as any;

  const showSolvexPay = solvexpayEnabled !== 'false' && solvexpayLink && solvexpayLink.trim() !== '';
  const showBKAPay = bkapayEnabled !== 'false' && activationLink && activationLink.trim() !== '' && activationLink !== 'https:/';

  // Logo header
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

        {/* SolvexPay — direct redirect */}
        {showSolvexPay && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <Logo />
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="text-primary" size={20} />
                <p className="font-semibold text-gray-800 text-sm">Payer via Mobile Money</p>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Vous serez redirigé vers la page de paiement sécurisée SolvexPay pour régler <strong>{activationAmount} FCFA</strong>.
              </p>
              <Button
                onClick={() => { window.location.href = solvexpayLink!; }}
                className="w-full bg-gradient-to-r from-primary to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                data-testid="button-pay-solvexpay"
              >
                <ExternalLink size={16} />
                {solvexpayName || "Continuer vers SolvexPay"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* BKAPay — direct redirect */}
        {showBKAPay && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-5">
              <Button
                onClick={() => { window.location.href = activationLink!; }}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl"
                data-testid="button-pay-activation"
              >
                {bkapayName || "Payer via BKAPay"}
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
