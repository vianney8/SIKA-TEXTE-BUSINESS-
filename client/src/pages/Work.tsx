import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Clock, TrendingUp, CreditCard } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatFCFA } from "@/lib/utils";

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

  const { data: progress } = useQuery<WorkProgress>({
    queryKey: ['/api/work/progress'],
  });

  const { data: sentences } = useQuery<Sentence[]>({
    queryKey: ['/api/work/sentences'],
  });

  useEffect(() => {
    if (sentences && sentences.length > 0 && !currentSentence) {
      setCurrentSentence(sentences[0]);
    }
  }, [sentences, currentSentence]);

  const submitCorrectionMutation = useMutation({
    mutationFn: async (data: { sentenceId: string; userAnswer: string }) => {
      const response = await apiRequest("/api/work/submit", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setIsCorrect(data.correct);
      setShowResult(true);
      if (data.correct) {
        toast({
          title: "Correct ! ✅",
          description: `+${formatFCFA(650)} ajoutés à votre solde`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/work/progress'] });
      } else {
        toast({
          title: "Pas tout à fait...",
          description: "Réessayez avec attention",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = () => {
    if (currentSentence && userAnswer.trim()) {
      submitCorrectionMutation.mutate({
        sentenceId: currentSentence.id,
        userAnswer: userAnswer.trim(),
      });
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

  if ((progress?.correctedToday || 0) >= (progress?.maxPerDay || 12)) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="gradient-bg text-primary-foreground">
          <div className="px-6 py-4 text-center">
            <h1 className="text-lg font-semibold" data-testid="page-title">Travail</h1>
          </div>
        </div>
        <div className="p-4">
          <div className="max-w-md mx-auto pt-8">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle className="text-2xl">Travail terminé ! 🎉</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Félicitations ! Vous avez corrigé vos 12 phrases aujourd'hui.
              </p>
              <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg mb-6">
                <p className="text-green-800 dark:text-green-200 font-semibold">
                  Gains d'aujourd'hui : {formatFCFA((progress?.correctedToday || 0) * 650)}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                Revenez demain pour de nouvelles phrases à corriger !
              </p>
            </CardContent>
          </Card>
          </div>
        </div>
      
      <BottomNavigation currentPage="work" />
    </div>
  );
}

  const progressPercentage = ((progress?.correctedToday || 0) / (progress?.maxPerDay || 12)) * 100;
  const remainingSentences = (progress?.maxPerDay || 12) - (progress?.correctedToday || 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 text-center">
          <h1 className="text-lg font-semibold" data-testid="page-title">Travail</h1>
        </div>
      </div>
      <div className="p-4">
        <div className="max-w-md mx-auto pt-8">
        {/* Progress Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Progrès du jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Phrases corrigées</span>
                <span className="font-semibold">
                  {progress?.correctedToday || 0} / {progress?.maxPerDay || 12}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Gains d'aujourd'hui</span>
                <span className="font-semibold text-green-600">
                  {formatFCFA((progress?.correctedToday || 0) * 650)}
                </span>
              </div>
              <Badge variant="outline" className="w-fit">
                {remainingSentences} phrases restantes
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Work Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Correction de phrase</CardTitle>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Corrigez les erreurs dans la phrase ci-dessous
            </p>
          </CardHeader>
          <CardContent>
            {currentSentence ? (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-6 rounded-lg">
                  <p className="text-xl font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                    "{currentSentence.text}"
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                    <AlertCircle className="w-4 h-4" />
                    {currentSentence.errors} erreur(s) à corriger
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Votre correction :
                  </label>
                  <Input
                    data-testid="input-sentence-correction"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Tapez la phrase corrigée ici..."
                    className="text-base font-medium"
                    disabled={showResult}
                  />
                </div>

                {showResult && (
                  <div className={`p-4 rounded-lg ${
                    isCorrect ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-800 dark:text-green-200 font-semibold">
                            Correct ! +{formatFCFA(650)}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <span className="text-red-800 dark:text-red-200 font-semibold">
                            Pas tout à fait...
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {!showResult ? (
                    <Button 
                      data-testid="button-submit-correction"
                      onClick={handleSubmit}
                      disabled={!userAnswer.trim() || submitCorrectionMutation.isPending}
                      className="flex-1"
                    >
                      {submitCorrectionMutation.isPending ? "Vérification..." : "Valider"}
                    </Button>
                  ) : (
                    <Button 
                      data-testid="button-next-sentence"
                      onClick={getNextSentence}
                      className="flex-1"
                    >
                      Phrase suivante
                    </Button>
                  )}
                </div>

                <div className="text-center space-y-3">
                  <p className="text-sm text-slate-500">
                    Récompense : <span className="font-semibold text-green-600">{formatFCFA(650)}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Chargement de la phrase...</p>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
      
      <BottomNavigation currentPage="work" />
    </div>
  );
}