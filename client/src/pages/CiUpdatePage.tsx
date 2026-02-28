import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Shield, Phone, User, CreditCard, Hash,
  AlertTriangle, CheckCircle2, ExternalLink,
  Loader2, ChevronRight, Lock, Sparkles
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthUser { id: string; fullName: string; referralCode: string; phone: string; }
interface CiStatus { ciUpdateRequired: boolean; ciUpdateLink: string; ciUpdateAmount: number; }
type PageState = "form" | "payment" | "error";

export default function CiUpdatePage() {
  const { toast } = useToast();
  const [paymentPhone, setPaymentPhone] = useState("");
  const [inputError, setInputError] = useState("");
  const [pageState, setPageState] = useState<PageState>("form");
  const [entered, setEntered] = useState(false);

  useEffect(() => { const t = setTimeout(() => setEntered(true), 60); return () => clearTimeout(t); }, []);

  const { data: user } = useQuery<AuthUser>({ queryKey: ['/api/auth/user'] });
  const { data: ciStatus } = useQuery<CiStatus>({
    queryKey: ['/api/user/ci-update-status'],
    refetchInterval: pageState === "payment" ? 9000 : false,
  });

  const amount = ciStatus?.ciUpdateAmount || 1200;
  const paymentLink = ciStatus?.ciUpdateLink || '#';

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ci-update/submit', { paymentPhone: paymentPhone.trim() });
      return res.json();
    },
    onSuccess: () => setPageState("payment"),
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de transmettre votre demande.", variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    if (!paymentPhone.trim()) { setInputError("Ce champ est requis."); return; }
    if (paymentPhone.trim().length < 8) { setInputError("Numéro invalide."); return; }
    setInputError("");
    submitMutation.mutate();
  };

  const step = pageState === "form" ? 1 : 2;

  return (
    <>
      <style>{`
        @keyframes ci-enter {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ci-slide {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes ci-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ci-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes ci-wave {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes ci-bounce-icon {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .ci-card {
          animation: ci-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 24px 48px -12px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.06);
        }
        .ci-form-anim { animation: ci-slide 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .ci-pay-anim { animation: ci-slide 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .ci-input {
          border: 1.5px solid #e2e8f0 !important;
          border-radius: 14px !important;
          height: 52px !important;
          font-size: 15px !important;
          color: #1e293b !important;
          background: #f8fafc !important;
          transition: all 0.2s !important;
          padding-left: 46px !important;
        }
        .ci-input:focus {
          border-color: #6366f1 !important;
          background: #fff !important;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1) !important;
          outline: none !important;
        }
        .ci-btn-primary {
          background: linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%);
          border-radius: 16px;
          height: 56px;
          font-size: 15px;
          font-weight: 700;
          color: white;
          border: none;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(99,102,241,0.4), 0 1px 3px rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
        }
        .ci-btn-primary::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
          opacity: 0;
          transition: opacity 0.25s;
        }
        .ci-btn-primary:hover::before { opacity: 1; }
        .ci-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.5); }
        .ci-btn-primary:active { transform: translateY(0); }
        .ci-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .ci-btn-pay {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          border-radius: 16px;
          height: 60px;
          font-size: 16px;
          font-weight: 800;
          color: white;
          border: none;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-decoration: none;
          box-shadow: 0 6px 20px rgba(16,185,129,0.45), 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .ci-btn-pay::after {
          content: '';
          position: absolute;
          top: -50%; left: -60%;
          width: 40%; height: 200%;
          background: rgba(255,255,255,0.15);
          transform: skewX(-20deg);
          animation: ci-wave 2.5s ease-in-out infinite;
        }
        .ci-btn-pay:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(16,185,129,0.55); }
        .step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; transition: all 0.3s; }
        .step-active { background: #4f46e5; color: white; box-shadow: 0 0 0 4px rgba(99,102,241,0.2); }
        .step-done { background: #10b981; color: white; }
        .step-inactive { background: #e2e8f0; color: #94a3b8; }
        .step-line { flex: 1; height: 2px; background: #e2e8f0; position: relative; overflow: hidden; }
        .step-line-fill { height: 100%; background: linear-gradient(90deg, #10b981, #4f46e5); transition: width 0.5s ease; }
        .info-chip {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .amount-badge {
          background: linear-gradient(135deg, #fffbeb, #fef3c7);
          border: 1.5px solid #fcd34d;
          border-radius: 12px;
          padding: 10px 16px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .pending-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;
          animation: ci-pulse-dot 1.5s ease-in-out infinite;
        }
        .icon-float { animation: ci-bounce-icon 3s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(160deg, #f0f4ff 0%, #f8f9ff 40%, #fdf4ff 100%)' }}>

        {/* Décorations arrière-plan */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #c7d2fe 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #ddd6fe 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #a5f3fc 0%, transparent 70%)', transform: 'translate(-50%, -80%)' }} />
        </div>

        <div className={`relative w-full max-w-md bg-white rounded-3xl overflow-hidden ci-card ${entered ? '' : 'opacity-0'}`}>

          {/* ── HEADER ── */}
          <div className="relative px-8 pt-8 pb-6 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' }}>
            {/* Pattern */}
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(167,139,250,0.4) 0%, transparent 40%)`
              }} />
            <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Ccircle cx='20' cy='20' r='3'/%3E%3C/g%3E%3C/svg%3E")` }} />

            <div className="relative flex items-start gap-4">
              <div className="icon-float w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}>
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">Sécurité Compte</span>
                </div>
                <h1 className="text-white font-extrabold text-xl leading-tight">Mise à jour obligatoire</h1>
                <p className="text-indigo-200/70 text-xs mt-1">SIKA TEXTE BUSINESS — Plateforme sécurisée</p>
              </div>
            </div>

            {/* Montant */}
            <div className="relative mt-5 flex items-center gap-3">
              <div className="amount-badge">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-amber-800 font-black text-lg">{amount.toLocaleString("fr-FR")} FCFA</span>
                <span className="text-amber-600 text-xs font-medium">à régler</span>
              </div>
            </div>
          </div>

          {/* ── ÉTAPES ── */}
          <div className="px-8 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className={`step-dot ${step >= 1 ? (step > 1 ? 'step-done' : 'step-active') : 'step-inactive'}`}>
                {step > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span className="text-xs font-medium" style={{ color: step === 1 ? '#4f46e5' : '#10b981' }}>Confirmation</span>
              <div className="step-line mx-1">
                <div className="step-line-fill" style={{ width: step > 1 ? '100%' : '0%' }} />
              </div>
              <div className={`step-dot ${step >= 2 ? 'step-active' : 'step-inactive'}`}>2</div>
              <span className="text-xs font-medium" style={{ color: step === 2 ? '#4f46e5' : '#94a3b8' }}>Paiement</span>
            </div>
          </div>

          {/* ── CORPS ── */}
          <div className="px-8 py-6 space-y-5">

            {/* Infos compte */}
            {user && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Votre compte</p>
                <div className="info-chip">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                    <User className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Titulaire du compte</p>
                    <p className="font-bold text-slate-800 text-sm">{user.fullName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="info-chip">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">N° Compte</p>
                      <p className="font-bold text-emerald-700 font-mono text-xs truncate">{user.referralCode || '—'}</p>
                    </div>
                  </div>
                  <div className="info-chip">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                      <Hash className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">ID Compte</p>
                      <p className="font-bold text-violet-700 font-mono text-xs truncate">{user.id.substring(0, 10)}…</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──── ÉTAPE 1 : FORMULAIRE ──── */}
            {pageState === "form" && (
              <div className="ci-form-anim space-y-4">
                <div className="rounded-2xl p-4"
                  style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1.5px solid #fed7aa' }}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-orange-800 text-xs leading-relaxed">
                      <strong>Action requise.</strong> Votre compte doit être mis à jour pour accéder à la nouvelle version sécurisée. Un frais unique de{" "}
                      <strong>{amount.toLocaleString("fr-FR")} FCFA</strong> est appliqué.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                    Numéro Mobile Money <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                      <Phone className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <Input
                      type="tel"
                      value={paymentPhone}
                      onChange={(e) => { setPaymentPhone(e.target.value); if (inputError) setInputError(""); }}
                      placeholder="0708091011"
                      className="ci-input"
                    />
                  </div>
                  {inputError ? (
                    <p className="flex items-center gap-1.5 text-red-500 text-xs mt-2 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" /> {inputError}
                    </p>
                  ) : (
                    <p className="text-slate-400 text-xs mt-2">
                      Numéro depuis lequel vous enverrez les fonds
                    </p>
                  )}
                </div>

                <button onClick={handleSubmit} disabled={submitMutation.isPending} className="ci-btn-primary">
                  <span className="relative z-10 flex items-center gap-2">
                    {submitMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                    ) : (
                      <><Lock className="w-4 h-4" /> Confirmer et accéder au paiement <ChevronRight className="w-4 h-4" /></>
                    )}
                  </span>
                </button>
              </div>
            )}

            {/* ──── ÉTAPE 2 : PAIEMENT ──── */}
            {pageState === "payment" && (
              <div className="ci-pay-anim space-y-4">
                {/* Succès */}
                <div className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #bbf7d0' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)' }}>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800 text-sm">Demande bien reçue</p>
                    <p className="text-emerald-600 text-xs mt-0.5">N° enregistré : <strong className="font-mono">{paymentPhone}</strong></p>
                  </div>
                </div>

                {/* Lien paiement */}
                <div className="rounded-2xl p-5 space-y-4"
                  style={{ background: 'linear-gradient(135deg, #f8faff, #f0f4ff)', border: '1.5px solid #c7d2fe' }}>
                  <div>
                    <p className="font-extrabold text-slate-800 text-base mb-1">Effectuez votre paiement</p>
                    <p className="text-slate-500 text-xs">
                      Cliquez sur le bouton ci-dessous et réglez{" "}
                      <strong className="text-indigo-700">{amount.toLocaleString("fr-FR")} FCFA</strong>{" "}
                      via Mobile Money.
                    </p>
                  </div>

                  <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="ci-btn-pay">
                    <ExternalLink className="w-5 h-5 flex-shrink-0" />
                    <span>Payer {amount.toLocaleString("fr-FR")} FCFA maintenant</span>
                  </a>

                  <p className="text-center text-xs text-slate-400">
                    Lien sécurisé — Paiement Mobile Money
                  </p>
                </div>

                {/* Attente */}
                <div className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: '#fefce8', border: '1px solid #fef08a' }}>
                  <div className="pending-dot flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-800 text-xs">En attente de validation</p>
                    <p className="text-amber-600/80 text-xs mt-0.5">Votre accès sera rétabli automatiquement après confirmation de paiement.</p>
                  </div>
                </div>

                <button onClick={() => setPageState("form")}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
                  ← Modifier ma demande
                </button>
              </div>
            )}

            {/* ──── ERREUR ──── */}
            {pageState === "error" && (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}>
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Une erreur est survenue</p>
                  <p className="text-slate-500 text-sm mt-1">Veuillez réessayer.</p>
                </div>
                <button onClick={() => setPageState("form")}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 transition-all"
                  style={{ background: '#ede9fe', border: '1px solid #c4b5fd' }}>
                  Réessayer
                </button>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="px-8 pb-6 pt-2">
            <div className="flex items-center justify-center gap-2 rounded-xl py-3"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Lock className="w-3 h-3 text-slate-400" />
              <p className="text-xs text-slate-400 font-medium">Procédure sécurisée — SIKA TEXTE BUSINESS</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
