import { ChevronLeft, CheckCircle, Users, TrendingUp, Shield, Zap, Star, Gift } from "lucide-react";
import { Link } from "wouter";
import BottomNavigation from "@/components/BottomNavigation";

export default function Summary() {
  const steps = [
    { n: "1", text: "Activez votre compte avec un paiement Mobile Money" },
    { n: "2", text: "Corrigez jusqu'à 12 phrases par jour" },
    { n: "3", text: "Gagnez 650 FCFA par phrase correctement corrigée" },
    { n: "4", text: "Parrainez vos amis et touchez des commissions" },
    { n: "5", text: "Retirez vos gains via Mobile Money" },
  ];

  const earnings = [
    { label: "Par phrase corrigée",   value: "650 FCFA",    color: "#2563eb" },
    { label: "Par jour (12 phrases)", value: "7 800 FCFA",  color: "#059669" },
    { label: "Par mois (30 jours)",   value: "234 000 FCFA",color: "#7c3aed" },
  ];

  const features = [
    { icon: Shield,    title: "Plateforme sécurisée",   desc: "Vos données et transactions sont protégées",       color: "#2563eb" },
    { icon: Zap,       title: "Paiements instantanés",  desc: "Retirez vos gains rapidement sur Mobile Money",    color: "#f59e0b" },
    { icon: Gift,      title: "Système de parrainage",  desc: "Invitez des amis et gagnez des commissions",       color: "#7c3aed" },
    { icon: Star,      title: "Bonus quotidien",        desc: "Collectez votre bonus chaque jour",                color: "#059669" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f172a, #1e3a5f, #1a4fa0)" }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #fbbf24, transparent)" }} />
        <div className="px-4 pt-4 pb-6">
          <div className="flex items-center gap-3 mb-5">
            <Link href="/" data-testid="button-back">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:bg-white/20">
                <ChevronLeft size={20} className="text-white" />
              </div>
            </Link>
            <div>
              <h1 className="text-white font-black text-xl">À propos</h1>
              <p className="text-blue-300 text-xs">SIKA TEXTE BUSINESS</p>
            </div>
          </div>

          {/* Mission pill */}
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-2">Notre Mission</p>
            <p className="text-white text-sm leading-relaxed font-medium">
              SIKA TEXTE est une plateforme innovante qui lutte contre le chômage en Afrique.
              Nous offrons la possibilité de gagner un revenu quotidien en corrigeant des phrases.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">

        {/* Potentiel de gains */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #059669, #34d399)" }}>
                <TrendingUp size={15} className="text-white" />
              </div>
              <p className="text-gray-800 font-bold text-sm">Potentiel de gains</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {earnings.map((e, i) => (
              <div key={i} className="flex items-center justify-between">
                <p className="text-gray-600 text-sm">{e.label}</p>
                <p className="font-black text-sm" style={{ color: e.color }}>{e.value}</p>
              </div>
            ))}
            <div className="bg-green-50 border border-green-100 rounded-2xl p-3 mt-2">
              <p className="text-green-700 text-xs font-semibold text-center">
                Potentiel annuel : <span className="font-black text-green-600">2 808 000 FCFA</span>
              </p>
            </div>
          </div>
        </div>

        {/* Comment ça marche */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #2563eb, #60a5fa)" }}>
                <CheckCircle size={15} className="text-white" />
              </div>
              <p className="text-gray-800 font-bold text-sm">Comment ça fonctionne</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {steps.map((s) => (
              <div key={s.n} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)" }}>
                  <span className="text-white font-black text-xs">{s.n}</span>
                </div>
                <p className="text-gray-700 text-sm pt-1 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fonctionnalités */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <p className="text-gray-800 font-bold text-sm">Pourquoi nous choisir</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="rounded-2xl p-3" style={{ background: `${f.color}08` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                  style={{ background: `${f.color}18` }}>
                  <f.icon size={17} style={{ color: f.color }} />
                </div>
                <p className="text-gray-800 font-bold text-xs mb-0.5">{f.title}</p>
                <p className="text-gray-400 text-[10px] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Parrainage */}
        <div className="relative overflow-hidden rounded-[20px]"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="relative px-5 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Users size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Système de parrainage</p>
              <p className="text-purple-200 text-xs mt-0.5">
                Invitez des amis et gagnez une commission sur chaque activation
              </p>
              <Link href="/team">
                <span className="inline-block mt-2 text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full">
                  Voir mon équipe →
                </span>
              </Link>
            </div>
          </div>
        </div>

      </div>

      <BottomNavigation currentPage="summary" />
    </div>
  );
}
