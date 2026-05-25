import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, MessageSquare, Users, HelpCircle, ChevronLeft as Prev, ChevronRight as Next, Clock, BookOpen, Plus, Trash2, Edit3, ToggleLeft, ToggleRight, Check, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const COUNTRY_FLAGS: Record<string, string> = {
  BJ: "🇧🇯", CI: "🇨🇮", SN: "🇸🇳", BF: "🇧🇫", TG: "🇹🇬", CM: "🇨🇲", ML: "🇲🇱",
};

interface AIChatStats {
  totalUsers: number;
  totalQuestions: number;
  totalReplies: number;
  lastActivity: string | null;
}

interface Question {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  full_name: string;
  phone: string;
  country: string;
}

interface QuestionsData {
  questions: Question[];
  total: number;
  page: number;
  totalPages: number;
}

interface KnowledgeEntry {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function AdminAIChat() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"questions" | "knowledge">("questions");
  const [page, setPage] = useState(1);

  // Knowledge base form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // ── Queries ────────────────────────────────────────────
  const { data: stats } = useQuery<AIChatStats>({
    queryKey: ["/api/admin/ai-chat/stats"],
    refetchInterval: 30_000,
  });

  const { data: qData, isFetching } = useQuery<QuestionsData>({
    queryKey: ["/api/admin/ai-chat/questions", page],
    queryFn: () => fetch(`/api/admin/ai-chat/questions?page=${page}`, { credentials: "include" }).then(r => r.json()),
    staleTime: 15_000,
  });

  const { data: knowledge = [], isLoading: isLoadingKnowledge } = useQuery<KnowledgeEntry[]>({
    queryKey: ["/api/admin/ai-knowledge"],
    staleTime: 10_000,
  });

