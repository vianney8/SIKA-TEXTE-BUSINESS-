import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Users, Headphones } from "lucide-react";
import { Link } from "wouter";
import { FaWhatsapp, FaTelegram } from "react-icons/fa";
import { useAppSetting } from "@/hooks/useAppSettings";

export default function Assistance() {
  const { data: whatsappGroup } = useAppSetting('whatsapp_group');
  const { data: telegramSupervisor } = useAppSetting('telegram_supervisor');

  const handleWhatsAppGroup = () => {
    // WhatsApp group join link
    const whatsappGroupUrl = whatsappGroup || "https://chat.whatsapp.com/CXhYz9x8KJ6AabcdXefGHi";
    window.open(whatsappGroupUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramContact = () => {
    // Telegram contact for provider - convert @handle to https://t.me/handle
    const telegramHandle = telegramSupervisor || "@sikatexte_support";
    const telegramUrl = telegramHandle.startsWith('@') 
      ? `https://t.me/${telegramHandle.slice(1)}` 
      : telegramHandle.startsWith('https://') 
        ? telegramHandle 
        : `https://t.me/${telegramHandle}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
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
          {/* WhatsApp Group */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                  <FaWhatsapp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Groupe WhatsApp</h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    Rejoignez notre communauté d'utilisateurs
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Connectez-vous avec d'autres utilisateurs de SIKA TEXTE, partagez vos expériences, 
                obtenez des conseils et restez informé des dernières nouvelles.
              </p>
              <Button 
                onClick={handleWhatsAppGroup}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-whatsapp-group"
              >
                <Users className="w-4 h-4 mr-2" />
                Rejoindre le Groupe WhatsApp
              </Button>
            </CardContent>
          </Card>

          {/* Telegram Contact */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  <FaTelegram className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Contact Service client</h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    Support technique et administratif
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Pour des questions techniques spécifiques, des problèmes de compte ou 
                pour contacter directement notre équipe de support technique.
              </p>
              <Button 
                onClick={handleTelegramContact}
                variant="outline"
                className="w-full border-blue-300 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-950"
                data-testid="button-telegram-contact"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contacter sur Telegram
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