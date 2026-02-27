import { Button } from "@/components/ui/button";
import { Menu, Bell, Eye, EyeOff } from "lucide-react";
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

  const isActivated = (user as any)?.isActivated || false;
  const accountId = (user as any)?.id?.substring(0, 8) || "--------";
  const today = new Date().toLocaleDateString("fr-FR");
  const firstName = (user as any)?.firstName || (user as any)?.fullName?.split(" ")[0] || "Utilisateur";
  const lastName = (user as any)?.lastName || (user as any)?.fullName?.split(" ").slice(1).join(" ") || "";

  return (
    <header className="sticky top-0 z-50 shadow-lg" style={{ background: "linear-gradient(135deg, #1a237e 0%, #283593 40%, #1565c0 100%)" }}>
      {/* Top Navigation Bar */}
      <div className="px-4 py-3 flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuToggle}
          className="text-white hover:bg-white/20 transition-colors p-2"
          data-testid="button-menu"
        >
          <Menu size={24} strokeWidth={2.5} />
        </Button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-white text-base font-bold tracking-widest uppercase">SIKA TEXTE</span>
        </div>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 relative transition-colors p-2"
          data-testid="button-notifications"
        >
          <Link href="/transactions">
            <Bell size={22} strokeWidth={2} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
          </Link>
        </Button>
      </div>

      {/* User greeting & balance */}
      <div className="px-5 pb-6 pt-2">
        {/* User Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base"
              style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}>
              {firstName.charAt(0).toUpperCase()}{lastName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-white/70 text-xs">Bonjour 👋</div>
              <div className="text-white font-semibold text-sm" data-testid="text-username">
                {firstName} {lastName}
              </div>
            </div>
          </div>
          <div className={`text-xs font-semibold px-3 py-1 rounded-full border ${
            isActivated
              ? "border-green-400 text-green-300 bg-green-900/30"
              : "border-yellow-400 text-yellow-300 bg-yellow-900/30"
          }`}>
            {isActivated ? "✓ Actif" : "⊘ Inactif"}
          </div>
        </div>

        {/* Balance */}
        <div className="mb-1 text-white/60 text-xs font-semibold tracking-widest uppercase">
          Solde disponible
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="text-white font-black tracking-tight" style={{ fontSize: "2.2rem" }} data-testid="text-balance">
            {isBalanceVisible ? `${(balance || 0).toLocaleString("fr-FR")} FCFA` : "•••• FCFA"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsBalanceVisible(!isBalanceVisible)}
            className="text-white/70 hover:bg-white/20 p-1 transition-colors"
            data-testid="button-toggle-balance"
          >
            {isBalanceVisible ? <Eye size={18} strokeWidth={2} /> : <EyeOff size={18} strokeWidth={2} />}
          </Button>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span className="text-green-300 font-medium">online</span>
          </div>
          <div className="text-white/50 flex gap-2">
            <span data-testid="text-account-id">{accountId}</span>
            <span data-testid="text-last-update">{today}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
