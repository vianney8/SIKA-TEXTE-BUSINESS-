import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MessageCircle, Headphones, Download, Send, Loader2, Image, X, User, Sparkles } from "lucide-react";
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
  imageUrl?: string;
  senderType: 'user' | 'admin';
  isRead: boolean;
  createdAt: string;
}

function renderMessageWithLinks(text: string, isUserMessage: boolean): JSX.Element {
  if (!text) return <></>;
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return (
    <>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          urlRegex.lastIndex = 0;
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline break-all ${isUserMessage ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800 dark:text-blue-400'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export default function Assistance() {
  const { data: instagramSupport } = useAppSetting('instagram_supervisor');
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: messagesLoading } = useQuery<SupportMessage[]>({
    queryKey: ['/api/support/messages'],
    refetchInterval: showChat ? 3000 : false,
    enabled: showChat,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, imageUrl }: { message: string; imageUrl?: string }) => {
      return apiRequest('POST', '/api/support/messages', { message, imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/messages'] });
      setNewMessage("");
      setSelectedImage(null);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (showChat) {
      scrollToBottom();
    }
  }, [messages, showChat]);

  const handleInstagramContact = () => {
    const instagramUrl = `https://www.instagram.com/${instagramSupport || 'sikacustomer_service'}`;
    window.open(instagramUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() || selectedImage) {
      sendMessageMutation.mutate({ message: newMessage.trim(), imageUrl: selectedImage || undefined });
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert('Erreur lors du chargement de l\'image');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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

      {showChat && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
          onClick={() => setShowChat(false)}
        />
      )}

      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
          showChat ? 'translate-y-0' : 'translate-y-[calc(100%-60px)]'
        }`}
      >
        <div 
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between cursor-pointer shadow-lg"
          onClick={() => setShowChat(!showChat)}
          data-testid="chat-header-toggle"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-blue-600 rounded-full"></span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Support SIKA TEXTE</h3>
              <p className="text-xs text-blue-100">En ligne • Répond généralement en quelques minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!showChat && messages.filter(m => m.senderType === 'admin' && !m.isRead).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {messages.filter(m => m.senderType === 'admin' && !m.isRead).length}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowChat(!showChat);
              }}
            >
              {showChat ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
          <div 
            className="h-[50vh] overflow-y-auto p-4 space-y-4"
            style={{ 
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              backgroundColor: '#f8fafc'
            }}
            data-testid="chat-messages"
          >
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chargement des messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Bienvenue sur le chat !</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Notre équipe est là pour vous aider. Posez votre question et nous vous répondrons rapidement.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.senderType === 'user';
                const showAvatar = index === 0 || messages[index - 1]?.senderType !== msg.senderType;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    data-testid={`message-${msg.id}`}
                  >
                    {showAvatar ? (
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                        isUser 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}>
                        {isUser ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-white" />
                        )}
                      </div>
                    ) : (
                      <div className="w-8" />
                    )}
                    
                    <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                          isUser
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-md'
                            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-bl-md'
                        }`}
                      >
                        {msg.imageUrl && (
                          <a 
                            href={msg.imageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="block mb-2"
                          >
                            <img 
                              src={msg.imageUrl} 
                              alt="Image partagée" 
                              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ maxHeight: '200px' }}
                            />
                          </a>
                        )}
                        {msg.message && (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {renderMessageWithLinks(msg.message, isUser)}
                          </p>
                        )}
                      </div>
                      <p className={`text-[10px] mt-1 px-1 ${isUser ? 'text-right' : 'text-left'} text-gray-400`}>
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {selectedImage && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <div className="relative inline-block">
                <img 
                  src={selectedImage} 
                  alt="Image sélectionnée" 
                  className="h-16 rounded-lg shadow-sm"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md transition-colors"
                  data-testid="button-remove-image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <form 
            onSubmit={handleSendMessage} 
            className="p-3 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              data-testid="input-file-image"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || sendMessageMutation.isPending}
              className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 h-10 w-10 rounded-full flex-shrink-0"
              data-testid="button-attach-image"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1 rounded-full border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 transition-colors"
              disabled={sendMessageMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={(!newMessage.trim() && !selectedImage) || sendMessageMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 h-10 w-10 rounded-full flex-shrink-0 shadow-md"
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
