import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MessageCircle, Users, Headphones, Download, Send, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { FaInstagram, FaTelegram } from "react-icons/fa";
import { useAppSetting } from "@/hooks/useAppSettings";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SupportMessage {
  id: string;
  message: string;
  senderType: 'user' | 'admin';
  createdAt: string;
}

export default function Assistance() {
  const { data: instagramSupport } = useAppSetting('instagram_supervisor');
  const { data: telegramSupervisor } = useAppSetting('telegram_supervisor');
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading, refetch } = useQuery<SupportMessage[]>({
    queryKey: ['/api/support-messages'],
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 2000);
    return () => clearInterval(interval);
  }, [refetch]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest('POST', '/api/support-messages', { message });
      return await res.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ['/api/support-messages'] });
      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé à l'administrateur",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'envoi du message",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  const handleInstagramContact = () => {
    const instagramUrl = `https://www.instagram.com/${instagramSupport || 'sikacustomer_service'}`;
    window.open(instagramUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramContact = () => {
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

        {/* Chat en ligne Button */}
        {!showChat && (
          <Button 
            onClick={() => setShowChat(true)}
            className="w-full mb-6 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
            data-testid="button-online-support"
            size="lg"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Assistance en ligne (Chat)
          </Button>
        )}

        {/* Chat Interface */}
        {showChat && (
          <Card className="mb-6 border-2 border-green-200 dark:border-green-800">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  Chat en direct avec l'administrateur
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowChat(false)}
                  data-testid="button-close-chat"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Messages Display */}
              <div className="h-80 overflow-y-auto mb-4 border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                {isLoading ? (
                  <p className="text-center text-muted-foreground">Chargement des messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-muted-foreground">Aucun message. Envoyez votre première question !</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div 
                        key={msg.id}
                        data-testid={`message-${msg.id}`}
                        className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.senderType === 'user'
                              ? 'bg-blue-500 text-white rounded-br-none'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-none'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  data-testid="input-support-message"
                  type="text"
                  placeholder="Écrivez votre message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !sendMessageMutation.isPending) {
                      handleSendMessage();
                    }
                  }}
                  disabled={sendMessageMutation.isPending}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || !messageText.trim()}
                  data-testid="button-send-message"
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ✅ Les messages sont vérifiés en temps réel par l'administrateur
              </p>
            </CardContent>
          </Card>
        )}

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

          {/* Telegram Contact */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  <FaTelegram className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Contact Service client Telegram</h3>
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
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
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