import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}min`;
}

function activityLevel(ts: string): "now" | "recent" | "idle" {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 45) return "now";
  if (s < 120) return "recent";
  return "idle";
}

export default function AdminConnectedUsers() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data, refetch, isFetching } = useQuery<OnlineData>({
    queryKey: ["/api/admin/users/online"],
    refetchInterval: 15_000,
    staleTime: 14_000,
  });

  useEffect(() => {
    if (!isFetching) setLastRefresh(new Date());
  }, [isFetching]);

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const veryActive = data?.veryActive ?? 0;
  const recentActive = total - veryActive;

  const nowUsers = users.filter((u) => activityLevel(u.lastActivity) === "now");
  const recentUsers = users.filter((u) => activityLevel(u.lastActivity) !== "now");

  const stats = [
    { icon: <Wifi className="w-4 h-4" />, label: "Connectés", value: total, color: "#22c55e", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.25)" },
    { icon: <Activity className="w-4 h-4" />, label: "Actifs < 1min", value: veryActive, color: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.25)" },
    { icon: <Clock className="w-4 h-4" />, label: "Récents < 3min", value: recentActive, color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)" }}>

      {/* HEADER */}
      <header className="sticky top-0 z-10 px-4 py-3.5 flex items-center gap-3 border-b border-white/10"
        style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(12px)" }}>
        <Link href="/admin">
          <button className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-bold text-sm">Utilisateurs Connectés</h1>
          <p className="text-white/40 text-[11px]">Actualisation toutes les 15s</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-white ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">

        {/* STATS */}
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl p-3 flex flex-col gap-2"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <div>
                <p className="text-white font-bold text-xl leading-none">{s.value}</p>
                <p className="text-white/40 text-[10px] mt-0.5 leading-tight">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isFetching ? "bg-yellow-400" : "bg-green-400"}`} />
          <span className="text-white/40 text-[11px]">
            {isFetching ? "Actualisation…" : `Mis à jour à ${lastRefresh.toLocaleTimeString("fr-FR")}`}
          </span>
        </div>

        {/* LISTE */}
        {users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
              <Users className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-white/30 text-sm">Aucun utilisateur connecté</p>
          </div>
        ) : (
          <div className="space-y-2">
            {nowUsers.length > 0 && (
              <p className="text-green-400/80 text-[11px] font-semibold uppercase tracking-wider px-1 pb-1">
                Actifs maintenant · {nowUsers.length}
              </p>
            )}

            {[...nowUsers, ...recentUsers].map((user) => {
              const level = activityLevel(user.lastActivity);
              const dotColor = level === "now" ? "#22c55e" : level === "recent" ? "#3b82f6" : "#f59e0b";
              const flag = COUNTRY_FLAGS[user.country] || "🌍";
              const countryName = COUNTRY_NAMES[user.country] || user.country || "—";

              return (
                <div
                  key={user.id}
                  className="rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: "linear-gradient(135deg, #1d4ed8, #7c3aed)" }}
                      >
                        {(user.fullName || "?").charAt(0).toUpperCase()}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                        style={{ background: dotColor, borderColor: "#0f172a" }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-semibold text-sm truncate">{user.fullName || "—"}</span>
                        <span className="text-white/30 text-[10px]">{flag} {countryName}</span>
                        {user.isActive
                          ? <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}><Shield className="w-2 h-2" />Actif</span>
                          : <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}><ShieldOff className="w-2 h-2" />Inactif</span>
                        }
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white/40 text-[11px]">{user.phone || "—"}</span>
                        <span className="text-blue-400/80 text-[11px] font-medium">{formatFCFA(Number(user.balance))}</span>
                      </div>
                    </div>

                    {/* Temps */}
                    <span className="text-[10px] font-medium flex-shrink-0" style={{ color: dotColor }}>
                      {timeAgo(user.lastActivity)}
                    </span>
                  </div>
                </div>
              );
            })}

            {recentUsers.length > 0 && nowUsers.length > 0 && (
              <p className="text-blue-400/60 text-[11px] font-semibold uppercase tracking-wider px-1 pt-1">
                Récemment actifs · {recentUsers.length}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
