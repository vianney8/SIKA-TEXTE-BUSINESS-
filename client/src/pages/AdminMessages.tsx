import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, MessageCircle, Send, Loader2, User, Search } from "lucide-react";
import { Link } from "wouter";
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

export default function AdminMessages() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      return apiRequest('POST', `/api/admin/support/messages/${userId}`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/conversations'] });
      setNewMessage("");
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
    if (newMessage.trim() && selectedUserId) {
      sendMessageMutation.mutate({ userId: selectedUserId, message: newMessage.trim() });
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
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">
                            {conv.user.fullName || `${conv.user.firstName} ${conv.user.lastName}`}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.user.phone || conv.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {conv.lastMessage.senderType === 'admin' ? 'Vous: ' : ''}
                          {conv.lastMessage.message}
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
              <div className="p-4 border-b bg-white dark:bg-slate-950 flex items-center gap-3">
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

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
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
                      className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                      data-testid={`admin-message-${msg.id}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.senderType === 'admin'
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.senderType === 'admin' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t bg-white dark:bg-slate-950 flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Répondre au client..."
                  className="flex-1"
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-admin-message"
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
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
              <div className="p-4 border-b bg-white dark:bg-slate-950 flex items-center gap-3">
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

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
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
                      className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.senderType === 'admin'
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.senderType === 'admin' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t bg-white dark:bg-slate-950 flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Répondre..."
                  className="flex-1"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
