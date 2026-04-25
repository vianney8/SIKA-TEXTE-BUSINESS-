import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CreditCard, AlertTriangle, Shield, Banknote,
  MessageCircle, Edit3, CheckCircle,
  ArrowDownCircle, Send, ChevronRight, KeyRound, Eye, EyeOff, Lock,
  Wallet, ShieldCheck, Smartphone, ChevronRight as ArrowRight
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
  cardNumber: string; isDefault: boolean; operator?: string;
}

export default function Withdrawal() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [showSupervisorDialog, setShowSupervisorDialog] = useState(false);

  // PCS code modal state
  const [showPcsModal, setShowPcsModal] = useState(false);
  const [pcsCode, setPcsCode] = useState("");
  const [pcsError, setPcsError] = useState("");
  const [showPcsCode, setShowPcsCode] = useState(false);
  const pendingAmount = useRef<number>(0);

  // Transfer animation state
  const [transferScreen, setTransferScreen] = useState<'idle' | 'processing' | 'success'>('idle');
  const [isAutoWithdrawal, setIsAutoWithdrawal] = useState(false);
  const [countdown, setCountdown] = useState(13);
  const [transferredAmount, setTransferredAmount] = useState(0);
  const [animStep, setAnimStep] = useState(0); // 0=initial 1=arrow 2=done

  const { data: telegramSupervisor } = useAppSetting("telegram_supervisor");

  const { data: spaySettings } = useQuery<{ hasSavedPcsCode: boolean; savedPcsCodeMasked: string | null; lowLatencyMode: boolean }>({
    queryKey: ["/api/user/spay-settings"],
  });

  const { data: withdrawalData, refetch: refetchWithdrawalData } = useQuery<WithdrawalData>({
    queryKey: ["/api/withdrawal"],
  });
  const { data: paymentInfo } = useQuery<{ activationAmount?: string }>({ queryKey: ["/api/activation/payment-info"] });
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
    mutationFn: async (data: { amount: number; pcsCode: string }) => {
      const res = await apiRequest("POST", "/api/withdrawal/request", data);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erreur");
      return json;
    },
    onSuccess: (data) => {
      setShowPcsModal(false);
      setPcsCode("");
      setPcsError("");
      setTransferredAmount(pendingAmount.current);
      setIsAutoWithdrawal(!!data.autoWithdrawal);
      setCountdown(13);
      setAnimStep(0);
      setTransferScreen('processing');
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawal"] });
      // Animate arrow after 1s
      setTimeout(() => setAnimStep(1), 800);
      setTimeout(() => setAnimStep(2), 2000);
      if (data.autoWithdrawal) {
        // Auto mode: show countdown, then success
        // countdown handled by useEffect
      } else {
        // Manual mode: show processing for 4s then success
        setTimeout(() => setTransferScreen('success'), 4500);
      }
    },
    onError: (error: any) => {
      if (error.message?.includes('PCS')) {
        setPcsError(error.message);
      } else {
        setShowPcsModal(false);
        toast({ title: "Erreur", description: error.message || "Impossible de traiter le retrait", variant: "destructive" });
      }
    },
  });

  // Countdown for auto withdrawal
  useEffect(() => {
    if (transferScreen === 'processing' && isAutoWithdrawal) {
      if (countdown <= 0) {
        setTransferScreen('success');
        return;
      }
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [transferScreen, isAutoWithdrawal, countdown]);

  const handleWithdraw = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast({ title: "Montant invalide", description: "Veuillez saisir un montant valide", variant: "destructive" }); return;
    }
    if (val > (withdrawalData?.balance || 0)) {
      toast({ title: "Solde insuffisant", description: "Votre solde est insuffisant pour ce retrait", variant: "destructive" }); return;
    }
    pendingAmount.current = val;
    // If saved PCS code exists, bypass modal and submit directly
    if (spaySettings?.hasSavedPcsCode) {
      withdrawMutation.mutate({ amount: val, pcsCode: "" });
      return;
    }
    // Otherwise open PCS code modal
    setPcsCode("");
    setPcsError("");
    setShowPcsModal(true);
  };

  const handlePcsSubmit = () => {
    if (!pcsCode.trim()) {
      setPcsError("Veuillez saisir votre code PCS Secure Pay");
      return;
    }
    setPcsError("");
    withdrawMutation.mutate({ amount: pendingAmount.current, pcsCode: pcsCode.trim() });
  };

  /* ─── Écran de transfert animé ────────────────────────── */
  if (transferScreen === 'processing' || transferScreen === 'success') {
    const isSuccess = transferScreen === 'success';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #050d1f 0%, #0a1a3a 45%, #071224 100%)" }}>

        {/* Subtle grid background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.07) 0%, transparent 70%)" }} />

        <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-sm">
          {!isSuccess ? (
            <>
              {/* ── Three logos row: SIKApay → PCS Spay → MobileMoney ── */}
              <div className="flex items-center justify-center w-full mb-10 gap-2">

                {/* SIKApay */}
                <div className="flex flex-col items-center">
                  <div className="w-[72px] h-[72px] rounded-[20px] flex flex-col items-center justify-center gap-1 shadow-2xl"
                    style={{
                      background: "linear-gradient(145deg, #1a56db, #1e40af)",
                      border: "1.5px solid rgba(96,165,250,0.45)",
                      boxShadow: "0 8px 32px rgba(30,64,175,0.55)",
                    }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="5" width="20" height="14" rx="3" fill="white" fillOpacity="0.18"/>
                      <rect x="2" y="5" width="20" height="14" rx="3" stroke="white" strokeWidth="1.8"/>
                      <rect x="2" y="9" width="20" height="3" fill="white" fillOpacity="0.55"/>
                      <rect x="5" y="14" width="5" height="2" rx="1" fill="white" fillOpacity="0.8"/>
                      <rect x="12" y="14" width="3" height="2" rx="1" fill="white" fillOpacity="0.5"/>
                    </svg>
                    <span className="text-white font-black text-[9px] tracking-wider leading-none">SIKA</span>
                  </div>
                  <span className="text-blue-300 text-[10px] font-bold mt-1.5 tracking-wide">SIKApay</span>
                </div>

                {/* Arrow 1 */}
                <div className="flex flex-col items-center gap-[3px] mx-1"
                  style={{ opacity: animStep >= 1 ? 1 : 0, transition: 'opacity 0.5s ease' }}>
                  {[0,1,2].map(i => (
                    <svg key={i} width="12" height="8" viewBox="0 0 12 8" fill="none"
                      style={{ opacity: 0.4 + i * 0.2 }}>
                      <path d="M1 4h10M7 1l4 3-4 3" stroke="#60a5fa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ))}
                </div>

                {/* PCS Spay — CENTER (slightly larger) */}
                <div className="flex flex-col items-center"
                  style={{
                    opacity: animStep >= 1 ? 1 : 0.3,
                    transform: animStep >= 1 ? 'scale(1.08)' : 'scale(0.9)',
                    transition: 'opacity 0.5s ease, transform 0.5s ease',
                  }}>
                  <div className="w-[80px] h-[80px] rounded-[22px] flex flex-col items-center justify-center gap-1 shadow-2xl"
                    style={{
                      background: "linear-gradient(145deg, #6d28d9, #4c1d95)",
                      border: "1.5px solid rgba(167,139,250,0.5)",
                      boxShadow: "0 10px 40px rgba(109,40,217,0.6)",
                    }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2Z" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.6"/>
                      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-white font-black text-[8px] tracking-widest leading-none">PCS</span>
                  </div>
                  <span className="text-purple-300 text-[10px] font-bold mt-1.5 tracking-wide">PCS Spay</span>
                </div>

                {/* Arrow 2 */}
                <div className="flex flex-col items-center gap-[3px] mx-1"
                  style={{ opacity: animStep >= 2 ? 1 : 0, transition: 'opacity 0.5s ease 0.2s' }}>
                  {[0,1,2].map(i => (
                    <svg key={i} width="12" height="8" viewBox="0 0 12 8" fill="none"
                      style={{ opacity: 0.4 + i * 0.2 }}>
                      <path d="M1 4h10M7 1l4 3-4 3" stroke="#fb923c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ))}
                </div>

                {/* MobileMoney */}
                <div className="flex flex-col items-center"
                  style={{
                    opacity: animStep >= 2 ? 1 : 0.25,
                    transform: animStep >= 2 ? 'scale(1)' : 'scale(0.85)',
                    transition: 'opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s',
                  }}>
                  <div className="w-[72px] h-[72px] rounded-[20px] flex flex-col items-center justify-center gap-1 shadow-2xl"
                    style={{
                      background: "linear-gradient(145deg, #ea580c, #c2410c)",
                      border: "1.5px solid rgba(251,146,60,0.45)",
                      boxShadow: "0 8px 32px rgba(234,88,12,0.55)",
                    }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <rect x="7" y="2" width="10" height="20" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.7"/>
                      <rect x="9.5" y="4" width="5" height="2" rx="1" fill="white" fillOpacity="0.6"/>
                      <circle cx="12" cy="18" r="1.2" fill="white" fillOpacity="0.8"/>
                      <rect x="9" y="8" width="6" height="7" rx="1" fill="white" fillOpacity="0.3"/>
                    </svg>
                    <span className="text-white font-black text-[8px] tracking-wider leading-none">MOBILE</span>
                  </div>
                  <span className="text-orange-300 text-[10px] font-bold mt-1.5 tracking-wide">MobileMoney</span>
                </div>
              </div>

              {/* Amount */}
              <div className="text-center mb-6">
                <div className="text-4xl font-black text-white mb-1 tracking-tight">
                  {formatFCFA(transferredAmount)}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{ animation: 'blink 1.2s infinite' }} />
                  <span className="text-blue-300 text-sm">Transfert en cours</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/10 rounded-full h-1.5 mb-6 overflow-hidden">
                <div className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #f97316)",
                    width: isAutoWithdrawal ? `${((13 - countdown) / 13) * 100}%` : '75%',
                    transition: isAutoWithdrawal ? 'width 1s linear' : 'none',
                    animation: isAutoWithdrawal ? 'none' : 'progressPulse 2s ease-in-out infinite',
                  }} />
              </div>

              {/* Countdown or loading */}
              {isAutoWithdrawal ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-16 h-16">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="5"/>
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#3b82f6" strokeWidth="5"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * countdown / 13}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-black text-xl">{countdown}</span>
                    </div>
                  </div>
                  <p className="text-blue-200 text-sm text-center">
                    Traitement automatique en cours<br />
                    <span className="text-xs text-purple-400 font-medium">Via PCS Spay — Connexion sécurisée</span>
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full"
                        style={{
                          background: i % 2 === 0 ? '#3b82f6' : '#8b5cf6',
                          animation: `bounce 1.2s ease-in-out infinite ${i * 0.18}s`,
                        }} />
                    ))}
                  </div>
                  <p className="text-blue-200 text-sm text-center">
                    Demande transmise via PCS Spay<br />
                    <span className="text-xs text-purple-400 font-medium">Traitement en cours · Mobile Money</span>
                  </p>
                </div>
              )}

              {/* Security strip */}
              <div className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2Z" fill="#22c55e" fillOpacity="0.3" stroke="#22c55e" strokeWidth="1.8"/>
                  <path d="M9 12l2 2 4-4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="text-gray-300 text-xs">Transaction chiffrée · PCS Spay</span>
              </div>
            </>
          ) : (
            /* ── SUCCESS SCREEN ── */
            <>
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    boxShadow: "0 0 0 12px rgba(34,197,94,0.12), 0 0 48px rgba(34,197,94,0.35)",
                    animation: 'pulseSuccess 2s ease-in-out infinite',
                  }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              <h2 className="text-[28px] font-black text-white mb-1 text-center tracking-tight">
                {isAutoWithdrawal ? "Retrait effectué !" : "Demande envoyée !"}
              </h2>
              <p className="text-gray-400 text-center text-sm mb-4 leading-relaxed">
                {isAutoWithdrawal
                  ? "Votre retrait a été traité automatiquement avec succès."
                  : "Votre demande de retrait a été transmise via PCS Spay."}
              </p>

              <div className="text-[36px] font-black text-green-400 mb-6 tracking-tight">
                {formatFCFA(transferredAmount)}
              </div>

              {/* Info card */}
              <div className="w-full rounded-2xl p-4 mb-8 space-y-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(145deg, #ea580c, #c2410c)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="7" y="2" width="10" height="20" rx="3" stroke="white" strokeWidth="1.8"/>
                      <circle cx="12" cy="18" r="1" fill="white"/>
                    </svg>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Le virement a été initié vers votre compte <span className="text-orange-400 font-semibold">MobileMoney</span> enregistré.
                  </p>
                </div>
                {!isAutoWithdrawal && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(145deg, #6d28d9, #4c1d95)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2Z" stroke="white" strokeWidth="1.8"/>
                        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="text-gray-400 text-xs">Traitement dans les prochaines minutes via PCS Spay.</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setTransferScreen('idle'); setAmount(""); refetchWithdrawalData(); }}
                className="w-full py-4 rounded-2xl font-bold text-white text-base tracking-wide"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6d28d9, #ea580c)", backgroundSize: "200% 100%" }}>
                Retour au tableau de bord
              </button>
            </>
          )}
        </div>

        <style>{`
          @keyframes blink { 0%,100%{opacity:0.3} 50%{opacity:1} }
          @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-6px);opacity:1} }
          @keyframes pulseSuccess { 0%,100%{box-shadow:0 0 0 12px rgba(34,197,94,0.12),0 0 48px rgba(34,197,94,0.35)} 50%{box-shadow:0 0 0 18px rgba(34,197,94,0.06),0 0 64px rgba(34,197,94,0.2)} }
          @keyframes progressPulse { 0%{width:45%} 50%{width:75%} 100%{width:45%} }
        `}</style>
      </div>
    );
  }

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
                <span className="text-emerald-800 font-black text-lg">{paymentInfo?.activationAmount ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR") : "3 600"} FCFA</span>
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
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-blue-200 text-sm">****{bankCard.cardNumber.slice(-4)}</p>
                {bankCard.operator && (
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {bankCard.operator}
                  </span>
                )}
              </div>
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

      {/* Modal Code PCS Secure Pay */}
      <Dialog open={showPcsModal} onOpenChange={(open) => { if (!withdrawMutation.isPending) setShowPcsModal(open); }}>
        <DialogContent className="mx-4 rounded-2xl p-0 overflow-hidden max-w-sm">
          {/* Header */}
          <div className="p-5 pb-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}>
                <Lock size={22} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-gray-900 text-base">Code PCS Secure Pay</h2>
                <p className="text-gray-500 text-xs">Vérification requise avant retrait</p>
              </div>
            </div>

            {/* Montant affiché */}
            <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-blue-700 text-sm font-semibold">Montant du retrait</span>
              <span className="text-blue-900 font-black text-lg">{formatFCFA(pendingAmount.current)}</span>
            </div>

            <p className="text-gray-600 text-xs leading-relaxed mb-4">
              Entrez votre code <strong>PCS Secure Pay</strong> reçu par email pour valider cette opération.
            </p>
          </div>

          <div className="px-5 pb-5 space-y-3">
            {/* Input code */}
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPcsCode ? "text" : "password"}
                value={pcsCode}
                onChange={e => { setPcsCode(e.target.value.toUpperCase()); setPcsError(""); }}
                onKeyDown={e => e.key === 'Enter' && handlePcsSubmit()}
                placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono font-bold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all tracking-wider"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPcsCode(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPcsCode ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Erreur */}
            {pcsError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-xs font-medium">{pcsError}</p>
              </div>
            )}

            {/* Bouton confirmer */}
            <button
              onClick={handlePcsSubmit}
              disabled={withdrawMutation.isPending || !pcsCode.trim()}
              className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.97] transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
            >
              {withdrawMutation.isPending
                ? "Vérification..."
                : <><CheckCircle size={18} /> Confirmer le retrait</>
              }
            </button>

            {/* Annuler */}
            <button
              onClick={() => setShowPcsModal(false)}
              disabled={withdrawMutation.isPending}
              className="w-full py-3 rounded-xl font-bold text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Annuler
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
