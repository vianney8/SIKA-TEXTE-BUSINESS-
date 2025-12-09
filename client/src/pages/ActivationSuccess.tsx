import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

export default function ActivationSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [message, setMessage] = useState('Vérification de votre paiement...');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('status');
    const transactionId = urlParams.get('transactionId');
    const amount = urlParams.get('amount');
    const ref = urlParams.get('ref');
    
    console.log('[ACTIVATION-SUCCESS] BKAPay return params:', { 
      status: paymentStatus, 
      transactionId, 
      amount,
      ref 
    });
    
    if (paymentStatus === 'success') {
      setStatus('success');
      setMessage(`Paiement de ${amount || '3600'} FCFA réussi ! Votre compte est activé.`);
      
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawal'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      localStorage.removeItem('pendingActivationRef');
      localStorage.removeItem('pendingActivationTime');
      
      setTimeout(() => {
        setLocation('/withdrawal');
      }, 3000);
    } else if (paymentStatus === 'failed') {
      setStatus('failed');
      setMessage('Le paiement a échoué. Veuillez réessayer.');
      
      localStorage.removeItem('pendingActivationRef');
      localStorage.removeItem('pendingActivationTime');
    } else {
      // No pending state - treat as success since BKAPay handles the callback
      setStatus('success');
      setMessage('Paiement reçu ! Votre compte est activé.');
      
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawal'] });
      
      setTimeout(() => {
        setLocation('/withdrawal');
      }, 3000);
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 mb-4 animate-spin" />
              <h2 className="text-xl font-semibold text-blue-600 mb-2">Vérification...</h2>
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
              <h2 className="text-xl font-semibold text-red-600 mb-2">Paiement Échoué</h2>
            </>
          )}
          
          {status === 'pending' && (
            <>
              <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold text-yellow-600 mb-2">En Traitement</h2>
            </>
          )}
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
          
          {(status === 'success' || status === 'pending') && (
            <p className="text-sm text-gray-500 mb-4">Redirection automatique vers les retraits...</p>
          )}
          
          <div className="space-y-2">
            <Button 
              onClick={() => setLocation('/withdrawal')}
              className={`w-full ${status === 'failed' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {status === 'failed' ? 'Réessayer' : 'Accéder aux retraits'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setLocation('/')}
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
