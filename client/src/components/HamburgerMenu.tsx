import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut, Briefcase, History, Settings, Wallet,
  HelpCircle, Code2, TrendingUp, Users, Home, X
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatFCFA } from "@/lib/utils";
import logoPath from "@assets/1764438802465_1773510898637.jpg";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const NAV_ITEMS = [
  { icon: Home,       label: "Accueil",        href: "/",                 color: "bg-blue-50 text-blue-600" },
  { icon: Briefcase,  label: "Travaux",         href: "/work",             color: "bg-indigo-50 text-indigo-600" },
  { icon: TrendingUp, label: "Statistiques",    href: "/summary",          color: "bg-emerald-50 text-emerald-600" },
  { icon: History,    label: "Transactions",    href: "/transactions",     color: "bg-violet-50 text-violet-600" },
  { icon: Wallet,     label: "Retrait",         href: "/withdrawal",       color: "bg-orange-50 text-orange-600" },
  { icon: Users,      label: "Mon équipe",      href: "/team",             color: "bg-pink-50 text-pink-600" },
  { icon: Settings,   label: "Profil",          href: "/profile",          color: "bg-slate-50 text-slate-600" },
  { icon: HelpCircle, label: "Assistance",      href: "/assistance",       color: "bg-teal-50 text-teal-600" },
  { icon: Code2,      label: "API Agrégateur",  href: "/api-agregateur",   color: "bg-gray-50 text-gray-600" },
];

export default function HamburgerMenu({ isOpen, onClose, user }: HamburgerMenuProps) {
  const { data: balance } = useQuery({ queryKey: ["/api/user/balance"] });

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (response.ok) window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "Utilisateur";
  const lastName = user?.lastName || user?.fullName?.split(" ").slice(1).join(" ") || "";
  const initials = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();
  const isActivated = user?.isActivated || false;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={onClose}
          data-testid="menu-overlay"
        />
      )}

      {/* Panneau latéral */}
      <div
        className={`fixed top-0 left-0 w-[300px] h-full z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "#fff" }}
        data-testid="hamburger-menu"
      >
        {/* ─── En-tête du menu ─── */}
        <div
          className="relative px-5 pt-6 pb-5 flex-shrink-0"
          style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #1a4fa0 100%)" }}
        >
          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>

          {/* Logo + marque */}
          <div className="flex items-center gap-2 mb-4">
            <img src={logoPath} alt="Sika Texte" className="w-6 h-6 rounded-lg object-cover" />
            <span className="text-white/70 text-xs font-bold tracking-widest uppercase">Sika Texte</span>
          </div>

          {/* Avatar + nom */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-12 h-12 ring-2 ring-white/20">
              <AvatarFallback
                className="text-white font-bold text-base"
                style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate" data-testid="text-menu-user-name">
                {firstName} {lastName}
              </p>
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
                isActivated
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30"
                  : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30"
              }`}>
                {isActivated ? "● Compte actif" : "○ Inactif"}
              </span>
            </div>
          </div>

          {/* Solde */}
          <div className="bg-white/10 rounded-2xl px-4 py-3">
            <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-0.5">Solde disponible</p>
            <p className="text-white font-black text-xl">{formatFCFA((balance as any)?.balance || 0)}</p>
          </div>
        </div>

        {/* ─── Navigation ─── */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer mb-0.5"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon size={17} strokeWidth={2} />
                </div>
                <span className="text-gray-700 font-semibold text-sm">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>

        {/* ─── Déconnexion ─── */}
        <div className="px-4 pb-6 pt-2 flex-shrink-0 border-t border-gray-100">
          <button
            onClick={handleLogout}
            data-testid="button-logout"
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm py-3 rounded-2xl transition-colors active:scale-95"
          >
            <LogOut size={17} strokeWidth={2} />
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}
