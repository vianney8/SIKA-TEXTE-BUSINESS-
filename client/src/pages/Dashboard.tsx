import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import HamburgerMenu from "@/components/HamburgerMenu";
import BottomNavigation from "@/components/BottomNavigation";
import TestimonialsSlider from "@/components/TestimonialsSlider";
import MiddleNotification from "@/components/MiddleNotification";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight, Wallet, Zap, Users, ChevronRight,
  TrendingUp, Clock, Star, Sparkles
} from "lucide-react";
import { formatFCFA } from "@/lib/utils";
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

  const { data: balance } = useQuery({ queryKey: ["/api/user/balance"] });
  const { data: transactions = [] } = useQuery({ queryKey: ["/api/transactions"] });

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
          toast({ title: "Pointage réussi !", description: `Vous avez gagné ${data.amount} FCFA` });
          queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        } catch {
          localStorage.setItem(`lastPointage_${userId}`, today);
          toast({ title: "Pointage réussi !", description: "Votre bonus a été ajouté à votre solde" });
          queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        }
      } else {
        try {
          const error = await response.json();
          toast({ title: "Erreur", description: error.message || "Revenez demain pour votre prochain pointage", variant: "destructive" });
        } catch {
          toast({ title: "Erreur", description: "Revenez demain pour votre prochain pointage", variant: "destructive" });
        }
      }
    } catch (error) {
      console.error("Pointage error:", error);
    }
  };

  const txCount = (transactions as any[]).length;
  const completedTx = (transactions as any[]).filter((t: any) => t.status === 'completed').length;

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Dépôt';
      case 'pointage': return 'Pointage';
      case 'transfer': return 'Transfert';
      case 'recharge': return 'Recharge';
      case 'payment': return 'Paiement';
      case 'withdrawal': return 'Retrait';
      case 'activation': return 'Activation';
      default: return type;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit': case 'pointage': case 'activation': return { bg: '#10b981', light: 'rgba(16,185,129,0.12)', icon: '↑' };
      case 'transfer': return { bg: '#6366f1', light: 'rgba(99,102,241,0.12)', icon: '⇄' };
      case 'recharge': return { bg: '#f59e0b', light: 'rgba(245,158,11,0.12)', icon: '+' };
      case 'withdrawal': return { bg: '#ef4444', light: 'rgba(239,68,68,0.12)', icon: '↓' };
      default: return { bg: '#64748b', light: 'rgba(100,116,139,0.12)', icon: '•' };
    }
  };

  const recentTx = (transactions as any[]).slice(0, 4);

  return (
    <div className="min-h-screen" style={{ background: '#f0f4ff' }}>
      <MobileHeader
        user={user}
        balance={(balance as any)?.balance || 0}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        onPointage={handlePointage}
      />

      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} user={user} />

      <main className="pb-24">

        {/* Quick Actions */}
        <div className="px-4 mt-4 mb-5">
          <div className="grid grid-cols-2 gap-3">
            {/* Transfert */}
            <Link href="/transfer">
              <div className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-95 transition-transform shadow-sm"
                style={{ background: 'white', border: '1.5px solid #e2e8f0' }}
                data-testid="button-transfer">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <ArrowUpRight size={20} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#1e293b' }}>Transfert</p>
                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>Envoyer</p>
                </div>
              </div>
            </Link>

            {/* Retrait */}
            <Link href="/withdrawal">
              <div className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-95 transition-transform shadow-sm"
                style={{ background: 'white', border: '1.5px solid #e2e8f0' }}
                data-testid="button-withdrawal">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <Wallet size={20} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#1e293b' }}>Retrait</p>
                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>Retirer</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Pointage Button */}
        <div className="px-4 mb-5">
          <button
            onClick={handlePointage}
            className="w-full rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-transform shadow-md"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            data-testid="button-pointage"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-sm">Pointage quotidien</p>
                <p className="text-white/70 text-[11px]">Gagnez entre 300 – 800 FCFA</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
              <Sparkles size={12} className="text-yellow-300" />
              <span className="text-white text-xs font-bold">Bonus</span>
            </div>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="px-4 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'white' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <TrendingUp size={16} style={{ color: '#6366f1' }} />
                </div>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
              <p className="text-2xl font-black text-slate-800">{completedTx}</p>
              <p className="text-slate-500 text-xs mt-0.5">Transactions</p>
            </div>

            <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'white' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <Clock size={16} style={{ color: '#f59e0b' }} />
                </div>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
              <p className="text-2xl font-black text-slate-800">{txCount}</p>
              <p className="text-slate-500 text-xs mt-0.5">Total opérations</p>
            </div>
          </div>
        </div>

        {/* Premium Banner */}
        <div className="px-4 mb-5">
          <div className="rounded-3xl p-5 relative overflow-hidden shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a1f5e 60%, #2d1b69 100%)' }}>
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 text-xs font-bold tracking-widest uppercase">Plateforme Européenne</span>
              </div>
              <h2 className="text-white text-xl font-black leading-tight mb-1">
                SIKA TEXTE
              </h2>
              <p className="text-white/60 text-xs leading-relaxed">
                Corrigez des phrases et gagnez jusqu'à <span className="text-emerald-400 font-bold">7 800 FCFA/jour</span>
              </p>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {recentTx.length > 0 && (
          <div className="px-4 mb-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Transactions récentes</h3>
              <Link href="/transactions">
                <span className="text-indigo-600 text-xs font-semibold">Voir tout →</span>
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'white' }}>
              {recentTx.map((tx: any, index: number) => {
                const col = getTransactionColor(tx.type);
                const isPositive = ['deposit', 'pointage', 'activation', 'recharge'].includes(tx.type);
                return (
                  <div key={tx.id || index}
                    className={`flex items-center gap-3 px-4 py-3.5 ${index < recentTx.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-base font-bold flex-shrink-0"
                      style={{ background: col.light, color: col.bg }}>
                      {col.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-semibold text-sm">{getTransactionLabel(tx.type)}</p>
                      <p className="text-slate-400 text-xs truncate">{tx.description || tx.operator || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isPositive ? '+' : '-'}{Math.abs(tx.amount)} FCFA
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('fr-FR') : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Telegram Group CTA */}
        <div className="px-4 mb-5">
          <a
            href={telegramGroup || 'https://t.me/+A1QL2HAVBkMyMDA0'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl p-4 shadow-sm active:scale-95 transition-transform"
            style={{ background: 'white', border: '1.5px solid #e0e7ff' }}
            data-testid="button-telegram-group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#0088cc' }}>
                <FaTelegram className="text-white text-xl" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Groupe Telegram</p>
                <p className="text-slate-400 text-[11px]">Rejoindre la communauté</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </a>
        </div>

        {/* Testimonials */}
        <div className="px-4 mb-5">
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
        data-testid="button-telegram-float"
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #0088cc, #0066aa)',
            boxShadow: '0 6px 20px rgba(0,136,204,0.45)'
          }}>
          <FaTelegram className="text-white text-2xl" />
        </div>
      </a>
    </div>
  );
}
