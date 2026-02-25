import { 
  Briefcase, History, CreditCard, Settings, Wallet, HelpCircle,
  TrendingUp, Users, Code2, LogOut, X, ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatFCFA } from "@/lib/utils";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const menuGroups = [
  {
    title: "Principal",
    items: [
      { icon: Briefcase, label: "Nouveau travail", href: "/work", color: "#6366f1", bg: "rgba(99,102,241,0.12)", testId: "button-new-work" },
      { icon: CreditCard, label: "Transactions", href: "/transactions", color: "#10b981", bg: "rgba(16,185,129,0.12)", testId: "button-transactions" },
      { icon: TrendingUp, label: "Statistiques", href: "/summary", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", testId: "button-statistics" },
    ]
  },
  {
    title: "Finances",
    items: [
      { icon: Wallet, label: "Retrait", href: "/withdrawal", color: "#ef4444", bg: "rgba(239,68,68,0.12)", testId: "button-withdrawal" },
      { icon: Users, label: "Mon équipe", href: "/team", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", testId: "button-team" },
    ]
  },
  {
    title: "Compte",
    items: [
      { icon: Settings, label: "Profil", href: "/profile", color: "#64748b", bg: "rgba(100,116,139,0.12)", testId: "button-profile" },
      { icon: HelpCircle, label: "Assistance", href: "/assistance", color: "#0088cc", bg: "rgba(0,136,204,0.12)", testId: "button-help" },
      { icon: Code2, label: "API Agrégateur", href: "/api-agregateur", color: "#10b981", bg: "rgba(16,185,129,0.12)", testId: "button-api-agregateur" },
    ]
  }
];

export default function HamburgerMenu({ isOpen, onClose, user }: HamburgerMenuProps) {
  const { data: balance } = useQuery({ queryKey: ["/api/user/balance"] });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    window.location.href = "/";
  };

  const initials = (() => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`;
    if (user?.fullName) return user.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2);
    return 'U';
  })();

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.fullName || 'Utilisateur';

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
          onClick={onClose}
          data-testid="menu-overlay"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: '300px', background: '#0a0f2c' }}
        data-testid="hamburger-menu"
      >
        {/* Header */}
        <div className="relative px-5 pt-10 pb-6"
          style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a1f5e 100%)' }}>
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent)', transform: 'translate(30%, -30%)' }} />

          {/* Close button */}
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={16} className="text-white/70" />
          </button>

          {/* Avatar */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white flex-shrink-0 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {initials.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate" data-testid="text-menu-user-name">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-emerald-400">Online</span>
              </div>
            </div>
          </div>

          {/* Balance card */}
          <div className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3), transparent)' }} />
            <p className="text-white/50 text-xs mb-1 font-medium uppercase tracking-wider">Solde disponible</p>
            <p className="text-white text-2xl font-black" data-testid="text-menu-balance">
              {formatFCFA((balance as any)?.balance || 0)}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5"
          style={{ background: '#0e1335' }}>
          {menuGroups.map((group) => (
            <div key={group.title}>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2 px-2">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link key={item.label} href={item.href}>
                    <div
                      onClick={onClose}
                      data-testid={item.testId}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer active:scale-95 transition-all group"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: item.bg }}>
                        <item.icon size={17} style={{ color: item.color }} />
                      </div>
                      <span className="text-white/80 font-medium text-sm flex-1">{item.label}</span>
                      <ChevronRight size={14} className="text-white/20" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="px-4 py-5" style={{ background: '#0e1335', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            data-testid="button-logout"
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm transition-all active:scale-95"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}
