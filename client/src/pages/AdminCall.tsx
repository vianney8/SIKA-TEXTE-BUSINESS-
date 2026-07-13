import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Mic, MicOff, PhoneOff, Loader2, Bot, Send, Link2 } from "lucide-react";
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack } from "agora-rtc-sdk-ng";

type AdminCallState = "connecting" | "waiting" | "active" | "ended" | "error";

interface CallMsg {
  id: string;
  sender: "user" | "admin";
  text: string;
  created_at: string;
}

// ── Effet "voix robot IA" — masculine, jeune adulte, claire et puissante ───
// Cahier des charges : voix robotique nette et intelligible, ton calme et
// confiant, résonance électronique futuriste discrète, sans distorsion qui
// nuise à la compréhension. On privilégie donc un mélange voix propre +
// légère modulation en anneau à très basse fréquence (texture robotique
// sans garbling) + un chorus subtil (résonance futuriste) + un renforcement
// des graves (registre masculin) + compression (puissance et clarté).
// Génère une petite réponse impulsionnelle synthétique (pas de fichier audio
// externe requis) pour un effet de réverbération légère et discrète.
function buildReverbImpulse(ctx: AudioContext): AudioBuffer {
  const duration = 0.9;
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
    }
  }
  return buffer;
}

function buildRobotAudioTrack(rawStream: MediaStream): { track: MediaStreamTrack; ctx: AudioContext } {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const source = ctx.createMediaStreamSource(rawStream);

  // Voix "sèche" conservée en majorité pour garder une prononciation nette
  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.62;

  // Modulation en anneau à très basse fréquence : ajoute un grain robotique
  // sans casser l'intelligibilité de la voix (contrairement à un carrier élevé)
  const carrier = ctx.createOscillator();
  carrier.type = "sine";
  carrier.frequency.value = 32;
  carrier.start();
  const ringDepth = ctx.createGain();
  ringDepth.gain.value = 0;
  carrier.connect(ringDepth.gain);
  const ringOut = ctx.createGain();
  ringOut.gain.value = 0.36; // grain robotique réduit (35–38%) pour un rendu plus naturel
  source.connect(ringDepth);
  ringDepth.connect(ringOut);

  // Résonance électronique futuriste : chorus léger via un délai modulé
  const chorusDelay = ctx.createDelay();
  chorusDelay.delayTime.value = 0.014;
  const chorusLfo = ctx.createOscillator();
  chorusLfo.type = "sine";
  chorusLfo.frequency.value = 3.2;
  const chorusLfoDepth = ctx.createGain();
  chorusLfoDepth.gain.value = 0.0035;
  chorusLfo.connect(chorusLfoDepth);
  chorusLfoDepth.connect(chorusDelay.delayTime);
  chorusLfo.start();
  const chorusOut = ctx.createGain();
  chorusOut.gain.value = 0.3;
  source.connect(chorusDelay);
  chorusDelay.connect(chorusOut);

  // Légère réverbération (5–8%) pour donner de la profondeur, sans "noyer" la voix
  const reverb = ctx.createConvolver();
  reverb.buffer = buildReverbImpulse(ctx);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.065;
  source.connect(reverb);
  reverb.connect(reverbOut);

  // Mixage des couches (voix nette + grain robotique + résonance + réverbération)
  const mix = ctx.createGain();
  dryGain.connect(mix);
  ringOut.connect(mix);
  chorusOut.connect(mix);
  reverbOut.connect(mix);
  source.connect(dryGain);

  // Renforcement des graves : registre masculin, voix "puissante"
  const bass = ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 190;
  bass.gain.value = 5;

  // Légère bosse de présence pour garder la voix claire et nette
  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2200;
  presence.Q.value = 1;
  presence.gain.value = 3;

  // Coupe douce des aigus extrêmes : évite un son numérique agressif
  const smooth = ctx.createBiquadFilter();
  smooth.type = "lowpass";
  smooth.frequency.value = 7000;

  // Compression : voix ferme, calme et confiante, niveau constant
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;

  const destination = ctx.createMediaStreamDestination();

  mix.connect(bass);
  bass.connect(presence);
  presence.connect(smooth);
  smooth.connect(comp);
  comp.connect(destination);

  return { track: destination.stream.getAudioTracks()[0], ctx };
}

