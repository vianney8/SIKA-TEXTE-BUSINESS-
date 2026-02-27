import { 
  LogOut, 
  Briefcase, 
  CreditCard, 
  Wallet, 
  HelpCircle,
  Code2,
  TrendingUp,
  Users,
  User,
  ChevronRight,
  Star,
  Shield,
  Home
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function HamburgerMenu({ isOpen, onClose, user }: HamburgerMenuProps) {
  const { toast } = useToast();
  const { data: balance } = useQuery({
    queryKey: ["/api/user/balance"],
  });

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        window.location.href = "/";
      }
    } catch {
      window.location.href = "/";
    }
  };

  const isActivated = (user as any)?.isActivated || false;
  const firstName = (user as any)?.firstName || (user as any)?.fullName?.split(" ")[0] || "Utilisateur";
  const lastName = (user as any)?.lastName || (user as any)?.fullName?.split(" ").slice(1).join(" ") || "";
  const initials = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();
  const balanceAmount = (balance as any)?.balance || 0;

  const mainItems = [
    { icon: Home, label: "Accueil", href: "/", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", testId: "menu-home" },
    { icon: Briefcase, label: "Travail", href: "/work", color: "#10b981", bg: "rgba(16,185,129,0.12)", testId: "button-new-work" },
    { icon: CreditCard, label: "Transactions", href: "/transactions", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", testId: "button-transactions" },
    { icon: TrendingUp, label: "Statistiques", href: "/summary", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", testId: "button-statistics" },
    { icon: Users, label: "Mon équipe", href: "/team", color: "#06b6d4", bg: "rgba(6,182,212,0.12)", testId: "button-team" },
  ];

  const secondaryItems = [
    { icon: Wallet, label: "Retrait", href: "/withdrawal", color: "#f97316", bg: "rgba(249,115,22,0.12)", testId: "button-withdrawal" },
    { icon: User, label: "Profil", href: "/profile", color: "#64748b", bg: "rgba(100,116,139,0.12)", testId: "button-profile" },
    { icon: HelpCircle, label: "Assistance", href: "/assistance", color: "#ec4899", bg: "rgba(236,72,153,0.12)", testId: "button-help" },
    { icon: Code2, label: "API Agrégateur", href: "/api-agregateur", color: "#6366f1", bg: "rgba(99,102,241,0.12)", testId: "button-api-agregateur" },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
          data-testid="menu-overlay"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto`}
        style={{
          width: "300px",
          background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        }}
        data-testid="hamburger-menu"
      >
        {/* Header — User Profile */}
        <div className="px-5 pt-12 pb-6 relative" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {/* Gold accent top line */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)" }} />

          {/* Avatar + Name */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                {initials}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{ background: isActivated ? "#10b981" : "#f59e0b", borderColor: "#0f172a" }}
              >
                {isActivated
                  ? <Shield size={10} className="text-white" />
                  : <Star size={10} className="text-white" />
                }
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-base truncate" data-testid="text-menu-user-name">
                {firstName} {lastName}
              </div>
              <div
                className="text-xs font-semibold mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={isActivated
                  ? { background: "rgba(16,185,129,0.15)", color: "#34d399" }
                  : { background: "rgba(245,158,11,0.15)", color: "#fbbf24" }
                }
              >
                {isActivated ? <Shield size={10} /> : <Star size={10} />}
                {isActivated ? "Compte Actif" : "Compte Inactif"}
              </div>
            </div>
          </div>

          {/* Balance Card */}
          <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.08))", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            <div className="absolute top-2 right-3 opacity-10">
              <Star size={40} className="text-yellow-400 fill-yellow-400" />
            </div>
            <div className="text-xs font-semibold mb-1" style={{ color: "rgba(251,191,36,0.7)", letterSpacing: "0.1em" }}>
              SOLDE DISPONIBLE
            </div>
            <div className="text-2xl font-black text-white">
              {balanceAmount.toLocaleString("fr-FR")} <span className="text-base font-bold" style={{ color: "#fbbf24" }}>FCFA</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-4 py-4">
          {/* Main items */}
          <div className="text-xs font-bold mb-3 px-1" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>
            NAVIGATION
          </div>
          <div className="space-y-1">
            {mainItems.map((item) => (
              <Link key={item.label} href={item.href} onClick={onClose} data-testid={item.testId}>
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 active:scale-95 group"
                  style={{ background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = item.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: item.bg }}
                  >
                    <item.icon size={18} style={{ color: item.color }} strokeWidth={2} />
                  </div>
                  <span className="flex-1 font-semibold text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {item.label}
                  </span>
                  <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
                </div>
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="my-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />

          {/* Secondary items */}
          <div className="text-xs font-bold mb-3 px-1" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>
            SERVICES
          </div>
          <div className="space-y-1">
            {secondaryItems.map((item) => (
              <Link key={item.label} href={item.href} onClick={onClose} data-testid={item.testId}>
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 active:scale-95"
                  style={{ background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = item.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: item.bg }}
                  >
                    <item.icon size={18} style={{ color: item.color }} strokeWidth={2} />
                  </div>
                  <span className="flex-1 font-semibold text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {item.label}
                  </span>
                  <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
                </div>
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="my-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 active:scale-95"
            style={{ background: "rgba(239,68,68,0.08)" }}
            data-testid="button-logout"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <LogOut size={18} style={{ color: "#f87171" }} strokeWidth={2} />
            </div>
            <span className="font-semibold text-sm" style={{ color: "#f87171" }}>Se déconnecter</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 mt-2 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>SIKA TEXTE • Plateforme Européenne</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={8} className="fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
