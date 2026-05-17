import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Shield, KeyRound, CheckCircle, Trash2, Eye, EyeOff,
  Smartphone, Lock, CreditCard, Copy, ChevronLeft,
  Wallet, Fingerprint, ShieldCheck, Zap, AlertTriangle,
  Bolt, ArrowRight,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────
   Interfaces
───────────────────────────────────────────────────────── */
interface SpaySettings { hasSavedPcsCode: boolean; savedPcsCodeMasked: string | null; lowLatencyMode: boolean; }
interface WithdrawalData { balance: number; isAccountActive: boolean; }
interface UserPcsCode { id: number; code: string; status: string; createdAt: string; }

/* ─────────────────────────────────────────────────────────
   CSS statique (hors composant — évite le glitch de ré-injection)
───────────────────────────────────────────────────────── */
const PAGE_STYLE = `
  @keyframes orbitA {
    from { transform: rotate(0deg)   translateX(54px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(54px) rotate(-360deg); }
  }
  @keyframes orbitB {
    from { transform: rotate(120deg)  translateX(76px) rotate(-120deg); }
    to   { transform: rotate(480deg)  translateX(76px) rotate(-480deg); }
  }
  @keyframes orbitC {
    from { transform: rotate(240deg)  translateX(98px) rotate(-240deg); }
    to   { transform: rotate(600deg)  translateX(98px) rotate(-600deg); }
  }
  @keyframes ringPulse {
    0%, 100% { opacity: 0.15; transform: scale(1); }
    50%      { opacity: 0.35; transform: scale(1.04); }
  }
  @keyframes slowspin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes flowDot {
    0%   { transform: translateX(0%)    scaleX(1); opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { transform: translateX(var(--flow-w,120px)) scaleX(1); opacity: 0; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .spay-card { animation: fadeSlideUp 0.45s ease both; }
  .spay-card:nth-child(2) { animation-delay: 0.07s; }
  .spay-card:nth-child(3) { animation-delay: 0.14s; }
  .shimmer-text {
    background: linear-gradient(90deg, #a5b4fc 0%, #fff 40%, #c4b5fd 60%, #a5b4fc 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }
`;

/* ─────────────────────────────────────────────────────────
   PulseRing
───────────────────────────────────────────────────────── */
function PulseRing({ color = "#10b981", size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
        style={{ background: color }} />
      <span className="relative inline-flex rounded-full" style={{ width: size * 0.55, height: size * 0.55, background: color }} />
    </span>
  );
}

