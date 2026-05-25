import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, MessageSquare, Users, HelpCircle, ChevronLeft as Prev, ChevronRight as Next, Clock } from "lucide-react";

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
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery<AIChatStats>({
    queryKey: ["/api/admin/ai-chat/stats"],
    refetchInterval: 30_000,
  });

  const { data: qData, isFetching } = useQuery<QuestionsData>({
    queryKey: ["/api/admin/ai-chat/questions", page],
    queryFn: () => fetch(`/api/admin/ai-chat/questions?page=${page}`, { credentials: "include" }).then(r => r.json()),
    staleTime: 15_000,
  });

  const questions = qData?.questions ?? [];
  const totalPages = qData?.totalPages ?? 1;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #0c0a1e 0%, #1a1040 60%, #0c0a1e 100%)" }}>

      {/* HEADER */}
      <header className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3 border-b border-white/10"
        style={{ background: "rgba(12,10,30,0.88)", backdropFilter: "blur(12px)" }}>
        <Link href="/admin">
          <button className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-black text-base leading-none">Lylya — Suivi IA</h1>
          <p className="text-purple-300 text-[11px] mt-0.5">Questions posées à l'assistante IA</p>
        </div>
      </header>

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-5">

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Users className="w-5 h-5" />, label: "Utilisateurs", value: stats?.totalUsers ?? "—", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
            { icon: <HelpCircle className="w-5 h-5" />, label: "Questions", value: stats?.totalQuestions ?? "—", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
            { icon: <MessageSquare className="w-5 h-5" />, label: "Réponses IA", value: stats?.totalReplies ?? "—", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-3.5 flex flex-col gap-2" style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <div>
                <p className="text-white font-black text-2xl leading-none">{s.value.toLocaleString?.() ?? s.value}</p>
                <p className="text-white/50 text-[10px] mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {stats?.lastActivity && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-white/50 text-[11px]">Dernière activité : {timeAgo(stats.lastActivity)}</span>
          </div>
        )}

        {/* PAGINATION INFO */}
        <div className="flex items-center justify-between">
          <p className="text-white/60 text-sm">
            {qData?.total ? `${qData.total.toLocaleString("fr-FR")} question${qData.total > 1 ? "s" : ""} au total` : "Chargement…"}
          </p>
          <p className="text-white/40 text-xs">Page {page} / {totalPages}</p>
        </div>

        {/* LISTE */}
        {isFetching && questions.length === 0 ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">Aucune question enregistrée pour l'instant</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {questions.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl px-4 py-3.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
                  >
                    {(q.full_name || "?").charAt(0).toUpperCase()}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-semibold text-xs">{q.full_name || "—"}</span>
                      <span className="text-white/40 text-[10px]">{COUNTRY_FLAGS[q.country] || "🌍"} {q.phone || "—"}</span>
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed break-words">{q.content}</p>
                  </div>

                  {/* Heure */}
                  <div className="flex-shrink-0">
                    <span className="text-purple-400 text-[10px] font-medium whitespace-nowrap">{timeAgo(q.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2 pb-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-30 active:scale-95"
            >
              <Prev className="w-4 h-4 text-white" />
            </button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-lg text-xs font-bold transition-colors active:scale-95"
                    style={p === page
                      ? { background: "#7c3aed", color: "white" }
                      : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-30 active:scale-95"
            >
              <Next className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
