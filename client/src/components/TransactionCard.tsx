import { formatFCFA } from "@/lib/utils";

interface TransactionCardProps {
  transaction: {
    id: string;
    type: string;
    amount: string;
    status: string;
    createdAt: string;
    description?: string;
  };
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "pointage":
        return "fas fa-check-circle";
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

  const getIconBg = (type: string) => {
    switch (type) {
      case "deposit":
      case "pointage":
        return "bg-green-100";
      case "transfer":
        return "bg-red-100";
      case "transfer_received":
        return "bg-green-100";
      case "recharge":
        return "bg-blue-100";
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

  const getIconColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "pointage":
        return "text-green-600";
      case "transfer":
        return "text-red-600";
      case "transfer_received":
        return "text-green-600";
      case "recharge":
        return "text-blue-600";
      case "payment":
        return "text-blue-600";
      case "withdrawal":
        return "text-red-600";
      case "referral":
        return "text-purple-600";
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

  const getTypeLabel = (type: string, description?: string) => {
    switch (type) {
      case "deposit":
        return description?.includes("correction") ? "Corrections" : "Dépôt";
      case "pointage":
        return "Pointage";
      case "transfer":
        return "Transfert Envoyé";
      case "transfer_received":
        return "Transfert Reçu";
      case "recharge":
        return "Recharge Crédit";
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

  return (
    <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 ${getIconBg(transaction.type)} rounded-full flex items-center justify-center`}>
          <i className={`${getIcon(transaction.type)} ${getIconColor(transaction.type)}`}></i>
        </div>
        <div>
          <div className="font-medium text-sm">
            {getTypeLabel(transaction.type, transaction.description)}
          </div>
          <div className="text-xs text-muted-foreground">
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
            // Transactions positives (gains/revenus) en vert
            ["deposit", "pointage", "recharge", "payment", "transfer_received", "referral"].includes(transaction.type) 
              ? "text-green-600" 
              // Transactions négatives (sorties d'argent) en rouge
              : "text-red-600"
          }`}
        >
          {["deposit", "pointage", "recharge", "payment", "transfer_received", "referral"].includes(transaction.type) ? "+" : "-"}
          {formatFCFA(parseFloat(transaction.amount))}
        </div>
        {getStatusBadge(transaction.status)}
      </div>
    </div>
  );
}
