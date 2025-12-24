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
import { Eye, ArrowUpRight, Wallet, Users, Plus } from "lucide-react";
import { formatFCFA } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAppSetting } from "@/hooks/useAppSettings";
import { FaInstagram } from "react-icons/fa";

export default function Dashboard() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: instagramSupervisor } = useAppSetting('instagram_supervisor');
  
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
          <div className="grid grid-cols-2 gap-4 mb-4">
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

          {/* Earn Points Button */}
          <Button 
            onClick={handlePointage}
            className="w-full bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white font-bold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 mb-8"
            data-testid="button-pointage"
          >
            Faire du pointage
          </Button>

          {/* Central Notification Banner */}
          <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl shadow-lg border-0 overflow-hidden">
            <div className="p-6 text-center relative">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2 text-white">SIKA TEXTE BUSINESS</h2>
                <p className="text-emerald-100 text-lg">Plateforme Européenne</p>
              </div>
            </div>
          </Card>

          {/* Testimonials Section */}
          <TestimonialsSlider />
        </div>
      </main>

      <BottomNavigation currentPage="home" />
      <MiddleNotification />
      
      {/* Instagram Floating Button */}
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
        <div 
          className="w-16 h-16 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl hover:scale-110 transition-all"
          style={{
            boxShadow: '0 4px 12px rgba(219, 39, 119, 0.4)'
          }}
        >
          <FaInstagram className="text-white text-3xl" />
        </div>
      </a>
    </div>
  );
}
