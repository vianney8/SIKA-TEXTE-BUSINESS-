import { Button } from "@/components/ui/button";
import { Menu, Bell, Eye, EyeOff, ArrowDownToLine, Send } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import logoPath from "@assets/1764438802465_1773510898637.jpg";

interface MobileHeaderProps {
  user: any;
  balance: number;
  onMenuToggle: () => void;
  onPointage: () => void;
}

export default function MobileHeader({ user, balance, onMenuToggle }: MobileHeaderProps) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  const isActivated = (user as any)?.isActivated || false;
  const firstName = (user as any)?.firstName || (user as any)?.fullName?.split(" ")[0] || "Utilisateur";
  const lastName = (user as any)?.lastName || (user as any)?.fullName?.split(" ").slice(1).join(" ") || "";
  const initials = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();

  return (
    <header className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #1a4fa0 100%)" }}>

      {/* Cercles décoratifs subtils */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-5" style={{ background: "#60a5fa" }} />
      <div className="absolute top-16 -left-8 w-32 h-32 rounded-full opacity-5" style={{ background: "#38bdf8" }} />

      {/* Barre supérieure */}
      <div className="relative px-4 pt-3 pb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuToggle}
          className="text-white/80 hover:bg-white/10 p-2 rounded-xl"
          data-testid="button-menu"
        >
          <Menu size={22} strokeWidth={2} />
        </Button>

        {/* Logo + nom de marque centré */}
        <div className="flex items-center gap-2">
          <img src={logoPath} alt="Sika Texte" className="w-7 h-7 rounded-lg object-cover" />
          <span className="text-white font-bold text-sm tracking-wider">SIKA TEXTE</span>
        </div>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-white/80 hover:bg-white/10 relative p-2 rounded-xl"
          data-testid="button-notifications"
        >
          <Link href="/transactions">
            <Bell size={20} strokeWidth={2} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-400 rounded-full" />
          </Link>
        </Button>
      </div>

      {/* Zone utilisateur + solde */}
      <div className="relative px-5 pt-3 pb-6">

        {/* Salutation utilisateur */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/20"
              style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
              {initials}
            </div>
            <div>
              <p className="text-white/50 text-xs mb-0.5">Bonjour 👋</p>
              <p className="text-white font-semibold text-sm leading-tight" data-testid="text-username">
                {firstName} {lastName}
              </p>
            </div>
          </div>

          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
            isActivated
              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
              : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40"
          }`}>
            {isActivated ? "● Actif" : "○ Inactif"}
          </span>
        </div>

        {/* Solde */}
        <div className="mb-5">
          <p className="text-white/40 text-xs font-medium tracking-widest uppercase mb-1">Solde disponible</p>
          <div className="flex items-center gap-3">
            <p className="text-white font-black leading-none" style={{ fontSize: "2.4rem" }} data-testid="text-balance">
              {isBalanceVisible
                ? `${(balance || 0).toLocaleString("fr-FR")}`
                : "••••••"}
            </p>
            <div className="flex flex-col items-start gap-1">
              <span className="text-white/60 text-sm font-semibold">FCFA</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="text-white/50 hover:bg-white/10 p-1 h-auto rounded-lg"
                data-testid="button-toggle-balance"
              >
                {isBalanceVisible ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />}
              </Button>
            </div>
          </div>
        </div>

        {/* Boutons d'action rapide */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/transfer" data-testid="button-transfer">
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-white/15 active:scale-95 transition-all">
              <div className="w-9 h-9 bg-blue-400/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Send size={16} className="text-blue-300" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Transfert</p>
                <p className="text-white/40 text-xs">Envoyer</p>
              </div>
            </div>
          </Link>

          <Link href="/withdrawal" data-testid="button-withdrawal">
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-white/15 active:scale-95 transition-all">
              <div className="w-9 h-9 bg-emerald-400/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ArrowDownToLine size={16} className="text-emerald-300" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Retrait</p>
                <p className="text-white/40 text-xs">Retirer</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
