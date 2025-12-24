import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import HamburgerMenu from "@/components/HamburgerMenu";
import BottomNavigation from "@/components/BottomNavigation";
import TestimonialsSlider from "@/components/TestimonialsSlider";
import MiddleNotification from "@/components/MiddleNotification";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Wallet, Gift, Sparkles, Star, PartyPopper } from "lucide-react";
import { formatFCFA } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAppSetting } from "@/hooks/useAppSettings";
import { FaInstagram, FaTelegram } from "react-icons/fa";

export default function Dashboard() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: instagramSupervisor } = useAppSetting('instagram_supervisor');
  const { data: telegramGroup } = useAppSetting('telegram_group');
  
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { data: balance } = useQuery({
    queryKey: ["/api/user/balance"],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handlePointage = async () => {
    const userId = (user as any)?.id || (user as any)?.sub || 'anonymous';
    const lastPointageDate = localStorage.getItem(`lastPointage_${userId}`);
    const today = new Date().toDateString();
    
    if (lastPointageDate === today) {
      toast({
        title: "Pointage déjà effectué",
        description: "Revenez demain pour votre prochain pointage quotidien",
        variant: "destructive"
      });
      return;
    }
    
    const amount = Math.floor(Math.random() * (800 - 300 + 1)) + 300;
    
    try {
      const response = await fetch("/api/transactions/pointage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
        credentials: "include",
      });
      
      if (response.ok) {
        try {
          const data = await response.json();
          localStorage.setItem(`lastPointage_${userId}`, today);
          toast({
            title: "Pointage réussi !",
            description: `Vous avez gagné ${data.amount} FCFA`
          });
          queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        } catch (error) {
          localStorage.setItem(`lastPointage_${userId}`, today);
          toast({
            title: "Pointage réussi !",
            description: `Votre bonus a été ajouté à votre solde`
          });
          queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        }
      } else {
        try {
          const error = await response.json();
          toast({
            title: "Erreur",
            description: error.message || "Revenez demain pour votre prochain pointage",
            variant: "destructive"
          });
        } catch {
          toast({
            title: "Erreur",
            description: "Revenez demain pour votre prochain pointage",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Pointage error:", error);
    }
  };

  const actionButtons = [
    {
      icon: ArrowUpRight,
      label: "Transfert",
      href: "/transfer",
      gradient: "from-blue-500 to-indigo-600",
      testId: "button-transfer",
    },
    {
      icon: Wallet,
      label: "Retrait",
      href: "/withdrawal",
      gradient: "from-orange-500 to-red-500",
      testId: "button-withdrawal",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* Animated Snow Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-20px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          >
            <div className="w-2 h-2 bg-white/30 rounded-full blur-[1px]" />
          </div>
        ))}
      </div>

      {/* Festive Decorations */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-600/20 to-transparent pointer-events-none" />
      <div className="absolute top-4 left-4 text-4xl animate-bounce" style={{ animationDelay: '0s' }}>🎄</div>
      <div className="absolute top-4 right-4 text-4xl animate-bounce" style={{ animationDelay: '0.5s' }}>🎅</div>
      
      <MobileHeader
        user={user}
        balance={(balance as any)?.balance || 0}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        onPointage={handlePointage}
      />

      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={user}
      />

      <main className="pb-20 relative z-10">
        <div className="p-4">
          {/* Festive Banner */}
          <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-red-500 to-green-600 p-1">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-50" />
            <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 rounded-[22px] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎉</span>
                    <h2 className="text-lg font-bold text-white">Joyeuses Fêtes !</h2>
                    <span className="text-2xl">🎊</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    SIKA TEXTE vous souhaite de merveilleuses fêtes de fin d'année !
                  </p>
                </div>
                <div className="text-5xl ml-4 animate-pulse">🎁</div>
              </div>
              
              {/* Decorative lights */}
              <div className="flex justify-center gap-3 mt-4">
                {['red', 'yellow', 'green', 'blue', 'purple'].map((color, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full animate-pulse`}
                    style={{
                      backgroundColor: color === 'red' ? '#ef4444' : 
                                       color === 'yellow' ? '#eab308' : 
                                       color === 'green' ? '#22c55e' : 
                                       color === 'blue' ? '#3b82f6' : '#a855f7',
                      animationDelay: `${i * 0.2}s`,
                      boxShadow: `0 0 10px ${color === 'red' ? '#ef4444' : 
                                             color === 'yellow' ? '#eab308' : 
                                             color === 'green' ? '#22c55e' : 
                                             color === 'blue' ? '#3b82f6' : '#a855f7'}`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {actionButtons.map((button) => (
              <a
                key={button.label}
                href={button.href}
                className="group"
                data-testid={button.testId}
              >
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 hover:bg-white/15">
                  <div className={`w-14 h-14 bg-gradient-to-br ${button.gradient} rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <button.icon className="text-white w-7 h-7" />
                  </div>
                  <p className="text-white font-semibold text-base">{button.label}</p>
                  <p className="text-slate-400 text-xs mt-1">Cliquez pour accéder</p>
                </div>
              </a>
            ))}
          </div>

          {/* Pointage Button - Festive Style */}
          <Button 
            onClick={handlePointage}
            className="w-full relative overflow-hidden bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-slate-900 font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] mb-6"
            data-testid="button-pointage"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            <div className="flex items-center justify-center gap-2 relative z-10">
              <Gift className="w-5 h-5" />
              <span className="text-lg">Faire du pointage</span>
              <Sparkles className="w-5 h-5" />
            </div>
          </Button>

          {/* Main Card - Festive */}
          <Card className="bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 text-white rounded-3xl shadow-2xl border-0 overflow-hidden mb-6 relative">
            <div className="absolute top-2 right-2 text-3xl">⭐</div>
            <div className="absolute bottom-2 left-2 text-2xl">🌟</div>
            <div className="p-6 text-center relative">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                  <h2 className="text-2xl font-bold text-white">SIKA TEXTE BUSINESS</h2>
                  <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                </div>
                <p className="text-emerald-100 text-lg">Plateforme Européenne</p>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="text-2xl">🎄</span>
                  <span className="text-sm text-emerald-200 font-medium px-3 py-1 bg-white/10 rounded-full">
                    Édition Fêtes 2024
                  </span>
                  <span className="text-2xl">🎄</span>
                </div>
              </div>
            </div>
          </Card>

          {/* New Year Countdown Banner */}
          <div className="bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-md rounded-2xl p-5 mb-6 border border-purple-400/30">
            <div className="flex items-center justify-center gap-3 mb-3">
              <PartyPopper className="w-6 h-6 text-yellow-300" />
              <h3 className="text-white font-bold text-lg">Bonne Année 2025 !</h3>
              <PartyPopper className="w-6 h-6 text-yellow-300" />
            </div>
            <p className="text-center text-purple-100 text-sm">
              Que cette nouvelle année vous apporte succès et prospérité !
            </p>
            <div className="flex justify-center mt-3 gap-1">
              {['🥂', '🎆', '✨', '🎇', '🍾'].map((emoji, i) => (
                <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                  {emoji}
                </span>
              ))}
            </div>
          </div>

          {/* Telegram Button - Festive Style */}
          <div className="mb-6">
            <a
              href={telegramGroup || 'https://t.me/+A1QL2HAVBkMyMDA0'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-4 rounded-2xl hover:from-sky-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              data-testid="button-telegram-group"
            >
              <FaTelegram className="text-2xl" />
              <span className="font-semibold">Rejoindre notre groupe Telegram</span>
            </a>
          </div>

          {/* Testimonials Section */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-4 border border-white/10">
            <h3 className="text-white font-bold text-center mb-4 flex items-center justify-center gap-2">
              <span className="text-xl">💬</span>
              Témoignages de nos membres
              <span className="text-xl">💬</span>
            </h3>
            <TestimonialsSlider />
          </div>
        </div>
      </main>

      <BottomNavigation currentPage="home" />
      <MiddleNotification />
      
      {/* Instagram Floating Button - Festive */}
      <a
        href={`https://www.instagram.com/${instagramSupervisor || 'sikacustomer_service'}`}
        target="_blank"
        rel="noopener noreferrer"
        onMouseDown={handleMouseDown}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 9999,
          transition: isDragging ? 'none' : 'transform 0.2s',
        }}
        className="group"
        data-testid="button-instagram-float"
      >
        <div className="relative">
          <div 
            className="w-16 h-16 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl hover:scale-110 transition-all"
            style={{
              boxShadow: '0 4px 12px rgba(219, 39, 119, 0.4)'
            }}
          >
            <FaInstagram className="text-white text-3xl" />
          </div>
          <div className="absolute -top-1 -right-1 text-lg">🎅</div>
        </div>
      </a>

      {/* CSS for animations */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0.3;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
