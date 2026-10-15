import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import SimpleCheckout from "./SimpleCheckout";

export function useCheckoutMode() {
  return useQuery<{ enabled: boolean; model: "legacy" | "simple"; customerId: string | null }>({
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
  service, linkId, children, onSuccess, onCancel,
}: {
  service: "activation" | "dns" | "ci-update" | "link";
  linkId?: string;
  children: ReactNode;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const mode = useCheckoutMode();
  if (mode.isPending) return <div className="flex min-h-48 items-center justify-center" role="status"><Loader2 className="h-6 w-6 animate-spin" /><span className="sr-only">Chargement du paiement</span></div>;
  if (mode.isError) return <div className="p-6 text-center" role="alert"><p>Impossible de charger le modèle de paiement.</p><button className="mt-3 underline" onClick={() => mode.refetch()}>Réessayer</button></div>;
  let resuming = false;
  try {
    const saved = JSON.parse(sessionStorage.getItem(`sika-checkout:${mode.data.customerId ?? "guest"}:${service}:${linkId ?? ""}`) || "null");
    resuming = typeof saved?.transactionId === "string";
  } catch { /* No recoverable payment in this browser session. */ }
  if (!resuming && (!mode.data.enabled || mode.data.model !== "simple")) return <>{children}</>;
  return <SimpleCheckout service={service} linkId={linkId} onSuccess={onSuccess} onCancel={onCancel} />;
}
