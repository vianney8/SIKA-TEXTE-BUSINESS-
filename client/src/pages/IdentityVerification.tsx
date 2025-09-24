import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, CheckCircle, Clock, AlertCircle, Shield, Camera } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface IdentityVerificationData {
  id?: string;
  frontIdPhotoUrl?: string;
  backIdPhotoUrl?: string;
  selfiePhotoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export default function IdentityVerification() {
  const { toast } = useToast();
  const [frontId, setFrontId] = useState<File | null>(null);
  const [backId, setBackId] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const { data: verificationData } = useQuery<IdentityVerificationData>({
    queryKey: ['/api/identity-verification'],
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/identity-verification/submit', {
        method: 'POST',
        credentials: 'include',
        body: data
      });
      if (!res.ok) throw new Error('Échec de l\'envoi');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Documents envoyés ! 📄",
        description: "Vos documents sont en cours de vérification",
      });
      setFrontId(null);
      setBackId(null);
      setSelfie(null);
      queryClient.invalidateQueries({ queryKey: ['/api/identity-verification'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur d'envoi",
        description: error.message || "Impossible d'envoyer les documents",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (type: 'front' | 'back' | 'selfie', file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximum est de 5MB",
        variant: "destructive",
      });
      return;
    }
    
    switch (type) {
      case 'front':
        setFrontId(file);
        break;
      case 'back':
        setBackId(file);
        break;
      case 'selfie':
        setSelfie(file);
        break;
    }
  };

  const handleSubmit = () => {
    if (!frontId || !backId || !selfie) {
      toast({
        title: "Documents manquants",
        description: "Veuillez fournir tous les documents requis",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('frontId', frontId);
    formData.append('backId', backId);
    formData.append('selfie', selfie);

    submitVerificationMutation.mutate(formData);
  };

  const getStatusCard = () => {
    if (!verificationData) {
      return null;
    }

    switch (verificationData.status) {
      case 'approved':
        return (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 text-lg">
                    Pièces approuvées ✓
                  </h3>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Options en cours de développement
                  </p>
                  {/* Logo placeholder */}
                  <div className="mt-3 w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'pending':
        return (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                  <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                    Vérification en cours
                  </h3>
                  <p className="text-orange-700 dark:text-orange-300 text-sm">
                    Vos documents sont en cours d'examen par notre équipe
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'rejected':
        return (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-200">
                    Documents refusés
                  </h3>
                  <p className="text-red-700 dark:text-red-300 text-sm">
                    {verificationData.adminNotes || "Veuillez soumettre de nouveaux documents"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-primary-foreground">
        <div className="px-6 py-4 flex items-center">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
            <Link href="/profile" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">
            Vérification d'Identité
          </h1>
        </div>
      </div>

      <div className="p-6">
        {/* Status Card */}
        {getStatusCard()}

        {/* Upload Section - Only show if not approved */}
        {verificationData?.status !== 'approved' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl">Documents d'Identité</h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    Téléchargez vos documents pour vérification
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Documents requis :
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Photo recto de votre pièce d'identité (CNI, passeport)</li>
                    <li>• Photo verso de votre pièce d'identité</li>
                    <li>• Photo selfie tenant votre pièce d'identité</li>
                    <li>• Format : JPG, PNG (5MB maximum par fichier)</li>
                  </ul>
                </div>

                {/* Upload Fields */}
                <div className="grid gap-4">
                  {/* Front ID */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Photo Recto de la Pièce d'Identité *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect('front', e.target.files?.[0] || null)}
                        className="hidden"
                        id="front-id"
                        data-testid="input-front-id"
                      />
                      <label htmlFor="front-id" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          {frontId ? frontId.name : "Cliquez pour sélectionner"}
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Back ID */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Photo Verso de la Pièce d'Identité *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect('back', e.target.files?.[0] || null)}
                        className="hidden"
                        id="back-id"
                        data-testid="input-back-id"
                      />
                      <label htmlFor="back-id" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          {backId ? backId.name : "Cliquez pour sélectionner"}
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Selfie */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Photo Selfie avec Pièce d'Identité *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect('selfie', e.target.files?.[0] || null)}
                        className="hidden"
                        id="selfie"
                        data-testid="input-selfie"
                      />
                      <label htmlFor="selfie" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          {selfie ? selfie.name : "Cliquez pour sélectionner"}
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  onClick={handleSubmit}
                  disabled={!frontId || !backId || !selfie || submitVerificationMutation.isPending}
                  className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                  data-testid="button-submit-verification"
                >
                  {submitVerificationMutation.isPending ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Envoyer mes documents
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="mt-6 bg-slate-50 dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h4 className="font-semibold mb-2">Sécurité et Confidentialité</h4>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>• Vos documents sont stockés de manière sécurisée et chiffrée</p>
                  <p>• Seule notre équipe de vérification y a accès</p>
                  <p>• Les données sont conformes aux réglementations RGPD</p>
                  <p>• Délai de traitement : 24-72 heures ouvrables</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}