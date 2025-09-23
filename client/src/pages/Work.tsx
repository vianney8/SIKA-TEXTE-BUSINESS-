import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Clock, TrendingUp, ArrowLeft } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface Sentence {
  id: string;
  text: string;
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

  const submitCorrectionMutation = useMutation({
    mutationFn: async (data: { sentenceId: string; answer: string }) => {
      const res = await apiRequest('POST', '/api/work/submit', data);
      return await res.json();
    },
    onSuccess: (response) => {
      setIsCorrect(response.correct);
      setShowResult(true);
      if (response.correct) {
        toast({
          title: "Excellent ! ✅",
          description: `Phrase corrigée ! Vous avez gagné ${response.reward} FCFA`,
        });
      } else {
        toast({
          title: "Pas tout à fait 🤔",
          description: "Essayez encore ou passez à la suivante",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/work/progress'] });
    },
  });

  const getNextSentence = () => {
    if (sentences && sentences.length > 0) {
      const randomIndex = Math.floor(Math.random() * sentences.length);
      setCurrentSentence(sentences[randomIndex]);
      setUserAnswer("");
      setShowResult(false);
      setIsCorrect(false);
    }
  };

  useEffect(() => {
    if (sentences && sentences.length > 0) {
      getNextSentence();
    }
  }, [sentences]);

  const handleSubmit = () => {
    if (!currentSentence || !userAnswer.trim()) return;
    
    submitCorrectionMutation.mutate({
      sentenceId: currentSentence.id,
      answer: userAnswer.trim(),
    });
  };

  const progressPercentage = progress ? (progress.correctedToday / progress.maxPerDay) * 100 : 0;
  const remainingSentences = progress ? progress.maxPerDay - progress.correctedToday : 0;

  if (!progress?.canWorkToday) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="gradient-bg text-primary-foreground">
          <div className="px-6 py-4 flex items-center">
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
              <Link href="/" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Travail</h1>
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
                  Gains d'aujourd'hui : {(progress?.correctedToday || 0) * 650} FCFA
                </p>
              </div>
              <p className="text-sm text-slate-500">
                Revenez demain pour de nouvelles phrases à corriger !
              </p>
              {progress?.nextWorkTime && (
                <p className="text-sm text-slate-500 mt-2">
                  Prochain travail disponible : {new Date(progress.nextWorkTime).toLocaleString('fr-FR')}
                </p>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 flex items-center">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
            <Link href="/" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Travail</h1>
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
                  {((progress?.correctedToday || 0) * 650).toLocaleString()} FCFA
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
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-lg leading-relaxed">
                    "{currentSentence.text}"
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <AlertCircle className="w-4 h-4" />
                    {currentSentence.errors} erreur(s) à corriger
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Votre correction :
                  </label>
                  <Input
                    data-testid="input-sentence-correction"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Tapez la phrase corrigée ici..."
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
                            Correct ! +650 FCFA
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

                <div className="text-center">
                  <p className="text-sm text-slate-500">
                    Récompense : <span className="font-semibold text-green-600">650 FCFA</span>
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
    </div>
  );
}