  // ── Mutations ──────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (body: { title: string; content: string }) => {
      const res = await apiRequest("POST", "/api/admin/ai-knowledge", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-knowledge"] });
      setNewTitle("");
      setNewContent("");
      toast({ title: "✅ Entrée ajoutée" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: number; title: string; content: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/ai-knowledge/${id}`, { title, content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-knowledge"] });
      setEditingId(null);
      toast({ title: "✅ Entrée mise à jour" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/ai-knowledge/${id}/toggle`, {});
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-knowledge"] }),
    onError: () => toast({ title: "Erreur toggle", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/ai-knowledge/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-knowledge"] });
      toast({ title: "Entrée supprimée" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const questions = qData?.questions ?? [];
  const totalPages = qData?.totalPages ?? 1;
  const activeCount = knowledge.filter(k => k.is_active).length;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #0c0a1e 0%, #1a1040 60%, #0c0a1e 100%)" }}>

      {/* HEADER */}
      <header className="sticky top-0 z-10 px-4 py-3.5 flex items-center gap-3 border-b border-white/10"
        style={{ background: "rgba(12,10,30,0.90)", backdropFilter: "blur(12px)" }}>
        <Link href="/admin">
          <button className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-bold text-sm leading-none">Lylya — Suivi IA</h1>
          <p className="text-purple-300/70 text-[11px] mt-0.5">Questions & base de connaissances</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">

        {/* STATS */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: <Users className="w-4 h-4" />, label: "Utilisateurs", value: stats?.totalUsers ?? "—", color: "#a855f7", bg: "rgba(168,85,247,0.10)" },
            { icon: <HelpCircle className="w-4 h-4" />, label: "Questions", value: stats?.totalQuestions ?? "—", color: "#3b82f6", bg: "rgba(59,130,246,0.10)" },
            { icon: <MessageSquare className="w-4 h-4" />, label: "Réponses IA", value: stats?.totalReplies ?? "—", color: "#22c55e", bg: "rgba(34,197,94,0.10)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: s.bg, border: `1px solid ${s.color}25` }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <div>
                <p className="text-white font-bold text-xl leading-none">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                <p className="text-white/40 text-[10px] mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {stats?.lastActivity && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Clock className="w-3 h-3 text-purple-400" />
            <span className="text-white/40 text-[11px]">Dernière activité : {timeAgo(stats.lastActivity)}</span>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
          <button
            onClick={() => setTab("questions")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab === "questions"
              ? { background: "#7c3aed", color: "white" }
              : { color: "rgba(255,255,255,0.4)" }}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Questions ({qData?.total ?? 0})
          </button>
          <button
            onClick={() => setTab("knowledge")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab === "knowledge"
              ? { background: "#7c3aed", color: "white" }
              : { color: "rgba(255,255,255,0.4)" }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Connaissances ({activeCount}/{knowledge.length})
          </button>
        </div>

        {/* ── TAB QUESTIONS ── */}
        {tab === "questions" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-xs">
                {qData?.total ? `${qData.total.toLocaleString("fr-FR")} question${qData.total > 1 ? "s" : ""}` : "Chargement…"}
              </p>
              <p className="text-white/30 text-[11px]">Page {page} / {totalPages}</p>
            </div>

            {isFetching && questions.length === 0 ? (
              <div className="space-y-2.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-xl h-16" style={{ background: "rgba(255,255,255,0.05)" }} />
                ))}
              </div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-white/30 text-sm">Aucune question enregistrée</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-xl px-3.5 py-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                        {(q.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white font-medium text-xs">{q.full_name || "—"}</span>
                          <span className="text-white/30 text-[10px]">{COUNTRY_FLAGS[q.country] || "🌍"} {q.phone || "—"}</span>
                        </div>
                        <p className="text-white/70 text-sm leading-relaxed break-words">{q.content}</p>
                      </div>
                      <span className="text-purple-400/70 text-[10px] font-medium whitespace-nowrap flex-shrink-0">{timeAgo(q.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-1 pb-6">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors disabled:opacity-30">
                  <Prev className="w-4 h-4 text-white" />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className="w-8 h-8 rounded-lg text-xs font-bold transition-colors"
                        style={p === page ? { background: "#7c3aed", color: "white" } : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors disabled:opacity-30">
                  <Next className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </>
        )}

        {/* ── TAB BASE DE CONNAISSANCES ── */}
        {tab === "knowledge" && (
          <div className="space-y-4 pb-8">

            {/* Explication */}
            <div className="px-3.5 py-3 rounded-xl text-[11px] text-purple-200/70 leading-relaxed"
              style={{ background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.20)" }}>
              <p className="font-semibold text-purple-300 mb-1">💡 Comment ça fonctionne</p>
              Chaque entrée active est automatiquement injectée dans le contexte de Lylya à chaque conversation. Elle peut s'en servir pour répondre aux questions des utilisateurs. Les entrées inactives sont ignorées.
            </div>

            {/* Formulaire d'ajout */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-white font-semibold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                Nouvelle entrée
              </p>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Titre (ex: Horaires de retrait, Tarifs spéciaux…)"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Contenu de l'information que Lylya doit connaître…"
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/30 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
              <button
                onClick={() => {
                  if (!newTitle.trim() || !newContent.trim()) {
                    toast({ title: "Titre et contenu requis", variant: "destructive" });
                    return;
                  }
                  createMutation.mutate({ title: newTitle.trim(), content: newContent.trim() });
                }}
                disabled={createMutation.isPending}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              >
                {createMutation.isPending ? "Ajout…" : "Ajouter à la base de connaissances"}
              </button>
            </div>

            {/* Liste des entrées */}
            {isLoadingKnowledge ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-xl h-20" style={{ background: "rgba(255,255,255,0.05)" }} />
                ))}
              </div>
            ) : knowledge.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/30 text-sm">Aucune entrée dans la base de connaissances</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {knowledge.map((entry) => (
                  <div key={entry.id} className="rounded-xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${entry.is_active ? "rgba(124,58,237,0.30)" : "rgba(255,255,255,0.07)"}` }}>

                    {editingId === entry.id ? (
                      /* Mode édition */
                      <div className="p-3.5 space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                          style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
                        />
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                          style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateMutation.mutate({ id: entry.id, title: editTitle, content: editContent })}
                            disabled={updateMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                            style={{ background: "#7c3aed" }}
                          >
                            <Check className="w-3 h-3" />
                            Sauvegarder
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 transition-colors"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          >
                            <X className="w-3 h-3" />
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Mode lecture */
                      <div className="p-3.5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entry.is_active ? "bg-purple-400" : "bg-white/20"}`} />
                            <p className="text-white font-semibold text-sm truncate">{entry.title}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Toggle actif/inactif */}
                            <button
                              onClick={() => toggleMutation.mutate(entry.id)}
                              disabled={toggleMutation.isPending}
                              title={entry.is_active ? "Désactiver" : "Activer"}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                              style={{ background: entry.is_active ? "rgba(124,58,237,0.20)" : "rgba(255,255,255,0.06)" }}
                            >
                              {entry.is_active
                                ? <ToggleRight className="w-4 h-4 text-purple-400" />
                                : <ToggleLeft className="w-4 h-4 text-white/30" />}
                            </button>
                            {/* Modifier */}
                            <button
                              onClick={() => { setEditingId(entry.id); setEditTitle(entry.title); setEditContent(entry.content); }}
                              className="w-7 h-7 rounded-lg bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-white/50" />
                            </button>
                            {/* Supprimer */}
                            <button
                              onClick={() => deleteMutation.mutate(entry.id)}
                              disabled={deleteMutation.isPending}
                              className="w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400/60" />
                            </button>
                          </div>
                        </div>
                        <p className="text-white/55 text-xs leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                        <p className="text-white/20 text-[10px] mt-2">
                          Ajouté le {new Date(entry.created_at).toLocaleDateString("fr-FR")} ·{" "}
                          <span style={{ color: entry.is_active ? "#a855f7" : "rgba(255,255,255,0.2)" }}>
                            {entry.is_active ? "Actif — utilisé par Lylya" : "Inactif — ignoré"}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
