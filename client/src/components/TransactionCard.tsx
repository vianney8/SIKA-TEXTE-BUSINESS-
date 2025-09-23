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

  const getIconBg = (type: string) => {
    switch (type) {
      case "deposit":
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

  const getIconColor = (type: string) => {
    switch (type) {
      case "deposit":
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "deposit":
        return "Dépôt Sika";
      case "transfer":
        return "Transfert";
      case "recharge":
        return "Recharge crédit";
      case "payment":
        return "Paiement Marchand";
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
            {getTypeLabel(transaction.type)}
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
            transaction.type === "deposit" ? "text-green-600" : "text-red-600"
          }`}
        >
          {transaction.type === "deposit" ? "+" : "-"}
          {formatFCFA(parseFloat(transaction.amount))}
        </div>
        {getStatusBadge(transaction.status)}
      </div>
    </div>
  );
}
