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
  
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  const paymentStatus = urlParams.get('status');
  const transactionId = urlParams.get('transactionId');
  const amount = urlParams.get('amount');

  useEffect(() => {
    const activateAccount = async () => {
      console.log('[ACTIVATION-SUCCESS] Processing payment callback:', { ref, paymentStatus, transactionId, amount });
      
      if (paymentStatus === 'failed') {
        setStatus('failed');
        setMessage('Le paiement a échoué. Veuillez réessayer.');
        return;
      }

      if (!ref) {
        setStatus('failed');
        setMessage('Référence de paiement manquante.');
        return;
      }

      try {
        const response = await fetch('/api/activation/process-return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            reference: ref,
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
  }, [ref, paymentStatus, transactionId, amount, setLocation]);

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
