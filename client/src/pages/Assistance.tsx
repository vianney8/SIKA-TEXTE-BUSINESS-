import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MessageCircle, Headphones, Download, Send, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { FaInstagram } from "react-icons/fa";
import { useAppSetting } from "@/hooks/useAppSettings";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface SupportMessage {
  id: string;
  userId: string;
  message: string;
  senderType: 'user' | 'admin';
  isRead: boolean;
  createdAt: string;
}

export default function Assistance() {
  const { data: instagramSupport } = useAppSetting('instagram_supervisor');
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: messagesLoading } = useQuery<SupportMessage[]>({
    queryKey: ['/api/support/messages'],
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('POST', '/api/support/messages', { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/messages'] });
      setNewMessage("");
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInstagramContact = () => {
    const instagramUrl = `https://www.instagram.com/${instagramSupport || 'sikacustomer_service'}`;
    window.open(instagramUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-primary to-accent w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Headphones className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Besoin d'aide ?</h2>
          <p className="text-muted-foreground">
            Notre équipe d'assistance est là pour vous aider. Choisissez le canal de communication qui vous convient le mieux.
          </p>
        </div>

        <div className="space-y-4">
          <Card 
            className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 cursor-pointer hover:shadow-lg transition-all duration-300"
            onClick={() => setShowChat(!showChat)}
            data-testid="card-chat-online"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2 rounded-full">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Chat en ligne</h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    Discutez directement avec notre équipe
                  </p>
                </div>
                <div className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                  En ligne
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Envoyez un message instantané à notre service client. Nous vous répondrons dans les plus brefs délais.
              </p>
              <Button 
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                data-testid="button-open-chat"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {showChat ? "Fermer le chat" : "Ouvrir le chat"}
              </Button>
            </CardContent>
          </Card>

          {showChat && (
            <Card className="border-2 border-emerald-300 dark:border-emerald-700" data-testid="chat-container">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                  Chat avec le support
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-80 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 space-y-3" data-testid="chat-messages">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                      <p>Aucun message pour le moment</p>
                      <p className="text-sm">Envoyez votre premier message !</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            msg.senderType === 'user'
                              ? 'bg-emerald-600 text-white rounded-br-md'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-xs mt-1 ${msg.senderType === 'user' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="flex-1"
                    disabled={sendMessageMutation.isPending}
                    data-testid="input-chat-message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid="button-send-message"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

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
