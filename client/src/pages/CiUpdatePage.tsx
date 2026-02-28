import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Shield, Phone, User, CreditCard, Hash, AlertTriangle, CheckCircle2, ExternalLink, Loader2, Clock, Zap } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAppSetting } from "@/hooks/useAppSettings";

interface AuthUser { id: string; fullName: string; referralCode: string; phone: string; }
interface CiStatus { ciUpdateRequired: boolean; ciUpdateLink: string; ciUpdateAmount: number; }
type PageState = "form" | "payment";

const WaveLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="20" cy="20" r="20" fill="#FF6B00"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="Arial">Wave</text>
  </svg>
);

const OMLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="20" cy="20" r="20" fill="#FF6600"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Arial">Orange{"\n"}Money</text>
    <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Arial">Orange</text>
    <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Arial">Money</text>
  </svg>
);

const MoMoLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="20" cy="20" r="20" fill="#FFCC00"/>
    <text x="50%" y="45%" dominantBaseline="middle" textAnchor="middle" fill="#333" fontSize="8" fontWeight="900" fontFamily="Arial">MTN</text>
    <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" fill="#333" fontSize="7" fontWeight="700" fontFamily="Arial">MoMo</text>
  </svg>
);

const MoovLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="20" cy="20" r="20" fill="#003087"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="800" fontFamily="Arial">Moov</text>
  </svg>
);

