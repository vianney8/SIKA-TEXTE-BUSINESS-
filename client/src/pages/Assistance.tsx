import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAppSetting } from "@/hooks/useAppSettings";
import {
  Send, Loader2, ChevronLeft, RotateCcw, Trash2, Phone, PhoneOff, Mic, MicOff, Link2,
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Link } from "wouter";
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

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

// ── Sonnerie (425 Hz, standard RTC français, 0.85 s ON / 2.15 s OFF) ───────
class DialTone {
  private ctx: AudioContext | null = null;
  private stopped = false;
  private tid: ReturnType<typeof setTimeout> | null = null;

  start() {
    this.stopped = false;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.tick(0);
    } catch { /* AudioContext peut nécessiter un geste utilisateur */ }
  }

  private tick(delay: number) {
    this.tid = setTimeout(() => {
      if (this.stopped || !this.ctx) return;
      this.tone(0.85);
      this.tick(3000);
    }, delay);
  }

  private tone(dur: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.frequency.value = 425;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.02);
    g.gain.setValueAtTime(0.09, t + dur - 0.05);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  }

  stop() {
    this.stopped = true;
    if (this.tid) clearTimeout(this.tid);
    try { this.ctx?.close(); } catch {}
    this.ctx = null;
  }
}

type CallState = "idle" | "dialing" | "ringing" | "active" | "ended" | "timeout" | "busy" | "error";

interface CallMsg {
  id: string;
  sender: "user" | "admin";
  text: string;
  created_at: string;
}

