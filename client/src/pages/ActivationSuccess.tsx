import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

export default function ActivationSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Activation de votre compte...');
  const [debugInfo, setDebugInfo] = useState('');
  
  const urlParams = new URLSearchParams(window.location.search);
  
  // Log all URL parameters for debugging
  const allParams: Record<string, string> = {};
  urlParams.forEach((value, key) => {
    allParams[key] = value;
  });
  
  // Try multiple possible parameter names for reference
  let ref = urlParams.get('ref') || urlParams.get('reference') || urlParams.get('order_id') || urlParams.get('transaction_id');
  
  // Fix: BKAPay appends ?status=... which breaks our ref parameter
  // If ref contains ?, extract only the part before it
  if (ref && ref.includes('?')) {
    ref = ref.split('?')[0];
  }
  
  const paymentStatus = urlParams.get('status') || urlParams.get('payment_status');
  const transactionId = urlParams.get('transactionId') || urlParams.get('transaction_id') || urlParams.get('tx_id');
  const amount = urlParams.get('amount');
  
  // Fallback to localStorage if no ref in URL
  const storedRef = localStorage.getItem('pendingActivationRef');

  useEffect(() => {
    const activateAccount = async () => {
      console.log('[ACTIVATION-SUCCESS] Full URL:', window.location.href);
      console.log('[ACTIVATION-SUCCESS] All URL params:', allParams);
      console.log('[ACTIVATION-SUCCESS] Parsed values:', { ref, paymentStatus, transactionId, amount, storedRef });
      
      const referenceToUse = ref || storedRef;
      setDebugInfo(`URL: ${window.location.href}\nParams bruts: ${JSON.stringify(allParams)}\nRef corrigée: ${ref}\nRef localStorage: ${storedRef}\nRef utilisée: ${referenceToUse}`);
      
      if (paymentStatus === 'failed') {
        setStatus('failed');
        setMessage('Le paiement a échoué. Veuillez réessayer.');
        return;
      }

      console.log('[ACTIVATION-SUCCESS] Reference to use:', referenceToUse);

      if (!referenceToUse) {
        setStatus('failed');
        setMessage('Référence de paiement manquante. Veuillez contacter le support.');
        return;
      }

      try {
        const response = await fetch('/api/activation/process-return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            reference: referenceToUse,
            status: paymentStatus || 'success',
            transactionId,
            amount
          })
        });

        const data = await response.json();
        console.log('[ACTIVATION-SUCCESS] Backend response:', data);

        if (response.ok && data.activated) {
          setStatus('success');
          setMessage(`Paiement de ${amount || '3600'} FCFA réussi ! Votre compte est activé.`);
          
          queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
          queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
          queryClient.invalidateQueries({ queryKey: ['/api/withdrawal'] });
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          
          setTimeout(() => {
            setLocation('/withdrawal');
          }, 3000);
        } else {
          setStatus('failed');
          setMessage(data.message || 'Erreur lors de l\'activation. Contactez le support.');
        }
      } catch (error) {
        console.error('[ACTIVATION-SUCCESS] Error:', error);
        setStatus('failed');
        setMessage('Erreur de connexion. Veuillez réessayer.');
      }
      
      localStorage.removeItem('pendingActivationRef');
      localStorage.removeItem('pendingActivationTime');
    };

    activateAccount();
  }, [ref, paymentStatus, transactionId, amount, storedRef, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 mb-4 animate-spin" />
              <h2 className="text-xl font-semibold text-blue-600 mb-2">Activation en cours...</h2>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-green-600 mb-2">Paiement Réussi !</h2>
            </>
          )}
          
          {status === 'failed' && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-red-600 mb-2">Échec</h2>
            </>
          )}
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
          
          {status === 'failed' && debugInfo && (
            <details className="text-left mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
              <summary className="cursor-pointer text-gray-500">Détails techniques (pour le support)</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all text-gray-600 dark:text-gray-400">{debugInfo}</pre>
            </details>
          )}
          
          {status === 'success' && (
            <p className="text-sm text-gray-500 mb-4">Redirection automatique...</p>
          )}
          
          <div className="space-y-2">
            <Button 
              onClick={() => setLocation('/withdrawal')}
              className={`w-full ${status === 'failed' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              data-testid="button-continue"
              disabled={status === 'loading'}
            >
              {status === 'failed' ? 'Réessayer' : 'Accéder aux retraits'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setLocation('/')}
              className="w-full"
              data-testid="button-home"
              disabled={status === 'loading'}
            >
              Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