export default function CiUpdatePage() {
  const { toast } = useToast();
  const [paymentPhone, setPaymentPhone] = useState("");
  const [inputError, setInputError] = useState("");
  const [pageState, setPageState] = useState<PageState>("form");
  const [visible, setVisible] = useState(false);
  const [tick, setTick] = useState(0);

  const { data: whatsappAdminRaw } = useAppSetting('whatsapp_admin_contact');
  const whatsappAdmin = (whatsappAdminRaw as any)?.value || '';

  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);
  useEffect(() => { const i = setInterval(() => setTick(p => p + 1), 2000); return () => clearInterval(i); }, []);

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
    onError: () => toast({ title: "Erreur", description: "Impossible de transmettre la demande.", variant: "destructive" })
  });

  const handleSubmit = () => {
    if (!paymentPhone.trim()) { setInputError("Ce champ est requis."); return; }
    if (paymentPhone.trim().length < 8) { setInputError("Numéro invalide."); return; }
    setInputError("");
    submitMutation.mutate();
  };

  const whatsappUrl = whatsappAdmin
    ? `https://wa.me/${whatsappAdmin}?text=${encodeURIComponent('Bonjour, j\'ai effectué le paiement pour la mise à jour de mon compte SIKA TEXTE. Numéro de paiement : ' + paymentPhone)}`
    : null;

  const statusMessages = [
    "🔒 Connexion sécurisée SSL",
    "✅ Vérification en moins de 1 heure",
    "💰 Accès immédiat après validation",
    "🛡️ Traitement par l'administrateur",
  ];

  return (
    <>
      <style>{`
        @keyframes page-in {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50%       { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes logo-float {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50%       { transform: translateY(-5px) rotate(2deg); }
        }
        @keyframes logo-float-2 {
          0%, 100% { transform: translateY(0) rotate(2deg); }
          50%       { transform: translateY(-7px) rotate(-2deg); }
        }
        @keyframes logo-float-3 {
          0%, 100% { transform: translateY(-3px) rotate(0deg); }
          50%       { transform: translateY(3px) rotate(3deg); }
        }
        @keyframes logo-float-4 {
          0%, 100% { transform: translateY(2px) rotate(-1deg); }
          50%       { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes spin-ring {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes shimmer-move {
          0%   { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes dot-blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0.2; }
        }
        .page-in    { animation: page-in 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
        .slide-in   { animation: slide-in 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .logo-1     { animation: logo-float   3.2s ease-in-out infinite; }
        .logo-2     { animation: logo-float-2 4s ease-in-out infinite; }
        .logo-3     { animation: logo-float-3 3.6s ease-in-out infinite; }
        .logo-4     { animation: logo-float-4 2.8s ease-in-out infinite; }
        .ticker-run { animation: ticker 18s linear infinite; white-space: nowrap; }
        .badge-live { animation: badge-pulse 2s ease-out infinite; }
        .dot-a { animation: dot-blink 1.2s ease-in-out 0s infinite; }
        .dot-b { animation: dot-blink 1.2s ease-in-out 0.4s infinite; }
        .dot-c { animation: dot-blink 1.2s ease-in-out 0.8s infinite; }

        .ci-input {
          background: rgba(255,255,255,0.08) !important;
          border: 1.5px solid rgba(255,255,255,0.18) !important;
          color: white !important;
          border-radius: 14px !important;
          height: 52px !important;
          padding-left: 46px !important;
          font-size: 15px !important;
          transition: all 0.2s !important;
        }
        .ci-input::placeholder { color: rgba(255,255,255,0.35) !important; }
        .ci-input:focus {
          border-color: rgba(99,102,241,0.8) !important;
          background: rgba(255,255,255,0.12) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.25) !important;
          outline: none !important;
        }
        .btn-submit {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border-radius: 16px; height: 54px; font-weight: 700;
          font-size: 15px; color: white; border: none; width: 100%;
          cursor: pointer; transition: all 0.25s;
          box-shadow: 0 6px 20px rgba(99,102,241,0.45);
          position: relative; overflow: hidden;
        }
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(99,102,241,0.6);
        }
        .btn-submit::after {
          content: '';
          position: absolute; top: 0; width: 40%; height: 100%;
          background: rgba(255,255,255,0.12);
          transform: skewX(-20deg);
          animation: shimmer-move 2.5s ease-in-out infinite;
        }
        .btn-pay {
          background: linear-gradient(135deg, #059669, #10b981);
          border-radius: 16px; height: 58px; font-weight: 800;
          font-size: 16px; color: white; border: none; width: 100%;
          cursor: pointer; transition: all 0.25s; display: flex;
          align-items: center; justify-content: center; gap: 10px;
          text-decoration: none;
          box-shadow: 0 6px 22px rgba(16,185,129,0.5);
          position: relative; overflow: hidden;
        }
        .btn-pay:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(16,185,129,0.65); }
        .btn-pay::after {
          content: '';
          position: absolute; top: 0; width: 40%; height: 100%;
          background: rgba(255,255,255,0.15);
          transform: skewX(-20deg);
          animation: shimmer-move 2s ease-in-out infinite;
        }
        .btn-whatsapp {
          background: linear-gradient(135deg, #128C7E, #25D366);
          border-radius: 16px; height: 52px; font-weight: 700;
          font-size: 14px; color: white; border: none; width: 100%;
          cursor: pointer; transition: all 0.25s; display: flex;
          align-items: center; justify-content: center; gap: 10px;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(37,211,102,0.4);
        }
        .btn-whatsapp:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(37,211,102,0.6); }
        .glass-card {
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
        }
        .info-chip {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 11px 14px;
          display: flex; align-items: center; gap: 11px;
        }
        .step-line { flex: 1; height: 2px; background: rgba(255,255,255,0.15); }
        .step-line-filled { height: 100%; background: linear-gradient(90deg,#10b981,#6366f1); transition: width 0.5s; }
      `}</style>

      <div className="min-h-screen relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0b0f1e 0%, #111827 45%, #0d1a35 100%)' }}>

        {/* Arrière-plan décoratif */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute rounded-full opacity-25"
            style={{ width: 500, height: 500, top: '-15%', left: '-20%', background: 'radial-gradient(circle, #3730a3 0%, transparent 70%)' }} />
          <div className="absolute rounded-full opacity-15"
            style={{ width: 400, height: 400, bottom: '-10%', right: '-15%', background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
          <div className="absolute opacity-5" style={{
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.3) 1px,transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className={`relative z-10 flex flex-col min-h-screen px-4 py-5 max-w-md mx-auto ${visible ? 'page-in' : 'opacity-0'}`}>

          {/* ── HERO : Logos flottants ── */}
          <div className="relative text-center mb-5">
            <div className="flex items-center justify-center gap-3 mb-4">
              {/* Logos Mobile Money animés */}
              <div className="logo-1 w-11 h-11 rounded-2xl overflow-hidden shadow-lg" style={{ boxShadow: '0 4px 14px rgba(255,107,0,0.5)' }}>
                <OMLogo />
              </div>
              <div className="logo-2 w-11 h-11 rounded-2xl overflow-hidden shadow-lg" style={{ boxShadow: '0 4px 14px rgba(255,204,0,0.5)' }}>
                <MoMoLogo />
              </div>
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-indigo-400/40"
                  style={{ animation: 'spin-ring 8s linear infinite' }} />
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 24px rgba(99,102,241,0.6)' }}>
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="logo-3 w-11 h-11 rounded-2xl overflow-hidden shadow-lg" style={{ boxShadow: '0 4px 14px rgba(255,107,0,0.5)' }}>
                <WaveLogo />
              </div>
              <div className="logo-4 w-11 h-11 rounded-2xl overflow-hidden shadow-lg" style={{ boxShadow: '0 4px 14px rgba(0,48,135,0.5)' }}>
                <MoovLogo />
              </div>
            </div>

            <h1 className="text-white font-extrabold text-2xl leading-tight">Mise à jour du compte</h1>
            <p className="text-indigo-300/70 text-xs mt-1 tracking-widest uppercase">SIKA TEXTE BUSINESS</p>

            {/* Badge "Validé en 1h" */}
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full badge-live"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 dot-a" />
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 text-xs font-bold">Validé par l'admin en moins de 1 heure</span>
            </div>
          </div>

          {/* ── INFORMATIONS COMPTE ── */}
          {user && (
            <div className="glass-card p-4 mb-4 space-y-2">
              <p className="text-white/30 text-xs uppercase tracking-widest font-semibold mb-2">Votre compte</p>
              <div className="info-chip">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(99,102,241,0.25)' }}>
                  <User className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <p className="text-white/35 text-xs">Titulaire</p>
                  <p className="text-white font-bold text-sm">{user.fullName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="info-chip">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(16,185,129,0.2)' }}>
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/35 text-xs">N° Compte</p>
                    <p className="text-emerald-300 font-mono text-xs font-bold truncate">{user.referralCode || '—'}</p>
                  </div>
                </div>
                <div className="info-chip">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(167,139,250,0.2)' }}>
                    <Hash className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/35 text-xs">ID Compte</p>
                    <p className="text-violet-300 font-mono text-xs truncate">{user.id.substring(0, 10)}…</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ÉTAPES ── */}
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-all duration-300 ${pageState === 'form' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'}`}>
              {pageState !== 'form' ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <span className="text-xs font-medium text-indigo-300">Informations</span>
            <div className="step-line"><div className="step-line-filled" style={{ width: pageState !== 'form' ? '100%' : '0%' }} /></div>
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${pageState === 'payment' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/40'}`}>2</div>
            <span className={`text-xs font-medium ${pageState === 'payment' ? 'text-indigo-300' : 'text-white/30'}`}>Paiement</span>
          </div>

          {/* ── FORMULAIRE ── */}
          {pageState === "form" && (
            <div className="slide-in space-y-4">
              {/* Notice — Premium Card */}
              <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(251,191,36,0.25)' }}>
                {/* En-tête dégradé */}
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ background: 'linear-gradient(135deg, rgba(146,64,14,0.7) 0%, rgba(180,83,9,0.6) 50%, rgba(217,119,6,0.5) 100%)', borderBottom: '1px solid rgba(251,191,36,0.2)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.25)' }}>
                      <AlertTriangle className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-amber-200 font-extrabold text-sm leading-none">Mise à jour du compte requise</p>
                      <p className="text-amber-400/60 text-xs mt-0.5">Action obligatoire</p>
                    </div>
                  </div>
                  {/* Montant badge */}
                  <div className="text-right shrink-0">
                    <p className="text-amber-200 font-black text-lg leading-none">{amount.toLocaleString('fr-FR')}</p>
                    <p className="text-amber-400/70 text-xs">FCFA</p>
                  </div>
                </div>

                {/* Corps avec logos */}
                <div className="p-4 space-y-4" style={{ background: 'rgba(0,0,0,0.35)' }}>
                  <p className="text-white/60 text-xs leading-relaxed">
                    Afin de continuer à bénéficier pleinement des services de la plateforme, veuillez procéder à la mise à jour de votre compte via Mobile Money.
                  </p>

                  {/* Logos Mobile Money acceptés */}
                  <div>
                    <p className="text-white/30 text-xs uppercase tracking-widest mb-2 font-semibold">Paiement accepté via</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(255,107,0,0.15)', border: '1px solid rgba(255,107,0,0.3)' }}>
                        <div className="w-5 h-5 rounded-full shrink-0 overflow-hidden"><OMLogo /></div>
                        <span className="text-orange-300 text-xs font-bold">Orange Money</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(255,204,0,0.12)', border: '1px solid rgba(255,204,0,0.3)' }}>
                        <div className="w-5 h-5 rounded-full shrink-0 overflow-hidden"><MoMoLogo /></div>
                        <span className="text-yellow-300 text-xs font-bold">MTN MoMo</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.25)' }}>
                        <div className="w-5 h-5 rounded-full shrink-0 overflow-hidden"><WaveLogo /></div>
                        <span className="text-orange-300 text-xs font-bold">Wave</span>
                      </div>
                    </div>
                  </div>

                  {/* Avantages */}
                  <div className="space-y-2 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                      { icon: <Zap className="w-3.5 h-3.5 text-amber-400" />, text: 'Accès rétabli immédiatement après validation', color: 'text-amber-200' },
                      { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />, text: 'Retraits en attente traités automatiquement', color: 'text-emerald-200' },
                      { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />, text: 'Plateforme optimisée, stable et sécurisée', color: 'text-emerald-200' },
                      { icon: <Clock className="w-3.5 h-3.5 text-indigo-400" />, text: 'Validation par l\'administrateur en moins de 1 heure', color: 'text-indigo-200' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="shrink-0">{item.icon}</div>
                        <p className={`${item.color} text-xs`}>{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Champ téléphone */}
              <div className="glass-card p-4 space-y-3">
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-widest">
                  Numéro Mobile Money pour le paiement
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.3)' }}>
                    <Phone className="w-3.5 h-3.5 text-indigo-300" />
                  </div>
                  <Input
                    type="tel"
                    value={paymentPhone}
                    onChange={e => { setPaymentPhone(e.target.value); if (inputError) setInputError(""); }}
                    placeholder="Ex : 0708091011"
                    className="ci-input"
                  />
                </div>
                {inputError && (
                  <p className="flex items-center gap-1.5 text-red-400 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" /> {inputError}
                  </p>
                )}
                <p className="text-white/25 text-xs">Numéro depuis lequel vous enverrez les {amount.toLocaleString('fr-FR')} FCFA</p>
              </div>

              <button onClick={handleSubmit} disabled={submitMutation.isPending} className="btn-submit">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {submitMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                    : <><Zap className="w-4 h-4" /> Confirmer et accéder au paiement</>}
                </span>
              </button>

              {/* Garantie */}
              <div className="flex items-center justify-center gap-3 py-1">
                <div className="flex items-center gap-1.5 text-xs text-white/30">
                  <span className="dot-a w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Sécurisé
                </div>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1.5 text-xs text-white/30">
                  <span className="dot-b w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                  Vérifié par admin
                </div>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1.5 text-xs text-white/30">
                  <span className="dot-c w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                  &lt; 1h
                </div>
              </div>
            </div>
          )}

          {/* ── PAIEMENT ── */}
          {pageState === "payment" && (
            <div className="slide-in space-y-4">
              {/* Confirmation */}
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-300 font-bold text-sm">Demande transmise à l'administrateur</p>
                  <p className="text-white/40 text-xs mt-0.5">N° : <span className="font-mono text-white/70">{paymentPhone}</span></p>
                </div>
              </div>

              {/* Timer validation */}
              <div className="glass-card p-3 flex items-center gap-3"
                style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                  style={{ border: '2px solid rgba(16,185,129,0.4)', borderTopColor: '#10b981', animation: 'spin-ring 1.5s linear infinite' }}>
                </div>
                <div>
                  <p className="text-emerald-300 font-semibold text-xs">Validation en cours par l'administrateur</p>
                  <p className="text-white/30 text-xs">Votre demande sera traitée dans moins de <strong className="text-emerald-400">1 heure</strong></p>
                </div>
              </div>

              {/* Bouton paiement */}
              <div className="glass-card p-4 space-y-3">
                <p className="text-white font-bold text-sm">Étape suivante — Effectuer le paiement</p>
                <p className="text-white/40 text-xs">Réglez <span className="text-white font-bold">{amount.toLocaleString('fr-FR')} FCFA</span> via Mobile Money en cliquant ci-dessous</p>
                <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="btn-pay">
                  <ExternalLink className="w-5 h-5 shrink-0" />
                  <span>Payer {amount.toLocaleString('fr-FR')} FCFA</span>
                </a>
              </div>

              {/* Bouton WhatsApp */}
              {whatsappUrl ? (
                <div className="glass-card p-4 space-y-2">
                  <p className="text-white/50 text-xs font-semibold">Contacter l'administrateur</p>
                  <p className="text-white/30 text-xs">Après le paiement, envoyez une confirmation à l'administrateur via WhatsApp.</p>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                    <FaWhatsapp className="text-xl" />
                    <span>Contacter l'administrateur</span>
                  </a>
                </div>
              ) : (
                <div className="glass-card p-4 flex items-center gap-3">
                  <FaWhatsapp className="text-green-400 text-2xl shrink-0" />
                  <p className="text-white/40 text-xs">Après votre paiement, l'administrateur vérifiera et validera votre compte dans moins d'1 heure.</p>
                </div>
              )}

              <button onClick={() => setPageState("form")}
                className="w-full text-xs text-white/20 hover:text-white/50 transition-colors py-1">
                ← Modifier ma demande
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-5 flex items-center justify-center gap-2 text-white/15 text-xs">
            <Shield className="w-3 h-3" />
            <span>Procédure sécurisée — SIKA TEXTE BUSINESS</span>
          </div>
        </div>
      </div>
    </>
  );
}
