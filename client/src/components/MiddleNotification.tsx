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
          
          <h3 className="text-lg font-semibold text-white">
            Rejoignez notre groupe WhatsApp
          </h3>
          
          <p className="text-blue-100 text-sm leading-relaxed">
            Rejoignez notre groupe de dissolution WhatsApp pour être au courant de nos dernières mises à jour.
          </p>
          
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => {
                window.open("https://chat.whatsapp.com/HtUYvCOeJArHYLhMcRCsDs", "_blank");
                setIsVisible(false);
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
              data-testid="button-join-whatsapp"
            >
              Rejoindre
            </Button>
            
            <Button
              onClick={() => setIsVisible(false)}
              variant="outline"
              className="w-full border-white/30 text-white hover:bg-white/10 py-2 rounded-lg"
              data-testid="button-ok-notification"
            >
              Ok
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}