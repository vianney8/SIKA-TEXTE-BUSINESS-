import { useState, useEffect, useRef } from "react";
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
  ExternalLink,
  MessageCircle,
  Plus,
  Edit3,
  Loader2,
  XCircle,
  RefreshCw
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAppSetting } from "@/hooks/useAppSettings";
import { FaTelegram } from "react-icons/fa";

const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a 
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline font-medium"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

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
  seenAt: string | null;
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
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  // Récupérer les liens dynamiques depuis les paramètres admin
  const { data: activationLink } = useAppSetting('activation_link');
  const { data: telegramSupervisor } = useAppSetting('telegram_supervisor');
  const { data: bkapayEnabled } = useAppSetting('bkapay_enabled');
  const { data: bkapayName } = useAppSetting('bkapay_name');
  const { data: solvexpayEnabled } = useAppSetting('solvexpay_enabled');
  const { data: solvexpayName } = useAppSetting('solvexpay_name');
  const isBkapayActive = bkapayEnabled !== 'false' && !!activationLink && activationLink !== 'h' && activationLink !== '';
  const isSolvexpayActive = solvexpayEnabled !== 'false';

  const { data: withdrawalData, refetch: refetchWithdrawalData } = useQuery<WithdrawalData>({
    queryKey: ['/api/withdrawal'],
  });

  // With direct link payment, just refresh data on mount
  useEffect(() => {
    console.log('[WITHDRAWAL] Component mounted - using direct payment link');
    refetchWithdrawalData();
  }, []);

  const { data: bankCard, isLoading: isBankCardLoading } = useQuery<BankCardData | null>({
    queryKey: ['/api/bank-card'],
  });

  const { data: notifications = [], refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const unseenNotifications = notifications.filter(n => !n.seenAt);
      unseenNotifications.forEach(notification => {
        fetch('/api/notifications/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notificationId: notification.id })
        });
      });
      
      if (unseenNotifications.length > 0) {
        setTimeout(() => {
          refetchNotifications();
        }, 500);
      }
    }
  }, [notifications]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetchNotifications();
    }, 2000);
    return () => clearInterval(interval);
  }, [refetchNotifications]);

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

  // Payment state
  const [isBkapayLoading, setIsBkapayLoading] = useState(false);

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
          refetchWithdrawalData();
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

  const handleSvxReset = () => {
    setSvxTransactionId(null);
    setSvxTxStatus(null);
    setSvxCheckCount(0);
    setSvxRedirecting(false);
    if (svxIntervalRef.current) clearInterval(svxIntervalRef.current);
  };

  // BKAPay payment handler (redirect)
  const handlePayBkapay = () => {
    if (activationLink) window.location.href = activationLink;
  };

  // SolvexPay payment handler — auto from user profile, no form
  const handlePaySolvexpay = async () => {
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
      toast({ title: "USSD envoyé !", description: "Validez le paiement sur votre téléphone." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible d'initier le paiement", variant: "destructive" });
    } finally {
      setSvxLoading(false);
    }
  };

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
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Retrait" backHref="/" />
        <div className="max-w-md mx-auto p-4 pt-6">
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
                    data-testid="button-pay-activation"
                    onClick={() => setShowPaymentDialog(true)}
                    size="lg" 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 text-lg"
                  >
                    <CreditCard className="w-6 h-6 mr-2" />
                    Payer l'activation en ligne
                  </Button>

                  <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <MessageCircle className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-orange-800 dark:text-orange-200">
                        Besoin d'aide ?
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-3 text-center">
                      Si votre compte reste inactif après le paiement, contactez immédiatement le superviseur.
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
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              data-testid="button-telegram-supervisor"
            >
              <a
                href={telegramSupervisor || 'https://t.me/servicepay_support'}
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

      {/* Payment Gateway Selection Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => { setShowPaymentDialog(open); if (!open) setShowSolvexpayForm(false); }}>
        <DialogContent className="p-0 overflow-hidden max-w-sm">
          {/* SIKA TEXTE BUSINESS logo */}
          <div className="flex flex-col items-center py-4 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center">
                <span className="text-white font-black text-xs">ST</span>
              </div>
              <div className="leading-none">
                <p className="font-black text-primary text-sm tracking-tight">SIKA TEXTE</p>
                <p className="font-semibold text-blue-700 text-[9px] tracking-widest uppercase">Business</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <DialogHeader className="mb-3">
              <DialogTitle className="text-center text-sm">
                {svxRedirecting ? "Redirection en cours" : svxTxStatus ? "Vérification du paiement" : "Choisissez votre passerelle"}
              </DialogTitle>
            </DialogHeader>

            {/* Redirect loading */}
            {svxRedirecting ? (
              <div className="text-center space-y-4 py-2">
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-60" />
                  <div className="w-14 h-14 rounded-full bg-blue-50 border-4 border-primary flex items-center justify-center">
                    <Loader2 className="text-primary animate-spin" size={28} />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">Redirection vers SolvexPay</p>
                  <p className="text-gray-500 text-xs mt-1">Vous allez être redirigé vers la page de paiement sécurisée.</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                  Ne fermez pas cette fenêtre.
                </div>
              </div>
            ) : svxTransactionId && svxTxStatus ? (
              /* USSD verification */
              <div className="space-y-4">
                {svxTxStatus === "pending" && (
                  <div className="text-center space-y-3">
                    <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-60" />
                      <div className="w-14 h-14 rounded-full bg-blue-50 border-4 border-primary flex items-center justify-center">
                        <Clock className="text-primary" size={24} />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">En attente de confirmation</p>
                      <p className="text-gray-500 text-xs mt-1">Validez le paiement sur votre téléphone.</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 space-y-1 text-left">
                      <p>📱 Notification USSD envoyée</p>
                      <p>⏱ Vérification automatique toutes les 5 s</p>
                      <p className="text-blue-400">Tentative #{svxCheckCount + 1}</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                      <Loader2 size={12} className="animate-spin" />Actualisation en cours…
                    </div>
                  </div>
                )}
                {svxTxStatus === "completed" && (
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                      <CheckCircle className="text-green-600" size={36} />
                    </div>
                    <div>
                      <p className="font-bold text-green-800 text-lg">Paiement confirmé !</p>
                      <p className="text-gray-600 text-xs mt-1">Votre compte est en cours d'activation.</p>
                    </div>
                    <Button
                      onClick={() => { handleSvxReset(); setShowPaymentDialog(false); refetchWithdrawalData(); }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl"
                    >
                      Fermer
                    </Button>
                  </div>
                )}
                {svxTxStatus === "failed" && (
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center">
                      <XCircle className="text-red-600" size={36} />
                    </div>
                    <div>
                      <p className="font-bold text-red-800 text-lg">Paiement échoué</p>
                      <p className="text-gray-600 text-xs mt-1">Vérifiez votre solde et réessayez.</p>
                    </div>
                    <Button onClick={handleSvxReset} className="w-full" variant="outline">
                      <RefreshCw size={14} className="mr-2" />Réessayer
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Gateway selection */
              <div className="space-y-3">
                {isSolvexpayActive && (
                  <Button
                    data-testid="button-payment-solvexpay"
                    onClick={handlePaySolvexpay}
                    disabled={svxLoading}
                    size="lg"
                    className="w-full bg-gradient-to-r from-primary to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-5"
                  >
                    {svxLoading
                      ? <><Loader2 size={16} className="animate-spin mr-2" />Connexion…</>
                      : <><Smartphone className="w-5 h-5 mr-2" />{solvexpayName || "SolvexPay — Mobile Money"}</>
                    }
                  </Button>
                )}

                {isBkapayActive && (
                  <Button
                    data-testid="button-payment-bkapay"
                    onClick={() => { setShowPaymentDialog(false); handlePayBkapay(); }}
                    disabled={isBkapayLoading}
                    size="lg"
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-5"
                  >
                    {isBkapayLoading ? "Chargement..." : bkapayName || "BKAPay"}
                  </Button>
                )}

                {!isSolvexpayActive && !isBkapayActive && (
                  <div className="text-center py-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-amber-700 font-medium">Aucune passerelle disponible</p>
                      <p className="text-sm text-amber-600 mt-1">Veuillez réessayer plus tard</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Retrait" backHref="/" />
      <div className="max-w-md mx-auto p-4 pb-8 space-y-4">
        {/* Subtitle */}
        <p className="text-sm text-gray-500 text-center pt-2">Retirez vos gains sur votre compte mobile money</p>

        {/* Notifications */}
        {notifications && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications
              .filter(n => {
                if (!n.seenAt) return true;
                const timeSinceSeen = Date.now() - new Date(n.seenAt).getTime();
                return timeSinceSeen < 60000;
              })
              .map((notification) => (
                <Alert key={notification.id} className="border-red-500 bg-red-50 dark:bg-red-950">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    <strong>Alerte :</strong> {renderTextWithLinks(notification.message)}
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
                Contactez notre service client
              </p>
              <div className="space-y-2">
                <Button 
                  asChild
                  variant="outline"
                  className="w-full border-blue-300 hover:bg-blue-100 dark:border-blue-600 dark:hover:bg-blue-900"
                  data-testid="button-contact-telegram"
                >
                  <a 
                    href={telegramSupervisor || 'https://t.me/servicepay_support'}
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <FaTelegram className="w-4 h-4 mr-2" />
                    Service client Telegram
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}