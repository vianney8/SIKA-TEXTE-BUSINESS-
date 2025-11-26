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
  ChevronDown,
  Code2,
  TrendingUp,
  Users,
  FileText,
  MoreHorizontal
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatFCFA } from "@/lib/utils";
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
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      window.location.href = "/";
    }
  };

  const menuItems = [
    {
      icon: Lock,
      label: "Activer le compte",
      href: "/activation",
      testId: "button-activation",
    },
    {
      icon: Briefcase,
      label: "Nouveau travail",
      href: "/work",
      testId: "button-new-work",
    },
    {
      icon: CreditCard,
      label: "Transactions",
      href: "/transactions",
      testId: "button-transactions",
    },
    {
      icon: TrendingUp,
      label: "Statistiques",
      href: "/summary",
      testId: "button-statistics",
    },
    {
      icon: Settings,
      label: "Profil",
      href: "/profile",
      testId: "button-profile",
    },
  ];

  const handleAssistance = () => {
    window.location.href = '/assistance';
    onClose();
  };

  const handleWithdrawal = () => {
    window.location.href = '/withdrawal';
    onClose();
  };

  const secondaryItems = [
    {
      icon: Wallet,
      label: "Retrait",
      action: handleWithdrawal,
      testId: "button-withdrawal",
      highlight: false,
    },
    {
      icon: Users,
      label: "Mon équipe",
      href: "/team",
      testId: "button-team",
    },
    {
      icon: HelpCircle,
      label: "Assistance",
      action: handleAssistance,
      testId: "button-help",
    },
    {
      icon: Code2,
      label: "API Agrégateur",
      href: "/api-agregateur",
      testId: "button-api-agregateur",
    },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={onClose}
          data-testid="menu-overlay"
        />
      )}
      
      <div 
        className={`fixed top-0 left-0 w-80 h-full bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="hamburger-menu"
      >
        <div className="gradient-bg text-primary-foreground p-6">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="w-16 h-16 border-2 border-white/20 shadow-lg">
              <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">
                {user?.firstName && user?.lastName ? `${user.firstName[0]}${user.lastName[0]}` : user?.fullName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-bold text-lg" data-testid="text-menu-user-name">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.fullName || "Utilisateur"}
              </div>
              <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-white/20">
                NOUVEAU
              </Badge>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl p-4 text-center shadow-md">
            <div className="text-2xl font-bold text-white">
              {formatFCFA((balance as any)?.balance || 0)}
            </div>
            <div className="text-white/90 text-sm font-medium">Solde disponible</div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-200px)]">
          {menuItems.map((item) => (
            <Button
              key={item.label}
              asChild
              variant="ghost"
              className="w-full justify-start p-4 rounded-xl transition-all duration-200 h-auto hover:bg-blue-50 hover:shadow-sm active:scale-95"
              onClick={onClose}
              data-testid={item.testId}
            >
              <Link href={item.href}>
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                    <item.icon className="text-primary" size={20} strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-slate-700">{item.label}</span>
                </div>
              </Link>
            </Button>
          ))}
          
          <div className="pt-4 border-t border-slate-200 mt-4">
            {secondaryItems.map((item) => (
              item.action ? (
                <Button
                  key={item.label}
                  variant="ghost"
                  className="w-full justify-start p-4 rounded-xl transition-all duration-200 h-auto hover:bg-purple-50 hover:shadow-sm active:scale-95"
                  onClick={item.action}
                  data-testid={item.testId}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center">
                      <item.icon className="text-purple-600" size={20} strokeWidth={2} />
                    </div>
                    <span className="font-semibold text-slate-700">{item.label}</span>
                  </div>
                </Button>
              ) : (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  className="w-full justify-start p-4 rounded-xl transition-all duration-200 h-auto hover:bg-purple-50 hover:shadow-sm active:scale-95"
                  onClick={onClose}
                  data-testid={item.testId}
                >
                  <Link href={item.href}>
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center">
                        <item.icon className="text-purple-600" size={20} strokeWidth={2} />
                      </div>
                      <span className="font-semibold text-slate-700">{item.label}</span>
                    </div>
                  </Link>
                </Button>
              )
            ))}
          </div>

          <Button
            onClick={handleLogout}
            className="w-full mt-6 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors"
            data-testid="button-logout"
          >
            <LogOut size={18} />
            Se déconnecter
          </Button>
        </nav>
      </div>
    </>
  );
}
