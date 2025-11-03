import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, User, Edit, Lock, Camera, Loader2 } from "lucide-react";
import { Link } from "wouter";

type ProfileForm = {
  fullName: string;
  phone: string;
  email: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Extract country code from user's phone number
  const extractCountryCode = (phone: string) => {
    if (!phone) return "+228";
    if (phone.startsWith("+228")) return "+228";
    if (phone.startsWith("+225")) return "+225";
    if (phone.startsWith("+221")) return "+221";
    if (phone.startsWith("+226")) return "+226";
    if (phone.startsWith("+229")) return "+229";
    return "+228"; // Default
  };

  const [countryCode, setCountryCode] = useState(extractCountryCode((user as any)?.phone || ""));

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
    },
  });

  // Update form when user data loads or changes
  useEffect(() => {
    if (user) {
      const extractedCountryCode = extractCountryCode((user as any)?.phone || "");
      setCountryCode(extractedCountryCode);
      
      profileForm.reset({
        fullName: (user as any)?.fullName || ((user as any)?.firstName + " " + (user as any)?.lastName) || "",
        phone: (user as any)?.phone ? (user as any).phone.replace(/^\+\d{3}/, "") : "",
        email: (user as any)?.email || "",
      });
    }
  }, [user]);

  const passwordForm = useForm<PasswordForm>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      // Validate phone number is not empty
      if (!data.phone || data.phone.trim() === "") {
        throw new Error("Le numéro de téléphone ne peut pas être vide");
      }
      
      // Combine country code with phone number before sending
      const fullPhone = countryCode + data.phone.trim();
      return await apiRequest("PUT", "/api/user/profile", {
        ...data,
        phone: fullPhone,
      });
    },
    onSuccess: () => {
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour du profil",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      return await apiRequest("PUT", "/api/user/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été modifié avec succès",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la modification du mot de passe",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    updatePasswordMutation.mutate(data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Fichier invalide',
        description: 'Veuillez sélectionner une image',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 5 MB',
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      try {
        const uploadUrlResponse = await apiRequest('POST', '/api/profile/photo/upload-url', { fileName: file.name });
        const { uploadURL } = uploadUrlResponse;

        const uploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Échec du téléchargement de la photo');
        }

        const updateResponse = await apiRequest('PUT', '/api/profile/photo', { photoURL: uploadURL });
        return updateResponse;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Photo mise à jour',
        description: 'Votre photo de profil a été modifiée avec succès',
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour la photo',
      });
    },
  });

  const handleUploadPhoto = () => {
    if (selectedFile) {
      uploadPhotoMutation.mutate(selectedFile);
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

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
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Profil</h1>
        </div>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex mb-6 bg-muted rounded-lg p-1">
          <Button
            variant={activeTab === "profile" ? "default" : "ghost"}
            onClick={() => setActiveTab("profile")}
            className="flex-1 rounded-md"
            data-testid="tab-profile"
          >
            <User className="mr-2" size={16} />
            Profil
          </Button>
          <Button
            variant={activeTab === "password" ? "default" : "ghost"}
            onClick={() => setActiveTab("password")}
            className="flex-1 rounded-md"
            data-testid="tab-password"
          >
            <Lock className="mr-2" size={16} />
            Mot de passe
          </Button>
        </div>

        {activeTab === "profile" ? (
          <Card className="bg-white rounded-xl shadow-sm border border-border">
            <CardContent className="p-6">
              <div className="flex items-center mb-6">
                <Edit className="text-primary mr-3" size={24} />
                <h2 className="text-xl font-bold">Modifier le profil</h2>
              </div>

              {/* Profile Picture */}
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gradient-to-r from-primary to-accent rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Aperçu photo de profil" 
                        className="w-full h-full object-cover"
                      />
                    ) : (user as any)?.profileImageUrl ? (
                      <img 
                        src={(user as any).profileImageUrl} 
                        alt="Photo de profil" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="text-white" size={36} />
                    )}
                  </div>
                  {!selectedFile && (
                    <label
                      htmlFor="photo-upload-input"
                      className="absolute bottom-4 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                      data-testid="button-change-photo"
                    >
                      <Camera className="w-4 h-4" />
                      <input
                        id="photo-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="input-photo-file"
                      />
                    </label>
                  )}
                </div>
                {selectedFile && (
                  <div className="flex gap-2 justify-center mb-4">
                    <Button
                      onClick={handleUploadPhoto}
                      disabled={uploading}
                      size="sm"
                      data-testid="button-upload-photo"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Upload...
                        </>
                      ) : (
                        'Enregistrer la photo'
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelUpload}
                      variant="outline"
                      disabled={uploading}
                      size="sm"
                      data-testid="button-cancel-upload"
                    >
                      Annuler
                    </Button>
                  </div>
                )}
                <h3 className="text-lg font-semibold" data-testid="text-user-name">
                  {(user as any)?.fullName || (user as any)?.firstName + " " + (user as any)?.lastName || "Utilisateur"}
                </h3>
                <p className="text-muted-foreground" data-testid="text-user-email">
                  {(user as any)?.email || ""}
                </p>
                {!(user as any)?.phone && (
                  <div className="mt-2 p-2 bg-orange-50 text-orange-800 text-xs rounded">
                    Veuillez compléter vos informations de profil
                  </div>
                )}
              </div>

              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            data-testid="input-fullname"
                            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de téléphone</FormLabel>
                        <div className="flex">
                          <select 
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="border border-input rounded-l-lg px-3 py-3 focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                            data-testid="select-country-code"
                          >
                            <option value="+228">🇹🇬 +228</option>
                            <option value="+225">🇨🇮 +225</option>
                            <option value="+221">🇸🇳 +221</option>
                            <option value="+226">🇧🇫 +226</option>
                            <option value="+229">🇧🇯 +229</option>
                          </select>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="12345678"
                              {...field}
                              data-testid="input-phone"
                              className="flex-1 px-4 py-3 border border-l-0 border-input rounded-r-lg focus:ring-2 focus:ring-ring"
                            />
                          </FormControl>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ce numéro sera utilisé pour votre prochaine connexion
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="votre@email.com"
                            {...field}
                            data-testid="input-email"
                            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                </form>
              </Form>

              {/* Account Info */}
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span>Membre depuis</span>
                  <span className="font-semibold" data-testid="text-member-since">
                    {(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString("fr-FR") : "N/A"}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span>Statut du compte</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    Vérifié
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span>Code de parrainage</span>
                  <span className="font-semibold" data-testid="text-referral-code">
                    {(user as any)?.referralCode || "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white rounded-xl shadow-sm border border-border">
            <CardContent className="p-6">
              <div className="flex items-center mb-6">
                <Lock className="text-primary mr-3" size={24} />
                <h2 className="text-xl font-bold">Modifier le mot de passe</h2>
              </div>

              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe actuel</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Votre mot de passe actuel"
                            {...field}
                            data-testid="input-current-password"
                            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nouveau mot de passe</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Nouveau mot de passe"
                            {...field}
                            data-testid="input-new-password"
                            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirmer le mot de passe"
                            {...field}
                            data-testid="input-confirm-password"
                            className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={updatePasswordMutation.isPending}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    data-testid="button-save-password"
                  >
                    {updatePasswordMutation.isPending ? "Modification..." : "Changer le mot de passe"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
