import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, AlertCircle, CheckCircle, Clock, Phone, User, Hash, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthUser {
  id: string;
  fullName: string;
  referralCode: string;
  phone: string;
}

type PageState = "form" | "pending" | "error";

export default function CiUpdatePage() {
  const { toast } = useToast();
  const [paymentPhone, setPaymentPhone] = useState("");
  const [inputError, setInputError] = useState("");
  const [pageState, setPageState] = useState<PageState>("form");

  const { data: user } = useQuery<AuthUser>({
    queryKey: ['/api/auth/user'],
  });

  const { data: ciStatus } = useQuery<{ ciUpdateAmount: number }>({
    queryKey: ['/api/user/ci-update-status'],
    refetchInterval: pageState === "pending" ? 8000 : false,
  });

  const amount = ciStatus?.ciUpdateAmount || 1200;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ci-update/submit', { paymentPhone: paymentPhone.trim() });
      return res.json();
    },
    onSuccess: () => {
      setPageState("pending");
    },
    onError: (error: any) => {
      const msg = error?.message || "Une erreur est survenue. Veuillez réessayer.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      setPageState("error");
    }
  });

  const handleSubmit = () => {
    if (!paymentPhone.trim()) {
      setInputError("Veuillez saisir votre numéro de paiement Mobile Money.");
      return;
    }
    if (paymentPhone.trim().length < 8) {
      setInputError("Le numéro saisi semble invalide. Veuillez vérifier.");
      return;
    }
    setInputError("");
    submitMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">

        {/* Card principale */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* En-tête gradient */}
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-8 py-8 text-center relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNi02aDZ2LTZoLTZ2NnptLTEyIDZoNnYtNmgtNnY2em0tNi02aDZ2LTZoLTZ2NnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50"></div>
            <div className="relative">
              <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Mise à jour requise
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                Plateforme SIKA TEXTE BUSINESS
              </p>
            </div>
          </div>

          <div className="px-8 py-6 space-y-5">

            {/* Alerte informative */}
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 leading-relaxed">
                <strong className="block mb-1">Action obligatoire</strong>
                Votre compte doit être mis à jour afin d'accéder à la nouvelle version sécurisée de la plateforme. Des frais de{" "}
                <span className="font-bold text-amber-700">{amount.toLocaleString("fr-FR")} FCFA</span> sont requis pour finaliser cette opération.
              </div>
            </div>

            {/* Fiche d'identité du compte */}
            {user && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Informations du compte
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 leading-none mb-0.5">Nom complet</p>
                      <p className="font-semibold text-slate-800 text-sm">{user.fullName}</p>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 leading-none mb-0.5">Numéro de compte</p>
                      <p className="font-semibold text-slate-800 text-sm font-mono tracking-wide">{user.referralCode || '—'}</p>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Hash className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 leading-none mb-0.5">Identifiant de compte</p>
                      <p className="font-mono text-xs text-slate-600 truncate">{user.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contenu selon l'état */}
            {pageState === "form" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="paymentPhone" className="text-sm font-semibold text-slate-700 mb-2 block">
                    Numéro Mobile Money pour le paiement
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="paymentPhone"
                      type="tel"
                      value={paymentPhone}
                      onChange={(e) => {
                        setPaymentPhone(e.target.value);
                        if (inputError) setInputError("");
                      }}
                      placeholder="Ex : 07 08 09 10 11"
                      className="pl-10 h-12 rounded-xl border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Saisissez le numéro depuis lequel vous effectuerez le virement de{" "}
                    <strong>{amount.toLocaleString("fr-FR")} FCFA</strong>
                  </p>
                  {inputError && (
                    <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {inputError}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="w-full h-13 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 transition-all duration-200 py-4"
                >
                  {submitMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Envoi en cours...
                    </span>
                  ) : (
                    "Soumettre ma demande de mise à jour"
                  )}
                </Button>
              </div>
            )}

            {pageState === "pending" && (
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-blue-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Demande transmise</h3>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                    Votre demande a été transmise à notre équipe. Votre accès sera restauré dans les plus brefs délais après validation.
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
                  <CheckCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Numéro enregistré : <strong>{paymentPhone}</strong>
                </div>
                <p className="text-xs text-slate-400">
                  La page se rafraîchira automatiquement dès validation.
                </p>
                <button
                  onClick={() => setPageState("form")}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                >
                  Modifier ma demande
                </button>
              </div>
            )}

            {pageState === "error" && (
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Une erreur est survenue</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Impossible de transmettre votre demande. Veuillez réessayer ou contacter le support.
                  </p>
                </div>
                <Button
                  onClick={() => setPageState("form")}
                  variant="outline"
                  className="rounded-xl border-slate-300"
                >
                  Réessayer
                </Button>
              </div>
            )}

          </div>

          {/* Pied de page */}
          <div className="px-8 pb-6">
            <p className="text-center text-xs text-slate-400 leading-relaxed">
              Votre accès à la plateforme sera pleinement restauré dès que notre équipe aura validé votre demande. Cette procédure est sécurisée et confidentielle.
            </p>
          </div>
        </div>

        {/* Badge sécurité */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-xs text-slate-400">Procédure sécurisée — SIKA TEXTE BUSINESS</p>
        </div>

      </div>
    </div>
  );
}
