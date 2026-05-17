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
  ChevronLeft, Wifi, Network,
  Gauge, Bolt, Crown, AlertTriangle, Radio,
  ArrowRight, Wallet, Smartphone, ToggleLeft, ToggleRight,
  Signal, Star, Server
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

/* ─── Dot coloré statique ────────────────────────────────── */
function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

/* ─── Page compte non activé ─────────────────────────────── */
function AccessDenied({ amount }: { amount: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", overflow: "hidden" }}>
      <div style={{ padding: "20px 16px 16px", display: "flex", alignItems: "center", gap: 12, background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        <Link href="/">
          <div style={{ width: 36, height: 36, background: "#f1f5f9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={20} color="#475569" />
          </div>
        </Link>
        <span style={{ fontWeight: 900, fontSize: 18, color: "#1e293b" }}>Réseau Spay</span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 112px" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#fff1f2", border: "2px solid #fecdd3", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <Lock size={36} color="#fb7185" />
        </div>
        <p style={{ fontSize: 10, fontWeight: 900, color: "#f43f5e", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Accès restreint</p>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", textAlign: "center", marginBottom: 12 }}>Compte non activé</h1>
        <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 1.6, marginBottom: 32, maxWidth: 300 }}>
          L'accès au réseau Spay est réservé aux comptes activés.
        </p>
        <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/activation">
            <button style={{ width: "100%", padding: "14px 0", borderRadius: 16, fontWeight: 900, fontSize: 14, color: "#fff", background: "linear-gradient(135deg, #1a4fa0, #3b82f6)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
              <CreditCard size={16} />
              Activer — {amount} FCFA
            </button>
          </Link>
          <Link href="/">
            <button style={{ width: "100%", padding: "12px 0", borderRadius: 16, fontWeight: 700, fontSize: 14, color: "#64748b", background: "#fff", border: "2px solid #e2e8f0", cursor: "pointer" }}>
              Retour au tableau de bord
            </button>
          </Link>
        </div>
      </div>

      <BottomNavigation currentPage="home" />
    </div>
  );
}

/* ─── Composant principal ────────────────────────────────── */
export default function SpayNetwork() {
  const { toast } = useToast();

  /* États UI uniquement — pas d'états mis à jour par timer */
  const [pcsInput, setPcsInput]         = useState("");
  const [showPcsInput, setShowPcsInput] = useState(false);
  const [showCode, setShowCode]         = useState(false);
  const [copiedId, setCopiedId]         = useState<number | null>(null);
  const [pingMs, setPingMs]             = useState<number | null>(null);

  /* Ref pour s'assurer que le ping ne se lance qu'une seule fois */
  const pingDone = useRef(false);

  /* ─ Ping unique au montage (une seule mesure, pas d'interval) ─ */
  useEffect(() => {
    if (pingDone.current) return;
    pingDone.current = true;
    const t0 = performance.now();
    fetch("/api/auth/user", { credentials: "include" })
      .catch(() => {})
      .finally(() => setPingMs(Math.round(performance.now() - t0)));
  }, []);

  /* ─ Queries ─ */
  const { data: paymentInfo } = useQuery<{ activationAmount?: string }>({
    queryKey: ["/api/activation/payment-info"],
    staleTime: 60000,
  });
  const { data: withdrawalData } = useQuery<WithdrawalData>({
    queryKey: ["/api/withdrawal"],
    staleTime: 30000,
  });
  const { data: settings, isLoading } = useQuery<SpaySettings>({
    queryKey: ["/api/user/spay-settings"],
    staleTime: 30000,
  });
  const { data: pcsCodes = [] } = useQuery<UserPcsCode[]>({
    queryKey: ["/api/user/pcs-codes"],
    staleTime: 15000,
    refetchOnWindowFocus: true,
  });

  /* ─ Mutations ─ */
  const savePcs = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/user/spay-settings/pcs-code", { pcsCode: code });
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
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const deletePcs = useMutation({
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

  const toggleLatency = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("POST", "/api/user/spay-settings/low-latency", { enabled });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: (data) => {
      toast({ title: data.lowLatencyMode ? "Mode Faible Latence activé" : "Mode Faible Latence désactivé" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/spay-settings"] });
    },
  });

  /* ─ Valeurs calculées ─ */
  const pingColor = !pingMs ? "#94a3b8" : pingMs < 80 ? "#16a34a" : pingMs < 200 ? "#d97706" : "#dc2626";
  const pingLabel = !pingMs ? "—" : `${pingMs} ms`;

  const activationAmount = paymentInfo?.activationAmount
    ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR")
    : "3 600";

  /* ─ Guard compte inactif ─ */
  if (withdrawalData && !withdrawalData.isAccountActive) {
    return <AccessDenied amount={activationAmount} />;
  }

  /* ─────────────────────────────────────────────────────────
     RENDU
  ───────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", paddingBottom: 112, background: "#f0f4f8", overflow: "hidden" }}>

      {/* ══ EN-TÊTE ══════════════════════════════════════════ */}
      <div style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #1a4fa0 100%)", overflow: "hidden" }}>

        {/* Barre titre */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 16px 12px" }}>
          <Link href="/">
            <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={20} color="#fff" />
            </div>
          </Link>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(147,197,253,0.7)", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 2 }}>
              SPAY NETWORK · v4.1
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0 }}>Réseau Spay</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: "rgba(22,163,74,0.2)", border: "1px solid rgba(22,163,74,0.4)" }}>
            <Dot color="#4ade80" size={6} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#86efac" }}>EN LIGNE</span>
          </div>
        </div>

        {/* Métriques statiques */}
        <div style={{ padding: "0 16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "LATENCE",    value: pingLabel,  color: pingColor,  icon: <Activity size={11} /> },
            { label: "CHARGE CPU", value: "23%",      color: "#16a34a",  icon: <Cpu size={11} /> },
            { label: "UPTIME",     value: "99.97%",   color: "#4ade80",  icon: <Radio size={11} /> },
          ].map((m, i) => (
            <div key={i} style={{ borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, color: m.color }}>
                {m.icon}
                <span style={{ fontSize: 8, fontWeight: 900, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>{m.label}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 900, color: m.color, margin: 0 }}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FLUX DE PAIEMENT ═════════════════════════════════ */}
      <div style={{ margin: "16px 16px 0", borderRadius: 18, overflow: "hidden", background: "linear-gradient(135deg, #1e3a5f 0%, #1a4fa0 100%)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <Shield size={14} color="#93c5fd" />
          <p style={{ fontSize: 13, fontWeight: 900, color: "#fff", margin: 0 }}>Flux de paiement sécurisé</p>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {[
              { label: "Retrait",      sub: "Demande",    color: "#ef4444", icon: <Wallet size={16} color="#fff" /> },
              { label: "SPAY",         sub: "Traitement", color: "#6366f1", icon: <Shield size={16} color="#fff" /> },
              { label: "PCS",          sub: "Validation", color: "#8b5cf6", icon: <KeyRound size={16} color="#fff" /> },
              { label: "Mobile",       sub: "Réception",  color: "#16a34a", icon: <Smartphone size={16} color="#fff" /> },
            ].map((node, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: node.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {node.icon}
                  </div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#fff", textAlign: "center", margin: 0, lineHeight: 1.2 }}>{node.label}</p>
                  <p style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", margin: 0 }}>{node.sub}</p>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    <ArrowRight size={11} color="rgba(255,255,255,0.25)" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "8px 20px", background: "rgba(0,0,0,0.15)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontSize: 9, color: "rgba(147,197,253,0.4)", fontFamily: "monospace", margin: 0 }}>
            TLS 1.3 · AES-256-GCM · Chiffrement bout-en-bout
          </p>
        </div>
      </div>

      {/* ══ CARTES ═══════════════════════════════════════════ */}
      <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── PCS SECURE PAY ──────────────────────────────── */}
        <div style={{ borderRadius: 18, background: "#fff", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
            <KeyRound size={13} color="#94a3b8" />
            <p style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>PCS Secure Pay</p>
          </div>

          <div style={{ padding: "16px 20px" }}>
            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 40, borderRadius: 12, background: "#f1f5f9" }} />
                <div style={{ height: 32, borderRadius: 12, background: "#f8fafc" }} />
              </div>
            ) : settings?.hasSavedPcsCode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ShieldCheck size={18} color="#16a34a" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 9, fontWeight: 900, color: "#16a34a", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 2 }}>Code actif</p>
                    <p style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                      {settings.savedPcsCodeMasked}
                    </p>
                  </div>
                  <Dot color="#16a34a" size={8} />
                </div>

                <div style={{ borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, background: "#eef2ff", border: "1px solid #c7d2fe" }}>
                  <Zap size={12} color="#6366f1" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "#4338ca", lineHeight: 1.5, margin: 0 }}>
                    Vos retraits sont traités automatiquement.
                  </p>
                </div>

                <button
                  onClick={() => deletePcs.mutate()}
                  disabled={deletePcs.isPending}
                  style={{ width: "100%", padding: "10px 0", borderRadius: 12, fontSize: 12, fontWeight: 700, color: "#e11d48", background: "#fff1f2", border: "1px solid #fecdd3", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", opacity: deletePcs.isPending ? 0.5 : 1 }}
                >
                  <Trash2 size={13} />
                  {deletePcs.isPending ? "Suppression…" : "Supprimer le code"}
                </button>
              </div>
            ) : showPcsInput ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <KeyRound size={14} color="#94a3b8" />
                  </div>
                  <input
                    type={showCode ? "text" : "password"}
                    value={pcsInput}
                    onChange={e => setPcsInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter" && pcsInput.trim()) savePcs.mutate(pcsInput.trim()); }}
                    placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                    autoFocus
                    style={{ width: "100%", height: 48, paddingLeft: 36, paddingRight: 44, borderRadius: 12, fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#1e293b", background: "#f8fafc", border: "2px solid #c7d2fe", outline: "none", boxSizing: "border-box", letterSpacing: "0.05em" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(v => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
                  >
                    {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setShowPcsInput(false); setPcsInput(""); }}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 12, fontWeight: 700, color: "#64748b", background: "#fff", border: "2px solid #e2e8f0", cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => pcsInput.trim() && savePcs.mutate(pcsInput.trim())}
                    disabled={savePcs.isPending || !pcsInput.trim()}
                    style={{ flex: 2, padding: "10px 0", borderRadius: 12, fontSize: 12, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", opacity: (savePcs.isPending || !pcsInput.trim()) ? 0.4 : 1 }}
                  >
                    <CheckCircle size={13} />
                    {savePcs.isPending ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPcsInput(true)}
                style={{ width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
              >
                <Fingerprint size={16} />
                Configurer mon code PCS
              </button>
            )}
          </div>
        </div>

        {/* ── MES CODES PCS ───────────────────────────────── */}
        <div style={{ borderRadius: 18, background: "#fff", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
            <KeyRound size={13} color="#94a3b8" />
            <p style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>Mes codes PCS</p>
          </div>

          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {pcsCodes.length === 0 ? (
              <div style={{ borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10, background: "#fffbeb", border: "1px solid #fde68a" }}>
                <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5, margin: 0 }}>
                  Aucun code PCS n'a encore été attribué à votre compte.
                </p>
              </div>
            ) : (
              pcsCodes.map(pcs => {
                const isActif = pcs.status === "actif";
                return (
                  <div
                    key={pcs.id}
                    style={{ borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, background: isActif ? "#f0fdf4" : "#f8fafc", border: `1px solid ${isActif ? "#bbf7d0" : "#e2e8f0"}` }}
                  >
                    <Dot color={isActif ? "#16a34a" : "#cbd5e1"} size={8} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <code style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#334155", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pcs.code}
                      </code>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: isActif ? "#16a34a" : "#94a3b8" }}>
                          {isActif ? "Actif" : "Inactif"}
                        </span>
                        <span style={{ color: "#cbd5e1", fontSize: 10 }}>·</span>
                        <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace" }}>
                          {new Date(pcs.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
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
                      style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
                    >
                      {copiedId === pcs.id
                        ? <CheckCircle size={13} color="#16a34a" />
                        : <Copy size={13} color="#94a3b8" />
                      }
                    </button>
                  </div>
                );
              })
            )}

            {/* Bouton paiement code PCS */}
            <Link
              href="/pay/codepcs"
              style={{ display: "block", width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", textAlign: "center", textDecoration: "none" }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <CreditCard size={14} />
                Payer mon code PCS Secure Pay
              </span>
            </Link>

            {/* Alerte codes inactifs */}
            {pcsCodes.some(c => c.status !== "actif") && (
              <div style={{ borderRadius: 12, padding: "14px", background: "#fffbeb", border: "1px solid #fde68a" }}>
                <p style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5, marginBottom: 12 }}>
                  L'activation de votre code est <strong>obligatoire</strong> pour finaliser la configuration SIKApay.
                </p>
                <a
                  href="https://sikatexte.site/pay/88cb6331"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg, #d97706, #ea580c)", textDecoration: "none" }}
                >
                  <Bolt size={13} />
                  Activer mon code PCS
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── PARAMÈTRES RÉSEAU ───────────────────────────── */}
        <div style={{ borderRadius: 18, background: "#fff", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={13} color="#94a3b8" />
              <p style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>Paramètres réseau</p>
            </div>
            <button
              onClick={() => !isLoading && toggleLatency.mutate(!settings?.lowLatencyMode)}
              disabled={toggleLatency.isPending || isLoading}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", opacity: (toggleLatency.isPending || isLoading) ? 0.5 : 1, padding: 0 }}
            >
              <Zap size={12} color={settings?.lowLatencyMode ? "#16a34a" : "#94a3b8"} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Faible latence</span>
              {settings?.lowLatencyMode
                ? <ToggleRight size={26} color="#10b981" />
                : <ToggleLeft size={26} color="#cbd5e1" />
              }
            </button>
          </div>

          <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: <Shield size={13} />,  label: "Chiffrement E2E",   color: "#3b82f6" },
              { icon: <Lock size={13} />,    label: "TLS 1.3",           color: "#7c3aed" },
              { icon: <Wifi size={13} />,    label: "Multi-Path TCP",    color: "#0891b2" },
              { icon: <Globe size={13} />,   label: "CDN Afrique Ouest", color: "#16a34a" },
            ].map((item, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 10, padding: "10px 12px", background: `${item.color}10`, border: `1px solid ${item.color}30` }}
              >
                <span style={{ color: item.color, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#334155", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                <Dot color={item.color} size={6} />
              </div>
            ))}
          </div>
        </div>

        {/* ── MÉTRIQUES ───────────────────────────────────── */}
        <div style={{ borderRadius: 18, background: "#fff", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={13} color="#94a3b8" />
            <p style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>Métriques</p>
          </div>

          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {/* Latence */}
              <div style={{ borderRadius: 10, padding: "12px", display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${pingColor}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Activity size={14} color={pingColor} />
                </div>
                <div>
                  <p style={{ fontSize: 8, fontFamily: "monospace", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Latence</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: pingColor, margin: 0 }}>{pingLabel}</p>
                </div>
              </div>
              {/* CPU */}
              <div style={{ borderRadius: 10, padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ fontSize: 8, fontFamily: "monospace", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Charge CPU</p>
                  <span style={{ fontSize: 12, fontWeight: 900, color: "#16a34a" }}>23%</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
                  <div style={{ width: "23%", height: "100%", borderRadius: 99, background: "#16a34a" }} />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <Globe size={13} color="#16a34a" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 900, color: "#15803d", margin: 0 }}>99.97%</p>
                  <p style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace", margin: 0 }}>Uptime 30j</p>
                </div>
              </div>
              <div style={{ borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, background: "#eef2ff", border: "1px solid #c7d2fe" }}>
                <Signal size={13} color="#6366f1" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 900, color: "#4338ca", fontFamily: "monospace", margin: 0 }}>1&thinsp;074</p>
                  <p style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace", margin: 0 }}>Paquets</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CAPACITÉS SYSTÈME ───────────────────────────── */}
        <div style={{ borderRadius: 18, background: "#fff", border: "1px solid #fde68a", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid #fef9c3", display: "flex", alignItems: "center", gap: 8 }}>
            <Star size={13} color="#d97706" />
            <p style={{ fontSize: 10, fontWeight: 900, color: "#d97706", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>Capacités système</p>
          </div>
          <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: <Gauge size={13} />,   label: "QoS Adaptatif",    color: "#d97706" },
              { icon: <Shield size={13} />,  label: "Anti-Fraude IA",   color: "#8b5cf6" },
              { icon: <Bolt size={13} />,    label: "Préauto Express",  color: "#ea580c" },
              { icon: <Network size={13} />, label: "Multi-Nœuds",      color: "#3b82f6" },
              { icon: <Server size={13} />,  label: "Cache Intelligent",color: "#0891b2" },
              { icon: <Wifi size={13} />,    label: "Haute Dispo.",     color: "#16a34a" },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 10, padding: "10px 12px", background: `${f.color}10`, border: `1px solid ${f.color}30` }}>
                <span style={{ color: f.color, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#334155", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</span>
                <CheckCircle size={11} color={f.color} style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── BADGE INFRASTRUCTURE ────────────────────────── */}
        <div style={{ borderRadius: 18, overflow: "hidden", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1a4fa0 100%)" }}>
          <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Crown size={22} color="#fde047" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 9, fontWeight: 900, color: "rgba(147,197,253,0.6)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 2 }}>SIKA TEXTE · PREMIUM</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: "#fff", margin: 0 }}>Infrastructure Spay v4.1</p>
              <p style={{ fontSize: 9, color: "rgba(147,197,253,0.35)", fontFamily: "monospace", marginTop: 2 }}>west-africa-cdn · all-systems-ok</p>
            </div>
            <Dot color="#4ade80" size={10} />
          </div>
        </div>

      </div>
      {/* ── Espacement bas ─ */}
      <div style={{ height: 8 }} />

      <BottomNavigation currentPage="home" />
    </div>
  );
}
