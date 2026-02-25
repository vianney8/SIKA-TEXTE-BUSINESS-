import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Filter, TrendingUp, TrendingDown, RefreshCw, Zap, Users, ShoppingCart, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { formatFCFA } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNavigation from "@/components/BottomNavigation";

const TX_META: Record<string, { label: string; icon: any; color: string; bg: string; positive: boolean }> = {
  deposit:           { label: "Récompenses",       icon: TrendingUp,   color: "#10b981", bg: "rgba(16,185,129,0.12)",  positive: true  },
  pointage:          { label: "Pointage",           icon: Zap,          color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  positive: true  },
  transfer:          { label: "Transfert",          icon: TrendingDown, color: "#6366f1", bg: "rgba(99,102,241,0.12)",  positive: false },
  transfer_received: { label: "Transfert reçu",    icon: TrendingUp,   color: "#10b981", bg: "rgba(16,185,129,0.12)",  positive: true  },
  recharge:          { label: "Recharge crédit",   icon: RefreshCw,    color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  positive: false },
  payment:           { label: "Paiement Marchand", icon: ShoppingCart, color: "#6366f1", bg: "rgba(99,102,241,0.12)",  positive: false },
  withdrawal:        { label: "Retrait",            icon: TrendingDown, color: "#ef4444", bg: "rgba(239,68,68,0.12)",   positive: false },
  referral:          { label: "Parrainage",         icon: Users,        color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  positive: true  },
  activation:        { label: "Activation",         icon: CreditCard,   color: "#10b981", bg: "rgba(16,185,129,0.12)",  positive: true  },
};

const getMeta = (type: string) => TX_META[type] || { label: "Transaction", icon: CreditCard, color: "#64748b", bg: "rgba(100,116,139,0.12)", positive: false };

const getStatusStyle = (status: string) => {
  switch (status) {
    case "completed": return { label: "Payé",       color: "#10b981", bg: "rgba(16,185,129,0.12)"  };
    case "pending":   return { label: "En attente", color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  };
    case "failed":    return { label: "Échoué",     color: "#ef4444", bg: "rgba(239,68,68,0.12)"   };
    default:          return { label: "Inconnu",    color: "#64748b", bg: "rgba(100,116,139,0.12)" };
  }
};

export default function Transactions() {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions", filterType, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (filterType !== "all") params.append("type", filterType);
      if (filterStatus !== "all") params.append("status", filterStatus);
      return fetch(`/api/transactions?${params}`, { credentials: "include" }).then(r => r.json());
    },
  });

  const txList = transactions as any[];
  const totalIn  = txList.filter(t => getMeta(t.type).positive).reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
  const totalOut = txList.filter(t => !getMeta(t.type).positive).reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);

  return (
    <div className="min-h-screen pb-24" style={{ background: "#f0f4ff" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0a0f2c 0%, #1a1f5e 100%)" }}>
        <div className="px-4 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(255,255,255,0.08)" }} data-testid="button-back">
                <ArrowLeft size={18} className="text-white" />
              </div>
            </Link>
            <h1 className="text-white font-bold text-lg" data-testid="page-title">Transactions</h1>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={13} style={{ color: "#10b981" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#10b981" }}>Entrées</span>
              </div>
              <p className="text-white font-black text-lg">+{formatFCFA(totalIn)}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={13} style={{ color: "#ef4444" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#ef4444" }}>Sorties</span>
              </div>
              <p className="text-white font-black text-lg">-{formatFCFA(totalOut)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Filters */}
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: "white" }}>
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} style={{ color: "#6366f1" }} />
            <span className="text-slate-700 font-semibold text-sm">Filtres</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="filter-type" className="rounded-xl border-slate-200 text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="deposit">Récompenses</SelectItem>
                <SelectItem value="pointage">Pointage</SelectItem>
                <SelectItem value="transfer">Transfert</SelectItem>
                <SelectItem value="withdrawal">Retrait</SelectItem>
                <SelectItem value="referral">Parrainage</SelectItem>
                <SelectItem value="activation">Activation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="filter-status" className="rounded-xl border-slate-200 text-sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="completed">Payé</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        {txList.length === 0 ? (
          <div className="rounded-2xl p-10 text-center shadow-sm" style={{ background: "white" }} data-testid="text-no-transactions">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)" }}>
              <CreditCard size={24} style={{ color: "#6366f1" }} />
            </div>
            <p className="text-slate-500 font-medium">Aucune transaction trouvée</p>
            <p className="text-slate-400 text-sm mt-1">Vos opérations apparaîtront ici</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "white" }}>
            {txList.map((tx: any, i: number) => {
              const meta = getMeta(tx.type);
              const status = getStatusStyle(tx.status);
              const Icon = meta.icon;
              return (
                <div key={tx.id}
                  className={`flex items-center gap-3 px-4 py-4 ${i < txList.length - 1 ? "border-b" : ""}`}
                  style={{ borderColor: "#f1f5f9" }}
                  data-testid={`transaction-${tx.id}`}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: meta.bg }}>
                    <Icon size={18} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-semibold text-sm" data-testid={`text-transaction-type-${tx.id}`}>
                      {meta.label}
                    </p>
                    <p className="text-slate-400 text-[11px]" data-testid={`text-transaction-date-${tx.id}`}>
                      {new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm`} style={{ color: meta.positive ? "#10b981" : "#ef4444" }}
                      data-testid={`text-transaction-amount-${tx.id}`}>
                      {meta.positive ? "+" : "-"}{formatFCFA(Math.abs(parseFloat(tx.amount)))}
                    </p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: status.color, background: status.bg }}>
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavigation currentPage="transactions" />
    </div>
  );
}
