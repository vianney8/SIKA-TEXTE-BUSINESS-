import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  CheckCheck,
  Loader2,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Trash2,
  X,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminNav from "@/components/admin/AdminNav";

interface SupportMessage {
  id: string;
  userId: string;
  message: string;
  imageUrl?: string;
  senderType: "user" | "admin";
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

function linkedText(text: string, admin: boolean) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    part.startsWith("http") ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noreferrer"
        className={`underline break-all ${admin ? "text-teal-100" : "text-teal-700"}`}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function AdminMessages() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null),
    [searchQuery, setSearchQuery] = useState(""),
    [newMessage, setNewMessage] = useState(""),
    [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<SupportMessage | null>(
      null,
    ),
    [editText, setEditText] = useState(""),
    [deleteConfirmMessage, setDeleteConfirmMessage] =
      useState<SupportMessage | null>(null),
    [deleteConversationConfirm, setDeleteConversationConfirm] = useState(false),
    [viewingImage, setViewingImage] = useState<string | null>(null),
    [isUploading, setIsUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null),
    fileRef = useRef<HTMLInputElement>(null),
    queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    isError: conversationsError,
  } = useQuery<Conversation[]>({
    queryKey: ["/api/admin/support/conversations"],
    refetchInterval: 5000,
  });
  const { data: messages = [], isLoading: messagesLoading } = useQuery<
    SupportMessage[]
  >({
    queryKey: ["/api/admin/support/messages", selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });
  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["/api/admin/support/messages", selectedUserId],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/admin/support/conversations"],
    });
  };
  const send = useMutation({
    mutationFn: (body: {
      userId: string;
      message: string;
      imageUrl?: string;
    }) =>
      apiRequest("POST", `/api/admin/support/messages/${body.userId}`, body),
    onSuccess: () => {
      invalidate();
      setNewMessage("");
      setSelectedImage(null);
    },
  });
  const update = useMutation({
    mutationFn: (body: { messageId: string; message: string }) =>
      apiRequest("PATCH", `/api/admin/support/messages/${body.messageId}`, {
        message: body.message,
      }),
    onSuccess: () => {
      invalidate();
      setEditingMessage(null);
      toast({ title: "Message modifié" });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/support/messages/${id}`, {}),
    onSuccess: () => {
      invalidate();
      setDeleteConfirmMessage(null);
      toast({ title: "Message supprimé" });
    },
  });
  const removeConversation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/support/conversations/${id}`, {}),
    onSuccess: () => {
      invalidate();
      setDeleteConversationConfirm(false);
      setSelectedUserId(null);
      toast({ title: "Historique effacé" });
    },
  });
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const readImage = (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image invalide",
        description: "Choisissez une image de moins de 5 Mo.",
        variant: "destructive",
      });
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast({ title: "Erreur de chargement", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const item = Array.from(event.clipboardData.items).find((entry) =>
      entry.type.startsWith("image/"),
    );
    const file = item?.getAsFile();
    if (file) {
      event.preventDefault();
      readImage(file);
    }
  };
  const selectedUser = conversations.find(
    (c) => c.userId === selectedUserId,
  )?.user;
  const unread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const filtered = conversations.filter((c) =>
    `${c.user.fullName} ${c.user.phone} ${c.user.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );
  const avatar = (u: UserInfo) =>
    (u.fullName || u.firstName || "U").charAt(0).toUpperCase();
  const chat = (mobile = false) =>
    selectedUser && (
      <div
        className={`${mobile ? "fixed inset-0 z-50" : "flex"} flex-col bg-background`}
      >
        <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
          {mobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedUserId(null)}
              aria-label="Fermer la conversation"
              data-testid="button-close-chat"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 font-bold text-white">
            {avatar(selectedUser)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">
              {selectedUser.fullName ||
                `${selectedUser.firstName} ${selectedUser.lastName}`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {selectedUser.phone || selectedUser.email}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteConversationConfirm(true)}
            className="hidden text-rose-700 sm:flex"
            data-testid="button-delete-conversation"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Effacer l’historique
          </Button>
          {mobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => setDeleteConversationConfirm(true)}
                  className="text-rose-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Effacer l’historique
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto bg-muted/35 p-4">
          {messagesLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-12 w-2/3" />
              <div className="skeleton ml-auto h-12 w-1/2" />
            </div>
          ) : messages.length ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`group flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}
                data-testid={`admin-message-${msg.id}`}
              >
                <div className="relative max-w-[85%] sm:max-w-[70%]">
                  {msg.senderType === "admin" && (
                    <div className="absolute -left-9 top-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            data-testid={`button-message-menu-${msg.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingMessage(msg);
                              setEditText(msg.message);
                            }}
                            data-testid={`button-edit-message-${msg.id}`}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirmMessage(msg)}
                            className="text-rose-700"
                            data-testid={`button-delete-message-${msg.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 shadow-sm ${msg.senderType === "admin" ? "rounded-br-md bg-teal-700 text-white" : "rounded-bl-md border bg-card"}`}
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Image partagée"
                        className="mb-2 max-h-52 cursor-pointer rounded-lg object-cover"
                        onClick={() => setViewingImage(msg.imageUrl!)}
                      />
                    )}
                    {msg.message && (
                      <p className="whitespace-pre-wrap text-sm">
                        {linkedText(msg.message, msg.senderType === "admin")}
                      </p>
                    )}
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                      {formatDistanceToNow(new Date(msg.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                      {msg.updatedAt !== msg.createdAt && " · modifié"}
                      {msg.senderType === "admin" && (
                        <CheckCheck className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="grid h-full place-items-center text-center text-muted-foreground">
              <MessageCircle className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p>Aucun message dans cette conversation</p>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {selectedImage && (
          <div className="border-t bg-card px-4 py-2">
            <div className="relative inline-block">
              <img
                src={selectedImage}
                alt="Aperçu"
                className="h-16 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute -right-2 -top-2 rounded-full bg-rose-600 p-1 text-white"
                data-testid="button-remove-image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
        <form
          className="flex gap-2 border-t bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedUserId && (newMessage.trim() || selectedImage))
              send.mutate({
                userId: selectedUserId,
                message: newMessage.trim(),
                imageUrl: selectedImage || undefined,
              });
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && readImage(e.target.files[0])
            }
            data-testid="input-admin-file-image"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading || send.isPending}
            data-testid="button-admin-attach-image"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onPaste={handlePaste}
            placeholder="Répondre au client…"
            disabled={send.isPending}
            data-testid="input-admin-message"
          />
          <Button
            type="submit"
            disabled={(!newMessage.trim() && !selectedImage) || send.isPending}
            className="bg-saffron text-slate-950 hover:bg-amber-400"
            data-testid="button-admin-send"
          >
            {send.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer
              </>
            )}
          </Button>
        </form>
      </div>
    );
  return (
    <div className="sika-page">
      <AdminNav
        title="Messages support"
        subtitle="Répondre aux demandes des utilisateurs, en temps réel."
        icon={MessageCircle}
        badge={unread || undefined}
      />
      <main className="sika-content">
        <div className="sika-surface flex min-h-[calc(100dvh-190px)] overflow-hidden">
          <aside
            className={`${selectedUserId ? "hidden md:flex" : "flex"} w-full flex-col border-r md:w-80`}
          >
            <div className="border-b p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un contact…"
                  className="pl-9"
                  data-testid="input-search-conversations"
                />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {unread
                  ? `${unread} non lu${unread > 1 ? "s" : ""}`
                  : "Boîte de réception à jour"}
              </p>
            </div>
            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="space-y-2 p-4">
                  <div className="skeleton h-16" />
                  <div className="skeleton h-16" />
                </div>
              ) : conversationsError ? (
                <div className="p-6 text-center text-sm text-rose-700">
                  Impossible de charger les conversations.
                </div>
              ) : filtered.length ? (
                filtered.map((c) => (
                  <button
                    key={c.userId}
                    onClick={() => setSelectedUserId(c.userId)}
                    className={`flex w-full gap-3 border-b p-4 text-left transition hover:bg-muted/60 ${selectedUserId === c.userId ? "border-l-4 border-l-teal-600 bg-teal-50" : ""}`}
                    data-testid={`conversation-${c.userId}`}
                  >
                    <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-800 font-bold text-white">
                      {avatar(c.user)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold">
                          {c.user.fullName ||
                            `${c.user.firstName} ${c.user.lastName}`}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="rounded-full bg-saffron px-1.5 text-[10px] font-black">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.user.phone || c.user.email}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {c.lastMessage.senderType === "admin" && "Vous : "}
                        {c.lastMessage.imageUrl
                          ? "Image partagée"
                          : c.lastMessage.message}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-10 text-center text-muted-foreground">
                  <MessageCircle className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p className="text-sm">Aucune conversation</p>
                </div>
              )}
            </ScrollArea>
          </aside>
          <section className="hidden flex-1 md:flex">
            {selectedUserId ? (
              chat()
            ) : (
              <div className="grid flex-1 place-items-center text-center text-muted-foreground">
                <div>
                  <MessageCircle className="mx-auto mb-3 h-14 w-14 opacity-25" />
                  <p className="font-bold">Sélectionnez une conversation</p>
                  <p className="text-sm">
                    Les échanges avec vos utilisateurs apparaîtront ici.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      {selectedUserId && <div className="md:hidden">{chat(true)}</div>}
      <Dialog
        open={!!editingMessage}
        onOpenChange={() => setEditingMessage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le message</DialogTitle>
            <DialogDescription>
              Le texte sera mis à jour pour tous les participants.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            data-testid="input-edit-message"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
              Annuler
            </Button>
            <Button
              onClick={() =>
                editingMessage &&
                update.mutate({
                  messageId: editingMessage.id,
                  message: editText.trim(),
                })
              }
              disabled={!editText.trim() || update.isPending}
              data-testid="button-save-edit"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleteConfirmMessage}
        onOpenChange={() => setDeleteConfirmMessage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce message ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible et le message sera retiré pour tous.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmMessage(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmMessage && remove.mutate(deleteConfirmMessage.id)
              }
              data-testid="button-confirm-delete-message"
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteConversationConfirm}
        onOpenChange={setDeleteConversationConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Effacer l’historique ?</DialogTitle>
            <DialogDescription>
              Tous les messages de cette conversation seront supprimés pour
              tous.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConversationConfirm(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedUserId && removeConversation.mutate(selectedUserId)
              }
              data-testid="button-confirm-delete-conversation"
            >
              Effacer tout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {viewingImage && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/90 p-4"
          onClick={() => setViewingImage(null)}
          data-testid="image-lightbox"
        >
          <button
            className="absolute right-4 top-4 text-white"
            onClick={() => setViewingImage(null)}
            data-testid="button-close-lightbox"
          >
            <X />
          </button>
          <img
            src={viewingImage}
            alt="Image en grand"
            className="max-h-full max-w-full rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
