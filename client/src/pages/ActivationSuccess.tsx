import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

export default function ActivationSuccess() {
  const [, setLocation] = useLocation();
  
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('status');
  const amount = urlParams.get('amount');
  
  const isSuccess = paymentStatus !== 'failed';

  useEffect(() => {
    console.log('[ACTIVATION-SUCCESS] BKAPay return - status:', paymentStatus);
    
    queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/withdrawal'] });
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    
    localStorage.removeItem('pendingActivationRef');
    localStorage.removeItem('pendingActivationTime');
    
    if (isSuccess) {
      setTimeout(() => {
        setLocation('/withdrawal');
      }, 3000);
    }
  }, [setLocation, isSuccess, paymentStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {isSuccess ? (
            <>
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-green-600 mb-2">Paiement Réussi !</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Paiement de {amount || '3600'} FCFA réussi ! Votre compte est activé.
              </p>
              <p className="text-sm text-gray-500 mb-4">Redirection automatique...</p>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-red-600 mb-2">Paiement Échoué</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Le paiement a échoué. Veuillez réessayer.
              </p>
            </>
          )}
          
          <div className="space-y-2">
            <Button 
              onClick={() => setLocation('/withdrawal')}
              className={`w-full ${isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              data-testid="button-continue"
            >
              {isSuccess ? 'Accéder aux retraits' : 'Réessayer'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setLocation('/')}
              className="w-full"
              data-testid="button-home"
            >
              Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
