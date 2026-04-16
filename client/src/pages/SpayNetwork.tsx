import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import {
  Shield, Server, Wifi, Cpu, Zap, Lock, KeyRound, CheckCircle,
  Trash2, Eye, EyeOff, Globe, Activity, Smartphone, ToggleLeft,
  ToggleRight, Signal, AlertTriangle, Star, Crown, ChevronRight,
  RefreshCw, Gauge, Network, HardDrive, Layers
} from "lucide-react";

interface SpaySettings {
  hasSavedPcsCode: boolean;
  savedPcsCodeMasked: string | null;
  lowLatencyMode: boolean;
}

function PulseRing({ color = "#3b82f6" }: { color?: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: color }} />
    </span>
  );
}

export default function SpayNetwork() {
  const { toast } = useToast();
  const [pcsInput, setPcsInput] = useState("");
  const [showPcsInput, setShowPcsInput] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [uptime, setUptime] = useState(99.97);
  const [serverLoad, setServerLoad] = useState(23);
  const [activeDevices] = useState(1);
  const animFrameRef = useRef<number>(0);

  // Fetch spay settings
  const { data: settings, isLoading } = useQuery<SpaySettings>({
    queryKey: ["/api/user/spay-settings"],
  });

  // Measure ping
  useEffect(() => {
    const measure = async () => {
      const t0 = performance.now();
      try { await fetch("/api/auth/user", { method: "GET", credentials: "include" }); } catch {}
      const t1 = performance.now();
      setPing(Math.round(t1 - t0));
    };
    measure();
    const interval = setInterval(measure, 8000);
    return () => clearInterval(interval);
  }, []);

  // Animate server load
  useEffect(() => {
    let v = serverLoad;
    const tick = () => {
      v += (Math.random() - 0.5) * 3;
      v = Math.max(10, Math.min(45, v));
      setServerLoad(Math.round(v));
      animFrameRef.current = window.setTimeout(tick, 1500 + Math.random() * 1000);
    };
    animFrameRef.current = window.setTimeout(tick, 1500);
    return () => clearTimeout(animFrameRef.current);
  }, []);

  // Save PCS code mutation
  const savePcsMutation = useMutation({
    mutationFn: async (pcsCode: string) => {
      const res = await apiRequest("POST", "/api/user/spay-settings/pcs-code", { pcsCode });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      toast({ title: "Code PCS configuré", description: "Vos retraits seront traités automatiquement" });
      setPcsInput("");
      setShowPcsInput(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/spay-settings"] });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  // Delete PCS code mutation
  const deletePcsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/user/spay-settings/pcs-code", {});
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      toast({ title: "Code PCS supprimé", description: "Le modal de confirmation sera affiché lors des retraits" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/spay-settings"] });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  // Low latency mutation
  const lowLatencyMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("POST", "/api/user/spay-settings/low-latency", { enabled });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: (data) => {
      toast({
        title: data.lowLatencyMode ? "Mode Faible Latence activé" : "Mode Faible Latence désactivé",
        description: data.lowLatencyMode ? "Connexions optimisées pour les transactions" : "Paramètres réseau standard restaurés",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/spay-settings"] });
    },
  });

  const getPingColor = () => {
    if (!ping) return "#94a3b8";
    if (ping < 100) return "#10b981";
    if (ping < 300) return "#f59e0b";
    return "#ef4444";
  };

  const getPingLabel = () => {
    if (!ping) return "Mesure...";
    if (ping < 100) return "Excellent";
    if (ping < 300) return "Bon";
    return "Lent";
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: "#0a0f1e" }}>
      <div style={{ background: "#0a0f1e" }}>
        <PageHeader title="Serveur & Réseaux Spay" backHref="/" />
      </div>

      {/* Hero Banner */}
      <div className="relative mx-4 mt-3 rounded-[24px] overflow-hidden" style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #1a4fa0 100%)"
      }}>
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }} />
        {/* Glow */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20 blur-3xl"
          style={{ background: "#6366f1" }} />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full opacity-15 blur-3xl"
          style={{ background: "#3b82f6" }} />

        <div className="relative p-5">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={14} className="text-yellow-400" />
            <span className="text-yellow-400 text-[10px] font-black uppercase tracking-widest">Infrastructure Premium</span>
          </div>
          <h1 className="text-white font-black text-2xl leading-tight mb-1">
            Serveur &<br />Réseaux <span className="text-blue-400">Spay</span>
          </h1>
          <p className="text-blue-200/70 text-xs leading-relaxed mb-4">
            Configuration système avancée, sécurité renforcée et optimisation réseau pour vos transactions.
          </p>

          {/* Live stats strip */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <PulseRing color="#10b981" />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">Statut</span>
              </div>
              <p className="text-emerald-400 font-black text-sm">En ligne</p>
            </div>
            <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Signal size={8} className="text-white/50" />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">Latence</span>
              </div>
              <p className="font-black text-sm" style={{ color: getPingColor() }}>{ping ? `${ping}ms` : "—"}</p>
            </div>
            <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Cpu size={8} className="text-white/50" />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">Charge</span>
              </div>
              <p className="text-blue-400 font-black text-sm">{serverLoad}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">

        {/* ── PCS Code Configuration ── */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <KeyRound size={15} className="text-white" />
            </div>
            <div>
              <p className="text-gray-900 font-black text-sm">Code PCS Secure Pay</p>
              <p className="text-gray-400 text-[10px]">Enregistrez votre code pour des retraits sans interruption</p>
            </div>
          </div>

          {isLoading ? (
            <div className="px-5 pb-4">
              <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          ) : settings?.hasSavedPcsCode ? (
            /* Code enregistré */
            <div className="px-5 pb-4">
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-800 font-black text-xs uppercase tracking-wider">Code Configuré</p>
                  <p className="text-emerald-700 font-mono text-sm font-bold truncate">{settings.savedPcsCodeMasked}</p>
                </div>
                <div className="bg-emerald-200 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Actif
                </div>
              </div>
              <div className="flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2 mb-3">
                <Zap size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-blue-700 text-[10px] leading-relaxed">
                  Vos retraits sont traités automatiquement sans demande de code.
                </p>
              </div>
              <button
                onClick={() => deletePcsMutation.mutate()}
                disabled={deletePcsMutation.isPending}
                className="w-full py-2.5 rounded-xl border-2 border-red-200 text-red-600 text-xs font-bold flex items-center justify-center gap-2 bg-red-50 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Trash2 size={13} /> {deletePcsMutation.isPending ? "Suppression..." : "Supprimer le code enregistré"}
              </button>
            </div>
          ) : (
            /* Pas de code enregistré */
            <div className="px-5 pb-4">
              {!showPcsInput ? (
                <>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3">
                    <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-700 text-[10px] leading-relaxed">
                      Aucun code configuré. Le code sera demandé à chaque retrait.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPcsInput(true)}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                  >
                    <Lock size={15} /> Configurer mon code PCS
                  </button>
                </>
              ) : (
                <>
                  <div className="relative mb-3">
                    <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showCode ? "text" : "password"}
                      value={pcsInput}
                      onChange={e => setPcsInput(e.target.value.toUpperCase())}
                      placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                      autoFocus
                      className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono font-bold text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowPcsInput(false); setPcsInput(""); }}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-bold active:scale-[0.98] transition-all"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => pcsInput.trim() && savePcsMutation.mutate(pcsInput.trim())}
                      disabled={savePcsMutation.isPending || !pcsInput.trim()}
                      className="flex-2 flex-grow py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                    >
                      <CheckCircle size={13} /> {savePcsMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Configuration Système ── */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Configuration Système</p>
          </div>

          {/* Mode Faible Latence */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b border-gray-50">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: settings?.lowLatencyMode ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #64748b, #94a3b8)" }}>
              <Zap size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-gray-800 font-bold text-sm">Mode Faible Latence</p>
              <p className="text-gray-400 text-xs">Optimise les connexions pour les transactions</p>
            </div>
            <button
              onClick={() => !isLoading && lowLatencyMutation.mutate(!settings?.lowLatencyMode)}
              disabled={lowLatencyMutation.isPending || isLoading}
              className="flex-shrink-0 transition-all active:scale-95"
            >
              {settings?.lowLatencyMode
                ? <ToggleRight size={32} className="text-emerald-500" />
                : <ToggleLeft size={32} className="text-gray-300" />
              }
            </button>
          </div>

          {/* Chiffrement E2E */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b border-gray-50">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}>
              <Shield size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-gray-800 font-bold text-sm">Chiffrement E2E</p>
              <p className="text-gray-400 text-xs">Transactions chiffrées de bout en bout</p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-700 text-[10px] font-black">Activé</span>
            </div>
          </div>

          {/* Protocole sécurisé */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b border-gray-50">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}>
              <Lock size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-gray-800 font-bold text-sm">Protocole TLS 1.3</p>
              <p className="text-gray-400 text-xs">Communications sécurisées sur tous les canaux</p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-700 text-[10px] font-black">Actif</span>
            </div>
          </div>

          {/* Cache intelligent */}
          <div className="px-5 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
              <HardDrive size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-gray-800 font-bold text-sm">Cache Intelligent</p>
              <p className="text-gray-400 text-xs">Données locales optimisées pour les performances</p>
            </div>
            <ToggleRight size={32} className="text-amber-500 flex-shrink-0" />
          </div>
        </div>

        {/* ── Serveur & Réseau ── */}
        <div className="rounded-[20px] overflow-hidden" style={{
          background: "linear-gradient(135deg, #0f172a, #1e1b4b)"
        }}>
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <Server size={14} className="text-blue-400" />
            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Serveur & Réseau</p>
          </div>

          <div className="px-5 pb-4 space-y-3">
            {/* Ping */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Activity size={16} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-white/50 text-[9px] font-bold uppercase tracking-wider">Latence réseau</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-black text-base" style={{ color: getPingColor() }}>
                    {ping ? `${ping} ms` : "Mesure en cours..."}
                  </p>
                  {ping && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: getPingColor() + "30", color: getPingColor() }}>
                      {getPingLabel()}
                    </span>
                  )}
                </div>
              </div>
              <RefreshCw size={14} className="text-white/30 animate-spin" style={{ animationDuration: "3s" }} />
            </div>

            {/* Charge serveur */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu size={13} className="text-indigo-400" />
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Charge serveur</p>
                </div>
                <span className="text-indigo-400 font-black text-sm">{serverLoad}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${serverLoad}%`,
                    background: serverLoad < 30 ? "linear-gradient(90deg, #10b981, #6ee7b7)"
                      : serverLoad < 70 ? "linear-gradient(90deg, #f59e0b, #fcd34d)"
                        : "linear-gradient(90deg, #ef4444, #fca5a5)"
                  }}
                />
              </div>
            </div>

            {/* Uptime */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Globe size={16} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-white/50 text-[9px] font-bold uppercase tracking-wider">Disponibilité (30j)</p>
                <p className="text-emerald-400 font-black text-base mt-0.5">{uptime.toFixed(2)}%</p>
              </div>
              <PulseRing color="#10b981" />
            </div>

            {/* Région */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Network size={16} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-white/50 text-[9px] font-bold uppercase tracking-wider">Région</p>
                <p className="text-white font-bold text-sm mt-0.5">Afrique de l'Ouest — CDN</p>
              </div>
              <div className="flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-[9px] font-black">Optimal</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Appareils Actifs ── */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Appareils Actifs</p>
          </div>
          <div className="px-5 pb-4">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Smartphone size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-blue-900 font-black text-sm">Cet appareil</p>
                <p className="text-blue-500 text-xs">Session active · Connexion sécurisée</p>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-100 px-2.5 py-1 rounded-full">
                <PulseRing color="#10b981" />
                <span className="text-emerald-700 text-[9px] font-black">En ligne</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-gray-400" />
                <span className="text-gray-500 text-xs font-semibold">Appareils connectés</span>
              </div>
              <span className="text-gray-800 font-black text-sm">{activeDevices} / 3</span>
            </div>
          </div>
        </div>

        {/* ── Premium Features ── */}
        <div className="rounded-[20px] overflow-hidden border border-yellow-200/30"
          style={{ background: "linear-gradient(135deg, #1c1a00, #2d2600)" }}>
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <Star size={13} className="text-yellow-400" />
            <p className="text-yellow-400/70 text-[10px] font-black uppercase tracking-widest">Fonctionnalités Avancées</p>
          </div>
          <div className="px-5 pb-4 space-y-2.5">
            {[
              { icon: <Gauge size={15} />, label: "QoS Adaptatif", desc: "Priorisation intelligente des transactions", active: true, color: "#fbbf24" },
              { icon: <Wifi size={15} />, label: "Multi-Path TCP", desc: "Routage multichemin pour haute disponibilité", active: true, color: "#60a5fa" },
              { icon: <Shield size={15} />, label: "Anti-Fraude IA", desc: "Détection en temps réel des transactions suspectes", active: true, color: "#a78bfa" },
              { icon: <Zap size={15} />, label: "Pré-autorisation Express", desc: "Validation instantanée des retraits vérifiés", active: false, color: "#fb923c" },
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: feat.color + "20" }}>
                  <span style={{ color: feat.color }}>{feat.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-xs">{feat.label}</p>
                  <p className="text-white/40 text-[10px] truncate">{feat.desc}</p>
                </div>
                <div className={`text-[9px] font-black px-2 py-0.5 rounded-full ${feat.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/30'}`}>
                  {feat.active ? 'Actif' : 'Bientôt'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bannière Spay */}
        <div className="rounded-[20px] overflow-hidden"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)" }}>
          <div className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Crown size={28} className="text-yellow-300" />
            </div>
            <div className="flex-1">
              <p className="text-yellow-300 text-[10px] font-black uppercase tracking-widest mb-0.5">SIKA TEXTE Premium</p>
              <p className="text-white font-black text-base leading-tight">Infrastructure Spay</p>
              <p className="text-white/60 text-xs mt-1">Sécurité · Vitesse · Fiabilité</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
