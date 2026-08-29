import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, Wifi, Activity, Users, Clock, RefreshCw,
  Shield, ShieldOff, Globe, TrendingUp, Filter
} from "lucide-react";
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

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#1d4ed8,#7c3aed)",
  "linear-gradient(135deg,#0891b2,#0d9488)",
  "linear-gradient(135deg,#b45309,#d97706)",
  "linear-gradient(135deg,#be185d,#7c3aed)",
  "linear-gradient(135deg,#15803d,#0891b2)",
];

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

function getAvatarGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

type FilterType = "all" | "now" | "recent" | "active" | "inactive";

export default function AdminConnectedUsers() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [filter, setFilter] = useState<FilterType>("all");
  const [tick, setTick] = useState(0);

  const { data, refetch, isFetching } = useQuery<OnlineData>({
    queryKey: ["/api/admin/users/online"],
    refetchInterval: 15_000,
    staleTime: 14_000,
  });

  useEffect(() => {
    if (!isFetching) setLastRefresh(new Date());
  }, [isFetching]);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(iv);
  }, []);

  const allUsers = data?.users ?? [];
  const total = data?.total ?? 0;
  const veryActive = data?.veryActive ?? 0;
  const recentActive = total - veryActive;

  const nowUsers    = allUsers.filter(u => activityLevel(u.lastActivity) === "now");
  const recentUsers = allUsers.filter(u => activityLevel(u.lastActivity) === "recent");
  const idleUsers   = allUsers.filter(u => activityLevel(u.lastActivity) === "idle");

  const countryBreakdown = allUsers.reduce<Record<string, number>>((acc, u) => {
    if (u.country) acc[u.country] = (acc[u.country] || 0) + 1;
    return acc;
  }, {});

  const filteredUsers = allUsers.filter(u => {
    if (filter === "now")      return activityLevel(u.lastActivity) === "now";
    if (filter === "recent")   return activityLevel(u.lastActivity) === "recent";
    if (filter === "active")   return u.isActive;
    if (filter === "inactive") return !u.isActive;
    return true;
  }).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

  const filters: { key: FilterType; label: string; count: number; color: string }[] = [
    { key: "all",      label: "Tous",        count: total,        color: "#94a3b8" },
    { key: "now",      label: "Maintenant",  count: nowUsers.length,    color: "#22c55e" },
    { key: "recent",   label: "Récents",     count: recentUsers.length, color: "#3b82f6" },
    { key: "active",   label: "Activés",     count: allUsers.filter(u => u.isActive).length,  color: "#10b981" },
    { key: "inactive", label: "Non activés", count: allUsers.filter(u => !u.isActive).length, color: "#f59e0b" },
  ];

  return (
    <div className="sika-page">

      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-white/10"
        style={{ background: "rgba(15,23,42,0.92)", backdropFilter: "blur(14px)" }}>
        <div className="px-4 py-3.5 flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/admin">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,255,255,0.08)" }}>
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-sm">Utilisateurs Connectés</h1>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-[10px] font-bold">{total}</span>
              </div>
            </div>
            <p className="text-white/30 text-[10px]">
              {isFetching ? "Actualisation…" : `Mis à jour ${lastRefresh.toLocaleTimeString("fr-FR")}`}
            </p>
          </div>
          <button onClick={() => refetch()} disabled={isFetching}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            <RefreshCw className={`w-4 h-4 text-white ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">

        {/* STATS CARDS */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            {
              icon: <Wifi className="w-4 h-4" />,
              label: "En ligne",
              value: total,
              sub: "total",
              color: "#22c55e",
              bg: "rgba(34,197,94,0.10)",
              border: "rgba(34,197,94,0.2)",
              pulse: true,
            },
            {
              icon: <Activity className="w-4 h-4" />,
              label: "< 1 minute",
              value: veryActive,
              sub: "très actifs",
              color: "#3b82f6",
              bg: "rgba(59,130,246,0.10)",
              border: "rgba(59,130,246,0.2)",
              pulse: false,
            },
            {
              icon: <Clock className="w-4 h-4" />,
              label: "< 3 minutes",
              value: recentActive,
              sub: "récents",
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.10)",
              border: "rgba(245,158,11,0.2)",
              pulse: false,
            },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3.5 flex flex-col gap-2.5"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${s.color}20`, color: s.color }}>
                  {s.icon}
                </div>
                {s.pulse && s.value > 0 && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                    style={{ background: s.color }} />
                )}
              </div>
              <div>
                <p className="text-white font-black text-2xl leading-none">{s.value}</p>
                <p className="text-white/30 text-[10px] mt-0.5 leading-tight font-medium">{s.label}</p>
                <p className="text-white/20 text-[9px]">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* COUNTRY BREAKDOWN */}
        {Object.keys(countryBreakdown).length > 0 && (
          <div className="rounded-2xl p-3.5 space-y-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Globe className="w-3.5 h-3.5 text-white/40" />
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider">Par pays</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(countryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([code, count]) => (
                  <div key={code} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <span className="text-base">{COUNTRY_FLAGS[code] || "🌍"}</span>
                    <span className="text-white/60 text-xs font-semibold">{COUNTRY_NAMES[code] || code}</span>
                    <span className="text-white font-black text-xs ml-0.5">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ACTIVITY BREAKDOWN */}
        {total > 0 && (
          <div className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex">
              {[
                { label: "Maintenant", count: nowUsers.length,    color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
                { label: "Récents",    count: recentUsers.length,  color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                { label: "Idle",       count: idleUsers.length,    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
              ].filter(s => s.count > 0).map(s => (
                <div key={s.label} className="flex-1 py-3 px-3 text-center" style={{ background: s.bg }}>
                  <p className="font-black text-white text-xl leading-none">{s.count}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: s.color }}>{s.label}</p>
                </div>
              ))}
            </div>
            {total > 0 && (
              <div className="h-1.5 flex">
                {nowUsers.length > 0    && <div className="h-full bg-green-400 transition-all" style={{ width: `${(nowUsers.length/total)*100}%` }} />}
                {recentUsers.length > 0 && <div className="h-full bg-blue-400 transition-all"  style={{ width: `${(recentUsers.length/total)*100}%` }} />}
                {idleUsers.length > 0   && <div className="h-full bg-amber-400 transition-all" style={{ width: `${(idleUsers.length/total)*100}%` }} />}
              </div>
            )}
          </div>
        )}

        {/* FILTRES */}
        {total > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5"
            style={{ scrollbarWidth: "none" }}>
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: filter === f.key ? `${f.color}20` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${filter === f.key ? f.color + "50" : "rgba(255,255,255,0.08)"}`,
                  color: filter === f.key ? f.color : "rgba(255,255,255,0.4)",
                }}>
                <Filter className="w-2.5 h-2.5" />
                {f.label}
                <span className="font-black">{f.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* LISTE */}
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Users className="w-8 h-8 text-white/15" />
            </div>
            <div className="text-center">
              <p className="text-white/30 text-sm font-semibold">Aucun utilisateur</p>
              <p className="text-white/15 text-xs mt-0.5">
                {filter === "all" ? "Aucune session active" : "Aucun résultat pour ce filtre"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Section labels */}
            {filter === "all" && nowUsers.length > 0 && (
              <div className="flex items-center gap-2 px-1 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-green-400/80 text-[11px] font-bold uppercase tracking-wider">
                  Actifs maintenant · {nowUsers.length}
                </p>
              </div>
            )}

            {filteredUsers.map((user, idx) => {
              const level    = activityLevel(user.lastActivity);
              const dotColor = level === "now" ? "#22c55e" : level === "recent" ? "#3b82f6" : "#f59e0b";
              const dotLabel = level === "now" ? "Actif" : level === "recent" ? "Récent" : "Idle";
              const flag     = COUNTRY_FLAGS[user.country] || "🌍";
              const gradient = getAvatarGradient(user.id);

              const showRecentLabel = filter === "all"
                && level !== "now"
                && idx > 0
                && activityLevel(filteredUsers[idx - 1].lastActivity) === "now"
                && recentUsers.length > 0;

              return (
                <div key={user.id}>
                  {showRecentLabel && (
                    <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <p className="text-blue-400/60 text-[11px] font-bold uppercase tracking-wider">
                        Récemment actifs
                      </p>
                    </div>
                  )}
                  <div className="rounded-2xl px-3.5 py-3 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${level === "now" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.07)"}`,
                    }}>
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
                          style={{ background: gradient }}>
                          {(user.fullName || user.phone || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                          style={{ background: dotColor, borderColor: "#0f172a" }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white font-semibold text-sm truncate max-w-[120px]">
                            {user.fullName || "—"}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${dotColor}18`, color: dotColor }}>
                            {dotLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-white/35 text-[11px]">{user.phone || "—"}</span>
                          <span className="text-white/20 text-[11px]">·</span>
                          <span className="text-[11px]">{flag} {COUNTRY_NAMES[user.country] || user.country || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-blue-400/80 text-[11px] font-bold">
                            {formatFCFA(Number(user.balance))}
                          </span>
                          <span className="text-white/20 text-[11px]">·</span>
                          {user.isActive
                            ? <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                                <Shield className="w-2.5 h-2.5" /> Activé
                              </span>
                            : <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-400">
                                <ShieldOff className="w-2.5 h-2.5" /> Non activé
                              </span>
                          }
                        </div>
                      </div>

                      {/* Temps */}
                      <div className="flex flex-col items-end flex-shrink-0 gap-1">
                        <span className="text-[11px] font-black tabular-nums" style={{ color: dotColor }}>
                          {timeAgo(user.lastActivity)}
                        </span>
                        {level === "now" && (
                          <div className="flex gap-0.5">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-1 h-1 rounded-full"
                                style={{
                                  background: dotColor,
                                  animation: `pulse 1.4s ${i * 0.2}s infinite ease-in-out`,
                                  opacity: 0.6,
                                }} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Trending footer */}
            {total > 0 && (
              <div className="flex items-center justify-center gap-2 py-3 text-white/20 text-[10px]">
                <TrendingUp className="w-3 h-3" />
                <span>Actualisation auto toutes les 15 secondes</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
