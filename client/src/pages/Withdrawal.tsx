import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CreditCard, AlertTriangle, Shield, Banknote,
  MessageCircle, Edit3, CheckCircle,
  ArrowDownCircle, Send, ChevronRight
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAppSetting } from "@/hooks/useAppSettings";
import { FaTelegram } from "react-icons/fa";
import { formatFCFA } from "@/lib/utils";

const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 underline font-medium">{part}</a>
      );
    }
    return part;
  });
};

interface WithdrawalData {
  balance: number;
  isAccountActive: boolean;
  withdrawalHistory: Array<{
    id: string; amount: number; date: string;
    status: 'pending' | 'completed' | 'failed';
    phoneNumber: string;
    cardFirstName?: string; cardLastName?: string; cardNumber?: string;
  }>;
}
interface Notification {
  id: string; message: string; isRead: boolean;
  seenAt: string | null; createdAt: string;
}
interface BankCardData {
  id: string; firstName: string; lastName: string;
  cardNumber: string; isDefault: boolean;
}

export default function Withdrawal() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [showSupervisorDialog, setShowSupervisorDialog] = useState(false);

  const { data: telegramSupervisor } = useAppSetting("telegram_supervisor");

  const { data: withdrawalData, refetch: refetchWithdrawalData } = useQuery<WithdrawalData>({
    queryKey: ["/api/withdrawal"],
  });
  const { data: bankCard } = useQuery<BankCardData | null>({ queryKey: ["/api/bank-card"] });
  const { data: notifications = [], refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  useEffect(() => { refetchWithdrawalData(); }, []);

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const unseen = notifications.filter(n => !n.seenAt);
      unseen.forEach(n => {
        fetch("/api/notifications/seen", {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "include", body: JSON.stringify({ notificationId: n.id }),
        });
      });
      if (unseen.length > 0) setTimeout(() => refetchNotifications(), 500);
    }
  }, [notifications]);

  useEffect(() => {
    const interval = setInterval(() => refetchNotifications(), 2000);
    return () => clearInterval(interval);
  }, [refetchNotifications]);

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number }) => {
      const res = await apiRequest("POST", "/api/withdrawal/request", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Demande envoyée", description: "Votre retrait sera traité dans les prochaines minutes" });
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawal"] });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de traiter le retrait", variant: "destructive" });
    },
  });

  const handleWithdraw = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast({ title: "Montant invalide", description: "Veuillez saisir un montant valide", variant: "destructive" }); return;
    }
    if (val > (withdrawalData?.balance || 0)) {
      toast({ title: "Solde insuffisant", description: "Votre solde est insuffisant pour ce retrait", variant: "destructive" }); return;
    }
    withdrawMutation.mutate({ amount: val });
  };

  /* ─── Compte inactif ─────────────────────────────────── */
  if (!withdrawalData?.isAccountActive) {
    return (
      <>
        <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
          <PageHeader title="Retrait" backHref="/" />
          <div className="px-4 pb-8 space-y-3 mt-3">

            {/* Bloc activation requise */}
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-16 h-16 rounded-[18px] bg-amber-50 flex items-center justify-center mb-3">
                  <Shield size={28} className="text-amber-500" />
                </div>
                <h2 className="text-gray-800 font-black text-xl">Activation Requise</h2>
                <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                  Pour accéder au retrait, vous devez d'abord activer votre compte SIKA TEXTE.
                </p>
              </div>

              {/* Bénéfices */}
              <div className="space-y-2.5 mb-5">
                {[
                  "Votre compte devient actif et accepte les paiements",
                  "Accès immédiat à la fonctionnalité de retrait",
                  "Vos gains sont versés directement et automatiquement",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-blue-50 rounded-xl px-3 py-2.5">
                    <CheckCircle size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-blue-800 text-xs font-medium">{item}</p>
                  </div>
                ))}
              </div>

              {/* Coût */}
              <div className="flex items-center justify-between bg-emerald-50 rounded-2xl px-4 py-3 mb-5">
                <div className="flex items-center gap-2">
                  <Banknote size={18} className="text-emerald-600" />
                  <span className="text-emerald-800 font-semibold text-sm">Coût d'activation</span>
                </div>
                <span className="text-emerald-800 font-black text-lg">3 600 FCFA</span>
              </div>

              {/* CTA */}
              <Link href="/activation">
                <button
                  data-testid="button-pay-activation"
                  className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition-all"
                  style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
                >
                  <CreditCard size={18} /> Payer l'activation en ligne
                </button>
              </Link>
            </div>

            {/* Besoin d'aide */}
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <MessageCircle size={18} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-gray-800 font-bold text-sm">Besoin d'aide ?</p>
                  <p className="text-gray-400 text-xs">Compte inactif après paiement ?</p>
                </div>
              </div>
              <button
                data-testid="button-supervisor-contact"
                onClick={() => setShowSupervisorDialog(true)}
                className="w-full py-3 rounded-xl font-bold text-sm border-2 border-orange-200 text-orange-600 bg-orange-50 active:scale-[0.97] transition-all"
              >
                Contacter un superviseur
              </button>
            </div>
          </div>
        </div>

        <Dialog open={showSupervisorDialog} onOpenChange={setShowSupervisorDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Contacter un superviseur</DialogTitle></DialogHeader>
            <a href={telegramSupervisor || "https://t.me/servicepay_support"} target="_blank" rel="noopener noreferrer"
              data-testid="button-telegram-supervisor"
              className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 mt-2"
              style={{ background: "linear-gradient(135deg, #0088cc, #229ed9)" }}>
              <FaTelegram size={18} /> Superviseur Telegram
            </a>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  /* ─── Compte actif ───────────────────────────────────── */
  const visibleNotifications = (notifications as Notification[]).filter(n => {
    if (!n.seenAt) return true;
    return Date.now() - new Date(n.seenAt).getTime() < 60000;
  });

  return (
    <div className="min-h-screen pb-28" style={{ background: "#f0f4f8" }}>
      <PageHeader title="Retrait Mobile Money" backHref="/" />

      <div className="px-4 space-y-3 mt-3">

        {/* Alertes / notifications */}
        {visibleNotifications.length > 0 && (
          <div className="space-y-2">
            {visibleNotifications.map(n => (
              <div key={n.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-[16px] p-3.5">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-xs font-medium leading-relaxed">
                  <strong>Alerte : </strong>{renderTextWithLinks(n.message)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Carte bancaire enregistrée */}
        {bankCard && (
          <div
            className="rounded-[20px] p-4 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #1a4fa0, #7c3aed)" }}
          >
            <div>
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">Carte enregistrée</p>
              <p className="text-white font-bold text-base">{bankCard.firstName} {bankCard.lastName}</p>
              <p className="text-blue-200 text-sm">****{bankCard.cardNumber.slice(-4)}</p>
            </div>
            <Link href="/bank-card" data-testid="button-edit-bank-card">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Edit3 size={16} className="text-white" />
              </div>
            </Link>
          </div>
        )}

        {!bankCard && (
          <Link href="/bank-card">
            <div className="bg-white rounded-[20px] border-2 border-dashed border-blue-200 p-4 flex items-center gap-3 active:scale-[0.98] transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <CreditCard size={18} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-gray-700 font-bold text-sm">Ajouter une carte</p>
                <p className="text-gray-400 text-xs">Enregistrez votre carte Mobile Money</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </Link>
        )}

        {/* Solde disponible */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5 text-center">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Solde disponible</p>
          <p className="text-gray-900 font-black text-4xl mb-2">
            {formatFCFA(withdrawalData?.balance || 0)}
          </p>
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
            <CheckCircle size={12} /> Compte Activé
          </div>
        </div>

        {/* Formulaire retrait */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5">
          <p className="text-gray-800 font-bold text-base mb-4">Nouveau retrait</p>

          <div className="mb-4">
            <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">
              Montant à retirer (FCFA)
            </label>
            <div className="relative">
              <ArrowDownCircle size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                data-testid="input-withdrawal-amount"
                type="number"
                value={amount}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v > 0 || e.target.value === "") setAmount(e.target.value);
                }}
                min="1"
                placeholder="Entrez le montant"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2.5 bg-blue-50 rounded-xl px-3 py-2.5 mb-4">
            <CreditCard size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-blue-700 text-xs leading-relaxed">
              Les retraits sont traités sur votre carte bancaire enregistrée dans les prochaines minutes.
            </p>
          </div>

          <button
            data-testid="button-request-withdrawal"
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending || !amount}
            className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
          >
            {withdrawMutation.isPending
              ? "Traitement..."
              : <><Send size={16} /> Demander le retrait</>
            }
          </button>
        </div>

        {/* Support */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-gray-800 font-bold text-sm">Retrait non reçu ?</p>
              <p className="text-gray-400 text-xs">Contactez notre service client</p>
            </div>
          </div>
          <a
            href={telegramSupervisor || "https://t.me/servicepay_support"}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-contact-telegram"
            className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
            style={{ background: "linear-gradient(135deg, #0088cc, #229ed9)" }}
          >
            <FaTelegram size={16} /> Service client Telegram
          </a>
        </div>

      </div>

      {/* Dialog superviseur */}
      <Dialog open={showSupervisorDialog} onOpenChange={setShowSupervisorDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Contacter un superviseur</DialogTitle></DialogHeader>
          <a href={telegramSupervisor || "https://t.me/servicepay_support"} target="_blank" rel="noopener noreferrer"
            className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 mt-2"
            style={{ background: "linear-gradient(135deg, #0088cc, #229ed9)" }}>
            <FaTelegram size={18} /> Superviseur Telegram
          </a>
        </DialogContent>
      </Dialog>
    </div>
  );
}
