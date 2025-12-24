import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Users, Headphones, Download } from "lucide-react";
import { Link } from "wouter";
import { FaInstagram } from "react-icons/fa";
import { useAppSetting } from "@/hooks/useAppSettings";

export default function Assistance() {
  const { data: instagramSupport } = useAppSetting('instagram_supervisor');

  const handleInstagramContact = () => {
    const instagramUrl = `https://www.instagram.com/${instagramSupport || 'sikacustomer_service'}`;
    window.open(instagramUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 flex items-center">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
            <Link href="/" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">
            Centre d'Assistance
          </h1>
        </div>
      </div>

      <div className="p-6">
        {/* Introduction */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-primary to-accent w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Headphones className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Besoin d'aide ?</h2>
          <p className="text-muted-foreground">
            Notre équipe d'assistance est là pour vous aider. Choisissez le canal de communication qui vous convient le mieux.
          </p>
        </div>

        {/* Contact Options */}
        <div className="space-y-4">
          {/* Instagram Download Card */}
          <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-full">
                  <FaInstagram className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Vous n'avez pas un compte Instagram ?</h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    Téléchargez l'application gratuitement
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Instagram est une application gratuite et facile à utiliser, comme Facebook. 
                Téléchargez Instagram pour créer votre compte en quelques minutes et commencer 
                à contacter notre service client directement depuis l'application.
              </p>
              <Button 
                onClick={() => window.open('https://play.google.com/store/apps/details?id=com.instagram.android', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                data-testid="button-download-instagram"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger Instagram
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Disponible sur Play Store et Apple Store
              </p>
            </CardContent>
          </Card>

          {/* Instagram Contact */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-2 rounded-full">
                  <FaInstagram className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Contact Service client Instagram</h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    Support client disponible
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Contactez notre service client sur Instagram pour toute assistance, 
                question ou problème concernant votre compte SIKA TEXTE.
              </p>
              <Button 
                onClick={handleInstagramContact}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                data-testid="button-instagram-contact"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contacter sur Instagram
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Additional Help Info */}
        <Card className="mt-6 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              Autres moyens de contact
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Support Technique :</strong> Décrivez votre problème en détail</p>
              <p>• <strong>Support Financier :</strong> Questions sur paiements et retraits</p>
              <p>• <strong>Heures d'ouverture :</strong> Lundi - dimanche, 24h/24</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}