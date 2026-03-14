import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import HamburgerMenu from "@/components/HamburgerMenu";
import BottomNavigation from "@/components/BottomNavigation";
import TestimonialsSlider from "@/components/TestimonialsSlider";
import MiddleNotification from "@/components/MiddleNotification";
import { useToast } from "@/hooks/use-toast";
import { useAppSetting } from "@/hooks/useAppSettings";
import { FaTelegram } from "react-icons/fa";
import { Link } from "wouter";
import { Zap, Users, ChevronRight, TrendingUp, Clock } from "lucide-react";

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

  const { data: balance } = useQuery({ queryKey: ["/api/user/balance"] });
  const { data: transactions = [] } = useQuery<any[]>({ queryKey: ["/api/transactions"] });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
  };
  const handleMouseUp = () => setIsDragging(false);

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
      toast({ title: "Pointage déjà effectué", description: "Revenez demain pour votre prochain pointage", variant: "destructive" });
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
          toast({ title: "Pointage réussi !", description: `Vous avez gagné ${data.amount} FCFA` });
        } catch {
          localStorage.setItem(`lastPointage_${userId}`, today);
          toast({ title: "Pointage réussi !", description: "Votre bonus a été ajouté à votre solde" });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      } else {
        toast({ title: "Erreur", description: "Revenez demain pour votre prochain pointage", variant: "destructive" });
      }
    } catch (error) {
      console.error("Pointage error:", error);
    }
  };

  const transactionCount = Array.isArray(transactions) ? transactions.length : 0;
  const isActivated = (user as any)?.isActivated || false;

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader
        user={user}
        balance={(balance as any)?.balance || 0}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        onPointage={handlePointage}
      />

      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} user={user} />

      <main className="pb-24">

        {/* Activation banner si compte inactif */}
        {!isActivated && (
          <div className="mx-4 mt-4">
            <Link href="/activation">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors active:scale-98">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Zap size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Activez votre compte</p>
                    <p className="text-amber-600 text-xs">Débloquez l'accès complet à la plateforme</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-amber-500 flex-shrink-0" />
              </div>
            </Link>
          </div>
        )}

        <div className="px-4 mt-4 space-y-4">

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                  <TrendingUp size={14} className="text-blue-600" />
                </div>
                <span className="text-gray-400 text-xs font-medium">Transactions</span>
              </div>
              <p className="text-gray-900 font-bold text-2xl">{transactionCount}</p>
              <p className="text-gray-400 text-xs mt-0.5">Total effectuées</p>
            </div>

            <div
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
              onClick={handlePointage}
              data-testid="button-pointage"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Zap size={14} className="text-purple-600" />
                </div>
                <span className="text-gray-400 text-xs font-medium">Pointage</span>
              </div>
              <p className="text-gray-900 font-bold text-lg leading-tight">+300–800</p>
              <p className="text-gray-400 text-xs mt-0.5">FCFA / jour · Cliquer</p>
            </div>
          </div>

          {/* Liens rapides */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Accès rapide</p>
            </div>

            <Link href="/work">
              <div className="px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                    <TrendingUp size={15} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium text-sm">Travaux disponibles</p>
                    <p className="text-gray-400 text-xs">Corriger des textes et gagner</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-300" />
              </div>
            </Link>

            <Link href="/transactions">
              <div className="px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Clock size={15} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium text-sm">Historique</p>
                    <p className="text-gray-400 text-xs">Vos transactions récentes</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-300" />
              </div>
            </Link>

            <Link href="/team">
              <div className="px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
                    <Users size={15} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium text-sm">Mon équipe</p>
                    <p className="text-gray-400 text-xs">Parrainer & gagner des bonus</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-300" />
              </div>
            </Link>
          </div>

          {/* Bouton Telegram groupe */}
          <a
            href={telegramGroup || 'https://t.me/+A1QL2HAVBkMyMDA0'}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-telegram-group"
            className="flex items-center gap-3 bg-[#0088cc] text-white rounded-2xl px-4 py-3.5 hover:bg-[#0077b3] active:scale-95 transition-all shadow-sm"
          >
            <FaTelegram size={22} />
            <div className="flex-1">
              <p className="font-semibold text-sm">Groupe Telegram officiel</p>
              <p className="text-blue-200 text-xs">Actualités, annonces et support</p>
            </div>
            <ChevronRight size={15} className="text-blue-300" />
          </a>

          {/* Témoignages */}
          <TestimonialsSlider />

        </div>
      </main>

      <BottomNavigation currentPage="home" />
      <MiddleNotification />

      {/* Bouton flottant Telegram support */}
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
        data-testid="button-telegram-float"
      >
        <div className="w-14 h-14 bg-[#0088cc] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all">
          <FaTelegram className="text-white text-2xl" />
        </div>
      </a>
    </div>
  );
}
