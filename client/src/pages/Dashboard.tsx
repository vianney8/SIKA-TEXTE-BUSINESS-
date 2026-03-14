import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import HamburgerMenu from "@/components/HamburgerMenu";
import BottomNavigation from "@/components/BottomNavigation";
import MiddleNotification from "@/components/MiddleNotification";
import TestimonialsSlider from "@/components/TestimonialsSlider";
import { useToast } from "@/hooks/use-toast";
import { useAppSetting } from "@/hooks/useAppSettings";
import { FaTelegram } from "react-icons/fa";
import { Link } from "wouter";
import { Zap, Users, ChevronRight, TrendingUp, Clock, Briefcase, Star, Gift, CreditCard, HelpCircle } from "lucide-react";

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
          toast({ title: "✅ Pointage réussi !", description: `+${data.amount} FCFA ajoutés à votre solde` });
        } catch {
          localStorage.setItem(`lastPointage_${userId}`, today);
          toast({ title: "✅ Pointage réussi !", description: "Bonus ajouté à votre solde" });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      } else {
        toast({ title: "Déjà effectué", description: "Revenez demain pour votre prochain pointage", variant: "destructive" });
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

      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} user={user} />

      <main className="pb-28">

        {/* ── Bloc pointage quotidien animé ───────────────────────── */}
        <div className="px-4 pt-4">
          <button
            onClick={handlePointage}
            data-testid="button-pointage"
            className="w-full rounded-3xl overflow-hidden relative active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 45%, #ec4899 100%)" }}
          >
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="relative flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Zap size={22} className="text-yellow-300" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-base leading-tight">Pointage quotidien</p>
                  <p className="text-purple-200 text-xs mt-0.5">Gagnez entre 300 – 800 FCFA / jour</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1.5 rounded-full shadow-md">
                <Star size={11} fill="currentColor" />
                Bonus
              </div>
            </div>
          </button>
        </div>

        {/* ── Cartes rapides (6 icônes) ────────────────────────────── */}
        <div className="px-4 mt-3 grid grid-cols-3 gap-3">
          <Link href="/work">
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 text-center cursor-pointer hover:shadow-md active:scale-95 transition-all">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Briefcase size={18} className="text-blue-600" />
              </div>
              <p className="text-gray-800 font-semibold text-xs">Travaux</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Corriger</p>
            </div>
          </Link>

          <Link href="/transactions">
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 text-center cursor-pointer hover:shadow-md active:scale-95 transition-all">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Clock size={18} className="text-emerald-600" />
              </div>
              <p className="text-gray-800 font-semibold text-xs">Historique</p>
              <p className="text-gray-400 text-[10px] mt-0.5">{transactionCount} opérat.</p>
            </div>
          </Link>

          <Link href="/team">
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 text-center cursor-pointer hover:shadow-md active:scale-95 transition-all">
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users size={18} className="text-violet-600" />
              </div>
              <p className="text-gray-800 font-semibold text-xs">Équipe</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Parrainer</p>
            </div>
          </Link>

          <Link href="/withdrawal">
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 text-center cursor-pointer hover:shadow-md active:scale-95 transition-all">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CreditCard size={18} className="text-orange-500" />
              </div>
              <p className="text-gray-800 font-semibold text-xs">Retrait</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Mobile Money</p>
            </div>
          </Link>

          <Link href="/summary">
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 text-center cursor-pointer hover:shadow-md active:scale-95 transition-all">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <TrendingUp size={18} className="text-indigo-600" />
              </div>
              <p className="text-gray-800 font-semibold text-xs">Stats</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Mes gains</p>
            </div>
          </Link>

          <Link href="/assistance">
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 text-center cursor-pointer hover:shadow-md active:scale-95 transition-all">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <HelpCircle size={18} className="text-teal-600" />
              </div>
              <p className="text-gray-800 font-semibold text-xs">Assistance</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Support</p>
            </div>
          </Link>
        </div>

        {/* ── Sections colorées animées ────────────────────────────── */}
        <div className="px-4 mt-4 space-y-3">

          {/* Travaux disponibles */}
          <Link href="/work">
            <div
              className="rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Travaux disponibles</p>
                  <p className="text-green-100 text-xs">Corrigez des textes et gagnez</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/70" />
            </div>
          </Link>

          {/* Parrainage */}
          <Link href="/team">
            <div
              className="rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Gift size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Parrainage</p>
                  <p className="text-orange-100 text-xs">Invitez et gagnez des bonus</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/70" />
            </div>
          </Link>

          {/* Telegram groupe */}
          <a
            href={telegramGroup || 'https://t.me/+A1QL2HAVBkMyMDA0'}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-telegram-group"
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #0088cc 0%, #229ed9 100%)" }}
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaTelegram size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Groupe Telegram officiel</p>
              <p className="text-blue-100 text-xs">Actualités, annonces et support</p>
            </div>
            <ChevronRight size={18} className="text-white/70 flex-shrink-0" />
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
        <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all"
          style={{ background: "linear-gradient(135deg, #0088cc, #229ed9)" }}>
          <FaTelegram className="text-white text-2xl" />
        </div>
      </a>
    </div>
  );
}
