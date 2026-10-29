import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { localPaymentPhone } from "@shared/payment-phone";
import { paymentCurrency } from "@shared/payment-currency";
import { shouldResumeDnsAttempt, type DnsPaymentStatus } from "@shared/dns-payment-state";
import { usesSolvexPaymentMode } from "@shared/checkout-settings";
import { requiresPaymentOtp, paymentOtpInstructions } from "@shared/payment-otp";
import { type CheckoutModel } from "@shared/checkout-settings";
import OperatorLogo from "./OperatorLogo";
import SolvexFeeNotice from "./SolvexFeeNotice";
import type { CheckoutDetails } from "./CheckoutHandoff";
import type { CountryPaymentMode } from "@shared/checkout-settings";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  Phone,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type Service = "activation" | "dns" | "ci-update" | "link";
type PaymentStatus = "pending" | "completed" | "failed";

type Operator = { code: string; name: string; maintenance: boolean };
type Country = {
  mode?: CountryPaymentMode;
  code: string;
  name: string;
  prefix: string;
  length: number;
  operators: Operator[];
};
type CheckoutConfig = {
  enabled: boolean;
  model: CheckoutModel;
  label: string;
  amount: number;
  currency: string;
  countries: Country[];
  requiresEmail: boolean;
  customerEmail?: string;
  customerName?: string;
  phone?: string;
  initialCountry?: string;
  customerId: string | null;
};
type CheckoutResult = {
  amount?: number;
  currency?: string;
  transactionId: string;
  status: PaymentStatus;
  createdAt?: string;
  providerAccepted?: boolean;
  message?: string;
  pcsCode?: string;
  paymentUrl?: string;
};
type StatusResult = {
  amount?: number;
  currency?: string;
  status: PaymentStatus;
  createdAt?: string;
  providerAccepted?: boolean;
  pcsCode?: string;
  message?: string;
};

