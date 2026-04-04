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
import { Zap, ChevronRight, Sparkles, Download, Smartphone } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen]     = useState(false);
  const [pointageDone, setPointageDone] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled]   = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: demoVideoUrl } = useAppSetting("demo_video_url");
  const { data: telegramSupervisor } = useAppSetting('telegram_supervisor');
  const { data: telegramGroup } = useAppSetting('telegram_group');
  const { data: whatsappGroup } = useAppSetting('whatsapp_group');

  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { data: balance } = useQuery({ queryKey: ["/api/user/balance"] });

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

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setInstallPrompt(null);
        toast({ title: "Application installée !", description: "SIKA TEXTE est maintenant sur votre écran d'accueil" });
      }
    } else {
      toast({
        title: "Installer l'application",
        description: "Dans votre navigateur, appuyez sur le menu ⋮ puis 'Ajouter à l'écran d'accueil'",
      });
    }
  };

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

            <div className="relative px-4 py-3.5 flex items-center justify-between gap-3">
              {/* Gauche : icône + texte */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(129,140,248,0.2)" }}>
                  <Sparkles size={16} className="text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm leading-tight">Bonus du jour</p>
                  <p className="text-indigo-300 text-xs">300 – 800 FCFA · Cliquez pour collecter</p>
                </div>
              </div>

              {/* Droite : badge statut */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}>
                  <Zap size={12} className="text-yellow-300" />
                  <span className="text-white text-[11px]">{pointageDone ? "Collecté" : "Collecter"}</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* ══════════════════════════════════════════
            SECTIONS
        ══════════════════════════════════════════ */}
        <div className="px-4 mt-3 space-y-3">

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
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
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

            {/* Installer l'application */}
            {!isInstalled && (
              <button
                onClick={handleInstall}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #1a4fa0, #3b82f6)" }}
                >
                  <Smartphone size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-semibold text-sm">Télécharger l'application</p>
                  <p className="text-gray-400 text-xs">Ajouter à l'écran d'accueil</p>
                </div>
                <div className="flex-shrink-0">
                  <Download size={16} className="text-blue-500" />
                </div>
              </button>
            )}
          </div>

          {/* ══ Vidéo promo ══ */}
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Démonstration</p>
              <p className="text-gray-800 font-bold text-sm">Exemple de retrait</p>
            </div>
            <div className="px-4 pb-4">
              <video
                key={demoVideoUrl || "/promo.mp4"}
                src={demoVideoUrl || "/promo.mp4"}
                controls
                playsInline
                className="w-full rounded-xl"
                style={{ maxHeight: "300px" }}
                onError={(e) => { (e.target as HTMLVideoElement).src = "/promo.mp4"; }}
              />
            </div>
          </div>

          {/* ══ Témoignages ══ */}
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 pt-3 pb-0 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Avis</p>
                <p className="text-gray-800 font-bold text-sm">Ce que disent nos utilisateurs</p>
              </div>
            </div>
            <div className="px-3 pb-3 pt-2">
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
