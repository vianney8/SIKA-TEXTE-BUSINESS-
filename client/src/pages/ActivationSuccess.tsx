import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActivationSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification de votre paiement en cours...');

  useEffect(() => {
    const activateAccount = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      
      // Get all URL parameters
      const allParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        allParams[key] = value;
      });
      
      // Get state token
      const state = searchParams.get('state');
      const finalState = state || localStorage.getItem('pendingActivationState');
      
      // Check if payment failed
      const statusParam = searchParams.get('status')?.toLowerCase();
      if (statusParam === 'failed') {
        setStatus('error');
        setMessage('Le paiement a échoué. Veuillez réessayer.');
        return;
      }
      
      try {
        console.log('[ACTIVATION-SUCCESS] Calling verify-payment API...');
        const response = await fetch('/api/activation/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            state: finalState,
            allParams: allParams
          }),
        });
        
        const data = await response.json();
        console.log('[ACTIVATION-SUCCESS] API Response:', data);
        
        // Clear localStorage
        localStorage.removeItem('pendingActivationState');
        
        if (data.activated) {
          setStatus('success');
          setMessage('Votre compte a été activé avec succès ! Vous pouvez maintenant effectuer des retraits.');
          
          setTimeout(() => {
            setLocation('/withdrawal');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Erreur lors de l\'activation. Veuillez contacter le support.');
        }
      } catch (error) {
        console.error('[ACTIVATION-SUCCESS] Error:', error);
        setStatus('error');
        setMessage('Erreur de connexion. Veuillez réessayer.');
      }
    };
    
    activateAccount();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin mb-4" />
              <h2 className="text-xl font-semibold mb-2">Vérification en cours</h2>
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-green-600 mb-2">Félicitations !</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirection automatique dans 3 secondes...</p>
              <Button 
                onClick={() => setLocation('/withdrawal')}
                className="mt-4 bg-green-600 hover:bg-green-700"
                data-testid="button-go-withdrawal"
              >
                Accéder aux retraits
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-red-600 mb-2">Erreur</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
              <div className="space-y-2">
                <Button 
                  onClick={() => setLocation('/withdrawal')}
                  variant="outline"
                  className="w-full"
                  data-testid="button-back-withdrawal"
                >
                  Retour aux retraits
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full"
                  data-testid="button-retry"
                >
                  Réessayer
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
