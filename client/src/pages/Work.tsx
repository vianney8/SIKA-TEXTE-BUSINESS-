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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 text-center">
          <h1 className="text-lg font-semibold" data-testid="page-title">Travail</h1>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-2xl">Page de travail</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Votre espace de travail pour corriger les phrases.
            </p>
            <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg mb-6">
              <p className="text-green-800 dark:text-green-200 font-semibold">
                Phrases corrigées : {progress?.correctedToday || 0} / {progress?.maxPerDay || 12}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <BottomNavigation currentPage="work" />
    </div>
  );
}