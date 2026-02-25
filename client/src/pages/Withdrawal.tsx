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
  const isBkapayActive = bkapayEnabled === undefined || bkapayEnabled === '' || bkapayEnabled !== 'false';
  const isLygosActive = lygosEnabled === undefined || lygosEnabled === '' || lygosEnabled !== 'false';
  const isLeekpayActive = leekpayEnabled === undefined || leekpayEnabled === '' || leekpayEnabled !== 'false';
  const isSolvexpayActive = solvexpayEnabled === undefined || solvexpayEnabled === '' || solvexpayEnabled !== 'false';

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

  // Payment gateways - Lygos, BKAPay, LeekPay and SolvexPay
  const [isLygosLoading, setIsLygosLoading] = useState(false);
  const [isBkapayLoading, setIsBkapayLoading] = useState(false);
  const [isLeekpayLoading, setIsLeekpayLoading] = useState(false);
  const [isSolvexpayLoading, setIsSolvexpayLoading] = useState(false);
  
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
      <div className="min-h-screen pb-10" style={{ background: "#f0f4ff" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0a0f2c 0%, #1a1f5e 100%)" }}>
          <div className="px-4 pt-12 pb-8">
            <div className="flex items-center gap-3 mb-6">
              <Link href="/">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.08)" }} data-testid="button-back">
                  <ArrowLeft size={18} className="text-white" />
                </div>
              </Link>
              <h1 className="text-white font-bold text-lg">Activation du compte</h1>
            </div>

            {/* Activation badge */}
            <div className="rounded-3xl p-5" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(245,158,11,0.2)" }}>
                  <Shield size={26} style={{ color: "#fbbf24" }} />
                </div>
                <div>
                  <p className="text-white font-bold text-base">Compte non activé</p>
                  <p className="text-white/50 text-xs mt-0.5">Paiement unique requis pour débloquer</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4">

          {/* Price card */}
          <div className="rounded-3xl overflow-hidden shadow-sm" style={{ background: "white" }}>
            <div className="h-1" style={{ background: "linear-gradient(90deg, #f59e0b, #10b981)" }} />
            <div className="p-5 text-center">
              <p className="text-slate-500 text-sm mb-2">Coût d'activation unique</p>
              <p className="font-black text-4xl mb-1" style={{ color: "#0a0f2c" }}>3 600</p>
              <p className="text-slate-400 text-base font-semibold mb-4">FCFA</p>
              <div className="space-y-2 text-left">
                {[
                  "Accédez aux retraits Mobile Money",
                  "Transférez de l'argent librement",
                  "Recevez vos gains automatiquement",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle size={14} style={{ color: "#10b981" }} />
                    <span className="text-slate-600 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pay button */}
          <button
            data-testid="button-pay-activation"
            onClick={() => setShowPaymentDialog(true)}
            className="w-full rounded-2xl py-4 text-white font-bold text-base transition-all active:scale-95 shadow-lg"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <span className="flex items-center justify-center gap-2">
              <CreditCard size={18} />
              Payer l'activation en ligne
            </span>
          </button>

          {/* Support card */}
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: "white" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,136,204,0.1)" }}>
                <MessageCircle size={16} style={{ color: "#0088cc" }} />
              </div>
              <div>
                <p className="text-slate-700 font-semibold text-sm">Besoin d'aide ?</p>
                <p className="text-slate-400 text-xs">Contactez un superviseur</p>
              </div>
            </div>
            <button
              data-testid="button-supervisor-contact"
              onClick={() => setShowSupervisorDialog(true)}
              className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: "rgba(0,136,204,0.07)", color: "#0088cc", border: "1px solid rgba(0,136,204,0.15)" }}>
              <FaTelegram />
              Contacter un superviseur
            </button>
          </div>

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
                disabled={isLygosLoading || isBkapayLoading || isLeekpayLoading || isSolvexpayLoading}
                size="lg" 
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-5"
              >
                {isSolvexpayLoading ? "Chargement..." : solvexpayName || "Passerelle 4 - SolvexPay"}
              </Button>
            )}

            {!isBkapayActive && !isLygosActive && !isLeekpayActive && !isSolvexpayActive && (
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
    <div className="min-h-screen pb-10" style={{ background: "#f0f4ff" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0a0f2c 0%, #1a1f5e 100%)" }}>
        <div className="px-4 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-5">
            <Link href="/">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(255,255,255,0.08)" }} data-testid="button-back-withdrawal">
                <ArrowLeft size={18} className="text-white" />
              </div>
            </Link>
            <h1 className="text-white font-bold text-lg">Retrait</h1>
          </div>

          {/* Balance */}
          <div className="rounded-3xl p-5" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Solde disponible</p>
            <p className="text-white font-black text-3xl mb-1">{(withdrawalData?.balance || 0).toLocaleString('fr-FR')} <span className="text-lg font-semibold text-white/70">FCFA</span></p>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={12} style={{ color: "#34d399" }} />
              <span className="text-xs font-semibold" style={{ color: "#34d399" }}>Compte Activé</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Notifications */}
        {notifications && notifications
          .filter(n => !n.seenAt || Date.now() - new Date(n.seenAt).getTime() < 60000)
          .map((notification) => (
            <div key={notification.id} className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle size={16} style={{ color: "#ef4444" }} className="mt-0.5 flex-shrink-0" />
              <p className="text-slate-700 text-sm">{renderTextWithLinks(notification.message)}</p>
            </div>
          ))}

        {/* Bank card */}
        {bankCard && (
          <div className="rounded-2xl p-4 flex items-center justify-between shadow-sm"
            style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)" }}>
            <div>
              <p className="text-white/50 text-[11px] uppercase tracking-wider mb-0.5">Carte enregistrée</p>
              <p className="text-white font-bold">{bankCard.firstName} {bankCard.lastName}</p>
              <p className="text-white/60 text-sm">****{bankCard.cardNumber.slice(-4)}</p>
            </div>
            <Link href="/bank-card">
              <button className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }} data-testid="button-edit-bank-card">
                <Edit3 size={15} className="text-white" />
              </button>
            </Link>
          </div>
        )}

        {!bankCard && (
          <Link href="/bank-card">
            <button className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-95 shadow-sm"
              style={{ background: "white", color: "#6366f1", border: "1.5px dashed rgba(99,102,241,0.4)" }}>
              <Plus size={16} />
              Ajouter une carte bancaire
            </button>
          </Link>
        )}

        {/* Withdrawal Form */}
        <div className="rounded-3xl overflow-hidden shadow-sm" style={{ background: "white" }}>
          <div className="h-1" style={{ background: "linear-gradient(90deg, #10b981, #6366f1)" }} />
          <div className="p-5">
            <h2 className="text-slate-800 font-bold text-sm mb-4">Nouveau retrait</h2>
            <label className="text-slate-600 text-xs font-semibold uppercase tracking-wider block mb-2">
              Montant à retirer (FCFA)
            </label>
            <div className="relative mb-4">
              <Banknote size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                data-testid="input-withdrawal-amount"
                type="number"
                value={amount}
                onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0 || e.target.value === '') setAmount(e.target.value); }}
                min="1"
                placeholder="Entrez le montant"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                onFocus={e => e.target.style.borderColor = "#10b981"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>
            <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-2"
              style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.1)" }}>
              <CreditCard size={14} style={{ color: "#6366f1" }} className="mt-0.5 flex-shrink-0" />
              <p className="text-slate-500 text-xs">Les retraits sont traités sur votre carte bancaire dans les prochaines minutes.</p>
            </div>
            <button
              data-testid="button-request-withdrawal"
              onClick={handleWithdraw}
              disabled={withdrawMutation.isPending}
              className="w-full rounded-2xl py-4 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              {withdrawMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Traitement...
                </span>
              ) : "Demander le retrait"}
            </button>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "white" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <h3 className="text-slate-800 font-bold text-sm">Historique des retraits</h3>
          </div>
          {withdrawalData?.withdrawalHistory && withdrawalData.withdrawalHistory.length > 0 ? (
            <div>
              {withdrawalData.withdrawalHistory.map((w: any, i: number) => {
                const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                  completed: { label: "Terminé",    color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
                  pending:   { label: "En cours",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
                  failed:    { label: "Échoué",     color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
                };
                const s = statusMap[w.status] || statusMap.pending;
                return (
                  <div key={w.id} className={`flex items-center gap-3 px-5 py-4 ${i < withdrawalData.withdrawalHistory.length - 1 ? "border-b" : ""}`}
                    style={{ borderColor: "#f1f5f9" }}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(16,185,129,0.08)" }}>
                      <Banknote size={16} style={{ color: "#10b981" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-800 font-bold text-sm">{w.amount?.toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-slate-400 text-[11px]">{new Date(w.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ color: s.color, background: s.bg }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Clock size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 text-sm font-medium">Aucun retrait effectué</p>
              <p className="text-slate-400 text-xs mt-1">Vos retraits apparaîtront ici</p>
            </div>
          )}
        </div>

        {/* Support */}
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: "white" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(0,136,204,0.1)" }}>
              <MessageCircle size={16} style={{ color: "#0088cc" }} />
            </div>
            <div>
              <p className="text-slate-700 font-semibold text-sm">Retrait non reçu ?</p>
              <p className="text-slate-400 text-xs">Contactez le service client</p>
            </div>
          </div>
          <a href={telegramSupervisor || 'https://t.me/servicepay_support'} target="_blank" rel="noopener noreferrer">
            <button className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: "rgba(0,136,204,0.07)", color: "#0088cc", border: "1px solid rgba(0,136,204,0.15)" }}
              data-testid="button-contact-telegram">
              <FaTelegram />
              Service client Telegram
            </button>
          </a>
        </div>

      </div>
    </div>
  );
}