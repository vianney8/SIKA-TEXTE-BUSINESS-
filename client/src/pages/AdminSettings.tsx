import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings, Save, Users, CheckCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AppSetting {
  id: string;
  key: string;
  value: string;
  label: string;
  updatedAt: string;
}

interface PendingCount {
  totalPending: number;
  uniqueUsers: number;
}

interface BulkActivationResult {
  message: string;
  activatedCount: number;
  totalPending: number;
  activatedUsers: { id: string; name: string; phone: string }[];
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<{[key: string]: string}>({});
  const [lastActivation, setLastActivation] = useState<BulkActivationResult | null>(null);

  // Fetch app settings
  const { data: appSettings, isLoading } = useQuery<AppSetting[]>({
    queryKey: ['/api/admin/settings'],
  });

  // Fetch pending activations count
  const { data: pendingCount, refetch: refetchPending } = useQuery<PendingCount>({
    queryKey: ['/api/admin/pending-activations-count'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Bulk activation mutation
  const bulkActivationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/bulk-activate-pending");
      return res.json();
    },
    onSuccess: (data: BulkActivationResult) => {
      setLastActivation(data);
      toast({
        title: "Activation réussie",
        description: data.message,
      });
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'activation en lot",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (appSettings) {
      const settingsObj: {[key: string]: string} = {};
      appSettings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      setSettings(settingsObj);
    }
  }, [appSettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: {[key: string]: string}) => {
      const promises = Object.keys(settingsData).map(key =>
        apiRequest("PUT", `/api/admin/settings/${key}`, { value: settingsData[key] })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Paramètres sauvegardés",
        description: "Les liens ont été mis à jour avec succès"
      });
      // Invalider toutes les requêtes de paramètres
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      // Invalider spécifiquement chaque paramètre
      Object.keys(settings).forEach(key => {
        queryClient.invalidateQueries({ queryKey: [`/api/settings/${key}`] });
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la sauvegarde",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 flex items-center">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
            <Link href="/admin" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Paramètres des Liens</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Bulk Activation Card */}
        <Card className="max-w-2xl mx-auto border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Users className="h-5 w-5" />
              Activation en Lot des Comptes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                {pendingCount ? (
                  <>
                    <strong>{pendingCount.uniqueUsers}</strong> utilisateur(s) avec paiements en attente
                    <br />
                    <span className="text-xs">({pendingCount.totalPending} paiements au total)</span>
                  </>
                ) : (
                  "Chargement..."
                )}
              </p>
            </div>

            <Button 
              onClick={() => bulkActivationMutation.mutate()}
              disabled={bulkActivationMutation.isPending || (pendingCount?.uniqueUsers === 0)}
              className="w-full bg-orange-500 hover:bg-orange-600"
              data-testid="button-bulk-activate"
            >
              {bulkActivationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activation en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activer tous les comptes en attente
                </>
              )}
            </Button>

            {lastActivation && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Activation terminée</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {lastActivation.activatedCount} compte(s) activé(s) avec succès
                  {lastActivation.activatedUsers.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs">
                      {lastActivation.activatedUsers.slice(0, 10).map((user, index) => (
                        <div key={index} className="py-0.5">
                          • {user.name} ({user.phone})
                        </div>
                      ))}
                      {lastActivation.activatedUsers.length > 10 && (
                        <div className="py-0.5 font-semibold">
                          ... et {lastActivation.activatedUsers.length - 10} autres
                        </div>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gestion des Liens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="activation_link">Lien d'activation en ligne</Label>
              <Input
                id="activation_link"
                value={settings.activation_link || ''}
                onChange={(e) => handleInputChange('activation_link', e.target.value)}
                placeholder="https://app.payix.me/payment/..."
                data-testid="input-activation-link"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Lien utilisé pour l'activation du compte utilisateur
              </p>
            </div>

            <div>
              <Label htmlFor="whatsapp_group">Groupe WhatsApp</Label>
              <Input
                id="whatsapp_group"
                value={settings.whatsapp_group || ''}
                onChange={(e) => handleInputChange('whatsapp_group', e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                data-testid="input-whatsapp-group"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Lien d'invitation au groupe WhatsApp
              </p>
            </div>

            <div>
              <Label htmlFor="instagram_supervisor">Compte Instagram Service Client</Label>
              <Input
                id="instagram_supervisor"
                value={settings.instagram_supervisor || ''}
                onChange={(e) => handleInputChange('instagram_supervisor', e.target.value)}
                placeholder="sikacustomer_service"
                data-testid="input-instagram-supervisor"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Nom d'utilisateur Instagram (sans @)
              </p>
            </div>

            <div>
              <Label htmlFor="telegram_supervisor">Superviseur Telegram</Label>
              <Input
                id="telegram_supervisor"
                value={settings.telegram_supervisor || ''}
                onChange={(e) => handleInputChange('telegram_supervisor', e.target.value)}
                placeholder="@SIKAcustomer_service"
                data-testid="input-telegram-supervisor"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Nom d'utilisateur du superviseur Telegram
              </p>
            </div>

            <div>
              <Label htmlFor="telegram_group">Groupe Telegram</Label>
              <Input
                id="telegram_group"
                value={settings.telegram_group || ''}
                onChange={(e) => handleInputChange('telegram_group', e.target.value)}
                placeholder="https://t.me/..."
                data-testid="input-telegram-group"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Lien d'invitation au groupe Telegram
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saveSettingsMutation.isPending}
              className="w-full"
              data-testid="button-save-settings"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveSettingsMutation.isPending ? "Sauvegarde..." : "Sauvegarder les Paramètres"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}