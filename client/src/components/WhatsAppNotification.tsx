import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppSetting } from "@/hooks/useAppSettings";

export default function WhatsAppNotification() {
  const [isVisible, setIsVisible] = useState(true);
  const { data: whatsappGroup } = useAppSetting('whatsapp_group');

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 relative">
        <div className="p-6 text-center space-y-4">
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            data-testid="button-close-notification"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-4xl mb-2">📢</div>
          
          <h3 className="text-lg font-semibold text-gray-800">
            Restez informés en temps réel !
          </h3>
          
          <p className="text-sm text-gray-600 leading-relaxed">
            Rejoignez notre groupe de discussion WhatsApp pour être au courant de nos dernières mises à jour.
          </p>
          
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => {
                const whatsappGroupUrl = whatsappGroup || "https://chat.whatsapp.com/CXhYz9x8KJ6AabcdXefGHi";
                window.open(whatsappGroupUrl, "_blank");
                setIsVisible(false);
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
              data-testid="button-join-whatsapp"
            >
              Rejoignez ici !
            </Button>
            
            <Button
              onClick={() => setIsVisible(false)}
              variant="outline"
              className="w-full border-gray-300 text-gray-600 hover:bg-gray-50 py-2 rounded-lg"
              data-testid="button-ok-notification"
            >
              OK
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}