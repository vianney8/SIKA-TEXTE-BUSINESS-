import { Button } from "@/components/ui/button";
import { User, Edit, Lock, LogOut } from "lucide-react";
import { Link } from "wouter";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function HamburgerMenu({ isOpen, onClose, user }: HamburgerMenuProps) {
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
      icon: User,
      label: "Mon Profil",
      href: "/profile",
      testId: "button-profile",
    },
    {
      icon: Edit,
      label: "Modifier le profil",
      href: "/profile",
      testId: "button-edit-profile",
    },
    {
      icon: Lock,
      label: "Modifier le mot de passe",
      href: "/profile",
      testId: "button-change-password",
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
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <User size={32} />
            </div>
            <div>
              <div className="font-semibold" data-testid="text-menu-user-name">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.fullName || "Utilisateur"}
              </div>
              <div className="text-sm opacity-75" data-testid="text-menu-user-phone">
                {user?.phone || ""}
              </div>
            </div>
          </div>
        </div>
        
        <nav className="p-6">
          <ul className="space-y-4">
            {menuItems.map((item) => (
              <li key={item.label}>
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-start p-3 hover:bg-muted rounded-lg transition-colors"
                  onClick={onClose}
                  data-testid={item.testId}
                >
                  <Link href={item.href}>
                    <item.icon className="text-primary mr-3" size={20} />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              </li>
            ))}
            <li className="pt-4 border-t border-border">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start p-3 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="mr-3" size={20} />
                <span>Se déconnecter</span>
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
