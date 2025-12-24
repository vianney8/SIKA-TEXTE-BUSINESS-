import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, MessageCircle, Send, Loader2, User, Search, Image, X, Edit2, Trash2, MoreVertical, CheckCheck } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SupportMessage {
  id: string;
  userId: string;
  message: string;
  imageUrl?: string;
  senderType: 'user' | 'admin';
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface UserInfo {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

interface Conversation {
  userId: string;
  user: UserInfo;
  lastMessage: SupportMessage;
  unreadCount: number;
}

function renderMessageWithLinks(text: string, isAdminMessage: boolean): JSX.Element {
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
              className={`underline break-all ${isAdminMessage ? 'text-emerald-100 hover:text-white' : 'text-blue-600 hover:text-blue-800 dark:text-blue-400'}`}
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

export default function AdminMessages() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<SupportMessage | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState<SupportMessage | null>(null);
  const [deleteConversationConfirm, setDeleteConversationConfirm] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/admin/support/conversations'],
    refetchInterval: 5000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<SupportMessage[]>({
    queryKey: ['/api/admin/support/messages', selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ userId, message, imageUrl }: { userId: string; message: string; imageUrl?: string }) => {
      return apiRequest('POST', `/api/admin/support/messages/${userId}`, { message, imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/conversations'] });
      setNewMessage("");
      setSelectedImage(null);
    }
  });

  const updateMessageMutation = useMutation({
    mutationFn: async ({ messageId, message }: { messageId: string; message: string }) => {
      return apiRequest('PATCH', `/api/admin/support/messages/${messageId}`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/conversations'] });
      setEditingMessage(null);
      setEditText("");
      toast({ title: "Message modifié", description: "Le message a été modifié avec succès" });
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest('DELETE', `/api/admin/support/messages/${messageId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/conversations'] });
      setDeleteConfirmMessage(null);
      toast({ title: "Message supprimé", description: "Le message a été supprimé pour tous" });
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('DELETE', `/api/admin/support/conversations/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/conversations'] });
      setDeleteConversationConfirm(false);
      setSelectedUserId(null);
      toast({ title: "Historique effacé", description: "L'historique de la conversation a été effacé pour tous" });
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((newMessage.trim() || selectedImage) && selectedUserId) {
      sendMessageMutation.mutate({ userId: selectedUserId, message: newMessage.trim(), imageUrl: selectedImage || undefined });
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5 Mo", variant: "destructive" });
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
        toast({ title: "Erreur", description: "Erreur lors du chargement de l'image", variant: "destructive" });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsUploading(false);
    }
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
            toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5 Mo", variant: "destructive" });
            return;
          }
          setIsUploading(true);
          const reader = new FileReader();
          reader.onload = () => {
            setSelectedImage(reader.result as string);
            setIsUploading(false);
          };
          reader.onerror = () => {
            toast({ title: "Erreur", description: "Erreur lors du chargement de l'image", variant: "destructive" });
            setIsUploading(false);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const handleEditMessage = (msg: SupportMessage) => {
    setEditingMessage(msg);
    setEditText(msg.message);
  };

  const handleSaveEdit = () => {
    if (editingMessage && editText.trim()) {
      updateMessageMutation.mutate({ messageId: editingMessage.id, message: editText.trim() });
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    const name = conv.user.fullName || `${conv.user.firstName} ${conv.user.lastName}`;
    return (
      name.toLowerCase().includes(searchLower) ||
      conv.user.phone?.toLowerCase().includes(searchLower) ||
      conv.user.email?.toLowerCase().includes(searchLower)
    );
  });

  const selectedUser = conversations.find(c => c.userId === selectedUserId)?.user;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const renderMessages = (isMobile: boolean = false) => (
    <>
      {messagesLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
          <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
          <p>Aucun message</p>
        </div>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'} group`}
            data-testid={`admin-message-${msg.id}`}
          >
            <div className={`relative max-w-[${isMobile ? '80' : '70'}%]`}>
              {msg.senderType === 'admin' && (
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-message-menu-${msg.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditMessage(msg)} data-testid={`button-edit-message-${msg.id}`}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteConfirmMessage(msg)} 
                        className="text-red-600"
                        data-testid={`button-delete-message-${msg.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer pour tous
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-2 ${
                  msg.senderType === 'admin'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-md'
                }`}
              >
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
                      className="max-w-full rounded-lg hover:opacity-90 transition-opacity"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                )}
                {msg.message && (
                  <p className="text-sm whitespace-pre-wrap">
                    {renderMessageWithLinks(msg.message, msg.senderType === 'admin')}
                  </p>
                )}
                <div className={`flex items-center gap-1 mt-1 ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <p className={`text-xs ${msg.senderType === 'admin' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: fr })}
                    {msg.updatedAt && msg.updatedAt !== msg.createdAt && ' (modifié)'}
                  </p>
                  {msg.senderType === 'admin' && (
                    <CheckCheck className={`w-3.5 h-3.5 ${msg.isRead ? 'text-blue-300' : 'text-emerald-200'}`} />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </>
  );

  const renderInputForm = () => (
    <>
      {selectedImage && (
        <div className="px-4 py-2 border-t bg-slate-100 dark:bg-slate-800">
          <div className="relative inline-block">
            <img src={selectedImage} alt="Image sélectionnée" className="h-16 rounded-lg" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              data-testid="button-remove-image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white dark:bg-slate-950 flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          data-testid="input-admin-file-image"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || sendMessageMutation.isPending}
          data-testid="button-admin-attach-image"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
        </Button>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (newMessage.trim() || selectedImage) {
                handleSendMessage(e as any);
              }
            }
          }}
          placeholder="Répondre au client... (Shift+Entrée pour aller à la ligne)"
          className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={sendMessageMutation.isPending}
          data-testid="input-admin-message"
          rows={1}
        />
        <Button
          type="submit"
          disabled={(!newMessage.trim() && !selectedImage) || sendMessageMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
          data-testid="button-admin-send"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </>
          )}
        </Button>
      </form>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
              <Link href="/admin" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">
              Messages Support
            </h1>
          </div>
          {totalUnread > 0 && (
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-full md:w-80 border-r bg-slate-50 dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="pl-10"
                data-testid="input-search-conversations"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {conversationsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                <p>Aucune conversation</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedUserId(conv.userId)}
                    className={`w-full p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                      selectedUserId === conv.userId ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500' : ''
                    }`}
                    data-testid={`conversation-${conv.userId}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-medium">
                        {(conv.user.fullName || conv.user.firstName || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {conv.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                              {conv.unreadCount}
                            </span>
                          )}
                          <p className="font-medium truncate flex-1">
                            {conv.user.fullName || `${conv.user.firstName} ${conv.user.lastName}`}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.user.phone || conv.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {conv.lastMessage.senderType === 'admin' ? 'Vous: ' : ''}
                          {conv.lastMessage.imageUrl ? '📷 Photo' : conv.lastMessage.message}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="hidden md:flex flex-1 flex-col">
          {selectedUserId && selectedUser ? (
            <>
              <div className="p-4 border-b bg-white dark:bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-medium">
                    {(selectedUser.fullName || selectedUser.firstName || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">
                      {selectedUser.fullName || `${selectedUser.firstName} ${selectedUser.lastName}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.phone || selectedUser.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConversationConfirm(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid="button-delete-conversation"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Effacer l'historique
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
                {renderMessages()}
              </div>

              {renderInputForm()}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Messages Support</h3>
              <p>Sélectionnez une conversation pour voir les messages</p>
            </div>
          )}
        </div>

        {selectedUserId && selectedUser && (
          <div className="md:hidden fixed inset-0 z-50 bg-background">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b bg-white dark:bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedUserId(null)}
                    data-testid="button-close-chat"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-medium">
                    {(selectedUser.fullName || selectedUser.firstName || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">
                      {selectedUser.fullName || `${selectedUser.firstName} ${selectedUser.lastName}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.phone || selectedUser.email}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => setDeleteConversationConfirm(true)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Effacer l'historique
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
                {renderMessages(true)}
              </div>

              {renderInputForm()}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le message</DialogTitle>
            <DialogDescription>
              Modifiez le texte de votre message
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Nouveau texte..."
            data-testid="input-edit-message"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!editText.trim() || updateMessageMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmMessage} onOpenChange={() => setDeleteConfirmMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le message</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible et le message sera supprimé pour tous.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmMessage(null)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmMessage && deleteMessageMutation.mutate(deleteConfirmMessage.id)}
              disabled={deleteMessageMutation.isPending}
              data-testid="button-confirm-delete-message"
            >
              {deleteMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConversationConfirm} onOpenChange={setDeleteConversationConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Effacer l'historique</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir effacer tout l'historique de cette conversation ? Cette action est irréversible et l'historique sera supprimé pour tous.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConversationConfirm(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedUserId && deleteConversationMutation.mutate(selectedUserId)}
              disabled={deleteConversationMutation.isPending}
              data-testid="button-confirm-delete-conversation"
            >
              {deleteConversationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Effacer tout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingImage(null)}
          data-testid="image-lightbox"
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            data-testid="button-close-lightbox"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={viewingImage} 
            alt="Image en grand" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
