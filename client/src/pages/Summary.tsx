import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  FileText,
  Globe2,
  Headphones,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import BottomNavigation from "@/components/BottomNavigation";
import logoPath from "@assets/1764438802465_1773510898637.jpg";

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Un cadre fiable",
    description: "Des règles claires, un suivi de votre compte et un accompagnement accessible.",
    color: "#2563eb",
    background: "#eff6ff",
  },
  {
    icon: WalletCards,
    title: "Des retraits encadrés",
    description: "Vos gains sont suivis dans votre espace avant un retrait via Mobile Money.",
    color: "#059669",
    background: "#ecfdf5",
  },
  {
    icon: Headphones,
    title: "Une équipe présente",
    description: "Une assistance IA et des canaux de contact pour répondre à vos questions.",
    color: "#7c3aed",
    background: "#f5f3ff",
  },
];

const collaborations = [
  {
    icon: Globe2,
    title: "Partenaires linguistiques",
    description: "Nous valorisons la qualité du français et les usages européens pour produire des phrases utiles et naturelles.",
    color: "#2563eb",
  },
  {
    icon: WalletCards,
    title: "Réseaux Mobile Money",
    description: "Les solutions de paiement mobile facilitent l’activation et le retrait des gains selon votre pays.",
    color: "#059669",
  },
  {
    icon: Users,
    title: "Communautés locales",
    description: "Les membres et les équipes de proximité contribuent à faire connaître le service et à partager les bonnes pratiques.",
    color: "#c2410c",
  },
];

const startRequirements = [
  {
    number: "01",
    title: "Un compte SIKA",
    description: "Créez votre compte avec des informations exactes et gardez vos accès personnels.",
  },
  {
    number: "02",
    title: "Un moyen de paiement",
    description: "Utilisez un numéro Mobile Money à votre nom pour les opérations liées à votre compte.",
  },
  {
    number: "03",
    title: "De la régularité",
    description: "Lisez attentivement chaque phrase, respectez les consignes et avancez avec sérieux.",
  },
];

const policyItems = [
  {
    icon: LockKeyhole,
    title: "Politique de confidentialité",
    content:
      "Nous limitons l’utilisation de vos informations aux besoins du compte, du service et de l’assistance. Ne partagez jamais votre mot de passe ni vos codes de validation.",
  },
  {
    icon: FileText,
    title: "Règles d’utilisation",
    content:
      "Chaque membre doit utiliser un compte personnel, fournir des informations exactes et respecter les consignes de correction. Les comportements frauduleux peuvent entraîner une restriction du compte.",
  },
  {
    icon: WalletCards,
    title: "Paiements et retraits",
    content:
      "Les montants et les conditions affichés dans la plateforme font foi. Vérifiez toujours le numéro de retrait avant de confirmer une opération et contactez l’assistance en cas de doute.",
  },
  {
    icon: MessageCircle,
    title: "Réclamations et assistance",
    content:
      "Pour une question ou une réclamation, utilisez l’assistance intégrée ou les canaux officiels de contact. Décrivez le problème sans transmettre de mot de passe ou de code secret.",
  },
];

