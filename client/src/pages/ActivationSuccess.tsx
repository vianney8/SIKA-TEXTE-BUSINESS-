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
      console.log('[ACTIVATION-SUCCESS] Page loaded');
      console.log('[ACTIVATION-SUCCESS] Full URL:', window.location.href);
      
      // Parse BKAPay callback parameters from URL
      const searchParams = new URLSearchParams(window.location.search);
      const bkapayStatus = searchParams.get('status');
      const transactionId = searchParams.get('transactionId');
      const amount = searchParams.get('amount');
      const reference = searchParams.get('ref') || searchParams.get('reference');
      const state = searchParams.get('state');
      
      console.log('[ACTIVATION-SUCCESS] BKAPay Status:', bkapayStatus);
      console.log('[ACTIVATION-SUCCESS] Transaction ID:', transactionId);
      console.log('[ACTIVATION-SUCCESS] Amount:', amount);
      console.log('[ACTIVATION-SUCCESS] Reference:', reference);
      console.log('[ACTIVATION-SUCCESS] State:', state);
      
      // Check BKAPay status first
      if (bkapayStatus === 'failed') {
        console.log('[ACTIVATION-SUCCESS] BKAPay returned FAILED status');
        setStatus('error');
        setMessage('Le paiement a échoué. Veuillez réessayer.');
        return;
      }
      
      // Get backup from localStorage
      let finalReference = reference;
      let finalState = state;
      
      if (!finalReference || !finalState) {
        const storedRef = localStorage.getItem('pendingActivationRef');
        const storedState = localStorage.getItem('pendingActivationState');
        const storedTime = localStorage.getItem('pendingActivationTime');
        
        if (storedTime) {
          const timeDiff = Date.now() - parseInt(storedTime);
          if (timeDiff < 30 * 60 * 1000) {
            if (!finalReference && storedRef) finalReference = storedRef;
            if (!finalState && storedState) finalState = storedState;
          }
        }
      }
      
      try {
        console.log('[ACTIVATION-SUCCESS] Calling verify-payment API...');
        const response = await fetch('/api/activation/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            reference: finalReference,
            state: finalState,
            bkapayStatus: bkapayStatus,
            transactionId: transactionId,
            amount: amount
          }),
        });
        
        const data = await response.json();
        console.log('[ACTIVATION-SUCCESS] API Response:', data);
        
        // Clear localStorage
        localStorage.removeItem('pendingActivationRef');
        localStorage.removeItem('pendingActivationState');
        localStorage.removeItem('pendingActivationTime');
        
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
