import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActivationSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Activation de votre compte en cours...');

  useEffect(() => {
    const activateAccount = async () => {
      console.log('[ACTIVATION-SUCCESS] Page loaded - Auto-activating with state token');
      console.log('[ACTIVATION-SUCCESS] Full URL:', window.location.href);
      
      const searchParams = new URLSearchParams(window.location.search);
      const reference = searchParams.get('ref') || searchParams.get('reference');
      const state = searchParams.get('state');
      
      console.log('[ACTIVATION-SUCCESS] Reference from URL:', reference);
      console.log('[ACTIVATION-SUCCESS] State token from URL:', state);
      
      // Also check localStorage as backup
      let finalReference = reference;
      let finalState = state;
      
      if (!finalReference || !finalState) {
        const storedRef = localStorage.getItem('pendingActivationRef');
        const storedState = localStorage.getItem('pendingActivationState');
        const storedTime = localStorage.getItem('pendingActivationTime');
        
        if (storedTime) {
          const timeDiff = Date.now() - parseInt(storedTime);
          if (timeDiff < 30 * 60 * 1000) { // 30 minutes
            if (!finalReference && storedRef) {
              finalReference = storedRef;
              console.log('[ACTIVATION-SUCCESS] Using reference from localStorage:', finalReference);
            }
            if (!finalState && storedState) {
              finalState = storedState;
              console.log('[ACTIVATION-SUCCESS] Using state from localStorage:', finalState);
            }
          }
        }
      }
      
      console.log('[ACTIVATION-SUCCESS] Final reference:', finalReference || 'none');
      console.log('[ACTIVATION-SUCCESS] Final state:', finalState || 'none');
      
      try {
        // Call API for auto-activation with state token
        console.log('[ACTIVATION-SUCCESS] Calling verify-payment API...');
        const response = await fetch('/api/activation/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            reference: finalReference || null,
            state: finalState || null
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
          
          // Redirect to withdrawal page after 3 seconds
          setTimeout(() => {
            setLocation('/withdrawal');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Erreur lors de l\'activation. Veuillez réessayer.');
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
              <h2 className="text-xl font-semibold mb-2">Activation en cours</h2>
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
