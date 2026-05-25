import {
  LogOut, TrendingUp, HelpCircle, Wallet, Home,
  X, ChevronRight, Shield, Settings, Smartphone
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatFCFA } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/1764438802465_1773510898637.jpg";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const MENU_ITEMS = [
  {
    icon: Home,
    label: "Accueil",
    desc: "Page principale",
    href: "/",
    from: "#1d4ed8",
    to: "#3b82f6",
  },
  {
    icon: Wallet,
    label: "Retrait Mobile Money",
    desc: "Retirer vos gains",
    href: "/withdrawal",
    from: "#059669",
    to: "#34d399",
  },
  {
    icon: TrendingUp,
    label: "À propos",
    desc: "Comment ça fonctionne",
    href: "/summary",
    from: "#7c3aed",
    to: "#a855f7",
  },
  {
    icon: HelpCircle,
    label: "Assistance",
    desc: "Contactez le support",
    href: "/assistance",
    from: "#0891b2",
    to: "#67e8f9",
  },
  {
    icon: Settings,
    label: "Mon profil",
    desc: "Modifier mes informations",
    href: "/profile",
    from: "#be185d",
    to: "#f472b6",
  },
];

export default function HamburgerMenu({ isOpen, onClose, user }: HamburgerMenuProps) {
  const { data: balance } = useQuery({ queryKey: ["/api/user/balance"] });
  const { toast } = useToast();

  const handleInstall = async () => {
    const prompt = (window as any).__pwaPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        (window as any).__pwaPrompt = null;
        toast({ title: "Application installée !", description: "SIKA TEXTE est sur votre écran d'accueil" });
      }
    } else {
      toast({
        title: "Installer l'application",
        description: "Dans votre navigateur, appuyez sur ⋮ puis « Ajouter à l'écran d'accueil »",
      });
    }
    onClose();
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (response.ok) window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "Utilisateur";
  const lastName  = user?.lastName  || user?.fullName?.split(" ").slice(1).join(" ") || "";
  const initials  = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();
  const isActivated = user?.isActivated || false;
  const balanceAmt  = (balance as any)?.balance || 0;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
          data-testid="menu-overlay"
        />
      )}

      {/* ────────────────────────────────────────────
          BOTTOM SHEET — monte du bas
      ──────────────────────────────────────────── */}
      <div
        data-testid="hamburger-menu"
        className={`fixed left-0 right-0 bottom-0 z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          background: "#fff",
          borderRadius: "28px 28px 0 0",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Ligne du haut : poignée + fermer ── */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img src={logoPath} alt="logo" className="w-5 h-5 rounded-md object-cover" />
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Sika Texte</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded-full bg-gray-200 mx-auto" />
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "#f1f5f9" }}
            >
              <X size={17} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* ── En-tête utilisateur ── */}
        <div className="px-5 pt-1 pb-4 flex-shrink-0">
          {/* Avatar + nom + statut */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #7c3aed)" }}
            >
              {user?.profileImageUrl
                ? <img src={user.profileImageUrl} alt="profil" className="w-full h-full rounded-2xl object-cover" />
                : initials
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-black text-base truncate" data-testid="text-menu-user-name">
                {firstName} {lastName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield size={10} className={isActivated ? "text-green-500" : "text-amber-500"} />
                <span className={`text-[10px] font-bold ${isActivated ? "text-green-600" : "text-amber-600"}`}>
                  {isActivated ? "Compte actif" : "Compte inactif"}
                </span>
              </div>
            </div>
          </div>

          {/* Solde — pleine largeur en dessous */}
          <div
            className="w-full px-4 py-3 rounded-2xl flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)" }}
          >
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Solde disponible</p>
            <p className="text-white font-black text-lg">{formatFCFA(balanceAmt)}</p>
          </div>
        </div>

        {/* Séparateur */}
        <div className="h-px bg-gray-100 mx-5 flex-shrink-0" />

        {/* ── Liste des options ── */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {MENU_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onClose}
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl active:scale-[0.98] transition-all cursor-pointer"
                style={{ background: "#f8fafc" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${item.from}, ${item.to})` }}
                >
                  <item.icon size={18} className="text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 font-bold text-sm">{item.label}</p>
                  <p className="text-gray-400 text-[11px]">{item.desc}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
              </div>
            </Link>
          ))}

          {/* Télécharger l'application */}
          <button
            onClick={handleInstall}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl active:scale-[0.98] transition-all text-left"
            style={{ background: "#f8fafc" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
            >
              <Smartphone size={18} className="text-white" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-800 font-bold text-sm">Télécharger l'application</p>
              <p className="text-gray-400 text-[11px]">Ajouter à l'écran d'accueil</p>
            </div>
            <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
          </button>
        </div>

        {/* ── Déconnexion ── */}
        <div className="px-5 pt-2 pb-6 flex-shrink-0">
          <button
            onClick={handleLogout}
            data-testid="button-logout"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #fef2f2, #fee2e2)", color: "#dc2626" }}
          >
            <LogOut size={16} strokeWidth={2.5} />
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}
