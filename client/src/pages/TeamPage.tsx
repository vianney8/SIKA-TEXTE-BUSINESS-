import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Share2, Gift, QrCode, Copy, Check, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalCommission: number;
  monthlyCommission: number;
  referrals: Array<{
    id: string;
    name: string;
    joinDate: string;
    isActive: boolean;
    commissionEarned: number;
  }>;
}

export default function TeamPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: referralData } = useQuery<ReferralData>({
    queryKey: ['/api/referrals'],
  });

  const copyReferralCode = async () => {
    if (!referralData?.referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      toast({
        title: "Code copié ! 📋",
        description: "Votre code de parrainage a été copié dans le presse-papiers",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive",
      });
    }
  };

  const shareReferralCode = async () => {
    if (!referralData?.referralCode) return;

    const shareText = `Rejoignez SIKA TEXTE BUSINESS et gagnez de l'argent en corrigeant des phrases ! Utilisez mon code de parrainage : ${referralData.referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SIKA TEXTE BUSINESS',
          text: shareText,
        });
      } catch (err) {
        // Fallback to copy
        copyReferralCode();
      }
    } else {
      // Fallback to copy
      copyReferralCode();
    }
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
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Équipe</h1>
        </div>
      </div>
      <div className="p-4">
        <div className="max-w-md mx-auto pt-8 space-y-6">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mon Équipe
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Parrainez et gagnez 20% de commission
          </p>
        </div>

        {/* Referral Link Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Share2 className="w-5 h-5 text-blue-600" />
              Mon Lien de Parrainage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Lien de parrainage :</p>
                <p className="text-sm font-mono break-all">
                  {referralData?.referralCode 
                    ? `https://sikatexte.site/register?ref=${referralData.referralCode}`
                    : "Chargement du lien..."
                  }
                </p>
              </div>
              <Button 
                onClick={() => {
                  if (!referralData?.referralCode) {
                    toast({
                      title: "Erreur",
                      description: "Code de parrainage non disponible",
                      variant: "destructive",
                    });
                    return;
                  }
                  const referralLink = `https://sikatexte.site/register?ref=${referralData.referralCode}`;
                  navigator.clipboard.writeText(referralLink);
                  toast({
                    title: "Lien copié ! 📋",
                    description: "Votre lien de parrainage a été copié dans le presse-papiers",
                  });
                }}
                className="w-full flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 border-0"
                data-testid="button-copy-referral-link"
                disabled={!referralData?.referralCode}
              >
                <Copy className="w-4 h-4" />
                Copier le lien
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {referralData?.totalReferrals || 0}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Total parrainés
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {referralData?.activeReferrals || 0}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Comptes activés
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="w-5 h-5 text-yellow-600" />
              Mes Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total gagné</span>
                <span className="font-semibold text-green-600">
                  {referralData?.totalCommission || 0} FCFA
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ce mois</span>
                <span className="font-semibold text-blue-600">
                  {referralData?.monthlyCommission || 0} FCFA
                </span>
              </div>
              <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 p-2 rounded">
                💡 Gagnez 20% sur chaque activation de compte parrainé
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="w-5 h-5 text-purple-600" />
              Scanner pour parrainer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              {/* QR Code SVG - Code de parrainage générique */}
              <div className="mx-auto w-48 h-48 bg-white p-4 rounded-lg shadow-sm">
                <svg width="100%" height="100%" viewBox="0 0 200 200" className="border">
                  {/* QR Code pattern - représentation simplifiée */}
                  <rect width="200" height="200" fill="white"/>
                  {/* Coins de positionnement */}
                  <rect x="10" y="10" width="30" height="30" fill="black"/>
                  <rect x="160" y="10" width="30" height="30" fill="black"/>
                  <rect x="10" y="160" width="30" height="30" fill="black"/>
                  <rect x="15" y="15" width="20" height="20" fill="white"/>
                  <rect x="165" y="15" width="20" height="20" fill="white"/>
                  <rect x="15" y="165" width="20" height="20" fill="white"/>
                  <rect x="20" y="20" width="10" height="10" fill="black"/>
                  <rect x="170" y="20" width="10" height="10" fill="black"/>
                  <rect x="20" y="170" width="10" height="10" fill="black"/>
                  
                  {/* Pattern de données */}
                  <rect x="50" y="20" width="5" height="5" fill="black"/>
                  <rect x="60" y="20" width="5" height="5" fill="black"/>
                  <rect x="75" y="20" width="5" height="5" fill="black"/>
                  <rect x="85" y="20" width="5" height="5" fill="black"/>
                  <rect x="100" y="20" width="5" height="5" fill="black"/>
                  <rect x="115" y="20" width="5" height="5" fill="black"/>
                  <rect x="130" y="20" width="5" height="5" fill="black"/>
                  <rect x="145" y="20" width="5" height="5" fill="black"/>
                  
                  <rect x="50" y="30" width="5" height="5" fill="black"/>
                  <rect x="65" y="30" width="5" height="5" fill="black"/>
                  <rect x="80" y="30" width="5" height="5" fill="black"/>
                  <rect x="95" y="30" width="5" height="5" fill="black"/>
                  <rect x="110" y="30" width="5" height="5" fill="black"/>
                  <rect x="125" y="30" width="5" height="5" fill="black"/>
                  <rect x="140" y="30" width="5" height="5" fill="black"/>
                  
                  {/* Centre du QR */}
                  <rect x="85" y="85" width="30" height="30" fill="black"/>
                  <rect x="90" y="90" width="20" height="20" fill="white"/>
                  <rect x="95" y="95" width="10" height="10" fill="black"/>
                  
                  {/* Plus de pattern */}
                  <rect x="20" y="50" width="5" height="5" fill="black"/>
                  <rect x="30" y="50" width="5" height="5" fill="black"/>
                  <rect x="20" y="60" width="5" height="5" fill="black"/>
                  <rect x="35" y="60" width="5" height="5" fill="black"/>
                  
                  <rect x="160" y="50" width="5" height="5" fill="black"/>
                  <rect x="170" y="50" width="5" height="5" fill="black"/>
                  <rect x="180" y="50" width="5" height="5" fill="black"/>
                  
                  <rect x="50" y="160" width="5" height="5" fill="black"/>
                  <rect x="60" y="170" width="5" height="5" fill="black"/>
                  <rect x="70" y="160" width="5" height="5" fill="black"/>
                  <rect x="80" y="175" width="5" height="5" fill="black"/>
                  <rect x="90" y="160" width="5" height="5" fill="black"/>
                  <rect x="100" y="170" width="5" height="5" fill="black"/>
                  <rect x="110" y="165" width="5" height="5" fill="black"/>
                  <rect x="120" y="180" width="5" height="5" fill="black"/>
                </svg>
              </div>
              
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Scannez ce code QR pour rejoindre avec mon code de parrainage
              </div>
              
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Code de parrainage :</p>
                <p className="text-lg font-mono font-bold">
                  {referralData?.referralCode || 'SIKA2024USER'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            data-testid="button-copy-referral"
            onClick={copyReferralCode}
            variant="outline" 
            className="flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copié !' : 'Copier'}
          </Button>
          <Button 
            data-testid="button-share-referral"
            onClick={shareReferralCode}
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Partager
          </Button>
        </div>

        </div>
      </div>
    </div>
  );
}