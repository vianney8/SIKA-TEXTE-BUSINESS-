import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { X, Send, Bot, Minimize2, Maximize2, Trash2, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "Quel est mon solde ?",
  "Mon compte est-il activé ?",
  "Comment faire un retrait ?",
  "Comment parrainer quelqu'un ?",
];

export default function AiChatBot() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Bonjour ! 👋 Je suis l'assistant officiel de **SIKA TEXTE BUSINESS**.\n\nJe peux vous aider avec votre compte, vos transactions, les activations, retraits, dépôts et plus encore.\n\nComment puis-je vous aider ?",
      timestamp: new Date(),
    },
  ]);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => {
      const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
      const res = await apiRequest("POST", "/api/ai-chat", { message: msg, history });
      if (!res.ok) {
        let errCode = "unknown";
        try { const b = await res.json(); errCode = b?.error || errCode; } catch (_) {}
        throw new Error(errCode);
      }
      return res.json();
    },
    onSuccess: (data) => {
      const reply = data.reply || "Désolé, je n'ai pas pu répondre. Réessayez.";
      const newMsg: Message = { role: "assistant", text: reply, timestamp: new Date() };
      setMessages((prev) => [...prev, newMsg]);
      if (!open) setUnread((n) => n + 1);
    },
    onError: (err: any) => {
      const code = err?.message || "";
      let text: string;
      if (code === "quota_exceeded") {
        text = "Je suis très sollicitée en ce moment 😊 Patientez quelques secondes, puis renvoyez votre message.";
      } else if (!navigator.onLine) {
        text = "Vous semblez hors ligne. Vérifiez votre connexion internet et réessayez.";
      } else {
        text = "Je rencontre une petite difficulté technique 🙏 Réessayez dans un instant.";
      }
      setMessages((prev) => [...prev, { role: "assistant", text, timestamp: new Date() }]);
    },
  });

  const sendMessage = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || chatMutation.isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg, timestamp: new Date() }]);
    chatMutation.mutate(msg);
  };

  const clearHistory = () => {
    setMessages([
      {
        role: "assistant",
        text: "Conversation effacée. Comment puis-je vous aider ?",
        timestamp: new Date(),
      },
    ]);
  };

  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          data-testid="button-ai-chat-open"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #1a237e 0%, #1565c0 100%)" }}
        >
          <Bot className="w-6 h-6 text-white" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-bounce">
              {unread}
            </span>
          )}
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-600 whitespace-nowrap">
            Assistant IA
          </span>
        </button>
      )}

      {/* Fenêtre du chat */}
      {open && (
        <div
          className={`fixed z-50 right-3 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
            minimized ? "bottom-4 w-72 h-14" : "bottom-4 w-[340px] sm:w-[370px] h-[580px]"
          }`}
          style={{ maxHeight: "calc(100vh - 24px)" }}
        >
          {/* En-tête */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1a237e 0%, #283593 40%, #1565c0 100%)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Assistant SIKA</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-300 text-xs">En ligne 24h/24</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearHistory}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Effacer la conversation"
              >
                <Trash2 className="w-3.5 h-3.5 text-white/80" />
              </button>
              <button
                onClick={() => setMinimized((m) => !m)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                {minimized ? (
                  <Maximize2 className="w-3.5 h-3.5 text-white/80" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5 text-white/80" />
                )}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-red-500/80 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white/80" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Zone de messages */}
              <div className="flex-1 overflow-y-auto bg-gray-50 px-3 py-3 space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1"
                        style={{ background: "linear-gradient(135deg, #1a237e, #1565c0)" }}>
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[82%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "text-white rounded-tr-sm"
                            : "bg-white text-gray-800 rounded-tl-sm border border-gray-100 shadow-sm"
                        }`}
                        style={
                          msg.role === "user"
                            ? { background: "linear-gradient(135deg, #1565c0, #1a237e)" }
                            : {}
                        }
                        dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                      />
                      <span className="text-xs text-gray-400 px-1">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                ))}

                {/* Loader pendant la réponse IA */}
                {chatMutation.isPending && (
                  <div className="flex justify-start gap-2">
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #1a237e, #1565c0)" }}>
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Suggestions rapides */}
              {messages.length <= 2 && (
                <div className="bg-gray-50 px-3 pb-2 flex gap-1.5 flex-wrap border-t border-gray-100">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      disabled={chatMutation.isPending}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50 mt-2"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Zone de saisie */}
              <div className="bg-white border-t border-gray-100 px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
                <input
                  ref={inputRef}
                  data-testid="input-ai-chat-message"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Posez votre question…"
                  disabled={chatMutation.isPending}
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60 transition-all"
                />
                <button
                  data-testid="button-ai-chat-send"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || chatMutation.isPending}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-110 active:scale-95 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #1565c0, #1a237e)" }}
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
