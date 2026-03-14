import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Clock, TrendingUp, CreditCard, Zap, ChevronLeft } from "lucide-react";
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

  const { data: progress } = useQuery<WorkProgress>({ queryKey: ['/api/work/progress'] });
  const { data: sentences } = useQuery<Sentence[]>({ queryKey: ['/api/work/sentences'] });

  useEffect(() => {
    if (sentences && sentences.length > 0 && !currentSentence) {
      setCurrentSentence(sentences[0]);
    }
  }, [sentences, currentSentence]);

  const submitCorrectionMutation = useMutation({
    mutationFn: async (data: { sentenceId: string; answer: string }) => {
      const response = await apiRequest("POST", "/api/work/submit", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      setIsCorrect(data.correct);
      setShowResult(true);
      if (data.correct) {
        toast({ title: "Correct ! ✅", description: `+${formatFCFA(650)} ajoutés à votre solde` });
        queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/work/progress'] });
      } else {
        toast({ title: "Pas tout à fait...", description: "Réessayez avec attention", variant: "destructive" });
      }
    },
  });

  const handleSubmit = () => {
    if (currentSentence && userAnswer.trim()) {
      submitCorrectionMutation.mutate({ sentenceId: currentSentence.id, answer: userAnswer.trim() });
    }
  };

  const getNextSentence = () => {
    if (sentences && sentences.length > 0) {
      const currentIndex = sentences.findIndex(s => s.id === currentSentence?.id);
      const nextIndex = (currentIndex + 1) % sentences.length;
      setCurrentSentence(sentences[nextIndex]);
      setUserAnswer("");
      setShowResult(false);
      setIsCorrect(false);
    }
  };

  const highlightErrors = (originalText: string, correctedText: string) => {
    if (!correctedText) return originalText;
    const original = originalText.split(' ');
    const corrected = correctedText.split(' ');
    return original.map((word, index) => {
      const correctedWord = corrected[index] || '';
      const isError = word.toLowerCase() !== correctedWord.toLowerCase();
      return (
        <span key={index}>
          <span className={isError ? "text-red-500 font-bold bg-red-50 px-0.5 rounded" : ""}>
            {word}
          </span>
          {index < original.length - 1 && ' '}
        </span>
      );
    });
  };

  const correctedToday = progress?.correctedToday || 0;
  const maxPerDay = progress?.maxPerDay || 12;
  const progressPct = (correctedToday / maxPerDay) * 100;
  const remaining = maxPerDay - correctedToday;
  const earned = correctedToday * 650;

  const Header = () => (
    <div className="relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0f172a, #1e3a5f, #1a4fa0)" }}>
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
      <div className="px-4 pt-4 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:bg-white/20">
              <ChevronLeft size={20} className="text-white" />
            </div>
          </Link>
          <div>
            <h1 className="text-white font-black text-xl">Mes Travaux</h1>
            <p className="text-blue-300 text-xs">Corrigez des phrases · Gagnez des FCFA</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-white font-black text-xl">{correctedToday}</p>
            <p className="text-blue-300 text-[10px]">Corrigées</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-white font-black text-xl">{remaining}</p>
            <p className="text-blue-300 text-[10px]">Restantes</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-green-400 font-black text-base">{formatFCFA(earned)}</p>
            <p className="text-blue-300 text-[10px]">Gagnés</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #22c55e, #4ade80)"
              }} />
          </div>
          <p className="text-blue-300 text-[10px] mt-1 text-right">{correctedToday}/{maxPerDay} phrases</p>
        </div>
      </div>
    </div>
  );

  /* === TERMINÉ === */
  if (correctedToday >= maxPerDay) {
    return (
      <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
        <Header />
        <div className="px-4 pt-5 pb-28 space-y-4">
          {/* Félicitations */}
          <div className="relative overflow-hidden rounded-[20px] p-6 text-center"
            style={{ background: "linear-gradient(135deg, #064e3b, #065f46)" }}>
            <div className="w-20 h-20 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <h2 className="text-white font-black text-2xl mb-2">Bravo ! 🎉</h2>
            <p className="text-green-200 text-sm mb-4">Vous avez corrigé vos 12 phrases du jour</p>
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-green-300 text-xs uppercase tracking-wider mb-1">Gains aujourd'hui</p>
              <p className="text-white font-black text-3xl">{formatFCFA(earned)}</p>
            </div>
            <p className="text-green-300/70 text-xs mt-4">Revenez demain pour de nouvelles phrases</p>
          </div>

          <Link href="/bank-card">
            <div className="flex items-center gap-3 bg-white rounded-[16px] p-4 shadow-sm active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                <CreditCard size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-semibold text-sm">Gérer ma carte bancaire</p>
                <p className="text-gray-400 text-xs">Ajouter ou modifier</p>
              </div>
              <ChevronLeft size={16} className="text-gray-300 rotate-180" />
            </div>
          </Link>
        </div>
        <BottomNavigation currentPage="work" />
      </div>
    );
  }

  /* === TRAVAIL PRINCIPAL === */
  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <Header />

      <div className="px-4 pt-4 pb-28 space-y-4">
        {/* Carte de correction */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          {/* Titre */}
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Correction</p>
                <p className="text-gray-800 font-bold text-base">Phrase à corriger</p>
              </div>
              <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full">
                <Zap size={12} className="text-orange-500" />
                <span className="text-orange-600 text-xs font-bold">+{formatFCFA(650)}</span>
              </div>
            </div>
          </div>

          <div className="px-5 pt-4 pb-5 space-y-4">
            {currentSentence ? (
              <>
                {/* Phrase */}
                <div className="rounded-2xl p-4 border-2 border-blue-100"
                  style={{ background: "linear-gradient(135deg, #eff6ff, #f0f9ff)" }}>
                  <p className="text-gray-800 text-base font-medium leading-relaxed">
                    « {highlightErrors(currentSentence.text, currentSentence.correctedText)} »
                  </p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <AlertCircle size={13} className="text-blue-500" />
                    <span className="text-blue-600 text-xs font-semibold">
                      {currentSentence.errors} erreur(s) à corriger
                    </span>
                  </div>
                </div>

                {/* Input */}
                <div className="space-y-2">
                  <label className="text-gray-600 text-xs font-bold uppercase tracking-wider">
                    Votre correction
                  </label>
                  <textarea
                    data-testid="input-sentence-correction"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Tapez la phrase corrigée ici..."
                    disabled={showResult}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-800 text-sm font-medium focus:outline-none focus:border-blue-300 focus:bg-white transition-all resize-none disabled:opacity-60"
                  />
                </div>

                {/* Résultat */}
                {showResult && (
                  <div className={`rounded-2xl p-4 flex items-center gap-3 ${
                    isCorrect
                      ? "bg-green-50 border-2 border-green-100"
                      : "bg-red-50 border-2 border-red-100"
                  }`}>
                    {isCorrect ? (
                      <>
                        <CheckCircle size={22} className="text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-green-700 font-bold text-sm">Parfait !</p>
                          <p className="text-green-600 text-xs">+{formatFCFA(650)} crédités</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={22} className="text-red-500 flex-shrink-0" />
                        <div>
                          <p className="text-red-700 font-bold text-sm">Pas tout à fait...</p>
                          <p className="text-red-500 text-xs">Relisez la phrase attentivement</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Boutons */}
                {!showResult ? (
                  <button
                    data-testid="button-submit-correction"
                    onClick={handleSubmit}
                    disabled={!userAnswer.trim() || submitCorrectionMutation.isPending}
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
                  >
                    {submitCorrectionMutation.isPending ? "Vérification..." : "Valider la correction"}
                  </button>
                ) : (
                  <button
                    data-testid="button-next-sentence"
                    onClick={getNextSentence}
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.97]"
                    style={{ background: "linear-gradient(135deg, #059669, #047857)" }}
                  >
                    Phrase suivante →
                  </button>
                )}
              </>
            ) : (
              <div className="py-10 text-center">
                <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Chargement de la phrase...</p>
              </div>
            )}
          </div>
        </div>

        {/* Carte bancaire */}
        <Link href="/bank-card">
          <div className="flex items-center gap-3 bg-white rounded-[16px] p-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              <CreditCard size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-gray-800 font-semibold text-sm">Gérer ma carte bancaire</p>
              <p className="text-gray-400 text-xs">Ajouter ou modifier</p>
            </div>
            <ChevronLeft size={16} className="text-gray-300 rotate-180" />
          </div>
        </Link>
      </div>

      <BottomNavigation currentPage="work" />
    </div>
  );
}