// Rend les URLs cliquables dans un message de chat
function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="underline break-all" style={{ color: "#93c5fd" }}>
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function AdminCall() {
  const [, params] = useRoute("/admin-call/:channelName/:token");
  const channelName = params?.channelName || "";
  const token       = params?.token ? decodeURIComponent(params.token) : "";
  const appId       = new URLSearchParams(window.location.search).get("appId") || "";

  const [state, setState]       = useState<AdminCallState>("connecting");
  const [isMuted, setIsMuted]   = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [error, setError]       = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<CallMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unread, setUnread]     = useState(0);

  const hasJoined = useRef(false);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const rawStreamRef      = useRef<MediaStream | null>(null);
  const robotTrackRef     = useRef<ILocalAudioTrack | null>(null);
  const robotCtxRef       = useRef<AudioContext | null>(null);
  const timerRef  = useRef<any>(null);
  const chatPollRef = useRef<any>(null);
  const chatEndRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!channelName || !token || !appId) {
      setError("Lien invalide ou expiré.");
      setState("error");
      return;
    }
    connect();
    return () => { leave(); };
  }, []);

  useEffect(() => {
    if (state === "active") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [state]);

  // ── CHAT (messages + liens) pendant l'appel ─────────────────────────────
  useEffect(() => {
    if ((state === "waiting" || state === "active") && channelName) {
      pollMessages();
      chatPollRef.current = setInterval(pollMessages, 2000);
    } else {
      clearInterval(chatPollRef.current);
    }
    return () => clearInterval(chatPollRef.current);
  }, [state, channelName]);

  useEffect(() => {
    if (chatOpen) {
      setUnread(0);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatOpen]);

  async function pollMessages() {
    try {
      const res = await fetch(`/api/admin-call/${encodeURIComponent(channelName)}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      const list: CallMsg[] = data.messages || [];
      setMessages(prev => {
        if (list.length > prev.length && !chatOpen) {
          setUnread(u => u + (list.length - prev.length));
        }
        return list;
      });
    } catch { /* silencieux : simple polling */ }
  }

  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    try {
      await fetch(`/api/admin-call/${encodeURIComponent(channelName)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      pollMessages();
    } catch { /* ignore */ }
  }

  async function connect() {
    try {
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") {
          user.audioTrack?.play();
          setState("active");
        }
      });
      client.on("user-left", () => {
        setState("ended");
        leave();
      });

      await client.join(appId, channelName, token, 2);
      hasJoined.current = true;

      // Micro brut (jamais de vidéo : uniquement le flux audio)
      const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      rawStreamRef.current = rawStream;

      // La voix de l'administrateur est TOUJOURS transformée en voix robot avant
      // d'être publiée : le client n'entend jamais la vraie voix de l'administrateur.
      const { track: robotMediaTrack, ctx } = buildRobotAudioTrack(rawStream);
      robotCtxRef.current = ctx;
      const robotTrack = AgoraRTC.createCustomAudioTrack({ mediaStreamTrack: robotMediaTrack });
      robotTrackRef.current = robotTrack;

      await client.publish([robotTrack]);
      setState("waiting");
    } catch (e: any) {
      setError(e?.message || "Impossible de rejoindre l'appel.");
      setState("error");
    }
  }

  async function leave() {
    clearInterval(timerRef.current);
    try { robotTrackRef.current?.close(); } catch {}
    robotTrackRef.current = null;
    try { robotCtxRef.current?.close(); } catch {}
    robotCtxRef.current = null;
    rawStreamRef.current?.getTracks().forEach(t => t.stop());
    rawStreamRef.current = null;
    if (clientRef.current && hasJoined.current) {
      try { await clientRef.current.leave(); } catch {}
      clientRef.current = null;
      hasJoined.current = false;
    }
  }

  async function hangUp() {
    await leave();
    setState("ended");
    fetch(`/api/admin-call/${encodeURIComponent(channelName)}/end`, { method: "POST" }).catch(() => {});
  }

  async function toggleMute() {
    const rawTrack = rawStreamRef.current?.getAudioTracks()[0];
    if (!rawTrack) return;
    rawTrack.enabled = isMuted; // isMuted actuel -> on inverse
    setIsMuted(m => !m);
  }

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  const isWaiting = state === "waiting";
  const isActive  = state === "active";

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-between select-none overflow-hidden"
      style={{ background: "linear-gradient(155deg, #07101e 0%, #0d1b30 55%, #091520 100%)" }}
    >
      {/* ── TOP : identité plateforme ── */}
      <div className="flex flex-col items-center gap-2.5 pt-14">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
          style={{ background: "linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)" }}
        >
          <span className="text-white font-black text-base tracking-tighter">ST</span>
        </div>
        <div className="text-center">
          <p className="text-slate-300 font-bold text-xs tracking-[0.22em] uppercase">SIKA TEXTE</p>
          <p className="text-slate-600 text-[10px] mt-0.5">Interface Administration sécurisée</p>
        </div>
      </div>

      {/* ── CENTRE : avatar + statut ── */}
      <div className="flex flex-col items-center gap-7">

        {/* Anneaux animés + avatar */}
        <div className="relative flex items-center justify-center" style={{ width: 230, height: 230 }}>
          {isActive && (
            <>
              <div className="absolute rounded-full animate-ping"
                style={{ width: 182, height: 182, background: "rgba(34,197,94,0.13)", animationDuration: "1.8s" }} />
              <div className="absolute rounded-full"
                style={{ width: 156, height: 156, background: "rgba(34,197,94,0.07)", animation: "ring-out 3s ease-out infinite 0.6s" }} />
            </>
          )}
          {isWaiting && (
            <>
              <div className="absolute rounded-full"
                style={{ width: 228, height: 228, background: "rgba(245,158,11,0.07)", animation: "ring-out 2.5s ease-out infinite" }} />
              <div className="absolute rounded-full"
                style={{ width: 194, height: 194, background: "rgba(245,158,11,0.11)", animation: "ring-out 2.5s ease-out infinite 0.5s" }} />
              <div className="absolute rounded-full"
                style={{ width: 162, height: 162, background: "rgba(245,158,11,0.16)", animation: "ring-out 2.5s ease-out infinite 1s" }} />
            </>
          )}

          <div
            className="relative flex items-center justify-center rounded-full transition-all duration-700"
            style={{
              width: 134, height: 134,
              background: isActive
                ? "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                : isWaiting
                  ? "linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)"
                  : "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              boxShadow: isActive
                ? "0 0 70px rgba(34,197,94,0.35), 0 0 28px rgba(34,197,94,0.2)"
                : isWaiting
                  ? "0 0 70px rgba(245,158,11,0.28), 0 0 28px rgba(245,158,11,0.15)"
                  : "0 0 40px rgba(0,0,0,0.6)",
            }}
          >
            <span className="text-white font-black text-[32px] tracking-tighter select-none">ST</span>
          </div>
        </div>

        {/* Nom + état */}
        <div className="text-center space-y-2.5 px-6">
          <p className="text-white font-black text-2xl tracking-tight">Administration SIKA</p>

          {state === "connecting" && (
            <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Connexion au canal…
            </p>
          )}
          {isWaiting && (
            <p className="text-amber-400 text-sm font-semibold flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              En attente du client…
            </p>
          )}
          {isActive && (
            <p className="text-green-400 text-sm font-semibold flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              En appel · <span className="font-mono tabular-nums">{fmt(elapsed)}</span>
            </p>
          )}
          {state === "ended" && (
            <p className="text-slate-500 text-sm">Appel terminé</p>
          )}
          {state === "error" && (
            <p className="text-red-400 text-sm text-center max-w-[240px] mx-auto">{error}</p>
          )}
        </div>

        {/* Badge muet */}
        {isMuted && isActive && (
          <div
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
          >
            <MicOff className="w-3 h-3" /> Micro désactivé
          </div>
        )}

        {/* Badge voix robot (toujours active pendant l'appel) */}
        {(isWaiting || isActive) && (
          <div
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}
          >
            <Bot className="w-3 h-3" /> Voix robot activée
          </div>
        )}
      </div>

      {/* ── BAS : boutons d'action ── */}
      <div className="flex items-end justify-center gap-8 pb-16">
        {(isWaiting || isActive) && (
          <>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleMute}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: isMuted ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.07)",
                  border: `1px solid ${isMuted ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {isMuted
                  ? <MicOff className="w-6 h-6 text-red-400" />
                  : <Mic className="w-6 h-6 text-white" />}
              </button>
              <span className="text-slate-600 text-[11px]">{isMuted ? "Activer" : "Couper"}</span>
            </div>

            <div className="flex flex-col items-center gap-2 relative">
              <button
                onClick={() => setChatOpen(v => !v)}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: chatOpen ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.07)",
                  border: `1px solid ${chatOpen ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
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
              <button
                onClick={hangUp}
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 60%, #ef4444 100%)",
                  boxShadow: "0 8px 32px rgba(185,28,28,0.5), 0 2px 8px rgba(0,0,0,0.4)",
                }}
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
              <span className="text-slate-600 text-[11px]">Raccrocher</span>
            </div>
          </>
        )}

        {state === "ended" && (
          <button
            onClick={() => window.close()}
            className="px-8 py-3 rounded-2xl text-slate-400 text-sm font-semibold transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Fermer l'onglet
          </button>
        )}
      </div>

      {/* ── PANNEAU CHAT (messages + liens pendant l'appel) ─────────────── */}
      {chatOpen && (isWaiting || isActive) && (
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
            {messages.length === 0 && (
              <p className="text-slate-600 text-xs text-center mt-6">Aucun message pour l'instant.</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words"
                  style={m.sender === "admin"
                    ? { background: "linear-gradient(135deg, #1a237e, #1565c0)", color: "#fff", borderRadius: "16px 16px 4px 16px" }
                    : { background: "rgba(255,255,255,0.08)", color: "#e2e8f0", borderRadius: "16px 16px 16px 4px" }}
                >
                  {linkify(m.text)}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 flex-shrink-0">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
              placeholder="Écrire un message ou coller un lien…"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.07)", color: "#fff" }}
            />
            <button
              onClick={sendChatMessage}
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
          75%  { transform: scale(1.55); opacity: 0;   }
          100% { transform: scale(1.55); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
