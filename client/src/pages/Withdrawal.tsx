import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { FaWhatsapp, FaTelegram } from "react-icons/fa";

interface WithdrawalData {
  balance: number;
  isAccountActive: boolean;
  withdrawalHistory: Array<{
    id: string;
    amount: number;
    date: string;
    status: 'pending' | 'completed' | 'failed';
    phoneNumber: string;
    cardFirstName?: string;
    cardLastName?: string;
    cardNumber?: string;
  }>;
}

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
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
  const [showSupervisorDialog, setShowSupervisorDialog] = useState(false);
  
  // Récupérer les liens dynamiques depuis les paramètres admin
  const { data: activationLink } = useAppSetting('activation_link');
  const { data: telegramSupervisor } = useAppSetting('telegram_supervisor');
  const { data: whatsappSupervisor } = useAppSetting('whatsapp_supervisor');

  const { data: withdrawalData } = useQuery<WithdrawalData>({
    queryKey: ['/api/withdrawal'],
  });

  const { data: bankCard, isLoading: isBankCardLoading } = useQuery<BankCardData | null>({
    queryKey: ['/api/bank-card'],
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
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
      <>
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
                      data-testid="button-supervisor-contact"
                      onClick={() => setShowSupervisorDialog(true)}
                      variant="outline" 
                      size="sm" 
                      className="w-full border-orange-300 hover:bg-orange-100"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contacter un superviseur
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Supervisor Contact Dialog */}
      <Dialog open={showSupervisorDialog} onOpenChange={setShowSupervisorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contacter un superviseur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              asChild
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="button-whatsapp-supervisor"
            >
              <a
                href={`https://wa.me/${whatsappSupervisor || '639072914078'}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaWhatsapp className="w-5 h-5 mr-2" />
                Superviseur WhatsApp
              </a>
            </Button>
            <Button
              asChild
              className="w-full bg-blue-500 hover:bg-blue-600"
              data-testid="button-telegram-supervisor"
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
                <FaTelegram className="w-5 h-5 mr-2" />
                Superviseur Telegram
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md mx-auto pt-8 space-y-6">
        
        {/* Back Button */}
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800">
            <Link href="/" data-testid="button-back-withdrawal">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour
            </Link>
          </Button>
        </div>

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

        {/* Notifications */}
        {notifications && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.filter(n => !n.isRead).map((notification) => (
              <Alert key={notification.id} className="border-red-500 bg-red-50 dark:bg-red-950">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <strong>Alerte :</strong> {notification.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

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
                placeholder="Entrez le montant"
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
                      <p className="text-xs text-slate-400">
                        {new Date(withdrawal.date).toLocaleDateString('fr-FR')}
                      </p>
                      {withdrawal.phoneNumber && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                          📱 {withdrawal.phoneNumber}
                        </p>
                      )}
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

        {/* Support Contact */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="p-6">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Vous avez un retrait non reçu ?
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                Contactez notre support technique sur Telegram
              </p>
              <Button 
                asChild
                variant="outline"
                className="w-full border-blue-300 hover:bg-blue-100 dark:border-blue-600 dark:hover:bg-blue-900"
                data-testid="button-contact-support"
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
                  Contacter le support
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}