import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Mic, MicOff, PhoneOff, Phone } from "lucide-react";
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

type CallState = "loading" | "waiting" | "active" | "ended" | "error";

export default function AdminCall() {
  const [, params] = useRoute("/admin-call/:channelName/:token");
  const channelName = params?.channelName || "";
  const token = params?.token ? decodeURIComponent(params.token) : "";
  // App ID transmis comme query param (non sensible — clé publique)
  const appIdFromUrl = new URLSearchParams(window.location.search).get("appId") || "";

  const [callState, setCallState] = useState<CallState>("loading");
  const [isMuted, setIsMuted]     = useState(false);
  const [clientJoined, setClientJoined] = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const [errorMsg, setErrorMsg]   = useState("");

  const clientRef  = useRef<IAgoraRTCClient | null>(null);
  const micRef     = useRef<IMicrophoneAudioTrack | null>(null);
  const timerRef   = useRef<any>(null);

  useEffect(() => {
    if (!channelName || !token) {
      setErrorMsg("Lien invalide ou expiré.");
      setCallState("error");
      return;
    }
    joinCall();
    return () => {
      cleanup();
    };
  }, []);

  // Timer
  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  async function joinCall() {
    try {
      const appId = appIdFromUrl;
      if (!appId) throw new Error("App ID manquant dans le lien");

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      // Écouter quand l'utilisateur rejoint
      client.on("user-published", async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === "audio") {
          remoteUser.audioTrack?.play();
          setCallState("active");
        }
      });
      client.on("user-unpublished", () => {
        // L'utilisateur a raccroché
      });
      client.on("user-left", () => {
        setCallState("ended");
        cleanup();
      });

      // Rejoindre le canal (uid 2 = admin)
      await client.join(appId, channelName, token, 2);
      setClientJoined(true);
      setCallState("waiting");

      // Créer et publier le micro
      const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      micRef.current = micTrack;
      await client.publish([micTrack]);
    } catch (err: any) {
      console.error("AdminCall join error:", err);
      setErrorMsg(err?.message || "Impossible de rejoindre l'appel.");
      setCallState("error");
    }
  }

  async function cleanup() {
    clearInterval(timerRef.current);
    if (micRef.current) {
      micRef.current.stop();
      micRef.current.close();
      micRef.current = null;
    }
    if (clientRef.current && clientJoined) {
      try { await clientRef.current.leave(); } catch {}
      clientRef.current = null;
    }
  }

  async function hangUp() {
    await cleanup();
    setCallState("ended");
  }

  async function toggleMute() {
    if (!micRef.current) return;
    if (isMuted) {
      await micRef.current.setMuted(false);
    } else {
      await micRef.current.setMuted(true);
    }
    setIsMuted(!isMuted);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-between py-12 px-6"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)" }}
    >
      {/* Logo + titre */}
      <div className="flex flex-col items-center gap-3 mt-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1a237e 0%, #1565c0 100%)" }}
        >
          <span className="text-white font-black text-xl">SI</span>
        </div>
        <p className="text-slate-400 text-sm font-medium tracking-wide">SIKA TEXTE — Appel Admin</p>
      </div>

      {/* Centre — statut */}
      <div className="flex flex-col items-center gap-6 w-full max-w-xs">
        {/* Avatar animé */}
        <div className="relative">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
          >
            <Phone className="w-12 h-12 text-white" />
          </div>
          {callState === "active" && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ background: "#10b981" }}
            />
          )}
          {callState === "waiting" && (
            <span
              className="absolute inset-0 rounded-full animate-pulse opacity-30"
              style={{ background: "#f59e0b" }}
            />
          )}
        </div>

        {/* Nom affiché */}
        <div className="text-center">
          <p className="text-white font-black text-2xl tracking-tight">Superviseur ADMIN</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            {callState === "loading" && (
              <p className="text-slate-400 text-sm">Connexion…</p>
            )}
            {callState === "waiting" && (
              <>
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <p className="text-amber-400 text-sm font-medium">En attente du client…</p>
              </>
            )}
            {callState === "active" && (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <p className="text-green-400 text-sm font-semibold">{formatTime(elapsed)} — En appel</p>
              </>
            )}
            {callState === "ended" && (
              <p className="text-slate-400 text-sm">Appel terminé</p>
            )}
            {callState === "error" && (
              <p className="text-red-400 text-sm text-center">{errorMsg}</p>
            )}
          </div>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex items-center gap-6">
        {(callState === "waiting" || callState === "active") && (
          <>
            {/* Mute */}
            <button
              onClick={toggleMute}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: isMuted ? "#374151" : "rgba(255,255,255,0.12)" }}
            >
              {isMuted
                ? <MicOff className="w-7 h-7 text-white" />
                : <Mic className="w-7 h-7 text-white" />}
            </button>

            {/* Raccrocher */}
            <button
              onClick={hangUp}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)" }}
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
          </>
        )}

        {callState === "ended" && (
          <button
            onClick={() => window.close()}
            className="px-6 py-3 rounded-2xl text-white font-semibold text-sm"
            style={{ background: "#374151" }}
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );
}
