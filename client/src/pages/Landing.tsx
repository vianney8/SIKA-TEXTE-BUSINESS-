import { Link } from "wouter";
import { ArrowRight, CheckCircle, Users, Globe, Wallet } from "lucide-react";
import logoPath from "@assets/1764438802465_1773510898637.jpg";

const BENEFITS = [
  "Corrigez des phrases et gagnez",
  "Bonus quotidiens garantis",
  "Retrait Mobile Money rapide",
];

const STATS = [
  { icon: Users,  value: "10 000+",           label: "Membres actifs" },
  { icon: Globe,  value: "6 pays",             label: "Afrique de l'Ouest" },
  { icon: Wallet, value: "Automatique",        label: "Délai de retrait" },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">

      {/* ── En-tête sombre ── */}
      <div
        className="relative flex flex-col items-center justify-end px-6 pt-16 pb-12 flex-shrink-0"
        style={{
          background: "linear-gradient(145deg, hsl(216 31% 18%) 0%, hsl(174 73% 27%) 100%)",
          borderRadius: "0 0 42px 42px",
          minHeight: "52vh",
        }}
      >
        {/* Cercles décoratifs */}
        <div
          className="absolute top-8 right-8 w-28 h-28 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }}
        />
        <div
          className="absolute top-20 left-4 w-20 h-20 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }}
        />

        {/* Logo */}
        <div className="flex flex-col items-center mb-6 z-10">
          <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-xl ring-4 ring-white/20 mb-4">
            <img src={logoPath} alt="SIKA TEXTE" className="w-full h-full object-cover" />
          </div>
           <h1 className="text-white font-black text-3xl tracking-tight" data-testid="app-title">
            SIKA TEXTE
          </h1>
          <span
            className="text-xs font-bold uppercase tracking-[0.2em] mt-1 px-3 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
          >
            Business
          </span>
          <p className="text-blue-200 text-sm text-center mt-3 leading-relaxed max-w-[260px]">
            Gagnez de l'argent en corrigeant des textes, directement sur votre téléphone
          </p>
        </div>

        {/* Bénéfices */}
        <div className="w-full z-10 space-y-2.5 max-w-sm">
          {BENEFITS.map((b, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
              <span className="text-white/80 text-sm">{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Statistiques ── */}
       <div className="sika-shell max-w-5xl -mt-5 z-10 flex-shrink-0">
         <div className="sika-surface flex divide-x divide-border">
          {STATS.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center py-4 px-2">
               <s.icon size={18} className="text-primary mb-1" />
               <p className="text-foreground font-black text-base leading-tight">{s.value}</p>
               <p className="text-muted-foreground text-[10px] text-center">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Boutons CTA ── */}
       <div className="sika-shell max-w-5xl pb-10 space-y-3">
         <Link href="/register" data-testid="button-register"
           className="sika-button w-full py-4 rounded-2xl font-black text-base text-white shadow-lg flex items-center justify-center gap-2"
           style={{ background: "linear-gradient(135deg, hsl(174 73% 27%), hsl(201 65% 42%))" }}>
           Créer un compte <ArrowRight size={18} />
         </Link>

         <Link href="/simple-login" data-testid="button-login"
           className="sika-button w-full py-4 rounded-2xl font-bold text-base border-2 border-border bg-card text-foreground flex items-center justify-center gap-2">
           Se connecter <ArrowRight size={18} className="text-primary" />
         </Link>

        <p className="text-center text-gray-400 text-xs pt-1">
          Disponible en Afrique de l'Ouest · Sécurisé · Gratuit
        </p>
      </div>
    </div>
  );
}
