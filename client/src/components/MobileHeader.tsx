import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, Bell, Eye, EyeOff, Plus, User } from "lucide-react";
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
          <Menu size={24} strokeWidth={3} />
        </Button>
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 border-2 border-white/30">
            <AvatarImage src={user?.profileImageUrl} alt={user?.fullName || 'Utilisateur'} />
            <AvatarFallback className="bg-white/20 text-white text-xs">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User size={16} />}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm opacity-90 font-bold" data-testid="text-username">
            {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.fullName || 'Utilisateur'}
          </div>
        </div>
        <Button 
          asChild
          variant="ghost" 
          size="sm"
          className="text-primary-foreground hover:bg-white/10"
          data-testid="button-notifications"
        >
          <Link href="/transactions">
            <Bell size={20} />
          </Link>
        </Button>
      </div>

      {/* Balance Display */}
      <div className="px-6 pb-6">
        <div className="text-center">
          <div className="flex items-center justify-center text-3xl font-bold mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="text-primary-foreground hover:bg-white/10 p-1 mr-3"
              data-testid="button-toggle-balance"
            >
              {isBalanceVisible ? <Eye className="text-lg" /> : <EyeOff className="text-lg" />}
            </Button>
            <span data-testid="text-balance">
              {isBalanceVisible ? formatFCFA(balance) : "••••••"}
            </span>
          </div>
          <Button 
            onClick={onPointage}
            className="bg-accent text-accent-foreground px-8 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            data-testid="button-pointage"
          >
            <Plus className="mr-2" size={16} />
            Pointage
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
