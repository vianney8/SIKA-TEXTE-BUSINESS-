import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActivationSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification du paiement en cours...');

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let isComponent = true; // Track if component is mounted
    
    const activateAccount = async (isRetry = false) => {
      if (!isComponent) return;
      
      console.log('[ACTIVATION-SUCCESS]', isRetry ? 'Polling...' : 'Initial verification');
      console.log('[ACTIVATION-SUCCESS] Full URL:', window.location.href);
      
      const searchParams = new URLSearchParams(window.location.search);
      
      // Capture ALL parameters from BKAPay callback
      const allParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        allParams[key] = value;
      });
      
      if (!isRetry) {
        console.log('[ACTIVATION-SUCCESS] All callback params:', JSON.stringify(allParams));
      }
      
      // Send ALL parameters to backend for verification
      try {
        const response = await fetch('/api/activation/verify-bkapay-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            params: allParams,
            fullUrl: window.location.href
          }),
        });
        
        if (!isComponent) return;
        
        console.log('[ACTIVATION-SUCCESS] API Response status:', response.status);
        const data = await response.json();
        console.log('[ACTIVATION-SUCCESS] API Response data:', data);
        
        if (data.activated) {
          // ACTIVATED! Clear polling and show success
          if (pollInterval) clearInterval(pollInterval);
          
          localStorage.removeItem('pendingActivationRef');
          localStorage.removeItem('pendingActivationTime');
          
          setStatus('success');
          setMessage('Votre compte a été activé avec succès ! Vous pouvez maintenant effectuer des retraits.');
          
          setTimeout(() => {
            if (isComponent) setLocation('/withdrawal');
          }, 3000);
        } else if (data.awaiting_verification) {
          // Still waiting - set up polling if not already running
          setStatus('pending');
          setMessage(data.message || 'Votre paiement est en cours de vérification...');
          
          if (!isRetry && !pollInterval) {
            console.log('[ACTIVATION-SUCCESS] Setting up polling every 2 seconds...');
            // Start polling for activation
            pollInterval = setInterval(() => {
              activateAccount(true);
            }, 2000);
          }
        } else {
          // ERROR - stop polling if any
          if (pollInterval) clearInterval(pollInterval);
          
          setStatus('error');
          setMessage(data.message || 'Paiement non confirmé. Si vous avez payé, contactez le support.');
        }
      } catch (error) {
        console.error('[ACTIVATION-SUCCESS] Error:', error);
        if (isComponent) {
          setStatus('error');
          setMessage('Erreur de connexion. Veuillez réessayer.');
        }
        if (pollInterval) clearInterval(pollInterval);
      }
    };
    
    // Initial check
    activateAccount();
    
    // Cleanup on unmount
    return () => {
      isComponent = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin mb-4" />
              <h2 className="text-xl font-semibold mb-2">Traitement en cours</h2>
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
              >
                Accéder aux retraits
              </Button>
            </>
          )}

          {status === 'pending' && (
            <>
              <Clock className="w-16 h-16 mx-auto text-orange-500 mb-4" />
              <h2 className="text-xl font-semibold text-orange-600 mb-2">Vérification en cours</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500 mb-4">
                Si vous avez effectué le paiement, votre compte sera activé automatiquement.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  Vérifier à nouveau
                </Button>
                <Button 
                  onClick={() => setLocation('/withdrawal')}
                  variant="outline"
                  className="w-full"
                >
                  Retour
                </Button>
              </div>
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
                >
                  Retour aux retraits
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full"
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
