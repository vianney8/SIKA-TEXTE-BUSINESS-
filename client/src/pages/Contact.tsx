import { useAuth } from "@/hooks/useAuth";
import { useAppSetting } from "@/hooks/useAppSettings";
import { ChevronLeft, Bot, Users, MessageCircle, ExternalLink } from "lucide-react";
import { FaTelegram, FaWhatsapp } from "react-icons/fa";
import { Link } from "wouter";

export default function Contact() {
  const { isAuthenticated } = useAuth();
  const { data: telegramSupervisor } = useAppSetting("telegram_supervisor");
  const { data: telegramGroup } = useAppSetting("telegram_group");
  const { data: whatsappGroup } = useAppSetting("whatsapp_group");

  if (!isAuthenticated) return null;

  const SUPPORT_OPTIONS = [
    {
      id: "online-group",
      icon: <Users className="w-6 h-6 text-white" />,
      gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
      badge: "En ligne",
      badgeColor: "#a855f7",
      title: "Groupe en ligne",
      description: "Rejoignez la communauté SIKA TEXTE et discutez en temps réel avec tous les membres de la plateforme.",
      action: "Rejoindre le groupe",
      href: "/community-group",
      external: false,
    },
    {
      id: "lylya",
      icon: <Bot className="w-6 h-6 text-white" />,
      gradient: "linear-gradient(135deg, #1a237e 0%, #1565c0 100%)",
      badge: "IA · 24h/24",
      badgeColor: "#22c55e",
      title: "Lylya — Superviseur IA",
      description: "Posez toutes vos questions à notre assistant intelligent. Disponible à tout moment, répond instantanément.",
      action: "Démarrer une conversation",
      href: "/assistance",
      external: false,
    },
    {
      id: "telegram-support",
      icon: <FaTelegram className="w-6 h-6 text-white" />,
      gradient: "linear-gradient(135deg, #0088cc 0%, #00a8e8 100%)",
      badge: "Support humain",
      badgeColor: "#0088cc",
      title: "Support Telegram",
      description: "Un agent humain disponible pour les cas urgents ou complexes. Délai de réponse sous 24h.",
      action: "Contacter le support",
      href: telegramSupervisor || "https://t.me/SIKAcustomer_service",
      external: true,
    },
    {
      id: "whatsapp-community",
      icon: <FaWhatsapp className="w-6 h-6 text-white" />,
      gradient: "linear-gradient(135deg, #128c7e 0%, #25d366 100%)",
      badge: "Communauté",
      badgeColor: "#25d366",
      title: "Groupe WhatsApp",
      description: "Rejoignez notre communauté WhatsApp pour les annonces, actualités et échanges entre membres.",
      action: "Rejoindre le groupe",
      href: whatsappGroup || "https://whatsapp.com/channel/0029VbC6vZ33bbV4eIeyXJ0T",
      external: true,
    },
    {
      id: "telegram-community",
      icon: <Users className="w-6 h-6 text-white" />,
      gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
      badge: "Communauté",
      badgeColor: "#a855f7",
      title: "Groupe Telegram",
      description: "La communauté officielle SIKA TEXTE sur Telegram. Restez informé des dernières nouvelles.",
      action: "Rejoindre la communauté",
      href: telegramGroup || "https://t.me/+A1QL2HAVBkMyMDA0",
      external: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4"
        style={{
          background: "linear-gradient(135deg, #1a237e 0%, #283593 40%, #1565c0 100%)",
          boxShadow: "0 2px 12px rgba(26,35,126,0.3)",
        }}
      >
        <Link href="/">
          <button className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors active:scale-95 flex-shrink-0">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-black text-base leading-none">Assistance & Contact</h1>
          <p className="text-blue-200 text-[11px] mt-0.5">Choisissez votre canal de support</p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">

        {/* Intro card */}
        <div
          className="rounded-2xl px-5 py-4"
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
            border: "1px solid #dbeafe",
          }}
        >
          <p className="text-slate-700 text-sm leading-relaxed">
            Besoin d'aide ? Choisissez le canal qui vous convient le mieux.
            Notre assistant IA <strong>Lylya</strong> répond instantanément à toutes vos questions.
          </p>
        </div>

        {/* Support cards */}
        {SUPPORT_OPTIONS.map((opt) => (
          opt.external ? (
            <a
              key={opt.id}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`card-contact-${opt.id}`}
              className="block"
            >
              <ContactCard opt={opt} />
            </a>
          ) : (
            <Link key={opt.id} href={opt.href} data-testid={`card-contact-${opt.id}`}>
              <ContactCard opt={opt} />
            </Link>
          )
        ))}

        {/* Footer note */}
        <p className="text-center text-[11px] text-slate-400 pt-2 pb-6">
          SIKA TEXTE BUSINESS · Service client disponible 7j/7
        </p>
      </div>
    </div>
  );
}

function ContactCard({ opt }: { opt: any }) {
  return (
    <div
      className="w-full flex items-start gap-4 px-4 py-4 rounded-2xl bg-white active:scale-[0.98] transition-all cursor-pointer"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #f1f5f9" }}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: opt.gradient }}
      >
        {opt.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-slate-800 font-bold text-sm">{opt.title}</span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${opt.badgeColor}18`, color: opt.badgeColor }}
          >
            {opt.badge}
          </span>
        </div>
        <p className="text-slate-500 text-[11px] leading-relaxed mb-2.5">{opt.description}</p>
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-semibold"
            style={{ color: "#1565c0" }}
          >
            {opt.action}
          </span>
          <ExternalLink className="w-3 h-3" style={{ color: "#1565c0" }} />
        </div>
      </div>
    </div>
  );
}
