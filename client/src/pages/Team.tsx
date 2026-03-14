import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Users, Copy, Share2, User, ChevronLeft, Gift, TrendingUp } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { formatFCFA } from "@/lib/utils";
import { Link } from "wouter";

export default function Team() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: referralStats } = useQuery({ queryKey: ["/api/referrals/stats"] });
  const { data: referrals = [] } = useQuery({ queryKey: ["/api/referrals"] });

  const referralCode = (user as any)?.referralCode || "";
  const referralLink = user ? `https://sikatexte.com/register?ref=${referralCode}` : "";

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({ title: "✅ Lien copié", description: "Partagez-le avec vos amis !" });
    }
  };

  const shareReferralLink = () => {
    if (navigator.share && referralLink) {
      navigator.share({ title: "Rejoignez SIKA TEXTE", text: "Utilisez mon lien pour créer votre compte", url: referralLink });
    } else {
      copyReferralLink();
    }
  };

  const totalReferrals = (referralStats as any)?.totalReferrals || 0;
  const totalCommission = (referralStats as any)?.totalCommission || 0;

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f172a, #1e3a5f, #1a4fa0)" }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }} />
        <div className="px-4 pt-4 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:bg-white/20">
                <ChevronLeft size={20} className="text-white" />
              </div>
            </Link>
            <div>
              <h1 className="text-white font-black text-xl" data-testid="page-title">Mon Équipe</h1>
              <p className="text-blue-300 text-xs">Parrainez vos amis · Gagnez des commissions</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-blue-300" />
                <span className="text-blue-300 text-[10px] uppercase tracking-wider">Filleuls</span>
              </div>
              <p className="text-white font-black text-3xl" data-testid="text-total-referrals">{totalReferrals}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-green-400" />
                <span className="text-blue-300 text-[10px] uppercase tracking-wider">Commissions</span>
              </div>
              <p className="text-green-400 font-black text-xl" data-testid="text-total-commission">
                {formatFCFA(totalCommission)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">

        {/* Lien de parrainage */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f97316, #fb923c)" }}>
                <Gift size={15} className="text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Votre lien</p>
                <p className="text-gray-800 font-bold text-sm">Lien de parrainage</p>
              </div>
            </div>
          </div>

          <div className="px-5 pt-4 pb-5 space-y-3">
            {/* Code */}
            <div className="bg-gray-50 rounded-2xl px-4 py-3 border-2 border-dashed border-gray-200">
              <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5">Code</p>
              <p className="text-gray-800 font-black text-lg tracking-widest">{referralCode || "—"}</p>
            </div>

            {/* Lien complet */}
            <div className="bg-blue-50 rounded-xl px-3 py-2.5 border border-blue-100">
              <p className="text-blue-600 text-xs font-mono truncate"
                data-testid="input-referral-link">{referralLink}</p>
            </div>

            {/* Boutons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={copyReferralLink}
                data-testid="button-copy-link"
                className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff" }}
              >
                <Copy size={15} />
                Copier
              </button>
              <button
                onClick={shareReferralLink}
                data-testid="button-share-link"
                className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
                style={{ background: "linear-gradient(135deg, #059669, #047857)", color: "#fff" }}
              >
                <Share2 size={15} />
                Partager
              </button>
            </div>

            {/* Explication bonus */}
            <div className="bg-orange-50 rounded-2xl p-3 flex items-start gap-2">
              <span className="text-xl">💰</span>
              <div>
                <p className="text-orange-700 font-bold text-xs">Bonus de parrainage</p>
                <p className="text-orange-600 text-[11px] mt-0.5">
                  Gagnez une commission sur chaque filleul qui s'active. Invitez un maximum de personnes !
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des filleuls */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-gray-800 font-bold text-sm" data-testid="text-team-members-title">
                Mes filleuls
              </p>
              <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {(referrals as any[]).length}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {(referrals as any[]).length === 0 ? (
              <div className="px-5 py-10 text-center" data-testid="text-no-referrals">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users size={28} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-semibold text-sm">Aucun filleul pour l'instant</p>
                <p className="text-gray-400 text-xs mt-1">Partagez votre lien pour commencer</p>
              </div>
            ) : (
              (referrals as any[]).map((referral: any) => (
                <div key={referral.id} className="px-5 py-3.5 flex items-center gap-3"
                  data-testid={`referral-${referral.id}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                    <User size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 font-bold text-sm truncate"
                      data-testid={`text-referral-name-${referral.id}`}>
                      {referral.referredUser?.fullName || "Utilisateur"}
                    </p>
                    <p className="text-gray-400 text-xs"
                      data-testid={`text-referral-date-${referral.id}`}>
                      Rejoint le {new Date(referral.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-green-600 font-bold text-sm"
                      data-testid={`text-referral-commission-${referral.id}`}>
                      +{formatFCFA(parseFloat(referral.commission))}
                    </p>
                    <p className="text-gray-400 text-[10px]">Commission</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNavigation currentPage="team" />
    </div>
  );
}
