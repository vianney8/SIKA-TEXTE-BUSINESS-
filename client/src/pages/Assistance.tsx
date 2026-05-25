import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useAppSetting } from "@/hooks/useAppSettings";
import PageHeader from "@/components/PageHeader";
import {
  Send, Bot, Trash2, Loader2, Sparkles, ChevronDown,
  Download, Shield, Zap, MessageSquare, HelpCircle,
  CreditCard, Users, ArrowUpDown, Wallet, Star
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { icon: Wallet, text: "Quel est mon solde ?" },
  { icon: Shield, text: "Mon compte est-il activé ?" },
  { icon: ArrowUpDown, text: "Comment faire un retrait ?" },
  { icon: Users, text: "Comment parrainer quelqu'un ?" },
  { icon: CreditCard, text: "Comment recharger mon compte ?" },
  { icon: Zap, text: "Comment faire un transfert ?" },
  { icon: Star, text: "Comment gagner des bonus ?" },
  { icon: HelpCircle, text: "J'ai un problème avec mon compte" },
];

function formatText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function Assistance() {
  const { isAuthenticated } = useAuth();
  const { data: telegramSupport } = useAppSetting("telegram_supervisor");
  const { data: instagramEnabledData } = useAppSetting("instagram_supervisor_enabled");
  const { data: instagramHandle } = useAppSetting("instagram_supervisor");

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Bonjour ! 👋 Je suis **l'Assistant Officiel de SPay / SIKA TEXTE BUSINESS**.\n\nJe connais entièrement la plateforme : activations, dépôts, retraits, transferts, parrainage, bonus, PCS et bien plus encore.\n\nComment puis-je vous aider aujourd'hui ?",
      timestamp: new Date(),
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => {
      const history = messages.slice(-12).map((m) => ({ role: m.role, text: m.text }));
      const res = await apiRequest("POST", "/api/ai-chat", { message: msg, history });
      return res.json();
    },
    onSuccess: (data) => {
      const reply = data.reply || "Désolé, je n'ai pas pu répondre. Réessayez.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply, timestamp: new Date() }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "❌ Une erreur s'est produite. Vérifiez votre connexion et réessayez.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const sendMessage = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || chatMutation.isPending) return;
    setInput("");
    setShowSuggestions(false);
    setMessages((prev) => [...prev, { role: "user", text: msg, timestamp: new Date() }]);
    chatMutation.mutate(msg);
  };

  const clearHistory = () => {
    setMessages([
      {
        role: "assistant",
        text: "Conversation réinitialisée. 😊 Comment puis-je vous aider ?",
        timestamp: new Date(),
      },
    ]);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Connexion requise pour accéder à l'assistance.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8f9ff 40%, #fdf4ff 100%)" }}>
      <PageHeader title="Assistant IA" backHref="/" />

      {/* Hero animé */}
      <div className="relative overflow-hidden px-4 pt-4 pb-6">
        <div className="relative z-10 text-center">
          {/* Avatar IA animé */}
          <div className="relative inline-block mb-3">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #1a237e 0%, #283593 40%, #1565c0 100%)",
                animation: "pulseGlow 3s ease-in-out infinite",
              }}
            >
              <Bot className="w-10 h-10 text-white" />
            </div>
            {/* Badge en ligne */}
            <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              En ligne
            </div>
          </div>

          <h1 className="text-xl font-bold text-slate-800 mb-1">Assistant Officiel SPay / SIKA</h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Intelligent • Disponible 24h/24 • Répond en quelques secondes
          </p>

          {/* Badges de fonctionnalités */}
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {["Activations", "Retraits", "Dépôts", "Parrainage", "PCS", "Bonus"].map((feat) => (
              <span
                key={feat}
                className="text-xs px-2.5 py-1 rounded-full font-medium text-blue-700 border border-blue-200"
                style={{ background: "rgba(59, 130, 246, 0.08)" }}
              >
                {feat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Zone de chat principale */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-3 pb-6 gap-3" style={{ minHeight: 0 }}>
        {/* Boîte de messages */}
        <div
          className="flex-1 rounded-3xl shadow-xl overflow-hidden flex flex-col border border-white/80"
          style={{
            background: "white",
            minHeight: "400px",
            maxHeight: "calc(100vh - 420px)",
          }}
        >
          {/* En-tête chat */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1a237e 0%, #283593 40%, #1565c0 100%)" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Conversation avec l'IA</p>
                <p className="text-blue-200 text-xs">Réponse instantanée</p>
              </div>
            </div>
            <button
              onClick={clearHistory}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
              title="Nouvelle conversation"
              data-testid="button-clear-chat"
            >
              <Trash2 className="w-4 h-4 text-white/80" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ background: "linear-gradient(180deg, #f8faff 0%, #ffffff 100%)" }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2.5`}>
                {msg.role === "assistant" && (
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5 shadow-md"
                    style={{ background: "linear-gradient(135deg, #1a237e, #1565c0)" }}
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "text-white rounded-tr-sm"
                        : "bg-white text-gray-800 rounded-tl-sm border border-slate-100"
                    }`}
                    style={
                      msg.role === "user"
                        ? { background: "linear-gradient(135deg, #1565c0, #1a237e)" }
                        : {}
                    }
                    dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                  />
                  <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.timestamp)}</span>
                </div>
                {msg.role === "user" && (
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5 shadow-md"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                  >
                    <span className="text-white text-xs font-bold">Moi</span>
                  </div>
                )}
              </div>
            ))}

            {/* Loader */}
            {chatMutation.isPending && (
              <div className="flex justify-start gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md"
                  style={{ background: "linear-gradient(135deg, #1a237e, #1565c0)" }}
                >
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-slate-100 shadow-sm px-5 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#1565c0", animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#283593", animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#1a237e", animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Zone de saisie */}
          <div className="border-t border-slate-100 px-3 py-3 bg-white flex items-end gap-2 flex-shrink-0">
            <textarea
              ref={inputRef}
              data-testid="input-ai-chat-message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question…"
              disabled={chatMutation.isPending}
              rows={1}
              className="flex-1 resize-none bg-slate-50 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60 transition-all border border-slate-200 max-h-28 overflow-auto"
              style={{ minHeight: "42px" }}
            />
            <button
              data-testid="button-ai-chat-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || chatMutation.isPending}
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex-shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg, #1565c0, #1a237e)" }}
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Suggestions rapides */}
        {showSuggestions && (
          <div className="rounded-3xl border border-white/80 shadow-lg p-4 bg-white/90">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Questions fréquentes
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => sendMessage(text)}
                  disabled={chatMutation.isPending}
                  data-testid={`button-suggestion-${text.slice(0, 10)}`}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-blue-700 border border-blue-100 hover:bg-blue-50 hover:border-blue-300 transition-all disabled:opacity-50 active:scale-95 group"
                  style={{ background: "rgba(59, 130, 246, 0.04)" }}
                >
                  <Icon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="leading-tight">{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Carte Telegram */}
        <div
          className="rounded-3xl p-4 border border-blue-100 shadow-md"
          style={{ background: "linear-gradient(135deg, #e8f0fe 0%, #e3f2fd 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ background: "linear-gradient(135deg, #0088cc, #00a8e8)" }}>
              <FaTelegram className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">Support humain Telegram</p>
              <p className="text-xs text-slate-500">Pour les cas urgents ou complexes</p>
            </div>
            <button
              onClick={() => window.open(telegramSupport || "https://t.me/SIKAcustomer_service", "_blank", "noopener,noreferrer")}
              data-testid="button-telegram-contact"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-all hover:scale-105 active:scale-95 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #0088cc, #00a8e8)" }}
            >
              Contacter
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>
        </div>

        {/* Carte Télécharger Telegram */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-md p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #e0f2fe, #bae6fd)" }}>
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">Pas encore Telegram ?</p>
            <p className="text-xs text-slate-500">Téléchargez gratuitement</p>
          </div>
          <button
            onClick={() => window.open("https://play.google.com/store/apps/details?id=org.telegram.messenger", "_blank", "noopener,noreferrer")}
            data-testid="button-download-telegram"
            className="text-xs px-3 py-2 rounded-xl font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors flex-shrink-0"
          >
            Installer
          </button>
        </div>

        {/* Note de bas de page */}
        <div className="text-center pb-2">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Conversation sécurisée • Données personnelles protégées
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(21, 101, 192, 0.4), 0 8px 32px rgba(26, 35, 126, 0.3); }
          50% { box-shadow: 0 0 35px rgba(21, 101, 192, 0.7), 0 8px 40px rgba(26, 35, 126, 0.5); }
        }
      `}</style>
    </div>
  );
}
