import { useState } from "react";
import { X, Users, Bell } from "lucide-react";
import { useAppSetting } from "@/hooks/useAppSettings";
import { FaTelegram } from "react-icons/fa";

export default function WhatsAppNotification() {
  const [isVisible, setIsVisible] = useState(true);
  const { data: telegramGroup } = useAppSetting('telegram_group');

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: 'rgba(10,15,44,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#0e1335', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #0088cc)' }} />

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center">
          <button
            onClick={() => setIsVisible(false)}
            data-testid="button-close-notification"
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <X size={15} className="text-white/60" />
          </button>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0088cc, #006699)' }}>
            <FaTelegram className="text-white text-3xl" />
          </div>

          <h3 className="text-white font-bold text-lg mb-1">
            Rejoignez la communauté !
          </h3>
          <p className="text-white/50 text-sm leading-relaxed">
            Restez informé des dernières mises à jour et annonces importantes en temps réel.
          </p>
        </div>

        {/* Stats */}
        <div className="mx-6 mb-5 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.2)' }}>
            <Users size={15} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Groupe officiel</p>
            <p className="text-white/40 text-[11px]">Membres actifs • Mises à jour quotidiennes</p>
          </div>
          <div className="ml-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => {
              window.open(telegramGroup || 'https://t.me/+A1QL2HAVBkMyMDA0', '_blank');
              setIsVisible(false);
            }}
            data-testid="button-join-whatsapp"
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white text-sm transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0088cc, #006699)' }}
          >
            <FaTelegram className="text-lg" />
            Rejoindre le groupe Telegram
          </button>

          <button
            onClick={() => setIsVisible(false)}
            data-testid="button-ok-notification"
            className="w-full rounded-2xl py-3 text-sm font-medium transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