// Rend les URLs cliquables dans un message de chat
function linkifyCallMsg(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all text-blue-600">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function Assistance() {
  const { isAuthenticated } = useAuth();
  const { data: telegramUrl } = useAppSetting("telegram_supervisor");
  const { data: callEnabledRaw } = useAppSetting("call_enabled");
  const callEnabled = callEnabledRaw !== 'false';

  const [input, setInput]               = useState("");
  const [messages, setMessages]         = useState<Message[]>(loadMessages);
  const [confirmReset, setConfirmReset] = useState(false);

  // ── ÉTAT APPEL ─────────────────────────────────────────────────────────
  const [callState, setCallState]       = useState<CallState>("idle");
  const [isMuted, setIsMuted]           = useState(false);
  const [elapsed, setElapsed]           = useState(0);
  const [countdown, setCountdown]       = useState(900);
  const [callErrorMsg, setCallErrorMsg] = useState<string | null>(null);
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef    = useRef<IMicrophoneAudioTrack | null>(null);
  const dialToneRef    = useRef<DialTone | null>(null);
  const timerRef       = useRef<any>(null);
  const cdRef          = useRef<any>(null);

  // ── CHAT PENDANT L'APPEL (messages + liens) ─────────────────────────────
  const [chatOpen, setChatOpen]     = useState(false);
  const [callMessages, setCallMessages] = useState<CallMsg[]>([]);
  const [chatInput, setChatInput]   = useState("");
  const [unread, setUnread]         = useState(0);
  const chatPollRef = useRef<any>(null);
  const chatEndRef  = useRef<HTMLDivElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { saveMessages(messages); }, [messages]);

  // Chrono durée d'appel actif
  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (callState === "idle") setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  // Décompte 15 min pendant la sonnerie
  useEffect(() => {
    if (callState === "ringing") {
      setCountdown(900);
      cdRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { doTimeout(); return 0; }
          return c - 1;
        });
      }, 1000);
    } else {
      clearInterval(cdRef.current);
    }
    return () => clearInterval(cdRef.current);
  }, [callState]);

  // Nettoyage au démontage du composant
  useEffect(() => () => {
    dialToneRef.current?.stop();
    cleanupAgora();
  }, []);

  // ── APPEL AGORA ──────────────────────────────────────────────────────────

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
      return data as { busy?: boolean; channelName?: string; userToken?: string; agoraAppId?: string };
    },
    onSuccess: async (data) => {
      if (data.busy) {
        setCallState("busy");
        setTimeout(() => setCallState("idle"), 5000);
        return;
      }
      await joinAgora(data.agoraAppId!, data.channelName!, data.userToken!);
    },
    onError: (err: any) => {
      setCallErrorMsg(err?.message || "Impossible de démarrer l'appel.");
      setCallState("error");
      setTimeout(() => setCallState("idle"), 5000);
    },
  });

  async function joinAgora(appId: string, channelName: string, token: string) {
    try {
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraClientRef.current = client;

      client.on("user-published", async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === "audio") {
          remoteUser.audioTrack?.play();
          dialToneRef.current?.stop();
          dialToneRef.current = null;
          setCallState("active");
        }
      });

      // Si l'administrateur raccroche de son côté, Agora déclenche "user-left" :
      // on termine l'appel côté utilisateur automatiquement, sans clic requis.
      client.on("user-left", () => {
        setCallState("ended");
        cleanupAgora();
        setTimeout(() => { setCallState("idle"); setIsMuted(false); }, 2500);
      });

      await client.join(appId, channelName, token, 1);
      const mic = await AgoraRTC.createMicrophoneAudioTrack();
      micTrackRef.current = mic;
      await client.publish([mic]);

      dialToneRef.current = new DialTone();
      dialToneRef.current.start();
      setCallState("ringing");
    } catch (err: any) {
      setCallErrorMsg(err?.message || "Erreur de connexion audio.");
      setCallState("error");
      setTimeout(() => setCallState("idle"), 5000);
      await cleanupAgora();
    }
  }

  async function cleanupAgora() {
    dialToneRef.current?.stop();
    dialToneRef.current = null;
    if (micTrackRef.current) {
      micTrackRef.current.stop();
      micTrackRef.current.close();
      micTrackRef.current = null;
    }
    if (agoraClientRef.current) {
      try { await agoraClientRef.current.leave(); } catch {}
      agoraClientRef.current = null;
    }
  }

  async function hangUp() {
    setCallState("ended");
    await cleanupAgora();
    fetch("/api/calls/end", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    setTimeout(() => { setCallState("idle"); setIsMuted(false); }, 2500);
  }

  async function doTimeout() {
    setCallState("timeout");
    await cleanupAgora();
    fetch("/api/calls/end", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    setTimeout(() => setCallState("idle"), 5000);
  }

  async function toggleMute() {
    if (!micTrackRef.current) return;
    await micTrackRef.current.setMuted(!isMuted);
    setIsMuted(m => !m);
  }

  // ── CHAT PENDANT L'APPEL ─────────────────────────────────────────────────
  useEffect(() => {
    if (callState === "ringing" || callState === "active") {
      pollCallMessages();
      chatPollRef.current = setInterval(pollCallMessages, 2000);
    } else {
      clearInterval(chatPollRef.current);
      setCallMessages([]);
      setChatOpen(false);
      setUnread(0);
    }
    return () => clearInterval(chatPollRef.current);
  }, [callState]);

  useEffect(() => {
    if (chatOpen) {
      setUnread(0);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [callMessages, chatOpen]);

  async function pollCallMessages() {
    try {
      const res = await fetch("/api/calls/messages", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const list: CallMsg[] = data.messages || [];
      setCallMessages(prev => {
        if (list.length > prev.length && !chatOpen) {
          setUnread(u => u + (list.length - prev.length));
        }
        return list;
      });
    } catch { /* silencieux : simple polling */ }
  }

  async function sendCallMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    try {
      await fetch("/api/calls/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      pollCallMessages();
    } catch { /* ignore */ }
  }

  function fmtTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function startCall() {
    if (callState !== "idle") return;
    setCallState("dialing");
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
            <Phone className="w-5 h-5" />
            Appeler Administration SIKA
          </button>
        </div>
      )}

      {/* ── OVERLAY APPEL AGORA ─────────────────────────────── */}
      {callState !== "idle" && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-between select-none overflow-hidden"
          style={{ background: "linear-gradient(155deg, #07101e 0%, #0d1b30 55%, #091520 100%)" }}
        >
          {/* ── TOP : identité SIKA ── */}
          <div className="flex flex-col items-center gap-2 pt-14">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)" }}>
              <span className="text-white font-black text-base tracking-tighter">ST</span>
            </div>
            <div className="text-center">
              <p className="text-slate-400 font-bold text-xs tracking-[0.22em] uppercase">SIKA TEXTE</p>
              <p className="text-slate-600 text-[10px] mt-0.5">Ligne chiffrée sécurisée</p>
            </div>
          </div>

          {/* ── CENTRE : avatar animé + statut ── */}
          <div className="flex flex-col items-center gap-7">

            {/* Anneaux + avatar */}
            <div className="relative flex items-center justify-center" style={{ width: 230, height: 230 }}>
              {callState === "ringing" && (
                <>
                  <div className="absolute rounded-full" style={{ width: 230, height: 230, background: "rgba(37,99,235,0.07)", animation: "ring-out 2.2s ease-out infinite" }} />
                  <div className="absolute rounded-full" style={{ width: 194, height: 194, background: "rgba(37,99,235,0.11)", animation: "ring-out 2.2s ease-out infinite 0.45s" }} />
                  <div className="absolute rounded-full" style={{ width: 162, height: 162, background: "rgba(37,99,235,0.17)", animation: "ring-out 2.2s ease-out infinite 0.9s" }} />
                </>
              )}
              {callState === "active" && (
                <>
                  <div className="absolute rounded-full animate-ping" style={{ width: 180, height: 180, background: "rgba(34,197,94,0.12)", animationDuration: "1.8s" }} />
                  <div className="absolute rounded-full" style={{ width: 156, height: 156, background: "rgba(34,197,94,0.07)", animation: "ring-out 3s ease-out infinite 0.6s" }} />
                </>
              )}

              {/* Avatar principal */}
              <div className="relative flex items-center justify-center rounded-full transition-all duration-700"
                style={{
                  width: 134, height: 134,
                  background: callState === "active"
                    ? "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                    : (callState === "ringing" || callState === "dialing")
                      ? "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #2563eb 100%)"
                      : "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                  boxShadow: callState === "active"
                    ? "0 0 80px rgba(34,197,94,0.3), 0 0 30px rgba(34,197,94,0.15)"
                    : (callState === "ringing" || callState === "dialing")
                      ? "0 0 80px rgba(37,99,235,0.3), 0 0 30px rgba(37,99,235,0.15)"
                      : "0 0 40px rgba(0,0,0,0.6)",
                }}>
                <span className="text-white font-black text-[32px] tracking-tighter select-none">ST</span>
              </div>
            </div>

            {/* Nom + état */}
            <div className="text-center space-y-2.5 px-6">
              <p className="text-white font-black text-[26px] tracking-tight leading-none">Administration SIKA</p>

              {callState === "dialing" && (
                <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Initialisation…
                </p>
              )}
              {callState === "ringing" && (
                <div className="space-y-1.5">
                  <p className="text-blue-400 text-sm font-semibold flex items-center justify-center gap-2">
                    <span className="flex gap-1">
                      {[0, 160, 320].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                    Appel en cours…
                  </p>
                  <p className="text-slate-500 text-xs">
                    Temps restant :{" "}
                    <span className="text-slate-300 font-mono font-semibold tabular-nums">{fmtTime(countdown)}</span>
                  </p>
                </div>
              )}
              {callState === "active" && (
                <p className="text-green-400 text-sm font-semibold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  En appel · <span className="font-mono tabular-nums">{fmtTime(elapsed)}</span>
                </p>
              )}
              {callState === "ended" && (
                <p className="text-slate-500 text-sm">Appel terminé</p>
              )}
              {callState === "timeout" && (
                <div className="space-y-1">
                  <p className="text-orange-400 text-sm font-semibold">Aucune réponse</p>
                  <p className="text-slate-500 text-xs max-w-[240px] mx-auto leading-relaxed">
                    Aucun agent disponible pour le moment.<br />Réessayez dans quelques instants.
                  </p>
                </div>
              )}
              {callState === "busy" && (
                <div className="space-y-1">
                  <p className="text-red-400 text-sm font-semibold">Service momentanément occupé</p>
                  <p className="text-slate-500 text-xs max-w-[240px] mx-auto leading-relaxed">
                    Tous les agents sont en communication.<br />Veuillez réessayer dans quelques instants.
                  </p>
                </div>
              )}
              {callState === "error" && (
                <p className="text-red-400 text-xs text-center max-w-[240px] mx-auto">{callErrorMsg}</p>
              )}
            </div>

            {/* Badge muet */}
            {isMuted && callState === "active" && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
                <MicOff className="w-3 h-3" /> Micro désactivé
              </div>
            )}
          </div>

          {/* ── BAS : boutons d'action ── */}
          <div className="flex items-end justify-center gap-10 pb-16">
            {(callState === "ringing" || callState === "active") && (
              <>
                <div className="flex flex-col items-center gap-2">
                  <button onClick={toggleMute} data-testid="button-toggle-mute"
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{
                      background: isMuted ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.07)",
                      border: `1px solid ${isMuted ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.1)"}`,
                    }}>
                    {isMuted ? <MicOff className="w-6 h-6 text-red-400" /> : <Mic className="w-6 h-6 text-white" />}
                  </button>
                  <span className="text-slate-600 text-[11px]">{isMuted ? "Activer" : "Couper"}</span>
                </div>

                <div className="flex flex-col items-center gap-2 relative">
                  <button onClick={() => setChatOpen(v => !v)} data-testid="button-toggle-chat"
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{
                      background: chatOpen ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.07)",
                      border: `1px solid ${chatOpen ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
                    }}>
                    <Send className={`w-6 h-6 ${chatOpen ? "text-blue-300" : "text-white"}`} />
                    {unread > 0 && !chatOpen && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                  </button>
                  <span className="text-slate-600 text-[11px]">Messages</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button onClick={hangUp} data-testid="button-hang-up"
                    className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{
                      background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 60%, #ef4444 100%)",
                      boxShadow: "0 8px 32px rgba(185,28,28,0.5), 0 2px 8px rgba(0,0,0,0.4)",
                    }}>
                    <PhoneOff className="w-8 h-8 text-white" />
                  </button>
                  <span className="text-slate-600 text-[11px]">Raccrocher</span>
                </div>
              </>
            )}

            {callState === "dialing" && (
              <button onClick={hangUp} data-testid="button-cancel-call"
                className="px-8 py-3 rounded-2xl text-slate-400 text-sm font-medium transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Annuler
              </button>
            )}
          </div>

          {/* ── PANNEAU CHAT (messages + liens pendant l'appel) ─────────────── */}
          {chatOpen && (callState === "ringing" || callState === "active") && (
            <div
              className="fixed inset-x-0 bottom-0 z-10 flex flex-col rounded-t-3xl overflow-hidden"
              style={{ height: "58%", background: "#0b1420", boxShadow: "0 -12px 40px rgba(0,0,0,0.5)" }}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 flex-shrink-0">
                <p className="text-white font-bold text-sm flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-300" /> Messages de l'appel
                </p>
                <button onClick={() => setChatOpen(false)} className="text-slate-400 text-xs font-semibold">
                  Fermer
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                {callMessages.length === 0 && (
                  <p className="text-slate-600 text-xs text-center mt-6">Aucun message pour l'instant.</p>
                )}
                {callMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words"
                      style={m.sender === "user"
                        ? { background: "linear-gradient(135deg, #1a237e, #1565c0)", color: "#fff", borderRadius: "16px 16px 4px 16px" }
                        : { background: "rgba(255,255,255,0.08)", color: "#e2e8f0", borderRadius: "16px 16px 16px 4px" }}
                    >
                      {linkifyCallMsg(m.text)}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 flex-shrink-0">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendCallMessage(); }}
                  placeholder="Écrire un message ou coller un lien…"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", color: "#fff" }}
                />
                <button
                  onClick={sendCallMessage}
                  disabled={!chatInput.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #1a237e, #1565c0)" }}
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}

          <style>{`
            @keyframes ring-out {
              0%   { transform: scale(0.88); opacity: 0.7; }
              75%  { transform: scale(1.55); opacity: 0; }
              100% { transform: scale(1.55); opacity: 0; }
            }
          `}</style>
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
