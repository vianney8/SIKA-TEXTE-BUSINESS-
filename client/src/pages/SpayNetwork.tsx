import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import BottomNavigation from "@/components/BottomNavigation";
import {
  Shield, Cpu, Zap, Lock, KeyRound, CheckCircle,
  Trash2, Eye, EyeOff, Globe, Activity,
  ShieldCheck, Fingerprint, CreditCard, Copy,
  ChevronLeft, Wifi, Network, Gauge, Bolt,
  Crown, AlertTriangle, Radio, ArrowRight,
  Wallet, Smartphone, ToggleLeft, ToggleRight,
  Signal, Star, Server
} from "lucide-react";

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const S = {
  /* Styles réutilisables */
  card: {
    borderRadius: 18,
    background: "#fff",
    border: "1px solid #e2e8f0",
    overflow: "hidden" as const,
    marginBottom: 0,
  } as React.CSSProperties,

  cardHeader: {
    padding: "14px 20px 12px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,

  sectionLabel: {
    fontSize: 10,
    fontWeight: 900,
    color: "#94a3b8",
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    margin: 0,
  } as React.CSSProperties,

  cardBody: {
    padding: "16px 20px",
  } as React.CSSProperties,

  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: "10px 12px",
  } as React.CSSProperties,

  btn: (bg: string, color = "#fff"): React.CSSProperties => ({
    width: "100%",
    padding: "13px 0",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 900,
    color,
    background: bg,
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
  }),
};