type SimpleCheckoutProps = {
  onAlternativePayment?: (details: CheckoutDetails) => void;
  service: Service;
  linkId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const serviceNames: Record<Service, string> = {
  activation: "Activation du compte",
  dns: "Configuration DNS",
  "ci-update": "Mise à jour CI",
  link: "Paiement du service",
};

function formatAmount(amount: number, currency: string) {
  try {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
  } catch {
    return `${amount} ${currency}`;
  }
}

function sessionKey(service: Service, linkId: string | undefined, customerId: string | null) {
  return `sika-checkout:${customerId ?? "guest"}:${service}:${linkId ?? ""}`;
}

export default function SimpleCheckout({
  service,
  linkId,
  onSuccess,
  onCancel,
  onAlternativePayment,
}: SimpleCheckoutProps) {
  const queryClient = useQueryClient();
  const [countryCode, setCountryCode] = useState("");
  const [operatorCode, setOperatorCode] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [payerName, setPayerName] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<{ amount: number; currency: string } | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [providerAccepted, setProviderAccepted] = useState(false);
  const [pcsCode, setPcsCode] = useState("");
  const [statusError, setStatusError] = useState("");
  const [manualChecking, setManualChecking] = useState(false);
  const [resumeChecked, setResumeChecked] = useState(false);
  const successNotified = useRef(false);
  const checkingRef = useRef(false);
  const initializedConfig = useRef("");

  const configQuery = useQuery<CheckoutConfig>({
    queryKey: ["/api/checkout/config", service, linkId ?? ""],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const params = new URLSearchParams({ service });
      if (linkId) params.set("linkId", linkId);
      const response = await fetch(`/api/checkout/config?${params.toString()}`, {
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Impossible de charger les informations de paiement.");
      return data as CheckoutConfig;
    },
  });
  const config = configQuery.data;
  const countries = config?.countries ?? [];
  const country = countries.find((item) => item.code === countryCode);
  const selectedOperator = country?.operators.find((item) => item.code === operatorCode);
  // DNS automatic payments must use SolvexPay; the legacy RobotPay country
  // setting is not a reason to route DNS into the manual/old checkout.
  const automaticCountry = usesSolvexPaymentMode(service, country?.mode);
  const checkoutCurrency = automaticCountry
    ? paymentCurrency(countryCode, config?.currency || "XOF")
    : config?.currency || "XOF";
  const needsOtp = automaticCountry && requiresPaymentOtp(countryCode, operatorCode);
  const locked = paymentStatus === "pending";
  const key = useMemo(
    () => sessionKey(service, linkId, config?.customerId ?? null),
    [service, linkId, config?.customerId],
  );

  useEffect(() => {
    if (!config) return;
    const identity = `${service}:${linkId ?? ""}:${config.customerId ?? "guest"}`;
    if (initializedConfig.current === identity) return;
    initializedConfig.current = identity;
    setCountryCode(
      config.initialCountry && config.countries.some((item) => item.code === config.initialCountry)
        ? config.initialCountry
        : config.countries[0]?.code ?? "",
    );
    setOperatorCode("");
    setCustomerEmail(config.customerEmail ?? "");
    setPayerName(config.customerName ?? "");
    const initial = config.countries.find(item => item.code === config.initialCountry) || config.countries[0];
    setPhone(initial ? localPaymentPhone(config.phone ?? "", initial.prefix, initial.length) : "");
  }, [config, linkId, service]);

  const paymentIdentity = config ? `${service}:${linkId ?? ""}:${config.customerId ?? "guest"}` : null;
  useEffect(() => {
    if (!paymentIdentity) return;
    setTransactionId(null);
    setPaymentStatus(null);
    setPaymentAmount(null);
    setPaymentMessage("");
    setProviderAccepted(false);
    setPcsCode("");
    setStatusError("");
    successNotified.current = false;
    try {
      const parsed = JSON.parse(sessionStorage.getItem(key) || "null");
      const dnsAttempt = service === "dns" || linkId === "eedbc622";
      const resumeAllowed = !dnsAttempt || shouldResumeDnsAttempt(
        parsed?.transactionId, queryClient.getQueryData<DnsPaymentStatus>(["/api/withdrawal/dns-update-status"]),
      );
      if (typeof parsed?.transactionId === "string" && parsed.transactionId.length > 0 && resumeAllowed) {
        setTransactionId(parsed.transactionId);
        setPaymentStatus("pending");
        setProviderAccepted(parsed.providerAccepted === true);
        if (typeof parsed.message === "string") setPaymentMessage(parsed.message);
        if (typeof parsed.amount === "number" && Number.isFinite(parsed.amount) && typeof parsed.currency === "string") {
          setPaymentAmount({ amount: parsed.amount, currency: parsed.currency });
        }
      } else sessionStorage.removeItem(key);
    } catch { sessionStorage.removeItem(key); }
    setResumeChecked(true);
  }, [paymentIdentity, key, queryClient, service, linkId]);

  const finishSuccess = useCallback(
    (code?: string) => {
      setPaymentStatus("completed");
      setStatusError("");
      if (code) setPcsCode(code);
      sessionStorage.removeItem(key);
      if (!successNotified.current) {
        successNotified.current = true;
        const relevant = ["user", "account", "dns", "ci", "pcs", "withdrawal", "activation", "balance"];
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey.map(String).join("/").toLowerCase();
            return relevant.some((part) => queryKey.includes(part));
          },
        });
        onSuccess?.();
      }
    },
    [key, onSuccess, queryClient],
  );

  const applyStatus = useCallback(
    (result: StatusResult) => {
      if (typeof result.amount === "number" && Number.isFinite(result.amount)) {
        setPaymentAmount({ amount: result.amount, currency: result.currency || config?.currency || "XOF" });
      }
      setPaymentMessage(result.message || (result.providerAccepted ? "Validez la demande sur votre téléphone." : ""));
      setProviderAccepted(result.providerAccepted === true);
      if (result.status === "completed") finishSuccess(result.pcsCode);
      else if (result.status === "failed") {
        setPaymentStatus("failed");
        setStatusError("");
        if (result.pcsCode) setPcsCode(result.pcsCode);
        sessionStorage.removeItem(key);
      } else {
        setPaymentStatus("pending");
      }
    },
    [finishSuccess, key, config?.currency],
  );

  const checkStatus = useCallback(
    async (manual = false) => {
      if (!transactionId || checkingRef.current || paymentStatus === "completed" || paymentStatus === "failed") return;
      checkingRef.current = true;
      if (manual) setManualChecking(true);
      try {
        const response = await fetch(
          `/api/checkout/status/${encodeURIComponent(transactionId)}`,
          { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(20000) },
        );
        const result = (await response.json().catch(() => ({}))) as StatusResult & { message?: string };
        if (!response.ok) throw new Error(result.message || "La vérification a échoué.");
        setStatusError("");
        applyStatus(result);
      } catch (error) {
        setStatusError(error instanceof Error ? error.message : "Erreur réseau. Réessayez.");
      } finally {
        checkingRef.current = false;
        setManualChecking(false);
      }
    },
    [applyStatus, paymentStatus, transactionId],
  );

  useEffect(() => {
    if (!transactionId || paymentStatus !== "pending") return;
    const poll = () => {
      if (document.visibilityState === "visible") void checkStatus();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") poll();
    };
    poll();
    const interval = window.setInterval(poll, 5000);
    window.addEventListener("focus", poll);
    window.addEventListener("online", poll);
    window.addEventListener("pageshow", poll);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", poll);
      window.removeEventListener("online", poll);
      window.removeEventListener("pageshow", poll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkStatus, paymentStatus, transactionId]);

  const initMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/checkout/init", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          linkId,
          country: countryCode,
          operator: operatorCode,
          phone: `+${country?.prefix ?? ""}${phone.replace(/\D/g, "")}`,
          ...(needsOtp ? { otp: otp.trim() } : {}),
          customerName: payerName.trim(),
          expectedAmount: config?.amount,
          expectedCurrency: checkoutCurrency,
          ...(config?.requiresEmail ? { customerEmail: customerEmail.trim() } : {}),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as CheckoutResult;
      if (!response.ok) {
        if (response.status === 409) void configQuery.refetch();
        throw new Error(result.message || "Le paiement n'a pas pu être lancé.");
      }
      if (!result.transactionId || !["pending", "completed", "failed"].includes(result.status)) {
        throw new Error("Réponse de paiement invalide. Veuillez réessayer.");
      }
      return result;
    },
    onSettled: () => {
      if (service === "dns" || linkId === "eedbc622") {
        void queryClient.invalidateQueries({ queryKey: ["/api/withdrawal/dns-update-status"] });
      }
    },
    onSuccess: (result) => {
      const chargedAmount = { amount: result.amount ?? config!.amount, currency: result.currency || config!.currency };
      setPaymentAmount(chargedAmount);
      setTransactionId(result.transactionId);
      setPaymentMessage(result.message ?? "");
      setProviderAccepted(result.providerAccepted === true);
      setPcsCode(result.pcsCode ?? "");
      setStatusError("");
      if (result.status === "pending") {
        setPaymentStatus("pending");
        sessionStorage.setItem(key, JSON.stringify({
          transactionId: result.transactionId,
          status: "pending",
          message: result.message ?? "",
          providerAccepted: result.providerAccepted === true,
          createdAt: result.createdAt,
          ...chargedAmount,
        }));
        if (result.paymentUrl) {
          let redirectUrl: URL | null = null;
          try {
            redirectUrl = new URL(result.paymentUrl);
          } catch {
            redirectUrl = null;
          }
          if (redirectUrl?.protocol === "https:") {
            window.location.assign(redirectUrl.toString());
          } else {
            setStatusError("L'adresse de paiement reçue n'est pas sécurisée. Vérifiez le statut avant de réessayer.");
          }
        } else if (result.message) {
          setPaymentMessage(result.message);
        }
      } else if (result.status === "completed") {
        finishSuccess(result.pcsCode);
      } else {
        setPaymentStatus("failed");
        sessionStorage.removeItem(key);
      }
    },
  });

  const retry = () => {
    setPaymentAmount(null);
    setTransactionId(null);
    setPaymentStatus(null);
    setPaymentMessage("");
    setPcsCode("");
    setProviderAccepted(false);
    setStatusError("");
    setOtp("");
    sessionStorage.removeItem(key);
  };

  const validPhone = !!country && localPaymentPhone(phone, country.prefix, country.length).length === country.length;
  const validEmail = !config?.requiresEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const canPay =
    Boolean(config?.enabled && country && selectedOperator && !selectedOperator.maintenance) &&
    validPhone &&
    (config?.model !== "pro" || payerName.trim().length >= 3) &&
    validEmail &&
    (!needsOtp || /^\d{4,10}$/.test(otp.trim())) &&
    !locked &&
    !initMutation.isPending;

  const cancel = () => {
    if (onCancel) onCancel();
    else if (window.history.length > 1) window.history.back();
    else window.location.assign("/");
  };

  if (configQuery.isPending || (!configQuery.isFetchedAfterMount && configQuery.isFetching) || (!!config && !resumeChecked)) {
    return (
      <main className="sika-checkout min-h-[100dvh] flex items-center justify-center p-4">
        <section className="checkout-card w-full max-w-[440px] p-6" aria-label="Chargement du paiement">
          <div className="skeleton-line w-28 h-5 mb-5" />
          <div className="skeleton-line w-3/5 h-9 mb-8" />
          <div className="skeleton-line w-full h-12 mb-4" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="skeleton-line h-14" />
            <div className="skeleton-line h-14" />
          </div>
          <div className="skeleton-line w-full h-12" />
        </section>
      </main>
    );
  }

  if ((configQuery.isError && !transactionId) || !config) {
    return (
      <main className="sika-checkout min-h-[100dvh] flex items-center justify-center p-4">
        <section className="checkout-card w-full max-w-[440px] p-7 text-center">
          <div className="checkout-status-icon checkout-error-icon mx-auto mb-4"><AlertCircle size={24} /></div>
          <h1 className="checkout-heading text-xl">Paiement indisponible</h1>
          <p className="checkout-muted mt-2 text-sm">{configQuery.error instanceof Error ? configQuery.error.message : "Une erreur est survenue."}</p>
          <button type="button" className="checkout-button mt-6 w-full" onClick={() => void configQuery.refetch()}>
            Réessayer
          </button>
          <button type="button" className="checkout-text-button mt-4" onClick={cancel}>Retour</button>
        </section>
      </main>
    );
  }

  // The caller selects the presentation. Legacy DNS/CI forms also delegate to
  // this gateway, so a presentation choice must never disable an enabled API.
  if (!config.enabled && !(transactionId && paymentStatus)) {
    return (
      <main className="sika-checkout min-h-[100dvh] flex items-center justify-center p-4">
        <section className="checkout-card w-full max-w-[440px] p-7 text-center">
          <div className="checkout-status-icon checkout-error-icon mx-auto mb-4"><AlertCircle size={24} /></div>
          <h1 className="checkout-heading text-xl">Paiements indisponibles</h1>
          <p className="checkout-muted mt-2 text-sm">
            Le paiement de ce service est momentanément désactivé. Veuillez réessayer plus tard.
          </p>
          <button type="button" className="checkout-text-button mt-5" onClick={cancel}>Retour</button>
        </section>
      </main>
    );
  }

  return (
    <main className="sika-checkout min-h-[100dvh] flex items-center justify-center p-3 sm:p-6">
      <section className="checkout-card w-full max-w-[440px] overflow-hidden" aria-labelledby="checkout-title">
        <div className="checkout-content p-5 sm:p-7">
          <header className="checkout-summary flex items-center justify-between gap-3 pb-5">
            <div className="checkout-merchant flex min-w-0 flex-1 items-center gap-2.5">
              <img src="/logo.jpg" alt="Logo SIKA Services" className="checkout-brand-logo" />
              <div className="checkout-merchant-copy min-w-0 flex-1">
                <h1 id="checkout-title" className="checkout-heading checkout-service-title">{config.label || serviceNames[service]}</h1>
                <p className="checkout-merchant-name mt-1">SIKA TEXTE</p>
                {config.customerName && <p className="checkout-muted checkout-customer-name">{config.customerName}</p>}
              </div>
            </div>
            <p className="checkout-price shrink-0">{formatAmount(paymentAmount?.amount ?? config.amount, paymentAmount?.currency ?? checkoutCurrency)}</p>
          </header>

          {paymentStatus === "pending" ? (
            <div className="checkout-pending border-t pt-6" aria-live="polite">
              <div className="phone-orbit is-pending mx-auto mb-5" aria-hidden="true">
                <span className="orbit orbit-one" />
                <span className="orbit orbit-two" />
                <span className="orbit orbit-three" />
                <span className="phone-glyph"><Phone size={24} /></span>
                <span className="orbit-dot"><ShieldCheck size={13} /></span>
              </div>
              <div className="text-center">
                <h2 className="checkout-heading text-xl">{providerAccepted ? "Validez sur votre téléphone" : "Paiement en cours d'initialisation"}</h2>
                <p className="checkout-muted mt-2 text-sm">
                  {providerAccepted
                    ? "Une demande de paiement a été acceptée par l’opérateur. Confirmez-la dans votre application Mobile Money."
                    : "Nous attendons la confirmation de l’opérateur. Ne relancez pas le paiement ; cette page se mettra à jour automatiquement."}
                </p>
              </div>
              <div className="checkout-progress mt-5" aria-label="Progression : validation en cours">
                <div className="progress-step is-done"><span><Check size={13} /></span><small>Demande</small></div>
                <i className="progress-line is-done" />
                <div className="progress-step is-current"><span>2</span><small>Validation</small></div>
                <i className="progress-line" />
                <div className="progress-step"><span>3</span><small>Confirmation</small></div>
              </div>
              <div className="checkout-amount-row mt-5">
                <span>Montant</span><strong>{formatAmount(paymentAmount?.amount ?? config.amount, paymentAmount?.currency ?? checkoutCurrency)}</strong>
              </div>
              <div className="checkout-instructions mt-5">
                <div className="flex items-start gap-2.5">
                  <Phone size={16} className="checkout-accent mt-0.5 shrink-0" />
                  <p>{providerAccepted ? "Consultez votre téléphone et suivez les instructions de votre opérateur." : "La confirmation du fournisseur n’est pas encore disponible."}</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <RefreshCw size={16} className="checkout-accent mt-0.5 shrink-0" />
                  <p>Nous vérifions automatiquement votre paiement toutes les 5 secondes.</p>
                </div>
              </div>
              {providerAccepted && paymentMessage && <p className="checkout-muted mt-3 text-sm">{paymentMessage}</p>}
              {statusError && (
                <div className="checkout-alert checkout-alert-error mt-4" role="alert">
                  <AlertCircle size={17} className="shrink-0" />
                  <p>{statusError}</p>
                </div>
              )}
              <button type="button" className="checkout-button mt-5 w-full" onClick={() => void checkStatus(true)} disabled={manualChecking}>
                {manualChecking ? <LoaderCircle size={18} className="animate-spin" /> : <RefreshCw size={17} />}
                {manualChecking ? "Vérification…" : "Vérifier le paiement"}
              </button>
              <button type="button" className="checkout-text-button mt-3 w-full" onClick={cancel}>
                Quitter cette page sans interrompre le paiement
              </button>
              <p className="checkout-muted mt-3 break-all text-center text-[11px]">Référence : {transactionId}</p>
            </div>
          ) : paymentStatus === "completed" ? (
            <div className="border-t pt-7 text-center" aria-live="polite">
              <div className="checkout-status-icon checkout-success-icon mx-auto mb-4"><CheckCircle2 size={28} /></div>
              <h2 className="checkout-heading text-xl">Paiement confirmé</h2>
              <div className="checkout-progress mt-5" aria-label="Progression : paiement confirmé">
                <div className="progress-step is-done"><span><Check size={13} /></span><small>Demande</small></div>
                <i className="progress-line is-done" />
                <div className="progress-step is-done"><span><Check size={13} /></span><small>Validation</small></div>
                <i className="progress-line is-done" />
                <div className="progress-step is-done"><span><Check size={13} /></span><small>Confirmation</small></div>
              </div>
              <p className="checkout-muted mt-2 text-sm">{paymentMessage || "Votre paiement a bien été confirmé."}</p>
              {pcsCode && (
                <div className="checkout-code mt-5">
                  <p className="checkout-muted text-xs">Votre code PCS</p>
                  <p className="mt-1 break-all font-mono text-lg font-bold tracking-wide">{pcsCode}</p>
                </div>
              )}
              <button type="button" className="checkout-button mt-6 w-full" onClick={cancel}>Terminé</button>
            </div>
          ) : paymentStatus === "failed" ? (
            <div className="border-t pt-7 text-center" aria-live="polite">
              <div className="checkout-status-icon checkout-error-icon mx-auto mb-4"><XCircle size={28} /></div>
              <h2 className="checkout-heading text-xl">Paiement non abouti</h2>
              <div className="checkout-progress mt-5" aria-label="Progression : paiement non abouti">
                <div className="progress-step is-done"><span><Check size={13} /></span><small>Demande</small></div>
                <i className="progress-line is-done" />
                <div className="progress-step is-error"><span><XCircle size={13} /></span><small>Validation</small></div>
                <i className="progress-line" />
                <div className="progress-step"><span>3</span><small>Confirmation</small></div>
              </div>
              <p className="checkout-muted mt-2 text-sm">{paymentMessage || "La transaction n'a pas été confirmée. Vérifiez votre téléphone puis réessayez."}</p>
              <button type="button" className="checkout-button mt-6 w-full" onClick={retry}>Réessayer le paiement <ArrowRight size={17} /></button>
            </div>
          ) : (
            <form
              className="checkout-form border-t pt-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (!canPay) return;
                if (!automaticCountry && country && onAlternativePayment) {
                  onAlternativePayment({ country: country.code, operator: operatorCode, phone: localPaymentPhone(phone, country.prefix, country.length), payerName: payerName.trim(), customerEmail, mode: country.mode! });
                } else initMutation.mutate();
              }}
            >
              <button
                type="button"
                className="checkout-text-button mb-5 inline-flex min-h-11 items-center gap-2"
                onClick={cancel}
              >
                <ArrowLeft size={17} aria-hidden="true" />
                Retour
              </button>
              {config.model === "pro" && <>
              <label className="checkout-label block" htmlFor="checkout-payer-name">Nom complet du payeur</label>
              <input id="checkout-payer-name" className="checkout-input mt-2 w-full" autoComplete="name"
                value={payerName} onChange={event => setPayerName(event.target.value)} placeholder="Ex. Awa Kouassi" required disabled={locked || initMutation.isPending} />
              <p className="checkout-muted mt-1 text-xs">Nom associé au moyen de paiement utilisé.</p>
              </>}
              <label className="checkout-label" htmlFor="checkout-country">Pays</label>
              <div className="checkout-select-wrap mt-2">
                <select
                  id="checkout-country"
                  className="checkout-input checkout-select w-full"
                  value={countryCode}
                  onChange={(event) => {
                    setCountryCode(event.target.value);
                    setOperatorCode("");
                    setPhone("");
                    setOtp("");
                  }}
                  required
                  disabled={locked || initMutation.isPending}
                >
                  <option value="" disabled>Choisir un pays</option>
                  {countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                </select>
                <ChevronDown size={17} aria-hidden="true" />
              </div>

              {country?.mode && <p className="checkout-muted mt-2 text-xs" role="status">
                {country.mode === "manual" ? "Dépôt manuel : les coordonnées de dépôt et le justificatif seront demandés à l’étape suivante."
                  : (country.mode === "solvexpay" || service === "dns") ? "Paiement automatique pour ce pays."
                  : country.mode === "redirect" ? "Paiement par lien externe pour ce pays."
                  : "Paiement via le prestataire configuré pour ce pays."}
              </p>}
              <fieldset className="mt-5 min-w-0" disabled={locked || initMutation.isPending}>
                <legend className="checkout-label mb-2">Moyen de paiement</legend>
                {country?.operators.length ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {country.operators.map((operator) => {
                      const selected = operator.code === operatorCode;
                      return (
                        <button
                          key={operator.code}
                          type="button"
                          onClick={() => setOperatorCode(operator.code)}
                          disabled={operator.maintenance}
                          aria-pressed={selected}
                          className={`checkout-operator${selected ? " is-selected" : ""}${operator.maintenance ? " is-maintenance" : ""}`}
                        >
                          <OperatorLogo code={operator.code} size={36} />
                          <span className="operator-label">{operator.name}</span>
                          {selected && <Check size={15} className="operator-check" aria-hidden="true" />}
                          {operator.maintenance && <span className="operator-maintenance">Maintenance</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="checkout-muted rounded-xl border p-3 text-sm">Aucun moyen de paiement disponible pour ce pays.</p>
                )}
              </fieldset>

              <label className="checkout-label mt-5 block" htmlFor="checkout-phone">Numéro de téléphone</label>
              <div className="checkout-phone-field mt-2 flex items-center">
                <Phone size={16} className="checkout-muted shrink-0" aria-hidden="true" />
                <span className="checkout-prefix">+{country?.prefix || "—"}</span>
                <input
                  id="checkout-phone"
                  className="checkout-phone-input min-w-0 flex-1"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Votre numéro"
                  aria-describedby="phone-hint"
                  required
                  disabled={locked || initMutation.isPending}
                />
              </div>
              <p id="phone-hint" className="checkout-muted mt-1.5 text-xs">Saisissez le numéro associé à votre compte Mobile Money.</p>

              {needsOtp && (
                <div className="checkout-otp-panel mt-4">
                  <p className="checkout-otp-title">Confirmation Orange Money</p>
                  <p className="checkout-muted mt-1 text-xs">{paymentOtpInstructions(countryCode)}</p>
                  <label className="checkout-label mt-3 block" htmlFor="checkout-otp">Code de confirmation</label>
                  <input
                    id="checkout-otp"
                    className="checkout-input mt-1.5 w-full"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="Code de paiement Orange Money"
                    required
                    disabled={locked || initMutation.isPending}
                  />
                </div>
              )}

              {config.requiresEmail && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="checkout-label block" htmlFor="checkout-email">E-mail du compte Sika</label>
                    <input
                      id="checkout-email"
                      className="checkout-input mt-1.5 w-full"
                      type="email"
                      autoComplete="email"
                      value={customerEmail}
                      onChange={(event) => { if (!config.customerId) setCustomerEmail(event.target.value); }}
                      placeholder="nom@exemple.com"
                      required
                      disabled={locked || initMutation.isPending}
                      readOnly={Boolean(config.customerId)}
                      aria-describedby={config.customerId ? "checkout-email-hint" : undefined}
                    />
                    {config.customerId && <p id="checkout-email-hint" className="checkout-muted mt-1 text-xs">Adresse associée à votre compte SIKA TEXTE.</p>}
                  </div>
                </div>
              )}

              {initMutation.isError && (
                <div className="checkout-alert checkout-alert-error mt-4" role="alert">
                  <AlertCircle size={17} className="shrink-0" />
                  <p>{initMutation.error instanceof Error ? initMutation.error.message : "Erreur lors de l'initialisation du paiement."}</p>
                </div>
              )}

              {automaticCountry && <SolvexFeeNotice />}
              <button type="submit" className="checkout-button mt-5 w-full" disabled={!canPay}>
                {initMutation.isPending ? <LoaderCircle size={18} className="animate-spin" /> : null}
                {initMutation.isPending ? "Connexion…" : <>{automaticCountry ? "Payer" : "Continuer ·"} {formatAmount(config.amount, checkoutCurrency)} <ArrowRight size={18} /></>}
              </button>
              <div className="checkout-secure mt-4 flex items-center justify-center gap-1.5">
                <LockKeyhole size={13} />
                <span>Paiement sécurisé par SIKApay</span>
              </div>
            </form>
          )}
        </div>

        {(paymentStatus === "pending" || paymentStatus === "completed" || paymentStatus === "failed") && (
          <footer className="checkout-footer flex items-center justify-center gap-1.5 px-4 py-4">
            <ShieldCheck size={14} />
            <span>Paiement sécurisé par SIKApay</span>
          </footer>
        )}
      </section>

      <style>{`
        .sika-checkout {
          --ink: #10162d;
          --muted: #788397;
          --line: #e2e7ef;
          --wash: #f1f4f8;
          --accent: #6843c5;
          --accent-dark: #50319f;
          box-sizing: border-box;
          color: var(--ink);
          background: #f2f0f8;
          font-family: "DM Sans", "Segoe UI", sans-serif;
          padding-top: max(12px, env(safe-area-inset-top));
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }
        .sika-checkout *, .sika-checkout *::before, .sika-checkout *::after { box-sizing: border-box; }
        .checkout-card {
          border: 1px solid rgba(222, 228, 238, .84);
          border-radius: 30px;
          background: #fff;
          box-shadow: 0 22px 60px rgba(49, 34, 91, .12), 0 3px 10px rgba(36,55,97,.04);
        }
        .checkout-content { min-width: 0; }
        .checkout-summary { border-bottom: 1px solid #eef0f4; }
        .checkout-brand-logo {
          display: block; width: 50px; height: 50px; flex: 0 0 50px;
          border: 1px solid #eef0f4; border-radius: 13px; background: #fff; object-fit: contain;
        }
        .checkout-heading { color: var(--ink); font-weight: 750; letter-spacing: -.035em; line-height: 1.2; }
        .checkout-service-title {
          overflow-wrap: anywhere; white-space: normal; font-size: clamp(14px, 3.8vw, 18px);
        }
        .checkout-merchant-name {
          color: #454e60; font-size: 11px; font-weight: 750; letter-spacing: .04em; line-height: 1.2;
        }
        .checkout-customer-name { margin-top: 2px; overflow-wrap: anywhere; font-size: 11px; line-height: 1.25; }
        .checkout-muted { color: var(--muted); }
        .checkout-price { color: var(--ink); font-size: clamp(15px, 4vw, 19px); font-weight: 800; letter-spacing: -.025em; }
        .checkout-label { color: #596579; font-size: 13px; font-weight: 650; }
        .checkout-input, .checkout-phone-field {
          height: 48px; border: 1px solid var(--line); border-radius: 13px; background: var(--wash);
          color: var(--ink); font: inherit; font-size: 15px; outline: none; transition: border-color .16s ease, box-shadow .16s ease;
        }
        .checkout-input { padding: 0 14px; }
        .checkout-input:focus, .checkout-phone-field:focus-within {
          border-color: #648e88; box-shadow: 0 0 0 3px rgba(22,122,112,.12);
        }
        .checkout-input:disabled, .checkout-phone-input:disabled { opacity: .75; }
        .checkout-select-wrap { position: relative; }
        .checkout-select { appearance: none; padding-right: 42px; }
        .checkout-select-wrap > svg { position: absolute; top: 50%; right: 14px; transform: translateY(-50%); color: #7f8998; pointer-events: none; }
        .checkout-operator {
          position: relative; display: flex; min-width: 0; min-height: 58px; align-items: center; gap: 9px;
          border: 1px solid var(--line); border-radius: 14px; background: #fff; padding: 9px 10px;
          color: #283146; text-align: left; transition: border-color .16s ease, background-color .16s ease, transform .16s ease;
        }
        .checkout-operator:not(:disabled) { cursor: pointer; }
        .checkout-operator:not(:disabled):active { transform: scale(.985); }
        .checkout-operator.is-selected { border: 1.5px solid #17203b; background: #f1f5f9; }
        .checkout-operator.is-maintenance { opacity: .58; cursor: not-allowed; }
        .operator-initials {
          display: flex; width: 31px; height: 31px; flex: 0 0 31px; align-items: center; justify-content: center;
          border-radius: 50%; background: #e8edf2; color: #344154; font-size: 9px; font-weight: 800; letter-spacing: -.025em;
        }
        .operator-label { overflow: hidden; color: #344052; font-size: 12px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
        .operator-check { margin-left: auto; flex: 0 0 auto; color: var(--accent); }
        .operator-maintenance { position: absolute; right: 6px; bottom: 2px; color: #aa5b41; font-size: 8px; font-weight: 700; }
        .checkout-phone-field { gap: 10px; padding: 0 13px; }
        .checkout-prefix { border-right: 1px solid #dce2ea; padding-right: 10px; color: #697589; font-size: 14px; white-space: nowrap; }
        .checkout-phone-input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; font-size: 15px; }
        .checkout-phone-input::placeholder { color: #98a2b0; }
        .checkout-otp-panel { border: 1px solid #e5d8c1; border-radius: 14px; background: #fbf8f1; padding: 13px; }
        .checkout-otp-title { color: #574728; font-size: 13px; font-weight: 750; }
        .checkout-button {
          display: flex; min-height: 54px; align-items: center; justify-content: center; gap: 9px;
          border: 0; border-radius: 14px; background: #10162d; color: #fff;
          font: inherit; font-size: 15px; font-weight: 750; letter-spacing: -.01em;
          cursor: pointer; transition: background-color .16s ease, transform .16s ease, opacity .16s ease;
        }
        .checkout-button:not(:disabled):hover { background: #1d294a; }
        .checkout-button:not(:disabled):active { transform: scale(.99); }
        .checkout-button:disabled { cursor: not-allowed; opacity: .48; }
        .checkout-secure, .checkout-footer { color: #a0a9b7; font-size: 12px; }
        .checkout-footer { border-top: 1px solid #f0f2f5; background: #fafbfd; }
        .checkout-text-button { border: 0; background: none; color: #697589; font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; }
        .checkout-text-button:hover { color: var(--ink); }
        .checkout-status-icon { display: flex; width: 58px; height: 58px; align-items: center; justify-content: center; border-radius: 50%; }
        .checkout-pending-icon { background: #eff3f8; color: #576984; }
        .checkout-success-icon { background: #e2f4ed; color: #147561; }
        .checkout-error-icon { background: #f9e9e6; color: #b45245; }
        .checkout-instructions { display: grid; gap: 12px; border: 1px solid #e3ece8; border-radius: 15px; background: #f5f9f7; padding: 14px; color: #53636c; font-size: 13px; line-height: 1.5; }
        .checkout-accent { color: var(--accent); }
        .checkout-alert { display: flex; align-items: flex-start; gap: 9px; border-radius: 12px; padding: 11px 12px; font-size: 13px; line-height: 1.4; }
        .checkout-alert-error { border: 1px solid #f1d8d3; background: #fff6f4; color: #9e4438; }
        .checkout-code { border: 1px dashed #bfd8d0; border-radius: 14px; background: #f4faf7; padding: 14px; color: var(--ink); }
        .phone-orbit { position: relative; width: 148px; height: 148px; display: grid; place-items: center; color: #6843c5; }
        .orbit { position: absolute; inset: 8px; border: 1.5px solid rgba(104,67,197,.2); border-radius: 50%; }
        .orbit-one { inset: 3px; border-color: #6843c5; }
        .orbit-two { inset: 17px; }
        .orbit-three { inset: 32px; }
        .phone-glyph { width: 62px; height: 62px; display: grid; place-items: center; border-radius: 20px; background: #f5f1ff; }
        .orbit-dot { position: absolute; right: 15px; top: 19px; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; background: #6843c5; color: white; box-shadow: 0 4px 10px rgba(104,67,197,.24); }
        .checkout-progress { display: flex; align-items: flex-start; gap: 7px; }
        .progress-step { min-width: 58px; display: flex; flex-direction: column; align-items: center; gap: 6px; color: #a5a2ae; }
        .progress-step span { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; border: 1px solid #dedbe7; background: #f8f7fa; color: #9994a3; font-size: 11px; font-weight: 750; }
        .progress-step small { font-size: 10px; font-weight: 650; white-space: nowrap; }
        .progress-step.is-done span { background: #6843c5; color: white; border-color: #6843c5; }
        .progress-step.is-done small { color: #625a70; }
        .progress-step.is-current span { background: #fff; border: 2px solid #6843c5; color: #6843c5; }
        .progress-step.is-current small { color: #6843c5; }
        .progress-step.is-error span { border-color: #bd6158; background: #fbefed; color: #a54b42; }
        .progress-step.is-error small { color: #a54b42; }
        .progress-line { height: 1px; flex: 1; margin-top: 13px; background: #e5e2eb; }
        .progress-line.is-done { background: #6843c5; }
        .checkout-amount-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 3px 0; border-top: 1px solid #eeebf2; color: #85808e; font-size: 14px; }
        .checkout-amount-row strong { color: #201d29; font-size: 20px; letter-spacing: -.03em; }
        .skeleton-line { border-radius: 10px; background: linear-gradient(90deg, #edf0f4 25%, #f5f6f8 50%, #edf0f4 75%); background-size: 200% 100%; animation: checkout-shimmer 1.5s ease-in-out infinite; }
        @keyframes checkout-shimmer { to { background-position: -200% 0; } }
        @media (max-width: 380px) {
          .checkout-card { border-radius: 22px; }
          .checkout-content { padding: 18px; }
          .checkout-brand-logo { width: 44px; height: 44px; flex-basis: 44px; }
          .checkout-operator { gap: 7px; padding: 8px; }
          .operator-initials { width: 28px; height: 28px; flex-basis: 28px; }
          .operator-label { font-size: 11px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sika-checkout *, .sika-checkout *::before, .sika-checkout *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }
      `}</style>
    </main>
  );
}
