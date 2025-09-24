import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Filter, TrendingUp, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { formatFCFA } from "@/lib/utils";

export default function Transactions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("corrections");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Define transaction categories
  const correctionTypes: string[] = []; // Only correction earnings (bonus moved to financial)
  const financialTypes = ['deposit', 'pointage', 'transfer', 'transfer_received', 'withdrawal', 'referral']; // Bonus, Pointage, Transfert, Retrait, Parrainage
  
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions", activeTab, filterType, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('limit', '50');
      
      // Apply category filtering based on active tab
      if (activeTab === 'corrections') {
        params.append('categories', correctionTypes.join(','));
      } else if (activeTab === 'financial') {
        params.append('categories', financialTypes.join(','));
      }
      
      if (filterType && filterType !== 'all') params.append('type', filterType);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      return fetch(`/api/transactions?${params.toString()}`, {
        credentials: 'include'
      }).then(res => res.json());
    }
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return "fas fa-check-circle";
      case "pointage":
        return "fas fa-clock";
      case "transfer":
        return "fas fa-exchange-alt";
      case "transfer_received":
        return "fas fa-arrow-down";
      case "recharge":
        return "fas fa-plus";
      case "payment":
        return "fas fa-shopping-cart";
      case "withdrawal":
        return "fas fa-arrow-up";
      case "referral":
        return "fas fa-users";
      default:
        return "fas fa-circle";
    }
  };

  const getTransactionIconBg = (type: string) => {
    switch (type) {
      case "deposit":
        return "bg-yellow-100";
      case "pointage":
        return "bg-green-100";
      case "transfer":
        return "bg-blue-100";
      case "transfer_received":
        return "bg-green-100";
      case "recharge":
        return "bg-orange-100";
      case "payment":
        return "bg-blue-100";
      case "withdrawal":
        return "bg-red-100";
      case "referral":
        return "bg-purple-100";
      default:
        return "bg-gray-100";
    }
  };

  const getTransactionIconColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "text-yellow-600";
      case "pointage":
        return "text-green-600";
      case "transfer":
        return "text-primary";
      case "transfer_received":
        return "text-green-600";
      case "recharge":
        return "text-accent";
      case "payment":
        return "text-primary";
      case "withdrawal":
        return "text-red-600";
      case "referral":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  const getTypeLabel = (type: string, description?: string) => {
    switch (type) {
      case "deposit":
        if (description?.includes("correction")) return "Corrections";
        if (description?.includes("Bonus de bienvenue")) return "Bonus de bienvenue";
        return "Dépôt";
      case "pointage":
        return "Pointage";
      case "transfer":
        return "Transfert";
      case "transfer_received":
        return "Transfert reçu";
      case "recharge":
        return "Recharge crédit";
      case "payment":
        return "Paiement Marchand";
      case "withdrawal":
        return "Retrait";
      case "referral":
        return "Gains de parrainage";
      default:
        return "Transaction";
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

  // Server-side filtering is now handled, so we just use the transactions directly
  const filteredTransactions = transactions as any[];

  // Get available filter options based on active tab
  const getFilterOptions = () => {
    if (activeTab === 'corrections') {
      return [
        { value: "all", label: "Tous les types" },
        { value: "deposit", label: "Gains de correction" },
      ];
    } else {
      return [
        { value: "all", label: "Tous les types" },
        { value: "pointage", label: "Pointage" },
        { value: "transfer", label: "Transfert envoyé" },
        { value: "transfer_received", label: "Transfert reçu" },
        { value: "withdrawal", label: "Retrait" },
        { value: "referral", label: "Parrainage" },
      ];
    }
  };

  // Reset filter type when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setFilterType("all");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 flex items-center">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
            <Link href="/" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">
            Historique des transactions
          </h1>
        </div>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="corrections" className="flex items-center gap-2" data-testid="tab-corrections">
              <TrendingUp size={16} />
              Corrections
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2" data-testid="tab-financial">
              <DollarSign size={16} />
              Financières
            </TabsTrigger>
          </TabsList>

          <TabsContent value="corrections" className="space-y-6">
            {renderTransactionContent("Revenus de correction de phrases")}
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            {renderTransactionContent("Opérations financières")}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  function renderTransactionContent(subtitle: string) {
    return (
      <>
        {/* Subtitle */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {/* Filters */}
        <Card className="bg-white rounded-xl shadow-sm border border-border mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="text-muted-foreground" size={20} />
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger data-testid="filter-type">
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilterOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Statut</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger data-testid="filter-status">
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="completed">Payé</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="failed">Échoué</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="bg-white rounded-xl shadow-sm border border-border">
          <CardContent className="p-0">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground" data-testid="text-no-transactions">
                Aucun pointage trouvé
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTransactions.map((transaction: any) => (
                  <div
                    key={transaction.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                    data-testid={`transaction-item-${transaction.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={`w-10 h-10 ${getTransactionIconBg(transaction.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <i className={`${getTransactionIcon(transaction.type)} ${getTransactionIconColor(transaction.type)}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1" data-testid={`transaction-type-${transaction.id}`}>
                            {getTypeLabel(transaction.type, transaction.description)}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2" data-testid={`transaction-date-${transaction.id}`}>
                            {new Date(transaction.createdAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {transaction.reference && (
                            <div className="text-xs text-muted-foreground" data-testid={`transaction-ref-${transaction.id}`}>
                              Réf: {transaction.reference}
                            </div>
                          )}
                          {transaction.description && (
                            <div className="text-xs text-muted-foreground mt-1" data-testid={`transaction-desc-${transaction.id}`}>
                              {transaction.description}
                            </div>
                          )}
                          {transaction.recipientPhone && (
                            <div className="text-xs text-muted-foreground">
                              Vers: {transaction.recipientPhone}
                            </div>
                          )}
                          {transaction.operator && (
                            <div className="text-xs text-muted-foreground">
                              {transaction.operator}
                            </div>
                          )}
                          {transaction.merchantCode && (
                            <div className="text-xs text-muted-foreground">
                              Marchand: {transaction.merchantCode}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div 
                          className={`font-semibold text-sm mb-1 ${
                            ["deposit", "pointage", "transfer_received", "referral"].includes(transaction.type) ? "text-green-600" : "text-red-600"
                          }`}
                          data-testid={`transaction-amount-${transaction.id}`}
                        >
                          {["deposit", "pointage", "transfer_received", "referral"].includes(transaction.type) ? "+" : "-"}
                          {formatFCFA(parseFloat(transaction.amount))}
                        </div>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  }
}