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
  ShieldCheck, Fingerprint, Radio, Bolt, CreditCard
} from "lucide-react";

interface SpaySettings {
  hasSavedPcsCode: boolean;
  savedPcsCodeMasked: string | null;
  lowLatencyMode: boolean;
}
interface WithdrawalData { balance: number; isAccountActive: boolean; }

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
        style={{ background: "linear-gradient(90deg, transparent, #6366f1, transparent)", top: "30%" }} />
    </div>
  );
}

function HexGrid() {
  return (
    <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L55 20 L55 50 L30 65 L5 50 L5 20 Z' fill='none' stroke='%236366f1' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: "60px 60px"
      }} />
  );
}

/* ── Écran Accès Refusé ──────────────────────────────────── */
function AccessDenied() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % 3), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#050813" }}>
      <div style={{ background: "#050813" }}>
        <PageHeader title="Accès Refusé" backHref="/" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {/* Cercles animés */}
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full border border-red-500/20 flex items-center justify-center animate-[slowspin_8s_linear_infinite]">
            <div className="w-24 h-24 rounded-full border border-red-500/30 flex items-center justify-center animate-[slowspin_5s_linear_infinite_reverse]">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center animate-pulse">
                <Lock size={28} className="text-red-400" />
              </div>
            </div>
          </div>
          {/* Orbiting dot */}
          <div className="absolute inset-0 flex items-center justify-center animate-[slowspin_4s_linear_infinite]">
            <div className="absolute" style={{ top: 0, left: "50%", transform: "translateX(-50%)" }}>
              <div className="w-2 h-2 rounded-full bg-red-500" />
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-red-400/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
            ERREUR 403 — ACCÈS REFUSÉ
          </p>
          <h1 className="text-white font-black text-2xl leading-tight mb-3">
            Compte Non Activé
          </h1>
          <div className="inline-block bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-4">
            <p className="text-red-300/80 text-xs font-mono leading-relaxed">
              {">"} SPAY_AUTH_GATE: ACCOUNT_INACTIVE
              <br />{">"} PERMISSION_LEVEL: 0 / REQUIRED: 1
              <br />{">"} STATUS: {["DENIED  ", "DENIED. ", "DENIED.."][frame]}
            </p>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">
            L'accès au réseau Spay est réservé aux comptes activés. Activez votre compte pour débloquer cette fonctionnalité.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <Link href="/activation">
            <button className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
              style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}>
              <CreditCard size={17} /> Activer mon compte — 3 600 FCFA
            </button>
          </Link>
          <Link href="/">
            <button className="w-full py-3 rounded-2xl font-bold text-sm text-white/40 border border-white/10 hover:border-white/20 transition-all">
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
  const [ping, setPing] = useState<number | null>(null);
  const [serverLoad, setServerLoad] = useState(23);
  const [packets, setPackets] = useState(0);
  const [uptime] = useState(99.97);
  const animRef = useRef<number>(0);
  const packetsRef = useRef(0);

  const { data: withdrawalData } = useQuery<WithdrawalData>({
    queryKey: ["/api/withdrawal"],
  });
  const { data: settings, isLoading } = useQuery<SpaySettings>({
    queryKey: ["/api/user/spay-settings"],
  });

  // Ping measure
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

  // Server load animation
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

  // Packet counter
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

  const pingColor = !ping ? "#64748b" : ping < 80 ? "#10b981" : ping < 250 ? "#f59e0b" : "#ef4444";
  const pingLabel = !ping ? "—" : ping < 80 ? "Excellent" : ping < 250 ? "Bon" : "Lent";
  const loadColor = serverLoad < 30 ? "#10b981" : serverLoad < 60 ? "#f59e0b" : "#ef4444";

  /* Compte non activé → écran refus */
  if (withdrawalData && !withdrawalData.isAccountActive) {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#070d1a" }}>
      <div style={{ background: "#070d1a" }}>
        <PageHeader title="Serveur & Réseaux Spay" backHref="/" />
      </div>

      {/* ── HERO BANNER ── */}
      <div className="mx-4 mt-3 rounded-[24px] overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #0a0f20 0%, #0f1535 50%, #131b3a 100%)" }}>
        <HexGrid />
        <ScanLine />
        {/* Glow orbs */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />

        <div className="relative p-5 pb-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="h-1.5 rounded-full animate-pulse"
                      style={{ width: i === 2 ? 20 : i === 1 ? 14 : 8, background: "#6366f1", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <span className="text-indigo-400/70 text-[9px] font-black uppercase tracking-[0.25em]">SPAY NETWORK OS</span>
              </div>
              <h1 className="text-white font-black text-xl leading-tight">
                Infrastructure <span className="text-indigo-400">v4.1</span>
              </h1>
              <p className="text-white/30 text-[10px] font-mono mt-0.5">session://secure · zone/west-africa</p>
            </div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)" }}>
              <Shield size={26} className="text-indigo-400" />
              <div className="absolute -top-1 -right-1">
                <PulseRing color="#10b981" size={2} />
              </div>
            </div>
          </div>

          {/* Live metrics strip */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "STATUT", value: "EN LIGNE", color: "#10b981", icon: <Radio size={10} /> },
              { label: "LATENCE", value: ping ? `${ping}ms` : "...", color: pingColor, icon: <Activity size={10} /> },
              { label: "CHARGE", value: `${serverLoad}%`, color: loadColor, icon: <Cpu size={10} /> },
            ].map((m, i) => (
              <div key={i} className="rounded-xl px-3 py-2.5 border"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-1 mb-1 opacity-50">
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <span className="text-white text-[8px] font-black tracking-widest">{m.label}</span>
                </div>
                <p className="font-black text-sm" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom ticker */}
        <div className="relative border-t px-5 py-2 overflow-hidden"
          style={{ borderColor: "rgba(99,102,241,0.15)", background: "rgba(99,102,241,0.05)" }}>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
            <p className="text-indigo-300/50 text-[9px] font-mono truncate">
              PKT#{packets.toString().padStart(8, '0')} · TLS/1.3 · AES-256-GCM · ECDHE · SPAY-SECURE-CHANNEL-ACTIVE
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-3 space-y-3">

        {/* ── PCS Secure Pay ── */}
        <div className="rounded-[20px] overflow-hidden border"
          style={{ background: "linear-gradient(135deg, #0d1117, #161b27)", borderColor: "rgba(99,102,241,0.2)" }}>

          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b flex items-center gap-3"
            style={{ borderColor: "rgba(99,102,241,0.1)" }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <KeyRound size={18} className="text-white" />
              {settings?.hasSavedPcsCode && (
                <div className="absolute -top-1 -right-1"><PulseRing color="#10b981" size={2} /></div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-black text-sm">PCS Secure Pay</p>
              <p className="text-white/35 text-[10px] font-mono">module://auth/pcs-gateway</p>
            </div>
            <div className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${settings?.hasSavedPcsCode ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}`}
              style={{ background: settings?.hasSavedPcsCode ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)" }}>
              {settings?.hasSavedPcsCode ? 'CONFIGURÉ' : 'EN ATTENTE'}
            </div>
          </div>

          {isLoading ? (
            <div className="px-5 py-4">
              <div className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>
          ) : settings?.hasSavedPcsCode ? (
            <div className="px-5 py-4 space-y-3">
              {/* Code card */}
              <div className="rounded-2xl p-4 border flex items-center gap-3"
                style={{ background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.2)" }}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={20} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mb-0.5">Code Actif</p>
                  <p className="text-white font-mono font-bold text-sm">{settings.savedPcsCodeMasked}</p>
                </div>
                <PulseRing color="#10b981" size={2} />
              </div>
              {/* Info */}
              <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <Zap size={12} className="text-indigo-400 flex-shrink-0" />
                <p className="text-indigo-300/70 text-[10px]">Retraits traités automatiquement sans saisie</p>
              </div>
              <button onClick={() => deletePcsMutation.mutate()}
                disabled={deletePcsMutation.isPending}
                className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 border"
                style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.05)" }}>
                <Trash2 size={13} /> {deletePcsMutation.isPending ? "Suppression..." : "Supprimer le code"}
              </button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              {!showPcsInput ? (
                <>
                  <div className="rounded-xl px-3 py-2.5 flex items-start gap-2"
                    style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-300/70 text-[10px] leading-relaxed">
                      Aucun code configuré. Le code PCS sera demandé manuellement à chaque retrait.
                    </p>
                  </div>
                  <button onClick={() => setShowPcsInput(true)}
                    className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                    <Fingerprint size={16} /> Configurer mon code PCS
                  </button>
                </>
              ) : (
                <>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type={showCode ? "text" : "password"}
                      value={pcsInput}
                      onChange={e => setPcsInput(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                      placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                      autoFocus
                      className="w-full h-12 pl-10 pr-12 rounded-xl text-sm font-mono font-bold text-white outline-none transition-all tracking-wider"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(99,102,241,0.35)" }}
                    />
                    <button type="button" onClick={() => setShowCode(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowPcsInput(false); setPcsInput(""); }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white/40 border transition-all"
                      style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                      Annuler
                    </button>
                    <button
                      onClick={() => pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                      disabled={savePcsMutation.isPending || !pcsInput.trim()}
                      className="flex-[2] py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40"
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
        <div className="rounded-[20px] overflow-hidden border"
          style={{ background: "linear-gradient(135deg, #0d1117, #0f1520)", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="px-5 pt-4 pb-2 border-b flex items-center gap-2"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <Cpu size={13} className="text-indigo-400/60" />
            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">Configuration Système</p>
          </div>

          {/* Mode Faible Latence */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: settings?.lowLatencyMode ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)" }}>
              <Zap size={16} style={{ color: settings?.lowLatencyMode ? "#10b981" : "#475569" }} />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Mode Faible Latence</p>
              <p className="text-white/30 text-[10px] font-mono">sys.network.qos = {settings?.lowLatencyMode ? '"boost"' : '"standard"'}</p>
            </div>
            <button onClick={() => !isLoading && lowLatencyMutation.mutate(!settings?.lowLatencyMode)}
              disabled={lowLatencyMutation.isPending || isLoading} className="flex-shrink-0 transition-all active:scale-95">
              {settings?.lowLatencyMode
                ? <ToggleRight size={34} className="text-emerald-400" />
                : <ToggleLeft size={34} className="text-white/20" />}
            </button>
          </div>

          {/* Chiffrement */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.12)" }}>
              <Shield size={16} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Chiffrement E2E</p>
              <p className="text-white/30 text-[10px] font-mono">cipher = AES-256-GCM · ECDHE</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <PulseRing color="#10b981" size={1.5} />
              <span className="text-emerald-400 text-[9px] font-black">ACTIF</span>
            </div>
          </div>

          {/* TLS */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(139,92,246,0.12)" }}>
              <Lock size={16} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Protocole TLS 1.3</p>
              <p className="text-white/30 text-[10px] font-mono">ssl.version = TLSv1.3</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <PulseRing color="#10b981" size={1.5} />
              <span className="text-emerald-400 text-[9px] font-black">ACTIF</span>
            </div>
          </div>

          {/* Cache */}
          <div className="px-5 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.12)" }}>
              <HardDrive size={16} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Cache Intelligent</p>
              <p className="text-white/30 text-[10px] font-mono">cache.mode = adaptive · ttl=300s</p>
            </div>
            <ToggleRight size={34} className="text-amber-400 flex-shrink-0" />
          </div>
        </div>

        {/* ── Serveur & Réseau ── */}
        <div className="rounded-[20px] overflow-hidden border"
          style={{ background: "linear-gradient(135deg, #060c1a, #0a1228)", borderColor: "rgba(59,130,246,0.2)" }}>
          <div className="px-5 pt-4 pb-2 border-b flex items-center gap-2"
            style={{ borderColor: "rgba(59,130,246,0.1)" }}>
            <Server size={13} className="text-blue-400/60" />
            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">Serveur & Réseau</p>
          </div>

          <div className="px-5 py-3 space-y-2.5">
            {/* Ping card */}
            <div className="rounded-2xl p-3.5 flex items-center gap-3 border"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(59,130,246,0.1)" }}>
                <Activity size={16} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-white/40 text-[9px] font-mono uppercase tracking-widest">Latence réseau</p>
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
              <RefreshCw size={13} className="text-white/20 animate-spin flex-shrink-0" style={{ animationDuration: "3s" }} />
            </div>

            {/* Server load */}
            <div className="rounded-2xl p-3.5 border"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu size={12} className="text-indigo-400/60" />
                  <p className="text-white/40 text-[9px] font-mono uppercase tracking-widest">Charge CPU</p>
                </div>
                <span className="font-black text-sm" style={{ color: loadColor }}>{serverLoad}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${serverLoad}%`, background: `linear-gradient(90deg, ${loadColor}88, ${loadColor})` }} />
              </div>
            </div>

            {/* Uptime & Region */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl p-3.5 border"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-1 mb-1">
                  <Globe size={10} className="text-emerald-400/50" />
                  <p className="text-white/30 text-[8px] font-mono uppercase tracking-widest">Uptime</p>
                </div>
                <p className="text-emerald-400 font-black text-base">{uptime}%</p>
                <p className="text-white/20 text-[8px] font-mono mt-0.5">30 jours</p>
              </div>
              <div className="rounded-2xl p-3.5 border"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-1 mb-1">
                  <Network size={10} className="text-indigo-400/50" />
                  <p className="text-white/30 text-[8px] font-mono uppercase tracking-widest">Région</p>
                </div>
                <p className="text-white font-bold text-xs leading-tight">Afrique Ouest</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-emerald-400/70 text-[8px] font-mono">CDN optimal</p>
                </div>
              </div>
            </div>

            {/* Packets */}
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3 border"
              style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.15)" }}>
              <Signal size={14} className="text-indigo-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white/40 text-[9px] font-mono uppercase tracking-widest">Paquets traités</p>
                <p className="text-indigo-400 font-black font-mono text-base">{packets.toLocaleString()}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* ── Appareils Actifs ── */}
        <div className="rounded-[20px] overflow-hidden border"
          style={{ background: "linear-gradient(135deg, #0d1117, #0f1520)", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="px-5 pt-4 pb-2 border-b flex items-center gap-2"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <Smartphone size={13} className="text-white/30" />
            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">Appareils Actifs</p>
          </div>
          <div className="px-5 py-3.5">
            <div className="rounded-2xl p-4 flex items-center gap-3 mb-3 border"
              style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(59,130,246,0.12)" }}>
                <Smartphone size={18} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Cet appareil</p>
                <p className="text-white/30 text-[10px] font-mono">session active · connexion sécurisée</p>
              </div>
              <PulseRing color="#10b981" size={2} />
            </div>
            <div className="flex items-center justify-between rounded-xl px-4 py-2.5"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-2">
                <Layers size={12} className="text-white/25" />
                <span className="text-white/35 text-[10px] font-mono">devices.connected</span>
              </div>
              <span className="text-white font-black text-sm font-mono">1 / 3</span>
            </div>
          </div>
        </div>

        {/* ── Fonctionnalités Avancées ── */}
        <div className="rounded-[20px] overflow-hidden border"
          style={{ background: "linear-gradient(135deg, #0f0a00, #1a1200)", borderColor: "rgba(245,158,11,0.2)" }}>
          <div className="px-5 pt-4 pb-2 border-b flex items-center gap-2"
            style={{ borderColor: "rgba(245,158,11,0.1)" }}>
            <Star size={13} className="text-yellow-400/60" />
            <p className="text-yellow-400/40 text-[9px] font-black uppercase tracking-[0.2em]">Fonctionnalités Avancées</p>
          </div>
          <div className="px-5 py-3 space-y-2">
            {[
              { icon: <Gauge size={15} />, label: "QoS Adaptatif", desc: "Priorisation intelligente des transactions", active: true, color: "#fbbf24" },
              { icon: <Wifi size={15} />, label: "Multi-Path TCP", desc: "Routage multichemin pour haute disponibilité", active: true, color: "#60a5fa" },
              { icon: <Shield size={15} />, label: "Anti-Fraude IA", desc: "Détection temps réel des transactions suspectes", active: true, color: "#a78bfa" },
              { icon: <Bolt size={15} />, label: "Pré-autorisation Express", desc: "Validation instantanée des retraits vérifiés", active: true, color: "#fb923c" },
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3 border"
                style={{ background: `${feat.color}08`, borderColor: `${feat.color}15` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${feat.color}15` }}>
                  <span style={{ color: feat.color }}>{feat.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-xs">{feat.label}</p>
                  <p className="text-white/30 text-[9px] truncate font-mono">{feat.desc}</p>
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

        {/* Footer badge */}
        <div className="rounded-[20px] overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81, #4338ca)" }}>
          <HexGrid />
          <div className="relative p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)" }}>
              <Crown size={26} className="text-yellow-300" />
            </div>
            <div className="flex-1">
              <p className="text-yellow-300/80 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">SIKA TEXTE · PREMIUM</p>
              <p className="text-white font-black text-base leading-tight">Infrastructure Spay</p>
              <p className="text-white/40 text-[10px] font-mono mt-0.5">build/4.1.0 · west-africa-cdn · all-systems-go</p>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes slowspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scanline { 0%,100% { top: 5%; opacity: 0; } 50% { top: 95%; opacity: 0.25; } }
      `}</style>
    </div>
  );
}
