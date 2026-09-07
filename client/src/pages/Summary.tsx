import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Headphones,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import BottomNavigation from "@/components/BottomNavigation";
import logoPath from "@assets/1764438802465_1773510898637.jpg";

const steps = [
  {
    number: "1",
    icon: MessageSquareText,
    title: "Corrigez des phrases",
    description: "Lisez chaque phrase et proposez une correction claire en respectant les consignes.",
  },
  {
    number: "2",
    icon: CheckCircle2,
    title: "Suivez votre progression",
    description: "Vos activités et vos gains sont affichés directement dans votre espace personnel.",
  },
  {
    number: "3",
    icon: CircleDollarSign,
    title: "Retirez vos gains",
    description: "Demandez un retrait vers votre numéro Mobile Money lorsque les conditions sont remplies.",
  },
];

const guarantees = [
  {
    icon: ShieldCheck,
    title: "Compte personnel",
    description: "Vos accès et vos informations restent strictement personnels.",
  },
  {
    icon: Sparkles,
    title: "Règles claires",
    description: "Les montants et les conditions sont affichés avant chaque opération.",
  },
  {
    icon: Headphones,
    title: "Assistance disponible",
    description: "Une équipe peut vous orienter lorsque vous rencontrez une difficulté.",
  },
];

export default function Summary() {
  return (
    <div className="sika-page min-h-screen bg-[#f4f7fb]">
      <header className="bg-gradient-to-br from-[#10234a] via-[#123b79] to-[#1766c2] text-white">
        <div className="mx-auto max-w-2xl px-5 pb-10 pt-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              data-testid="button-back"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 active:bg-white/20"
              aria-label="Retour à l’accueil"
            >
              <ChevronLeft size={20} />
            </Link>
            <img
              src={logoPath}
              alt="SIKA TEXTE"
              className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/20"
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
                SIKA TEXTE BUSINESS
              </p>
              <h1 className="text-lg font-black">À propos</h1>
            </div>
          </div>

          <div className="mt-9 max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
              Simple et accessible
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Travaillez sur des textes et suivez vos gains.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-blue-100">
              SIKA TEXTE est une plateforme de correction de phrases conçue pour vous offrir un
              parcours clair, depuis la réalisation des tâches jusqu’au retrait de vos gains.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pb-28 pt-6">
        <section>
          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-blue-600">
            Comment ça marche ?
          </p>
          <h2 className="mt-1 px-1 text-xl font-black text-slate-900">
            Un parcours en trois étapes
          </h2>

          <div className="mt-4 space-y-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <step.icon size={21} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                      Étape {step.number}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-black text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-600">
            L’essentiel
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-900">
            Une utilisation claire et responsable
          </h2>

          <div className="mt-5 space-y-4">
            {guarantees.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <item.icon size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600">
              <Headphones size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black">Besoin d’aide ?</h2>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Contactez l’assistance depuis l’application.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-slate-900 active:bg-slate-100"
          >
            Contacter l’assistance
            <ArrowRight size={17} />
          </Link>
        </section>

        <p className="px-4 text-center text-[10px] leading-4 text-slate-400">
          SIKA TEXTE BUSINESS · Travail, clarté et responsabilité.
        </p>
      </main>

      <BottomNavigation currentPage="summary" />
    </div>
  );
}