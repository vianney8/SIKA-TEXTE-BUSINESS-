import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Copy, Share, QrCode, User } from "lucide-react";
import { Link } from "wouter";
import { formatFCFA } from "@/lib/utils";

export default function Team() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: referralStats } = useQuery({
    queryKey: ["/api/referrals/stats"],
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["/api/referrals"],
  });

  const referralLink = user ? `https://sikatexte.com/register?ref=${(user as any).referralCode}` : "";

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Lien copié",
        description: "Le lien de parrainage a été copié dans le presse-papiers",
      });
    }
  };

  const shareReferralLink = () => {
    if (navigator.share && referralLink) {
      navigator.share({
        title: "Rejoignez SIKA TEXTE BUSINESS",
        text: "Utilisez mon lien de parrainage pour créer votre compte",
        url: referralLink,
      });
    } else {
      copyReferralLink();
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
          <h1 className="ml-4 text-lg font-semibold" data-testid="page-title">Mon équipe</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Card */}
        <Card className="bg-white rounded-xl shadow-sm border border-border">
          <CardContent className="p-6">
            <div className="flex items-center mb-6">
              <Users className="text-primary mr-3" size={24} />
              <h2 className="text-xl font-bold">Statistiques de parrainage</h2>
            </div>

            {/* Referral Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-primary" data-testid="text-total-referrals">
                  {(referralStats as any)?.totalReferrals || 0}
                </div>
                <div className="text-sm text-muted-foreground">Parrainages</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600" data-testid="text-total-commission">
                  {(referralStats as any)?.totalCommission || 0}
                </div>
                <div className="text-sm text-muted-foreground">Commissions (F.CFA)</div>
              </div>
            </div>

            {/* Referral Link */}
            <div className="bg-muted p-4 rounded-lg mb-6">
              <Label className="block text-sm font-medium mb-2">Votre lien de parrainage</Label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={referralLink}
                  className="flex-1 px-3 py-2 bg-white border border-input rounded-lg text-sm"
                  readOnly
                  data-testid="input-referral-link"
                />
                <Button
                  onClick={copyReferralLink}
                  size="sm"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-blue-700 transition-colors"
                  data-testid="button-copy-link"
                >
                  <Copy size={16} />
                </Button>
                <Button
                  onClick={shareReferralLink}
                  size="sm"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  data-testid="button-share-link"
                >
                  <Share size={16} />
                </Button>
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center mb-6">
              <div className="w-32 h-32 bg-gray-200 mx-auto rounded-lg flex items-center justify-center mb-2">
                <QrCode className="text-gray-400" size={48} />
              </div>
              <p className="text-sm text-muted-foreground">Scannez pour parrainer</p>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="bg-white rounded-xl shadow-sm border border-border">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4" data-testid="text-team-members-title">Mes filleuls</h3>
            
            {(referrals as any[]).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-referrals">
                Aucun filleul pour le moment
              </div>
            ) : (
              <div className="space-y-3">
                {(referrals as any[]).map((referral: any) => (
                  <div 
                    key={referral.id} 
                    className="flex justify-between items-center p-3 bg-muted rounded-lg"
                    data-testid={`referral-${referral.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary bg-opacity-20 rounded-full flex items-center justify-center">
                        <User className="text-primary" size={16} />
                      </div>
                      <div>
                        <div className="font-medium" data-testid={`text-referral-name-${referral.id}`}>
                          {referral.referredUser?.fullName || "Utilisateur"}
                        </div>
                        <div className="text-xs text-muted-foreground" data-testid={`text-referral-date-${referral.id}`}>
                          Rejoint le {new Date(referral.createdAt).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600" data-testid={`text-referral-commission-${referral.id}`}>
                        {formatFCFA(parseFloat(referral.commission))}
                      </div>
                      <div className="text-xs text-muted-foreground">Commission</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
