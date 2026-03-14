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
import { FaTelegram, FaWhatsapp } from "react-icons/fa";
import { Link } from "wouter";
import {
  Zap, Users, ChevronRight, TrendingUp, Clock,
  Briefcase, Star, Gift, CreditCard, HelpCircle,
  ArrowRight, Sparkles
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pointageDone, setPointageDone] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: telegramSupervisor } = useAppSetting('telegram_supervisor');
  const { data: telegramGroup } = useAppSetting('telegram_group');
  const { data: whatsappGroup } = useAppSetting('whatsapp_group');

  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { data: balance } = useQuery({ queryKey: ["/api/user/balance"] });
  const { data: transactions = [] } = useQuery<any[]>({ queryKey: ["/api/transactions"] });

  const userId = (user as any)?.id || (user as any)?.sub || 'anonymous';

  useEffect(() => {
    const last = localStorage.getItem(`lastPointage_${userId}`);
    if (last === new Date().toDateString()) setPointageDone(true);
  }, [userId]);

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
    if (pointageDone) {
      toast({ title: "Déjà effectué aujourd'hui", description: "Revenez demain pour votre prochain bonus", variant: "destructive" });
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
          localStorage.setItem(`lastPointage_${userId}`, new Date().toDateString());
          setPointageDone(true);
          toast({ title: "✅ Bonus reçu !", description: `+${data.amount} FCFA crédités sur votre compte` });
        } catch {
          localStorage.setItem(`lastPointage_${userId}`, new Date().toDateString());
          setPointageDone(true);
          toast({ title: "✅ Bonus reçu !", description: "Bonus crédité sur votre compte" });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      } else {
        toast({ title: "Déjà effectué", description: "Revenez demain pour votre bonus", variant: "destructive" });
      }
    } catch (err) { console.error(err); }
  };

  const transactionCount = Array.isArray(transactions) ? transactions.length : 0;

  const quickActions = [
    { href: "/work",        icon: Briefcase,   label: "Travaux",    sub: "Corriger",     from: "#2563eb", to: "#60a5fa" },
    { href: "/withdrawal",  icon: CreditCard,  label: "Retrait",    sub: "Mobile Money", from: "#059669", to: "#34d399" },
    { href: "/team",        icon: Users,        label: "Équipe",     sub: "Parrainer",    from: "#7c3aed", to: "#c084fc" },
    { href: "/transactions",icon: Clock,        label: "Historique", sub: `${transactionCount} opérat.`, from: "#0891b2", to: "#67e8f9" },
    { href: "/summary",     icon: TrendingUp,   label: "Stats",      sub: "Mes gains",    from: "#b45309", to: "#fbbf24" },
    { href: "/assistance",  icon: HelpCircle,   label: "Aide",       sub: "Support",      from: "#be185d", to: "#f472b6" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <MobileHeader
        user={user}
        balance={(balance as any)?.balance || 0}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        onPointage={handlePointage}
      />

      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} user={user} />

      <main className="pb-28">

        {/* ══════════════════════════════════════════
            POINTAGE — carte premium noire
        ══════════════════════════════════════════ */}
        <div className="px-4 pt-2">
          <button
            onClick={handlePointage}
            data-testid="button-pointage"
            className="w-full relative overflow-hidden rounded-[24px] active:scale-[0.97] transition-transform text-left"
            style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)" }}
          >
            {/* Cercles lumineux décoratifs */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30"
              style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-2xl opacity-20"
              style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }} />

            <div className="relative px-5 py-5">
              {/* Top row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(129,140,248,0.2)" }}>
                    <Sparkles size={16} className="text-indigo-300" />
                  </div>
                  <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Bonus du jour</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  pointageDone
                    ? "bg-green-500/20 text-green-300"
                    : "bg-yellow-400/20 text-yellow-300 animate-pulse"
                }`}>
                  {pointageDone ? "✓ Collecté" : "● Disponible"}
                </span>
              </div>

              {/* Montant */}
              <div className="mb-4">
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Gagner entre</p>
                <p className="text-white font-black text-3xl leading-none">300 – 800 <span className="text-indigo-300 text-xl">FCFA</span></p>
                <p className="text-white/40 text-xs mt-1">Cliquez pour collecter votre bonus quotidien</p>
              </div>

              {/* Bouton action */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={12} className="text-yellow-400" fill="#facc15" />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold"
                  style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}>
                  <Zap size={13} className="text-yellow-300" />
                  <span className="text-white">{pointageDone ? "Déjà collecté" : "Collecter maintenant"}</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* ══════════════════════════════════════════
            ACCÈS RAPIDES — scroll horizontal
        ══════════════════════════════════════════ */}
        <div className="mt-5">
          <div className="px-4 mb-3 flex items-center justify-between">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Accès rapide</p>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto pb-1 scrollbar-hide">
            {quickActions.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="flex-shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-transform">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
                    style={{ background: `linear-gradient(135deg, ${item.from}, ${item.to})` }}>
                    <item.icon size={22} className="text-white" strokeWidth={1.8} />
                  </div>
                  <div className="text-center">
                    <p className="text-gray-700 font-semibold text-xs">{item.label}</p>
                    <p className="text-gray-400 text-[9px]">{item.sub}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION PRINCIPALE — cartes premium
        ══════════════════════════════════════════ */}
        <div className="px-4 mt-5 space-y-3">

          {/* Travaux — grande carte premium */}
          <Link href="/work">
            <div className="relative overflow-hidden rounded-[20px] cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)" }}>
              <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
              <div className="absolute bottom-0 right-8 w-20 h-20 rounded-full bg-white/5" />
              <div className="relative p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center">
                      <Briefcase size={16} className="text-white" />
                    </div>
                    <span className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Micro-tâches</span>
                  </div>
                  <p className="text-white font-black text-lg leading-tight">Travaux disponibles</p>
                  <p className="text-blue-200 text-xs mt-1">Corrigez des textes · Gagnez par phrase</p>
                </div>
                <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <ArrowRight size={18} className="text-white" />
                </div>
              </div>
            </div>
          </Link>

          {/* Deux cartes côte à côte */}
          <div className="grid grid-cols-2 gap-3">
            {/* Parrainage */}
            <Link href="/team">
              <div className="relative overflow-hidden rounded-[18px] p-4 cursor-pointer active:scale-[0.97] transition-transform"
                style={{ background: "linear-gradient(135deg, #f97316, #fb923c)" }}>
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <Gift size={17} className="text-white" />
                </div>
                <p className="text-white font-bold text-sm">Parrainage</p>
                <p className="text-orange-100 text-[10px] mt-0.5">Bonus à l'invitation</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-white/70 text-[10px] font-semibold">Voir →</span>
                </div>
              </div>
            </Link>

            {/* Statistiques */}
            <Link href="/summary">
              <div className="relative overflow-hidden rounded-[18px] p-4 cursor-pointer active:scale-[0.97] transition-transform"
                style={{ background: "linear-gradient(135deg, #0f766e, #14b8a6)" }}>
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp size={17} className="text-white" />
                </div>
                <p className="text-white font-bold text-sm">Statistiques</p>
                <p className="text-teal-100 text-[10px] mt-0.5">Suivez vos gains</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-white/70 text-[10px] font-semibold">Voir →</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Communautés */}
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Communauté</p>
            </div>

            <a
              href={telegramGroup || 'https://t.me/+A1QL2HAVBkMyMDA0'}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="button-telegram-group"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #0088cc, #229ed9)" }}>
                <FaTelegram size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-semibold text-sm">Groupe Telegram</p>
                <p className="text-gray-400 text-xs">Actualités et annonces officielles</p>
              </div>
              <ChevronRight size={15} className="text-gray-300" />
            </a>

            <a
              href={whatsappGroup || 'https://whatsapp.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}>
                <FaWhatsapp size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-semibold text-sm">Groupe WhatsApp</p>
                <p className="text-gray-400 text-xs">Rejoignez notre communauté</p>
              </div>
              <ChevronRight size={15} className="text-gray-300" />
            </a>
          </div>

          {/* ══ Témoignages ══ */}
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 pt-4 pb-0">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Avis</p>
              <p className="text-gray-800 font-bold text-base mb-3">Ce que disent nos utilisateurs</p>
            </div>
            <div className="px-4 pb-4">
              <TestimonialsSlider />
            </div>
          </div>

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
