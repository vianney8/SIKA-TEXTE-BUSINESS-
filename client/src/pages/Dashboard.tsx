import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import HamburgerMenu from "@/components/HamburgerMenu";
import BottomNavigation from "@/components/BottomNavigation";
import TransactionCard from "@/components/TransactionCard";
import TestimonialsSlider from "@/components/TestimonialsSlider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, ArrowUpRight, Wallet, Users } from "lucide-react";
import { formatFCFA } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  // Notification WhatsApp à chaque chargement
  useEffect(() => {
    const showWhatsAppNotification = () => {
      toast({
        title: "📱 Rejoignez notre groupe WhatsApp !",
        description: (
          <div className="space-y-2">
            <p>Restez au courant des derniers événements</p>
            <a 
              href="https://chat.whatsapp.com/HtUYvCOeJArHYLhMcRCsDs?mode=ems_copy_t" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-green-600 underline font-medium"
            >
              Rejoindre le groupe →
            </a>
          </div>
        ),
        duration: 8000,
      });
    };

    const timer = setTimeout(showWhatsAppNotification, 1000);
    return () => clearTimeout(timer);
  }, [toast]);

  const { data: balance } = useQuery({
    queryKey: ["/api/user/balance"],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const handlePointage = async () => {
    // Check if user already did pointage today
    const userId = (user as any)?.id || (user as any)?.sub || 'anonymous';
    const lastPointageDate = localStorage.getItem(`lastPointage_${userId}`);
    const today = new Date().toDateString();
    
    if (lastPointageDate === today) {
      toast({
        title: "Pointage déjà effectué",
        description: "Vous ne pouvez faire qu'un pointage par jour",
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
        localStorage.setItem(`lastPointage_${userId}`, today);
        window.location.reload();
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
            {actionButtons.map((button) => {
              const isWithdrawal = button.label === "Retrait";
              const currentBalance = (balance as any)?.balance || 0;
              const canWithdraw = currentBalance >= 2000;
              
              if (isWithdrawal && !canWithdraw) {
                return (
                  <Button
                    key={button.label}
                    disabled
                    variant="ghost"
                    className="bg-gray-100 rounded-xl p-6 shadow-sm border border-border h-auto flex-col space-y-3 opacity-50"
                    data-testid={button.testId}
                    onClick={() => toast({
                      title: "Retrait non disponible",
                      description: "Minimum requis: 2000 FCFA",
                      variant: "destructive"
                    })}
                  >
                    <div className={`w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center`}>
                      <button.icon className="text-gray-500 text-lg" />
                    </div>
                    <div className="text-center font-medium text-sm text-gray-500">{button.label}</div>
                  </Button>
                );
              }
              
              return (
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
              );
            })}
          </div>

          {/* Recent Transactions */}
          <Card className="bg-white rounded-xl shadow-sm border border-border">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold" data-testid="text-transactions-title">Dernières transactions</h3>
              <Button asChild variant="link" className="text-accent text-sm font-medium p-0" data-testid="button-view-more">
                <a href="/transactions">Voir plus</a>
              </Button>
            </div>

            {(transactions as any[]).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground" data-testid="text-no-transactions">
                Aucune transaction pour le moment
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(transactions as any[]).map((transaction: any) => (
                  <div
                    key={transaction.id}
                    className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${getTransactionIconBg(transaction.type)} rounded-full flex items-center justify-center`}>
                        <i className={`${getTransactionIcon(transaction.type)} ${getTransactionIconColor(transaction.type)}`}></i>
                      </div>
                      <div>
                        <div className="font-medium text-sm" data-testid={`text-transaction-type-${transaction.id}`}>
                          {transaction.type === "deposit" && "Pointage"}
                          {transaction.type === "pointage" && "Pointage"}
                          {transaction.type === "transfer" && "Transfert"}
                          {transaction.type === "recharge" && "Recharge crédit"}
                          {transaction.type === "payment" && "Paiement Marchand"}
                        </div>
                        <div className="text-xs text-muted-foreground" data-testid={`text-transaction-date-${transaction.id}`}>
                          {new Date(transaction.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div 
                        className={`font-semibold ${
                          (transaction.type === "deposit" || transaction.type === "pointage") 
                            ? (parseFloat(transaction.amount) > 0 ? "text-green-600" : "text-red-600")
                            : "text-red-600"
                        }`}
                        data-testid={`text-transaction-amount-${transaction.id}`}
                      >
                        {(transaction.type === "deposit" || transaction.type === "pointage") 
                          ? (parseFloat(transaction.amount) > 0 ? "+" : "-")
                          : "-"}
                        {formatFCFA(Math.abs(parseFloat(transaction.amount)))}
                      </div>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Testimonials Section */}
          <TestimonialsSlider />
        </div>
      </main>

      <BottomNavigation currentPage="home" />
    </div>
  );
}
