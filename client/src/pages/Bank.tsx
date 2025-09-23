import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, University, ArrowDown, ArrowUp, History, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function Bank() {
  const services = [
    {
      icon: ArrowDown,
      label: "Retrait en agence",
      description: "Retirez votre argent dans une agence partenaire",
      iconColor: "text-green-600",
      testId: "button-withdrawal",
    },
    {
      icon: ArrowUp,
      label: "Dépôt en agence",
      description: "Déposez de l'argent dans une agence partenaire",
      iconColor: "text-red-600",
      testId: "button-deposit",
    },
    {
      icon: History,
      label: "Historique des transactions",
      description: "Consultez l'historique complet de vos transactions",
      iconColor: "text-primary",
      testId: "button-history",
    },
  ];

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
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Services bancaires</h1>
        </div>
      </div>

      <div className="p-6">
        <Card className="bg-white rounded-xl shadow-sm border border-border">
          <CardContent className="p-6">
            <div className="flex items-center mb-6">
              <University className="text-accent mr-3" size={24} />
              <h2 className="text-xl font-bold">Services disponibles</h2>
            </div>

            <div className="space-y-4">
              {services.map((service) => (
                <Button
                  key={service.label}
                  variant="ghost"
                  className="w-full flex items-center justify-between p-4 h-auto border border-input rounded-lg hover:bg-muted transition-colors"
                  data-testid={service.testId}
                >
                  <div className="flex items-center space-x-3">
                    <service.icon className={service.iconColor} size={20} />
                    <div className="text-left">
                      <div className="font-medium">{service.label}</div>
                      <div className="text-sm text-muted-foreground">{service.description}</div>
                    </div>
                  </div>
                  <ChevronRight className="text-muted-foreground" size={16} />
                </Button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="fas fa-info text-white text-xs"></i>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Information importante</h4>
                  <p className="text-sm text-muted-foreground">
                    Pour utiliser ces services, vous devez vous rendre dans une agence partenaire SIKA TEXTE BUSINESS
                    avec une pièce d'identité valide.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
