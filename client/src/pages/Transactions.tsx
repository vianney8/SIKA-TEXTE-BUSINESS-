import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownCircle, ArrowUpCircle, Clock, RefreshCw,
  Users, ShoppingCart, ChevronLeft, Filter,
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle,
  XCircle, X, Copy, Wallet, Zap, Gift
} from "lucide-react";
import { useState } from "react";
import { formatFCFA } from "@/lib/utils";
import BottomNavigation from "@/components/BottomNavigation";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; grad: string; sign: "+" | "-" }> = {
  deposit:           { label: "Récompense",    icon: Gift,            color: "#16a34a", grad: "from-green-500 to-emerald-400",  sign: "+" },
  pointage:          { label: "Bonus du jour", icon: Zap,             color: "#0284c7", grad: "from-sky-500 to-blue-400",       sign: "+" },
  transfer:          { label: "Transfert",     icon: ArrowUpCircle,   color: "#dc2626", grad: "from-red-500 to-rose-400",       sign: "-" },
  transfer_received: { label: "Reçu",          icon: ArrowDownCircle, color: "#16a34a", grad: "from-green-500 to-emerald-400",  sign: "+" },
  recharge:          { label: "Recharge",      icon: RefreshCw,       color: "#ea580c", grad: "from-orange-500 to-amber-400",   sign: "+" },
  payment:           { label: "Paiement",      icon: ShoppingCart,    color: "#7c3aed", grad: "from-violet-500 to-purple-400",  sign: "-" },
  withdrawal:        { label: "Retrait",       icon: Wallet,          color: "#dc2626", grad: "from-red-500 to-rose-400",       sign: "-" },
  referral:          { label: "Parrainage",    icon: Users,           color: "#7c3aed", grad: "from-violet-500 to-purple-400",  sign: "+" },
};

const getConfig = (type: string) => TYPE_CONFIG[type] || {
  label: "Transaction", icon: RefreshCw, color: "#64748b", grad: "from-slate-500 to-gray-400", sign: "+" as const
};

const isCredit = (t: any) => {
  if (["deposit","pointage","transfer_received","referral","recharge"].includes(t.type)) return true;
  if (t.type === "transfer" && parseFloat(t.amount) < 0) return false;
  return false;
};

const generateRef = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return `SKT-${Math.abs(hash % 1000000).toString().padStart(6, "0")}`;
};

const formatGroupDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
};

const groupByDate = (list: any[]) => {
  const groups: Record<string, any[]> = {};
  for (const t of list) {
    const key = new Date(t.createdAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return Object.entries(groups).map(([, items]) => ({
    label: formatGroupDate(items[0].createdAt),
    items,
  }));
};

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    completed: { label: "Complété",   cls: "bg-green-50 text-green-700 border-green-100",  icon: CheckCircle2 },
    pending:   { label: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-100",   icon: AlertCircle  },
    failed:    { label: "Échoué",     cls: "bg-red-50 text-red-600 border-red-100",          icon: XCircle      },
  };
  const s = map[status];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
      <Icon size={9} />
      {s.label}
    </span>
  );
};

const typeOptions = [
  { value: "all",        label: "Tout",        emoji: "📋" },
  { value: "deposit",    label: "Récompenses", emoji: "🎁" },
  { value: "pointage",   label: "Bonus",       emoji: "⚡" },
  { value: "withdrawal", label: "Retraits",    emoji: "💸" },
  { value: "referral",   label: "Parrainage",  emoji: "👥" },
  { value: "transfer",   label: "Transferts",  emoji: "↔️" },
];

