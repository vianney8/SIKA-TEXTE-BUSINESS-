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
      
      // CRITICAL SECURITY: Check BKAPay payment status from URL parameters
      // BKAPay returns status in various parameters depending on the result
      const paymentStatus = searchParams.get('status') || 
                           searchParams.get('transaction_status') || 
                           searchParams.get('payment_status') ||
                           searchParams.get('state');
      const transactionId = searchParams.get('transaction_id') || 
                           searchParams.get('trxId') ||
                           searchParams.get('transactionId');
      
      console.log('[ACTIVATION-SUCCESS] BKAPay Status:', paymentStatus);
      console.log('[ACTIVATION-SUCCESS] Transaction ID:', transactionId);
      
      // SECURITY: Only proceed if payment status indicates success
      // Check for various success indicators from BKAPay
      const successStatuses = ['success', 'successful', 'completed', 'paid', 'approved', 'SUCCESSFUL', 'SUCCESS', 'COMPLETED', 'PAID'];
      const failureStatuses = ['failed', 'failure', 'cancelled', 'canceled', 'rejected', 'declined', 'FAILED', 'FAILURE', 'CANCELLED', 'REJECTED'];
      
      const isSuccess = paymentStatus && successStatuses.some(s => paymentStatus.toLowerCase() === s.toLowerCase());
      const isFailure = paymentStatus && failureStatuses.some(s => paymentStatus.toLowerCase() === s.toLowerCase());
      
      console.log('[ACTIVATION-SUCCESS] Is Success:', isSuccess, 'Is Failure:', isFailure);
      
      // If payment failed, show error immediately - DO NOT call API
      if (isFailure) {
        console.log('[ACTIVATION-SUCCESS] Payment FAILED - not activating');
        setStatus('error');
        setMessage('Le paiement a échoué ou a été annulé. Veuillez réessayer.');
        localStorage.removeItem('pendingActivationRef');
        localStorage.removeItem('pendingActivationTime');
        return;
      }
      
      // If no status parameter or not a clear success, require admin verification
      if (!paymentStatus || !isSuccess) {
        console.log('[ACTIVATION-SUCCESS] No valid success status - requiring verification');
        setStatus('pending');
        setMessage('Votre paiement est en cours de vérification. Notre équipe va confirmer votre paiement sous peu.');
        
        // Mark payment as awaiting verification (don't auto-activate)
        try {
          const reference = searchParams.get('ref') || searchParams.get('reference');
          await fetch('/api/activation/mark-pending-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
              reference: reference || null,
              gatewayStatus: paymentStatus || 'unknown',
              transactionId: transactionId || null
            }),
          });
        } catch (e) {
          console.error('[ACTIVATION-SUCCESS] Error marking pending:', e);
        }
        
        localStorage.removeItem('pendingActivationRef');
        localStorage.removeItem('pendingActivationTime');
        return;
      }
      
      // Payment status is SUCCESS - proceed with activation
      let reference = searchParams.get('ref') || searchParams.get('reference');
      
      // Also check localStorage as backup
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
      
      console.log('[ACTIVATION-SUCCESS] Reference:', reference || 'none (will use latest pending)');
      
      try {
        // Call API with verified success status
        console.log('[ACTIVATION-SUCCESS] Calling verify-payment API with SUCCESS status...');
        const response = await fetch('/api/activation/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            reference: reference || null,
            gatewayStatus: paymentStatus,
            transactionId: transactionId
          }),
        });
        
        const data = await response.json();
        console.log('[ACTIVATION-SUCCESS] API Response:', data);
        
        // Clear localStorage
        localStorage.removeItem('pendingActivationRef');
        localStorage.removeItem('pendingActivationTime');
        
        if (data.activated) {
          setStatus('success');
          setMessage('Votre compte a été activé avec succès ! Vous pouvez maintenant effectuer des retraits.');
          
          // Redirect to withdrawal page after 3 seconds
          setTimeout(() => {
            setLocation('/withdrawal');
          }, 3000);
        } else if (data.awaiting_verification) {
          setStatus('pending');
          setMessage(data.message || 'Votre paiement est en cours de vérification par notre équipe.');
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

          {status === 'pending' && (
            <>
              <Clock className="w-16 h-16 mx-auto text-orange-500 mb-4" />
              <h2 className="text-xl font-semibold text-orange-600 mb-2">Paiement en vérification</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Notre équipe vérifie votre paiement. Votre compte sera activé sous peu si le paiement est confirmé.
                </p>
              </div>
              <Button 
                onClick={() => setLocation('/')}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                Retour à l'accueil
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
