import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DnsPaymentUnconfirmed({ reference }: { reference?: string }) {
  return (
    <section role="status" className="space-y-4">
      <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-center shadow-sm">
        <AlertTriangle size={30} className="mx-auto mb-4 text-amber-700" />
        <h2 className="text-xl font-black text-amber-950">Paiement non confirmé</h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-900">
          Votre mise à jour DNS n’est pas encore activée. La vérification se poursuit automatiquement.
        </p>
        <p id="dns-retry-availability" className="mt-3 text-sm font-bold text-amber-950">
          Vous pourrez réessayer dès que l’échec sera confirmé. Si vous avez été débité, ne payez pas une seconde fois.
        </p>
        {reference && <p className="mt-4 break-all text-xs text-amber-800">Référence : {reference}</p>}
      </div>
      <button type="button" disabled aria-describedby="dns-retry-availability"
        data-testid="button-dns-retry-unconfirmed"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 p-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
        <RefreshCw size={18} /> Réessayer
      </button>
    </section>
  );
}
