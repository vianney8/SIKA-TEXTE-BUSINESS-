import { Button } from "@/components/ui/button";
import { Menu, Bell, Eye, EyeOff, Plus } from "lucide-react";
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
    <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg">
      {/* Top Navigation Bar */}
      <div className="px-4 py-3 flex justify-between items-center backdrop-blur-sm bg-white/5">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onMenuToggle}
          className="text-white hover:bg-white/20 transition-colors"
          data-testid="button-menu"
        >
          <Menu size={24} strokeWidth={2.5} />
        </Button>
        
        <div className="text-center flex-1">
          <div className="text-lg font-black tracking-wider" data-testid="text-username">
            Vj
          </div>
        </div>
        
        <Button 
          asChild
          variant="ghost" 
          size="sm"
          className="text-white hover:bg-white/20 relative transition-colors"
          data-testid="button-notifications"
        >
          <Link href="/transactions">
            <Bell size={22} strokeWidth={2} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
          </Link>
        </Button>
      </div>

      {/* Balance & Action Section */}
      <div className="px-6 py-8 text-center backdrop-blur-sm bg-white/5">
        {/* Balance Display */}
        <div className="mb-5">
          <div className="text-sm font-semibold mb-2 opacity-90">Solde disponible</div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="text-white hover:bg-white/20 p-1 transition-colors"
              data-testid="button-toggle-balance"
            >
              {isBalanceVisible ? (
                <Eye size={20} strokeWidth={2} />
              ) : (
                <EyeOff size={20} strokeWidth={2} />
              )}
            </Button>
            <div className="text-4xl font-black tracking-tight" data-testid="text-balance">
              {isBalanceVisible ? formatFCFA(balance) : "••••••"}
            </div>
          </div>
        </div>

        {/* Earn Points Button */}
        <Button 
          onClick={onPointage}
          className="w-full bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white font-bold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
          data-testid="button-pointage"
        >
          <Plus size={20} className="mr-2" />
          Gagnez vos points
        </Button>

        {/* Footer Info */}
        <div className="flex justify-between text-xs mt-4 opacity-80 font-medium">
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
