import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownCircle, ArrowUpCircle, Clock, RefreshCw,
  Users, ShoppingCart, ChevronLeft, Filter, SlidersHorizontal
} from "lucide-react";
import { useState } from "react";
import { formatFCFA } from "@/lib/utils";
import BottomNavigation from "@/components/BottomNavigation";
import { Link } from "wouter";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; sign: "+" | "-" }> = {
  deposit:          { label: "Récompenses",      icon: ArrowDownCircle, color: "#16a34a", bg: "#dcfce7", sign: "+" },
  pointage:         { label: "Bonus du jour",     icon: Clock,           color: "#0891b2", bg: "#e0f2fe", sign: "+" },
  transfer:         { label: "Transfert",         icon: ArrowUpCircle,   color: "#dc2626", bg: "#fee2e2", sign: "-" },
  transfer_received:{ label: "Transfert reçu",   icon: ArrowDownCircle, color: "#16a34a", bg: "#dcfce7", sign: "+" },
  recharge:         { label: "Recharge",          icon: RefreshCw,       color: "#ea580c", bg: "#ffedd5", sign: "+" },
  payment:          { label: "Paiement",          icon: ShoppingCart,    color: "#7c3aed", bg: "#ede9fe", sign: "-" },
  withdrawal:       { label: "Retrait",           icon: ArrowUpCircle,   color: "#dc2626", bg: "#fee2e2", sign: "-" },
  referral:         { label: "Parrainage",        icon: Users,           color: "#7c3aed", bg: "#ede9fe", sign: "+" },
};

const getConfig = (type: string) => TYPE_CONFIG[type] || {
  label: "Transaction", icon: RefreshCw, color: "#64748b", bg: "#f1f5f9", sign: "+" as const
};

const isCredit = (type: string) => ["deposit","pointage","transfer_received","referral","recharge"].includes(type);

export default function Transactions() {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions", filterType, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (filterType !== 'all') params.append('type', filterType);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      return fetch(`/api/transactions?${params.toString()}`, { credentials: 'include' }).then(r => r.json());
    }
  });

  const list = transactions as any[];

  const totalIn  = list.filter(t => isCredit(t.type)).reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalOut = list.filter(t => !isCredit(t.type)).reduce((s, t) => s + parseFloat(t.amount), 0);

  const typeOptions = [
    { value: "all", label: "Tous" },
    { value: "deposit", label: "Dépôts" },
    { value: "pointage", label: "Bonus" },
    { value: "withdrawal", label: "Retraits" },
    { value: "referral", label: "Parrainage" },
  ];

  const statusBadge = (status: string) => {
    if (status === "completed") return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Payé</span>;
    if (status === "pending")   return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">En attente</span>;
    if (status === "failed")    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Échoué</span>;
    return null;
  };

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f172a, #1e3a5f, #1a4fa0)" }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #67e8f9, transparent)" }} />
        <div className="px-4 pt-4 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:bg-white/20">
                  <ChevronLeft size={20} className="text-white" />
                </div>
              </Link>
              <div>
                <h1 className="text-white font-black text-xl">Historique</h1>
                <p className="text-blue-300 text-xs">{list.length} transaction(s)</p>
              </div>
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:bg-white/20">
              <SlidersHorizontal size={17} className="text-white" />
            </button>
          </div>

          {/* Bilan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-blue-300 text-[10px] uppercase tracking-wider mb-1">Entrées</p>
              <p className="text-green-400 font-black text-lg">{formatFCFA(totalIn)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-blue-300 text-[10px] uppercase tracking-wider mb-1">Sorties</p>
              <p className="text-red-400 font-black text-lg">{formatFCFA(totalOut)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">
        {/* Filtres */}
        {showFilters && (
          <div className="bg-white rounded-[20px] shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Filter size={14} className="text-gray-400" />
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Filtres</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-2">Type</p>
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
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-2">Statut</p>
              <div className="flex gap-2">
                {[{ value:"all", label:"Tous" }, { value:"completed", label:"Payé" }, { value:"pending", label:"En attente" }].map(o => (
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
          </div>
        )}

        {/* Liste */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          {list.length === 0 ? (
            <div className="py-12 text-center" data-testid="text-no-transactions">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-semibold text-sm">Aucune transaction</p>
              <p className="text-gray-400 text-xs mt-1">Vos opérations apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {list.map((t: any) => {
                const cfg = getConfig(t.type);
                const credit = isCredit(t.type);
                const Icon = cfg.icon;
                return (
                  <div key={t.id} className="px-4 py-3.5 flex items-center gap-3"
                    data-testid={`transaction-${t.id}`}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg }}>
                      <Icon size={19} style={{ color: cfg.color }} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-800 font-semibold text-sm truncate"
                          data-testid={`text-transaction-type-${t.id}`}>
                          {cfg.label}
                        </p>
                        {statusBadge(t.status)}
                      </div>
                      <p className="text-gray-400 text-[10px] mt-0.5"
                        data-testid={`text-transaction-date-${t.id}`}>
                        {new Date(t.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                      {t.description && (
                        <p className="text-gray-400 text-[10px] truncate">{t.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-black text-sm ${credit ? "text-green-600" : "text-red-500"}`}
                        data-testid={`text-transaction-amount-${t.id}`}>
                        {credit ? "+" : "-"}{formatFCFA(Math.abs(parseFloat(t.amount)))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation currentPage="transactions" />
    </div>
  );
}
