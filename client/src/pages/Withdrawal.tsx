import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Smartphone, 
  Shield,
  Banknote,
  Clock
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WithdrawalData {
  balance: number;
  isAccountActive: boolean;
  minimumWithdrawal: number;
  withdrawalHistory: Array<{
    id: string;
    amount: number;
    date: string;
    status: 'pending' | 'completed' | 'failed';
    phoneNumber: string;
  }>;
}

export default function Withdrawal() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showActivationModal, setShowActivationModal] = useState(false);

  const { data: withdrawalData } = useQuery<WithdrawalData>({
    queryKey: ['/api/withdrawal'],
  });

  const activateAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/account/activate', { activationFee: 3600 });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Compte activé ! ✅",
        description: "Votre compte est maintenant actif. Vous pouvez effectuer des retraits.",
      });
      setShowActivationModal(false);
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawal'] });
    },
    onError: () => {
      toast({
        title: "Erreur d'activation",
        description: "Impossible d'activer le compte pour le moment",
        variant: "destructive",
      });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; phoneNumber: string }) => {
      const res = await apiRequest('POST', '/api/withdrawal/request', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Demande de retrait envoyée ! 💸",
        description: "Votre retrait sera traité dans les prochaines minutes",
      });
      setAmount("");
      setPhoneNumber("");
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawal'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de retrait",
        description: error.message || "Impossible de traiter le retrait",
        variant: "destructive",
      });
    },
  });

  const handleWithdraw = () => {
    const withdrawalAmount = parseFloat(amount);
    
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      toast({
        title: "Montant invalide",
        description: "Veuillez saisir un montant valide",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Numéro requis",
        description: "Veuillez saisir votre numéro Mobile Money",
        variant: "destructive",
      });
      return;
    }

    if (withdrawalAmount < (withdrawalData?.minimumWithdrawal || 1000)) {
      toast({
        title: "Montant trop faible",
        description: `Le retrait minimum est de ${withdrawalData?.minimumWithdrawal || 1000} FCFA`,
        variant: "destructive",
      });
      return;
    }

    if (withdrawalAmount > (withdrawalData?.balance || 0)) {
      toast({
        title: "Solde insuffisant",
        description: "Votre solde est insuffisant pour ce retrait",
        variant: "destructive",
      });
      return;
    }

    withdrawMutation.mutate({
      amount: withdrawalAmount,
      phoneNumber: phoneNumber.trim(),
    });
  };

  if (!withdrawalData?.isAccountActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card>
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle className="text-center text-2xl">
                Activation Requise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Pour pouvoir recevoir vos paiements, vous devez d'abord activer votre compte SIKA TEXTE.
                </p>
                
                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important :</strong> Une fois le compte activé, la fonction de retrait par Mobile Money sera automatiquement disponible.
                  </AlertDescription>
                </Alert>

                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Pourquoi activer ?
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-left">
                    <li>✅ Pour que votre compte puisse être actif et accepter les paiements directs</li>
                    <li>✅ Ce statut actif rendra votre compte accessible aux fonctionnalités de retrait</li>
                    <li>✅ Une fois activé, vous recevrez vos gains directement et automatiquement</li>
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Banknote className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      Coût d'activation
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    3 600 FCFA
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                    Paiement unique
                  </p>
                </div>

                <Button 
                  data-testid="button-activate-account"
                  onClick={() => setShowActivationModal(true)}
                  size="lg" 
                  className="w-full"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Activer Mon Compte
                </Button>

                <p className="text-xs text-slate-500 mt-4">
                  Une fois activé, vous pourrez retirer vos gains sur votre numéro Mobile Money configuré
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Activation Confirmation Modal */}
          {showActivationModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-sm">
                <CardHeader>
                  <CardTitle className="text-center">Confirmer l'activation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Vous êtes sur le point d'activer votre compte pour <strong>3 600 FCFA</strong>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Button 
                      data-testid="button-cancel-activation"
                      variant="outline" 
                      onClick={() => setShowActivationModal(false)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button 
                      data-testid="button-confirm-activation"
                      onClick={() => activateAccountMutation.mutate()}
                      disabled={activateAccountMutation.isPending}
                      className="flex-1"
                    >
                      {activateAccountMutation.isPending ? "Activation..." : "Confirmer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md mx-auto pt-8 space-y-6">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Retrait
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Retirez vos gains sur Mobile Money
          </p>
        </div>

        {/* Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-center">Solde disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {withdrawalData?.balance || 0} FCFA
              </div>
              <Badge variant="secondary" className="text-xs">
                Compte Activé ✅
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nouveau retrait</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Montant à retirer (FCFA)
              </label>
              <Input
                data-testid="input-withdrawal-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min. ${withdrawalData?.minimumWithdrawal || 1000} FCFA`}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                <Smartphone className="w-4 h-4 inline mr-1" />
                Numéro Mobile Money
              </label>
              <Input
                data-testid="input-phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ex: +225 XX XX XX XX XX"
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Les retraits sont traités en quelques minutes. Vérifiez que votre numéro Mobile Money est correct.
              </AlertDescription>
            </Alert>

            <Button 
              data-testid="button-request-withdrawal"
              onClick={handleWithdraw}
              disabled={withdrawMutation.isPending}
              className="w-full"
              size="lg"
            >
              {withdrawMutation.isPending ? "Traitement..." : "Demander le retrait"}
            </Button>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des retraits</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawalData?.withdrawalHistory && withdrawalData.withdrawalHistory.length > 0 ? (
              <div className="space-y-3">
                {withdrawalData.withdrawalHistory.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium">{withdrawal.amount} FCFA</p>
                      <p className="text-xs text-slate-500">{withdrawal.phoneNumber}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(withdrawal.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        withdrawal.status === 'completed' ? 'default' :
                        withdrawal.status === 'pending' ? 'secondary' : 'destructive'
                      }
                    >
                      {withdrawal.status === 'completed' ? '✅ Terminé' :
                       withdrawal.status === 'pending' ? '⏳ En cours' : '❌ Échoué'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucun retrait effectué</p>
                <p className="text-xs text-slate-400 mt-1">
                  Vos retraits apparaîtront ici
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}