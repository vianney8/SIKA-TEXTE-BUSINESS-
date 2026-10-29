import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import SimpleCheckout from "./SimpleCheckout";
import { type CheckoutModel, usesUnifiedCheckout } from "@shared/checkout-settings";
import { usesSolvexPaymentMode } from "@shared/checkout-settings";
import { CheckoutHandoff, type CheckoutDetails } from "./CheckoutHandoff";

export function useCheckoutMode() {
  return useQuery<{ enabled: boolean; countryModes?: Record<string, string>; model: CheckoutModel; customerId: string | null }>({
    queryKey: ["/api/checkout/mode"],
    queryFn: async () => {
      const response = await fetch("/api/checkout/mode", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Impossible de charger le modèle de paiement.");
      return response.json();
    },
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export default function PaymentCheckout({
  service, linkId, children, onSuccess, onCancel, directGateway = false,
}: {
  service: "activation" | "dns" | "ci-update" | "link";
  linkId?: string;
  children: ReactNode;
  onSuccess?: () => void;
  onCancel?: () => void;
  /** Skip a legacy pre-form when it would only reopen the same API form. */
  directGateway?: boolean;
}) {
  const mode = useCheckoutMode();
  const [alternative, setAlternative] = useState<CheckoutDetails | null>(null);
  if (mode.isPending || (!mode.isFetchedAfterMount && mode.isFetching)) return <div className="flex min-h-48 items-center justify-center" role="status"><Loader2 className="h-6 w-6 animate-spin" /><span className="sr-only">Chargement du paiement</span></div>;
  if (mode.isError) return <div className="p-6 text-center" role="alert"><p>Impossible de charger le modèle de paiement.</p><button className="mt-3 underline" onClick={() => mode.refetch()}>Réessayer</button></div>;
  let resuming = false;
  try {
    const saved = JSON.parse(sessionStorage.getItem(`sika-checkout:${mode.data.customerId ?? "guest"}:${service}:${linkId ?? ""}`) || "null");
    resuming = typeof saved?.transactionId === "string";
  } catch { /* No recoverable payment in this browser session. */ }
  const countryModes = mode.data.countryModes ?? {};
  const dnsAutomaticEnabled = Object.values(countryModes).some((countryMode) => usesSolvexPaymentMode("dns", countryMode));
  const serviceEnabled = service === "dns" ? dnsAutomaticEnabled : mode.data.enabled;
  const alternativeMode = alternative ? countryModes[alternative.country] : undefined;
  const useAlternative = alternative && (service === "dns" ? alternativeMode === "manual" : alternativeMode !== "solvexpay");
  const content = !resuming && (useAlternative || !serviceEnabled || !usesUnifiedCheckout(mode.data.model, directGateway))
    ? <CheckoutHandoff.Provider value={useAlternative ? alternative : null}>{children}</CheckoutHandoff.Provider>
    : <SimpleCheckout service={service} linkId={linkId} onSuccess={onSuccess} onCancel={onCancel} onAlternativePayment={setAlternative} />;
  return <div className="contents" data-checkout-model={mode.data.model}>{content}</div>;
}
