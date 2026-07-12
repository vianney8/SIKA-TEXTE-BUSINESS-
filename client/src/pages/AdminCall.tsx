import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Mic, MicOff, PhoneOff, Loader2, Bot } from "lucide-react";
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack } from "agora-rtc-sdk-ng";

type AdminCallState = "connecting" | "waiting" | "active" | "ended" | "error";

// ── Effet "voix robot" : ring modulation + distorsion + filtrage ───────────
// Transforme le flux micro brut en une voix robotique/métallique en temps réel
// via Web Audio API, sans dépendance externe.
function buildRobotAudioTrack(rawStream: MediaStream): { track: MediaStreamTrack; ctx: AudioContext } {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const source = ctx.createMediaStreamSource(rawStream);

  // Porteuse de modulation en anneau (donne le côté "métallique/robot")
  const carrier = ctx.createOscillator();
  carrier.type = "sine";
  carrier.frequency.value = 45;
  carrier.start();

  const ringGain = ctx.createGain();
  ringGain.gain.value = 0;
  carrier.connect(ringGain.gain);

  // Légère distorsion pour renforcer le côté synthétique
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i * 2) / 1024 - 1;
    curve[i] = ((3 + 12) * x * 20 * Math.PI / 180) / (Math.PI + 12 * Math.abs(x));
  }
  shaper.curve = curve;
  shaper.oversample = "4x";

  // Filtrage pour un son plus "électronique"
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 3200;

  const destination = ctx.createMediaStreamDestination();

  source.connect(ringGain);
  ringGain.connect(shaper);
  shaper.connect(lowpass);
  lowpass.connect(destination);

  return { track: destination.stream.getAudioTracks()[0], ctx };
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

  const hasJoined = useRef(false);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const rawStreamRef      = useRef<MediaStream | null>(null);
  const robotTrackRef     = useRef<ILocalAudioTrack | null>(null);
  const robotCtxRef       = useRef<AudioContext | null>(null);
  const timerRef  = useRef<any>(null);

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

            <div className="flex flex-col items-center gap-2">
              <button
                disabled
                className="w-16 h-16 rounded-full flex items-center justify-center cursor-default"
                style={{ background: "rgba(139,92,246,0.22)", border: "1px solid rgba(139,92,246,0.4)" }}
              >
                <Bot className="w-6 h-6 text-violet-300" />
              </button>
              <span className="text-slate-600 text-[11px]">Voix robot</span>
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
