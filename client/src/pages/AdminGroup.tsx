import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, Users, MessageSquare, Lock, Unlock, Trash2,
  Pin, Shield, ShieldOff, RefreshCw, AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const COUNTRY_FLAGS: Record<string, string> = {
  BJ: "🇧🇯", CI: "🇨🇮", SN: "🇸🇳", BF: "🇧🇫", TG: "🇹🇬", CM: "🇨🇲", ML: "🇲🇱",
};

interface GroupMessage {
  id: number; content: string; type: string; is_deleted: boolean; is_pinned: boolean;
  created_at: string; user_id: string; full_name: string; country: string;
  reply_content?: string; reply_author?: string;
  reactions?: Array<{ emoji: string; userId: string }>;
}

interface GroupStats {
  totalMessages: number; totalUsers: number; blockedUsers: number;
  recentMessages: GroupMessage[];
}

interface BlockedUser { user_id: string; blocked_at: string; full_name: string; phone: string; }
interface GroupSettings { isClosed: boolean; onlineCount: number; pinnedMessages: any[]; }

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h`;
}

function getInitial(name: string) { return (name || "?").charAt(0).toUpperCase(); }

export default function AdminGroup() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"messages" | "blocked">("messages");

  const { data: settings, refetch: refetchSettings } = useQuery<GroupSettings>({
    queryKey: ["/api/group/settings"],
    refetchInterval: 15_000,
  });

  const { data: stats, isLoading, refetch: refetchStats } = useQuery<GroupStats>({
    queryKey: ["/api/admin/group/stats"],
    refetchInterval: 15_000,
  });

  const { data: blocked = [], refetch: refetchBlocked } = useQuery<BlockedUser[]>({
    queryKey: ["/api/admin/group/blocked"],
  });

  const toggleClosedMut = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/admin/group/toggle-closed"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/group/settings"] });
      toast({ title: settings?.isClosed ? "Groupe ouvert" : "Groupe fermé" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/group/messages/${id}`),
    onSuccess: () => { refetchStats(); toast({ title: "Message supprimé" }); },
  });

  const pinMut = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/admin/group/messages/${id}/pin`),
    onSuccess: () => { refetchStats(); qc.invalidateQueries({ queryKey: ["/api/group/settings"] }); },
  });

  const unblockMut = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/admin/group/block/${userId}`),
    onSuccess: () => { refetchBlocked(); toast({ title: "Utilisateur débloqué" }); },
  });

  const isClosed = settings?.isClosed ?? false;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg,#0a0f1e 0%,#0f1f3d 60%,#0a0f1e 100%)" }}>

      {/* HEADER */}
      <header className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3 border-b border-white/10"
        style={{ background: "rgba(10,15,30,0.88)", backdropFilter: "blur(12px)" }}>
        <Link href="/admin">
          <button className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-black text-base leading-none">Groupe en Ligne</h1>
          <p className="text-blue-300 text-[11px] mt-0.5">Gestion de la communauté</p>
        </div>
        <button onClick={() => { refetchStats(); refetchSettings(); refetchBlocked(); }}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition">
          <RefreshCw className="w-4 h-4 text-white" />
        </button>
      </header>

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-4">

        {/* STATS */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "En ligne", value: settings?.onlineCount ?? 0, color: "#22c55e", icon: <Users className="w-4 h-4" /> },
            { label: "Messages", value: stats?.totalMessages ?? 0, color: "#3b82f6", icon: <MessageSquare className="w-4 h-4" /> },
            { label: "Auteurs", value: stats?.totalUsers ?? 0, color: "#a855f7", icon: <Shield className="w-4 h-4" /> },
            { label: "Bloqués", value: stats?.blockedUsers ?? 0, color: "#ef4444", icon: <ShieldOff className="w-4 h-4" /> },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
              <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
              <p className="text-white font-black text-xl leading-none">{s.value}</p>
              <p className="text-white/40 text-[9px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* TOGGLE GROUPE */}
        <div className="rounded-2xl px-4 py-4 flex items-center gap-4"
          style={{ background: isClosed ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.08)", border: `1px solid ${isClosed ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.2)"}` }}>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isClosed ? <Lock className="w-5 h-5 text-red-400" /> : <Unlock className="w-5 h-5 text-green-400" />}
              <span className="text-white font-bold text-sm">{isClosed ? "Groupe FERMÉ" : "Groupe OUVERT"}</span>
            </div>
            <p className="text-white/50 text-xs mt-0.5">
              {isClosed ? "Personne ne peut écrire actuellement." : "Les membres peuvent envoyer des messages."}
            </p>
          </div>
          <button
            onClick={() => toggleClosedMut.mutate()}
            disabled={toggleClosedMut.isPending}
            className="px-4 py-2 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50"
            style={{ background: isClosed ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: isClosed ? "#22c55e" : "#ef4444" }}
          >
            {toggleClosedMut.isPending ? "…" : isClosed ? "Ouvrir" : "Fermer"}
          </button>
        </div>

        {/* LIEN ACCÈS DIRECT */}
        <Link href="/community-group">
          <a className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-semibold text-sm transition active:scale-95"
            style={{ background: "linear-gradient(135deg,#1a237e,#1565c0)" }}>
            <MessageSquare className="w-4 h-4" />
            Voir le groupe en ligne
          </a>
        </Link>

        {/* TABS */}
        <div className="flex rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["messages", "blocked"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-3 text-sm font-bold transition"
              style={tab === t ? { background: "#1565c0", color: "white" } : { color: "rgba(255,255,255,0.5)" }}>
              {t === "messages" ? `💬 Messages récents` : `🚫 Utilisateurs bloqués (${blocked.length})`}
            </button>
          ))}
        </div>

        {/* MESSAGES TAB */}
        {tab === "messages" && (
          <div className="space-y-2">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              ))
            ) : (stats?.recentMessages ?? []).length === 0 ? (
              <div className="text-center py-12 text-white/30 text-sm">Aucun message pour l'instant</div>
            ) : (
              (stats?.recentMessages ?? []).map((msg) => (
                <div key={msg.id}
                  className={`rounded-2xl px-4 py-3 ${msg.is_deleted ? "opacity-40" : ""}`}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)" }}>
                      {getInitial(msg.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-xs">{msg.full_name}</span>
                        <span className="text-white/40 text-[10px]">{COUNTRY_FLAGS[msg.country] ?? ""}</span>
                        {msg.is_pinned && <span className="text-yellow-400 text-[9px] font-bold">📌 ÉPINGLÉ</span>}
                        {msg.is_deleted && <span className="text-red-400 text-[9px] font-bold">SUPPRIMÉ</span>}
                      </div>
                      {msg.type === "image" ? (
                        <img src={msg.content} alt="img" className="rounded-xl mt-1 max-h-20 object-cover" />
                      ) : (
                        <p className="text-white/70 text-xs mt-0.5 break-words line-clamp-3">{msg.content}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-white/30 text-[10px]">{timeAgo(msg.created_at)}</span>
                      {!msg.is_deleted && (
                        <div className="flex gap-1">
                          <button onClick={() => pinMut.mutate(msg.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition active:scale-95"
                            title={msg.is_pinned ? "Désépingler" : "Épingler"}>
                            <Pin className="w-3.5 h-3.5 text-yellow-400" />
                          </button>
                          <button onClick={() => deleteMut.mutate(msg.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition active:scale-95">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* BLOCKED TAB */}
        {tab === "blocked" && (
          <div className="space-y-2">
            {blocked.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-sm">Aucun utilisateur bloqué</div>
            ) : (
              blocked.map((u) => (
                <div key={u.user_id}
                  className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <div className="w-9 h-9 rounded-xl bg-red-900/40 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    {getInitial(u.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{u.full_name}</p>
                    <p className="text-white/50 text-xs">{u.phone} · bloqué {timeAgo(u.blocked_at)}</p>
                  </div>
                  <button
                    onClick={() => unblockMut.mutate(u.user_id)}
                    disabled={unblockMut.isPending}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95"
                    style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}
                  >
                    Débloquer
                  </button>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
