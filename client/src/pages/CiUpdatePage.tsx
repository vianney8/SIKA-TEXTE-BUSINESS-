import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function CiUpdatePage() {
  const { data } = useQuery<{ ciUpdateLink: string }>({
    queryKey: ['/api/user/ci-update-status'],
  });

  const updateLink = data?.ciUpdateLink || '#';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">

        {/* Logo mise à jour */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
            <RefreshCw className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Titre */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mise à jour requise</h1>
          <div className="mt-2 inline-block bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
            Action requise
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3 text-sm text-gray-600 text-left bg-orange-50 border border-orange-100 rounded-xl p-4">
          <p>
            Votre compte nécessite une <strong>mise à jour obligatoire</strong> pour accéder à la nouvelle version de la plateforme.
          </p>
          <p>
            ✅ Après validation, <strong>tous vos retraits en attente</strong> seront automatiquement traités.
          </p>
          <p>
            👉 Cliquez sur le bouton ci-dessous pour soumettre votre demande de mise à jour. L'administrateur validera votre compte dans les plus brefs délais.
          </p>
        </div>

        {/* Bouton */}
        <Button
          asChild
          size="lg"
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-base py-6 rounded-xl shadow"
        >
          <a href={updateLink} target="_blank" rel="noopener noreferrer">
            <RefreshCw className="w-5 h-5 mr-2" />
            Demander la mise à jour
          </a>
        </Button>

        <p className="text-xs text-gray-400">
          Votre accès sera restauré dès que l'administrateur aura validé votre demande.
        </p>
      </div>
    </div>
  );
}
