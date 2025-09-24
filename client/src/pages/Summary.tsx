import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Users, TrendingUp, Shield } from "lucide-react";
import { Link } from "wouter";

export default function Summary() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-blue-600">
      {/* Header */}
      <div className="px-6 py-4 flex items-center text-white">
        <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10">
          <Link href="/" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h1 className="ml-4 text-lg font-semibold">À propos de SIKA TEXTE</h1>
      </div>

      <div className="px-6 pb-6 space-y-6">
        {/* Mission */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Notre Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              SIKA TEXTE BUSINESS est une plateforme européenne innovante qui lutte contre le chômage en Afrique. 
              Nous offrons aux utilisateurs la possibilité de gagner un revenu quotidien en corrigeant des erreurs de phrases.
            </p>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Comment ça fonctionne
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <p className="text-gray-700">Corrigez 12 phrases par jour</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <p className="text-gray-700">Gagnez 650 FCFA par phrase corrigée</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <p className="text-gray-700">Recevez vos paiements automatiquement via Mobile Money</p>
            </div>
          </CardContent>
        </Card>

        {/* Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Vos Revenus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">7 800 FCFA</div>
                <div className="text-sm text-gray-600">Revenu quotidien maximum</div>
                <div className="text-xs text-gray-500 mt-1">12 phrases × 650 FCFA</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Système de Parrainage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-3">
              Invitez vos amis et gagnez des commissions sur leurs revenus :
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Commission sur chaque correction effectuée</li>
              <li>• Bonus d'activation pour chaque parrain actif</li>
              <li>• Système de récompenses à plusieurs niveaux</li>
            </ul>
          </CardContent>
        </Card>

        {/* Supported Countries */}
        <Card>
          <CardHeader>
            <CardTitle>Pays Supportés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span>🇹🇬</span> Togo
              </div>
              <div className="flex items-center gap-2">
                <span>🇧🇯</span> Bénin
              </div>
              <div className="flex items-center gap-2">
                <span>🇸🇳</span> Sénégal
              </div>
              <div className="flex items-center gap-2">
                <span>🇨🇮</span> Côte d'Ivoire
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}