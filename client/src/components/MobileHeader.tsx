import { Button } from "@/components/ui/button";
import { Menu, Bell, Eye, Plus } from "lucide-react";

interface MobileHeaderProps {
  user: any;
  balance: number;
  onMenuToggle: () => void;
  onDeposit: () => void;
}

export default function MobileHeader({ user, balance, onMenuToggle, onDeposit }: MobileHeaderProps) {
  return (
    <header className="gradient-bg text-primary-foreground sticky top-0 z-50">
      
      <div className="px-6 py-4 flex justify-between items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onMenuToggle}
          className="text-primary-foreground hover:bg-white/10"
          data-testid="button-menu"
        >
          <Menu size={24} />
        </Button>
        <div className="text-center">
          <div className="text-sm opacity-90">
            {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.fullName || 'Utilisateur'}
          </div>
          <div className="text-sm opacity-75" data-testid="text-username">
            {user?.firstName || user?.fullName?.split(' ')[0] || 'User'}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-primary-foreground hover:bg-white/10"
          data-testid="button-notifications"
        >
          <Bell size={20} />
        </Button>
      </div>

      {/* Balance Display */}
      <div className="px-6 pb-6">
        <div className="text-center">
          <div className="flex items-center justify-center text-3xl font-bold mb-2">
            <Eye className="text-lg mr-3" />
            <span data-testid="text-balance">
              {balance.toLocaleString("fr-FR")}
            </span>
            <span className="ml-2">F.CFA</span>
          </div>
          <Button 
            onClick={onDeposit}
            className="bg-accent text-accent-foreground px-8 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            data-testid="button-deposit"
          >
            <Plus className="mr-2" size={16} />
            Dépôt Sika
          </Button>
        </div>
        <div className="flex justify-between text-xs mt-2 opacity-75">
          <span data-testid="text-account-id">
            {user?.id?.substring(0, 10) || user?.email?.split('@')[0] || 'testuser45'}
          </span>
          <span data-testid="text-last-update">
            {new Date().toLocaleDateString("fr-FR")} {new Date().toLocaleTimeString("fr-FR", { 
              hour: "2-digit", 
              minute: "2-digit" 
            })}
          </span>
        </div>
      </div>
    </header>
  );
}