function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      flexShrink: 0,
    }} />
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE COMPTE NON ACTIVÉ
══════════════════════════════════════════════════════════ */
function AccessDenied({ amount }: { amount: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f8fafc" }}>
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
        <p style={{ fontSize: 10, fontWeight: 900, color: "#f43f5e", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
          Accès restreint
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", textAlign: "center", marginBottom: 12, margin: "0 0 12px" }}>
          Compte non activé
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 1.6, marginBottom: 32, maxWidth: 300 }}>
          L'accès au réseau Spay est réservé aux comptes activés.
        </p>
        <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/activation">
            <button style={S.btn("linear-gradient(135deg, #1a4fa0, #3b82f6)")}>
              <CreditCard size={16} />
              Activer — {amount} FCFA
            </button>
          </Link>
          <Link href="/">
            <button style={{ ...S.btn("#fff", "#64748b"), border: "2px solid #e2e8f0" }}>
              Retour au tableau de bord
            </button>
          </Link>
        </div>
      </div>

      <BottomNavigation currentPage="home" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
══════════════════════════════════════════════════════════ */
export default function SpayNetwork() {
  const { toast } = useToast();

  /* États UI seulement — aucun timer, aucun interval */
  const [pcsInput, setPcsInput]         = useState("");
  const [showPcsInput, setShowPcsInput] = useState(false);
  const [showCode, setShowCode]         = useState(false);
  const [copiedId, setCopiedId]         = useState<number | null>(null);

  /* ── Queries (pas de refetchInterval ni refetchOnWindowFocus) ── */
  const { data: paymentInfo } = useQuery<{ activationAmount?: string }>({
    queryKey: ["/api/activation/payment-info"],
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const { data: withdrawalData } = useQuery<WithdrawalData>({
    queryKey: ["/api/withdrawal"],
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: settings, isLoading } = useQuery<SpaySettings>({
    queryKey: ["/api/user/spay-settings"],
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: pcsCodes = [] } = useQuery<UserPcsCode[]>({
    queryKey: ["/api/user/pcs-codes"],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  /* ── Mutations ── */
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

  /* ── Valeurs calculées ── */
  const activationAmount = paymentInfo?.activationAmount
    ? parseInt(paymentInfo.activationAmount).toLocaleString("fr-FR")
    : "3\u202F600";

  const hasInactif = pcsCodes.some(c => c.status !== "actif");

  /* ── Guard compte inactif ── */
  if (withdrawalData && !withdrawalData.isAccountActive) {
    return <AccessDenied amount={activationAmount} />;
  }

  /* ════════════════════════════════════════════════════════
     RENDU — structure scroll normale, pas d'overflow:hidden global
  ════════════════════════════════════════════════════════ */
  return (
    <div style={{ background: "#f0f4f8", paddingBottom: 96 }}>

      {/* ══ EN-TÊTE ══════════════════════════════════════════ */}
      <div style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 55%, #1a4fa0 100%)" }}>

        {/* Barre titre */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 16px 12px" }}>
          <Link href="/">
            <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={20} color="#fff" />
            </div>
          </Link>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(147,197,253,0.7)", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "monospace", margin: "0 0 2px" }}>
              SPAY NETWORK v4.1
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0 }}>Réseau Spay</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: "rgba(22,163,74,0.2)", border: "1px solid rgba(22,163,74,0.4)" }}>
            <Dot color="#4ade80" size={6} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#86efac" }}>EN LIGNE</span>
          </div>
        </div>

        {/* Métriques — valeurs 100 % statiques */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "0 16px 20px" }}>
          {([
            { label: "LATENCE",    value: "42 ms",  color: "#4ade80",  Icon: Activity },
            { label: "CHARGE CPU", value: "23%",    color: "#4ade80",  Icon: Cpu      },
            { label: "UPTIME",     value: "99.97%", color: "#4ade80",  Icon: Radio    },
          ] as const).map(({ label, value, color, Icon }, i) => (
            <div key={i} style={{ borderRadius: 12, padding: "10px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <Icon size={10} color={color} />
                <span style={{ fontSize: 8, fontWeight: 900, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>{label}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 900, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FLUX DE PAIEMENT ═════════════════════════════════ */}
      <div style={{ margin: "16px 16px 0", borderRadius: 18, background: "linear-gradient(135deg, #1e3a5f, #1a4fa0)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={13} color="#93c5fd" />
          <p style={{ fontSize: 13, fontWeight: 900, color: "#fff", margin: 0 }}>Flux de paiement sécurisé</p>
        </div>
        <div style={{ padding: "16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {([
              { label: "Retrait", sub: "Demande",    bg: "#ef4444", Icon: Wallet     },
              { label: "SPAY",    sub: "Traitement", bg: "#6366f1", Icon: Shield     },
              { label: "PCS",     sub: "Validation", bg: "#8b5cf6", Icon: KeyRound   },
              { label: "Mobile",  sub: "Réception",  bg: "#16a34a", Icon: Smartphone },
            ] as const).map(({ label, sub, bg, Icon }, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color="#fff" />
                  </div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#fff", textAlign: "center", margin: 0, lineHeight: 1.2 }}>{label}</p>
                  <p style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", margin: 0 }}>{sub}</p>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    <ArrowRight size={10} color="rgba(255,255,255,0.2)" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "8px 18px", background: "rgba(0,0,0,0.15)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 9, color: "rgba(147,197,253,0.35)", fontFamily: "monospace", margin: 0 }}>
            TLS 1.3 · AES-256-GCM · Chiffrement bout-en-bout
          </p>
        </div>
      </div>

      {/* ══ CARTES ═══════════════════════════════════════════ */}
      <div style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── PCS SECURE PAY ──────────────────────────────── */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <KeyRound size={13} color="#94a3b8" />
            <p style={S.sectionLabel}>PCS Secure Pay</p>
          </div>

          <div style={S.cardBody}>
            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 40, borderRadius: 10, background: "#f1f5f9" }} />
                <div style={{ height: 32, borderRadius: 10, background: "#f8fafc" }} />
              </div>

            ) : settings?.hasSavedPcsCode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ ...S.row, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ShieldCheck size={17} color="#16a34a" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 9, fontWeight: 900, color: "#16a34a", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 2px" }}>Code actif</p>
                    <p style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                      {settings.savedPcsCodeMasked}
                    </p>
                  </div>
                  <Dot color="#16a34a" size={8} />
                </div>

                <div style={{ ...S.row, background: "#eef2ff", border: "1px solid #c7d2fe" }}>
                  <Zap size={12} color="#6366f1" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "#4338ca", lineHeight: 1.5, margin: 0 }}>
                    Vos retraits sont traités automatiquement sans code.
                  </p>
                </div>

                <button
                  onClick={() => deletePcs.mutate()}
                  disabled={deletePcs.isPending}
                  style={{ ...S.btn("#fff1f2", "#e11d48"), border: "1px solid #fecdd3", fontSize: 12, padding: "10px 0", opacity: deletePcs.isPending ? 0.5 : 1 }}
                >
                  <Trash2 size={13} />
                  {deletePcs.isPending ? "Suppression…" : "Supprimer le code"}
                </button>
              </div>

            ) : showPcsInput ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <KeyRound size={14} color="#94a3b8" />
                  </div>
                  <input
                    type={showCode ? "text" : "password"}
                    value={pcsInput}
                    onChange={e => setPcsInput(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === "Enter" && pcsInput.trim()) savePcs.mutate(pcsInput.trim());
                    }}
                    placeholder="PCS-XXXX-XXXX-XXXX-XXXX"
                    autoFocus
                    style={{ width: "100%", height: 48, paddingLeft: 38, paddingRight: 42, borderRadius: 12, fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#1e293b", background: "#f8fafc", border: "2px solid #c7d2fe", outline: "none", boxSizing: "border-box" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(v => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "#94a3b8" }}
                  >
                    {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setShowPcsInput(false); setPcsInput(""); }}
                    style={{ flex: 1, padding: "11px 0", borderRadius: 12, fontSize: 12, fontWeight: 700, color: "#64748b", background: "#fff", border: "2px solid #e2e8f0", cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => pcsInput.trim() && savePcs.mutate(pcsInput.trim())}
                    disabled={savePcs.isPending || !pcsInput.trim()}
                    style={{ flex: 2, ...S.btn("linear-gradient(135deg, #4f46e5, #7c3aed)"), padding: "11px 0", fontSize: 12, opacity: (savePcs.isPending || !pcsInput.trim()) ? 0.4 : 1 }}
                  >
                    <CheckCircle size={13} />
                    {savePcs.isPending ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </div>

            ) : (
              <button
                onClick={() => setShowPcsInput(true)}
                style={S.btn("linear-gradient(135deg, #4f46e5, #7c3aed)")}
              >
                <Fingerprint size={16} />
                Configurer mon code PCS
              </button>
            )}
          </div>
        </div>

        {/* ── MES CODES PCS ───────────────────────────────── */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <KeyRound size={13} color="#94a3b8" />
            <p style={S.sectionLabel}>Mes codes PCS</p>
          </div>

          <div style={S.cardBody}>
            {pcsCodes.length === 0 ? (
              <div style={{ ...S.row, background: "#fffbeb", border: "1px solid #fde68a", alignItems: "flex-start" }}>
                <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5, margin: 0 }}>
                  Aucun code PCS n'a encore été attribué à votre compte.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pcsCodes.map(pcs => {
                  const isActif = pcs.status === "actif";
                  return (
                    <div
                      key={pcs.id}
                      style={{ ...S.row, background: isActif ? "#f0fdf4" : "#f8fafc", border: `1px solid ${isActif ? "#bbf7d0" : "#e2e8f0"}` }}
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
                          <span style={{ color: "#e2e8f0", fontSize: 10 }}>·</span>
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
                })}
              </div>
            )}

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/pay/codepcs" style={{ textDecoration: "none" }}>
                <button style={S.btn("linear-gradient(135deg, #4f46e5, #7c3aed)")}>
                  <CreditCard size={14} />
                  Payer mon code PCS Secure Pay
                </button>
              </Link>

              {hasInactif && (
                <div style={{ borderRadius: 12, padding: "14px 14px 12px", background: "#fffbeb", border: "1px solid #fde68a" }}>
                  <p style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5, margin: "0 0 10px" }}>
                    L'activation de votre code est <strong>obligatoire</strong> pour finaliser la configuration SIKApay.
                  </p>
                  <a
                    href="https://sikatexte.site/pay/88cb6331"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <button style={S.btn("linear-gradient(135deg, #d97706, #ea580c)")}>
                      <Bolt size={13} />
                      Activer mon code PCS
                    </button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── PARAMÈTRES RÉSEAU ───────────────────────────── */}
        <div style={S.card}>
          <div style={{ ...S.cardHeader, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={13} color="#94a3b8" />
              <p style={S.sectionLabel}>Paramètres réseau</p>
            </div>
            <button
              onClick={() => !isLoading && toggleLatency.mutate(!settings?.lowLatencyMode)}
              disabled={toggleLatency.isPending || isLoading}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, opacity: (toggleLatency.isPending || isLoading) ? 0.5 : 1 }}
            >
              <Zap size={12} color={settings?.lowLatencyMode ? "#16a34a" : "#94a3b8"} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Faible latence</span>
              {settings?.lowLatencyMode
                ? <ToggleRight size={24} color="#10b981" />
                : <ToggleLeft size={24} color="#cbd5e1" />
              }
            </button>
          </div>

          <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {([
              { Icon: Shield, label: "Chiffrement E2E",   color: "#3b82f6" },
              { Icon: Lock,   label: "TLS 1.3",           color: "#7c3aed" },
              { Icon: Wifi,   label: "Multi-Path TCP",    color: "#0891b2" },
              { Icon: Globe,  label: "CDN Afrique Ouest", color: "#16a34a" },
            ] as const).map(({ Icon, label, color }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 10, padding: "10px 12px", background: `${color}12`, border: `1px solid ${color}30` }}>
                <Icon size={13} color={color} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#334155", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                <Dot color={color} size={6} />
              </div>
            ))}
          </div>
        </div>

        {/* ── MÉTRIQUES ───────────────────────────────────── */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <Activity size={13} color="#94a3b8" />
            <p style={S.sectionLabel}>Métriques</p>
          </div>

          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {/* Latence */}
              <div style={{ borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Activity size={14} color="#16a34a" />
                </div>
                <div>
                  <p style={{ fontSize: 8, fontFamily: "monospace", color: "#94a3b8", textTransform: "uppercase", margin: "0 0 2px" }}>Latence</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: "#16a34a", margin: 0 }}>42 ms</p>
                </div>
              </div>
              {/* CPU */}
              <div style={{ borderRadius: 10, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <p style={{ fontSize: 8, fontFamily: "monospace", color: "#94a3b8", textTransform: "uppercase", margin: 0 }}>Charge CPU</p>
                  <span style={{ fontSize: 12, fontWeight: 900, color: "#16a34a" }}>23%</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "#e2e8f0" }}>
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
                  <p style={{ fontSize: 13, fontWeight: 900, color: "#4338ca", fontFamily: "monospace", margin: 0 }}>1 074</p>
                  <p style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace", margin: 0 }}>Paquets</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CAPACITÉS SYSTÈME ───────────────────────────── */}
        <div style={{ ...S.card, border: "1px solid #fde68a" }}>
          <div style={{ ...S.cardHeader, borderBottom: "1px solid #fef9c3" }}>
            <Star size={13} color="#d97706" />
            <p style={{ ...S.sectionLabel, color: "#d97706" }}>Capacités système</p>
          </div>
          <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {([
              { Icon: Gauge,   label: "QoS Adaptatif",    color: "#d97706" },
              { Icon: Shield,  label: "Anti-Fraude IA",   color: "#8b5cf6" },
              { Icon: Bolt,    label: "Préauto Express",  color: "#ea580c" },
              { Icon: Network, label: "Multi-Nœuds",      color: "#3b82f6" },
              { Icon: Server,  label: "Cache Intelligent",color: "#0891b2" },
              { Icon: Wifi,    label: "Haute Dispo.",     color: "#16a34a" },
            ] as const).map(({ Icon, label, color }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 10, padding: "10px 12px", background: `${color}10`, border: `1px solid ${color}28` }}>
                <Icon size={13} color={color} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#334155", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                <CheckCircle size={11} color={color} style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── BADGE INFRASTRUCTURE ────────────────────────── */}
        <div style={{ borderRadius: 18, background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1a4fa0 100%)", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Crown size={20} color="#fde047" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 9, fontWeight: 900, color: "rgba(147,197,253,0.55)", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 2px" }}>
                SIKA TEXTE · PREMIUM
              </p>
              <p style={{ fontSize: 15, fontWeight: 900, color: "#fff", margin: 0 }}>Infrastructure Spay v4.1</p>
              <p style={{ fontSize: 9, color: "rgba(147,197,253,0.3)", fontFamily: "monospace", margin: "2px 0 0" }}>
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
