import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useAppSetting } from "@/hooks/useAppSettings";
import {
  Send, Loader2, ChevronLeft, Trash2, RotateCcw,
  Wallet, Shield, ArrowDownToLine, Users, Zap, Star,
  CreditCard, ShieldCheck, Download,
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Link } from "wouter";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { icon: Wallet,          label: "Mon solde",        text: "Quel est mon solde actuel ?" },
  { icon: Shield,          label: "Activation",       text: "Comment activer mon compte ?" },
  { icon: ArrowDownToLine, label: "Retrait",          text: "Comment faire un retrait ?" },
  { icon: Users,           label: "Parrainage",       text: "Comment parrainer quelqu'un ?" },
  { icon: Zap,             label: "Transfert",        text: "Comment faire un transfert ?" },
  { icon: Star,            label: "Bonus",            text: "Comment gagner des bonus ?" },
  { icon: CreditCard,      label: "Code PCS",         text: "Comment configurer mon code PCS ?" },
  { icon: ShieldCheck,     label: "Compte activé ?",  text: "Mon compte est-il activé ?" },
];

function renderText(raw: string) {
  const html = raw
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const WELCOME: Message = {
  role: "assistant",
  text: "Bonjour 👋 Je suis le **Superviseur IA officiel de SPay / SIKA TEXTE**.\n\nJe connais entièrement la plateforme : activations, retraits, transferts, parrainage, codes PCS, bonus et bien plus.\n\nComment puis-je vous aider ?",
  timestamp: new Date(),
};

export default function Assistance() {
  const { isAuthenticated } = useAuth();
  const { data: telegramUrl } = useAppSetting("telegram_supervisor");

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [showSugg, setShowSugg] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => {
      const history = messages.slice(-14).map((m) => ({ role: m.role, text: m.text }));
      const res = await apiRequest("POST", "/api/ai-chat", { message: msg, history });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages((p) => [...p, {
        role: "assistant",
        text: data.reply || "Désolé, je n'ai pas pu répondre. Réessayez.",
        timestamp: new Date(),
      }]);
    },
    onError: () => {
      setMessages((p) => [...p, {
        role: "assistant",
        text: "❌ Une erreur s'est produite. Vérifiez votre connexion et réessayez.",
        timestamp: new Date(),
      }]);
    },
  });

  const send = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || chatMutation.isPending) return;
    setInput("");
    setShowSugg(false);
    setMessages((p) => [...p, { role: "user", text: msg, timestamp: new Date() }]);
    chatMutation.mutate(msg);
  };

  const reset = () => {
    setMessages([{ ...WELCOME, timestamp: new Date() }]);
    setShowSugg(true);
    setInput("");
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "#0f1117" }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 z-20"
        style={{
          background: "linear-gradient(135deg, #0d1b4b 0%, #1a237e 50%, #1565c0 100%)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/">
          <button className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-90 flex-shrink-0">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </Link>

        {/* Avatar + titre */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3949ab, #42a5f5)", boxShadow: "0 0 0 2px rgba(255,255,255,0.15)" }}
            >
              <span className="text-white font-black text-sm">SI</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1a237e]" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-none truncate">Superviseur IA</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-[10px] font-medium">En ligne · SPay / SIKA TEXTE</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => window.open(telegramUrl || "https://t.me/SIKAcustomer_service", "_blank", "noopener,noreferrer")}
            data-testid="button-telegram-contact"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
            title="Support Telegram"
          >
            <FaTelegram className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={reset}
            data-testid="button-clear-chat"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
            title="Nouvelle conversation"
          >
            <RotateCcw className="w-4 h-4 text-white" />
          </button>
        </div>
      </header>

      {/* ── ZONE DE MESSAGES ────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-5" style={{ background: "#0f1117" }}>

        {/* Bannière info */}
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3 mx-auto max-w-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-[11px] text-slate-400">Conversation sécurisée · Données personnelles protégées · 24h/24</p>
        </div>

        {/* Messages */}
        <div className="space-y-4 max-w-lg mx-auto w-full">
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>

                {/* Avatar */}
                {!isUser && (
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg"
                    style={{ background: "linear-gradient(135deg, #3949ab, #42a5f5)" }}
                  >
                    <span className="text-white font-black text-[10px]">SI</span>
                  </div>
                )}
                {isUser && (
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg"
                    style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)" }}
                  >
                    <span className="text-white font-black text-[10px]">Moi</span>
                  </div>
                )}

                {/* Bulle */}
                <div className={`flex flex-col gap-1 max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
                  <div
                    className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                    style={isUser ? {
                      background: "linear-gradient(135deg, #1e40af, #1a237e)",
                      color: "#fff",
                      borderRadius: "18px 18px 4px 18px",
                      boxShadow: "0 4px 15px rgba(30,64,175,0.3)",
                    } : {
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#e2e8f0",
                      borderRadius: "18px 18px 18px 4px",
                    }}
                  >
                    {renderText(msg.text)}
                  </div>
                  <span className="text-[10px] text-slate-600 px-1">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {chatMutation.isPending && (
            <div className="flex items-end gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #3949ab, #42a5f5)" }}
              >
                <span className="text-white font-black text-[10px]">SI</span>
              </div>
              <div
                className="px-5 py-4 rounded-2xl flex items-center gap-1.5"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "18px 18px 18px 4px",
                }}
              >
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: "#42a5f5", animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Suggestions — affichées dans le fil de chat */}
        {showSugg && messages.length === 1 && (
          <div className="max-w-lg mx-auto w-full pt-2 pb-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">
              Questions fréquentes
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map(({ icon: Icon, label, text }) => (
                <button
                  key={label}
                  onClick={() => send(text)}
                  disabled={chatMutation.isPending}
                  data-testid={`button-suggestion-${label}`}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-left text-xs font-medium transition-all active:scale-95 disabled:opacity-40 group"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "#94a3b8",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(66,165,245,0.12)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(66,165,245,0.3)";
                    (e.currentTarget as HTMLElement).style.color = "#93c5fd";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.09)";
                    (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="leading-tight">{label}</span>
                </button>
              ))}
            </div>

            {/* Carte Telegram dans les suggestions */}
            <button
              onClick={() => window.open(telegramUrl || "https://t.me/SIKAcustomer_service", "_blank", "noopener,noreferrer")}
              className="w-full mt-3 flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, rgba(0,136,204,0.15), rgba(0,168,232,0.08))",
                border: "1px solid rgba(0,136,204,0.25)",
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #0088cc, #00a8e8)" }}>
                <FaTelegram className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-300">Support humain Telegram</p>
                <p className="text-[11px] text-slate-500">Pour les cas urgents ou complexes</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-slate-500 rotate-180" />
            </button>

            <button
              onClick={() => window.open("https://play.google.com/store/apps/details?id=org.telegram.messenger", "_blank", "noopener,noreferrer")}
              data-testid="button-download-telegram"
              className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-[0.98]"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-400">Pas encore Telegram ?</p>
                <p className="text-[11px] text-slate-600">Télécharger gratuitement</p>
              </div>
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ── BARRE DE SAISIE ──────────────────────────────────── */}
      <footer
        className="flex-shrink-0 px-4 py-3 z-20"
        style={{
          background: "#0f1117",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="max-w-lg mx-auto flex items-end gap-2">
          <div
            className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-2.5"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <textarea
              ref={inputRef}
              data-testid="input-ai-chat-message"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Posez votre question au Superviseur IA…"
              disabled={chatMutation.isPending}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none disabled:opacity-50"
              style={{ minHeight: "22px", maxHeight: "120px" }}
            />
          </div>
          <button
            data-testid="button-ai-chat-send"
            onClick={() => send()}
            disabled={!input.trim() || chatMutation.isPending}
            className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-90 flex-shrink-0 shadow-xl"
            style={{ background: "linear-gradient(135deg, #1565c0, #1a237e)" }}
          >
            {chatMutation.isPending
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : <Send className="w-5 h-5 text-white" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-700 mt-2">
          Superviseur IA · SPay / SIKA TEXTE BUSINESS
        </p>
      </footer>

      <style>{`
        main::-webkit-scrollbar { width: 0; }
        textarea::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  );
}
