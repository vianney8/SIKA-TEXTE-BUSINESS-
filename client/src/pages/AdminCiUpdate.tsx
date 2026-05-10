import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, CheckCircle, ArrowLeft, Send, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

export default function AdminCiUpdate() {
  const { toast } = useToast();
  const processingRef = useRef<Set<string>>(new Set());
  const guard = (key: string, fn: () => void) => {
    if (processingRef.current.has(key)) return;
    processingRef.current.add(key);
    fn();
  };
  const [showCiSearch, setShowCiSearch] = useState(false);
  const [ciSearchQuery, setCiSearchQuery] = useState("");
  const [showTelegramConfig, setShowTelegramConfig] = useState(false);
  const [manualChatId, setManualChatId] = useState("");

  const { data: ciPendingUsers = [], refetch: refetchCiPending } = useQuery<any[]>({
    queryKey: ['/api/admin/ci-update-pending'],
    refetchInterval: 15000,
  });

  const { data: allCiUsers = [], refetch: refetchAllCi } = useQuery<any[]>({
    queryKey: ['/api/admin/ci-update-all-users'],
    enabled: showCiSearch,
  });

  const filteredCiUsers = allCiUsers.filter((u: any) =>
    !ciSearchQuery ||
    u.fullName?.toLowerCase().includes(ciSearchQuery.toLowerCase()) ||
    u.phone?.includes(ciSearchQuery)
  );

  const ciValidateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/ci-update-validate/${userId}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetchCiPending();
      refetchAllCi();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "✓ Mise à jour validée", description: "Le compte a été débloqué avec succès." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la validation", variant: "destructive" });
    },
    onSettled: (_d, _e, id) => processingRef.current.delete(`validate_${id}`)
  });

  const ciResetMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/ci-update-reset/${userId}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetchCiPending();
      refetchAllCi();
      toast({ title: "✓ Option réactivée", description: "L'utilisateur devra effectuer la mise à jour." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la réactivation", variant: "destructive" });
    },
    onSettled: (_d, _e, id) => processingRef.current.delete(`reset_${id}`)
  });

  const ciDisableAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ci-update-disable-all', {});
      return res.json();
    },
    onSuccess: () => {
      refetchCiPending();
      refetchAllCi();
      toast({ title: "✓ Option désactivée pour tous", description: "Tous les comptes +225 ont retrouvé l'accès." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la désactivation globale", variant: "destructive" });
    }
  });

  const { data: telegramStatus, refetch: refetchTelegramStatus } = useQuery<any>({
    queryKey: ['/api/admin/telegram-status'],
    staleTime: 30000,
  });

  const setChatIdMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const res = await apiRequest('POST', '/api/admin/telegram-set-chat-id', { chatId });
      return res.json();
    },
    onSuccess: () => {
      refetchTelegramStatus();
      setManualChatId("");
      toast({ title: "✓ Chat ID enregistré", description: "Le bot Telegram est maintenant configuré." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer le Chat ID", variant: "destructive" });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-blue-600 p-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <RefreshCw className="h-6 w-6" />
              Gestion Mise à jour +225
            </h1>
            <p className="text-blue-100 text-sm">Côte d'Ivoire — Comptes actifs</p>
          </div>
          {ciPendingUsers.length > 0 && (
            <Badge className="bg-red-500 text-white text-sm px-3 py-1">
              {ciPendingUsers.length} en attente
            </Badge>
          )}
        </div>

        {/* Telegram Configuration Card */}
        <Card className={`mb-4 ${telegramStatus?.configured ? 'border-green-200' : 'border-yellow-300'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Send className={`h-4 w-4 ${telegramStatus?.configured ? 'text-green-600' : 'text-yellow-600'}`} />
                <p className="font-semibold text-gray-800 text-sm">Configuration Telegram</p>
                {telegramStatus?.configured ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Actif</span>
                ) : (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Non configuré</span>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowTelegramConfig(!showTelegramConfig)}>
                <Settings2 className="h-3 w-3 mr-1" />
                {showTelegramConfig ? "Masquer" : "Configurer"}
              </Button>
            </div>

            {telegramStatus?.botUsername && (
              <p className="text-xs text-gray-500">
                Bot : <strong>@{telegramStatus.botUsername}</strong>
                {telegramStatus.configured && (
                  <span className="ml-2 text-green-600">— Chat ID enregistré</span>
                )}
              </p>
            )}

            {showTelegramConfig && (
              <div className="mt-4 pt-4 border-t space-y-3">
                {!telegramStatus?.configured && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 space-y-1">
                    <p className="font-semibold">Configuration requise :</p>
                    <p>1. Ouvrez Telegram et cherchez <strong>@{telegramStatus?.botUsername || 'le bot'}</strong></p>
                    <p>2. Envoyez-lui n'importe quel message (ex: <code>/start</code>)</p>
                    <p>3. Le Chat ID sera détecté automatiquement, <strong>OU</strong> saisissez-le manuellement ci-dessous.</p>
                    <p className="text-blue-700 mt-1">Pour trouver votre Chat ID, envoyez un message à <strong>@userinfobot</strong> sur Telegram.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Chat ID Telegram (ex: 123456789)"
                    value={manualChatId}
                    onChange={(e) => setManualChatId(e.target.value)}
                    className="text-sm h-9"
                  />
                  <Button
                    size="sm"
                    disabled={!manualChatId.trim() || setChatIdMutation.isPending}
                    onClick={() => setChatIdMutation.mutate(manualChatId.trim())}
                    className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                  >
                    {setChatIdMutation.isPending ? "..." : "Enregistrer"}
                  </Button>
                </div>
                {telegramStatus?.configured && (
                  <p className="text-xs text-gray-500">Chat ID actuel : <code>{telegramStatus.adminChatId}</code></p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action globale */}
        <Card className="mb-4 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">Désactiver pour tous les +225</p>
                <p className="text-sm text-gray-500">Tous les comptes +225 retrouveront l'accès immédiatement</p>
              </div>
              <Button
                variant="destructive"
                disabled={ciDisableAllMutation.isPending}
                onClick={() => {
                  if (confirm("Désactiver la mise à jour pour TOUS les comptes +225 ? Ils auront tous accès immédiatement.")) {
                    ciDisableAllMutation.mutate();
                  }
                }}
              >
                {ciDisableAllMutation.isPending ? "En cours..." : "Désactiver pour tous"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comptes en attente */}
        <Card className="mb-4 border-orange-200">
          <CardHeader className="bg-orange-50 rounded-t-lg">
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Comptes actifs à valider
              {ciPendingUsers.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
                  {ciPendingUsers.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {ciPendingUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                <p>Aucune demande en attente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ciPendingUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <p className="font-medium text-sm">{u.fullName || 'Sans nom'}</p>
                      <p className="text-xs text-muted-foreground">{u.phone}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => guard(`validate_${u.id}`, () => ciValidateMutation.mutate(u.id))}
                      disabled={ciValidateMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Valider
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recherche individuelle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Gérer un compte individuellement</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="border-orange-400 text-orange-700"
                onClick={() => setShowCiSearch(!showCiSearch)}
              >
                <Search className="h-3 w-3 mr-1" />
                {showCiSearch ? "Masquer" : "Afficher la recherche"}
              </Button>
            </div>
          </CardHeader>
          {showCiSearch && (
            <CardContent className="space-y-3">
              <Input
                placeholder="Nom ou numéro de téléphone..."
                value={ciSearchQuery}
                onChange={(e) => setCiSearchQuery(e.target.value)}
                className="text-sm"
              />
              {filteredCiUsers.length === 0 && ciSearchQuery && (
                <p className="text-sm text-muted-foreground text-center">Aucun résultat.</p>
              )}
              {allCiUsers.length === 0 && !ciSearchQuery && (
                <p className="text-sm text-muted-foreground text-center">Chargement des comptes +225...</p>
              )}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCiUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg bg-white text-sm">
                    <div>
                      <p className="font-medium">{u.fullName || 'Sans nom'}</p>
                      <p className="text-xs text-muted-foreground">{u.phone}</p>
                      <div className="flex gap-1 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.isActive ? 'Actif' : 'Inactif'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${u.ciUpdateValidated ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {u.ciUpdateValidated ? 'MàJ validée' : 'MàJ requise'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!u.ciUpdateValidated ? (
                        <Button
                          size="sm"
                          onClick={() => guard(`validate_${u.id}`, () => ciValidateMutation.mutate(u.id))}
                          disabled={ciValidateMutation.isPending}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs"
                        >
                          Valider
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => guard(`reset_${u.id}`, () => ciResetMutation.mutate(u.id))}
                          disabled={ciResetMutation.isPending}
                          className="border-orange-400 text-orange-600 text-xs"
                        >
                          Réactiver
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

      </div>
    </div>
  );
}
