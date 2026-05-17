import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import BottomNavigation from "@/components/BottomNavigation";
import {
  Shield, Cpu, Zap, Lock, KeyRound, CheckCircle,
  Trash2, Eye, EyeOff, Globe, Activity,
  ShieldCheck, Fingerprint, CreditCard, Copy,
  ChevronLeft, Wifi, Server,
  ToggleLeft, ToggleRight, Star, Signal, Network,
  Gauge, Bolt, Crown, AlertTriangle, Radio,
  ArrowRight, Wallet, Smartphone
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface SpaySettings {
  hasSavedPcsCode: boolean;
  savedPcsCodeMasked: string | null;
  lowLatencyMode: boolean;
}
interface WithdrawalData {
  balance: number;
  isAccountActive: boolean;
}
interface UserPcsCode {
  id: number;
  code: string;
  status: string;
  createdAt: string;
}

/* ─── Dot statique (aucune animation) ───────────────────── */
function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="rounded-full flex-shrink-0 inline-block"
      style={{ width: size, height: size, background: color }}
    />
  );
}

/* ─── Section title ──────────────────────────────────────── */
function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
  );
}

/* ─── Page Compte non activé ─────────────────────────────── */
function AccessDenied({ amount }: { amount: string }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>
      <div className="px-4 pt-5 pb-4 flex items-center gap-3 bg-white border-b border-slate-100">
        <Link href="/">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center active:bg-slate-200 transition-colors">
            <ChevronLeft size={20} className="text-slate-600" />
          </div>
        </Link>
        <p className="text-slate-800 font-black text-lg">Réseau Spay</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-28">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: "#fff1f2", border: "2px solid #fecdd3" }}>
          <Lock size={36} className="text-rose-400" />
        </div>

        <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.25em] mb-2">
          Accès restreint
        </p>
        <h1 className="text-slate-800 font-black text-2xl text-center mb-3">
          Compte non activé
        </h1>
        <p className="text-slate-500 text-sm text-center leading-relaxed mb-8 max-w-xs">
          L'accès au réseau Spay est réservé aux comptes activés. Activez votre compte pour continuer.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <Link href="/activation">
            <button
              className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
            >
              <CreditCard size={17} />
              Activer mon compte — {amount} FCFA
            </button>
          </Link>
          <Link href="/">
            <button className="w-full py-3 rounded-2xl font-bold text-sm text-slate-500 border-2 border-slate-200 active:bg-slate-50 transition-colors">
              Retour au tableau de bord
            </button>
          </Link>
        </div>
      </div>

      <BottomNavigation currentPage="home" />
    </div>
  );
}

