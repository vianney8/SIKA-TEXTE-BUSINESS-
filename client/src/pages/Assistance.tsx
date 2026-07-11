import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useAppSetting } from "@/hooks/useAppSettings";
import {
  Send, Loader2, ChevronLeft, RotateCcw, Trash2, Phone, PhoneOff, PhoneMissed, AlertCircle,
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Link } from "wouter";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  showContact?: boolean;
}

const STORAGE_KEY = "lylya_chat_history";

const CONTACT_KEYWORDS = [
  "contacter", "superviseur", "support", "humain", "agent", "téléconseil",
  "telegram", "whatsapp", "service client", "conseiller", "assistance humaine"
];

function hasContactSuggestion(text: string) {
  const lower = text.toLowerCase();
  return CONTACT_KEYWORDS.some((kw) => lower.includes(kw));
}

function renderText(raw: string) {
  const html = raw
    .replace(/\*\*([\s\S]*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([\s\S]*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function makeWelcome(): Message {
  return {
    role: "assistant",
    text: "**Bonjour 👋 , je me nomme Lylya. Je suis le Superviseur IA officiel de SIKA TEXTE.\nComment puis-je vous aider ?**",
    timestamp: new Date().toISOString(),
  };
}

function loadMessages(): Message[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Message[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [makeWelcome()];
}

function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    /* ignore */
  }
}

type CallState = "idle" | "connecting" | "active" | "ended";

export default function Assistance() {
  const { isAuthenticated } = useAuth();
  const { data: telegramUrl } = useAppSetting("telegram_supervisor");
  const { data: callEnabledRaw } = useAppSetting("call_enabled");
  const callEnabled = callEnabledRaw !== 'false';

  const [input, setInput]               = useState("");
  const [messages, setMessages]         = useState<Message[]>(loadMessages);
  const [confirmReset, setConfirmReset] = useState(false);

  // Appel Jitsi
  const [callState, setCallState]       = useState<CallState>("idle");
  const [callRoom, setCallRoom]         = useState<string | null>(null);
  const [callDisplayName, setCallDisplayName] = useState<string>("");
  const [callError, setCallError]       = useState<string | null>(null);
  const jitsiContainerRef               = useRef<HTMLDivElement>(null);
  const jitsiApiRef                     = useRef<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // ── APPEL ─────────────────────────────────────────────────────────────────

  const initiateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calls/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Erreur serveur");
      return data as { roomName: string; userDisplayName: string };
    },
    onSuccess: (data) => {
      setCallError(null);
      setCallRoom(data.roomName);
      setCallDisplayName(data.userDisplayName);
      setCallState("connecting");
      loadJitsi(data.roomName, data.userDisplayName);
    },
    onError: (err: any) => {
      setCallState("idle");
      setCallError(err?.message || "Impossible de démarrer l'appel. Réessayez.");
      setTimeout(() => setCallError(null), 5000);
    },
  });

  const endCallMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/calls/end", {});
    },
  });

  function loadJitsi(roomName: string, displayName: string) {
    const win = window as any;
    if (win.JitsiMeetExternalAPI) {
      initJitsi(roomName, displayName);
    } else {
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = () => initJitsi(roomName, displayName);
      script.onerror = () => setCallState("idle");
      document.head.appendChild(script);
    }
  }

  function initJitsi(roomName: string, displayName: string) {
    if (!jitsiContainerRef.current) return;
    const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
    const api = new JitsiMeetExternalAPI("meet.jit.si", {
      roomName,
      width: "100%",
      height: "100%",
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName,
        email: "",
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: true,
        startAudioOnly: true,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
        disableInviteFunctions: true,
        enableNoisyMicDetection: false,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: ["microphone", "hangup"],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        DISPLAY_WELCOME_FOOTER: false,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
      },
    });

    api.addEventListeners({
      videoConferenceJoined: () => setCallState("active"),
      videoConferenceLeft: () => hangUp(api),
      readyToClose: () => hangUp(api),
    });

    jitsiApiRef.current = api;
  }

  function hangUp(api?: any) {
    const instance = api || jitsiApiRef.current;
    if (instance) {
      try { instance.dispose(); } catch { /* ignore */ }
      jitsiApiRef.current = null;
    }
    setCallState("ended");
    endCallMutation.mutate();
    setTimeout(() => {
      setCallState("idle");
      setCallRoom(null);
    }, 2000);
  }

  function startCall() {
    if (callState !== "idle") return;
    initiateMutation.mutate();
  }

  // ── CHAT ──────────────────────────────────────────────────────────────────

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => {
      const history = messages.slice(-12).map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `http_${res.status}`);
      return data;
    },
    onSuccess: (data) => {
      const reply = data.reply || "Désolé, je n'ai pas pu répondre. Réessayez.";
      setMessages((p) => [...p, {
        role: "assistant",
        text: reply,
        timestamp: new Date().toISOString(),
        showContact: hasContactSuggestion(reply),
      }]);
    },
    onError: (err: any) => {
      const code = err?.message || "";
      let text: string;
      if (code === "quota_exceeded") {
        text = "Je rencontre une petite difficulté technique (elle est en cours de résolution) 🙏 Réessayez dans quelques instants.";
      } else if (code === "Service IA temporairement indisponible") {
        text = "Mon service est momentanément indisponible. Réessayez dans quelques instants 🙏";
      } else if (!navigator.onLine) {
        text = "Vous semblez hors ligne. Vérifiez votre connexion internet et réessayez.";
      } else {
        text = "Je rencontre une petite difficulté technique 🙏 Réessayez dans un instant. Si ça persiste, contactez le support.";
      }
      setMessages((p) => [...p, {
        role: "assistant",
        text,
        timestamp: new Date().toISOString(),
      }]);
    },
  });

  const send = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || chatMutation.isPending) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", text: msg, timestamp: new Date().toISOString() }]);
    chatMutation.mutate(msg);
  };

  const confirmAndReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([makeWelcome()]);
    setInput("");
    setConfirmReset(false);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-50">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <Link href="/contact">
          <button className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors active:scale-95 flex-shrink-0">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
        </Link>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1a237e 0%, #1565c0 100%)" }}
            >
              <span className="text-white font-black text-sm">SI</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div className="min-w-0">
            <p className="text-slate-800 font-bold text-sm leading-none">Lylya — Superviseur IA</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-green-600 text-[10px] font-medium">En ligne · SIKA TEXTE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => window.open(telegramUrl || "https://t.me/SIKAcustomer_service", "_blank", "noopener,noreferrer")}
            data-testid="button-telegram-contact"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors active:scale-95"
            title="Support Telegram"
          >
            <FaTelegram className="w-4 h-4 text-blue-500" />
          </button>
          <button
            onClick={() => setConfirmReset(true)}
            data-testid="button-clear-chat"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 flex items-center justify-center transition-colors active:scale-95"
            title="Effacer la conversation"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </header>

      {/* ── BANDEAU APPEL VOCAL ─────────────────────────────── */}
      {callState === "idle" && callEnabled && (
        <div className="flex-shrink-0 px-4 pt-3 pb-0">
          <button
            onClick={startCall}
            disabled={initiateMutation.isPending}
            data-testid="button-start-call"
            className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              boxShadow: "0 4px 14px rgba(5,150,105,0.35)",
            }}
          >
            {initiateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connexion en cours…
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                Appeler le Superviseur ADMIN
              </>
            )}
          </button>

          {callError && (
            <div className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium"
              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {callError}
            </div>
          )}
        </div>
      )}

      {/* ── OVERLAY APPEL JITSI ─────────────────────────────── */}
      {callState !== "idle" && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "#0f172a" }}
        >
          {/* Barre supérieure appel */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-4 py-3"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1a237e 0%, #1565c0 100%)" }}
              >
                <span className="text-white font-black text-sm">SI</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">Superviseur ADMIN</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {callState === "connecting" && "Connexion en cours…"}
                  {callState === "active" && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
                      En appel
                    </span>
                  )}
                  {callState === "ended" && "Appel terminé"}
                </p>
              </div>
            </div>

            {/* Bouton raccrocher */}
            {callState !== "ended" && (
              <button
                onClick={() => hangUp()}
                data-testid="button-hang-up"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)" }}
              >
                <PhoneOff className="w-4 h-4" />
                Raccrocher
              </button>
            )}
            {callState === "ended" && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-semibold opacity-60"
                style={{ background: "#374151" }}>
                <PhoneMissed className="w-4 h-4" />
                Terminé
              </div>
            )}
          </div>

          {/* Avertissement confidentialité */}
          {callState === "connecting" && (
            <div className="flex-shrink-0 mx-4 mt-3 px-4 py-2.5 rounded-2xl text-center"
              style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)" }}>
              <p className="text-cyan-300 text-xs font-medium">
                🔒 Votre interlocuteur apparaîtra uniquement comme <strong>« Superviseur ADMIN »</strong>
              </p>
            </div>
          )}

          {/* Conteneur Jitsi */}
          <div
            ref={jitsiContainerRef}
            className="flex-1 w-full"
            style={{ minHeight: 0 }}
          />
        </div>
      )}

      {/* ── MODAL CONFIRMATION EFFACEMENT ───────────────────── */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl overflow-hidden"
            style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex flex-col items-center gap-3 px-6 pt-7 pb-5"
              style={{ background: "#fff" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #fee2e2, #fecaca)" }}
              >
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-slate-800 font-black text-base">Effacer la conversation ?</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Tous les messages seront supprimés.<br />Cette action est irréversible.
                </p>
              </div>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex" style={{ background: "#fff" }}>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-4 text-sm font-semibold text-slate-500 active:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <div className="w-px bg-slate-100" />
              <button
                onClick={confirmAndReset}
                data-testid="button-confirm-clear"
                className="flex-1 py-4 text-sm font-black text-red-500 active:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGES ───────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div className="max-w-lg mx-auto w-full space-y-4">

          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm"
                  style={isUser
                    ? { background: "linear-gradient(135deg, #6d28d9, #8b5cf6)" }
                    : { background: "linear-gradient(135deg, #1a237e, #1565c0)" }
                  }
                >
                  <span className="text-white font-black text-[10px]">{isUser ? "Moi" : "SI"}</span>
                </div>

                <div className={`flex flex-col gap-1.5 max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
                  <div
                    className="px-4 py-3 text-sm leading-relaxed"
                    style={isUser ? {
                      background: "linear-gradient(135deg, #1a237e, #1565c0)",
                      color: "#fff",
                      borderRadius: "18px 18px 4px 18px",
                      boxShadow: "0 2px 8px rgba(26,35,126,0.2)",
                    } : {
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      color: "#1e293b",
                      borderRadius: "18px 18px 18px 4px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    {renderText(msg.text)}
                  </div>

                  {!isUser && msg.showContact && (
                    <button
                      onClick={() => window.open(telegramUrl || "https://t.me/SIKAcustomer_service", "_blank", "noopener,noreferrer")}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, #0088cc, #00a8e8)",
                        color: "#fff",
                        boxShadow: "0 2px 8px rgba(0,136,204,0.25)",
                      }}
                    >
                      <FaTelegram className="w-3.5 h-3.5" />
                      Contacter le support humain
                    </button>
                  )}

                  <span className="text-[10px] text-slate-400 px-1">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          })}

          {chatMutation.isPending && (
            <div className="flex items-end gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm"
                style={{ background: "linear-gradient(135deg, #1a237e, #1565c0)" }}
              >
                <span className="text-white font-black text-[10px]">SI</span>
              </div>
              <div
                className="px-5 py-4 flex items-center gap-1.5"
                style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "18px 18px 18px 4px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── BARRE DE SAISIE ────────────────────────────────── */}
      <footer className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-end gap-2">
          <div className="flex-1 flex items-end gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 focus-within:border-blue-400 focus-within:bg-white transition-colors">
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
              placeholder="Posez votre question à Lylya…"
              disabled={chatMutation.isPending}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none disabled:opacity-50"
              style={{ minHeight: "22px", maxHeight: "120px" }}
            />
          </div>
          <button
            data-testid="button-ai-chat-send"
            onClick={() => send()}
            disabled={!input.trim() || chatMutation.isPending}
            className="w-11 h-11 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1565c0, #1a237e)" }}
          >
            {chatMutation.isPending
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : <Send className="w-5 h-5 text-white" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          Lylya · Superviseur IA · SIKA TEXTE BUSINESS
        </p>
      </footer>

      <style>{`
        main::-webkit-scrollbar { width: 3px; }
        main::-webkit-scrollbar-track { background: transparent; }
        main::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        textarea::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  );
}
