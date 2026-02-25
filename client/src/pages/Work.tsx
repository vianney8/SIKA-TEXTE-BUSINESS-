import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Clock, TrendingUp, ChevronRight, Zap, Star, Lock } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatFCFA } from "@/lib/utils";
import { Link } from "wouter";

interface Sentence {
  id: string;
  text: string;
  correctedText: string;
  errors: number;
  reward: number;
}

interface WorkProgress {
  correctedToday: number;
  maxPerDay: number;
  totalEarned: number;
  canWorkToday: boolean;
  nextWorkTime?: string;
}

export default function Work() {
  const { toast } = useToast();
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const { data: progress } = useQuery<WorkProgress>({ queryKey: ["/api/work/progress"] });
  const { data: sentences } = useQuery<Sentence[]>({ queryKey: ["/api/work/sentences"] });

  useEffect(() => {
    if (sentences && sentences.length > 0 && !currentSentence) {
      setCurrentSentence(sentences[0]);
    }
  }, [sentences, currentSentence]);

  const submitMutation = useMutation({
    mutationFn: async (data: { sentenceId: string; answer: string }) => {
      const r = await apiRequest("POST", "/api/work/submit", data);
      return r.json();
    },
    onSuccess: (data: any) => {
      setIsCorrect(data.correct);
      setShowResult(true);
      if (data.correct) {
        toast({ title: "Correct !", description: `+${formatFCFA(650)} ajoutés à votre solde` });
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/work/progress"] });
      } else {
        toast({ title: "Pas tout à fait...", description: "Réessayez avec attention", variant: "destructive" });
      }
    },
  });

  const getNextSentence = () => {
    if (sentences && sentences.length > 0) {
      const ci = sentences.findIndex(s => s.id === currentSentence?.id);
      setCurrentSentence(sentences[(ci + 1) % sentences.length]);
      setUserAnswer("");
      setShowResult(false);
      setIsCorrect(false);
    }
  };

  const highlightErrors = (originalText: string, correctedText: string) => {
    if (!correctedText) return originalText;
    const orig = originalText.split(" ");
    const corr = correctedText.split(" ");
    return orig.map((word, i) => {
      const isError = word.toLowerCase() !== (corr[i] || "").toLowerCase();
      return (
        <span key={i}>
          <span className={isError ? "font-bold px-1 rounded" : ""}
            style={isError ? { color: "#ef4444", background: "rgba(239,68,68,0.1)" } : {}}>
            {word}
          </span>
          {i < orig.length - 1 && " "}
        </span>
      );
    });
  };

  const correctedToday = progress?.correctedToday || 0;
  const maxPerDay = progress?.maxPerDay || 12;
  const progressPct = (correctedToday / maxPerDay) * 100;
  const remaining = maxPerDay - correctedToday;
  const todayGains = correctedToday * 650;
  const isDone = correctedToday >= maxPerDay;

  /* ─── Completed ─── */
  if (isDone) {
    return (
      <div className="min-h-screen pb-24" style={{ background: "#f0f4ff" }}>
        <div style={{ background: "linear-gradient(135deg, #0a0f2c 0%, #1a1f5e 100%)" }}>
          <div className="px-4 pt-12 pb-8">
            <div className="flex items-center gap-3 mb-6">
              <h1 className="text-white font-bold text-lg" data-testid="page-title">Travail</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <Clock size={26} style={{ color: "#fbbf24" }} />
              </div>
              <div>
                <p className="text-white font-bold text-base">Journée complète !</p>
                <p className="text-white/50 text-xs">Revenez demain pour de nouvelles tâches</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4">
          <div className="rounded-3xl overflow-hidden shadow-sm" style={{ background: "white" }}>
            <div className="h-1" style={{ background: "linear-gradient(90deg, #10b981, #6366f1)" }} />
            <div className="p-6 text-center">
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.1)" }}>
                <CheckCircle size={40} style={{ color: "#10b981" }} />
              </div>
              <h2 className="font-black text-slate-800 text-xl mb-2">Travail terminé !</h2>
              <p className="text-slate-500 text-sm mb-5">
                Félicitations ! Vous avez corrigé les {maxPerDay} phrases d'aujourd'hui.
              </p>
              <div className="rounded-2xl px-6 py-4 mb-2"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Gains du jour</p>
                <p className="text-3xl font-black" style={{ color: "#10b981" }}>+{formatFCFA(todayGains)}</p>
              </div>
            </div>
          </div>

          <Link href="/bank-card">
            <button className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-white font-semibold shadow-sm transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}
              data-testid="button-bank-card-completed">
              <div className="flex items-center gap-3">
                <Star size={18} />
                <span className="text-sm">Gérer ma carte bancaire</span>
              </div>
              <ChevronRight size={16} />
            </button>
          </Link>
        </div>

        <BottomNavigation currentPage="work" />
      </div>
    );
  }

  /* ─── Main Work Page ─── */
  return (
    <div className="min-h-screen pb-24" style={{ background: "#f0f4ff" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0a0f2c 0%, #1a1f5e 100%)" }}>
        <div className="px-4 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-5">
            <h1 className="text-white font-bold text-lg" data-testid="page-title">Travail du jour</h1>
          </div>

          {/* Progress stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <p className="text-white font-black text-xl">{correctedToday}</p>
              <p className="text-white/40 text-[10px]">Corrigées</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p className="text-white font-black text-xl">{remaining}</p>
              <p className="text-white/40 text-[10px]">Restantes</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <p className="text-white font-black text-sm">{formatFCFA(todayGains)}</p>
              <p className="text-white/40 text-[10px]">Gagnés</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #6366f1, #10b981)" }} />
          </div>
          <p className="text-white/40 text-[11px] mt-1 text-right">{Math.round(progressPct)}% complété</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Reward banner */}
        <div className="rounded-2xl px-5 py-3 flex items-center justify-between shadow-sm"
          style={{ background: "white" }}>
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: "#f59e0b" }} />
            <span className="text-slate-600 text-sm font-medium">Récompense par phrase</span>
          </div>
          <span className="font-black text-base" style={{ color: "#10b981" }}>+{formatFCFA(650)}</span>
        </div>

        {/* Work Card */}
        <div className="rounded-3xl overflow-hidden shadow-sm" style={{ background: "white" }}>
          <div className="h-1" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />

          {currentSentence ? (
            <div className="p-5">
              {/* Sentence */}
              <div className="rounded-2xl p-4 mb-4"
                style={{ background: "rgba(99,102,241,0.05)", border: "1.5px solid rgba(99,102,241,0.12)" }}>
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle size={14} style={{ color: "#6366f1" }} className="mt-0.5 flex-shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6366f1" }}>
                    {currentSentence.errors} erreur(s) à corriger
                  </span>
                </div>
                <p className="text-slate-800 text-base font-medium leading-relaxed">
                  &quot;{highlightErrors(currentSentence.text, currentSentence.correctedText)}&quot;
                </p>
              </div>

              {/* Input */}
              <div className="mb-4">
                <label className="text-slate-700 font-semibold text-sm block mb-2">
                  Votre correction :
                </label>
                <textarea
                  data-testid="input-sentence-correction"
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Tapez la phrase corrigée ici..."
                  rows={3}
                  disabled={showResult}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all resize-none"
                  style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
              </div>

              {/* Result */}
              {showResult && (
                <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
                  style={{
                    background: isCorrect ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${isCorrect ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}>
                  {isCorrect ? (
                    <>
                      <CheckCircle size={20} style={{ color: "#10b981" }} />
                      <span className="font-bold text-sm" style={{ color: "#10b981" }}>
                        Correct ! +{formatFCFA(650)} ajoutés
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={20} style={{ color: "#ef4444" }} />
                      <span className="font-bold text-sm" style={{ color: "#ef4444" }}>
                        Pas tout à fait... réessayez
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Action Button */}
              {!showResult ? (
                <button
                  data-testid="button-submit-correction"
                  onClick={() => currentSentence && userAnswer.trim() && submitMutation.mutate({ sentenceId: currentSentence.id, answer: userAnswer.trim() })}
                  disabled={!userAnswer.trim() || submitMutation.isPending}
                  className="w-full rounded-2xl py-4 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  {submitMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Vérification...
                    </span>
                  ) : "Valider ma correction"}
                </button>
              ) : (
                <button
                  data-testid="button-next-sentence"
                  onClick={getNextSentence}
                  className="w-full rounded-2xl py-4 text-white font-bold text-sm transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  Phrase suivante →
                </button>
              )}
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Chargement de la phrase...</p>
            </div>
          )}
        </div>

        {/* Bank card link */}
        <Link href="/bank-card">
          <button className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-white font-semibold shadow-sm transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}
            data-testid="button-bank-card-work">
            <div className="flex items-center gap-3">
              <Star size={18} />
              <span className="text-sm">Gérer ma carte bancaire</span>
            </div>
            <ChevronRight size={16} />
          </button>
        </Link>
      </div>

      <BottomNavigation currentPage="work" />
    </div>
  );
}
