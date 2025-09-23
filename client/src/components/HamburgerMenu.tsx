import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, 
  Edit, 
  Lock, 
  LogOut, 
  Briefcase, 
  History, 
  CreditCard, 
  Settings, 
  Wallet, 
  HelpCircle,
  ChevronDown 
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function HamburgerMenu({ isOpen, onClose, user }: HamburgerMenuProps) {
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
        // Rediriger vers la page d'accueil après déconnexion
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // En cas d'erreur, rediriger quand même
      window.location.href = "/";
    }
  };

  const menuItems = [
    {
      icon: Briefcase,
      label: "Nouveau travail",
      href: "/work",
      testId: "button-new-work",
    },
    {
      icon: History,
      label: "Historique des corrections",
      href: "/transactions",
      testId: "button-work-history",
    },
    {
      icon: CreditCard,
      label: "Transactions",
      href: "/transactions",
      testId: "button-transactions",
    },
    {
      icon: Settings,
      label: "Profil",
      href: "/profile",
      testId: "button-profile",
    },
  ];

  const secondaryItems = [
    {
      icon: Wallet,
      label: "Retrait",
      href: "/withdrawal",
      testId: "button-withdrawal",
      highlight: true,
    },
    {
      icon: HelpCircle,
      label: "Assistance",
      href: "/profile",
      testId: "button-help",
    },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={onClose}
          data-testid="menu-overlay"
        />
      )}
      
      {/* Menu */}
      <div 
        className={`fixed top-0 left-0 w-80 h-full bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="hamburger-menu"
      >
        <div className="gradient-bg text-primary-foreground p-6">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="w-16 h-16 border-2 border-white/20">
              <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">
                {user?.firstName && user?.lastName ? `${user.firstName[0]}${user.lastName[0]}` : user?.fullName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold text-lg" data-testid="text-menu-user-name">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.fullName || "Utilisateur"}
              </div>
              <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-white/20">
                NOUVEAU
              </Badge>
            </div>
          </div>
          
          {/* Balance Display */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {((balance as any)?.balance || 0).toLocaleString()} FCFA
            </div>
            <div className="text-white/80 text-sm">Solde disponible</div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {/* Main Menu Items */}
          {menuItems.map((item) => (
            <Button
              key={item.label}
              asChild
              variant="ghost"
              className="w-full justify-start p-4 hover:bg-slate-100 rounded-lg transition-colors h-auto"
              onClick={onClose}
              data-testid={item.testId}
            >
              <Link href={item.href}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <item.icon className="text-slate-600" size={18} />
                  </div>
                  <span className="font-medium text-slate-700">{item.label}</span>
                </div>
              </Link>
            </Button>
          ))}
          
          {/* Secondary Items */}
          <div className="pt-2 space-y-2">
            {secondaryItems.map((item) => (
              <Button
                key={item.label}
                asChild
                variant="ghost"
                className={`w-full justify-start p-4 rounded-lg transition-colors h-auto ${
                  item.highlight 
                    ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200' 
                    : 'hover:bg-slate-100'
                }`}
                onClick={onClose}
                data-testid={item.testId}
              >
                <Link href={item.href}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.highlight ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <item.icon className={item.highlight ? 'text-blue-600' : 'text-slate-600'} size={18} />
                    </div>
                    <span className={`font-medium ${
                      item.highlight ? 'text-blue-700' : 'text-slate-700'
                    }`}>{item.label}</span>
                    {item.label === "Retrait" && (
                      <Badge className="ml-auto bg-orange-100 text-orange-800 text-xs">
                        0
                      </Badge>
                    )}
                  </div>
                </Link>
              </Button>
            ))}
          </div>

          {/* Afficher plus button */}
          <div className="pt-4">
            <Button
              variant="ghost"
              className="w-full justify-between p-4 bg-gradient-to-r from-orange-400 to-green-400 text-white rounded-lg hover:from-orange-500 hover:to-green-500 transition-all"
              data-testid="button-show-more"
            >
              <span className="font-medium">Afficher plus</span>
              <ChevronDown size={16} />
            </Button>
          </div>
          
          {/* Logout */}
          <div className="pt-4 border-t border-slate-200">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start p-4 hover:bg-red-50 text-red-600 rounded-lg transition-colors h-auto"
              data-testid="button-logout"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <LogOut size={18} />
                </div>
                <span className="font-medium">Se déconnecter</span>
              </div>
            </Button>
          </div>
        </nav>
      </div>
    </>
  );
}
