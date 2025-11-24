import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface SupportMessage {
  id: string;
  userId: string;
  message: string;
  senderType: 'user' | 'admin';
  createdAt: string;
}

interface UserWithMessages {
  userId: string;
  userName: string;
  messages: SupportMessage[];
  lastMessage: string;
}

export default function AdminSupportMessages() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all support messages
  const { data: allMessages = [], isLoading, refetch } = useQuery<SupportMessage[]>({
    queryKey: ['/api/admin/support-messages'],
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Group messages by user
  const userMessagesMap: { [userId: string]: UserWithMessages } = {};
  allMessages.forEach((msg) => {
    if (!userMessagesMap[msg.userId]) {
      userMessagesMap[msg.userId] = {
        userId: msg.userId,
        userName: `Utilisateur ${msg.userId.slice(0, 8)}`,
        messages: [],
        lastMessage: msg.message
      };
    }
    userMessagesMap[msg.userId].messages.push(msg);
    userMessagesMap[msg.userId].lastMessage = msg.message;
  });

  const users = Object.values(userMessagesMap).sort((a, b) => 
    new Date(b.messages[b.messages.length - 1]?.createdAt || 0).getTime() -
    new Date(a.messages[a.messages.length - 1]?.createdAt || 0).getTime()
  );

  const selectedUserMessages = selectedUserId ? userMessagesMap[selectedUserId]?.messages || [] : [];

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !replyText.trim()) return;
      const res = await apiRequest('POST', `/api/admin/support-messages/${selectedUserId}`, { 
        message: replyText 
      });
      return await res.json();
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-messages'] });
      toast({
        title: "Réponse envoyée",
        description: "Votre réponse a été envoyée à l'utilisateur",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'envoi",
        variant: "destructive"
      });
    }
  });

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    sendReplyMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 flex items-center">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
            <Link href="/admin" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">
            Messages de Support
          </h1>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Users List */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun message</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {users.map((user) => (
                    <Button
                      key={user.userId}
                      variant={selectedUserId === user.userId ? "default" : "outline"}
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => setSelectedUserId(user.userId)}
                      data-testid={`button-user-${user.userId}`}
                    >
                      <div className="w-full">
                        <p className="text-sm font-semibold">{user.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.lastMessage}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="md:col-span-2">
          {selectedUserId ? (
            <Card className="flex flex-col h-96 md:h-[600px]">
              <CardHeader className="border-b">
                <CardTitle>
                  Conversation - {selectedUserId.slice(0, 8)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                {selectedUserMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground">Aucun message</p>
                ) : (
                  <div className="space-y-3">
                    {selectedUserMessages.map((msg) => (
                      <div 
                        key={msg.id}
                        data-testid={`message-${msg.id}`}
                        className={`flex ${msg.senderType === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div 
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.senderType === 'user'
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-none'
                              : 'bg-blue-500 text-white rounded-br-none'
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
              </CardContent>
              <div className="border-t p-4 space-y-2">
                <div className="flex gap-2">
                  <Input
                    data-testid="input-admin-reply"
                    type="text"
                    placeholder="Écrivez votre réponse..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !sendReplyMutation.isPending) {
                        handleSendReply();
                      }
                    }}
                    disabled={sendReplyMutation.isPending}
                  />
                  <Button 
                    onClick={handleSendReply}
                    disabled={sendReplyMutation.isPending || !replyText.trim()}
                    data-testid="button-send-reply"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  Sélectionnez une conversation pour voir les messages
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}