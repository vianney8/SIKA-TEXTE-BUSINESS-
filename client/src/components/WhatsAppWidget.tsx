import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Headphones, Wrench, CreditCard, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ContactOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  whatsappNumber: string;
  message: string;
}

export default function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const contactOptions: ContactOption[] = [
    {
      id: "support",
      title: "Support Général",
      description: "Questions sur l'utilisation de SIKA TEXTE",
      icon: Headphones,
      whatsappNumber: "+2250748291503",
      message: "Bonjour, j'ai besoin d'aide concernant SIKA TEXTE."
    },
    {
      id: "technical",
      title: "Support Technique",
      description: "Problèmes techniques ou bugs",
      icon: Wrench,
      whatsappNumber: "+2250748291503",
      message: "Bonjour, j'ai un problème technique avec l'application SIKA TEXTE."
    },
    {
      id: "financial",
      title: "Support Financier",
      description: "Questions sur paiements et retraits",
      icon: CreditCard,
      whatsappNumber: "+2250748291503",
      message: "Bonjour, j'ai une question concernant les paiements/retraits sur SIKA TEXTE."
    },
    {
      id: "business",
      title: "Équipe Commerciale",
      description: "Partenariats et opportunités",
      icon: Users,
      whatsappNumber: "+2250748291503",
      message: "Bonjour, je souhaite discuter d'opportunités commerciales avec SIKA TEXTE."
    }
  ];

  const handleContactClick = (option: ContactOption) => {
    const encodedMessage = encodeURIComponent(option.message);
    const whatsappUrl = `https://wa.me/${option.whatsappNumber.replace(/[^\d]/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  // Don't show widget on landing page if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Floating WhatsApp Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          data-testid="whatsapp-widget-toggle"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white" />
          )}
        </Button>
      </div>

      {/* Contact Options Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 max-w-[calc(100vw-3rem)]">
          <Card className="shadow-2xl border-0 bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                Contactez-nous sur WhatsApp
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choisissez le type de support dont vous avez besoin
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {contactOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Button
                    key={option.id}
                    variant="ghost"
                    className="w-full h-auto p-3 justify-start text-left hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={() => handleContactClick(option)}
                    data-testid={`whatsapp-option-${option.id}`}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="mt-0.5">
                        <IconComponent className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {option.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
              
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Disponible 24h/7j • Réponse rapide garantie
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20" 
          onClick={() => setIsOpen(false)}
          data-testid="whatsapp-backdrop"
        />
      )}
    </>
  );
}