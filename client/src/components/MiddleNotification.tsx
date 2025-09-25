import { useState, useEffect } from "react";
import { X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MiddleNotification() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show notification after 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-2xl max-w-sm w-full mx-4 relative animate-scale-in">
        <div className="p-6 text-center space-y-4">
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-3 right-3 text-white/70 hover:text-white"
            data-testid="button-close-middle-notification"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-5xl mb-3 animate-bounce">🎯</div>
          
          <h3 className="text-xl font-bold text-white">
            Commencez à gagner maintenant !
          </h3>
          
          <p className="text-blue-100 text-sm leading-relaxed">
            Corrigez des phrases et gagnez 650 FCFA chacune. 
            Jusqu'à 12 phrases par jour = 7800 FCFA !
          </p>
          
          <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 text-yellow-300">
              <Gift className="w-4 h-4" />
              <span className="text-sm font-semibold">Paiement automatique</span>
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => {
                window.location.href = "/work";
                setIsVisible(false);
              }}
              className="w-full bg-white text-blue-600 hover:bg-blue-50 py-3 rounded-lg font-bold"
              data-testid="button-start-working"
            >
              Commencer maintenant ! 🚀
            </Button>
            
            <Button
              onClick={() => setIsVisible(false)}
              variant="outline"
              className="w-full border-white/30 text-white hover:bg-white/10 py-2 rounded-lg"
              data-testid="button-later-notification"
            >
              Plus tard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}