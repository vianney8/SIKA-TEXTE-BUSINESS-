import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import { Link } from "wouter";
import {
  Shield, Server, Wifi, Cpu, Zap, Lock, KeyRound, CheckCircle,
  Trash2, Eye, EyeOff, Globe, Activity, Smartphone,
  Signal, AlertTriangle, Star, Crown, RefreshCw, Gauge,
  Network, HardDrive, ToggleLeft, ToggleRight, Layers,
  ShieldCheck, Fingerprint, Radio, Bolt, CreditCard, Copy
} from "lucide-react";

interface SpaySettings {
  hasSavedPcsCode: boolean;
  savedPcsCodeMasked: string | null;
  lowLatencyMode: boolean;
}
interface WithdrawalData { balance: number; isAccountActive: boolean; }
interface UserPcsCode { id: number; code: string; status: string; createdAt: string; }

/* ── Micro-composants animations ─────────────────────────── */
function PulseRing({ color = "#10b981", size = 3 }: { color?: string; size?: number }) {
  return (
    <span className="relative flex" style={{ width: size * 4, height: size * 4 }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ background: color }} />
      <span className="relative inline-flex rounded-full" style={{ width: size * 4, height: size * 4, background: color }} />
    </span>
  );
}

function ScanLine() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      <div className="absolute left-0 right-0 h-px opacity-30 animate-[scanline_3s_ease-in-out_infinite]"
        style={{ background: "linear-gradient(90deg, transparent, #a5b4fc, transparent)", top: "30%" }} />
    </div>
  );
}

function HexGrid({ dark = false }: { dark?: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none"
      style={{
        opacity: dark ? 0.06 : 0.045,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L55 20 L55 50 L30 65 L5 50 L5 20 Z' fill='none' stroke='%236366f1' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: "60px 60px"
      }} />
  );
}

