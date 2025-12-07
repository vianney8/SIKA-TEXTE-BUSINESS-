import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActivationSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isComponent = true;
    
    const verifyActivation = async () => {
      if (!isComponent) return;
      
      console.log('[ACTIVATION-SUCCESS] Verifying payment and activating account...');
      
      const searchParams = new URLSearchParams(window.location.search);
      const allParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        allParams[key] = value;
      });
      
      console.log('[ACTIVATION-SUCCESS] Callback params:', JSON.stringify(allParams));
      
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
        
        const data = await response.json();
        console.log('[ACTIVATION-SUCCESS] Response:', data);
        
        if (data.activated) {
          // ACCOUNT ACTIVATED! Show success and redirect
          setStatus('success');
          setMessage(data.message || 'Votre compte a été activé avec succès !');
          
          setTimeout(() => {
            if (isComponent) setLocation('/withdrawal');
          }, 2000);
        } else {
          // Activation failed
          setStatus('error');
          setMessage(data.message || 'Impossible d\'activer le compte. Veuillez réessayer.');
        }
      } catch (error) {
        console.error('[ACTIVATION-SUCCESS] Error:', error);
        if (isComponent) {
          setStatus('error');
          setMessage('Erreur de connexion. Veuillez réessayer.');
        }
      }
    };
    
    // Verify activation immediately when page loads
    verifyActivation();
    
    // Cleanup on unmount
    return () => {
      isComponent = false;
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
