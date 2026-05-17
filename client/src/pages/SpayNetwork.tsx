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
    from { transform: rotate(0deg)   translateX(50px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
  }
  @keyframes orbitB {
    from { transform: rotate(120deg)  translateX(70px) rotate(-120deg); }
    to   { transform: rotate(480deg)  translateX(70px) rotate(-480deg); }
  }
  @keyframes orbitC {
    from { transform: rotate(240deg)  translateX(90px) rotate(-240deg); }
    to   { transform: rotate(600deg)  translateX(90px) rotate(-600deg); }
  }
  @keyframes ringPulse {
    0%, 100% { opacity: 0.2; transform: scale(1); }
    50%      { opacity: 0.45; transform: scale(1.04); }
  }
  @keyframes slowspin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes flowDot {
    0%   { transform: translateX(0px);                  opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { transform: translateX(var(--flow-w,120px));   opacity: 0; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmerLight {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .spay-card { animation: fadeSlideUp 0.4s ease both; }
  .spay-card:nth-child(2) { animation-delay: 0.07s; }
  .spay-card:nth-child(3) { animation-delay: 0.14s; }
  .shimmer-indigo {
    background: linear-gradient(90deg, #4338ca 0%, #6d28d9 35%, #4f46e5 60%, #4338ca 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmerLight 3s linear infinite;
  }
`;

/* ─────────────────────────────────────────────────────────
   PulseRing
───────────────────────────────────────────────────────── */
function PulseRing({ color = "#10b981", size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
        style={{ background: color }} />
      <span className="relative inline-flex rounded-full" style={{ width: size * 0.55, height: size * 0.55, background: color }} />
    </span>
  );
}

/* ─────────────────────────────────────────────────────────
   HeroShield — logo central animé (anneaux clairs)
───────────────────────────────────────────────────────── */
function HeroShield({ secured }: { secured: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 210, height: 210 }}>
      {/* Anneaux */}
      {[100, 140, 180].map((d, i) => (
        <div key={i} className="absolute rounded-full border"
          style={{
            width: d, height: d,
            borderColor: i === 0 ? "rgba(99,102,241,0.25)" : i === 1 ? "rgba(139,92,246,0.18)" : "rgba(99,102,241,0.1)",
            animation: `ringPulse ${2.2 + i * 0.6}s ease-in-out ${i * 0.35}s infinite`,
          }} />
      ))}

      {/* Orbiteurs */}
      {[
        { anim: "orbitA 4.5s linear infinite", color: "#4f46e5", icon: <Lock size={11} className="text-white" /> },
        { anim: "orbitB 6.5s linear infinite", color: "#7c3aed", icon: <ShieldCheck size={11} className="text-white" /> },
        { anim: "orbitC 9s   linear infinite", color: "#10b981", icon: <Zap size={11} className="text-white" /> },
      ].map((o, i) => (
        <div key={i} className="absolute inset-0 flex items-center justify-center"
          style={{ animation: o.anim }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-md"
            style={{ background: o.color, boxShadow: `0 0 10px ${o.color}55` }}>
            {o.icon}
          </div>
        </div>
      ))}

      {/* Logo central */}
      <div className="relative z-10 w-24 h-24 rounded-[28px] flex items-center justify-center shadow-xl"
        style={{
          background: "linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)",
          boxShadow: "0 0 0 4px rgba(99,102,241,0.15), 0 12px 40px rgba(99,102,241,0.35)",
        }}>
        <Shield size={44} className="text-white" strokeWidth={1.8} />
        {secured && (
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
            <CheckCircle size={16} className="text-white" strokeWidth={2.5} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SecurityBadges
───────────────────────────────────────────────────────── */
function SecurityBadges() {
  const badges = [
    { label: "AES-256", sub: "Chiffrement", color: "#4f46e5" },
    { label: "TLS 1.3", sub: "Transport",   color: "#7c3aed" },
    { label: "PCS",     sub: "SecurePay",   color: "#6d28d9" },
    { label: "SSL",     sub: "Certificat",  color: "#4338ca" },
  ];
  return (
    <div className="flex gap-2.5 px-4 overflow-x-auto pb-1 scrollbar-none">
      {badges.map((b, i) => (
        <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-2xl border"
          style={{
            background: `${b.color}08`,
            borderColor: `${b.color}22`,
            minWidth: 74,
          }}>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: `${b.color}15` }}>
            <Lock size={13} style={{ color: b.color }} />
          </div>
          <p className="font-black text-[10px] leading-none" style={{ color: b.color }}>{b.label}</p>
          <p className="text-slate-400 text-[8px] font-mono">{b.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FlowDiagram
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
    { label: "Retrait",  color: "#ef4444", icon: <Wallet size={17} className="text-white" />,     bg: "linear-gradient(135deg,#ef4444,#dc2626)" },
    { label: "SPAY",     color: "#4f46e5", icon: <Shield size={17} className="text-white" />,     bg: "linear-gradient(135deg,#4f46e5,#4338ca)" },
    { label: "PCS",      color: "#7c3aed", icon: <KeyRound size={17} className="text-white" />,   bg: "linear-gradient(135deg,#7c3aed,#6d28d9)" },
    { label: "Mobile",   color: "#10b981", icon: <Smartphone size={17} className="text-white" />, bg: "linear-gradient(135deg,#10b981,#059669)" },
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
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ minWidth: 48 }}>
                <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500"
                  style={{
                    background: n.bg,
                    opacity: active ? 1 : past ? 0.85 : 0.3,
                    transform: active ? "scale(1.12)" : "scale(1)",
                    boxShadow: active ? `0 0 18px ${n.color}45, 0 0 0 3px ${n.color}20` : "none",
                  }}>
                  {n.icon}
                  {active && <span className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                    style={{ background: n.color }} />}
                  {past && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                      <CheckCircle size={9} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold text-center transition-colors duration-300"
                  style={{ color: active ? n.color : past ? "#475569" : "#cbd5e1" }}>
                  {n.label}
                </span>
              </div>

              {i < nodes.length - 1 && (
                <div ref={el => { trackRefs.current[i] = el; }}
                  className="flex-1 mx-1 relative" style={{ height: 3, marginBottom: 18 }}>
                  <div className="absolute inset-0 rounded-full bg-slate-200" />
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
                        boxShadow: `0 0 8px ${nodes[i].color}88`,
                        animation: "flowDot 1.4s ease-in-out forwards",
                        "--flow-w": `${(trackRefs.current[i]?.offsetWidth ?? 60) - 12}px`,
                      } as React.CSSProperties}
                    />
                  )}
                  <ArrowRight size={8} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl px-4 py-3 text-center bg-slate-50 border border-slate-100">
        <p className={`text-xs leading-relaxed transition-colors duration-300 ${step === 3 ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-red-50/30 to-rose-50/20">
      <div className="px-4 pt-5 pb-4 flex items-center gap-3 bg-white/80 backdrop-blur border-b border-slate-100">
        <Link href="/">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center active:bg-slate-200">
            <ChevronLeft size={20} className="text-slate-600" />
          </div>
        </Link>
        <p className="text-slate-800 font-black text-lg">Réseau Spay</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <div className="relative mb-10 flex items-center justify-center" style={{ width: 180, height: 180 }}>
          {[90, 130, 170].map((d, i) => (
            <div key={i} className="absolute rounded-full border border-rose-200"
              style={{ width: d, height: d, animation: `ringPulse ${2 + i * 0.7}s ease-in-out ${i * 0.3}s infinite` }} />
          ))}
          <div className="relative z-10 w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl"
            style={{ background: "linear-gradient(135deg,#fecdd3,#fda4af)", boxShadow: "0 0 0 3px rgba(251,113,133,0.2), 0 12px 30px rgba(239,68,68,0.2)" }}>
            <Lock size={34} className="text-rose-500" strokeWidth={1.8} />
          </div>
        </div>

        <p className="text-rose-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">ERREUR 403 — ACCÈS REFUSÉ</p>
        <h1 className="text-slate-800 font-black text-2xl leading-tight mb-3 text-center">Compte Non Activé</h1>

        <div className="mb-5 rounded-2xl px-5 py-3.5 w-full max-w-xs bg-rose-50 border border-rose-200">
          <p className="text-rose-500 text-[11px] font-mono leading-loose">
            {">"} SPAY_AUTH_GATE: ACCOUNT_INACTIVE<br />
            {">"} ACCESS: <span className="text-rose-600 font-black">DENIED</span><br />
            {">"} ACTION: Activation requise
          </p>
        </div>

        <p className="text-slate-400 text-sm text-center leading-relaxed mb-8 max-w-xs">
          L'accès au réseau Spay est réservé aux comptes activés.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <Link href="/activation">
            <button className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-indigo-200"
              style={{ background: "linear-gradient(135deg,#4338ca,#6d28d9)" }}>
              <CreditCard size={17} />
              Activer — {paymentInfo?.activationAmount ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR") : "3 600"} FCFA
            </button>
          </Link>
          <Link href="/">
            <button className="w-full py-3 rounded-2xl font-bold text-sm text-slate-500 border-2 border-slate-200">
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
    <div className="min-h-screen pb-28 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/20">
      <style>{PAGE_STYLE}</style>

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #312e81 0%, #4338ca 55%, #4f46e5 100%)" }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(#a5b4fc 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />

        <div className="relative flex items-center gap-3 px-4 pt-5 pb-4">
          <Link href="/">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center active:bg-white/25 transition-all">
              <ChevronLeft size={20} className="text-white" />
            </div>
          </Link>
          <div className="flex-1">
            <p className="text-indigo-200/60 text-[9px] font-black uppercase tracking-[0.28em] font-mono">SPAY NETWORK · v4.1</p>
            <h1 className="text-white font-black text-xl leading-tight">Réseau Spay</h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
            <PulseRing color="#10b981" size={8} />
            <span className="text-emerald-300 text-[10px] font-black">EN LIGNE</span>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="flex flex-col items-center pt-8 pb-4 px-4">
        <HeroShield secured={!!settings?.hasSavedPcsCode} />

        <div className="mt-5 text-center">
          <p className="shimmer-indigo text-[26px] font-black tracking-tight leading-none">SPAY SECURE</p>
          <p className="shimmer-indigo text-[26px] font-black tracking-tight leading-none">NETWORK</p>
          <p className="text-slate-400 text-[10px] font-mono mt-2 tracking-widest uppercase">Infrastructure · West Africa</p>
        </div>

        {/* Compteur paquets */}
        <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-100 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-slate-400 text-[10px] font-mono">
            PKT#{packets.toString().padStart(8, "0")} · TLS/1.3 · AES-256-GCM
          </span>
        </div>
      </div>

      {/* ── BADGES SÉCURITÉ ── */}
      <SecurityBadges />

      {/* ── FLOW DIAGRAM ── */}
      <div className="mx-4 mt-5 rounded-[22px] overflow-hidden bg-white border border-slate-100 shadow-sm shadow-indigo-100/60">
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-slate-100">
          <div className="flex gap-1">
            {[6, 10, 16].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full animate-pulse bg-indigo-300"
                style={{ width: w, animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <p className="text-slate-600 font-black text-xs tracking-wider uppercase">Flux de Paiement Live</p>
          <div className="ml-auto">
            <PulseRing color="#6366f1" size={8} />
          </div>
        </div>
        <FlowDiagram />
      </div>

      {/* ── CARTES ── */}
      <div className="px-4 mt-5 space-y-4">

        {/* PCS SECURE PAY */}
        <div className="spay-card rounded-[22px] overflow-hidden bg-white border shadow-sm"
          style={{ borderColor: settings?.hasSavedPcsCode ? "rgba(16,185,129,0.3)" : "#e2e8f0", boxShadow: "0 2px 16px rgba(99,102,241,0.07)" }}>
          <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-slate-100">
            <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ background: "linear-gradient(135deg,#4338ca,#7c3aed)", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>
              <KeyRound size={22} className="text-white" strokeWidth={1.8} />
              {settings?.hasSavedPcsCode && (
                <div className="absolute -top-1.5 -right-1.5">
                  <PulseRing color="#10b981" size={10} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 font-black text-base leading-tight">PCS Secure Pay</p>
              <p className="text-slate-400 text-[10px] font-mono mt-0.5">module://auth/pcs-gateway</p>
            </div>
            <div className={`text-[9px] font-black px-3 py-1.5 rounded-full border ${
              settings?.hasSavedPcsCode
                ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                : "text-amber-600 bg-amber-50 border-amber-200"
            }`}>
              {settings?.hasSavedPcsCode ? "CONFIGURÉ" : "EN ATTENTE"}
            </div>
          </div>

          <div className="px-5 py-4">
            {isLoading ? (
              <div className="h-11 rounded-xl animate-pulse bg-slate-100" />
            ) : settings?.hasSavedPcsCode ? (
              <div className="space-y-3">
                <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3 bg-emerald-50 border border-emerald-100">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-100">
                    <ShieldCheck size={20} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-600 text-[9px] font-black uppercase tracking-widest mb-0.5">Code Actif</p>
                    <p className="text-slate-800 font-mono font-bold text-sm tracking-wider truncate">{settings.savedPcsCodeMasked}</p>
                  </div>
                  <PulseRing color="#10b981" size={10} />
                </div>

                <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-indigo-50 border border-indigo-100">
                  <Zap size={13} className="text-indigo-500 flex-shrink-0" />
                  <p className="text-indigo-600 text-[10px]">Retraits traités automatiquement sans saisie manuelle</p>
                </div>

                <button onClick={() => deletePcsMutation.mutate()} disabled={deletePcsMutation.isPending}
                  className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100">
                  <Trash2 size={13} />
                  {deletePcsMutation.isPending ? "Suppression..." : "Supprimer le code"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {!showPcsInput ? (
                  <button onClick={() => setShowPcsInput(true)}
                    className="w-full py-3.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
                    style={{ background: "linear-gradient(135deg,#4338ca,#7c3aed)" }}>
                    <Fingerprint size={17} /> Configurer mon code PCS
                  </button>
                ) : (
                  <>
                    <div className="relative">
                      <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showCode ? "text" : "password"}
                        value={pcsInput}
                        onChange={e => setPcsInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                        placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                        autoFocus
                        className="w-full h-12 pl-10 pr-12 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none bg-slate-50 border-2 border-indigo-200 focus:border-indigo-400 tracking-wider"
                      />
                      <button type="button" onClick={() => setShowCode(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowPcsInput(false); setPcsInput(""); }}
                        className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-500 border-2 border-slate-200 hover:bg-slate-50 transition-all">
                        Annuler
                      </button>
                      <button
                        onClick={() => pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                        disabled={savePcsMutation.isPending || !pcsInput.trim()}
                        className="flex-[2] py-3 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40 shadow-md shadow-indigo-200"
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
        <div className="spay-card rounded-[22px] overflow-hidden bg-white border border-slate-100 shadow-sm" style={{ boxShadow: "0 2px 16px rgba(99,102,241,0.07)" }}>
          <div className="px-5 pt-5 pb-3 flex items-center gap-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-50">
              <KeyRound size={16} className="text-violet-500" />
            </div>
            <div className="flex-1">
              <p className="text-slate-800 font-black text-sm">Mes Codes PCS</p>
              <p className="text-slate-400 text-[9px] font-mono">auth/user-tokens</p>
            </div>
            <span className="text-slate-400 text-[10px] font-mono">{userPcsCodes.length} code{userPcsCodes.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="px-5 py-4 space-y-3">
            {userPcsCodes.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3.5 bg-amber-50 border border-amber-200">
                <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
                <p className="text-amber-700 text-[11px]">Aucun code PCS attribué à votre compte.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userPcsCodes.map(pcs => (
                  <div key={pcs.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{
                      background: pcs.status === "actif" ? "#f0fdf4" : "#f8fafc",
                      border: `1px solid ${pcs.status === "actif" ? "#bbf7d0" : "#e2e8f0"}`,
                    }}>
                    <div className="flex-shrink-0">
                      {pcs.status === "actif"
                        ? <PulseRing color="#10b981" size={10} />
                        : <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <code className="text-[12px] font-mono font-bold text-slate-700 block truncate tracking-wider">{pcs.code}</code>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider ${pcs.status === "actif" ? "text-emerald-600" : "text-slate-400"}`}>
                          {pcs.status === "actif" ? "● Actif" : "○ Inactif"}
                        </span>
                        <span className="text-slate-300 text-[9px]">·</span>
                        <span className="text-slate-400 text-[9px] font-mono">
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
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-white border border-slate-200 shadow-sm">
                      {copiedPcsId === pcs.id
                        ? <CheckCircle size={14} className="text-emerald-500" />
                        : <Copy size={14} className="text-slate-400" />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* CTA payer */}
            <Link href="/pay/codepcs">
              <a className="block w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
                style={{ background: "linear-gradient(135deg,#4338ca,#7c3aed)" }}>
                <CreditCard size={16} /> Payer mon code PCS Secure Pay
              </a>
            </Link>

            {/* Activer code inactif */}
            {userPcsCodes.some(c => c.status !== "actif") && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] text-amber-800 leading-relaxed mb-3">
                  L'activation est <span className="font-bold">obligatoire</span> pour finaliser la configuration SIKApay via SecurPay.
                </p>
                <a href="https://sikatexte.site/pay/88cb6331" target="_blank" rel="noopener noreferrer"
                  className="block w-full py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-all shadow-md shadow-amber-200"
                  style={{ background: "linear-gradient(135deg,#d97706,#ea580c)" }}>
                  <Bolt size={14} /> Rendre mon code PCS actif
                </a>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER SÉCURITÉ */}
        <div className="spay-card rounded-[22px] overflow-hidden"
          style={{ background: "linear-gradient(135deg,#312e81,#4338ca,#4f46e5)", boxShadow: "0 4px 20px rgba(99,102,241,0.25)" }}>
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(#a5b4fc 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div className="relative px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/15">
              <Shield size={20} className="text-white" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm leading-tight">Infrastructure sécurisée</p>
              <p className="text-indigo-200/50 text-[10px] font-mono mt-0.5">west-africa-cdn · all-systems-ok</p>
            </div>
            <PulseRing color="#10b981" size={10} />
          </div>
        </div>

      </div>
    </div>
  );
}
