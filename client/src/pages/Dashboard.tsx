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
import { TrendingUp, Clock, ChevronRight, Zap, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppSetting } from "@/hooks/useAppSettings";
import { FaTelegram } from "react-icons/fa";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: telegramSupervisor } = useAppSetting('telegram_supervisor');
  const { data: telegramGroup } = useAppSetting('telegram_group');

  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { data: balance } = useQuery({
    queryKey: ["/api/user/balance"],
  });

  const { data: transactions = [] } = useQuery<any[]>({
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
        } catch {
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

  const transactionCount = Array.isArray(transactions) ? transactions.length : 0;

  return (
    <div className="min-h-screen bg-gray-50">
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

      <main className="pb-24">
        <div className="p-4 space-y-4">
          {/* Pointage quotidien Banner */}
          <Card
            className="rounded-2xl border-0 shadow-md overflow-hidden cursor-pointer active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #a855f7 100%)" }}
            onClick={handlePointage}
            data-testid="button-pointage"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Zap className="text-white" size={20} />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Pointage quotidien</div>
                  <div className="text-purple-200 text-xs">Gagnez entre 300 – 800 FCFA</div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-full shadow">
                <Star size={12} />
                Bonus
              </div>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/transactions">
              <Card className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="text-purple-500" size={18} />
                  </div>
                  <ChevronRight className="text-gray-300" size={16} />
                </div>
                <div className="text-2xl font-bold text-gray-800">{transactionCount}</div>
                <div className="text-gray-400 text-xs mt-1">Historique</div>
              </Card>
            </Link>

            <Link href="/transactions">
              <Card className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="text-yellow-500" size={18} />
                  </div>
                  <ChevronRight className="text-gray-300" size={16} />
                </div>
                <div className="text-2xl font-bold text-gray-800">{transactionCount}</div>
                <div className="text-gray-400 text-xs mt-1">Activité totale</div>
              </Card>
            </Link>
          </div>


          {/* Telegram Group Button */}
          <div className="text-center py-2">
            <a
              href={telegramGroup || 'https://t.me/+A1QL2HAVBkMyMDA0'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-[#0088cc] text-white px-6 py-3 rounded-xl hover:bg-[#0077b3] transition-colors shadow-md"
              data-testid="button-telegram-group"
            >
              <FaTelegram className="text-xl" />
              <span className="font-medium text-sm">Rejoindre notre groupe Telegram</span>
            </a>
          </div>

          {/* Testimonials Section */}
          <TestimonialsSlider />
        </div>
      </main>

      <BottomNavigation currentPage="home" />
      <MiddleNotification />

      {/* Telegram Floating Button */}
      <a
        href={telegramSupervisor || 'https://t.me/servicepay_support'}
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
        data-testid="button-telegram-float"
      >
        <div
          className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl hover:scale-110 transition-all"
          style={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}
        >
          <FaTelegram className="text-white text-3xl" />
        </div>
      </a>
    </div>
  );
}
