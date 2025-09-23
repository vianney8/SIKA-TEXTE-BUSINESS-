import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import HamburgerMenu from "@/components/HamburgerMenu";
import BottomNavigation from "@/components/BottomNavigation";
import TransactionCard from "@/components/TransactionCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, ArrowUpRight, Wallet, Users } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data: balance } = useQuery({
    queryKey: ["/api/user/balance"],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const handlePointage = async () => {
    // Generate random bonus between 300-800 FCFA (positive or negative)
    const baseAmount = Math.floor(Math.random() * (800 - 300 + 1)) + 300;
    const isNegative = Math.random() < 0.5; // 50% chance for negative
    const amount = isNegative ? -baseAmount : baseAmount;
    
    try {
      const response = await fetch("/api/transactions/pointage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
        credentials: "include",
      });
      
      if (response.ok) {
        window.location.reload(); // Refresh to show updated balance
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
                        {Math.abs(parseFloat(transaction.amount)).toLocaleString()} F.CFA
                      </div>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Testimonials Section */}
          <div className="mt-8">
            <h3 className="font-semibold mb-4 text-center" data-testid="text-testimonials-title">Ce que disent nos utilisateurs</h3>
            <div className="overflow-hidden relative">
              <div className="flex animate-scroll-left space-x-4">
                {/* First set of testimonials */}
                <div className="flex-shrink-0 bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border w-80" data-testid="testimonial-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Aminata Diallo</div>
                      <div className="text-xs text-muted-foreground">Dakar, Sénégal</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">"SIKA TEXTE m'a aidée à gagner 19 500 FCFA par mois. Mes enfants peuvent maintenant aller à l'école privée. Merci !"</p>
                  <div className="flex text-yellow-400 text-xs mt-2">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>

                <div className="flex-shrink-0 bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border w-80" data-testid="testimonial-2">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Koffi Mensah</div>
                      <div className="text-xs text-muted-foreground">Abidjan, Côte d'Ivoire</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">"Excellent système ! J'ai déjà parrainé 5 amis. Les 650 FCFA par phrase corrigée changent vraiment ma vie."</p>
                  <div className="flex text-yellow-400 text-xs mt-2">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>

                <div className="flex-shrink-0 bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border w-80" data-testid="testimonial-3">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Fatoumata Traoré</div>
                      <div className="text-xs text-muted-foreground">Bamako, Mali</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">"Je travaille depuis chez moi tout en m'occupant de mes enfants. SIKA TEXTE est une bénédiction pour les mamans."</p>
                  <div className="flex text-yellow-400 text-xs mt-2">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>

                <div className="flex-shrink-0 bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border w-80" data-testid="testimonial-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Jean-Baptiste Kouakou</div>
                      <div className="text-xs text-muted-foreground">Ouagadougou, Burkina Faso</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">"Paiements automatiques via Mobile Money. Pas de stress, pas de retard. L'équipe SIKA TEXTE est très professionnelle."</p>
                  <div className="flex text-yellow-400 text-xs mt-2">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>

                <div className="flex-shrink-0 bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border w-80" data-testid="testimonial-5">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Mariama Bah</div>
                      <div className="text-xs text-muted-foreground">Conakry, Guinée</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">"Grâce au parrainage, j'ai gagné plus de 50 000 FCFA ce mois-ci. Un grand merci à toute l'équipe !"</p>
                  <div className="flex text-yellow-400 text-xs mt-2">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>

                {/* Duplicate set for seamless loop */}
                <div className="flex-shrink-0 bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border w-80">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Aminata Diallo</div>
                      <div className="text-xs text-muted-foreground">Dakar, Sénégal</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">"SIKA TEXTE m'a aidée à gagner 19 500 FCFA par mois. Mes enfants peuvent maintenant aller à l'école privée. Merci !"</p>
                  <div className="flex text-yellow-400 text-xs mt-2">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>

                <div className="flex-shrink-0 bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border w-80">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Koffi Mensah</div>
                      <div className="text-xs text-muted-foreground">Abidjan, Côte d'Ivoire</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">"Excellent système ! J'ai déjà parrainé 5 amis. Les 650 FCFA par phrase corrigée changent vraiment ma vie."</p>
                  <div className="flex text-yellow-400 text-xs mt-2">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>

                <div className="flex-shrink-0 bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border w-80">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Fatoumata Traoré</div>
                      <div className="text-xs text-muted-foreground">Bamako, Mali</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">"Je travaille depuis chez moi tout en m'occupant de mes enfants. SIKA TEXTE est une bénédiction pour les mamans."</p>
                  <div className="flex text-yellow-400 text-xs mt-2">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>

                <div className="flex-shrink-0 bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border w-80">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Jean-Baptiste Kouakou</div>
                      <div className="text-xs text-muted-foreground">Ouagadougou, Burkina Faso</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">"Paiements automatiques via Mobile Money. Pas de stress, pas de retard. L'équipe SIKA TEXTE est très professionnelle."</p>
                  <div className="flex text-yellow-400 text-xs mt-2">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>

                <div className="flex-shrink-0 bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border w-80">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Mariama Bah</div>
                      <div className="text-xs text-muted-foreground">Conakry, Guinée</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">"Grâce au parrainage, j'ai gagné plus de 50 000 FCFA ce mois-ci. Un grand merci à toute l'équipe !"</p>
                  <div className="flex text-yellow-400 text-xs mt-2">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation currentPage="home" />
    </div>
  );
}
