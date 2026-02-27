import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, AlertCircle } from "lucide-react";

interface CiStatus {
  ciUpdateLink: string;
  ciUpdateAmount: number;
}

export default function CiUpdatePage() {
  const [sikaAccount, setSikaAccount] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [error, setError] = useState("");

  const { data } = useQuery<CiStatus>({
    queryKey: ['/api/user/ci-update-status'],
  });

  const amount = data?.ciUpdateAmount || 1200;
  const updateLink = data?.ciUpdateLink || '#';

  const handleProceed = () => {
    if (!sikaAccount.trim()) {
      setError("Veuillez saisir votre numéro de compte Sika.");
      return;
    }
    if (!paymentPhone.trim()) {
      setError("Veuillez saisir le numéro pour effectuer le paiement.");
      return;
    }
    setError("");
    setShowLink(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">

        {/* Logo */}
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg mx-auto">
            <RefreshCw className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Mise à jour requise</h1>
          <span className="inline-block bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full mt-2">
            Action requise
          </span>
        </div>

        {/* Explication */}
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-gray-600 space-y-2">
          <p>
            Votre compte nécessite une <strong>mise à jour obligatoire</strong> pour accéder à la nouvelle version de la plateforme.
          </p>
          <p>
            👉 Pour effectuer la mise à jour, veuillez payer{" "}
            <strong className="text-orange-600">{amount.toLocaleString("fr-FR")} FCFA</strong>{" "}
            via le lien ci-dessous.
          </p>
          <p>
            ✅ Après validation par l'administrateur, votre compte sera pleinement restauré.
          </p>
        </div>

        {!showLink ? (
          <>
            {/* Formulaire */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="sikaAccount" className="text-sm font-medium text-gray-700">
                  Numéro de votre compte Sika
                </Label>
                <Input
                  id="sikaAccount"
                  value={sikaAccount}
                  onChange={(e) => setSikaAccount(e.target.value)}
                  placeholder="Ex: 2250102030405"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="paymentPhone" className="text-sm font-medium text-gray-700">
                  Numéro pour effectuer le paiement
                </Label>
                <Input
                  id="paymentPhone"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  placeholder="Ex: 0708090000"
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Numéro Mobile Money avec lequel vous allez payer les {amount.toLocaleString("fr-FR")} FCFA
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleProceed}
                size="lg"
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-base py-6 rounded-xl shadow"
              >
                Continuer
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Résumé + lien */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-blue-800">Résumé de votre demande</p>
              <p className="text-gray-600">Compte Sika : <strong>{sikaAccount}</strong></p>
              <p className="text-gray-600">N° paiement : <strong>{paymentPhone}</strong></p>
              <p className="text-gray-600">Montant : <strong className="text-orange-600">{amount.toLocaleString("fr-FR")} FCFA</strong></p>
            </div>

            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-base py-6 rounded-xl shadow"
            >
              <a href={updateLink} target="_blank" rel="noopener noreferrer">
                <RefreshCw className="w-5 h-5 mr-2" />
                Effectuer le paiement de {amount.toLocaleString("fr-FR")} FCFA
              </a>
            </Button>

            <button
              onClick={() => setShowLink(false)}
              className="w-full text-sm text-gray-400 underline text-center"
            >
              ← Modifier mes informations
            </button>
          </>
        )}

        <p className="text-xs text-gray-400 text-center">
          Votre accès sera restauré dès que l'administrateur aura validé votre demande.
        </p>
      </div>
    </div>
  );
}
