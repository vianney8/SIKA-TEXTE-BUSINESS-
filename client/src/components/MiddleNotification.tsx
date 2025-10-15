import { useState, useEffect } from "react";
import { X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppSetting } from "@/hooks/useAppSettings";

export default function MiddleNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const { data: whatsappGroup } = useAppSetting('whatsapp_group');

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
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-2xl max-w-sm w-full mx-4 relative animate-scale-in">
        <div className="p-6 text-center space-y-4">
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-3 right-3 text-white/70 hover:text-white"
            data-testid="button-close-middle-notification"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h3 className="text-lg font-semibold text-white">
            Rejoignez notre chaîne WhatsApp
          </h3>
          
          <p className="text-green-100 text-sm leading-relaxed">
            Rejoignez notre chaîne de discussion WhatsApp pour être au courant de nos dernières mises à jour.
          </p>
          
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => {
                const whatsappUrl = whatsappGroup || "https://whatsapp.com/channel/0029VbBFjJI1iUxJy9fOQg0f";
                window.open(whatsappUrl, "_blank");
                setIsVisible(false);
              }}
              className="w-full bg-white hover:bg-gray-100 text-green-600 py-3 rounded-lg font-medium"
              data-testid="button-join-whatsapp"
            >
              Rejoindre
            </Button>
            <p className="text-xs text-green-100">
              https://whatsapp.com/channel/0029VbBFjJI1iUxJy9fOQg0f
            </p>
            
            <Button
              onClick={() => setIsVisible(false)}
              variant="outline"
              className="w-full border-white text-white bg-white/20 hover:bg-white/30 py-2 rounded-lg font-medium"
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