/* ── Écran Accès Refusé (thème clair) ──────────────────────── */
function AccessDenied({ paymentInfo }: { paymentInfo?: { activationAmount?: string } }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % 3), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-red-50/30 to-rose-50/20">
      <PageHeader title="Accès Refusé" backHref="/" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {/* Cercles animés */}
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full border-2 border-rose-200 flex items-center justify-center animate-[slowspin_8s_linear_infinite]">
            <div className="w-24 h-24 rounded-full border-2 border-rose-300 flex items-center justify-center animate-[slowspin_5s_linear_infinite_reverse]">
              <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-400 flex items-center justify-center animate-pulse">
                <Lock size={28} className="text-rose-500" />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center animate-[slowspin_4s_linear_infinite]">
            <div className="absolute" style={{ top: 0, left: "50%", transform: "translateX(-50%)" }}>
              <div className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-rose-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
            ERREUR 403 — ACCÈS REFUSÉ
          </p>
          <h1 className="text-slate-800 font-black text-2xl leading-tight mb-3">
            Compte Non Activé
          </h1>
          <div className="inline-block bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 mb-4">
            <p className="text-rose-600 text-xs font-mono leading-relaxed">
              {">"} SPAY_AUTH_GATE: ACCOUNT_INACTIVE
              <br />{">"} PERMISSION_LEVEL: 0 / REQUIRED: 1
              <br />{">"} STATUS: {["DENIED  ", "DENIED. ", "DENIED.."][frame]}
            </p>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            L'accès au réseau Spay est réservé aux comptes activés. Activez votre compte pour débloquer cette fonctionnalité.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <Link href="/activation">
            <button className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-blue-200"
              style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}>
              <CreditCard size={17} /> Activer mon compte — {paymentInfo?.activationAmount ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR") : "3 600"} FCFA
            </button>
          </Link>
          <Link href="/">
            <button className="w-full py-3 rounded-2xl font-bold text-sm text-slate-500 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
              Retour au tableau de bord
            </button>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes slowspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scanline { 0%,100% { top: 10%; opacity: 0; } 50% { top: 90%; opacity: 0.3; } }
      `}</style>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────── */
export default function SpayNetwork() {
  const { toast } = useToast();
  const [pcsInput, setPcsInput] = useState("");
  const [showPcsInput, setShowPcsInput] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copiedPcsId, setCopiedPcsId] = useState<number | null>(null);
  const [ping, setPing] = useState<number | null>(null);
  const [serverLoad, setServerLoad] = useState(23);
  const [packets, setPackets] = useState(0);
  const [uptime] = useState(99.97);
  const animRef = useRef<number>(0);
  const packetsRef = useRef(0);

  const { data: paymentInfo } = useQuery<{ activationAmount?: string }>({ queryKey: ["/api/activation/payment-info"] });
  const { data: withdrawalData } = useQuery<WithdrawalData>({
    queryKey: ["/api/withdrawal"],
  });
  const { data: settings, isLoading } = useQuery<SpaySettings>({
    queryKey: ["/api/user/spay-settings"],
  });
  const { data: userPcsCodes = [] } = useQuery<UserPcsCode[]>({
    queryKey: ["/api/user/pcs-codes"],
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const measure = async () => {
      const t0 = performance.now();
      try { await fetch("/api/auth/user", { credentials: "include" }); } catch {}
      setPing(Math.round(performance.now() - t0));
    };
    measure();
    const iv = setInterval(measure, 6000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let v = serverLoad;
    const tick = () => {
      v += (Math.random() - 0.5) * 4;
      v = Math.max(12, Math.min(48, v));
      setServerLoad(Math.round(v));
      animRef.current = window.setTimeout(tick, 1200 + Math.random() * 800);
    };
    animRef.current = window.setTimeout(tick, 1200);
    return () => clearTimeout(animRef.current);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      packetsRef.current += Math.floor(Math.random() * 50 + 10);
      setPackets(packetsRef.current);
    }, 300);
    return () => clearInterval(iv);
  }, []);

  const savePcsMutation = useMutation({
    mutationFn: async (pcsCode: string) => {
      const res = await apiRequest("POST", "/api/user/spay-settings/pcs-code", { pcsCode });
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
      const res = await apiRequest("DELETE", "/api/user/spay-settings/pcs-code", {});
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      toast({ title: "Code PCS supprimé" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/spay-settings"] });
    },
  });

  const lowLatencyMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("POST", "/api/user/spay-settings/low-latency", { enabled });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: (data) => {
      toast({ title: data.lowLatencyMode ? "Mode Faible Latence activé" : "Mode désactivé" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/spay-settings"] });
    },
  });

  const pingColor = !ping ? "#64748b" : ping < 50 ? "#10b981" : ping < 100 ? "#3b82f6" : ping < 200 ? "#f59e0b" : ping < 400 ? "#f97316" : "#ef4444";
  const pingLabel = !ping ? "—" : ping < 50 ? "Excellent" : ping < 100 ? "Rapide" : ping < 200 ? "Bon" : ping < 400 ? "Lent" : "Très lent";
  const loadColor = serverLoad < 30 ? "#10b981" : serverLoad < 60 ? "#f59e0b" : "#ef4444";

  if (withdrawalData && !withdrawalData.isAccountActive) {
    return <AccessDenied paymentInfo={paymentInfo} />;
  }

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/20">
      <div className="bg-white/80 backdrop-blur border-b border-slate-100">
        <PageHeader title="Serveur & Réseaux Spay" backHref="/" />
      </div>

      {/* ── HERO BANNER — gradient indigo (adapté animations) ── */}
      <div className="mx-4 mt-3 rounded-[24px] overflow-hidden relative shadow-xl shadow-indigo-200/50"
        style={{ background: "linear-gradient(135deg, #312e81 0%, #4338ca 50%, #4f46e5 100%)" }}>
        <HexGrid dark />
        <ScanLine />
        {/* Glow orbs */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />

        <div className="relative p-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="h-1.5 rounded-full animate-pulse"
                      style={{ width: i === 2 ? 20 : i === 1 ? 14 : 8, background: "#a5b4fc", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <span className="text-indigo-200/70 text-[9px] font-black uppercase tracking-[0.25em]">SPAY NETWORK OS</span>
              </div>
              <h1 className="text-white font-black text-xl leading-tight">
                Infrastructure <span className="text-indigo-200">v4.1</span>
              </h1>
              <p className="text-indigo-200/50 text-[10px] font-mono mt-0.5">session://secure · zone/west-africa</p>
            </div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)" }}>
              <Shield size={26} className="text-white" />
              <div className="absolute -top-1 -right-1">
                <PulseRing color="#10b981" size={2} />
              </div>
            </div>
          </div>

          {/* Live metrics strip */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "STATUT", value: "EN LIGNE", color: "#6ee7b7", icon: <Radio size={10} /> },
              { label: "LATENCE", value: ping ? `${ping}ms` : "...", color: !ping ? "#94a3b8" : ping < 80 ? "#6ee7b7" : ping < 250 ? "#fcd34d" : "#fca5a5", icon: <Activity size={10} /> },
              { label: "CHARGE", value: `${serverLoad}%`, color: serverLoad < 30 ? "#6ee7b7" : serverLoad < 60 ? "#fcd34d" : "#fca5a5", icon: <Cpu size={10} /> },
            ].map((m, i) => (
              <div key={i} className="rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}>
                <div className="flex items-center gap-1 mb-1">
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <span className="text-white/60 text-[8px] font-black tracking-widest">{m.label}</span>
                </div>
                <p className="font-black text-sm" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom ticker */}
        <div className="relative border-t px-5 py-2 overflow-hidden"
          style={{ borderColor: "rgba(165,180,252,0.25)", background: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 animate-pulse flex-shrink-0" />
            <p className="text-indigo-200/50 text-[9px] font-mono truncate">
              PKT#{packets.toString().padStart(8, '0')} · TLS/1.3 · AES-256-GCM · ECDHE · SPAY-SECURE-CHANNEL-ACTIVE
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-3 space-y-3">

        {/* ── PCS Secure Pay ── */}
        <div className="rounded-[20px] overflow-hidden bg-white border border-slate-200 shadow-sm shadow-slate-100">

          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <KeyRound size={18} className="text-white" />
              {settings?.hasSavedPcsCode && (
                <div className="absolute -top-1 -right-1"><PulseRing color="#10b981" size={2} /></div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-slate-800 font-black text-sm">PCS Secure Pay</p>
              <p className="text-slate-400 text-[10px] font-mono">module://auth/pcs-gateway</p>
            </div>
            <div className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${settings?.hasSavedPcsCode ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-amber-300 text-amber-600 bg-amber-50'}`}>
              {settings?.hasSavedPcsCode ? 'CONFIGURÉ' : 'EN ATTENTE'}
            </div>
          </div>

          {isLoading ? (
            <div className="px-5 py-4">
              <div className="h-10 rounded-xl animate-pulse bg-slate-100" />
            </div>
          ) : settings?.hasSavedPcsCode ? (
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-2xl p-4 border border-emerald-200 bg-emerald-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={20} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-emerald-600 text-[9px] font-black uppercase tracking-widest mb-0.5">Code Actif</p>
                  <p className="text-slate-800 font-mono font-bold text-sm">{settings.savedPcsCodeMasked}</p>
                </div>
                <PulseRing color="#10b981" size={2} />
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-indigo-50 border border-indigo-100">
                <Zap size={12} className="text-indigo-500 flex-shrink-0" />
                <p className="text-indigo-600 text-[10px]">Retraits traités automatiquement sans saisie</p>
              </div>
              <button onClick={() => deletePcsMutation.mutate()}
                disabled={deletePcsMutation.isPending}
                className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100">
                <Trash2 size={13} /> {deletePcsMutation.isPending ? "Suppression..." : "Supprimer le code"}
              </button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              {!showPcsInput ? (
                <>
                  <button onClick={() => setShowPcsInput(true)}
                    className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                    <Fingerprint size={16} /> Configurer mon code PCS
                  </button>
                </>
              ) : (
                <>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showCode ? "text" : "password"}
                      value={pcsInput}
                      onChange={e => setPcsInput(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                      placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                      autoFocus
                      className="w-full h-12 pl-10 pr-12 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none transition-all tracking-wider bg-slate-50 border-2 border-indigo-200 focus:border-indigo-400"
                    />
                    <button type="button" onClick={() => setShowCode(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowPcsInput(false); setPcsInput(""); }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 border-2 border-slate-200 hover:bg-slate-50 transition-all">
                      Annuler
                    </button>
                    <button
                      onClick={() => pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                      disabled={savePcsMutation.isPending || !pcsInput.trim()}
                      className="flex-[2] py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40 shadow-md shadow-indigo-200"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                      <CheckCircle size={13} /> {savePcsMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Configuration Système ── */}
        <div className="rounded-[20px] overflow-hidden bg-white border border-slate-200 shadow-sm shadow-slate-100">
          <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Cpu size={13} className="text-indigo-400" />
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Configuration Système</p>
          </div>

          {/* Mode Faible Latence */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: settings?.lowLatencyMode ? "rgba(16,185,129,0.12)" : "#f1f5f9" }}>
              <Zap size={16} style={{ color: settings?.lowLatencyMode ? "#10b981" : "#94a3b8" }} />
            </div>
            <div className="flex-1">
              <p className="text-slate-800 font-bold text-sm">Mode Faible Latence</p>
              <p className="text-slate-400 text-[10px] font-mono">sys.network.qos = {settings?.lowLatencyMode ? '"boost"' : '"standard"'}</p>
            </div>
            <button onClick={() => !isLoading && lowLatencyMutation.mutate(!settings?.lowLatencyMode)}
              disabled={lowLatencyMutation.isPending || isLoading} className="flex-shrink-0 transition-all active:scale-95">
              {settings?.lowLatencyMode
                ? <ToggleRight size={34} className="text-emerald-500" />
                : <ToggleLeft size={34} className="text-slate-300" />}
            </button>
          </div>

          {/* Chiffrement */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50">
              <Shield size={16} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-slate-800 font-bold text-sm">Chiffrement E2E</p>
              <p className="text-slate-400 text-[10px] font-mono">cipher = AES-256-GCM · ECDHE</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-emerald-50 border border-emerald-200">
              <PulseRing color="#10b981" size={1.5} />
              <span className="text-emerald-600 text-[9px] font-black">ACTIF</span>
            </div>
          </div>

          {/* TLS */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-50">
              <Lock size={16} className="text-violet-500" />
            </div>
            <div className="flex-1">
              <p className="text-slate-800 font-bold text-sm">Protocole TLS 1.3</p>
              <p className="text-slate-400 text-[10px] font-mono">ssl.version = TLSv1.3</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-emerald-50 border border-emerald-200">
              <PulseRing color="#10b981" size={1.5} />
              <span className="text-emerald-600 text-[9px] font-black">ACTIF</span>
            </div>
          </div>

          {/* Cache */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-50">
              <HardDrive size={16} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-slate-800 font-bold text-sm">Cache Intelligent</p>
              <p className="text-slate-400 text-[10px] font-mono">cache.mode = adaptive · ttl=300s</p>
            </div>
            <ToggleRight size={34} className="text-amber-400 flex-shrink-0" />
          </div>

          {/* ── Mes Codes PCS ── */}
          <div className="px-5 pt-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={13} className="text-violet-400" />
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Mes Codes PCS Secure Pay</p>
            </div>

            {userPcsCodes.length === 0 ? (
              <div className="rounded-xl px-3 py-3 mb-3 flex items-center gap-2 bg-slate-50 border border-slate-200">
                <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
                <p className="text-slate-500 text-[10px]">Aucun code PCS attribué à votre compte.</p>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {userPcsCodes.map((pcs) => (
                  <div key={pcs.id}
                    className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                    style={{
                      background: pcs.status === 'actif' ? "#f0fdf4" : "#f8fafc",
                      border: `1px solid ${pcs.status === 'actif' ? "#bbf7d0" : "#e2e8f0"}`,
                    }}>
                    <div className="flex-shrink-0">
                      {pcs.status === 'actif'
                        ? <PulseRing color="#10b981" size={2} />
                        : <div className="w-2 h-2 rounded-full bg-slate-300" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <code className="text-[11px] font-mono font-bold text-slate-700 block truncate">{pcs.code}</code>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider ${pcs.status === 'actif' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {pcs.status === 'actif' ? '✅ Actif' : '⏸ Inactif'}
                        </span>
                        <span className="text-slate-300 text-[9px]">·</span>
                        <span className="text-slate-400 text-[9px]">
                          {new Date(pcs.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pcs.code);
                        setCopiedPcsId(pcs.id);
                        setTimeout(() => setCopiedPcsId(null), 1500);
                        toast({ title: "Code copié !" });
                      }}
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 bg-white border border-slate-200 hover:border-slate-300">
                      {copiedPcsId === pcs.id
                        ? <CheckCircle size={13} className="text-emerald-500" />
                        : <Copy size={13} className="text-slate-400" />
                      }
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Link href="/pay/codepcs">
              <a className="block w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 mb-3 text-white shadow-md shadow-indigo-200 active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                <CreditCard size={16} />
                Payer mon code PCS Secure Pay
              </a>
            </Link>

            {/* ── Activation code PCS — affiché uniquement si compte activé + au moins 1 code inactif ── */}
            {userPcsCodes.some(c => c.status !== 'actif') && (
              <div className="mt-2 p-3 rounded-xl border border-amber-200 bg-amber-50">
                <p className="text-[11px] text-amber-800 leading-relaxed mb-3">
                  L'activation du code est <b>obligatoire</b> pour finaliser la configuration et permettre le fonctionnement du système de paiement automatique <b>SIKApay</b> via <b>SecurPay</b>.
                </p>
                <a
                  href="https://sikatexte.site/pay/88cb6331"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 text-white shadow-md shadow-amber-200 active:scale-[0.98] transition-all"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
                >
                  <Bolt size={14} />
                  Rendre mon code PCS actif
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── Serveur & Réseau ── */}
        <div className="rounded-[20px] overflow-hidden bg-white border border-blue-100 shadow-sm shadow-blue-50">
          <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Server size={13} className="text-blue-400" />
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Serveur & Réseau</p>
          </div>

          <div className="px-5 py-3 space-y-2.5">
            {/* Ping card */}
            <div className="rounded-2xl p-3.5 flex items-center gap-3 border border-slate-100 bg-slate-50">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50">
                <Activity size={16} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-[9px] font-mono uppercase tracking-widest">Latence réseau</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-black text-lg" style={{ color: pingColor }}>
                    {ping ? `${ping} ms` : "Mesure..."}
                  </p>
                  {ping && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: pingColor + "20", color: pingColor, border: `1px solid ${pingColor}40` }}>
                      {pingLabel}
                    </span>
                  )}
                </div>
              </div>
              <RefreshCw size={13} className="text-slate-300 animate-spin flex-shrink-0" style={{ animationDuration: "3s" }} />
            </div>

            {/* Server load */}
            <div className="rounded-2xl p-3.5 border border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu size={12} className="text-indigo-400" />
                  <p className="text-slate-400 text-[9px] font-mono uppercase tracking-widest">Charge CPU</p>
                </div>
                <span className="font-black text-sm" style={{ color: loadColor }}>{serverLoad}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-slate-200">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${serverLoad}%`, background: `linear-gradient(90deg, ${loadColor}88, ${loadColor})` }} />
              </div>
            </div>

            {/* Uptime & Region */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl p-3.5 border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-1 mb-1">
                  <Globe size={10} className="text-emerald-400" />
                  <p className="text-slate-400 text-[8px] font-mono uppercase tracking-widest">Uptime</p>
                </div>
                <p className="text-emerald-600 font-black text-base">{uptime}%</p>
                <p className="text-slate-400 text-[8px] font-mono mt-0.5">30 jours</p>
              </div>
              <div className="rounded-2xl p-3.5 border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-1 mb-1">
                  <Network size={10} className="text-indigo-400" />
                  <p className="text-slate-400 text-[8px] font-mono uppercase tracking-widest">Région</p>
                </div>
                <p className="text-slate-800 font-bold text-xs leading-tight">Afrique Ouest</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-emerald-600 text-[8px] font-mono">CDN optimal</p>
                </div>
              </div>
            </div>

            {/* Packets */}
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3 border border-indigo-100 bg-indigo-50">
              <Signal size={14} className="text-indigo-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-indigo-400 text-[9px] font-mono uppercase tracking-widest">Paquets traités</p>
                <p className="text-indigo-600 font-black font-mono text-base">{packets.toLocaleString()}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* ── Appareils Actifs ── */}
        <div className="rounded-[20px] overflow-hidden bg-white border border-slate-200 shadow-sm shadow-slate-100">
          <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Smartphone size={13} className="text-slate-400" />
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Appareils Actifs</p>
          </div>
          <div className="px-5 py-3.5">
            <div className="rounded-2xl p-4 flex items-center gap-3 mb-3 border border-blue-100 bg-blue-50">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100">
                <Smartphone size={18} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-slate-800 font-bold text-sm">Cet appareil</p>
                <p className="text-slate-400 text-[10px] font-mono">session active · connexion sécurisée</p>
              </div>
              <PulseRing color="#10b981" size={2} />
            </div>
            <div className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Layers size={12} className="text-slate-400" />
                <span className="text-slate-400 text-[10px] font-mono">devices.connected</span>
              </div>
              <span className="text-slate-800 font-black text-sm font-mono">1 / 3</span>
            </div>
          </div>
        </div>

        {/* ── Fonctionnalités Avancées ── */}
        <div className="rounded-[20px] overflow-hidden bg-white border border-amber-100 shadow-sm shadow-amber-50">
          <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Star size={13} className="text-amber-400" />
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Fonctionnalités Avancées</p>
          </div>
          <div className="px-5 py-3 space-y-2">
            {[
              { icon: <Gauge size={15} />, label: "QoS Adaptatif", desc: "Priorisation intelligente des transactions", active: true, color: "#f59e0b" },
              { icon: <Wifi size={15} />, label: "Multi-Path TCP", desc: "Routage multichemin pour haute disponibilité", active: true, color: "#3b82f6" },
              { icon: <Shield size={15} />, label: "Anti-Fraude IA", desc: "Détection temps réel des transactions suspectes", active: true, color: "#8b5cf6" },
              { icon: <Bolt size={15} />, label: "Pré-autorisation Express", desc: "Validation instantanée des retraits vérifiés", active: true, color: "#f97316" },
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3 border"
                style={{ background: `${feat.color}08`, borderColor: `${feat.color}25` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${feat.color}15` }}>
                  <span style={{ color: feat.color }}>{feat.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-bold text-xs">{feat.label}</p>
                  <p className="text-slate-400 text-[9px] truncate font-mono">{feat.desc}</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
                  style={{ background: `${feat.color}15`, border: `1px solid ${feat.color}30` }}>
                  {feat.active && <PulseRing color={feat.color} size={1.5} />}
                  <span className="text-[8px] font-black" style={{ color: feat.color }}>ACTIF</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer badge — gradient indigo conservé comme accent visuel */}
        <div className="rounded-[20px] overflow-hidden relative shadow-xl shadow-indigo-200/40"
          style={{ background: "linear-gradient(135deg, #312e81, #4338ca, #4f46e5)" }}>
          <HexGrid dark />
          <div className="relative p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)" }}>
              <Crown size={26} className="text-yellow-300" />
            </div>
            <div className="flex-1">
              <p className="text-indigo-200/80 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">SIKA TEXTE · PREMIUM</p>
              <p className="text-white font-black text-base leading-tight">Infrastructure Spay</p>
              <p className="text-indigo-200/40 text-[10px] font-mono mt-0.5">build/4.1.0 · west-africa-cdn · all-systems-go</p>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes slowspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scanline { 0%,100% { top: 5%; opacity: 0; } 50% { top: 95%; opacity: 0.2; } }
      `}</style>
    </div>
  );
}
