import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import {
  ChevronLeft, Send, Image, Smile, Search, X, Pin, Reply,
  Trash2, Users, Lock, Mic, MoreVertical
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const COUNTRY_FLAGS: Record<string, string> = {
  BJ: "🇧🇯", CI: "🇨🇮", SN: "🇸🇳", BF: "🇧🇫", TG: "🇹🇬", CM: "🇨🇲", ML: "🇲🇱",
};
const QUICK_EMOJIS = ["👍","❤️","😂","😮","😢","🙏","🔥","💯","✅","👏","🎉","💪"];
const EMOJI_PICKER_LIST = [
  "😀","😂","🥲","😍","🤩","😎","🥳","😴","🤔","😱","😡","🥺",
  "👍","👎","❤️","🔥","💯","✅","🎉","🙏","💪","👏","🫡","😅",
  "🤣","😇","🥰","😘","🤗","😜","🧐","🤯","😤","🤭","🫶","💥",
  "⭐","✨","🚀","💰","💸","🏆","🎯","🎁","📱","💬","📣","🔔",
];

interface GroupMessage {
  id: number;
  content: string;
  type: string;
  is_deleted: boolean;
  is_pinned: boolean;
  created_at: string;
  reply_to_id: number | null;
  user_id: string;
  full_name: string;
  country: string;
  reply_content: string | null;
  reply_author: string | null;
  reactions: Array<{ emoji: string; userId: string }> | null;
}

interface GroupSettings {
  isClosed: boolean;
  onlineCount: number;
  pinnedMessages: Array<{ id: number; content: string; full_name: string }>;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function getInitial(name: string) {
  return (name || "?").charAt(0).toUpperCase();
}

function avatarGradient(userId: string) {
  const colors = [
    "linear-gradient(135deg,#1d4ed8,#7c3aed)",
    "linear-gradient(135deg,#059669,#0891b2)",
    "linear-gradient(135deg,#dc2626,#db2777)",
    "linear-gradient(135deg,#d97706,#15803d)",
    "linear-gradient(135deg,#7c3aed,#db2777)",
    "linear-gradient(135deg,#0284c7,#059669)",
  ];
  let hash = 0;
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function groupReactions(reactions: Array<{ emoji: string; userId: string }> | null) {
  if (!reactions || reactions.length === 0) return [];
  const map: Record<string, string[]> = {};
  for (const r of reactions) {
    if (!map[r.emoji]) map[r.emoji] = [];
    map[r.emoji].push(r.userId);
  }
  return Object.entries(map).map(([emoji, users]) => ({ emoji, count: users.length, users }));
}

export default function CommunityGroup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [showPinned, setShowPinned] = useState(false);
  const [msgMenu, setMsgMenu] = useState<number | null>(null);
  const [emojiFor, setEmojiFor] = useState<number | null>(null);
  const [lastId, setLastId] = useState<number>(0);
  const [allMessages, setAllMessages] = useState<GroupMessage[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const isAdmin = (user as any)?.role === "admin" || (user as any)?.isAdmin;
  const myId = (user as any)?.id;

  // Settings (poll every 10s)
  const { data: settings } = useQuery<GroupSettings>({
    queryKey: ["/api/group/settings"],
    refetchInterval: 10_000,
  });

  // Initial messages load
  const { data: initialMessages } = useQuery<GroupMessage[]>({
    queryKey: ["/api/group/messages"],
    staleTime: 0,
  });

  useEffect(() => {
    if (initialMessages && allMessages.length === 0) {
      setAllMessages(initialMessages);
      if (initialMessages.length > 0) setLastId(initialMessages[initialMessages.length - 1].id);
    }
  }, [initialMessages]);

  // Poll new messages every 3s
  const pollMessages = useCallback(async () => {
    if (lastId === 0 && allMessages.length === 0) return;
    try {
      const after = lastId > 0 ? lastId : 0;
      const res = await fetch(`/api/group/messages?after=${after}`, { credentials: "include" });
      if (!res.ok) return;
      const newMsgs: GroupMessage[] = await res.json();
      if (newMsgs.length > 0) {
        setAllMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const fresh = newMsgs.filter((m) => !existing.has(m.id));
          if (fresh.length === 0) return prev;
          return [...prev, ...fresh];
        });
        setLastId(newMsgs[newMsgs.length - 1].id);
      }
    } catch (_) {}
  }, [lastId, allMessages.length]);

  useEffect(() => {
    const id = setInterval(pollMessages, 3000);
    return () => clearInterval(id);
  }, [pollMessages]);

  // Auto scroll
  useEffect(() => {
    if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, autoScroll]);

  // Send message mutation
  const sendMut = useMutation({
    mutationFn: (data: { content: string; type?: string; replyToId?: number }) =>
      apiRequest("POST", "/api/group/messages", data),
    onSuccess: async () => {
      setText("");
      setReplyTo(null);
      setShowEmoji(false);
      setAutoScroll(true);
      await pollMessages();
      qc.invalidateQueries({ queryKey: ["/api/group/messages"] });
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      if (msg.includes("group_closed")) toast({ title: "Groupe fermé", description: "L'administrateur a fermé le groupe.", variant: "destructive" });
      else if (msg.includes("user_blocked")) toast({ title: "Accès restreint", description: "Vous êtes bloqué dans ce groupe.", variant: "destructive" });
      else toast({ title: "Erreur", description: "Impossible d'envoyer le message.", variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/group/messages/${id}`),
    onSuccess: () => {
      setAllMessages((prev) => prev.map((m) => m.id === msgMenu ? { ...m, is_deleted: true, content: "🗑️ Message supprimé" } : m));
      setMsgMenu(null);
    },
  });

  const adminDeleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/group/messages/${id}`),
    onSuccess: (_, id) => {
      setAllMessages((prev) => prev.map((m) => m.id === id ? { ...m, is_deleted: true, content: "🗑️ Message supprimé par l'administrateur" } : m));
      setMsgMenu(null);
    },
  });

  const pinMut = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/admin/group/messages/${id}/pin`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/group/settings"] }); setMsgMenu(null); },
  });

  const blockMut = useMutation({
    mutationFn: (userId: string) => apiRequest("POST", `/api/admin/group/block/${userId}`),
    onSuccess: () => { setMsgMenu(null); toast({ title: "Utilisateur bloqué" }); },
  });

  const reactMut = useMutation({
    mutationFn: ({ id, emoji }: { id: number; emoji: string }) =>
      apiRequest("POST", `/api/group/messages/${id}/react`, { emoji }),
    onSuccess: async () => { await pollMessages(); },
  });

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sendMut.isPending) return;
    sendMut.mutate({ content: trimmed, type: "text", replyToId: replyTo?.id });
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { toast({ title: "Image trop grande", description: "Max 5 Mo.", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      sendMut.mutate({ content: reader.result as string, type: "image", replyToId: replyTo?.id });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const displayed = searchQ
    ? allMessages.filter((m) => m.content.toLowerCase().includes(searchQ.toLowerCase()) && !m.is_deleted)
    : allMessages;

  const isClosed = settings?.isClosed ?? false;

  return (
    <div className="flex flex-col h-screen" style={{ background: "#0e1621" }}>

      {/* ── HEADER ── */}
      <header className="flex items-center gap-3 px-3 py-3 flex-shrink-0 border-b border-white/5"
        style={{ background: "#17212b" }}>
        <Link href="/">
          <button className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/10 active:scale-95 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>

        {/* Avatar groupe */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-sm"
          style={{ background: "linear-gradient(135deg,#1a237e,#1565c0)" }}>
          ST
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">SIKA TEXTE — Groupe</span>
            {isClosed && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>FERMÉ</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-green-400 text-[11px]">{settings?.onlineCount ?? 0} en ligne</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {settings?.pinnedMessages && settings.pinnedMessages.length > 0 && (
            <button onClick={() => setShowPinned(!showPinned)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:bg-white/10 transition active:scale-95">
              <Pin className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => { setShowSearch(!showSearch); setSearchQ(""); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:bg-white/10 transition active:scale-95">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── SEARCH BAR ── */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-shrink-0" style={{ background: "#17212b" }}>
          <Search className="w-4 h-4 text-white/40 flex-shrink-0" />
          <input
            autoFocus
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Rechercher dans les messages…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
          />
          {searchQ && <button onClick={() => setSearchQ("")}><X className="w-4 h-4 text-white/40" /></button>}
        </div>
      )}

      {/* ── MESSAGES ÉPINGLÉS ── */}
      {showPinned && settings?.pinnedMessages && settings.pinnedMessages.length > 0 && (
        <div className="flex-shrink-0 border-b border-white/5 px-4 py-2 space-y-1" style={{ background: "#1c2a3a" }}>
          <div className="flex items-center gap-2 mb-1">
            <Pin className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-400 text-[11px] font-bold">Messages épinglés</span>
          </div>
          {settings.pinnedMessages.map((p) => (
            <div key={p.id} className="text-white/60 text-xs truncate">
              <span className="text-white/40">{p.full_name} : </span>{p.content}
            </div>
          ))}
        </div>
      )}

      {/* ── GROUPE FERMÉ BANNER ── */}
      {isClosed && (
        <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ background: "rgba(239,68,68,0.12)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
          <Lock className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-xs font-medium">Ce groupe est temporairement fermé par l'administrateur.</span>
        </div>
      )}

      {/* ── MESSAGES AREA ── */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        style={{ overscrollBehavior: "contain" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
          setAutoScroll(nearBottom);
        }}
      >
        {displayed.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Users className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/30 text-sm text-center">
              {searchQ ? "Aucun message trouvé" : "Soyez le premier à écrire dans le groupe !"}
            </p>
          </div>
        )}

        {displayed.map((msg) => {
          const isMe = msg.user_id === myId;
          const grouped = groupReactions(msg.reactions);

          return (
            <div key={msg.id} className={`flex gap-2 items-end group ${isMe ? "flex-row-reverse" : ""}`}>
              {/* Avatar (autres) */}
              {!isMe && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-1"
                  style={{ background: avatarGradient(msg.user_id) }}>
                  {getInitial(msg.full_name)}
                </div>
              )}

              <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                {/* Nom (messages des autres) */}
                {!isMe && !msg.is_deleted && (
                  <span className="text-[11px] font-semibold ml-1" style={{ color: avatarGradient(msg.user_id).match(/#[0-9a-f]{6}/i)?.[0] ?? "#60a5fa" }}>
                    {msg.full_name} {COUNTRY_FLAGS[msg.country] ?? ""}
                  </span>
                )}

                {/* Bulle */}
                <div className={`relative rounded-2xl ${isMe ? "rounded-br-sm" : "rounded-bl-sm"} px-3 py-2 ${msg.is_deleted ? "opacity-50" : ""}`}
                  style={{ background: isMe ? "#2b5278" : "#182533" }}>

                  {/* Reply context */}
                  {msg.reply_to_id && msg.reply_content && !msg.is_deleted && (
                    <div className="rounded-lg px-2 py-1.5 mb-1.5 border-l-2 border-blue-400" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <p className="text-blue-300 text-[10px] font-bold">{msg.reply_author}</p>
                      <p className="text-white/60 text-[11px] truncate">{msg.reply_content}</p>
                    </div>
                  )}

                  {/* Content */}
                  {msg.type === "image" && !msg.is_deleted ? (
                    <img src={msg.content} alt="img" className="rounded-xl max-w-full max-h-56 object-contain" style={{ maxWidth: 220 }} />
                  ) : (
                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  )}

                  {/* Time + menu */}
                  <div className={`flex items-center gap-1.5 mt-0.5 ${isMe ? "justify-end" : ""}`}>
                    <span className="text-white/30 text-[10px]">{formatTime(msg.created_at)}</span>
                    {(isMe || isAdmin) && !msg.is_deleted && (
                      <button
                        onClick={() => setMsgMenu(msgMenu === msg.id ? null : msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-3 h-3 text-white/40" />
                      </button>
                    )}
                  </div>

                  {/* Context menu */}
                  {msgMenu === msg.id && (
                    <div className={`absolute bottom-full mb-1 ${isMe ? "right-0" : "left-0"} bg-[#17212b] rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-20 min-w-[160px]`}>
                      <button onClick={() => { setReplyTo(msg); setMsgMenu(null); inputRef.current?.focus(); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-white/80 text-sm hover:bg-white/5 transition">
                        <Reply className="w-4 h-4 text-blue-400" /><span>Répondre</span>
                      </button>
                      <button onClick={() => setEmojiFor(emojiFor === msg.id ? null : msg.id)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-white/80 text-sm hover:bg-white/5 transition">
                        <Smile className="w-4 h-4 text-yellow-400" /><span>Réagir</span>
                      </button>
                      {isAdmin && (
                        <button onClick={() => pinMut.mutate(msg.id)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-white/80 text-sm hover:bg-white/5 transition">
                          <Pin className="w-4 h-4 text-yellow-400" /><span>{msg.is_pinned ? "Désépingler" : "Épingler"}</span>
                        </button>
                      )}
                      {isAdmin && !isMe && (
                        <button onClick={() => blockMut.mutate(msg.user_id)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 text-sm hover:bg-white/5 transition">
                          <Lock className="w-4 h-4" /><span>Bloquer</span>
                        </button>
                      )}
                      {isMe && (
                        <button onClick={() => deleteMut.mutate(msg.id)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 text-sm hover:bg-white/5 transition">
                          <Trash2 className="w-4 h-4" /><span>Supprimer</span>
                        </button>
                      )}
                      {isAdmin && !isMe && (
                        <button onClick={() => adminDeleteMut.mutate(msg.id)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 text-sm hover:bg-white/5 transition">
                          <Trash2 className="w-4 h-4" /><span>Supprimer (admin)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Emoji picker for reactions */}
                {emojiFor === msg.id && (
                  <div className="flex flex-wrap gap-1.5 mt-1 px-2 py-2 rounded-2xl max-w-[220px]" style={{ background: "#17212b", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {QUICK_EMOJIS.map((e) => (
                      <button key={e} onClick={() => { reactMut.mutate({ id: msg.id, emoji: e }); setEmojiFor(null); setMsgMenu(null); }}
                        className="text-xl hover:scale-125 transition-transform active:scale-95">{e}</button>
                    ))}
                  </div>
                )}

                {/* Reactions display */}
                {grouped.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {grouped.map(({ emoji, count, users }) => (
                      <button key={emoji}
                        onClick={() => reactMut.mutate({ id: msg.id, emoji })}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition ${users.includes(myId) ? "bg-blue-600/40 border border-blue-400/50" : "bg-white/8 border border-white/10"}`}
                        style={{ background: users.includes(myId) ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)" }}>
                        <span>{emoji}</span>
                        {count > 1 && <span className="text-white/70">{count}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── FULL EMOJI PICKER ── */}
      {showEmoji && (
        <div className="flex-shrink-0 px-3 py-3 grid grid-cols-8 gap-2 border-t border-white/5" style={{ background: "#17212b" }}>
          {EMOJI_PICKER_LIST.map((e) => (
            <button key={e} onClick={() => { setText((t) => t + e); setShowEmoji(false); inputRef.current?.focus(); }}
              className="text-xl text-center hover:scale-125 transition-transform active:scale-95">{e}</button>
          ))}
        </div>
      )}

      {/* ── REPLY PREVIEW ── */}
      {replyTo && (
        <div className="flex items-center gap-3 px-3 py-2 border-t border-white/5 flex-shrink-0" style={{ background: "#17212b" }}>
          <div className="flex-1 min-w-0 border-l-2 border-blue-400 pl-2">
            <p className="text-blue-300 text-[10px] font-bold">{replyTo.full_name}</p>
            <p className="text-white/60 text-xs truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-white/40 hover:text-white/70 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div className="flex-shrink-0 px-3 py-3 flex items-end gap-2 border-t border-white/5" style={{ background: "#17212b" }}>
        <button onClick={() => setShowEmoji(!showEmoji)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 transition flex-shrink-0 mb-0.5">
          <Smile className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-end rounded-2xl px-3 py-2 min-h-[40px]" style={{ background: "#2b3d4f" }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isClosed}
            placeholder={isClosed ? "Groupe fermé" : "Message…"}
            rows={1}
            className="flex-1 bg-transparent text-white text-sm outline-none resize-none placeholder-white/30 max-h-28 leading-relaxed"
            style={{ lineHeight: "1.5" }}
          />
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <button onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 transition flex-shrink-0 mb-0.5">
          <Image className="w-5 h-5" />
        </button>

        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMut.isPending || isClosed}
          className="w-9 h-9 rounded-full flex items-center justify-center transition flex-shrink-0 mb-0.5 disabled:opacity-40 active:scale-95"
          style={{ background: text.trim() && !isClosed ? "#2b5278" : "rgba(255,255,255,0.08)" }}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Close menu on outside click */}
      {(msgMenu !== null || emojiFor !== null) && (
        <div className="fixed inset-0 z-10" onClick={() => { setMsgMenu(null); setEmojiFor(null); }} />
      )}
    </div>
  );
}
