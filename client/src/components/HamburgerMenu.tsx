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
  Code2
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

  // Navigate to assistance page
  const handleAssistance = () => {
    window.location.href = '/assistance';
    onClose();
  };

  const handleWithdrawal = () => {
    const currentBalance = (balance as any)?.balance || 0;
    const canWithdraw = currentBalance >= 2000;
    
    if (!canWithdraw) {
      toast({
        title: "Retrait non disponible",
        description: "Atteignez le minimum de 2000 FCFA d'abord",
        variant: "destructive"
      });
      return;
    }
    window.location.href = '/withdrawal';
    onClose();
  };

  const currentBalance = (balance as any)?.balance || 0;
  const canWithdraw = currentBalance >= 2000;

  const secondaryItems = [
    {
      icon: Wallet,
      label: "Retrait",
      action: handleWithdrawal,
      testId: "button-withdrawal",
      highlight: false,
      badge: canWithdraw ? "Disponible" : "Min. 2000 FCFA",
      badgeVariant: canWithdraw ? "success" : "warning" as "success" | "warning",
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
    {
      icon: () => <span className="text-lg font-bold">•••</span>,
      label: "Plus",
      href: "/summary",
      testId: "button-summary",
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
              <div className="font-bold text-lg" data-testid="text-menu-user-name">
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
              {formatFCFA((balance as any)?.balance || 0)}
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
            {secondaryItems.map((item: any) => (
              item.action ? (
                <Button
                  key={item.label}
                  variant="ghost"
                  className="w-full justify-start p-4 rounded-lg transition-colors h-auto hover:bg-slate-100"
                  onClick={item.action}
                  data-testid={item.testId}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <item.icon className="text-slate-600" size={18} />
                      </div>
                      <span className="font-medium text-slate-700">{item.label}</span>
                    </div>
                    {item.badge && (
                      <Badge 
                        variant={item.badgeVariant === "success" ? "default" : "secondary"}
                        className={
                          item.badgeVariant === "success" 
                            ? "bg-green-500 text-white text-xs" 
                            : "bg-orange-100 text-orange-700 text-xs"
                        }
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </Button>
              ) : (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  className="w-full justify-start p-4 rounded-lg transition-colors h-auto hover:bg-slate-100"
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
              )
            ))}
          </div>

        </nav>
      </div>
    </>
  );
}
