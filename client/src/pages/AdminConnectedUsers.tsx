import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, Wifi, Activity, Users, Clock, RefreshCw, Shield, ShieldOff } from "lucide-react";
import { formatFCFA } from "@/lib/utils";

interface OnlineUser {
  id: string;
  phone: string;
  email: string;
  fullName: string;
  balance: string;
  referralCode: string;
  country: string;
  isActive: boolean;
  lastActivity: string;
}

interface OnlineData {
  users: OnlineUser[];
  veryActive: number;
  total: number;
}

const COUNTRY_FLAGS: Record<string, string> = {
  BJ: "🇧🇯", CI: "🇨🇮", SN: "🇸🇳", BF: "🇧🇫", TG: "🇹🇬", CM: "🇨🇲", ML: "🇲🇱",
};
const COUNTRY_NAMES: Record<string, string> = {
  BJ: "Bénin", CI: "Côte d'Ivoire", SN: "Sénégal", BF: "Burkina Faso", TG: "Togo", CM: "Cameroun", ML: "Mali",
};

function secondsAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  return `il y a ${m}min`;
}

function activityLevel(ts: string): "now" | "recent" | "idle" {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 45) return "now";
  if (s < 120) return "recent";
  return "idle";
}

export default function AdminConnectedUsers() {
  const [tick, setTick] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data, refetch, isFetching } = useQuery<OnlineData>({
    queryKey: ["/api/admin/users/online"],
    refetchInterval: 10_000,
    staleTime: 9_000,
  });

  // Force re-render every second to update "il y a Xs" timers
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Track last refresh time
  useEffect(() => {
    if (!isFetching) setLastRefresh(new Date());
  }, [isFetching]);

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const veryActive = data?.veryActive ?? 0;
  const recentActive = total - veryActive;

  const now = users.filter((u) => activityLevel(u.lastActivity) === "now");
  const recent = users.filter((u) => activityLevel(u.lastActivity) !== "now");

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)" }}>

      {/* HEADER */}
      <header className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3 border-b border-white/10"
        style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)" }}>
        <Link href="/admin">
          <button className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-black text-base leading-none">Utilisateurs Connectés</h1>
          <p className="text-blue-300 text-[11px] mt-0.5">Scan en temps réel · actualisation toutes les 10s</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-white ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-5">

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: <Wifi className="w-5 h-5" />,
              label: "Connectés",
              value: total,
              color: "#22c55e",
              bg: "rgba(34,197,94,0.12)",
              pulse: true,
            },
            {
              icon: <Activity className="w-5 h-5" />,
              label: "Actifs < 1min",
              value: veryActive,
              color: "#3b82f6",
              bg: "rgba(59,130,246,0.12)",
              pulse: false,
            },
            {
              icon: <Clock className="w-5 h-5" />,
              label: "Récents < 3min",
              value: recentActive,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.12)",
              pulse: false,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-3.5 flex flex-col gap-2" style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
              <div className="flex items-center justify-between">
                <div style={{ color: s.color }}>{s.icon}</div>
                {s.pulse && total > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                )}
              </div>
              <div>
                <p className="text-white font-black text-2xl leading-none">{s.value}</p>
                <p className="text-white/50 text-[10px] mt-0.5 leading-tight">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dernière actualisation */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
          <span className={`w-2 h-2 rounded-full ${isFetching ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`} />
          <span className="text-white/50 text-[11px]">
            {isFetching ? "Scan en cours…" : `Dernière actualisation : ${lastRefresh.toLocaleTimeString("fr-FR")}`}
          </span>
        </div>

        {/* LISTE */}
        {users.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <Users className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">Aucun utilisateur connecté actuellement</p>
          </div>
        ) : (
          <div className="space-y-3">
            {now.length > 0 && (
              <p className="text-green-400 text-xs font-bold uppercase tracking-wider px-1">
                🟢 Actifs maintenant ({now.length})
              </p>
            )}
            {[...now, ...recent].map((user) => {
              const level = activityLevel(user.lastActivity);
              const dotColor = level === "now" ? "#22c55e" : level === "recent" ? "#3b82f6" : "#f59e0b";
              const flag = COUNTRY_FLAGS[user.country] || "🌍";
              const countryName = COUNTRY_NAMES[user.country] || user.country || "—";

              return (
                <div
                  key={user.id}
                  className="rounded-2xl px-4 py-3.5"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
                        style={{ background: "linear-gradient(135deg, #1d4ed8, #7c3aed)" }}
                      >
                        {(user.fullName || "?").charAt(0).toUpperCase()}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ background: dotColor, borderColor: "#0f172a" }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-sm truncate">{user.fullName || "—"}</span>
                        <span className="text-white/40 text-[10px]">{flag} {countryName}</span>
                        {user.isActive
                          ? <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}><Shield className="w-2.5 h-2.5" />Actif</span>
                          : <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}><ShieldOff className="w-2.5 h-2.5" />Inactif</span>
                        }
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-white/50 text-[11px]">{user.phone || "—"}</span>
                        <span className="text-blue-400 text-[11px] font-semibold">{formatFCFA(Number(user.balance))}</span>
                      </div>
                    </div>

                    {/* Temps */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-[10px] font-semibold" style={{ color: dotColor }}>
                        {secondsAgo(user.lastActivity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {recent.length > 0 && now.length > 0 && (
              <p className="text-blue-400 text-xs font-bold uppercase tracking-wider px-1 pt-1">
                🔵 Récemment actifs ({recent.length})
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
