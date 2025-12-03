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
    const activateAccount = async () => {
      console.log('[ACTIVATION-SUCCESS] Page loaded');
      console.log('[ACTIVATION-SUCCESS] Full URL:', window.location.href);
      
      const searchParams = new URLSearchParams(window.location.search);
      const statusParam = searchParams.get('status');
      const refParam = searchParams.get('ref');
      const transactionId = searchParams.get('transactionId');
      
      console.log('[ACTIVATION-SUCCESS] Status param:', statusParam);
      console.log('[ACTIVATION-SUCCESS] Ref param:', refParam);
      console.log('[ACTIVATION-SUCCESS] TransactionId:', transactionId);
      
      // Check if user is coming from BKAPay (has ref parameter) OR has status=success
      if (statusParam === 'success' || refParam) {
        console.log('[ACTIVATION-SUCCESS] Payment received from BKAPay - Activating account immediately');
        
        try {
          // Call success-callback to activate account
          const response = await fetch('/api/activation/success-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: 'success', transactionId, reference: refParam }),
          });
          
          console.log('[ACTIVATION-SUCCESS] API Response status:', response.status);
          const data = await response.json();
          console.log('[ACTIVATION-SUCCESS] API Response data:', data);
          
          if (response.ok && data.activated) {
            setStatus('success');
            setMessage('Votre compte a été activé avec succès ! Vous pouvez maintenant effectuer des retraits.');
            
            setTimeout(() => {
              setLocation('/withdrawal');
            }, 3000);
          } else if (data.awaiting_verification) {
            // Payment is awaiting admin verification
            setStatus('pending');
            setMessage(data.message || 'Votre paiement est en cours de vérification. Votre compte sera activé après confirmation par notre équipe.');
          } else {
            console.error('[ACTIVATION-SUCCESS] Activation failed:', data);
            setStatus('error');
            setMessage(data.message || 'Erreur lors de l\'activation. Contactez le support si vous avez payé.');
          }
        } catch (error) {
          console.error('[ACTIVATION-SUCCESS] Error:', error);
          setStatus('error');
          setMessage('Erreur de connexion. Veuillez contacter le support si vous avez payé.');
        }
        return;
      }
      
      // Otherwise use the old verification method
      let reference = searchParams.get('ref') || searchParams.get('reference');
      
      if (!reference) {
        const storedRef = localStorage.getItem('pendingActivationRef');
        const storedTime = localStorage.getItem('pendingActivationTime');
        
        if (storedRef && storedTime) {
          const timeDiff = Date.now() - parseInt(storedTime);
          if (timeDiff < 30 * 60 * 1000) {
            reference = storedRef;
            console.log('[ACTIVATION-SUCCESS] Using reference from localStorage:', reference);
          }
        }
      }
      
      console.log('[ACTIVATION-SUCCESS] Reference:', reference || 'none');
      
      try {
        console.log('[ACTIVATION-SUCCESS] Calling verify-payment API...');
        const response = await fetch('/api/activation/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reference: reference || null }),
        });
        
        const data = await response.json();
        console.log('[ACTIVATION-SUCCESS] API Response:', data);
        
        localStorage.removeItem('pendingActivationRef');
        localStorage.removeItem('pendingActivationTime');
        
        if (data.activated) {
          setStatus('success');
          setMessage('Votre compte a été activé avec succès ! Vous pouvez maintenant effectuer des retraits.');
          
          setTimeout(() => {
            setLocation('/withdrawal');
          }, 3000);
        } else if (data.awaiting_verification) {
          setStatus('pending');
          setMessage(data.message || 'Votre paiement est en cours de vérification. Votre compte sera activé après confirmation par notre équipe.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Erreur lors de l\'activation. Contactez le support si vous avez payé.');
        }
      } catch (error) {
        console.error('[ACTIVATION-SUCCESS] Error:', error);
        setStatus('error');
        setMessage('Erreur de connexion. Veuillez réessayer ou contacter le support.');
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
