import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import {
  ChevronLeft, Send, ImageIcon, Smile, Search, X, Pin,
  Reply, Trash2, Users, Lock, MoreVertical
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/* ─── Constants ────────────────────────────────────────────── */
const FLAGS: Record<string, string> = {
  BJ:"🇧🇯", CI:"🇨🇮", SN:"🇸🇳", BF:"🇧🇫", TG:"🇹🇬", CM:"🇨🇲", ML:"🇲🇱",
};
const QUICK_EMOJI = ["👍","❤️","😂","😮","😢","🙏","🔥","💯","✅","👏","🎉","💪"];
const EMOJI_GRID  = [
  "😀","😂","🥲","😍","🤩","😎","🥳","😴","🤔","😱","😡","🥺",
  "👍","👎","❤️","🔥","💯","✅","🎉","🙏","💪","👏","🫡","😅",
  "🤣","😇","🥰","😘","🤗","😜","🧐","🤯","😤","🤭","🫶","💥",
  "⭐","✨","🚀","💰","💸","🏆","🎯","🎁","📱","💬","📣","🔔",
];

/* ─── Types ─────────────────────────────────────────────────── */
interface Msg {
  id: number; content: string; type: string;
  is_deleted: boolean; is_pinned: boolean; created_at: string;
  reply_to_id: number | null; user_id: string;
  full_name: string; country: string;
  reply_content: string | null; reply_author: string | null;
  reactions: Array<{ emoji: string; userId: string }> | null;
}
interface Settings {
  isClosed: boolean; onlineCount: number;
  pinnedMessages: Array<{ id:number; content:string; full_name:string }>;
}

/* ─── Helpers ───────────────────────────────────────────────── */
function fmt(ts: string) {
  return new Date(ts).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
}
function initial(n: string) { return (n||"?").charAt(0).toUpperCase(); }
function avatarBg(uid: string) {
  const palette = [
    "#1d4ed8","#7c3aed","#059669","#dc2626","#d97706","#0284c7","#db2777",
  ];
  let h = 0;
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}
function groupReact(r: Msg["reactions"]) {
  if (!r || !r.length) return [];
  const m: Record<string, string[]> = {};
  for (const x of r) { if (!m[x.emoji]) m[x.emoji]=[]; m[x.emoji].push(x.userId); }
  return Object.entries(m).map(([emoji, users]) => ({ emoji, count: users.length, users }));
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function CommunityGroup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const scrollRef   = useRef<HTMLDivElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  const [text,       setText]       = useState("");
  const [replyTo,    setReplyTo]    = useState<Msg | null>(null);
  const [showEmoji,  setShowEmoji]  = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ,    setSearchQ]    = useState("");
  const [showPinned, setShowPinned] = useState(false);
  const [menuId,     setMenuId]     = useState<number | null>(null);
  const [emojiFor,   setEmojiFor]   = useState<number | null>(null);
  const [msgs,       setMsgs]       = useState<Msg[]>([]);
  const [lastId,     setLastId]     = useState(0);
  const [atBottom,   setAtBottom]   = useState(true);

  const me      = (user as any)?.id  ?? "";
  const isAdmin = !!(user as any)?.isAdmin || (user as any)?.role === "admin";

  /* Settings */
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/group/settings"],
    refetchInterval: 10_000,
  });
  const isClosed = settings?.isClosed ?? false;

  /* Initial load */
  const { data: initMsgs } = useQuery<Msg[]>({
    queryKey: ["/api/group/messages"],
    staleTime: 0,
  });
  useEffect(() => {
    if (initMsgs && msgs.length === 0) {
      setMsgs(initMsgs);
      if (initMsgs.length) setLastId(initMsgs[initMsgs.length - 1].id);
    }
  }, [initMsgs]);

  /* Polling (3 s) */
  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/group/messages?after=${lastId}`, { credentials:"include" });
      if (!r.ok) return;
      const fresh: Msg[] = await r.json();
      if (!fresh.length) return;
      setMsgs(prev => {
        const have = new Set(prev.map(m => m.id));
        const add  = fresh.filter(m => !have.has(m.id));
        return add.length ? [...prev, ...add] : prev;
      });
      setLastId(fresh[fresh.length - 1].id);
    } catch(_) {}
  }, [lastId]);

  useEffect(() => {
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [poll]);

  /* Auto-scroll */
  useEffect(() => {
    if (atBottom) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior:"smooth" });
  }, [msgs, atBottom]);

  /* ── Mutations ── */
  const sendMut = useMutation({
    mutationFn: (d: { content:string; type?:string; replyToId?:number }) =>
      apiRequest("POST", "/api/group/messages", d),
    onSuccess: async () => {
      setText(""); setReplyTo(null); setShowEmoji(false); setAtBottom(true);
      await poll();
    },
    onError: (e: any) => {
      const m = e?.message ?? "";
      if (m.includes("group_closed"))  toast({ title:"Groupe fermé", variant:"destructive" });
      else if (m.includes("user_blocked")) toast({ title:"Vous êtes bloqué", variant:"destructive" });
      else toast({ title:"Erreur d'envoi", variant:"destructive" });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/group/messages/${id}`),
    onSuccess: (_,id) => { patchDel(id,"🗑️ Message supprimé"); setMenuId(null); },
  });
  const adminDelMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/group/messages/${id}`),
    onSuccess: (_,id) => { patchDel(id,"🗑️ Message supprimé par l'administrateur"); setMenuId(null); },
  });
  const pinMut = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/admin/group/messages/${id}/pin`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["/api/group/settings"] }); setMenuId(null); },
  });
  const blockMut = useMutation({
    mutationFn: (uid: string) => apiRequest("POST", `/api/admin/group/block/${uid}`),
    onSuccess: () => { setMenuId(null); toast({ title:"Utilisateur bloqué" }); },
  });
  const reactMut = useMutation({
    mutationFn: ({ id, emoji }: { id:number; emoji:string }) =>
      apiRequest("POST", `/api/group/messages/${id}/react`, { emoji }),
    onSuccess: poll,
  });

  function patchDel(id: number, txt: string) {
    setMsgs(p => p.map(m => m.id===id ? { ...m, is_deleted:true, content:txt } : m));
  }

  function send() {
    const t = text.trim();
    if (!t || sendMut.isPending) return;
    sendMut.mutate({ content:t, type:"text", replyToId: replyTo?.id });
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 5_000_000) { toast({ title:"Max 5 Mo", variant:"destructive" }); return; }
    const fr = new FileReader();
    fr.onload = () => sendMut.mutate({ content: fr.result as string, type:"image", replyToId: replyTo?.id });
    fr.readAsDataURL(f);
    e.target.value = "";
  }

  const displayed = searchQ
    ? msgs.filter(m => !m.is_deleted && m.content.toLowerCase().includes(searchQ.toLowerCase()))
    : msgs;

  /* ══════════════════════════════════════════════════════════
     RENDER  — layout: position fixed fills true viewport
     ══════════════════════════════════════════════════════════ */
  return (
    <div
      style={{
        position:"fixed", inset:0,
        display:"flex", flexDirection:"column",
        background:"#0e1621",
        fontFamily:"inherit",
      }}
    >
      {/* ── HEADER ────────────────────────────────────── */}
      <header style={{
        flexShrink:0, display:"flex", alignItems:"center", gap:12,
        padding:"12px 12px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)",
        background:"linear-gradient(135deg,#1a237e 0%,#1565c0 100%)",
      }}>
        <Link href="/">
          <button style={{
            width:36, height:36, borderRadius:12, background:"rgba(255,255,255,0.15)",
            display:"flex", alignItems:"center", justifyContent:"center",
            border:"none", cursor:"pointer", flexShrink:0,
          }}>
            <ChevronLeft style={{ width:20, height:20, color:"#fff" }} />
          </button>
        </Link>

        {/* Groupe avatar */}
        <div style={{
          width:40, height:40, borderRadius:"50%", flexShrink:0,
          background:"rgba(255,255,255,0.2)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:900, color:"#fff", fontSize:14,
        }}>ST</div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:"#fff", fontWeight:800, fontSize:15 }}>SIKA TEXTE — Groupe</span>
            {isClosed && (
              <span style={{
                background:"rgba(239,68,68,0.25)", color:"#fca5a5",
                fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:99,
              }}>FERMÉ</span>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", display:"inline-block" }} />
            <span style={{ color:"#86efac", fontSize:11 }}>{settings?.onlineCount ?? 0} en ligne</span>
          </div>
        </div>

        {/* Action buttons */}
        {settings?.pinnedMessages?.length > 0 && (
          <button onClick={() => setShowPinned(v=>!v)} style={{
            width:32, height:32, borderRadius:10, background:"rgba(255,255,255,0.15)",
            border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Pin style={{ width:16, height:16, color:"#fde68a" }} />
          </button>
        )}
        <button onClick={() => { setShowSearch(v=>!v); setSearchQ(""); }} style={{
          width:32, height:32, borderRadius:10, background:"rgba(255,255,255,0.15)",
          border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <Search style={{ width:16, height:16, color:"#fff" }} />
        </button>
      </header>

      {/* ── SEARCH BAR ───────────────────────────────── */}
      {showSearch && (
        <div style={{
          flexShrink:0, display:"flex", alignItems:"center", gap:10,
          padding:"8px 12px", background:"#17212b", borderBottom:"1px solid rgba(255,255,255,0.07)",
        }}>
          <Search style={{ width:16, height:16, color:"rgba(255,255,255,0.35)", flexShrink:0 }} />
          <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)}
            placeholder="Rechercher…"
            style={{
              flex:1, background:"transparent", border:"none", outline:"none",
              color:"#fff", fontSize:14,
            }} />
          {searchQ && (
            <button onClick={()=>setSearchQ("")} style={{ background:"none", border:"none", cursor:"pointer" }}>
              <X style={{ width:16, height:16, color:"rgba(255,255,255,0.35)" }} />
            </button>
          )}
        </div>
      )}

      {/* ── PINNED ───────────────────────────────────── */}
      {showPinned && (settings?.pinnedMessages ?? []).length > 0 && (
        <div style={{
          flexShrink:0, padding:"8px 14px",
          background:"#1c2a3a", borderBottom:"1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
            <Pin style={{ width:12, height:12, color:"#fbbf24" }} />
            <span style={{ color:"#fbbf24", fontSize:11, fontWeight:700 }}>Messages épinglés</span>
          </div>
          {(settings!.pinnedMessages).map(p => (
            <div key={p.id} style={{ color:"rgba(255,255,255,0.5)", fontSize:12, marginBottom:3 }}>
              <span style={{ color:"rgba(255,255,255,0.3)" }}>{p.full_name}: </span>
              <span>{p.content.slice(0, 80)}{p.content.length>80 ? "…" : ""}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── CLOSED BANNER ────────────────────────────── */}
      {isClosed && (
        <div style={{
          flexShrink:0, display:"flex", alignItems:"center", gap:8,
          padding:"10px 14px", background:"rgba(239,68,68,0.12)",
          borderBottom:"1px solid rgba(239,68,68,0.2)",
        }}>
          <Lock style={{ width:15, height:15, color:"#f87171", flexShrink:0 }} />
          <span style={{ color:"#f87171", fontSize:12 }}>
            Groupe temporairement fermé par l'administrateur.
          </span>
        </div>
      )}

      {/* ── MESSAGES AREA ────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex:1, overflowY:"auto", padding:"12px 10px",
          display:"flex", flexDirection:"column", gap:4,
          WebkitOverflowScrolling:"touch",
        }}
        onScroll={e => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
        }}
      >
        {displayed.length === 0 && (
          <div style={{
            flex:1, display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", gap:12, padding:"40px 0",
          }}>
            <div style={{
              width:64, height:64, borderRadius:"50%",
              background:"rgba(255,255,255,0.06)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Users style={{ width:30, height:30, color:"rgba(255,255,255,0.2)" }} />
            </div>
            <p style={{ color:"rgba(255,255,255,0.3)", fontSize:14, textAlign:"center" }}>
              {searchQ ? "Aucun résultat" : "Soyez le premier à écrire dans le groupe !"}
            </p>
          </div>
        )}

        {displayed.map(msg => {
          const isMe = msg.user_id === me;
          const grouped = groupReact(msg.reactions);
          const bg = avatarBg(msg.user_id);

          return (
            <div key={msg.id}
              style={{
                display:"flex", gap:8, alignItems:"flex-end",
                flexDirection: isMe ? "row-reverse" : "row",
                position:"relative",
              }}
              className="group"
            >
              {/* Avatar (autres uniquement) */}
              {!isMe && (
                <div style={{
                  width:32, height:32, borderRadius:"50%", flexShrink:0,
                  background:bg, display:"flex", alignItems:"center",
                  justifyContent:"center", color:"#fff", fontWeight:700,
                  fontSize:13, marginBottom:2,
                }}>
                  {initial(msg.full_name)}
                </div>
              )}

              <div style={{
                maxWidth:"72%",
                display:"flex", flexDirection:"column",
                alignItems: isMe ? "flex-end" : "flex-start",
                gap:3,
              }}>
                {/* Nom expéditeur */}
                {!isMe && !msg.is_deleted && (
                  <span style={{ color:bg, fontSize:11, fontWeight:700, marginLeft:4 }}>
                    {msg.full_name} {FLAGS[msg.country] ?? ""}
                  </span>
                )}

                {/* Bulle */}
                <div style={{
                  background: isMe ? "#2b5278" : "#182533",
                  borderRadius:16,
                  borderBottomRightRadius: isMe ? 4 : 16,
                  borderBottomLeftRadius:  isMe ? 16 : 4,
                  padding:"8px 12px",
                  opacity: msg.is_deleted ? 0.5 : 1,
                  position:"relative",
                }}>
                  {/* Reply context */}
                  {msg.reply_to_id && msg.reply_content && !msg.is_deleted && (
                    <div style={{
                      borderLeft:"2px solid #60a5fa", paddingLeft:8, marginBottom:6,
                      background:"rgba(255,255,255,0.07)", borderRadius:6, padding:"5px 8px",
                    }}>
                      <p style={{ color:"#93c5fd", fontSize:10, fontWeight:700, marginBottom:2 }}>
                        {msg.reply_author}
                      </p>
                      <p style={{ color:"rgba(255,255,255,0.55)", fontSize:11 }}>
                        {msg.reply_content?.slice(0,80)}
                      </p>
                    </div>
                  )}

                  {/* Content */}
                  {msg.type === "image" && !msg.is_deleted ? (
                    <img src={msg.content} alt="img"
                      style={{ borderRadius:10, maxWidth:200, maxHeight:220, objectFit:"contain", display:"block" }} />
                  ) : (
                    <p style={{ color:"#e2e8f0", fontSize:14, lineHeight:1.5, margin:0, wordBreak:"break-word", whiteSpace:"pre-wrap" }}>
                      {msg.content}
                    </p>
                  )}

                  {/* Time + menu btn */}
                  <div style={{
                    display:"flex", alignItems:"center", gap:6, marginTop:3,
                    justifyContent: isMe ? "flex-end" : "flex-start",
                  }}>
                    <span style={{ color:"rgba(255,255,255,0.28)", fontSize:10 }}>{fmt(msg.created_at)}</span>
                    {msg.is_pinned && <Pin style={{ width:10, height:10, color:"#fbbf24" }} />}
                    {(isMe || isAdmin) && !msg.is_deleted && (
                      <button
                        onClick={e => { e.stopPropagation(); setMenuId(menuId===msg.id ? null : msg.id); setEmojiFor(null); }}
                        style={{ background:"none", border:"none", cursor:"pointer", padding:2, display:"flex", alignItems:"center" }}
                      >
                        <MoreVertical style={{ width:13, height:13, color:"rgba(255,255,255,0.3)" }} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Context menu */}
                {menuId === msg.id && (
                  <div style={{
                    position:"absolute",
                    top: isMe ? "auto" : "calc(100% + 4px)",
                    bottom: isMe ? "calc(100% + 4px)" : "auto",
                    right: isMe ? 0 : "auto",
                    left:  isMe ? "auto" : 36,
                    background:"#1e2d3d",
                    borderRadius:16, overflow:"hidden",
                    boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
                    border:"1px solid rgba(255,255,255,0.1)",
                    zIndex:50, minWidth:170,
                  }}
                    onClick={e => e.stopPropagation()}
                  >
                    {[
                      { label:"Répondre", icon:<Reply style={{width:15,height:15,color:"#60a5fa"}}/>, action:()=>{ setReplyTo(msg); setMenuId(null); inputRef.current?.focus(); } },
                      { label:"Réagir", icon:<Smile style={{width:15,height:15,color:"#fbbf24"}}/>, action:()=>{ setEmojiFor(emojiFor===msg.id ? null : msg.id); setMenuId(null); } },
                      ...(isAdmin ? [
                        { label: msg.is_pinned ? "Désépingler":"Épingler", icon:<Pin style={{width:15,height:15,color:"#fbbf24"}}/>, action:()=>pinMut.mutate(msg.id) },
                      ] : []),
                      ...(isMe ? [
                        { label:"Supprimer", icon:<Trash2 style={{width:15,height:15,color:"#f87171"}}/>, action:()=>delMut.mutate(msg.id) },
                      ] : []),
                      ...(isAdmin && !isMe ? [
                        { label:"Bloquer l'utilisateur", icon:<Lock style={{width:15,height:15,color:"#f87171"}}/>, action:()=>blockMut.mutate(msg.user_id) },
                        { label:"Supprimer (admin)", icon:<Trash2 style={{width:15,height:15,color:"#f87171"}}/>, action:()=>adminDelMut.mutate(msg.id) },
                      ] : []),
                    ].map((item, i) => (
                      <button key={i} onClick={item.action} style={{
                        display:"flex", alignItems:"center", gap:10,
                        width:"100%", padding:"11px 16px",
                        background:"none", border:"none", cursor:"pointer",
                        color:"rgba(255,255,255,0.8)", fontSize:13, textAlign:"left",
                      }}
                        onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                        onMouseLeave={e=>(e.currentTarget.style.background="none")}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Emoji picker (for reacting) */}
                {emojiFor === msg.id && (
                  <div style={{
                    display:"flex", flexWrap:"wrap", gap:6, padding:"8px 10px",
                    background:"#1e2d3d", borderRadius:14, maxWidth:240,
                    border:"1px solid rgba(255,255,255,0.08)",
                  }}>
                    {QUICK_EMOJI.map(e => (
                      <button key={e} onClick={()=>{ reactMut.mutate({ id:msg.id, emoji:e }); setEmojiFor(null); }}
                        style={{ fontSize:20, background:"none", border:"none", cursor:"pointer",
                          lineHeight:1, padding:2 }}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                {/* Reactions display */}
                {grouped.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {grouped.map(({ emoji, count, users }) => (
                      <button key={emoji}
                        onClick={() => reactMut.mutate({ id:msg.id, emoji })}
                        style={{
                          display:"flex", alignItems:"center", gap:4,
                          padding:"2px 8px", borderRadius:99, fontSize:13,
                          background: users.includes(me) ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)",
                          border: users.includes(me) ? "1px solid rgba(96,165,250,0.5)" : "1px solid rgba(255,255,255,0.1)",
                          cursor:"pointer",
                        }}>
                        <span>{emoji}</span>
                        {count > 1 && <span style={{ color:"rgba(255,255,255,0.6)", fontSize:11 }}>{count}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {/* scroll anchor */}
        <div style={{ height:1 }} />
      </div>

      {/* ── FULL EMOJI PICKER ───────────────────────── */}
      {showEmoji && (
        <div style={{
          flexShrink:0, padding:"10px 12px",
          display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:8,
          background:"#17212b", borderTop:"1px solid rgba(255,255,255,0.07)",
        }}>
          {EMOJI_GRID.map(e => (
            <button key={e} onClick={()=>{ setText(t=>t+e); setShowEmoji(false); inputRef.current?.focus(); }}
              style={{ fontSize:22, background:"none", border:"none", cursor:"pointer", textAlign:"center" }}>
              {e}
            </button>
          ))}
        </div>
      )}

      {/* ── REPLY PREVIEW ───────────────────────────── */}
      {replyTo && (
        <div style={{
          flexShrink:0, display:"flex", alignItems:"center", gap:10,
          padding:"8px 12px", background:"#17212b",
          borderTop:"1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ borderLeft:"3px solid #60a5fa", paddingLeft:8, flex:1, minWidth:0 }}>
            <p style={{ color:"#93c5fd", fontSize:11, fontWeight:700, marginBottom:2 }}>{replyTo.full_name}</p>
            <p style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>{replyTo.content.slice(0,60)}</p>
          </div>
          <button onClick={()=>setReplyTo(null)}
            style={{ background:"none", border:"none", cursor:"pointer" }}>
            <X style={{ width:16, height:16, color:"rgba(255,255,255,0.4)" }} />
          </button>
        </div>
      )}

      {/* ── INPUT BAR ───────────────────────────────── */}
      <div style={{
        flexShrink:0, display:"flex", alignItems:"flex-end", gap:8,
        padding:"10px 12px 12px",
        background:"#17212b", borderTop:"1px solid rgba(255,255,255,0.07)",
      }}>
        {/* Emoji button */}
        <button onClick={()=>setShowEmoji(v=>!v)} style={{
          width:38, height:38, borderRadius:"50%", background:"none",
          border:"none", cursor:"pointer", flexShrink:0, marginBottom:1,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <Smile style={{ width:22, height:22, color:"rgba(255,255,255,0.45)" }} />
        </button>

        {/* Text area */}
        <div style={{
          flex:1, background:"#2b3d4f", borderRadius:22,
          padding:"9px 14px", display:"flex", alignItems:"flex-end",
        }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKey}
            disabled={isClosed}
            placeholder={isClosed ? "Groupe fermé…" : "Message…"}
            rows={1}
            style={{
              flex:1, background:"transparent", border:"none", outline:"none",
              color:"#e2e8f0", fontSize:14, resize:"none", lineHeight:1.5,
              maxHeight:100, fontFamily:"inherit",
            }}
          />
        </div>

        {/* Image button */}
        <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={onFile} />
        <button onClick={()=>fileRef.current?.click()} style={{
          width:38, height:38, borderRadius:"50%", background:"none",
          border:"none", cursor:"pointer", flexShrink:0, marginBottom:1,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <ImageIcon style={{ width:22, height:22, color:"rgba(255,255,255,0.45)" }} />
        </button>

        {/* Send button */}
        <button onClick={send} disabled={!text.trim() || sendMut.isPending || isClosed}
          style={{
            width:38, height:38, borderRadius:"50%", flexShrink:0, marginBottom:1,
            background: text.trim() && !isClosed ? "#2b5278" : "rgba(255,255,255,0.1)",
            border:"none", cursor: text.trim() ? "pointer" : "default",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"background 0.2s",
          }}>
          <Send style={{ width:17, height:17, color:"#fff", marginLeft:2 }} />
        </button>
      </div>

      {/* Click outside to close menus */}
      {(menuId !== null || emojiFor !== null) && (
        <div style={{ position:"fixed", inset:0, zIndex:40 }}
          onClick={() => { setMenuId(null); setEmojiFor(null); }} />
      )}
    </div>
  );
}