/* ─────────────────────────────────────────────────────────
   HeroShield — logo central animé
───────────────────────────────────────────────────────── */
function HeroShield({ secured }: { secured: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Anneaux de fond */}
      {[110, 152, 196].map((d, i) => (
        <div key={i} className="absolute rounded-full border"
          style={{
            width: d, height: d,
            borderColor: "rgba(165,180,252,0.18)",
            animation: `ringPulse ${2.4 + i * 0.6}s ease-in-out ${i * 0.4}s infinite`,
          }} />
      ))}

      {/* Orbiteurs */}
      {[
        { anim: "orbitA 4s linear infinite", color: "#6366f1", icon: <Lock size={11} className="text-white" /> },
        { anim: "orbitB 6s linear infinite", color: "#8b5cf6", icon: <ShieldCheck size={11} className="text-white" /> },
        { anim: "orbitC 8s linear infinite", color: "#10b981", icon: <Zap size={11} className="text-white" /> },
      ].map((o, i) => (
        <div key={i} className="absolute inset-0 flex items-center justify-center"
          style={{ animation: o.anim }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: o.color, boxShadow: `0 0 12px ${o.color}88` }}>
            {o.icon}
          </div>
        </div>
      ))}

      {/* Logo central */}
      <div className="relative z-10 w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)",
          boxShadow: "0 0 0 3px rgba(99,102,241,0.3), 0 0 40px rgba(99,102,241,0.4)",
        }}>
        <Shield size={44} className="text-white" strokeWidth={1.8} />
        {secured && (
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
            <CheckCircle size={16} className="text-white" strokeWidth={2.5} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SecurityBadges — logos sécurité
───────────────────────────────────────────────────────── */
function SecurityBadges() {
  const badges = [
    { label: "AES-256", sub: "Chiffrement", color: "#6366f1" },
    { label: "TLS 1.3", sub: "Transport",   color: "#8b5cf6" },
    { label: "PCS",     sub: "SecurePay",   color: "#7c3aed" },
    { label: "SSL",     sub: "Certificat",  color: "#4f46e5" },
  ];
  return (
    <div className="flex gap-2 px-4 overflow-x-auto pb-1 scrollbar-none">
      {badges.map((b, i) => (
        <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-2xl border"
          style={{
            background: `${b.color}15`,
            borderColor: `${b.color}35`,
            minWidth: 72,
          }}>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: `${b.color}25` }}>
            <Lock size={13} style={{ color: b.color }} />
          </div>
          <p className="text-white font-black text-[10px] leading-none">{b.label}</p>
          <p className="text-white/40 text-[8px] font-mono">{b.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FlowDiagram — flux de paiement animé
───────────────────────────────────────────────────────── */
function FlowDiagram() {
  const [step, setStep] = useState(0);
  const [dot, setDot]   = useState<number | null>(null);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const iv = setInterval(() => setStep(s => (s + 1) % 4), 1600);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    setDot(step);
    const t = setTimeout(() => setDot(null), 1400);
    return () => clearTimeout(t);
  }, [step]);

  const nodes = [
    { label: "Retrait",   color: "#ef4444", icon: <Wallet size={18} className="text-white" />,     bg: "from-red-500 to-rose-600" },
    { label: "SPAY",      color: "#6366f1", icon: <Shield size={18} className="text-white" />,     bg: "from-indigo-500 to-violet-600" },
    { label: "PCS",       color: "#8b5cf6", icon: <KeyRound size={18} className="text-white" />,   bg: "from-violet-500 to-purple-600" },
    { label: "Mobile",    color: "#10b981", icon: <Smartphone size={18} className="text-white" />, bg: "from-emerald-500 to-green-600" },
  ];

  const stepLabels = [
    "Demande de retrait initiée et chiffrée",
    "SPAY réceptionne et authentifie la transaction",
    "PCS Secure Pay valide et autorise le transfert",
    "Fonds crédités sur votre Mobile Money ✓",
  ];

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="flex items-center gap-1">
        {nodes.map((n, i) => {
          const active = step === i;
          const past   = step > i;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              {/* Node */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ minWidth: 48 }}>
                <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br ${n.bg} transition-all duration-500 ${active ? "scale-115" : past ? "opacity-80" : "opacity-35"}`}
                  style={active ? { boxShadow: `0 0 20px ${n.color}60, 0 0 0 3px ${n.color}30` } : {}}>
                  {n.icon}
                  {active && <span className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                    style={{ background: n.color }} />}
                  {past && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <CheckCircle size={9} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className={`text-[9px] font-bold text-center transition-colors duration-300 ${active ? "text-white" : past ? "text-white/60" : "text-white/25"}`}>
                  {n.label}
                </span>
              </div>

              {/* Track */}
              {i < nodes.length - 1 && (
                <div ref={el => { trackRefs.current[i] = el; }}
                  className="flex-1 mx-1 relative" style={{ height: 3, marginBottom: 18 }}>
                  <div className="absolute inset-0 rounded-full bg-white/10" />
                  <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                    style={{
                      width: step > i ? "100%" : step === i ? "55%" : "0%",
                      background: `linear-gradient(90deg, ${nodes[i].color}, ${nodes[i+1].color})`,
                    }} />
                  {dot === i + 1 && (
                    <div className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2"
                      style={{
                        left: 0,
                        background: nodes[i].color,
                        boxShadow: `0 0 8px ${nodes[i].color}`,
                        animation: "flowDot 1.4s ease-in-out forwards",
                        "--flow-w": `${(trackRefs.current[i]?.offsetWidth ?? 60) - 12}px`,
                      } as React.CSSProperties}
                    />
                  )}
                  <ArrowRight size={8} className="absolute right-0 top-1/2 -translate-y-1/2 text-white/20" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Description */}
      <div className="mt-4 rounded-2xl px-4 py-3 text-center"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className={`text-xs leading-relaxed transition-colors duration-300 ${step === 3 ? "text-emerald-300 font-semibold" : "text-white/55"}`}>
          {stepLabels[step]}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   AccessDenied
───────────────────────────────────────────────────────── */
function AccessDenied({ paymentInfo }: { paymentInfo?: { activationAmount?: string } }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg,#0f0c29,#1a1040,#1e1b4b)" }}>
      <div className="px-4 pt-5 pb-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Link href="/">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            <ChevronLeft size={20} className="text-white" />
          </div>
        </Link>
        <p className="text-white font-black text-lg">Réseau Spay</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        {/* Animated lock */}
        <div className="relative mb-10 flex items-center justify-center" style={{ width: 180, height: 180 }}>
          {[90, 130, 170].map((d, i) => (
            <div key={i} className="absolute rounded-full border border-rose-500/20"
              style={{ width: d, height: d, animation: `ringPulse ${2 + i * 0.7}s ease-in-out ${i * 0.3}s infinite` }} />
          ))}
          <div className="relative z-10 w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7f1d1d,#dc2626)", boxShadow: "0 0 0 3px rgba(220,38,38,0.25), 0 0 30px rgba(220,38,38,0.3)" }}>
            <Lock size={36} className="text-white" strokeWidth={1.8} />
          </div>
        </div>

        <p className="text-rose-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">ERREUR 403 — ACCÈS REFUSÉ</p>
        <h1 className="text-white font-black text-2xl leading-tight mb-3 text-center">Compte Non Activé</h1>

        <div className="mb-5 rounded-2xl px-5 py-3.5 w-full max-w-xs"
          style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <p className="text-rose-400 text-[11px] font-mono leading-loose">
            {">"} SPAY_AUTH_GATE: ACCOUNT_INACTIVE<br />
            {">"} ACCESS: <span className="text-rose-300 font-black">DENIED</span><br />
            {">"} ACTION: Activation requise
          </p>
        </div>

        <p className="text-white/40 text-sm text-center leading-relaxed mb-8 max-w-xs">
          L'accès au réseau Spay est réservé aux comptes activés.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <Link href="/activation">
            <button className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
              style={{ background: "linear-gradient(135deg,#4338ca,#6d28d9)", boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}>
              <CreditCard size={17} />
              Activer — {paymentInfo?.activationAmount ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR") : "3 600"} FCFA
            </button>
          </Link>
          <Link href="/">
            <button className="w-full py-3 rounded-2xl font-bold text-sm text-white/40 border"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              Retour au tableau de bord
            </button>
          </Link>
        </div>
      </div>
      <style>{PAGE_STYLE}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Page principale
───────────────────────────────────────────────────────── */
export default function SpayNetwork() {
  const { toast } = useToast();
  const [pcsInput, setPcsInput]         = useState("");
  const [showPcsInput, setShowPcsInput] = useState(false);
  const [showCode, setShowCode]         = useState(false);
  const [copiedPcsId, setCopiedPcsId]   = useState<number | null>(null);
  const [packets, setPackets]           = useState(0);
  const packetsRef = useRef(0);

  const { data: paymentInfo } = useQuery<{ activationAmount?: string }>({ queryKey: ["/api/activation/payment-info"] });
  const { data: withdrawalData } = useQuery<WithdrawalData>({ queryKey: ["/api/withdrawal"] });
  const { data: settings, isLoading } = useQuery<SpaySettings>({ queryKey: ["/api/user/spay-settings"] });
  const { data: userPcsCodes = [] } = useQuery<UserPcsCode[]>({
    queryKey: ["/api/user/pcs-codes"],
    staleTime: 0, gcTime: 0, refetchInterval: 8000, refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const iv = setInterval(() => {
      packetsRef.current += Math.floor(Math.random() * 320 + 80);
      setPackets(packetsRef.current);
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  const savePcsMutation = useMutation({
    mutationFn: async (pcsCode: string) => {
      const res  = await apiRequest("POST", "/api/user/spay-settings/pcs-code", { pcsCode });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      toast({ title: "Code PCS configuré ✓", description: "Retraits automatiques sans saisie" });
      setPcsInput(""); setShowPcsInput(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/spay-settings"] });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const deletePcsMutation = useMutation({
    mutationFn: async () => {
      const res  = await apiRequest("DELETE", "/api/user/spay-settings/pcs-code", {});
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      toast({ title: "Code PCS supprimé" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/spay-settings"] });
    },
  });

  if (withdrawalData && !withdrawalData.isAccountActive) return <AccessDenied paymentInfo={paymentInfo} />;

  return (
    <div className="min-h-screen pb-28" style={{ background: "linear-gradient(160deg,#0f0c29 0%,#1a1040 40%,#1e1b4b 100%)" }}>
      <style>{PAGE_STYLE}</style>

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Link href="/">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center active:opacity-70 transition-opacity"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            <ChevronLeft size={20} className="text-white" />
          </div>
        </Link>
        <div className="flex-1">
          <p className="text-indigo-300/50 text-[9px] font-black uppercase tracking-[0.3em] font-mono">SPAY NETWORK · v4.1</p>
          <h1 className="text-white font-black text-xl leading-tight">Réseau Spay</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
          <PulseRing color="#10b981" size={8} />
          <span className="text-emerald-400 text-[10px] font-black">EN LIGNE</span>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="flex flex-col items-center pt-8 pb-6 px-4">
        <HeroShield secured={!!settings?.hasSavedPcsCode} />

        <div className="mt-6 text-center">
          <p className="shimmer-text text-2xl font-black tracking-tight leading-tight">SPAY SECURE</p>
          <p className="shimmer-text text-2xl font-black tracking-tight leading-tight">NETWORK</p>
          <p className="text-white/35 text-xs font-mono mt-2 tracking-widest">INFRASTRUCTURE · WEST AFRICA</p>
        </div>

        {/* Compteur paquets */}
        <div className="mt-5 flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-white/35 text-[10px] font-mono">
            PKT#{packets.toString().padStart(8, "0")} · TLS/1.3 · AES-256-GCM
          </span>
        </div>
      </div>

      {/* ── BADGES SÉCURITÉ ── */}
      <SecurityBadges />

      {/* ── FLOW DIAGRAM ── */}
      <div className="mx-4 mt-5 rounded-[22px] overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(165,180,252,0.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
        <div className="px-5 pt-4 pb-1 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex gap-1">
            {[6, 10, 16].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full animate-pulse bg-indigo-400/60"
                style={{ width: w, animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <p className="text-white/70 font-black text-xs tracking-wider uppercase">Flux de Paiement Live</p>
          <div className="ml-auto">
            <PulseRing color="#6366f1" size={8} />
          </div>
        </div>
        <FlowDiagram />
      </div>

      {/* ── CARDS ── */}
      <div className="px-4 mt-5 space-y-4">

        {/* PCS SECURE PAY */}
        <div className="spay-card rounded-[22px] overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${settings?.hasSavedPcsCode ? "rgba(16,185,129,0.3)" : "rgba(165,180,252,0.15)"}`,
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}>
          {/* En-tête carte */}
          <div className="px-5 pt-5 pb-4 flex items-center gap-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg,#4338ca,#7c3aed)",
                boxShadow: "0 0 16px rgba(99,102,241,0.35)",
              }}>
              <KeyRound size={22} className="text-white" strokeWidth={1.8} />
              {settings?.hasSavedPcsCode && (
                <div className="absolute -top-1.5 -right-1.5">
                  <PulseRing color="#10b981" size={10} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base leading-tight">PCS Secure Pay</p>
              <p className="text-white/35 text-[10px] font-mono mt-0.5">module://auth/pcs-gateway</p>
            </div>
            <div className={`text-[9px] font-black px-3 py-1.5 rounded-full ${
              settings?.hasSavedPcsCode
                ? "text-emerald-300 bg-emerald-400/10 border border-emerald-400/25"
                : "text-amber-300 bg-amber-400/10 border border-amber-400/25"
            }`}>
              {settings?.hasSavedPcsCode ? "CONFIGURÉ" : "EN ATTENTE"}
            </div>
          </div>

          {/* Corps */}
          <div className="px-5 py-4">
            {isLoading ? (
              <div className="h-11 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
            ) : settings?.hasSavedPcsCode ? (
              <div className="space-y-3">
                {/* Code actif */}
                <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.15)" }}>
                    <ShieldCheck size={20} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mb-0.5">Code Actif</p>
                    <p className="text-white font-mono font-bold text-sm tracking-wider truncate">{settings.savedPcsCodeMasked}</p>
                  </div>
                  <PulseRing color="#10b981" size={10} />
                </div>

                {/* Info */}
                <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
                  style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <Zap size={13} className="text-indigo-400 flex-shrink-0" />
                  <p className="text-indigo-300/70 text-[10px]">Retraits traités automatiquement sans saisie manuelle</p>
                </div>

                {/* Supprimer */}
                <button onClick={() => deletePcsMutation.mutate()} disabled={deletePcsMutation.isPending}
                  className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                  <Trash2 size={13} />
                  {deletePcsMutation.isPending ? "Suppression..." : "Supprimer le code"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {!showPcsInput ? (
                  <button onClick={() => setShowPcsInput(true)}
                    className="w-full py-3.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    style={{
                      background: "linear-gradient(135deg,#4338ca,#7c3aed)",
                      boxShadow: "0 0 20px rgba(99,102,241,0.35)",
                    }}>
                    <Fingerprint size={17} /> Configurer mon code PCS
                  </button>
                ) : (
                  <>
                    <div className="relative">
                      <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type={showCode ? "text" : "password"}
                        value={pcsInput}
                        onChange={e => setPcsInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                        placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                        autoFocus
                        className="w-full h-12 pl-10 pr-12 rounded-xl text-sm font-mono font-bold text-white outline-none tracking-wider placeholder:text-white/20"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1.5px solid rgba(99,102,241,0.4)",
                          caretColor: "#818cf8",
                        }}
                      />
                      <button type="button" onClick={() => setShowCode(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                        {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowPcsInput(false); setPcsInput(""); }}
                        className="flex-1 py-3 rounded-xl text-xs font-bold text-white/40 transition-all"
                        style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                        Annuler
                      </button>
                      <button
                        onClick={() => pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                        disabled={savePcsMutation.isPending || !pcsInput.trim()}
                        className="flex-[2] py-3 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#4338ca,#7c3aed)" }}>
                        <CheckCircle size={13} />
                        {savePcsMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MES CODES PCS */}
        <div className="spay-card rounded-[22px] overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(165,180,252,0.15)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}>
          <div className="px-5 pt-5 pb-3 flex items-center gap-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(139,92,246,0.15)" }}>
              <KeyRound size={16} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-black text-sm">Mes Codes PCS</p>
              <p className="text-white/30 text-[9px] font-mono">auth/user-tokens</p>
            </div>
            <span className="text-white/30 text-[10px] font-mono">{userPcsCodes.length} code{userPcsCodes.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="px-5 py-4 space-y-3">
            {userPcsCodes.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3.5"
                style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)" }}>
                <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
                <p className="text-amber-300/70 text-[11px]">Aucun code PCS attribué à votre compte.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userPcsCodes.map(pcs => (
                  <div key={pcs.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{
                      background: pcs.status === "actif" ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${pcs.status === "actif" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)"}`,
                    }}>
                    <div className="flex-shrink-0">
                      {pcs.status === "actif"
                        ? <PulseRing color="#10b981" size={10} />
                        : <div className="w-2.5 h-2.5 rounded-full bg-white/15" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <code className="text-[12px] font-mono font-bold text-white/85 block truncate tracking-wider">{pcs.code}</code>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider ${pcs.status === "actif" ? "text-emerald-400" : "text-white/25"}`}>
                          {pcs.status === "actif" ? "● Actif" : "○ Inactif"}
                        </span>
                        <span className="text-white/15 text-[9px]">·</span>
                        <span className="text-white/25 text-[9px] font-mono">
                          {new Date(pcs.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => {
                        navigator.clipboard.writeText(pcs.code);
                        setCopiedPcsId(pcs.id);
                        setTimeout(() => setCopiedPcsId(null), 1500);
                        toast({ title: "Code copié !" });
                      }}
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {copiedPcsId === pcs.id
                        ? <CheckCircle size={14} className="text-emerald-400" />
                        : <Copy size={14} className="text-white/40" />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* CTA payer */}
            <Link href="/pay/codepcs">
              <a className="block w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-all"
                style={{
                  background: "linear-gradient(135deg,#4338ca,#7c3aed)",
                  boxShadow: "0 0 20px rgba(99,102,241,0.3)",
                }}>
                <CreditCard size={16} /> Payer mon code PCS Secure Pay
              </a>
            </Link>

            {/* Activer code inactif */}
            {userPcsCodes.some(c => c.status !== "actif") && (
              <div className="p-4 rounded-2xl"
                style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <p className="text-[11px] text-amber-300/70 leading-relaxed mb-3">
                  L'activation est <span className="font-bold text-amber-300">obligatoire</span> pour finaliser la configuration SIKApay via SecurPay.
                </p>
                <a href="https://sikatexte.site/pay/88cb6331" target="_blank" rel="noopener noreferrer"
                  className="block w-full py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-all"
                  style={{ background: "linear-gradient(135deg,#d97706,#ea580c)", boxShadow: "0 0 16px rgba(217,119,6,0.3)" }}>
                  <Bolt size={14} /> Rendre mon code PCS actif
                </a>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER SÉCURITÉ */}
        <div className="spay-card rounded-[22px] px-5 py-4 flex items-center gap-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)", border: "1px solid rgba(165,180,252,0.2)" }}>
            <Shield size={20} className="text-indigo-300" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-bold">Infrastructure sécurisée</p>
            <p className="text-white/25 text-[10px] font-mono mt-0.5">west-africa-cdn · all-systems-ok</p>
          </div>
          <PulseRing color="#10b981" size={10} />
        </div>

      </div>
    </div>
  );
}
