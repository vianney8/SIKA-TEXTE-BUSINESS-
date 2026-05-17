import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Shield, Cpu, Zap, Lock, KeyRound, CheckCircle,
  Trash2, Eye, EyeOff, Globe, Activity, Smartphone,
  AlertTriangle, Crown,
  ShieldCheck, Fingerprint, Radio, CreditCard, Copy,
  ChevronLeft, Wallet, ArrowRight, Wifi, Server,
  ToggleLeft, ToggleRight, Star, Signal, Network,
  Gauge, Bolt
} from "lucide-react";

interface SpaySettings { hasSavedPcsCode: boolean; savedPcsCodeMasked: string | null; lowLatencyMode: boolean; }
interface WithdrawalData { balance: number; isAccountActive: boolean; }
interface UserPcsCode { id: number; code: string; status: string; createdAt: string; }

/* ── Simple static dot (replaces animated PulseRing) ── */
function StatusDot({ color = "#10b981", size = 8 }: { color?: string; size?: number }) {
  return (
    <span
      className="rounded-full flex-shrink-0 inline-block"
      style={{ width: size, height: size, background: color }}
    />
  );
}

/* ── Static Flow Diagram ── */
function MoneyFlowDiagram() {
  const nodes = [
    { label: "Retrait",       sub: "Demande",    color: "#dc2626", icon: <Wallet size={20} className="text-white" /> },
    { label: "SPAY",          sub: "Traitement", color: "#4f46e5", icon: <Shield size={20} className="text-white" /> },
    { label: "PCS",           sub: "Validation", color: "#7c3aed", icon: <KeyRound size={20} className="text-white" /> },
    { label: "Mobile Money",  sub: "Réception",  color: "#16a34a", icon: <Smartphone size={20} className="text-white" /> },
  ];

  return (
    <div className="px-5 py-6">
      <div className="flex items-center justify-between">
        {nodes.map((node, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: node.color }}
              >
                {node.icon}
              </div>
              <p className="text-white text-[10px] font-bold text-center leading-tight">{node.label}</p>
              <p className="text-white/50 text-[8px] font-mono text-center">{node.sub}</p>
            </div>
            {i < nodes.length - 1 && (
              <div className="flex-1 mx-1 flex items-center justify-center">
                <ArrowRight size={12} className="text-white/40" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
        <p className="text-white/70 text-xs">Retrait → SPAY → PCS Secure Pay → Mobile Money</p>
      </div>
    </div>
  );
}

/* ── Access Denied ── */
function AccessDenied({ paymentInfo }: { paymentInfo?: { activationAmount?: string } }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>
      <div className="px-4 pt-5 pb-4 flex items-center gap-3 bg-white border-b border-slate-100">
        <Link href="/">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
            <ChevronLeft size={20} className="text-slate-600" />
          </div>
        </Link>
        <p className="text-slate-800 font-black text-lg">Réseau Spay</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mb-6">
          <Lock size={32} className="text-rose-500" />
        </div>
        <div className="text-center mb-6">
          <p className="text-rose-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">ERREUR 403 — ACCÈS REFUSÉ</p>
          <h1 className="text-slate-800 font-black text-2xl leading-tight mb-3">Compte Non Activé</h1>
          <p className="text-slate-500 text-sm leading-relaxed">L'accès au réseau Spay est réservé aux comptes activés.</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <Link href="/activation">
            <button className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}>
              <CreditCard size={17} /> Activer — {paymentInfo?.activationAmount ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR") : "3 600"} FCFA
            </button>
          </Link>
          <Link href="/">
            <button className="w-full py-3 rounded-2xl font-bold text-sm text-slate-500 border-2 border-slate-200">Retour au tableau de bord</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Page principale ── */
export default function SpayNetwork() {
  const { toast } = useToast();
  const [pcsInput, setPcsInput]         = useState("");
  const [showPcsInput, setShowPcsInput] = useState(false);
  const [showCode, setShowCode]         = useState(false);
  const [copiedPcsId, setCopiedPcsId]   = useState<number | null>(null);
  const [ping, setPing]                 = useState<number | null>(null);
  const [serverLoad, setServerLoad]     = useState(23);
  const [packets, setPackets]           = useState(1074);
  const [uptime]                        = useState(99.97);
  const animRef    = useRef<number>(0);
  const packetsRef = useRef(1074);

  const { data: paymentInfo } = useQuery<{ activationAmount?: string }>({ queryKey: ["/api/activation/payment-info"] });
  const { data: withdrawalData } = useQuery<WithdrawalData>({ queryKey: ["/api/withdrawal"] });
  const { data: settings, isLoading } = useQuery<SpaySettings>({ queryKey: ["/api/user/spay-settings"] });
  const { data: userPcsCodes = [] } = useQuery<UserPcsCode[]>({
    queryKey: ["/api/user/pcs-codes"],
    staleTime: 0, gcTime: 0, refetchInterval: 10000, refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const measure = async () => {
      const t0 = performance.now();
      try { await fetch("/api/auth/user", { credentials: "include" }); } catch {}
      setPing(Math.round(performance.now() - t0));
    };
    measure();
    const iv = setInterval(measure, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let v = serverLoad;
    const tick = () => {
      v += (Math.random() - 0.5) * 3;
      v = Math.max(12, Math.min(48, v));
      setServerLoad(Math.round(v));
      animRef.current = window.setTimeout(tick, 5000 + Math.random() * 3000);
    };
    animRef.current = window.setTimeout(tick, 5000);
    return () => clearTimeout(animRef.current);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      packetsRef.current += Math.floor(Math.random() * 200 + 50);
      setPackets(packetsRef.current);
    }, 8000);
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
  const loadColor = serverLoad < 30 ? "#10b981" : serverLoad < 60 ? "#f59e0b" : "#ef4444";

  if (withdrawalData && !withdrawalData.isAccountActive) return <AccessDenied paymentInfo={paymentInfo} />;

  return (
    <div className="min-h-screen pb-28" style={{ background: "#f0f4f8" }}>

      {/* ── EN-TÊTE ── */}
      <div style={{ background: "linear-gradient(135deg, #312e81 0%, #4338ca 50%, #4f46e5 100%)" }}>
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <Link href="/">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center active:bg-white/25">
              <ChevronLeft size={20} className="text-white" />
            </div>
          </Link>
          <div className="flex-1">
            <p className="text-indigo-200/60 text-[9px] font-bold uppercase tracking-[0.25em] font-mono">SPAY NETWORK · v4.1</p>
            <h1 className="text-white font-black text-xl leading-tight">Réseau Spay</h1>
          </div>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/15">
            <Shield size={20} className="text-white" />
          </div>
        </div>

        {/* Métriques */}
        <div className="px-4 pb-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "STATUT",  val: "EN LIGNE",              color: "#6ee7b7", icon: <Radio size={10} /> },
              { label: "LATENCE", val: ping ? `${ping}ms` : "...", color: pingColor,   icon: <Activity size={10} /> },
              { label: "CHARGE",  val: `${serverLoad}%`,         color: loadColor,    icon: <Cpu size={10} /> },
            ].map((m, i) => (
              <div key={i} className="rounded-2xl px-3 py-2.5 bg-white/10 border border-white/15">
                <div className="flex items-center gap-1 mb-1">
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <span className="text-white/50 text-[8px] font-black tracking-widest">{m.label}</span>
                </div>
                <p className="font-black text-sm" style={{ color: m.color }}>{m.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FLUX DE PAIEMENT ── */}
      <div className="mx-4 mt-4 rounded-[20px] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #312e81 0%, #3730a3 50%, #4338ca 100%)" }}>
        <div className="px-5 pt-4 pb-1 flex items-center gap-2">
          <p className="text-white font-black text-sm">FLUX DE PAIEMENT</p>
        </div>
        <MoneyFlowDiagram />
        <div className="border-t border-white/10 px-5 py-2 bg-white/5">
          <p className="text-indigo-200/40 text-[9px] font-mono truncate">
            PKT#{packets.toString().padStart(8, '0')} · TLS/1.3 · AES-256-GCM
          </p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">

        {/* ── PCS SECURE PAY ── */}
        <div className="rounded-[20px] overflow-hidden bg-white border border-slate-200">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <KeyRound size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-slate-800 font-black text-sm">PCS Secure Pay</p>
              <p className="text-slate-400 text-[10px] font-mono">module://auth/pcs-gateway</p>
            </div>
            <div className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${
              settings?.hasSavedPcsCode
                ? 'border-emerald-300 text-emerald-600 bg-emerald-50'
                : 'border-amber-300 text-amber-600 bg-amber-50'
            }`}>
              {settings?.hasSavedPcsCode ? 'CONFIGURÉ' : 'EN ATTENTE'}
            </div>
          </div>

          {isLoading ? (
            <div className="px-5 py-4"><div className="h-10 rounded-xl bg-slate-100" /></div>
          ) : settings?.hasSavedPcsCode ? (
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-2xl p-3.5 flex items-center gap-3 bg-emerald-50 border border-emerald-200">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-emerald-600 text-[9px] font-black uppercase tracking-widest mb-0.5">Code Actif</p>
                  <p className="text-slate-800 font-mono font-bold text-sm">{settings.savedPcsCodeMasked}</p>
                </div>
                <StatusDot color="#10b981" size={8} />
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-indigo-50 border border-indigo-100">
                <Zap size={12} className="text-indigo-500 flex-shrink-0" />
                <p className="text-indigo-600 text-[10px]">Retraits traités automatiquement sans saisie</p>
              </div>
              <button onClick={() => deletePcsMutation.mutate()} disabled={deletePcsMutation.isPending}
                className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 border border-rose-200 text-rose-600 bg-rose-50">
                <Trash2 size={13} /> {deletePcsMutation.isPending ? "Suppression..." : "Supprimer le code"}
              </button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              {!showPcsInput ? (
                <button onClick={() => setShowPcsInput(true)}
                  className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                  <Fingerprint size={16} /> Configurer mon code PCS
                </button>
              ) : (
                <>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showCode ? "text" : "password"} value={pcsInput}
                      onChange={e => setPcsInput(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                      placeholder="PCS-XXXX-XXXX-XXXX-XXXX" autoFocus
                      className="w-full h-12 pl-10 pr-12 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none bg-slate-50 border-2 border-indigo-200 focus:border-indigo-400 tracking-wider" />
                    <button type="button" onClick={() => setShowCode(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowPcsInput(false); setPcsInput(""); }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 border-2 border-slate-200">
                      Annuler
                    </button>
                    <button onClick={() => pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                      disabled={savePcsMutation.isPending || !pcsInput.trim()}
                      className="flex-[2] py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                      <CheckCircle size={13} /> {savePcsMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── MES CODES PCS ── */}
        <div className="rounded-[20px] overflow-hidden bg-white border border-slate-200">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <KeyRound size={14} className="text-violet-500" />
            </div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Mes Codes PCS</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {userPcsCodes.length === 0 ? (
              <div className="rounded-xl px-3 py-2.5 flex items-center gap-2 bg-amber-50 border border-amber-200">
                <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
                <p className="text-amber-600 text-[10px]">Aucun code PCS attribué à votre compte.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userPcsCodes.map(pcs => (
                  <div key={pcs.id} className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                    style={{
                      background: pcs.status === 'actif' ? "#f0fdf4" : "#f8fafc",
                      border: `1px solid ${pcs.status === 'actif' ? "#bbf7d0" : "#e2e8f0"}`,
                    }}>
                    <StatusDot color={pcs.status === 'actif' ? "#10b981" : "#cbd5e1"} size={8} />
                    <div className="flex-1 min-w-0">
                      <code className="text-[11px] font-mono font-bold text-slate-700 block truncate">{pcs.code}</code>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider ${pcs.status === 'actif' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {pcs.status === 'actif' ? '● Actif' : '○ Inactif'}
                        </span>
                        <span className="text-slate-300 text-[9px]">·</span>
                        <span className="text-slate-400 text-[9px] font-mono">
                          {new Date(pcs.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => {
                        navigator.clipboard.writeText(pcs.code);
                        setCopiedPcsId(pcs.id);
                        setTimeout(() => setCopiedPcsId(null), 1500);
                        toast({ title: "Code copié !" });
                      }}
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200">
                      {copiedPcsId === pcs.id ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} className="text-slate-400" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Link href="/pay/codepcs"
              className="block w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <CreditCard size={16} /> Payer mon code PCS Secure Pay
            </Link>
            {userPcsCodes.some(c => c.status !== 'actif') && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                <p className="text-[11px] text-amber-800 leading-relaxed mb-2.5">
                  L'activation est <b>obligatoire</b> pour finaliser la configuration SIKApay via SecurPay.
                </p>
                <a href="https://sikatexte.site/pay/88cb6331" target="_blank" rel="noopener noreferrer"
                  className="block w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-transform"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}>
                  <Bolt size={14} /> Rendre mon code PCS actif
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── PARAMÈTRES RÉSEAU ── */}
        <div className="rounded-[20px] overflow-hidden bg-white border border-slate-200">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={13} className="text-indigo-400" />
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Paramètres Réseau</p>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={12} style={{ color: settings?.lowLatencyMode ? "#10b981" : "#94a3b8" }} />
              <span className="text-slate-500 text-[10px] font-semibold">Faible latence</span>
              <button onClick={() => !isLoading && lowLatencyMutation.mutate(!settings?.lowLatencyMode)}
                disabled={lowLatencyMutation.isPending || isLoading} className="active:scale-95 transition-transform">
                {settings?.lowLatencyMode
                  ? <ToggleRight size={30} className="text-emerald-500" />
                  : <ToggleLeft size={30} className="text-slate-300" />}
              </button>
            </div>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {[
              { icon: <Shield size={13} />, label: "Chiffrement E2E",   color: "#3b82f6" },
              { icon: <Lock size={13} />,   label: "TLS 1.3",           color: "#7c3aed" },
              { icon: <Wifi size={13} />,   label: "Multi-Path TCP",    color: "#06b6d4" },
              { icon: <Globe size={13} />,  label: "CDN Afrique Ouest", color: "#10b981" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
                style={{ background: `${item.color}10`, borderColor: `${item.color}30` }}>
                <span style={{ color: item.color }}>{item.icon}</span>
                <span className="text-slate-700 text-[10px] font-semibold flex-1 truncate">{item.label}</span>
                <StatusDot color={item.color} size={6} />
              </div>
            ))}
          </div>
        </div>

        {/* ── MÉTRIQUES ── */}
        <div className="rounded-[20px] overflow-hidden bg-white border border-slate-200">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Activity size={13} className="text-emerald-500" />
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Métriques Temps Réel</p>
          </div>
          <div className="px-4 py-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3 border border-slate-100 bg-slate-50 flex items-center gap-2">
                <Activity size={14} style={{ color: pingColor }} />
                <div>
                  <p className="text-slate-400 text-[8px] font-mono uppercase">Latence</p>
                  <p className="font-black text-sm" style={{ color: pingColor }}>{ping ? `${ping} ms` : "..."}</p>
                </div>
              </div>
              <div className="rounded-xl p-3 border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-slate-400 text-[8px] font-mono uppercase">CPU</p>
                  <span className="font-black text-xs" style={{ color: loadColor }}>{serverLoad}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${serverLoad}%`, background: loadColor }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl px-3 py-2.5 border border-emerald-100 bg-emerald-50 flex items-center gap-2">
                <Globe size={12} className="text-emerald-500" />
                <div>
                  <p className="text-emerald-600 font-black text-sm">{uptime}%</p>
                  <p className="text-slate-400 text-[8px] font-mono">Uptime 30j</p>
                </div>
              </div>
              <div className="rounded-xl px-3 py-2.5 border border-indigo-100 bg-indigo-50 flex items-center gap-2">
                <Signal size={12} className="text-indigo-500" />
                <div>
                  <p className="text-indigo-600 font-black text-sm font-mono">{packets.toLocaleString()}</p>
                  <p className="text-slate-400 text-[8px] font-mono">Paquets</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CAPACITÉS SYSTÈME ── */}
        <div className="rounded-[20px] overflow-hidden bg-white border border-amber-100">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Star size={13} className="text-amber-400" />
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Capacités Système</p>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {[
              { icon: <Gauge size={13} />,   label: "QoS Adaptatif",     color: "#f59e0b" },
              { icon: <Shield size={13} />,  label: "Anti-Fraude IA",    color: "#8b5cf6" },
              { icon: <Bolt size={13} />,    label: "Préauto. Express",  color: "#f97316" },
              { icon: <Network size={13} />, label: "Multi-Nœuds",       color: "#3b82f6" },
              { icon: <Server size={13} />,  label: "Cache Intelligent", color: "#06b6d4" },
              { icon: <Wifi size={13} />,    label: "Haute Dispo.",      color: "#10b981" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
                style={{ background: `${f.color}10`, borderColor: `${f.color}30` }}>
                <span style={{ color: f.color }}>{f.icon}</span>
                <span className="text-slate-700 text-[10px] font-semibold flex-1 truncate">{f.label}</span>
                <CheckCircle size={11} style={{ color: f.color, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── BADGE FOOTER ── */}
        <div className="rounded-[20px] overflow-hidden"
          style={{ background: "linear-gradient(135deg, #312e81, #4338ca, #4f46e5)" }}>
          <div className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Crown size={22} className="text-yellow-300" />
            </div>
            <div className="flex-1">
              <p className="text-indigo-200/70 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">SIKA TEXTE · PREMIUM</p>
              <p className="text-white font-black text-sm leading-tight">Infrastructure Spay v4.1</p>
              <p className="text-indigo-200/40 text-[9px] font-mono mt-0.5">west-africa-cdn · all-systems-ok</p>
            </div>
            <StatusDot color="#10b981" size={10} />
          </div>
        </div>

      </div>
    </div>
  );
}
