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
  Clock,
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Plus,
  Edit3
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAppSetting } from "@/hooks/useAppSettings";

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

interface BankCardData {
  id: string;
  firstName: string;
  lastName: string;
  cardNumber: string;
  isDefault: boolean;
}

export default function Withdrawal() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  
  // Récupérer les liens dynamiques depuis les paramètres admin
  const { data: activationLink } = useAppSetting('activation_link');
  const { data: telegramSupervisor } = useAppSetting('telegram_supervisor');

  const { data: withdrawalData } = useQuery<WithdrawalData>({
    queryKey: ['/api/withdrawal'],
  });

  const { data: bankCard, isLoading: isBankCardLoading } = useQuery<BankCardData | null>({
    queryKey: ['/api/bank-card'],
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number }) => {
      const res = await apiRequest('POST', '/api/withdrawal/request', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Demande de retrait envoyée",
        description: "Votre retrait sera traité dans les prochaines minutes",
      });
      setAmount("");
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
    });
  };

  if (!withdrawalData?.isAccountActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-md mx-auto pt-8">
          {/* Back Button */}
          <div className="mb-4">
            <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800">
              <Link href="/" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Retour
              </Link>
            </Button>
          </div>
          
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

                <div className="space-y-4">
                  <Button 
                    data-testid="button-external-payment"
                    asChild
                    size="lg" 
                    className="w-full"
                  >
                    <a 
                      href={activationLink || "https://app.payix.me/payment/32518586-14cc-4a45-877a-758608f969aa"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Payer l'activation en ligne
                    </a>
                  </Button>

                  <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <MessageCircle className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-orange-800 dark:text-orange-200">
                        Besoin d'aide ?
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-3 text-center">
                      Contactez notre superviseur pour assistance
                    </p>
                    <Button 
                      data-testid="button-telegram-contact"
                      asChild
                      variant="outline" 
                      size="sm" 
                      className="w-full border-orange-300 hover:bg-orange-100"
                    >
                      <a 
                        href={
                          telegramSupervisor?.startsWith('@') 
                            ? `https://t.me/${telegramSupervisor.slice(1)}` 
                            : telegramSupervisor?.startsWith('https://') 
                              ? telegramSupervisor 
                              : `https://t.me/${telegramSupervisor || 'SIKAcustomer_service'}`
                        } 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contacter sur Telegram
                      </a>
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                  Après paiement, contactez le superviseur avec votre preuve de paiement pour activation immédiate
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    );
  }

  // Check if user needs to add bank card first
  if (!isBankCardLoading && !bankCard) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="gradient-bg text-primary-foreground">
          <div className="px-6 py-4 flex items-center">
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
              <Link href="/" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="ml-4 text-lg font-semibold">Retrait</h1>
          </div>
        </div>

        <div className="p-6">
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-orange-100 dark:bg-orange-900 p-4 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-4">
                  <CreditCard className="w-10 h-10 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold text-orange-800 dark:text-orange-200 mb-2">
                  Carte bancaire requise
                </h3>
                <p className="text-orange-700 dark:text-orange-300 mb-6">
                  Pour effectuer des retraits, vous devez d'abord enregistrer votre carte bancaire.
                </p>
                
                <Button 
                  asChild
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  data-testid="button-add-bank-card"
                >
                  <Link href="/bank-card">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter ma carte bancaire
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
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
            Retirez vos gains sur votre carte bancaire
          </p>
        </div>

        {/* Bank Card Display */}
        {bankCard && (
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white mb-6">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm opacity-75">Carte enregistrée</p>
                  <p className="font-semibold">{bankCard.firstName} {bankCard.lastName}</p>
                  <p className="text-sm opacity-90">****{bankCard.cardNumber.slice(-4)}</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Link href="/bank-card" data-testid="button-edit-bank-card">
                    <Edit3 className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value > 0 || e.target.value === '') {
                    setAmount(e.target.value);
                  }
                }}
                min="1"
                placeholder={`Min. ${withdrawalData?.minimumWithdrawal || 1000} FCFA`}
              />
            </div>


            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Les retraits sont traités sur votre carte bancaire enregistrée dans les prochaines minutes.
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