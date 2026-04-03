import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownCircle, ArrowUpCircle, Clock, RefreshCw,
  Users, ShoppingCart, ChevronLeft, SlidersHorizontal,
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, XCircle
} from "lucide-react";
import { useState } from "react";
import { formatFCFA } from "@/lib/utils";
import BottomNavigation from "@/components/BottomNavigation";
import { Link } from "wouter";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; sign: "+" | "-" }> = {
  deposit:          { label: "Récompenses",    icon: ArrowDownCircle, color: "#16a34a", bg: "#f0fdf4", sign: "+" },
  pointage:         { label: "Bonus du jour",  icon: Clock,           color: "#0891b2", bg: "#f0f9ff", sign: "+" },
  transfer:         { label: "Transfert",      icon: ArrowUpCircle,   color: "#dc2626", bg: "#fff1f2", sign: "-" },
  transfer_received:{ label: "Transfert reçu", icon: ArrowDownCircle, color: "#16a34a", bg: "#f0fdf4", sign: "+" },
  recharge:         { label: "Recharge",       icon: RefreshCw,       color: "#ea580c", bg: "#fff7ed", sign: "+" },
  payment:          { label: "Paiement",       icon: ShoppingCart,    color: "#7c3aed", bg: "#faf5ff", sign: "-" },
  withdrawal:       { label: "Retrait",        icon: ArrowUpCircle,   color: "#dc2626", bg: "#fff1f2", sign: "-" },
  referral:         { label: "Parrainage",     icon: Users,           color: "#7c3aed", bg: "#faf5ff", sign: "+" },
};

const getConfig = (type: string) => TYPE_CONFIG[type] || {
  label: "Transaction", icon: RefreshCw, color: "#64748b", bg: "#f8fafc", sign: "+" as const
};

const isCredit = (type: string) => ["deposit","pointage","transfer_received","referral","recharge"].includes(type);

const generateRef = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  const num = Math.abs(hash) % 1000000;
  return `REF_SIKA_${num.toString().padStart(6, "0")}`;
};

const formatGroupDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

const groupByDate = (list: any[]) => {
  const groups: Record<string, any[]> = {};
  for (const t of list) {
    const key = new Date(t.createdAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return Object.entries(groups).map(([key, items]) => ({
    label: formatGroupDate(items[0].createdAt),
    items,
  }));
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "completed") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
      <CheckCircle2 size={9} /> Complété
    </span>
  );
  if (status === "pending") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
      <AlertCircle size={9} /> En attente
    </span>
  );
  if (status === "failed") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
      <XCircle size={9} /> Échoué
    </span>
  );
  return null;
};

export default function Transactions() {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions", filterType, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("limit", "100");
      if (filterType !== "all") params.append("type", filterType);
      if (filterStatus !== "all") params.append("status", filterStatus);
      return fetch(`/api/transactions?${params.toString()}`, { credentials: "include" }).then(r => r.json());
    }
  });

  const list = transactions as any[];
  const groups = groupByDate(list);

  const totalIn  = list.filter(t => isCredit(t.type)).reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalOut = list.filter(t => !isCredit(t.type)).reduce((s, t) => s + parseFloat(t.amount), 0);

  const typeOptions = [
    { value: "all",        label: "Tout" },
    { value: "deposit",    label: "Récompenses" },
    { value: "pointage",   label: "Bonus" },
    { value: "withdrawal", label: "Retraits" },
    { value: "referral",   label: "Parrainage" },
    { value: "transfer",   label: "Transferts" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>

      {/* ── Header ── */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f172a, #1e3a5f, #1a4fa0)" }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
        <div className="px-4 pt-4 pb-5 relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Link href="/">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:bg-white/20 transition-all">
                  <ChevronLeft size={20} className="text-white" />
                </div>
              </Link>
              <div>
                <h1 className="text-white font-black text-xl">Transactions</h1>
                <p className="text-blue-300 text-xs">{list.length} opération{list.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showFilters ? "bg-white/25" : "bg-white/10 active:bg-white/20"}`}>
              <SlidersHorizontal size={17} className="text-white" />
            </button>
          </div>

          {/* Bilan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={12} className="text-green-400" />
                <p className="text-green-300 text-[10px] font-bold uppercase tracking-wider">Entrées</p>
              </div>
              <p className="text-white font-black text-lg">{formatFCFA(totalIn)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={12} className="text-red-400" />
                <p className="text-red-300 text-[10px] font-bold uppercase tracking-wider">Sorties</p>
              </div>
              <p className="text-white font-black text-lg">{formatFCFA(totalOut)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">

        {/* ── Filtres ── */}
        {showFilters && (
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-4 space-y-4">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Filtrer par type</p>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map(o => (
                <button key={o.value} onClick={() => setFilterType(o.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={filterType === o.value
                    ? { background: "#1d4ed8", color: "#fff" }
                    : { background: "#f1f5f9", color: "#64748b" }}>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Filtrer par statut</p>
            <div className="flex gap-2">
              {[
                { value: "all", label: "Tous" },
                { value: "completed", label: "Complété" },
                { value: "pending", label: "En attente" },
                { value: "failed", label: "Échoué" },
              ].map(o => (
                <button key={o.value} onClick={() => setFilterStatus(o.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={filterStatus === o.value
                    ? { background: "#1d4ed8", color: "#fff" }
                    : { background: "#f1f5f9", color: "#64748b" }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Liste vide ── */}
        {list.length === 0 && (
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 py-16 text-center"
            data-testid="text-no-transactions">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-blue-300" />
            </div>
            <p className="text-gray-700 font-bold text-sm">Aucune transaction</p>
            <p className="text-gray-400 text-xs mt-1">Vos opérations apparaîtront ici</p>
          </div>
        )}

        {/* ── Groupes par date ── */}
        {groups.map(group => (
          <div key={group.label}>
            {/* Label de date */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">{group.label}</p>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Cartes de transaction */}
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
              {group.items.map((t: any, idx: number) => {
                const cfg = getConfig(t.type);
                const credit = isCredit(t.type);
                const Icon = cfg.icon;
                return (
                  <div key={t.id}
                    className={`flex items-center gap-3 px-4 py-3.5 ${idx !== group.items.length - 1 ? "border-b border-gray-50" : ""}`}
                    data-testid={`transaction-${t.id}`}>

                    {/* Icône */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg }}>
                      <Icon size={18} style={{ color: cfg.color }} strokeWidth={2.2} />
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-gray-800 font-bold text-sm truncate"
                          data-testid={`text-transaction-type-${t.id}`}>
                          {cfg.label}
                        </p>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-[10px] font-mono font-semibold tracking-wide" style={{ color: cfg.color }}>
                        {generateRef(t.id)}
                      </p>
                      <p className="text-gray-400 text-[10px] mt-0.5"
                        data-testid={`text-transaction-date-${t.id}`}>
                        {new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {t.description ? ` · ${t.description}` : ""}
                      </p>
                    </div>

                    {/* Montant */}
                    <div className="text-right flex-shrink-0">
                      <p className={`font-black text-base ${credit ? "text-green-600" : "text-red-500"}`}
                        data-testid={`text-transaction-amount-${t.id}`}>
                        {credit ? "+" : "−"}{formatFCFA(Math.abs(parseFloat(t.amount)))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <BottomNavigation currentPage="transactions" />
    </div>
  );
}
