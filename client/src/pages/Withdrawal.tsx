import { useState, useEffect } from "react";
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
  Edit3
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
  const { data: lygosEnabled } = useAppSetting('lygos_enabled');
  const { data: leekpayEnabled } = useAppSetting('leekpay_enabled');
  const { data: bkapayName } = useAppSetting('bkapay_name');
  const { data: lygosName } = useAppSetting('lygos_name');
  const { data: leekpayName } = useAppSetting('leekpay_name');
  const { data: solvexpayEnabled } = useAppSetting('solvexpay_enabled');
  const { data: solvexpayName } = useAppSetting('solvexpay_name');
  const { data: sendavapayEnabled } = useAppSetting('sendavapay_enabled');
  const { data: sendavapayName } = useAppSetting('sendavapay_name');
  const isBkapayActive = bkapayEnabled === undefined || bkapayEnabled === '' || bkapayEnabled !== 'false';
  const isLygosActive = lygosEnabled === undefined || lygosEnabled === '' || lygosEnabled !== 'false';
  const isLeekpayActive = leekpayEnabled === undefined || leekpayEnabled === '' || leekpayEnabled !== 'false';
  const isSolvexpayActive = solvexpayEnabled === undefined || solvexpayEnabled === '' || solvexpayEnabled !== 'false';
  const isSendavapayActive = sendavapayEnabled === 'true';

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

  // Payment gateways - Lygos, BKAPay, LeekPay, SolvexPay and SendavaPay
  const [isLygosLoading, setIsLygosLoading] = useState(false);
  const [isBkapayLoading, setIsBkapayLoading] = useState(false);
  const [isLeekpayLoading, setIsLeekpayLoading] = useState(false);
  const [isSolvexpayLoading, setIsSolvexpayLoading] = useState(false);
  const [isSendavapayLoading, setIsSendavapayLoading] = useState(false);
  
  // Lygos payment handler
  const handlePayLygos = async () => {
    setIsLygosLoading(true);
    try {
      console.log('[LYGOS] Initiating activation payment...');
      
      const response = await fetch("/api/activation/init-payment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[LYGOS] Init payment failed:', response.status, errorData);
        throw new Error(errorData.message || "Erreur lors de l'initiation du paiement");
      }
      
      const data = await response.json();
      console.log('[LYGOS] Payment init response:', data);
      
      if (!data.redirectUrl) {
        throw new Error("URL de paiement non reçue");
      }
      
      if (data.reference) {
        localStorage.setItem('pendingActivationRef', data.reference);
        localStorage.setItem('pendingActivationTime', Date.now().toString());
      }
      
      toast({
        title: "Redirection vers Lygos",
        description: `Paiement de ${data.amount} FCFA en cours...`,
      });
      
      window.location.href = data.redirectUrl;
    } catch (error: any) {
      console.error('[LYGOS] Payment error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initier le paiement",
        variant: "destructive",
      });
      setIsLygosLoading(false);
    }
  };

  // BKAPay payment handler
  const handlePayBkapay = async () => {
    setIsBkapayLoading(true);
    try {
      console.log('[BKAPAY] Initiating activation payment...');
      
      const response = await fetch("/api/activation/init-payment-bkapay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[BKAPAY] Init payment failed:', response.status, errorData);
        throw new Error(errorData.message || "Erreur lors de l'initiation du paiement");
      }
      
      const data = await response.json();
      console.log('[BKAPAY] Payment init response:', data);
      
      if (!data.redirectUrl) {
        throw new Error("URL de paiement non reçue");
      }
      
      if (data.reference) {
        localStorage.setItem('pendingActivationRef', data.reference);
        localStorage.setItem('pendingActivationTime', Date.now().toString());
      }
      
      toast({
        title: "Redirection vers BKAPay",
        description: `Paiement de ${data.amount} FCFA en cours...`,
      });
      
      window.location.href = data.redirectUrl;
    } catch (error: any) {
      console.error('[BKAPAY] Payment error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initier le paiement",
        variant: "destructive",
      });
      setIsBkapayLoading(false);
    }
  };

  // LeekPay payment handler
  const handlePayLeekpay = async () => {
    setIsLeekpayLoading(true);
    try {
      console.log('[LEEKPAY] Initiating activation payment...');
      
      const response = await fetch("/api/activation/init-payment-leekpay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[LEEKPAY] Init payment failed:', response.status, errorData);
        throw new Error(errorData.message || "Erreur lors de l'initiation du paiement");
      }
      
      const data = await response.json();
      console.log('[LEEKPAY] Payment init response:', data);
      
      if (!data.redirectUrl) {
        throw new Error("URL de paiement non reçue");
      }
      
      if (data.reference) {
        localStorage.setItem('pendingActivationRef', data.reference);
        localStorage.setItem('pendingActivationTime', Date.now().toString());
      }
      
      toast({
        title: "Redirection vers LeekPay",
        description: `Paiement de ${data.amount} FCFA en cours...`,
      });
      
      window.location.href = data.redirectUrl;
    } catch (error: any) {
      console.error('[LEEKPAY] Payment error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initier le paiement",
        variant: "destructive",
      });
      setIsLeekpayLoading(false);
    }
  };

  // SolvexPay payment handler
  const handlePaySolvexpay = async () => {
    setIsSolvexpayLoading(true);
    try {
      console.log('[SOLVEXPAY] Initiating activation payment...');
      
      const response = await fetch("/api/activation/init-payment-solvexpay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SOLVEXPAY] Init payment failed:', response.status, errorData);
        throw new Error(errorData.message || "Erreur lors de l'initiation du paiement");
      }
      
      const data = await response.json();
      console.log('[SOLVEXPAY] Payment init response:', data);
      
      if (!data.redirectUrl) {
        throw new Error("URL de paiement non reçue");
      }
      
      if (data.reference) {
        localStorage.setItem('pendingActivationRef', data.reference);
        localStorage.setItem('pendingActivationTime', Date.now().toString());
      }
      
      toast({
        title: "Redirection vers SolvexPay",
        description: `Paiement de ${data.amount} FCFA en cours...`,
      });
      
      window.location.href = data.redirectUrl;
    } catch (error: any) {
      console.error('[SOLVEXPAY] Payment error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initier le paiement",
        variant: "destructive",
      });
      setIsSolvexpayLoading(false);
    }
  };

  // SendavaPay payment handler
  const handlePaySendavapay = async () => {
    setIsSendavapayLoading(true);
    try {
      console.log('[SENDAVAPAY] Initiating activation payment...');

      const response = await fetch("/api/activation/init-payment-sendavapay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SENDAVAPAY] Init payment failed:', response.status, errorData);
        throw new Error(errorData.message || "Erreur lors de l'initiation du paiement");
      }

      const data = await response.json();
      console.log('[SENDAVAPAY] Payment init response:', data);

      if (!data.redirectUrl) {
        throw new Error("URL de paiement non reçue");
      }

      if (data.reference) {
        localStorage.setItem('pendingActivationRef', data.reference);
        localStorage.setItem('pendingActivationTime', Date.now().toString());
      }

      toast({
        title: "Redirection vers SendavaPay",
        description: `Paiement de ${data.amount} FCFA en cours...`,
      });

      window.location.href = data.redirectUrl;
    } catch (error: any) {
      console.error('[SENDAVAPAY] Payment error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initier le paiement",
        variant: "destructive",
      });
      setIsSendavapayLoading(false);
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
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">Choisissez votre passerelle de paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {isBkapayActive && (
              <Button 
                data-testid="button-payment-bkapay"
                onClick={() => {
                  setShowPaymentDialog(false);
                  handlePayBkapay();
                }}
                disabled={isLygosLoading || isBkapayLoading || isLeekpayLoading}
                size="lg" 
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-5"
              >
                {isBkapayLoading ? "Chargement..." : bkapayName || "Passerelle 1 - BKAPay"}
              </Button>
            )}
            
            {isLygosActive && (
              <Button 
                data-testid="button-payment-lygos"
                onClick={() => {
                  setShowPaymentDialog(false);
                  handlePayLygos();
                }}
                disabled={isLygosLoading || isBkapayLoading || isLeekpayLoading}
                size="lg" 
                className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold py-5"
              >
                {isLygosLoading ? "Chargement..." : lygosName || "Passerelle 2 - Lygos"}
              </Button>
            )}
            
            {isLeekpayActive && (
              <Button 
                data-testid="button-payment-leekpay"
                onClick={() => {
                  setShowPaymentDialog(false);
                  handlePayLeekpay();
                }}
                disabled={isLygosLoading || isBkapayLoading || isLeekpayLoading || isSolvexpayLoading}
                size="lg" 
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-5"
              >
                {isLeekpayLoading ? "Chargement..." : leekpayName || "Passerelle 3 - LeekPay"}
              </Button>
            )}

            {isSolvexpayActive && (
              <Button 
                data-testid="button-payment-solvexpay"
                onClick={() => {
                  setShowPaymentDialog(false);
                  handlePaySolvexpay();
                }}
                disabled={isLygosLoading || isBkapayLoading || isLeekpayLoading || isSolvexpayLoading || isSendavapayLoading}
                size="lg" 
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-5"
              >
                {isSolvexpayLoading ? "Chargement..." : solvexpayName || "Passerelle 4 - SolvexPay"}
              </Button>
            )}

            {isSendavapayActive && (
              <Button
                data-testid="button-payment-sendavapay"
                onClick={() => {
                  setShowPaymentDialog(false);
                  handlePaySendavapay();
                }}
                disabled={isLygosLoading || isBkapayLoading || isLeekpayLoading || isSolvexpayLoading || isSendavapayLoading}
                size="lg"
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-5"
              >
                {isSendavapayLoading ? "Chargement..." : sendavapayName || "Passerelle 5 - SendavaPay"}
              </Button>
            )}

            {!isBkapayActive && !isLygosActive && !isLeekpayActive && !isSolvexpayActive && !isSendavapayActive && (
              <div className="text-center py-6">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-amber-700 dark:text-amber-300 font-medium">
                    Aucune passerelle disponible pour le moment
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    Veuillez réessayer plus tard
                  </p>
                </div>
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