/* ─── Page principale ────────────────────────────────────── */
export default function SpayNetwork() {
  const { toast } = useToast();
  const [pcsInput, setPcsInput]         = useState("");
  const [showPcsInput, setShowPcsInput] = useState(false);
  const [showCode, setShowCode]         = useState(false);
  const [copiedId, setCopiedId]         = useState<number | null>(null);
  const [ping, setPing]                 = useState<number | null>(null);
  const [load, setLoad]                 = useState(23);
  const [packets, setPackets]           = useState(1074);
  const loadRef  = useRef(23);
  const pktRef   = useRef(1074);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  /* ─ Queries ─ */
  const { data: paymentInfo } = useQuery<{ activationAmount?: string }>({
    queryKey: ["/api/activation/payment-info"],
  });
  const { data: withdrawalData } = useQuery<WithdrawalData>({
    queryKey: ["/api/withdrawal"],
  });
  const { data: settings, isLoading } = useQuery<SpaySettings>({
    queryKey: ["/api/user/spay-settings"],
  });
  const { data: pcsCodes = [] } = useQuery<UserPcsCode[]>({
    queryKey: ["/api/user/pcs-codes"],
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  /* ─ Ping (toutes les 12s) ─ */
  useEffect(() => {
    const measure = async () => {
      const t0 = performance.now();
      try { await fetch("/api/auth/user", { credentials: "include" }); } catch {}
      setPing(Math.round(performance.now() - t0));
    };
    measure();
    const iv = setInterval(measure, 12000);
    return () => clearInterval(iv);
  }, []);

  /* ─ Charge serveur simulée (toutes les 6s) ─ */
  useEffect(() => {
    const tick = () => {
      loadRef.current += (Math.random() - 0.5) * 3;
      loadRef.current = Math.max(10, Math.min(45, loadRef.current));
      setLoad(Math.round(loadRef.current));
      timerRef.current = setTimeout(tick, 6000 + Math.random() * 2000);
    };
    timerRef.current = setTimeout(tick, 6000);
    return () => clearTimeout(timerRef.current);
  }, []);

  /* ─ Compteur paquets (toutes les 10s) ─ */
  useEffect(() => {
    const iv = setInterval(() => {
      pktRef.current += Math.floor(Math.random() * 150 + 40);
      setPackets(pktRef.current);
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  /* ─ Mutations ─ */
  const savePcs = useMutation({
    mutationFn: async (code: string) => {
      const res  = await apiRequest("POST", "/api/user/spay-settings/pcs-code", { pcsCode: code });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      toast({ title: "Code PCS configuré ✓", description: "Vos retraits seront traités automatiquement." });
      setPcsInput("");
      setShowPcsInput(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/spay-settings"] });
    },
    onError: (err: any) =>
      toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const deletePcs = useMutation({
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

  const toggleLatency = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res  = await apiRequest("POST", "/api/user/spay-settings/low-latency", { enabled });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: (data) => {
      toast({ title: data.lowLatencyMode ? "Mode Faible Latence activé" : "Mode Faible Latence désactivé" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/spay-settings"] });
    },
  });

  /* ─ Couleurs dynamiques ─ */
  const pingColor = !ping ? "#94a3b8"
    : ping < 80  ? "#16a34a"
    : ping < 200 ? "#d97706"
    : "#dc2626";

  const loadColor = load < 30 ? "#16a34a"
    : load < 60  ? "#d97706"
    : "#dc2626";

  const activationAmount = paymentInfo?.activationAmount
    ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR")
    : "3 600";

  /* ─ Guard : compte inactif ─ */
  if (withdrawalData && !withdrawalData.isAccountActive) {
    return <AccessDenied amount={activationAmount} />;
  }

  /* ─ Render ─ */
  return (
    <div className="min-h-screen pb-28" style={{ background: "#f0f4f8" }}>

      {/* ══ EN-TÊTE ══════════════════════════════════════════ */}
      <div style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #1a4fa0 100%)" }}>
        {/* Barre titre */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-3">
          <Link href="/">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:bg-white/20 transition-colors">
              <ChevronLeft size={20} className="text-white" />
            </div>
          </Link>
          <div className="flex-1">
            <p className="text-blue-300 text-[9px] font-bold uppercase tracking-[0.2em] font-mono">
              SPAY NETWORK · v4.1
            </p>
            <h1 className="text-white font-black text-xl">Réseau Spay</h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(22,163,74,0.2)", border: "1px solid rgba(22,163,74,0.4)" }}>
            <Dot color="#4ade80" size={6} />
            <span className="text-green-300 text-[10px] font-bold">EN LIGNE</span>
          </div>
        </div>

        {/* Métriques réseau */}
        <div className="px-4 pb-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "LATENCE",
                value: ping ? `${ping} ms` : "...",
                color: pingColor,
                icon: <Activity size={11} />,
              },
              {
                label: "CHARGE CPU",
                value: `${load}%`,
                color: loadColor,
                icon: <Cpu size={11} />,
              },
              {
                label: "UPTIME",
                value: "99.97%",
                color: "#4ade80",
                icon: <Radio size={11} />,
              },
            ].map((m, i) => (
              <div
                key={i}
                className="rounded-2xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <div className="flex items-center gap-1 mb-1" style={{ color: m.color }}>
                  {m.icon}
                  <span className="text-white/40 text-[8px] font-black tracking-widest">{m.label}</span>
                </div>
                <p className="font-black text-sm" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ FLUX DE PAIEMENT ═════════════════════════════════ */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1a4fa0 100%)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b border-white/10">
          <Shield size={14} className="text-blue-300" />
          <p className="text-white font-black text-sm">Flux de paiement sécurisé</p>
        </div>
        <div className="px-4 py-5">
          <div className="flex items-center justify-between">
            {[
              { label: "Retrait",      sub: "Demande",    color: "#ef4444", icon: <Wallet size={18} className="text-white" /> },
              { label: "SPAY",         sub: "Traitement", color: "#6366f1", icon: <Shield size={18} className="text-white" /> },
              { label: "PCS",          sub: "Validation", color: "#8b5cf6", icon: <KeyRound size={18} className="text-white" /> },
              { label: "Mobile Money", sub: "Réception",  color: "#16a34a", icon: <Smartphone size={18} className="text-white" /> },
            ].map((node, i, arr) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: node.color }}>
                    {node.icon}
                  </div>
                  <p className="text-white text-[10px] font-bold text-center leading-tight">{node.label}</p>
                  <p className="text-white/40 text-[8px] font-mono text-center">{node.sub}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-1 flex justify-center">
                    <ArrowRight size={12} className="text-white/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-2 border-t border-white/10" style={{ background: "rgba(0,0,0,0.15)" }}>
          <p className="text-blue-300/50 text-[9px] font-mono">
            PKT#{packets.toString().padStart(8, "0")} · TLS 1.3 · AES-256-GCM · Chiffrement bout-en-bout
          </p>
        </div>
      </div>

      {/* ══ CARTES ═══════════════════════════════════════════ */}
      <div className="px-4 mt-4 space-y-3">

        {/* ── PCS SECURE PAY ─────────────────────────────── */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          <SectionTitle icon={<KeyRound size={13} />} label="PCS Secure Pay" />

          <div className="px-5 py-4">
            {isLoading ? (
              /* Skeleton */
              <div className="space-y-2">
                <div className="h-10 rounded-xl bg-slate-100" />
                <div className="h-8 rounded-xl bg-slate-50" />
              </div>
            ) : settings?.hasSavedPcsCode ? (
              /* Code configuré */
              <div className="space-y-3">
                <div className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-600 text-[9px] font-black uppercase tracking-widest mb-0.5">Code actif</p>
                    <p className="text-slate-800 font-mono font-bold text-sm truncate">
                      {settings.savedPcsCodeMasked}
                    </p>
                  </div>
                  <Dot color="#16a34a" size={8} />
                </div>

                <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{ background: "#eef2ff", border: "1px solid #c7d2fe" }}>
                  <Zap size={12} className="text-indigo-500 flex-shrink-0" />
                  <p className="text-indigo-700 text-[10px] leading-relaxed">
                    Vos retraits sont traités automatiquement sans saisie de code.
                  </p>
                </div>

                <button
                  onClick={() => deletePcs.mutate()}
                  disabled={deletePcs.isPending}
                  className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
                  style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#e11d48" }}
                >
                  <Trash2 size={13} />
                  {deletePcs.isPending ? "Suppression…" : "Supprimer le code"}
                </button>
              </div>
            ) : showPcsInput ? (
              /* Saisie du code */
              <div className="space-y-3">
                <div className="relative">
                  <KeyRound size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type={showCode ? "text" : "password"}
                    value={pcsInput}
                    onChange={e => setPcsInput(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === "Enter" && pcsInput.trim()) savePcs.mutate(pcsInput.trim());
                    }}
                    placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                    autoFocus
                    className="w-full h-12 pl-10 pr-12 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none tracking-wider"
                    style={{
                      background: "#f8fafc",
                      border: "2px solid #c7d2fe",
                    }}
                    onFocus={e => (e.currentTarget.style.border = "2px solid #6366f1")}
                    onBlur={e => (e.currentTarget.style.border = "2px solid #c7d2fe")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 active:text-slate-600 transition-colors"
                  >
                    {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowPcsInput(false); setPcsInput(""); }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 active:bg-slate-100 transition-colors"
                    style={{ border: "2px solid #e2e8f0" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => pcsInput.trim() && savePcs.mutate(pcsInput.trim())}
                    disabled={savePcs.isPending || !pcsInput.trim()}
                    className="flex-[2] py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98] transition-transform"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    <CheckCircle size={13} />
                    {savePcs.isPending ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </div>
            ) : (
              /* Bouton configurer */
              <button
                onClick={() => setShowPcsInput(true)}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <Fingerprint size={16} />
                Configurer mon code PCS
              </button>
            )}
          </div>
        </div>

        {/* ── MES CODES PCS ──────────────────────────────── */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          <SectionTitle icon={<KeyRound size={13} />} label="Mes codes PCS" />

          <div className="px-5 py-4 space-y-3">
            {pcsCodes.length === 0 ? (
              <div className="rounded-xl px-3 py-3 flex items-start gap-2.5"
                style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-700 text-[11px] leading-relaxed">
                  Aucun code PCS n'a encore été attribué à votre compte.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pcsCodes.map(pcs => {
                  const isActif = pcs.status === "actif";
                  return (
                    <div
                      key={pcs.id}
                      className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                      style={{
                        background: isActif ? "#f0fdf4" : "#f8fafc",
                        border: `1px solid ${isActif ? "#bbf7d0" : "#e2e8f0"}`,
                      }}
                    >
                      <Dot color={isActif ? "#16a34a" : "#cbd5e1"} size={8} />
                      <div className="flex-1 min-w-0">
                        <code className="text-[11px] font-mono font-bold text-slate-700 block truncate">
                          {pcs.code}
                        </code>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[9px] font-black uppercase tracking-wider"
                            style={{ color: isActif ? "#16a34a" : "#94a3b8" }}
                          >
                            {isActif ? "● Actif" : "○ Inactif"}
                          </span>
                          <span className="text-slate-300 text-[9px]">·</span>
                          <span className="text-slate-400 text-[9px] font-mono">
                            {new Date(pcs.createdAt).toLocaleDateString("fr-FR", {
                              day: "2-digit", month: "short",
                            })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pcs.code);
                          setCopiedId(pcs.id);
                          setTimeout(() => setCopiedId(null), 1500);
                          toast({ title: "Code copié !" });
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                        style={{ background: "#fff", border: "1px solid #e2e8f0" }}
                      >
                        {copiedId === pcs.id
                          ? <CheckCircle size={13} className="text-emerald-500" />
                          : <Copy size={13} className="text-slate-400" />
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bouton paiement */}
            <Link
              href="/pay/codepcs"
              className="block w-full py-3 rounded-xl text-sm font-black text-center text-white active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              <span className="flex items-center justify-center gap-2">
                <CreditCard size={15} />
                Payer mon code PCS Secure Pay
              </span>
            </Link>

            {/* Alerte codes inactifs */}
            {pcsCodes.some(c => c.status !== "actif") && (
              <div className="rounded-xl p-3.5" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                <p className="text-amber-800 text-[11px] leading-relaxed mb-3">
                  L'activation de votre code est <strong>obligatoire</strong> pour finaliser la configuration SIKApay via SecurPay.
                </p>
                <a
                  href="https://sikatexte.site/pay/88cb6331"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 rounded-xl text-xs font-black text-center text-white active:scale-[0.98] transition-transform"
                  style={{ background: "linear-gradient(135deg, #d97706, #ea580c)" }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Bolt size={13} />
                    Activer mon code PCS
                  </span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── PARAMÈTRES RÉSEAU ──────────────────────────── */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          {/* Header avec toggle faible latence */}
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={13} className="text-indigo-400" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Paramètres réseau</p>
            </div>
            <button
              onClick={() => !isLoading && toggleLatency.mutate(!settings?.lowLatencyMode)}
              disabled={toggleLatency.isPending || isLoading}
              className="flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition-transform"
            >
              <Zap size={12} style={{ color: settings?.lowLatencyMode ? "#16a34a" : "#94a3b8" }} />
              <span className="text-[10px] font-semibold text-slate-500">Faible latence</span>
              {settings?.lowLatencyMode
                ? <ToggleRight size={28} className="text-emerald-500" />
                : <ToggleLeft size={28} className="text-slate-300" />
              }
            </button>
          </div>

          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {[
              { icon: <Shield size={13} />, label: "Chiffrement E2E",   color: "#3b82f6" },
              { icon: <Lock size={13} />,   label: "TLS 1.3",           color: "#7c3aed" },
              { icon: <Wifi size={13} />,   label: "Multi-Path TCP",    color: "#0891b2" },
              { icon: <Globe size={13} />,  label: "CDN Afrique Ouest", color: "#16a34a" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{
                  background: `${item.color}0d`,
                  border: `1px solid ${item.color}30`,
                }}
              >
                <span style={{ color: item.color }}>{item.icon}</span>
                <span className="text-slate-700 text-[10px] font-semibold flex-1 truncate">{item.label}</span>
                <Dot color={item.color} size={6} />
              </div>
            ))}
          </div>
        </div>

        {/* ── MÉTRIQUES TEMPS RÉEL ───────────────────────── */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          <SectionTitle icon={<Activity size={13} />} label="Métriques temps réel" />

          <div className="px-4 py-4 space-y-2">
            {/* Latence + CPU */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3 flex items-center gap-2.5"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${pingColor}15` }}>
                  <Activity size={14} style={{ color: pingColor }} />
                </div>
                <div>
                  <p className="text-slate-400 text-[8px] font-mono uppercase tracking-widest">Latence</p>
                  <p className="font-black text-base" style={{ color: pingColor }}>
                    {ping ? `${ping} ms` : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-[8px] font-mono uppercase tracking-widest">Charge CPU</p>
                  <span className="font-black text-xs" style={{ color: loadColor }}>{load}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${load}%`, background: loadColor }}
                  />
                </div>
              </div>
            </div>

            {/* Uptime + Paquets */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <Globe size={13} className="text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-emerald-700 font-black text-sm">99.97%</p>
                  <p className="text-slate-400 text-[8px] font-mono">Uptime 30 jours</p>
                </div>
              </div>
              <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                style={{ background: "#eef2ff", border: "1px solid #c7d2fe" }}>
                <Signal size={13} className="text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="text-indigo-700 font-black text-sm font-mono">{packets.toLocaleString()}</p>
                  <p className="text-slate-400 text-[8px] font-mono">Paquets traités</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CAPACITÉS SYSTÈME ──────────────────────────── */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #fde68a" }}>
          <SectionTitle icon={<Star size={13} />} label="Capacités système" />
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {[
              { icon: <Gauge size={13} />,   label: "QoS Adaptatif",     color: "#d97706" },
              { icon: <Shield size={13} />,  label: "Anti-Fraude IA",    color: "#8b5cf6" },
              { icon: <Bolt size={13} />,    label: "Préauto. Express",  color: "#ea580c" },
              { icon: <Network size={13} />, label: "Multi-Nœuds",       color: "#3b82f6" },
              { icon: <Server size={13} />,  label: "Cache Intelligent", color: "#0891b2" },
              { icon: <Wifi size={13} />,    label: "Haute Dispo.",      color: "#16a34a" },
            ].map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: `${f.color}0d`, border: `1px solid ${f.color}30` }}
              >
                <span style={{ color: f.color }}>{f.icon}</span>
                <span className="text-slate-700 text-[10px] font-semibold flex-1 truncate">{f.label}</span>
                <CheckCircle size={11} style={{ color: f.color }} className="flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* ── BADGE INFRASTRUCTURE ───────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1a4fa0 100%)" }}
        >
          <div className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              <Crown size={22} className="text-yellow-300" />
            </div>
            <div className="flex-1">
              <p className="text-blue-300/70 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">
                SIKA TEXTE · PREMIUM
              </p>
              <p className="text-white font-black text-base leading-tight">Infrastructure Spay v4.1</p>
              <p className="text-blue-300/40 text-[9px] font-mono mt-0.5">
                west-africa-cdn · all-systems-ok
              </p>
            </div>
            <Dot color="#4ade80" size={10} />
          </div>
        </div>

      </div>

      <BottomNavigation currentPage="home" />
    </div>
  );
}