export default function Summary() {
  return (
    <div className="sika-page bg-slate-50">
      {/* Hero institutionnel */}
      <header
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0b1730 0%, #123568 58%, #1d4ed8 100%)" }}
      >
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-300/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-14 h-52 w-52 rounded-full bg-violet-300/10 blur-2xl" />

        <div className="relative mx-auto max-w-2xl px-5 pb-7 pt-5">
          <div className="mb-8 flex items-center gap-3">
            <Link href="/" data-testid="button-back">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 transition-colors active:bg-white/20">
                <ChevronLeft size={20} className="text-white" />
              </div>
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <img src={logoPath} alt="SIKA TEXTE" className="h-9 w-9 rounded-xl object-cover ring-2 ring-white/20" />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">SIKA TEXTE BUSINESS</p>
                <h1 className="text-lg font-black leading-tight text-white">À propos de SIKA</h1>
              </div>
            </div>
            <div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-blue-100">
              Notre histoire
            </div>
          </div>

          <div className="max-w-xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300">Travailler · apprendre · progresser</p>
            <h2 className="text-[2rem] font-black leading-[1.05] tracking-tight text-white sm:text-4xl">
              Une plateforme utile, pensée pour avancer avec confiance.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-blue-100/85">
              SIKA TEXTE met en relation des membres, des outils numériques et un service de correction
              linguistique pour transformer des tâches simples en une expérience de travail structurée.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2">
            {[
              { value: "12", label: "phrases max./jour" },
              { value: "650 F", label: "par correction" },
              { value: "24/7", label: "accès plateforme" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/10 px-2.5 py-3 text-center backdrop-blur-sm">
                <p className="text-base font-black text-white">{stat.value}</p>
                <p className="mt-1 text-[9px] font-semibold leading-tight text-blue-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 pb-28 pt-5">
        {/* Mission */}
        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Sparkles size={17} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Notre mission</p>
              <h2 className="text-base font-black text-slate-800">Créer une expérience simple et responsable</h2>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Notre objectif est de proposer un espace clair où chaque membre comprend ce qu’il fait,
            suit ses résultats et peut être accompagné. La qualité du travail, la transparence des
            informations et le respect des membres sont au centre de SIKA TEXTE.
          </p>
        </section>

        {/* Service linguistique */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="bg-gradient-to-r from-violet-700 to-indigo-700 p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <Globe2 size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Notre service linguistique</p>
                <h2 className="mt-1 text-lg font-black">Correction de phrases européennes</h2>
                <p className="mt-2 text-xs leading-5 text-violet-100">
                  Une mission utile pour améliorer la qualité de contenus en français et dans des contextes européens.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {[
              { icon: CheckCircle2, title: "Lire avec attention", text: "Comprendre le sens avant de répondre." },
              { icon: Zap, title: "Corriger avec précision", text: "Repérer les fautes et proposer une phrase naturelle." },
              { icon: ShieldCheck, title: "Respecter la qualité", text: "Suivre les consignes pour garder un résultat fiable." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-slate-50 p-3.5">
                <item.icon size={17} className="mb-2 text-indigo-600" />
                <p className="text-xs font-black text-slate-800">{item.title}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fiabilité */}
        <section>
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pourquoi SIKA</p>
              <h2 className="text-lg font-black text-slate-800">La fiabilité au quotidien</h2>
            </div>
            <ShieldCheck size={21} className="text-blue-600" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {trustPoints.map((point) => (
              <div key={point.title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: point.background }}>
                  <point.icon size={17} style={{ color: point.color }} />
                </div>
                <h3 className="text-sm font-black text-slate-800">{point.title}</h3>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{point.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Collaborations */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Un écosystème ouvert</p>
              <h2 className="mt-1 text-lg font-black text-slate-800">Nos collaborations</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                SIKA avance grâce à plusieurs familles de partenaires et à sa communauté.
              </p>
            </div>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
              <Users size={19} className="text-emerald-600" />
            </div>
          </div>
          <div className="space-y-3">
            {collaborations.map((collaboration) => (
              <div key={collaboration.title} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ background: collaboration.color }}>
                  <collaboration.icon size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">{collaboration.title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{collaboration.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3 conditions */}
        <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Pour bien commencer</p>
            <h2 className="mt-1 text-lg font-black">Les 3 éléments essentiels</h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">Un parcours sérieux commence par des bases simples.</p>
          </div>
          <div className="space-y-4">
            {startRequirements.map((item) => (
              <div key={item.number} className="flex items-start gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-[10px] font-black">{item.number}</span>
                <div>
                  <h3 className="text-sm font-black">{item.title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-slate-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Premium */}
        <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-200/30 blur-xl" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500">
                <Sparkles size={17} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Évolution de la plateforme</p>
                <h2 className="text-lg font-black text-slate-800">Pourquoi une offre Premium ?</h2>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              L’accès essentiel reste le point de départ. Une offre Premium peut répondre aux membres
              qui souhaitent davantage d’accompagnement et de possibilités, sans être une condition
              pour comprendre le service ou utiliser le parcours de base.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {["Plus de possibilités", "Accompagnement prioritaire", "Ressources exclusives"].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 rounded-xl border border-amber-100 bg-white/80 px-3 py-2.5">
                  <CheckCircle2 size={14} className="flex-shrink-0 text-amber-600" />
                  <span className="text-[11px] font-bold text-slate-700">{benefit}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-4 text-slate-400">
              Les prix, conditions et avantages applicables doivent toujours être affichés clairement avant toute activation.
            </p>
          </div>
        </section>

        {/* Politiques */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <FileText size={17} className="text-slate-700" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">À lire avant d’utiliser SIKA</p>
              <h2 className="text-lg font-black text-slate-800">Politiques et engagements</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {policyItems.map((item) => (
              <details key={item.title} className="group py-3 first:pt-1 last:pb-1">
                <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
                  <item.icon size={16} className="flex-shrink-0 text-slate-400" />
                  <span className="flex-1">{item.title}</span>
                  <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="ml-7 mt-2 pr-3 text-[11px] leading-5 text-slate-500">{item.content}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA aide */}
        <section className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <MessageCircle size={19} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-black">Une question sur le fonctionnement ?</h2>
              <p className="mt-1 text-[11px] text-blue-100">Notre équipe est disponible pour vous orienter.</p>
            </div>
            <Link href="/contact" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-700" aria-label="Contacter l'assistance">
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>

        <p className="px-3 text-center text-[10px] leading-4 text-slate-400">
          SIKA TEXTE BUSINESS · Une plateforme conçue pour travailler avec clarté, respect et responsabilité.
        </p>
      </main>

      <BottomNavigation currentPage="summary" />
    </div>
  );
}