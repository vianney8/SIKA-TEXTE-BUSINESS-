import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings, Save } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AppSetting {
  id: string;
  key: string;
  value: string;
  label: string;
  updatedAt: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<{[key: string]: string}>({});

  // Fetch app settings
  const { data: appSettings, isLoading } = useQuery<AppSetting[]>({
    queryKey: ['/api/admin/settings'],
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
        description: "Les paramètres ont été mis à jour avec succès"
      });
      // Invalider immédiatement tous les caches de paramètres
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      // Invalider chaque paramètre spécifiquement
      queryClient.invalidateQueries({ queryKey: ['/api/settings/activation_amount'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/activation_link'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/whatsapp_group'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/telegram_supervisor'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/telegram_group'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/bkapay_enabled'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/lygos_enabled'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/leekpay_enabled'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/solvexpay_enabled'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/sendavapay_enabled'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/bkapay_name'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/lygos_name'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/leekpay_name'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/solvexpay_name'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/sendavapay_name'] });
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
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Paramètres</h1>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Activation Amount Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Montant d'activation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700 mb-2">Montant que les utilisateurs payent pour activer leur compte:</p>
              <div className="text-3xl font-bold text-primary mb-4">
                {settings.activation_amount ? parseInt(settings.activation_amount).toLocaleString('fr-FR') : '3 600'} FCFA
              </div>
            </div>
            <div>
              <Label htmlFor="activation_amount">Modifier le montant (FCFA)</Label>
              <input
                id="activation_amount"
                type="number"
                value={settings.activation_amount || '3600'}
                onChange={(e) => handleInputChange('activation_amount', e.target.value)}
                placeholder="3600"
                data-testid="input-activation-amount"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              />
              <p className="text-xs text-gray-600 mt-2">
                Ce montant s'affichera sur la page d'activation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Links Settings Card */}
        <Card>
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
              <Label htmlFor="telegram_supervisor">Support Telegram</Label>
              <Input
                id="telegram_supervisor"
                value={settings.telegram_supervisor || ''}
                onChange={(e) => handleInputChange('telegram_supervisor', e.target.value)}
                placeholder="https://t.me/username"
                data-testid="input-telegram-supervisor"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Lien Telegram du support client (bouton flottant, page assistance, retrait, connexion)
              </p>
            </div>

            <div>
              <Label htmlFor="telegram_group">Groupe Telegram (Dashboard)</Label>
              <Input
                id="telegram_group"
                value={settings.telegram_group || ''}
                onChange={(e) => handleInputChange('telegram_group', e.target.value)}
                placeholder="https://t.me/..."
                data-testid="input-telegram-group"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Lien d'invitation au groupe Telegram affiché sur le dashboard
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

        {/* CI Update (Côte d'Ivoire) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Mise à jour requise — +225 (Côte d'Ivoire)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Lorsqu'activé, les utilisateurs ivoiriens (+225) verront une page de mise à jour obligatoire et ne pourront pas accéder à leur compte tant que l'administrateur ne les a pas validés.
            </p>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Activer pour les +225</p>
                <p className="text-sm text-muted-foreground">
                  {settings.ci_update_required === 'true' ? '✓ Activé' : '✗ Désactivé'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('ci_update_required', settings.ci_update_required === 'true' ? 'false' : 'true')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  settings.ci_update_required === 'true'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                }`}
                data-testid="toggle-ci-update-required"
              >
                {settings.ci_update_required === 'true' ? 'Activé' : 'Désactivé'}
              </button>
            </div>
            <div>
              <Label htmlFor="ci_update_link">Lien de demande de mise à jour</Label>
              <Input
                id="ci_update_link"
                value={settings.ci_update_link || ''}
                onChange={(e) => handleInputChange('ci_update_link', e.target.value)}
                placeholder="https://..."
                data-testid="input-ci-update-link"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Les utilisateurs seront redirigés vers ce lien pour soumettre leur demande.
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveSettingsMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </CardContent>
        </Card>

        {/* Payment Gateways Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Passerelles de Paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Activez ou désactivez les passerelles de paiement disponibles pour l'activation des comptes utilisateurs.
            </p>

            {/* BKAPay */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium">BKAPay</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.bkapay_enabled !== 'false' ? '✓ Activé' : '✗ Désactivé'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('bkapay_enabled', settings.bkapay_enabled === 'false' ? 'true' : 'false')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.bkapay_enabled !== 'false' 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                  data-testid="toggle-bkapay-enabled"
                >
                  {settings.bkapay_enabled !== 'false' ? 'Activé' : 'Désactivé'}
                </button>
              </div>
              <div>
                <Label htmlFor="bkapay_name" className="text-sm">Nom personnalisé</Label>
                <Input
                  id="bkapay_name"
                  value={settings.bkapay_name || 'Passerelle 1 - BKAPay'}
                  onChange={(e) => handleInputChange('bkapay_name', e.target.value)}
                  placeholder="Passerelle 1 - BKAPay"
                  data-testid="input-bkapay-name"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Lygos */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Lygos</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.lygos_enabled !== 'false' ? '✓ Activé' : '✗ Désactivé'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('lygos_enabled', settings.lygos_enabled === 'false' ? 'true' : 'false')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.lygos_enabled !== 'false' 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                  data-testid="toggle-lygos-enabled"
                >
                  {settings.lygos_enabled !== 'false' ? 'Activé' : 'Désactivé'}
                </button>
              </div>
              <div>
                <Label htmlFor="lygos_name" className="text-sm">Nom personnalisé</Label>
                <Input
                  id="lygos_name"
                  value={settings.lygos_name || 'Passerelle 2 - Lygos'}
                  onChange={(e) => handleInputChange('lygos_name', e.target.value)}
                  placeholder="Passerelle 2 - Lygos"
                  data-testid="input-lygos-name"
                  className="mt-1"
                />
              </div>
            </div>

            {/* LeekPay */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium">LeekPay</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.leekpay_enabled !== 'false' ? '✓ Activé' : '✗ Désactivé'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('leekpay_enabled', settings.leekpay_enabled === 'false' ? 'true' : 'false')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.leekpay_enabled !== 'false' 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                  data-testid="toggle-leekpay-enabled"
                >
                  {settings.leekpay_enabled !== 'false' ? 'Activé' : 'Désactivé'}
                </button>
              </div>
              <div>
                <Label htmlFor="leekpay_name" className="text-sm">Nom personnalisé</Label>
                <Input
                  id="leekpay_name"
                  value={settings.leekpay_name || 'Passerelle 3 - LeekPay'}
                  onChange={(e) => handleInputChange('leekpay_name', e.target.value)}
                  placeholder="Passerelle 3 - LeekPay"
                  data-testid="input-leekpay-name"
                  className="mt-1"
                />
              </div>
            </div>

            {/* SolvexPay */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    4
                  </div>
                  <div>
                    <p className="font-medium">SolvexPay</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.solvexpay_enabled !== 'false' ? '✓ Activé' : '✗ Désactivé'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('solvexpay_enabled', settings.solvexpay_enabled === 'false' ? 'true' : 'false')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.solvexpay_enabled !== 'false' 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                  data-testid="toggle-solvexpay-enabled"
                >
                  {settings.solvexpay_enabled !== 'false' ? 'Activé' : 'Désactivé'}
                </button>
              </div>
              <div>
                <Label htmlFor="solvexpay_name" className="text-sm">Nom personnalisé</Label>
                <Input
                  id="solvexpay_name"
                  value={settings.solvexpay_name || 'Passerelle 4 - SolvexPay'}
                  onChange={(e) => handleInputChange('solvexpay_name', e.target.value)}
                  placeholder="Passerelle 4 - SolvexPay"
                  data-testid="input-solvexpay-name"
                  className="mt-1"
                />
              </div>
            </div>

            {/* SendavaPay */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    5
                  </div>
                  <div>
                    <p className="font-medium">SendavaPay</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.sendavapay_enabled === 'true' ? '✓ Activé' : '✗ Désactivé'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('sendavapay_enabled', settings.sendavapay_enabled === 'true' ? 'false' : 'true')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.sendavapay_enabled === 'true'
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                  data-testid="toggle-sendavapay-enabled"
                >
                  {settings.sendavapay_enabled === 'true' ? 'Activé' : 'Désactivé'}
                </button>
              </div>
              <div>
                <Label htmlFor="sendavapay_name" className="text-sm">Nom personnalisé</Label>
                <Input
                  id="sendavapay_name"
                  value={settings.sendavapay_name || 'Passerelle 5 - SendavaPay'}
                  onChange={(e) => handleInputChange('sendavapay_name', e.target.value)}
                  placeholder="Passerelle 5 - SendavaPay"
                  data-testid="input-sendavapay-name"
                  className="mt-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                URL Webhook à configurer dans SendavaPay : <span className="font-mono text-xs">https://sikatexte.site/api/webhook/sendavapay</span>
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saveSettingsMutation.isPending}
              className="w-full"
              data-testid="button-save-gateways"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveSettingsMutation.isPending ? "Sauvegarde..." : "Sauvegarder les Passerelles"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}