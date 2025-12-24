import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MessageCircle, Headphones, Download, Send, Loader2, Image, X, User, Sparkles, Pencil, Check, Shield, Clock, Phone, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
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

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, message }: { messageId: string; message: string }) => {
      return apiRequest('PATCH', `/api/support/messages/${messageId}`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/messages'] });
      setEditingMessageId(null);
      setEditingText("");
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

  const handleStartEdit = (msg: SupportMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.message);
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editingText.trim()) {
      editMessageMutation.mutate({ messageId: editingMessageId, message: editingText.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            alert('L\'image ne doit pas dépasser 5 Mo');
            return;
          }
          setIsUploading(true);
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
        }
        break;
      }
    }
  };

  const faqItems = [
    {
      question: "Comment activer mon compte ?",
      answer: "Pour activer votre compte, rendez-vous dans la section 'Retrait' et suivez les instructions pour effectuer le paiement d'activation via l'une de nos passerelles de paiement sécurisées."
    },
    {
      question: "Comment effectuer un retrait ?",
      answer: "Une fois votre compte activé, allez dans 'Retrait', saisissez le montant souhaité et votre numéro de téléphone. Notre équipe traitera votre demande dans les plus brefs délais."
    },
    {
      question: "Comment parrainer quelqu'un ?",
      answer: "Partagez votre code de parrainage unique disponible dans votre tableau de bord. Lorsque votre filleul s'inscrit avec ce code et active son compte, vous recevez une commission."
    },
    {
      question: "Combien de temps pour recevoir un retrait ?",
      answer: "Les retraits sont généralement traités sous 24 à 48 heures ouvrables. Vous recevrez une notification une fois le transfert effectué."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 pb-24">
      {/* Header moderne */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
        <div className="relative px-6 py-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
              <Link href="/" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold" data-testid="page-title">Centre d'Assistance</h1>
              <p className="text-blue-100 text-sm">Nous sommes là pour vous aider</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Hero Section */}
        <div className="text-center py-6">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 rotate-3">
              <Headphones className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Comment pouvons-nous vous aider ?</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs mx-auto">
            Notre équipe d'experts est disponible 24h/24 pour répondre à toutes vos questions.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 text-center shadow-sm border border-slate-100 dark:border-slate-700">
            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-slate-800 dark:text-white">24/7</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Disponible</p>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 text-center shadow-sm border border-slate-100 dark:border-slate-700">
            <MessageCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-slate-800 dark:text-white">&lt;5min</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Réponse</p>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 text-center shadow-sm border border-slate-100 dark:border-slate-700">
            <Shield className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-slate-800 dark:text-white">100%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sécurisé</p>
          </div>
        </div>

        {/* Contact Options */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
            Canaux de Contact
          </h3>
          
          {/* Chat En Ligne - Primary */}
          <button
            onClick={() => setShowChat(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            data-testid="button-open-chat"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-semibold">Chat En Ligne</h4>
              <p className="text-sm text-blue-100">Discutez avec notre équipe en temps réel</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">En ligne</span>
            </div>
          </button>

          {/* Instagram */}
          <button
            onClick={handleInstagramContact}
            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 text-white rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-pink-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            data-testid="button-instagram-contact"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FaInstagram className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-semibold">Instagram</h4>
              <p className="text-sm text-pink-100">@{instagramSupport || 'sikacustomer_service'}</p>
            </div>
            <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
          </button>
        </div>

        {/* FAQ Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
            Questions Fréquentes
          </h3>
          
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
            {faqItems.map((item, index) => (
              <div key={index}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  data-testid={`faq-${index}`}
                >
                  <span className="font-medium text-slate-800 dark:text-white text-sm pr-4">{item.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400 animate-in slide-in-from-top-2 duration-200">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Download Instagram Card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-2xl p-5 border border-purple-100 dark:border-purple-900">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800 dark:text-white mb-1">Pas encore Instagram ?</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Téléchargez l'app gratuitement pour nous contacter facilement.
              </p>
              <Button 
                onClick={() => window.open('https://play.google.com/store/apps/details?id=com.instagram.android', '_blank', 'noopener,noreferrer')}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl"
                data-testid="button-download-instagram"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>

        {/* Support Hours Card */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-semibold text-slate-800 dark:text-white">Horaires d'Assistance</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Lundi - Dimanche</span>
              <span className="font-medium text-green-600 dark:text-green-400">24h/24</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Temps de réponse moyen</span>
              <span className="font-medium text-slate-800 dark:text-white">~5 minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Overlay */}
      {showChat && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={() => setShowChat(false)}
        />
      )}

      {/* Floating Chat Window */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
          showChat ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        <div className="max-w-lg mx-auto">
          {/* Chat Header */}
          <div 
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 py-4 flex items-center justify-between rounded-t-3xl cursor-pointer shadow-2xl"
            onClick={() => setShowChat(false)}
            data-testid="chat-header-toggle"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-indigo-600 rounded-full"></span>
              </div>
              <div>
                <h3 className="font-bold">Support SIKA TEXTE</h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  En ligne • Répond rapidement
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                setShowChat(false);
              }}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Chat Content */}
          <div className="bg-white dark:bg-slate-900 shadow-2xl">
            {/* Security Notice */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5">
              <p className="text-xs text-amber-700 dark:text-amber-300 text-center flex items-center justify-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Conversation sécurisée et confidentielle
              </p>
            </div>

            {/* Messages Area */}
            <div 
              className="h-[50vh] overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800"
              data-testid="chat-messages"
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Chargement des messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center mb-4 rotate-3">
                    <MessageCircle className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Bienvenue ! 👋</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                    Notre équipe est là pour vous aider. Posez votre question et nous vous répondrons rapidement.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.senderType === 'user';
                  const showAvatar = index === 0 || messages[index - 1]?.senderType !== msg.senderType;
                  const isEditing = editingMessageId === msg.id;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      data-testid={`message-${msg.id}`}
                    >
                      {showAvatar ? (
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-md ${
                          isUser 
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
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
                          className={`rounded-2xl px-4 py-3 shadow-sm relative group ${
                            isUser
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-md'
                          }`}
                        >
                          {isUser && !isEditing && (
                            <div className="absolute -top-9 right-0 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-700 rounded-xl shadow-lg px-2 py-1 border border-slate-100 dark:border-slate-600">
                              <button
                                onClick={() => handleStartEdit(msg)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                                data-testid={`button-edit-${msg.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          
                          {msg.imageUrl && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingImage(msg.imageUrl!);
                              }}
                              className="block mb-2 cursor-pointer"
                            >
                              <img 
                                src={msg.imageUrl} 
                                alt="Image partagée" 
                                className="max-w-full rounded-xl hover:opacity-90 transition-opacity"
                                style={{ maxHeight: '200px' }}
                              />
                            </div>
                          )}
                          
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="flex-1 bg-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/70 border border-white/30 focus:outline-none focus:border-white/50"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                              />
                              <button
                                onClick={handleSaveEdit}
                                disabled={editMessageMutation.isPending}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                              >
                                {editMessageMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : msg.message ? (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {renderMessageWithLinks(msg.message, isUser)}
                            </p>
                          ) : null}
                        </div>
                        <p className={`text-[10px] mt-1.5 px-1 ${isUser ? 'text-right' : 'text-left'} text-slate-400`}>
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Image Preview */}
            {selectedImage && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="relative inline-block">
                  <img 
                    src={selectedImage} 
                    alt="Image sélectionnée" 
                    className="h-20 rounded-xl shadow-md"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                    data-testid="button-remove-image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <form 
              onSubmit={handleSendMessage} 
              className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-3"
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
                className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 h-11 w-11 rounded-xl flex-shrink-0 transition-colors"
                data-testid="button-attach-image"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onPaste={handlePaste}
                placeholder="Écrivez votre message..."
                className="flex-1 rounded-xl border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 transition-colors h-11"
                disabled={sendMessageMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={(!newMessage.trim() && !selectedImage) || sendMessageMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-11 w-11 rounded-xl flex-shrink-0 shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
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

      {/* Floating Chat Button (when chat is closed) */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center text-white hover:scale-110 transition-transform z-50 group"
          data-testid="floating-chat-button"
        >
          <MessageCircle className="w-7 h-7" />
          {messages.filter(m => m.senderType === 'admin' && !m.isRead).length > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center border-2 border-white animate-bounce">
              {messages.filter(m => m.senderType === 'admin' && !m.isRead).length}
            </span>
          )}
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Besoin d'aide ?
          </span>
        </button>
      )}

      {/* Image Lightbox */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingImage(null)}
          data-testid="image-lightbox"
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
            data-testid="button-close-lightbox"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={viewingImage} 
            alt="Image en grand" 
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
