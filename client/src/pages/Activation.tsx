import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Lock } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Activation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: activationStatus } = useQuery({
    queryKey: ["/api/activation/status"],
  }) as any;

  const initPaymentMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const response = await fetch("/api/activation/init-payment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de l'initiation du paiement");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Redirection vers le paiement",
        description: "Vous allez être redirigé vers BKAPay",
      });
      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'initier le paiement",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  if (activationStatus && activationStatus.isActive) {
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
              <Button 
                asChild
                className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 rounded-xl"
              >
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

      <div className="p-6 max-w-md mx-auto">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="text-primary" size={24} />
              Activez votre compte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-gray-700 mb-2 font-semibold">Montant à payer :</p>
              <div className="text-3xl font-bold text-primary">3 600 FCFA</div>
              <p className="text-xs text-gray-600 mt-2">
                Activez votre compte pour accéder à toutes les fonctionnalités
              </p>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Accès illimité au travail quotidien</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Retraits sans limite</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Bonus et récompenses supplémentaires</span>
              </div>
            </div>

            <Button
              onClick={() => initPaymentMutation.mutate()}
              disabled={initPaymentMutation.isPending || isProcessing}
              className="w-full bg-gradient-to-r from-primary to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl transition-all"
            >
              {initPaymentMutation.isPending || isProcessing 
                ? "Traitement..." 
                : "Payer 3 600 FCFA"}
            </Button>

            <p className="text-xs text-center text-gray-500">
              Vous serez redirigé vers BKAPay pour sécuriser votre paiement
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
