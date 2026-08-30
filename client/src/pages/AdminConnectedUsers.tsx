import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Clock,
  Filter,
  RefreshCw,
  Shield,
  ShieldOff,
  TrendingUp,
  Users,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";
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
const COUNTRIES: Record<string, string> = {
  BJ: "Bénin",
  CI: "Côte d’Ivoire",
  SN: "Sénégal",
  BF: "Burkina Faso",
  TG: "Togo",
  CM: "Cameroun",
  ML: "Mali",
};
const COLORS = ["#0f766e", "#1d4ed8", "#b45309", "#be185d", "#15803d"];
function age(ts: string) {
  const s = Math.max(
    0,
    Math.floor((Date.now() - new Date(ts).getTime()) / 1000),
  );
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)} min`;
}
function level(ts: string) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  return s < 45 ? "now" : s < 120 ? "recent" : "idle";
}
function color(id: string) {
  return COLORS[
    Math.abs(Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length
  ];
}
type FilterType = "all" | "now" | "recent" | "active" | "inactive";

export default function AdminConnectedUsers() {
  const [filter, setFilter] = useState<FilterType>("all"),
    [, setTick] = useState(0),
    [lastRefresh, setLastRefresh] = useState(new Date());
  const { data, refetch, isFetching, isLoading, isError } =
    useQuery<OnlineData>({
      queryKey: ["/api/admin/users/online"],
      refetchInterval: 15000,
      staleTime: 14000,
    });
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!isFetching) setLastRefresh(new Date());
  }, [isFetching]);
  const users = data?.users ?? [],
    total = data?.total ?? 0,
    veryActive = data?.veryActive ?? 0,
    now = users.filter((u) => level(u.lastActivity) === "now"),
    recent = users.filter((u) => level(u.lastActivity) === "recent"),
    idle = users.filter((u) => level(u.lastActivity) === "idle");
  const list = users
    .filter((u) =>
      filter === "now"
        ? level(u.lastActivity) === "now"
        : filter === "recent"
          ? level(u.lastActivity) === "recent"
          : filter === "active"
            ? u.isActive
            : filter === "inactive"
              ? !u.isActive
              : true,
    )
    .sort((a, b) => +new Date(b.lastActivity) - +new Date(a.lastActivity));
  const filters: [FilterType, string, number, string][] = [
    ["all", "Tous", total, "slate"],
    ["now", "Maintenant", now.length, "teal"],
    ["recent", "Récents", recent.length, "blue"],
    ["active", "Activés", users.filter((u) => u.isActive).length, "emerald"],
    [
      "inactive",
      "Non activés",
      users.filter((u) => !u.isActive).length,
      "amber",
    ],
  ];
  return (
    <div className="sika-page">
      <AdminNav
        title="Utilisateurs connectés"
        subtitle="Présence en direct et activité récente des comptes."
        icon={Wifi}
        badge={total || undefined}
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
            aria-label="Actualiser"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </button>
        }
      />
      <main className="sika-content space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="sika-kicker">Centre de présence</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFetching
                ? "Actualisation en cours…"
                : `Mis à jour à ${lastRefresh.toLocaleTimeString("fr-FR")}`}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-teal-600" />
            Temps réel
          </span>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : isError ? (
          <div className="sika-surface p-10 text-center text-rose-700">
            Impossible de charger les utilisateurs connectés.
            <br />
            <button
              onClick={() => refetch()}
              className="mt-3 font-bold underline"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  [Wifi, "En ligne", total, "border-teal-600", "text-teal-700"],
                  [Activity, "Très actifs", veryActive, "border-blue-600", "text-blue-700"],
                  [Clock, "Récents", total - veryActive, "border-amber-500", "text-amber-700"],
                ] as [LucideIcon, string, number, string, string][]
              ).map(([Icon, label, value, borderClass, iconClass]) => (
                <div
                  key={label as string}
                  className={`sika-surface border-l-4 ${borderClass} p-4`}
                >
                  <Icon className={`h-4 w-4 ${iconClass}`} />
                  <p className="mt-3 text-2xl font-black">{value as number}</p>
                  <p className="text-xs font-bold text-muted-foreground">
                    {label as string}
                  </p>
                </div>
              ))}
            </div>
            {total > 0 && (
              <div className="sika-surface overflow-hidden">
                <div className="flex h-2">
                  {now.length > 0 && (
                    <div
                      className="bg-teal-600"
                      style={{ width: `${(now.length / total) * 100}%` }}
                    />
                  )}
                  {recent.length > 0 && (
                    <div
                      className="bg-blue-600"
                      style={{ width: `${(recent.length / total) * 100}%` }}
                    />
                  )}
                  {idle.length > 0 && (
                    <div
                      className="bg-amber-500"
                      style={{ width: `${(idle.length / total) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 p-4">
                  {filters.map(([key, label, count]) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${filter === key ? "border-teal-600 bg-teal-50 text-teal-800" : "bg-muted/35 text-muted-foreground hover:bg-muted"}`}
                    >
                      <Filter className="mr-1 inline h-3 w-3" />
                      {label} <span className="ml-1">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {list.length === 0 ? (
              <div className="sika-surface p-14 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="font-bold">Aucun utilisateur</p>
                <p className="mt-1 text-sm">
                  {filter === "all"
                    ? "Aucune session active."
                    : "Aucun résultat pour ce filtre."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {list.map((u) => {
                  const state = level(u.lastActivity);
                  const stateText =
                    state === "now"
                      ? "Actif"
                      : state === "recent"
                        ? "Récent"
                        : "Idle";
                  return (
                    <div
                      key={u.id}
                      className="sika-surface flex items-center gap-3 p-3.5"
                    >
                      <div className="relative">
                        <div
                          className="grid h-11 w-11 place-items-center rounded-xl font-black text-white"
                          style={{ background: color(u.id) }}
                        >
                          {(u.fullName || u.phone || "?")[0].toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${state === "now" ? "bg-teal-500" : state === "recent" ? "bg-blue-500" : "bg-amber-500"}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold">
                            {u.fullName || "Sans nom"}
                          </p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
                            {stateText}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.phone || u.email} ·{" "}
                          {COUNTRIES[u.country] ||
                            u.country ||
                            "Pays non renseigné"}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-xs">
                          <span className="font-bold text-teal-700">
                            {formatFCFA(Number(u.balance))}
                          </span>
                          {u.isActive ? (
                            <span className="text-emerald-700">
                              <Shield className="mr-1 inline h-3 w-3" />
                              Activé
                            </span>
                          ) : (
                            <span className="text-rose-700">
                              <ShieldOff className="mr-1 inline h-3 w-3" />
                              Non activé
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right text-xs font-black text-muted-foreground">
                        {age(u.lastActivity)}
                        <div className="mt-1 flex justify-end gap-1">
                          {state === "now" &&
                            [1, 2, 3].map((i) => (
                              <span
                                key={i}
                                className="h-1 w-1 rounded-full bg-teal-500"
                              />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Actualisation automatique toutes les 15 secondes
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
