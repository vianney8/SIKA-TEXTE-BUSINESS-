import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActivationSuccess() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // With direct link payment, user redirects back manually
    // Just show success and redirect to withdrawal after 2 seconds
    const timer = setTimeout(() => {
      setLocation('/withdrawal');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-green-600 mb-2">Paiement en cours</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Vérification de votre paiement...</p>
          <p className="text-sm text-gray-500">Redirection automatique dans 2 secondes...</p>
          <Button 
            onClick={() => setLocation('/withdrawal')}
            className="mt-4 bg-green-600 hover:bg-green-700"
          >
            Accéder aux retraits
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
