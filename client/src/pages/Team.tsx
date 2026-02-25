import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Users, Copy, Share2, User, TrendingUp, ArrowLeft, Gift } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { formatFCFA } from "@/lib/utils";
import { Link } from "wouter";

export default function Team() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: referralStats } = useQuery({ queryKey: ["/api/referrals/stats"] });
  const { data: referrals = [] } = useQuery({ queryKey: ["/api/referrals"] });

  const referralCode = (user as any)?.referralCode || "—";
  const referralLink = user ? `https://sikatexte.site/register?ref=${referralCode}` : "";

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({ title: "Lien copié !", description: "Partagez-le pour gagner des commissions" });
    }
  };

  const shareReferralLink = () => {
    if (navigator.share && referralLink) {
      navigator.share({ title: "Rejoignez SIKA TEXTE BUSINESS", text: "Utilisez mon lien de parrainage", url: referralLink });
    } else {
      copyReferralLink();
    }
  };

  const totalReferrals = (referralStats as any)?.totalReferrals || 0;
  const totalCommission = (referralStats as any)?.totalCommission || 0;

  return (
    <div className="min-h-screen pb-24" style={{ background: "#f0f4ff" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0a0f2c 0%, #1a1f5e 100%)" }}>
        <div className="px-4 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <ArrowLeft size={18} className="text-white" />
              </div>
            </Link>
            <h1 className="text-white font-bold text-lg" data-testid="page-title">Mon équipe</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Users size={13} style={{ color: "#818cf8" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#818cf8" }}>Parrainages</span>
              </div>
              <p className="text-white font-black text-3xl" data-testid="text-total-referrals">{totalReferrals}</p>
              <p className="text-white/40 text-[11px] mt-1">membres recrutés</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={13} style={{ color: "#34d399" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#34d399" }}>Commissions</span>
              </div>
              <p className="text-white font-black text-xl" data-testid="text-total-commission">
                {formatFCFA(totalCommission)}
              </p>
              <p className="text-white/40 text-[11px] mt-1">gains totaux</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Referral Code */}
        <div className="rounded-2xl p-5 shadow-sm" style={{ background: "white" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
              <Gift size={15} style={{ color: "#6366f1" }} />
            </div>
            <h2 className="font-bold text-slate-800 text-sm">Votre lien de parrainage</h2>
          </div>

          {/* Code badge */}
          <div className="rounded-xl p-3 mb-4 flex items-center justify-between"
            style={{ background: "rgba(99,102,241,0.06)", border: "1.5px dashed rgba(99,102,241,0.25)" }}>
            <div>
              <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wider">Code de parrainage</p>
              <p className="font-black text-indigo-600 text-lg tracking-widest">{referralCode}</p>
            </div>
            <button onClick={copyReferralLink}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{ background: "#6366f1" }} data-testid="button-copy-link">
              <Copy size={15} className="text-white" />
            </button>
          </div>

          {/* Full link */}
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2"
            style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <p className="text-slate-500 text-xs flex-1 truncate" data-testid="input-referral-link">{referralLink}</p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={copyReferralLink}
              className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95"
              style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }} data-testid="button-copy-link">
              <Copy size={15} />
              Copier
            </button>
            <button onClick={shareReferralLink}
              className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }} data-testid="button-share-link">
              <Share2 size={15} />
              Partager
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl p-5 shadow-sm" style={{ background: "white" }}>
          <h3 className="font-bold text-slate-800 text-sm mb-4">Comment ça marche</h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "Partagez votre code ou lien unique", color: "#6366f1" },
              { step: "2", text: "Votre filleul s'inscrit et active son compte", color: "#f59e0b" },
              { step: "3", text: "Vous recevez une commission automatiquement", color: "#10b981" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-black"
                  style={{ background: item.color }}>
                  {item.step}
                </div>
                <p className="text-slate-600 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Members */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "white" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <h3 className="font-bold text-slate-800 text-sm" data-testid="text-team-members-title">
              Mes filleuls ({(referrals as any[]).length})
            </h3>
          </div>

          {(referrals as any[]).length === 0 ? (
            <div className="p-10 text-center" data-testid="text-no-referrals">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "rgba(99,102,241,0.08)" }}>
                <Users size={24} style={{ color: "#6366f1" }} />
              </div>
              <p className="text-slate-500 font-medium text-sm">Aucun filleul pour le moment</p>
              <p className="text-slate-400 text-xs mt-1">Partagez votre lien pour commencer</p>
            </div>
          ) : (
            <div>
              {(referrals as any[]).map((referral: any, i: number) => (
                <div key={referral.id}
                  className={`flex items-center gap-3 px-5 py-4 ${i < (referrals as any[]).length - 1 ? "border-b" : ""}`}
                  style={{ borderColor: "#f1f5f9" }}
                  data-testid={`referral-${referral.id}`}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(99,102,241,0.1)" }}>
                    <User size={16} style={{ color: "#6366f1" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-semibold text-sm" data-testid={`text-referral-name-${referral.id}`}>
                      {referral.referredUser?.fullName || "Utilisateur"}
                    </p>
                    <p className="text-slate-400 text-[11px]" data-testid={`text-referral-date-${referral.id}`}>
                      Rejoint le {new Date(referral.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-600 font-bold text-sm" data-testid={`text-referral-commission-${referral.id}`}>
                      +{formatFCFA(parseFloat(referral.commission))}
                    </p>
                    <p className="text-slate-400 text-[10px]">Commission</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation currentPage="team" />
    </div>
  );
}
