import { useState } from "react";
import { Users, Share2, Gift, Copy, Check, ChevronLeft, TrendingUp, UserCheck } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNavigation from "@/components/BottomNavigation";
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

  const referralLink = referralData?.referralCode
    ? `https://sikatexte.site/register?ref=${referralData.referralCode}`
    : "";

  const copyReferralCode = async () => {
    if (!referralData?.referralCode) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "✅ Lien copié !", description: "Partagez-le avec vos amis" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier", variant: "destructive" });
    }
  };

  const shareReferralCode = async () => {
    if (!referralData?.referralCode) return;
    const shareText = `Rejoignez SIKA TEXTE et gagnez de l'argent ! Mon lien : ${referralLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SIKA TEXTE', text: shareText });
      } catch { copyReferralCode(); }
    } else {
      copyReferralCode();
    }
  };

  const total   = referralData?.totalReferrals || 0;
  const active  = referralData?.activeReferrals || 0;
  const comm    = referralData?.totalCommission || 0;
  const monthly = referralData?.monthlyCommission || 0;

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* Header premium */}
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
              <h1 className="text-white font-black text-xl">Mon Équipe</h1>
              <p className="text-blue-300 text-xs">Parrainez · Gagnez 20% de commission</p>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={12} className="text-blue-300" />
                <span className="text-blue-300 text-[10px] uppercase tracking-wider">Parrainés</span>
              </div>
              <p className="text-white font-black text-3xl">{total}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <UserCheck size={12} className="text-green-400" />
                <span className="text-blue-300 text-[10px] uppercase tracking-wider">Actifs</span>
              </div>
              <p className="text-green-400 font-black text-3xl">{active}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">

        {/* Commissions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative overflow-hidden rounded-[18px] p-4"
            style={{ background: "linear-gradient(135deg, #059669, #34d399)" }}>
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <TrendingUp size={18} className="text-white mb-2" />
            <p className="text-green-100 text-[10px] uppercase tracking-wider">Total commissions</p>
            <p className="text-white font-black text-lg">{comm} <span className="text-sm font-semibold">FCFA</span></p>
          </div>
          <div className="relative overflow-hidden rounded-[18px] p-4"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <Gift size={18} className="text-white mb-2" />
            <p className="text-purple-200 text-[10px] uppercase tracking-wider">Ce mois</p>
            <p className="text-white font-black text-lg">{monthly} <span className="text-sm font-semibold">FCFA</span></p>
          </div>
        </div>

        {/* Lien de parrainage */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f97316, #fb923c)" }}>
                <Share2 size={15} className="text-white" />
              </div>
              <p className="text-gray-800 font-bold text-sm">Mon lien de parrainage</p>
            </div>
          </div>

          <div className="px-5 pt-4 pb-5 space-y-3">
            {/* Code */}
            <div className="bg-gray-50 rounded-2xl px-4 py-3 border-2 border-dashed border-gray-200">
              <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5">Code</p>
              <p className="text-gray-800 font-black text-lg tracking-widest">
                {referralData?.referralCode || "—"}
              </p>
            </div>

            {/* Lien complet */}
            <div className="bg-blue-50 rounded-xl px-3 py-2.5 border border-blue-100">
              <p className="text-blue-500 text-xs font-mono break-all"
                data-testid="button-copy-referral-link">
                {referralLink || "Chargement..."}
              </p>
            </div>

            {/* Boutons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={copyReferralCode}
                data-testid="button-copy-referral"
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
                style={{ background: copied ? "linear-gradient(135deg,#059669,#34d399)" : "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff" }}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copié !" : "Copier"}
              </button>
              <button
                onClick={shareReferralCode}
                data-testid="button-share-referral"
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
                style={{ background: "linear-gradient(135deg,#059669,#047857)", color: "#fff" }}>
                <Share2 size={15} />
                Partager
              </button>
            </div>

            {/* Info bonus */}
            <div className="bg-amber-50 rounded-2xl p-3 flex items-start gap-2 border border-amber-100">
              <span className="text-xl flex-shrink-0">💰</span>
              <p className="text-amber-700 text-xs font-medium leading-relaxed">
                Gagnez <strong>20%</strong> de commission sur chaque activation de compte parrainé.
                Plus vous parrainez, plus vous gagnez !
              </p>
            </div>
          </div>
        </div>


      </div>
      <BottomNavigation currentPage="team" />
    </div>
  );
}
