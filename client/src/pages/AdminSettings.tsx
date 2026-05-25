import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings, Save, Wrench, CheckCircle, Video, Upload, Play, ShieldAlert } from "lucide-react";
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

const MAINTENANCE_COUNTRIES = [
  { code: "BJ",  name: "Bénin",             flag: "🇧🇯", operators: [{ key: "mtn", name: "MTN", bg: "#FFCC00", text: "#000" }, { key: "moov", name: "Moov", bg: "#005BAA", text: "#fff" }] },
  { code: "CI",  name: "Côte d'Ivoire",     flag: "🇨🇮", operators: [{ key: "mtn", name: "MTN", bg: "#FFCC00", text: "#000" }, { key: "moov", name: "Moov", bg: "#005BAA", text: "#fff" }, { key: "orange", name: "Orange", bg: "#FF6600", text: "#fff" }, { key: "wave", name: "Wave", bg: "#1B6FEE", text: "#fff" }] },
  { code: "SN",  name: "Sénégal",           flag: "🇸🇳", operators: [{ key: "orange", name: "Orange", bg: "#FF6600", text: "#fff" }, { key: "wave", name: "Wave", bg: "#1B6FEE", text: "#fff" }, { key: "free", name: "Free", bg: "#00923F", text: "#fff" }] },
  { code: "BF",  name: "Burkina Faso",      flag: "🇧🇫", operators: [{ key: "moov", name: "Moov", bg: "#005BAA", text: "#fff" }, { key: "orange", name: "Orange", bg: "#FF6600", text: "#fff" }, { key: "wave", name: "Wave", bg: "#1B6FEE", text: "#fff" }] },
  { code: "TG",  name: "Togo",              flag: "🇹🇬", operators: [{ key: "moov", name: "Moov", bg: "#005BAA", text: "#fff" }, { key: "tmoney", name: "T-Money", bg: "#C8102E", text: "#fff" }] },
  { code: "CM",  name: "Cameroun",          flag: "🇨🇲", operators: [{ key: "mtn", name: "MTN", bg: "#FFCC00", text: "#000" }, { key: "orange", name: "Orange", bg: "#FF6600", text: "#fff" }] },
];

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<{[key: string]: string}>({});
  const [videoFile, setVideoFile]     = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
      queryClient.invalidateQueries({ queryKey: ['/api/settings/ci_manual_activation'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/ci_manual_activation_url'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/solvexpay_enabled'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/solvexpay_name'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/solvexpay_link'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activation/payment-info'] });
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

  // Operator maintenance
  const { data: maintenanceMap = {}, refetch: refetchMaintenance } = useQuery<Record<string, boolean>>({
    queryKey: ['/api/admin/operator-maintenance'],
  });

  const toggleMaintenance = useMutation({
    mutationFn: async ({ opKey, maintenance }: { opKey: string; maintenance: boolean }) =>
      apiRequest("PUT", `/api/admin/operator-maintenance/${opKey}`, { maintenance }),
    onSuccess: (_, { opKey, maintenance }) => {
      toast({
        title: maintenance ? "⚠ Mis en maintenance" : "✓ Remis en service",
        description: `Opérateur ${opKey.replace("_", " — ")} : ${maintenance ? "En maintenance" : "Libre"}`,
      });
      refetchMaintenance();
      queryClient.invalidateQueries({ queryKey: ['/api/activation/payment-info'] });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ title: "Erreur", description: "Seuls les fichiers vidéo sont acceptés", variant: "destructive" });
      return;
    }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const handleVideoUpload = async () => {
    if (!videoFile) return;
    setIsUploadingVideo(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("video", videoFile);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/upload-demo-video", true);
        xhr.withCredentials = true;
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 95));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            resolve();
          } else {
            let msg = "Erreur lors de l'upload";
            try { msg = JSON.parse(xhr.responseText)?.message || msg; } catch {}
            reject(new Error(msg));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Erreur réseau lors de l'upload")));
        xhr.addEventListener("abort", () => reject(new Error("Upload annulé")));
        xhr.send(formData);
      });

      toast({ title: "✅ Vidéo mise à jour !", description: "La vidéo de démonstration a été remplacée avec succès" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/demo_video_url"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setVideoFile(null);
      setVideoPreview(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
    } catch (error: any) {
      toast({ title: "Erreur upload", description: error.message || "Impossible d'uploader la vidéo", variant: "destructive" });
    } finally {
      setIsUploadingVideo(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
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

            <div>
              <Label htmlFor="whatsapp_admin_contact">📱 WhatsApp Administrateur (Contact Mise à jour)</Label>
              <Input
                id="whatsapp_admin_contact"
                value={settings.whatsapp_admin_contact || ''}
                onChange={(e) => handleInputChange('whatsapp_admin_contact', e.target.value)}
                placeholder="2250708091011"
                data-testid="input-whatsapp-admin-contact"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Numéro WhatsApp de l'administrateur (format international sans +, ex: 2250708091011). Affiché sur la page de mise à jour +225 pour que les utilisateurs puissent vous contacter.
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
              <Label htmlFor="ci_update_amount">Montant de la mise à jour (FCFA)</Label>
              <input
                id="ci_update_amount"
                type="number"
                value={settings.ci_update_amount || '1200'}
                onChange={(e) => handleInputChange('ci_update_amount', e.target.value)}
                placeholder="1200"
                min="1"
                data-testid="input-ci-update-amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Montant que les utilisateurs +225 devront payer pour la mise à jour.
              </p>
            </div>
            <div>
              <Label htmlFor="ci_update_link">Lien de paiement pour la mise à jour</Label>
              <Input
                id="ci_update_link"
                value={settings.ci_update_link || ''}
                onChange={(e) => handleInputChange('ci_update_link', e.target.value)}
                placeholder="https://..."
                data-testid="input-ci-update-link"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Les utilisateurs seront redirigés vers ce lien pour effectuer leur paiement.
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

            {/* Dépôt Manuel — Liens de paiement */}
            <div className="space-y-3 p-4 border-2 rounded-xl border-violet-200 bg-violet-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xl">
                    🏦
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">Dépôt manuel — Liens de paiement</p>
                    <p className="text-xs text-muted-foreground">
                      {settings.link_manual_mode_global !== 'false'
                        ? '✓ Activé — les liens en mode manuel utilisent les numéros configurés ci-dessous'
                        : '✗ Désactivé — tous les liens utilisent SolvexPay automatiquement'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('link_manual_mode_global', settings.link_manual_mode_global === 'false' ? 'true' : 'false')}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${
                    settings.link_manual_mode_global !== 'false' ? 'bg-violet-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    settings.link_manual_mode_global !== 'false' ? 'translate-x-8' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <p className="text-xs text-violet-700 bg-violet-100 rounded-lg px-3 py-2 leading-relaxed">
                💡 Pas besoin de re-saisir les numéros : le système utilise automatiquement les <strong>mêmes numéros de dépôt et instructions</strong> que ceux configurés pour l'<strong>Activation manuelle</strong> (par pays + opérateur, plus bas).
              </p>
            </div>

            {/* CI — Mode d'activation */}
            <div className="space-y-4 p-4 border-2 rounded-xl border-orange-200 bg-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center text-xl">
                  🇨🇮
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">Côte d'Ivoire — Mode de paiement</p>
                  <p className="text-xs text-muted-foreground">Activation de compte ET liens de paiement</p>
                </div>
              </div>

              {/* Sélecteur de mode */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'solvexpay', label: '🤖 SolvexPay', desc: 'API automatique' },
                  { value: 'manual',   label: '🏦 Dépôt manuel', desc: 'Numéros configurés' },
                  { value: 'redirect', label: '🔗 Redirection', desc: 'Lien externe' },
                ].map(opt => {
                  const current = settings.ci_activation_mode || 'redirect';
                  const selected = current === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleInputChange('ci_activation_mode', opt.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all ${
                        selected
                          ? 'border-orange-500 bg-white shadow-sm text-orange-800'
                          : 'border-orange-100 bg-orange-50/50 text-gray-500 hover:border-orange-200'
                      }`}
                    >
                      <span className="text-base font-bold leading-tight">{opt.label}</span>
                      <span className="text-[10px]">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mode "Redirection lien" : URL */}
              {(settings.ci_activation_mode || 'redirect') === 'redirect' && (
                <div>
                  <Label htmlFor="ci_manual_activation_url" className="text-sm">URL de redirection CI</Label>
                  <Input
                    id="ci_manual_activation_url"
                    value={settings.ci_manual_activation_url || 'https://clp.ci/ETPXwo'}
                    onChange={(e) => handleInputChange('ci_manual_activation_url', e.target.value)}
                    placeholder="https://clp.ci/ETPXwo"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Les utilisateurs CI seront redirigés vers ce lien (activation + liens de paiement).
                  </p>
                </div>
              )}

              {/* Mode "Dépôt manuel" : numéros par opérateur */}
              {settings.ci_activation_mode === 'manual' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Numéros de dépôt — Opérateurs CI</p>
                  {[
                    { op: 'mtn',    label: 'MTN',          fullName: 'MTN Mobile Money' },
                    { op: 'moov',   label: 'Moov',         fullName: 'Moov Money' },
                    { op: 'orange', label: 'Orange Money', fullName: 'Orange Money CI' },
                    { op: 'wave',   label: 'Wave',         fullName: 'Wave CI' },
                  ].map(({ op, label, fullName }) => (
                    <div key={op} className="border border-orange-100 rounded-xl p-3 space-y-3 bg-white">
                      <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">{label}</p>

                      <div>
                        <Label className="text-xs text-gray-600">Numéro de dépôt</Label>
                        <Input
                          value={settings[`ci_${op}_deposit_number`] || ''}
                          onChange={(e) => handleInputChange(`ci_${op}_deposit_number`, e.target.value)}
                          placeholder="+2250XXXXXXXXX"
                          className="mt-1 font-mono text-sm"
                        />
                      </div>

                    </div>
                  ))}
                </div>
              )}

              {(settings.ci_activation_mode || 'redirect') === 'solvexpay' && (
                <p className="text-xs text-orange-700 bg-orange-100 rounded-lg px-3 py-2">
                  🤖 SolvexPay traite automatiquement les paiements CI via l'API. Aucune configuration manuelle requise.
                </p>
              )}
            </div>

            {/* Configuration par pays */}
            {[
              { code: 'BJ',  flag: '🇧🇯', name: 'Bénin',             key: 'bj',  operators: ['mtn','moov'] },
              { code: 'SN',  flag: '🇸🇳', name: 'Sénégal',           key: 'sn',  operators: ['orange','wave','free'] },
              { code: 'BF',  flag: '🇧🇫', name: 'Burkina Faso',      key: 'bf',  operators: ['moov','orange','wave'] },
              { code: 'TG',  flag: '🇹🇬', name: 'Togo',              key: 'tg',  operators: ['moov','tmoney'] },
              { code: 'CM',  flag: '🇨🇲', name: 'Cameroun',          key: 'cm',  operators: ['mtn','orange'] },
            ].map(({ code, flag, name, key, operators }) => {
              const opNames: Record<string,string> = { mtn:'MTN', moov:'Moov', orange:'Orange', wave:'Wave', tmoney:'T-Money', free:'Free', airtel:'Airtel' };
              const currentMode: string = settings[`${key}_activation_mode`] || 'manual';
              return (
                <div key={code} className="space-y-4 p-4 border-2 rounded-xl border-blue-200 bg-blue-50">
                  {/* En-tête pays */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-xl">
                      {flag}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{name} — Mode de paiement</p>
                      <p className="text-xs text-muted-foreground">Activation de compte ET liens de paiement</p>
                    </div>
                  </div>

                  {/* Sélecteur de mode */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'solvexpay', label: '🤖 SolvexPay', desc: 'API automatique' },
                      { value: 'manual',   label: '🏦 Dépôt manuel', desc: 'Numéros configurés' },
                      { value: 'redirect', label: '🔗 Redirection', desc: 'Lien externe' },
                    ].map(opt => {
                      const selected = currentMode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleInputChange(`${key}_activation_mode`, opt.value)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all ${
                            selected
                              ? 'border-blue-600 bg-white shadow-sm text-blue-800'
                              : 'border-blue-100 bg-blue-50/50 text-gray-500 hover:border-blue-200'
                          }`}
                        >
                          <span className="text-base font-bold leading-tight">{opt.label}</span>
                          <span className="text-[10px]">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mode Redirection : URL */}
                  {currentMode === 'redirect' && (
                    <div>
                      <Label className="text-sm">URL de redirection — {name}</Label>
                      <Input
                        value={settings[`${key}_redirect_url`] || ''}
                        onChange={(e) => handleInputChange(`${key}_redirect_url`, e.target.value)}
                        placeholder="https://example.com/pay"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Les utilisateurs {name} seront redirigés vers ce lien (activation + liens de paiement).
                      </p>
                    </div>
                  )}

                  {/* Mode SolvexPay */}
                  {currentMode === 'solvexpay' && (
                    <p className="text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                      🤖 SolvexPay traite automatiquement les paiements {name} via l'API.
                    </p>
                  )}

                  {/* Mode Dépôt manuel : numéros par opérateur */}
                  {currentMode === 'manual' && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Numéros de dépôt par opérateur</p>
                      {operators.map(op => {
                        const opName = opNames[op] || op;
                        const isWaveOp = op === 'wave';
                        return (
                          <div key={op} className="border border-blue-100 rounded-xl p-3 space-y-3 bg-white">
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">{opName}</p>

                            <div>
                              <Label className="text-xs text-gray-600">Numéro de dépôt</Label>
                              <Input
                                value={settings[`${key}_${op}_deposit_number`] || ''}
                                onChange={(e) => handleInputChange(`${key}_${op}_deposit_number`, e.target.value)}
                                placeholder="+2290XXXXXXXXX"
                                className="mt-1 font-mono text-sm"
                              />
                            </div>

                            <div>
                              <Label className="text-xs text-amber-700 font-semibold">🌍 Note dépôt international</Label>
                              <textarea
                                value={settings[`international_deposit_note_${key}_${op}`] ?? ''}
                                onChange={(e) => handleInputChange(`international_deposit_note_${key}_${op}`, e.target.value)}
                                placeholder="Message affiché pour ce dépôt international (laisser vide = aucun message)"
                                rows={2}
                                className="mt-1 w-full border border-amber-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* SolvexPay */}
            <div className="space-y-3 p-4 border rounded-lg border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                    S
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
                  value={settings.solvexpay_name || 'SolvexPay — Mobile Money'}
                  onChange={(e) => handleInputChange('solvexpay_name', e.target.value)}
                  placeholder="SolvexPay — Mobile Money"
                  data-testid="input-solvexpay-name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="solvexpay_link" className="text-sm">Lien de paiement SolvexPay</Label>
                <Input
                  id="solvexpay_link"
                  value={settings.solvexpay_link || ''}
                  onChange={(e) => handleInputChange('solvexpay_link', e.target.value)}
                  placeholder="https://pay.sx/xxxxxxxx"
                  data-testid="input-solvexpay-link"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lien de paiement créé depuis votre tableau de bord SolvexPay (Liens de Paiement). Les utilisateurs y seront redirigés directement.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                URL Webhook à configurer dans SolvexPay : <span className="font-mono">https://sikatexte.site/api/webhook/solvexpay</span>
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

        {/* Operator Maintenance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-600" />
              Maintenance des opérateurs
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Activez la maintenance par opérateur et par pays. Les utilisateurs verront <span className="font-mono font-bold text-red-600 bg-red-50 px-1 rounded">Maint</span> sur la page de paiement.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {MAINTENANCE_COUNTRIES.map(country => (
              <div key={country.code}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xl">{country.flag}</span>
                  <span className="font-semibold text-sm text-gray-700">{country.name}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {country.operators.map(op => {
                    const opKey = `${country.code}_${op.key}`;
                    const isMaintenance = maintenanceMap[opKey] === true;
                    const isPending = toggleMaintenance.isPending && toggleMaintenance.variables?.opKey === opKey;
                    return (
                      <div
                        key={opKey}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                          isMaintenance ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-sm"
                            style={{ backgroundColor: op.bg, color: op.text }}
                          >
                            {op.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{op.name}</p>
                            <p className="text-xs text-gray-400">{opKey}</p>
                          </div>
                        </div>
                        <button
                          disabled={isPending}
                          onClick={() => toggleMaintenance.mutate({ opKey, maintenance: !isMaintenance })}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                            isMaintenance
                              ? "bg-red-500 border-red-600 text-white hover:bg-red-600"
                              : "bg-white border-green-400 text-green-700 hover:bg-green-50"
                          }`}
                        >
                          {isPending ? (
                            <span className="animate-spin">⏳</span>
                          ) : isMaintenance ? (
                            <><Wrench size={11} /> Maint</>
                          ) : (
                            <><CheckCircle size={11} /> Libre</>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Vidéo de démonstration ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Vidéo de démonstration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Cette vidéo s'affiche sur le dashboard des utilisateurs sous le titre <strong>"Exemple de retrait"</strong>.
              Vous pouvez la remplacer à tout moment en uploadant un nouveau fichier.
            </p>

            {/* Aperçu vidéo actuelle */}
            <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200">
                <Play size={14} className="text-gray-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {videoPreview ? "Aperçu de la nouvelle vidéo" : "Vidéo actuelle"}
                </span>
              </div>
              <video
                src={videoPreview || settings.demo_video_url || "/promo.mp4"}
                controls
                playsInline
                className="w-full"
                style={{ maxHeight: "220px" }}
                key={videoPreview || "current"}
              />
            </div>

            {/* Sélection de fichier */}
            <div>
              <Label htmlFor="video-upload">Choisir une nouvelle vidéo</Label>
              <div
                onClick={() => videoInputRef.current?.click()}
                className="mt-2 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-6 px-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload size={24} className="text-gray-400" />
                <p className="text-sm text-gray-500 text-center">
                  {videoFile
                    ? <span className="text-blue-600 font-semibold">{videoFile.name}</span>
                    : <>Cliquez pour sélectionner une vidéo<br /><span className="text-xs">MP4, AVI, MOV — max 100 Mo</span></>
                  }
                </p>
              </div>
              <input
                ref={videoInputRef}
                id="video-upload"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoSelect}
              />
            </div>

            {/* Barre de progression */}
            {isUploadingVideo && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {uploadProgress < 95 ? "Upload en cours..." :
                     uploadProgress < 100 ? "Finalisation..." : "✅ Terminé !"}
                  </span>
                  <span className="font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Bouton upload */}
            <Button
              onClick={handleVideoUpload}
              disabled={!videoFile || isUploadingVideo}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isUploadingVideo ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Upload en cours... {uploadProgress}%
                </span>
              ) : (
                <span className="flex items-center gap-2"><Upload size={16} /> Mettre à jour la vidéo</span>
              )}
            </Button>

            {videoFile && (
              <button
                onClick={() => { setVideoFile(null); setVideoPreview(null); if (videoInputRef.current) videoInputRef.current.value = ""; }}
                className="w-full text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                Annuler la sélection
              </button>
            )}
          </CardContent>
        </Card>

      {/* ═══════════════════════════════════════
          MODE MAINTENANCE
      ═══════════════════════════════════════ */}
      <MaintenanceCard />

      </div>
    </div>
  );
}

// ─── Maintenance card (standalone component for clarity) ─────────────────────
const DURATION_PRESETS = [
  { label: "30 min", minutes: 30 },
  { label: "1 heure", minutes: 60 },
  { label: "2 heures", minutes: 120 },
  { label: "4 heures", minutes: 240 },
  { label: "8 heures", minutes: 480 },
  { label: "24 heures", minutes: 1440 },
];

function MaintenanceCard() {
  const { toast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");
  const [message, setMessage] = useState("Le site est en cours de maintenance. Nous revenons très bientôt !");

  const { data: maintenanceStatus, refetch } = useQuery<{ enabled: boolean; endTime: string; message: string }>({
    queryKey: ['/api/maintenance-status'],
    refetchInterval: 15000,
  });

  const isEnabled = maintenanceStatus?.enabled ?? false;

  const enableMutation = useMutation({
    mutationFn: async () => {
      let durationMin = selectedPreset;
      if (!durationMin && customMinutes) durationMin = parseInt(customMinutes);
      if (!durationMin || durationMin < 1) throw new Error("Choisissez une durée");

      const endTime = new Date(Date.now() + durationMin * 60000).toISOString();
      await apiRequest("PUT", "/api/admin/settings/maintenance_enabled", { value: "true" });
      await apiRequest("PUT", "/api/admin/settings/maintenance_end_time", { value: endTime });
      await apiRequest("PUT", "/api/admin/settings/maintenance_message", { value: message });
    },
    onSuccess: () => {
      toast({ title: "🔧 Maintenance activée", description: "Le site est maintenant en maintenance pour les utilisateurs." });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-status'] });
      refetch();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/settings/maintenance_enabled", { value: "false" });
      await apiRequest("PUT", "/api/admin/settings/maintenance_end_time", { value: "" });
    },
    onSuccess: () => {
      toast({ title: "✅ Maintenance désactivée", description: "Le site est de nouveau accessible à tous." });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-status'] });
      refetch();
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const formatEndTime = (iso: string) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <Card className={`border-2 transition-colors ${isEnabled ? "border-orange-400 bg-orange-50" : "border-gray-200"}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <ShieldAlert className="h-5 w-5" />
          Mode Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Status banner */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          isEnabled
            ? "bg-orange-100 border-orange-300 text-orange-800"
            : "bg-gray-50 border-gray-200 text-gray-600"
        }`}>
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${isEnabled ? "bg-orange-500 animate-pulse" : "bg-gray-400"}`} />
          <div className="flex-1">
            <p className="font-semibold text-sm">{isEnabled ? "Maintenance ACTIVE" : "Site en ligne"}</p>
            {isEnabled && maintenanceStatus?.endTime && (
              <p className="text-xs mt-0.5 opacity-75">Jusqu'à {formatEndTime(maintenanceStatus.endTime)}</p>
            )}
          </div>
          {isEnabled && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending}
              data-testid="button-disable-maintenance"
              className="bg-orange-600 hover:bg-orange-700"
            >
              {disableMutation.isPending ? "..." : "Désactiver"}
            </Button>
          )}
        </div>

        {!isEnabled && (
          <>
            <p className="text-sm text-muted-foreground">
              Lorsque la maintenance est activée, tous les utilisateurs (sauf administrateurs) verront une page de maintenance animée avec un jeu de distraction.
            </p>

            {/* Duration presets */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Durée de la maintenance</Label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.minutes}
                    type="button"
                    onClick={() => { setSelectedPreset(p.minutes); setCustomMinutes(""); }}
                    data-testid={`button-preset-${p.minutes}`}
                    className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                      selectedPreset === p.minutes
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Durée personnalisée (min)"
                  value={customMinutes}
                  onChange={(e) => { setCustomMinutes(e.target.value); setSelectedPreset(null); }}
                  data-testid="input-custom-duration"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">minutes</span>
              </div>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="maintenance-message" className="text-sm font-semibold mb-1 block">Message affiché aux utilisateurs</Label>
              <textarea
                id="maintenance-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                data-testid="input-maintenance-message"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                placeholder="Message de maintenance..."
              />
            </div>

            {/* Activate button */}
            <Button
              onClick={() => enableMutation.mutate()}
              disabled={enableMutation.isPending || (!selectedPreset && !customMinutes)}
              data-testid="button-enable-maintenance"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              <ShieldAlert className="h-4 w-4 mr-2" />
              {enableMutation.isPending ? "Activation..." : "Activer la maintenance"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}