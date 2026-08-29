import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  HelpCircle,
  MessageSquare,
  Plus,
  RotateCcw,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminNav from "@/components/admin/AdminNav";

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
const COUNTRY_NAMES: Record<string, string> = {
  BJ: "Bénin",
  CI: "Côte d’Ivoire",
  SN: "Sénégal",
  BF: "Burkina Faso",
  TG: "Togo",
  CM: "Cameroun",
  ML: "Mali",
};
const timeAgo = (ts: string) => {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  return m < 1
    ? "À l’instant"
    : m < 60
      ? `il y a ${m} min`
      : m < 1440
        ? `il y a ${Math.floor(m / 60)} h`
        : new Date(ts).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
          });
};

export default function AdminAIChat() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"questions" | "knowledge">("questions"),
    [page, setPage] = useState(1),
    [newTitle, setNewTitle] = useState(""),
    [newContent, setNewContent] = useState(""),
    [editingId, setEditingId] = useState<number | null>(null),
    [editTitle, setEditTitle] = useState(""),
    [editContent, setEditContent] = useState(""),
    [deleteId, setDeleteId] = useState<number | null>(null);
  const { data: stats } = useQuery<AIChatStats>({
    queryKey: ["/api/admin/ai-chat/stats"],
    refetchInterval: 30000,
  });
  const {
    data: qData,
    isFetching,
    isError,
    refetch,
  } = useQuery<QuestionsData>({
    queryKey: ["/api/admin/ai-chat/questions", page],
    queryFn: () =>
      fetch(`/api/admin/ai-chat/questions?page=${page}`, {
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
    staleTime: 15000,
  });
  const { data: knowledge = [], isLoading: loadingKnowledge } = useQuery<
    KnowledgeEntry[]
  >({ queryKey: ["/api/admin/ai-knowledge"], staleTime: 10000 });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-knowledge"] });
  const create = useMutation({
    mutationFn: (body: { title: string; content: string }) =>
      apiRequest("POST", "/api/admin/ai-knowledge", body),
    onSuccess: () => {
      refresh();
      setNewTitle("");
      setNewContent("");
      toast({ title: "Entrée ajoutée" });
    },
    onError: () =>
      toast({ title: "Impossible d’ajouter l’entrée", variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: (b: { id: number; title: string; content: string }) =>
      apiRequest("PATCH", `/api/admin/ai-knowledge/${b.id}`, {
        title: b.title,
        content: b.content,
      }),
    onSuccess: () => {
      refresh();
      setEditingId(null);
      toast({ title: "Entrée mise à jour" });
    },
  });
  const toggle = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/admin/ai-knowledge/${id}/toggle`, {}),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/ai-knowledge/${id}`, {}),
    onSuccess: () => {
      refresh();
      setDeleteId(null);
      toast({ title: "Entrée supprimée" });
    },
  });
  const questions = qData?.questions ?? [],
    active = knowledge.filter((k) => k.is_active).length;
  return (
    <div className="sika-page">
      <AdminNav
        title="Lylya — suivi IA"
        subtitle="Questions utilisateurs et base de connaissances opérationnelle."
        icon={MessageSquare}
        badge={active || undefined}
      />
      <main className="sika-content space-y-5">
        <div className="grid grid-cols-3 gap-3">
              {(
                [
                  [Users, "Utilisateurs", stats?.totalUsers],
                  [HelpCircle, "Questions", stats?.totalQuestions],
                  [MessageSquare, "Réponses IA", stats?.totalReplies],
                ] as [LucideIcon, string, number | undefined][]
              ).map(([Icon, label, value]) => (
            <div className="sika-surface p-4" key={label as string}>
              <Icon className="h-4 w-4 text-teal-700" />
              <p className="mt-3 text-2xl font-black">
                {typeof value === "number"
                  ? value.toLocaleString("fr-FR")
                  : "—"}
              </p>
              <p className="text-xs font-bold text-muted-foreground">
                {label as string}
              </p>
            </div>
          ))}
        </div>
        {stats?.lastActivity && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <Clock className="h-4 w-4" />
            Dernière activité Lylya : {timeAgo(stats.lastActivity)}
          </div>
        )}
        <div className="sika-surface overflow-hidden">
          <div className="flex border-b bg-muted/30 p-1">
            <button
              onClick={() => setTab("questions")}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold ${tab === "questions" ? "bg-card text-teal-800 shadow-sm" : "text-muted-foreground"}`}
            >
              <HelpCircle className="mr-2 inline h-4 w-4" />
              Questions ({qData?.total ?? 0})
            </button>
            <button
              onClick={() => setTab("knowledge")}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold ${tab === "knowledge" ? "bg-card text-teal-800 shadow-sm" : "text-muted-foreground"}`}
            >
              <BookOpen className="mr-2 inline h-4 w-4" />
              Connaissances ({active}/{knowledge.length})
            </button>
          </div>
          <div className="p-4 sm:p-6">
            {tab === "questions" ? (
              <>
                {isFetching && !questions.length ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="skeleton h-16" />
                    ))}
                  </div>
                ) : isError ? (
                  <div className="p-10 text-center text-rose-700">
                    Impossible de charger les questions.
                    <br />
                    <button
                      onClick={() => refetch()}
                      className="mt-2 font-bold underline"
                    >
                      <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
                      Réessayer
                    </button>
                  </div>
                ) : questions.length ? (
                  <div className="space-y-2">
                    {questions.map((q) => (
                      <article
                        key={q.id}
                        className="rounded-xl border bg-card p-3.5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-slate-800 font-bold text-white">
                            {(q.full_name || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <b className="text-sm">
                                {q.full_name || "Utilisateur sans nom"}
                              </b>
                              <span className="text-xs text-muted-foreground">
                                {q.phone || "Contact non renseigné"}
                                {q.country && ` · ${COUNTRY_NAMES[q.country] || q.country}`}
                              </span>
                              <time className="ml-auto text-[11px] text-muted-foreground">
                                {timeAgo(q.created_at)}
                              </time>
                            </div>
                            <p className="mt-1 text-sm leading-relaxed">
                              {q.content}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    <p>Aucune question enregistrée</p>
                  </div>
                )}
                {(qData?.totalPages ?? 1) > 1 && (
                  <div className="mt-5 flex items-center justify-center gap-2">
                    <button
                      className="rounded-lg border p-2 disabled:opacity-30"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      aria-label="Page précédente"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold">
                      Page {page} / {qData?.totalPages}
                    </span>
                    <button
                      className="rounded-lg border p-2 disabled:opacity-30"
                      disabled={page === qData?.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      aria-label="Page suivante"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-relaxed text-teal-950">
                  <b className="block text-teal-800">
                    Comment Lylya utilise ces connaissances
                  </b>
                  <span className="mt-1 block">
                    Chaque entrée active est injectée dans le contexte de
                    conversation. Les entrées inactives sont ignorées.
                  </span>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="mb-3 flex items-center gap-2 font-bold">
                    <Plus className="h-4 w-4 text-teal-700" />
                    Nouvelle entrée
                  </p>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Titre de l’information"
                    className="mb-2 w-full rounded-xl border px-3 py-2.5 text-sm"
                  />
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Contenu que Lylya doit connaître…"
                    rows={4}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                  />
                  <button
                    onClick={() =>
                      newTitle.trim() && newContent.trim()
                        ? create.mutate({
                            title: newTitle.trim(),
                            content: newContent.trim(),
                          })
                        : toast({
                            title: "Titre et contenu requis",
                            variant: "destructive",
                          })
                    }
                    disabled={create.isPending}
                    className="mt-3 w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    {create.isPending ? "Ajout en cours…" : "Ajouter à la base"}
                  </button>
                </div>
                {loadingKnowledge ? (
                  <div className="space-y-2">
                    <div className="skeleton h-24" />
                    <div className="skeleton h-24" />
                  </div>
                ) : knowledge.length ? (
                  <div className="space-y-2">
                    {knowledge.map((entry) => (
                      <div
                        key={entry.id}
                        className={`rounded-xl border p-4 ${entry.is_active ? "border-teal-200" : ""}`}
                      >
                        {editingId === entry.id ? (
                          <div className="space-y-2">
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                            />
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={4}
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  update.mutate({
                                    id: entry.id,
                                    title: editTitle.trim(),
                                    content: editContent.trim(),
                                  })
                                }
                                className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white"
                              >
                                <Check className="mr-1 inline h-3 w-3" />
                                Sauvegarder
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="rounded-lg bg-muted px-3 py-2 text-xs font-bold"
                              >
                                <X className="mr-1 inline h-3 w-3" />
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-1.5 h-2 w-2 flex-none rounded-full ${entry.is_active ? "bg-teal-600" : "bg-slate-300"}`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold">{entry.title}</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                  {entry.content}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => toggle.mutate(entry.id)}
                                  className="rounded-lg p-2 hover:bg-muted"
                                  title={
                                    entry.is_active ? "Désactiver" : "Activer"
                                  }
                                >
                                  {entry.is_active ? (
                                    <ToggleRight className="h-4 w-4 text-teal-700" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(entry.id);
                                    setEditTitle(entry.title);
                                    setEditContent(entry.content);
                                  }}
                                  className="rounded-lg p-2 hover:bg-muted"
                                  title="Modifier"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteId(entry.id)}
                                  className="rounded-lg p-2 text-rose-700 hover:bg-rose-50"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <p className="mt-3 text-[11px] text-muted-foreground">
                              {entry.is_active
                                ? "Actif · utilisé par Lylya"
                                : "Inactif · ignoré"}{" "}
                              · ajouté le{" "}
                              {new Date(entry.created_at).toLocaleDateString(
                                "fr-FR",
                              )}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-muted-foreground">
                    <BookOpen className="mx-auto mb-2 h-9 w-9 opacity-30" />
                    <p>Aucune entrée dans la base</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"
          >
            <h2 className="text-lg font-black">Supprimer cette entrée ?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cette action retire définitivement l’information de la base de
              Lylya.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-xl border px-4 py-2 text-sm font-bold"
              >
                Annuler
              </button>
              <button
                onClick={() => remove.mutate(deleteId)}
                disabled={remove.isPending}
                className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
