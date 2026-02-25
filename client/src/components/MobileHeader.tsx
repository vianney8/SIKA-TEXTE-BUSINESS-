import { Button } from "@/components/ui/button";
import { Menu, Bell, Eye, EyeOff, TrendingUp, Shield } from "lucide-react";
import { Link } from "wouter";
import { formatFCFA } from "@/lib/utils";
import { useState } from "react";

interface MobileHeaderProps {
  user: any;
  balance: number;
  onMenuToggle: () => void;
  onPointage: () => void;
}

export default function MobileHeader({ user, balance, onMenuToggle, onPointage }: MobileHeaderProps) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  const initials = (() => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`;
    if (user?.fullName) return user.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2);
    return 'U';
  })();

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.fullName || 'Utilisateur';

  return (
    <header style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a1f5e 40%, #0d1b4b 100%)' }}>
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2 flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuToggle}
          className="text-white hover:bg-white/10 transition-colors p-2 rounded-xl"
          data-testid="button-menu"
        >
          <Menu size={22} strokeWidth={2.5} />
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-white/70 text-xs font-medium tracking-widest uppercase">Sika Texte</span>
        </div>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 relative transition-colors p-2 rounded-xl"
          data-testid="button-notifications"
        >
          <Link href="/transactions">
            <Bell size={20} strokeWidth={2} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full"></span>
          </Link>
        </Button>
      </div>

      {/* Profile + Balance Card */}
      <div className="px-4 pb-6 pt-2">
        {/* User greeting */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-lg flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {initials.toUpperCase()}
          </div>
          <div>
            <p className="text-white/60 text-xs">Bonjour 👋</p>
            <p className="text-white font-semibold text-sm leading-tight truncate max-w-[180px]" data-testid="text-username">
              {displayName}
            </p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-1 rounded-full px-2 py-1"
              style={{
                background: user?.isActive ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                border: user?.isActive ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)",
              }}>
              <Shield size={10} style={{ color: user?.isActive ? "#34d399" : "#fbbf24" }} />
              <span className="text-[10px] font-semibold" style={{ color: user?.isActive ? "#34d399" : "#fbbf24" }}>
                {user?.isActive ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>
        </div>

        {/* Balance Card — glassmorphism */}
        <div className="relative rounded-3xl p-5 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.15) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)',
          }}>
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-1">
              <span className="text-white/60 text-xs font-medium tracking-wide uppercase">Solde disponible</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="text-white/60 hover:text-white hover:bg-white/10 p-1 h-auto transition-colors"
                data-testid="button-toggle-balance"
              >
                {isBalanceVisible ? <Eye size={15} /> : <EyeOff size={15} />}
              </Button>
            </div>

            <div className="mb-3">
              <span className="text-4xl font-black text-white tracking-tight" data-testid="text-balance">
                {isBalanceVisible ? formatFCFA(balance) : '••••••'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={12} className="text-emerald-400" />
                <span className="text-emerald-400 text-xs font-medium">Actif</span>
              </div>
              <div className="flex items-center gap-3 text-white/40 text-[10px]" data-testid="text-last-update">
                <span>{user?.id?.substring(0, 8) || 'STB-0001'}</span>
                <span>{new Date().toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
