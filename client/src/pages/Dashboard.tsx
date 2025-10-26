import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import HamburgerMenu from "@/components/HamburgerMenu";
import BottomNavigation from "@/components/BottomNavigation";
import TransactionCard from "@/components/TransactionCard";
import TestimonialsSlider from "@/components/TestimonialsSlider";
import MiddleNotification from "@/components/MiddleNotification";
import WhatsAppNotification from "@/components/WhatsAppNotification";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, ArrowUpRight, Wallet, Users } from "lucide-react";
import { formatFCFA } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAppSetting } from "@/hooks/useAppSettings";
import { FaWhatsapp, FaTelegram } from "react-icons/fa";

export default function Dashboard() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: whatsappSupervisor } = useAppSetting('whatsapp_supervisor');
  const { data: telegramSupervisor } = useAppSetting('telegram_supervisor');
  
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Notification WhatsApp à chaque chargement

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
    // Check if user already did pointage today
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
    
    // Generate random positive bonus between 300-800 FCFA
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
          // Auto-update balance and transactions without reload
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
      bgColor: "bg-blue-100",
      iconColor: "text-primary",
      testId: "button-transfer",
    },
    {
      icon: Wallet,
      label: "Retrait",
      href: "/withdrawal",
      bgColor: "bg-orange-100",
      iconColor: "text-accent",
      testId: "button-withdrawal",
    },
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "pointage":
        return "fas fa-check-circle";
      case "transfer":
        return "fas fa-exchange-alt";
      case "recharge":
        return "fas fa-plus";
      case "payment":
        return "fas fa-shopping-cart";
      default:
        return "fas fa-circle";
    }
  };

  const getTransactionIconBg = (type: string) => {
    switch (type) {
      case "deposit":
      case "pointage":
        return "bg-yellow-100";
      case "transfer":
        return "bg-blue-100";
      case "recharge":
        return "bg-orange-100";
      case "payment":
        return "bg-blue-100";
      default:
        return "bg-gray-100";
    }
  };

  const getTransactionIconColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "pointage":
        return "text-yellow-600";
      case "transfer":
        return "text-primary";
      case "recharge":
        return "text-accent";
      case "payment":
        return "text-primary";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Payé</span>;
      case "pending":
        return <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">En attente</span>;
      case "failed":
        return <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Échoué</span>;
      default:
        return <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">Inconnu</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
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

      <main className="pb-20">
        <div className="p-6">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {actionButtons.map((button) => (
              <Button
                key={button.label}
                asChild
                variant="ghost"
                className="bg-white rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow h-auto flex-col space-y-3"
                data-testid={button.testId}
              >
                <a href={button.href}>
                  <div className={`w-12 h-12 ${button.bgColor} rounded-full flex items-center justify-center`}>
                    <button.icon className={`${button.iconColor} text-lg`} />
                  </div>
                  <div className="text-center font-medium text-sm">{button.label}</div>
                </a>
              </Button>
            ))}
          </div>

          {/* Social Media Icons and Telegram Button */}
          <div className="mb-8 text-center">
            {/* Social Media Links */}
            <div className="flex justify-center space-x-4 mb-4">
              <a href="#" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <i className="fab fa-facebook-f text-white text-sm"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-sky-400 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <i className="fab fa-twitter text-white text-sm"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <i className="fab fa-youtube text-white text-sm"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <i className="fab fa-instagram text-white text-sm"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <i className="fab fa-linkedin text-white text-sm"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <i className="fab fa-whatsapp text-white text-sm"></i>
              </a>
            </div>
            
            {/* Telegram Group Button */}
            <a
              href={telegramSupervisor?.startsWith('https://') 
                ? telegramSupervisor 
                : `https://t.me/${telegramSupervisor || 'SIKAcustomer_service'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-[#0088cc] text-white px-6 py-3 rounded-lg hover:bg-[#0077b3] transition-colors shadow-md"
              data-testid="button-telegram-group"
            >
              <FaTelegram className="text-xl" />
              <span className="font-medium">Rejoindre notre groupe Telegram</span>
            </a>
          </div>

          {/* Central Notification Banner */}
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg border-0 overflow-hidden">
            <div className="p-6 text-center relative">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2">SIKA TEXTE BUSINESS</h2>
                <p className="text-blue-100 text-lg">Plateforme Européenne</p>
              </div>
            </div>
          </Card>

          {/* Testimonials Section */}
          <TestimonialsSlider />
        </div>
      </main>

      <BottomNavigation currentPage="home" />
      <MiddleNotification />
      
      {/* WhatsApp Floating Button */}
      <a
        href={whatsappSupervisor?.startsWith('+') 
          ? `https://wa.me/${whatsappSupervisor.replace(/[^0-9]/g, '')}` 
          : whatsappSupervisor?.startsWith('https://') 
            ? whatsappSupervisor 
            : `https://wa.me/${whatsappSupervisor || '639072914078'}`}
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
        data-testid="button-whatsapp-float"
      >
        <div 
          className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl hover:scale-110 transition-all"
          style={{
            boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)'
          }}
        >
          <FaWhatsapp className="text-white text-3xl" />
        </div>
      </a>
    </div>
  );
}