export default function Transactions() {
  const { toast } = useToast();
  const [filterType, setFilterType]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters]   = useState(false);
  const [selected, setSelected]         = useState<any>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["/api/transactions", filterType, filterStatus],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "150" });
      if (filterType   !== "all") p.append("type",   filterType);
      if (filterStatus !== "all") p.append("status", filterStatus);
      return fetch(`/api/transactions?${p}`, { credentials: "include" }).then(r => r.json());
    },
  });

  const list   = transactions as any[];
  const groups = groupByDate(list);

  const totalIn  = list.filter(t =>  isCredit(t)).reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
  const totalOut = list.filter(t => !isCredit(t)).reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
  const net      = totalIn - totalOut;

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    toast({ title: "Référence copiée !" });
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]">

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #0c1a35 0%, #0f2d5a 50%, #0d3d8a 100%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
        </div>

        <div className="relative px-4 pt-5 pb-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href="/">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:bg-white/20 transition-all">
                  <ChevronLeft size={20} className="text-white" />
                </div>
              </Link>
              <div>
                <h1 className="text-white font-black text-xl tracking-tight">Historique</h1>
                <p className="text-blue-300/70 text-[11px]">{list.length} opération{list.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                showFilters ? "bg-white text-blue-900" : "bg-white/10 text-white"
              }`}>
              <Filter size={13} />
              Filtres
              {(filterType !== "all" || filterStatus !== "all") && (
                <span className="w-4 h-4 bg-blue-500 rounded-full text-[9px] font-black flex items-center justify-center text-white">!</span>
              )}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1 mb-1.5">
                <TrendingUp size={11} className="text-green-400" />
                <p className="text-green-300 text-[9px] font-bold uppercase tracking-widest">Entrées</p>
              </div>
              <p className="text-white font-black text-sm leading-none">{formatFCFA(totalIn)}</p>
            </div>
            <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1 mb-1.5">
                <TrendingDown size={11} className="text-red-400" />
                <p className="text-red-300 text-[9px] font-bold uppercase tracking-widest">Sorties</p>
              </div>
              <p className="text-white font-black text-sm leading-none">{formatFCFA(totalOut)}</p>
            </div>
            <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1 mb-1.5">
                <Wallet size={11} className={net >= 0 ? "text-blue-300" : "text-orange-300"} />
                <p className={`text-[9px] font-bold uppercase tracking-widest ${net >= 0 ? "text-blue-300" : "text-orange-300"}`}>Net</p>
              </div>
              <p className={`font-black text-sm leading-none ${net >= 0 ? "text-white" : "text-orange-300"}`}>{net >= 0 ? "+" : ""}{formatFCFA(Math.abs(net))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTRES ── */}
      {showFilters && (
        <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {typeOptions.map(o => (
              <button key={o.value} onClick={() => setFilterType(o.value)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filterType === o.value
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                <span>{o.emoji}</span> {o.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[
              { value: "all",       label: "Tous" },
              { value: "completed", label: "✅ Complété" },
              { value: "pending",   label: "🕐 En attente" },
              { value: "failed",    label: "❌ Échoué" },
            ].map(o => (
              <button key={o.value} onClick={() => setFilterStatus(o.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filterStatus === o.value
                    ? "bg-slate-800 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-4 pb-28 space-y-5">

        {/* ── LOADING ── */}
        {isLoading && (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-32" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-20" />
                </div>
                <div className="h-4 bg-gray-100 rounded-full w-20" />
              </div>
            ))}
          </div>
        )}

        {/* ── VIDE ── */}
        {!isLoading && list.length === 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 py-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-blue-300" />
            </div>
            <p className="text-gray-800 font-bold text-sm">Aucune transaction trouvée</p>
            <p className="text-gray-400 text-xs mt-1.5 max-w-[180px] mx-auto">Vos opérations apparaîtront ici dès qu'elles auront lieu</p>
          </div>
        )}

        {/* ── GROUPES PAR DATE ── */}
        {!isLoading && groups.map(group => (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{group.label}</p>
              <div className="flex-1 h-px bg-gray-200/60" />
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100/80 overflow-hidden divide-y divide-gray-50">
              {group.items.map((t: any) => {
                const cfg = getConfig(t.type);
                const credit = isCredit(t);
                const Icon = cfg.icon;
                return (
                  <button key={t.id}
                    onClick={() => setSelected(t)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50/80 transition-colors text-left"
                    data-testid={`transaction-${t.id}`}>

                    {/* Icône */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${cfg.grad}`}>
                      <Icon size={17} className="text-white" strokeWidth={2.3} />
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-gray-800 font-bold text-[13px] truncate">{cfg.label}</p>
                        <StatusPill status={t.status} />
                      </div>
                      <p className="text-gray-400 text-[11px] truncate">
                        {new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {t.description ? ` · ${t.description}` : ""}
                      </p>
                    </div>

                    {/* Montant */}
                    <p className={`font-black text-[15px] flex-shrink-0 ${credit ? "text-green-600" : "text-red-500"}`}>
                      {credit ? "+" : "−"}{formatFCFA(Math.abs(parseFloat(t.amount)))}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <BottomNavigation currentPage="transactions" />

      {/* ── MODAL DÉTAIL ── */}
      {selected && (() => {
        const t    = selected;
        const cfg  = getConfig(t.type);
        const cr   = isCredit(t);
        const ref  = generateRef(t.id);
        const Icon = cfg.icon;
        return (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelected(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <div className="relative w-full bg-white rounded-t-[28px] px-5 pt-5 pb-10 shadow-2xl"
              onClick={e => e.stopPropagation()}>

              {/* Handle */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

              {/* Icon + montant */}
              <div className="flex flex-col items-center mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br ${cfg.grad} shadow-lg`}>
                  <Icon size={30} className="text-white" strokeWidth={2} />
                </div>
                <p className={`font-black text-3xl ${cr ? "text-green-600" : "text-red-500"}`}>
                  {cr ? "+" : "−"}{formatFCFA(Math.abs(parseFloat(t.amount)))}
                </p>
                <p className="text-gray-500 text-sm mt-1">{cfg.label}</p>
                <div className="mt-2"><StatusPill status={t.status} /></div>
              </div>

              {/* Détails */}
              <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100 mb-4">
                {[
                  { label: "Référence",   value: ref,                                                         copy: true  },
                  { label: "Date",        value: new Date(t.createdAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), copy: false },
                  { label: "Heure",       value: new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),            copy: false },
                  ...(t.description ? [{ label: "Description", value: t.description, copy: false }] : []),
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <p className="text-gray-500 text-sm">{row.label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-800 font-semibold text-sm text-right max-w-[200px] truncate">{row.value}</p>
                      {row.copy && (
                        <button onClick={() => copyRef(row.value)} className="p-1 rounded-lg active:bg-gray-200">
                          <Copy size={13} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setSelected(null)}
                className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm flex items-center justify-center gap-2 active:bg-gray-200">
                <X size={15} /> Fermer
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
