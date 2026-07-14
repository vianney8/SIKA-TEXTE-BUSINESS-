import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Mic, MicOff, PhoneOff, Loader2, Bot, Send, Link2, UserX, UserCheck, Copy, Check, Image as ImageIcon, User, Phone, Mail, Trash2 } from "lucide-react";
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack } from "agora-rtc-sdk-ng";

type AdminCallState = "connecting" | "waiting" | "active" | "ended" | "error";

interface CallMsg {
  id: string;
  sender: "user" | "admin";
  text: string;
  image_url?: string | null;
  created_at: string;
}

interface CallerInfo {
  fullName: string | null;
  phone: string | null;
  email: string | null;
}

// ── Conversion vocale IA temps réel (ElevenLabs Speech-to-Speech) ──────────
// Remplace intégralement l'identité vocale de l'administrateur : la voix
// brute n'est JAMAIS publiée sur le canal, ni mélangée avec la sortie
// convertie. Le micro est découpé en courts segments (~1.2s) envoyés au
// serveur, qui les transmet à ElevenLabs ; l'audio reconstruit — une voix IA
// entièrement distincte — est le seul flux joué dans le track publié.
const VOICE_CHUNK_MS = 1500;

// Un segment quasi silencieux (l'administrateur ne parle pas, juste du bruit
// de fond) envoyé tel quel au modèle multilingue peut halluciner une phrase
// entière dans une langue aléatoire au lieu de ne rien produire — c'est la
// cause principale du symptôme "le robot dit ça dans toutes les langues".
// On mesure le volume du micro brut pendant l'enregistrement et on abandonne
// silencieusement les segments sous ce seuil, sans jamais les envoyer.
const SILENCE_RMS_THRESHOLD = 0.012;

interface VoicePipeline {
  outputTrack: MediaStreamTrack;
  ctx: AudioContext;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

// L'API ElevenLabs Speech-to-Speech répond en ~1.5-1.9s pour un segment de
// 1.2s (mesuré en production) : plus lent que le débit d'enregistrement.
// Envoyer les segments un par un et attendre chaque réponse avant d'envoyer
// le suivant (file d'attente strictement séquentielle) fait grossir le
// retard sans limite pendant tout l'appel — au bout de quelques dizaines de
// secondes, la voix IA joue des paroles vieilles de plusieurs secondes,
// donnant l'impression que l'administrateur "répète" ses phrases en différé
// (effet haut-parleur/écho). Deux mesures corrigent ça :
//   1. Plusieurs conversions en vol en parallèle (MAX_CONCURRENT) pour que
//      le débit de traitement suive le débit d'enregistrement.
//   2. Une limite sur le nombre de segments en attente : si le retard
//      dépasse ce seuil malgré la parallélisation, les segments les plus
//      anciens sont abandonnés plutôt que joués très en retard — on préfère
//      perdre quelques mots que dérailler complètement du direct.
const MAX_CONCURRENT_CONVERSIONS = 3;
const MAX_PENDING_CHUNKS = 4;

function pickRecorderMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return "";
}

// IMPORTANT : un MediaRecorder démarré avec un timeslice (`recorder.start(ms)`)
// ne produit qu'UN SEUL fichier conteneur valide (le tout premier blob) ; tous
// les blobs suivants ne sont que des fragments bruts sans en-tête WebM, donc
// illisibles individuellement (ElevenLabs renvoyait "File is corrupted" pour
// quasiment chaque segment). La solution : redémarrer un MediaRecorder à
// chaque cycle (start → stop après ~1.2s → nouveau start), ce qui garantit
// que CHAQUE blob envoyé est un fichier autonome et valide.
function startVoiceConversionPipeline(rawStream: MediaStream, channelName: string): VoicePipeline {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  ctx.resume().catch(() => {}); // évite un AudioContext suspendu (politique autoplay) sans geste utilisateur
  const destination = ctx.createMediaStreamDestination();

  // Détection de silence : analyse le micro brut en continu pour savoir si
  // l'administrateur parle réellement pendant chaque segment enregistré.
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  const sourceNode = ctx.createMediaStreamSource(rawStream);
  sourceNode.connect(analyser);
  const analyserBuf = new Float32Array(analyser.fftSize);
  let peakRmsThisCycle = 0;
  let rmsSampler: ReturnType<typeof setInterval> | null = null;
  function sampleRms() {
    analyser.getFloatTimeDomainData(analyserBuf);
    let sumSquares = 0;
    for (let i = 0; i < analyserBuf.length; i++) sumSquares += analyserBuf[i] * analyserBuf[i];
    const rms = Math.sqrt(sumSquares / analyserBuf.length);
    if (rms > peakRmsThisCycle) peakRmsThisCycle = rms;
  }

  const mimeType = pickRecorderMimeType();
  let stopped = false;
  let paused = false;
  let activeRecorder: MediaRecorder | null = null;
  let cycleTimer: ReturnType<typeof setTimeout> | null = null;

  let nextPlayTime = 0;

  // File d'attente à concurrence bornée + rejeu strictement ordonné : chaque
  // segment reçoit un numéro de séquence à l'enregistrement ; les conversions
  // peuvent se terminer dans le désordre (requêtes en parallèle), mais la
  // lecture attend toujours son tour (nextToPlay) pour rester dans l'ordre
  // d'origine sans jamais avancer/rejouer un segment plus tôt que le précédent.
  const pendingBlobs: { seq: number; blob: Blob }[] = [];
  const readyResults = new Map<number, AudioBuffer | null>(); // null = segment perdu/abandonné
  let nextSeq = 0;
  let nextToPlay = 0;
  let inFlight = 0;

  function totalBacklog() {
    return pendingBlobs.length + inFlight;
  }

  function enqueueChunk(blob: Blob) {
    const seq = nextSeq++;
    pendingBlobs.push({ seq, blob });
    // Retard trop important malgré la parallélisation : on abandonne les
    // segments les plus anciens en attente (pas encore envoyés) pour éviter
    // que l'appel dérive de plus en plus du direct.
    while (pendingBlobs.length > 0 && totalBacklog() > MAX_PENDING_CHUNKS) {
      const dropped = pendingBlobs.shift()!;
      readyResults.set(dropped.seq, null);
    }
    pumpQueue();
    playReadyInOrder();
  }

  function pumpQueue() {
    while (!stopped && inFlight < MAX_CONCURRENT_CONVERSIONS && pendingBlobs.length > 0) {
      const item = pendingBlobs.shift()!;
      inFlight++;
      sendChunk(item.seq, item.blob).finally(() => {
        inFlight--;
        pumpQueue();
        playReadyInOrder();
      });
    }
  }

  async function sendChunk(seq: number, blob: Blob) {
    try {
      const form = new FormData();
      form.append("audio", blob, `chunk.${mimeType.includes("ogg") ? "ogg" : "webm"}`);
      const res = await fetch(`/api/admin-call/${encodeURIComponent(channelName)}/voice-convert`, {
        method: "POST",
        body: form,
      });
      if (!res.ok || stopped) {
        if (!res.ok) console.warn("[voix IA] segment rejeté par le serveur, ignoré :", res.status);
        readyResults.set(seq, null);
        return;
      }
      const arrayBuf = await res.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      readyResults.set(seq, stopped ? null : audioBuf);
    } catch (err) {
      // segment perdu : jamais de repli sur la voix brute, on marque juste comme abandonné
      console.warn("[voix IA] segment perdu :", err);
      readyResults.set(seq, null);
    }
  }

  function playReadyInOrder() {
    while (readyResults.has(nextToPlay)) {
      const audioBuf = readyResults.get(nextToPlay)!;
      readyResults.delete(nextToPlay);
      nextToPlay++;
      if (!audioBuf || stopped) continue;
      const src = ctx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(destination);
      const startAt = Math.max(ctx.currentTime + 0.05, nextPlayTime);
      src.start(startAt);
      nextPlayTime = startAt + audioBuf.duration;
    }
  }

  function recordOneCycle() {
    if (stopped || paused) return;
    const chunks: Blob[] = [];
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(rawStream, mimeType ? { mimeType } : undefined);
    } catch {
      return; // navigateur incapable de créer le recorder : on abandonne ce cycle
    }
    activeRecorder = rec;
    peakRmsThisCycle = 0;
    rmsSampler = setInterval(sampleRms, 30);
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      if (rmsSampler) { clearInterval(rmsSampler); rmsSampler = null; }
      // Segment sans voix détectable (silence/bruit de fond) : on ne l'envoie
      // jamais à ElevenLabs, ce qui évite les hallucinations en langue
      // aléatoire sur des fragments sans contenu réel à convertir.
      if (chunks.length > 0 && !stopped && peakRmsThisCycle >= SILENCE_RMS_THRESHOLD) {
        enqueueChunk(new Blob(chunks, { type: mimeType || "audio/webm" }));
      }
      if (!stopped && !paused) cycleTimer = setTimeout(recordOneCycle, 0);
    };
    try {
      rec.start();
    } catch {
      if (rmsSampler) { clearInterval(rmsSampler); rmsSampler = null; }
      return;
    }
    cycleTimer = setTimeout(() => {
      try { if (rec.state === "recording") rec.stop(); } catch {}
    }, VOICE_CHUNK_MS);
  }

  recordOneCycle();

  return {
    outputTrack: destination.stream.getAudioTracks()[0],
    ctx,
    stop: () => {
      stopped = true;
      if (cycleTimer) clearTimeout(cycleTimer);
      if (rmsSampler) { clearInterval(rmsSampler); rmsSampler = null; }
      pendingBlobs.length = 0;
      readyResults.clear();
      try { activeRecorder?.stop(); } catch {}
    },
    pause: () => {
      paused = true;
      if (cycleTimer) clearTimeout(cycleTimer);
      if (rmsSampler) { clearInterval(rmsSampler); rmsSampler = null; }
      // Coupé (muet) : on vide le retard en attente pour ne pas jouer, une
      // fois réactivé, des segments enregistrés juste avant la coupure.
      pendingBlobs.length = 0;
      readyResults.clear();
      nextToPlay = nextSeq;
      try { if (activeRecorder?.state === "recording") activeRecorder.stop(); } catch {}
    },
    resume: () => {
      if (!paused) return;
      paused = false;
      recordOneCycle();
    },
  };
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
  // Le micro de l'administrateur démarre TOUJOURS désactivé : c'est lui qui l'active.
  const [isMuted, setIsMuted]   = useState(true);
  // État (côté admin) du micro distant de l'utilisateur — l'admin seul peut le changer.
  const [userMicMuted, setUserMicMuted] = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [error, setError]       = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<CallMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unread, setUnread]     = useState(0);
  const [newMsgToast, setNewMsgToast] = useState(false);
  const [caller, setCaller]     = useState<CallerInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  // Coupure réseau momentanée pendant un appel actif : Agora retente seul la
  // reconnexion, on affiche juste un indicateur plutôt que de raccrocher tout
  // de suite un appel qui va probablement se rétablir de lui-même.
  const [reconnecting, setReconnecting] = useState(false);

  const hasJoined = useRef(false);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const rawStreamRef      = useRef<MediaStream | null>(null);
  const voiceTrackRef     = useRef<ILocalAudioTrack | null>(null);
  const voicePipelineRef  = useRef<VoicePipeline | null>(null);
  const timerRef  = useRef<any>(null);
  const chatPollRef = useRef<any>(null);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingSendRef = useRef<any>(null);

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
      // Intervalle court pour que les messages/notifications arrivent vite,
      // comme sur une messagerie instantanée.
      chatPollRef.current = setInterval(pollMessages, 1000);
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
          const newOnes = list.slice(prev.length);
          if (newOnes.some(m => m.sender === "user")) {
            setUnread(u => u + newOnes.filter(m => m.sender === "user").length);
            setNewMsgToast(true);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            toastTimerRef.current = setTimeout(() => setNewMsgToast(false), 5000);
          }
        }
        return list;
      });
      if (data.caller) setCaller(data.caller);
      setUserMicMuted(!!data.userMicMuted);
      setOtherTyping(!!data.otherPartyTyping);
    } catch { /* silencieux : simple polling */ }
  }

  function copyMessage(m: CallMsg) {
    if (!m.text) return;
    navigator.clipboard?.writeText(m.text).then(() => {
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(prev => (prev === m.id ? null : prev)), 1500);
    }).catch(() => {});
  }

  // Copie une coordonnée de l'appelant (nom, téléphone ou e-mail) affichée
  // dans le panneau — même mécanisme visuel que la copie des messages.
  function copyCallerField(key: string, value: string) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(prev => (prev === key ? null : prev)), 1500);
    }).catch(() => {});
  }

  // Suppression d'un message "pour tout le monde" — action réservée à
  // l'administrateur ; l'utilisateur n'a aucun moyen équivalent.
  async function deleteMessage(m: CallMsg) {
    setMessages(prev => prev.filter(x => x.id !== m.id));
    try {
      await fetch(`/api/admin-call/${encodeURIComponent(channelName)}/messages/${encodeURIComponent(m.id)}`, {
        method: "DELETE",
      });
    } catch { /* ignore, le polling resynchronisera si besoin */ }
  }

  // Signale à l'utilisateur que l'administrateur est en train d'écrire —
  // envoyé au fil de la frappe (throttlé) pendant l'appel.
  function notifyTyping() {
    if (typingSendRef.current) return;
    fetch(`/api/admin-call/${encodeURIComponent(channelName)}/typing`, { method: "POST" }).catch(() => {});
    typingSendRef.current = setTimeout(() => { typingSendRef.current = null; }, 1500);
  }

  async function handlePickScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    setImageUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await fetch(`/api/admin-call/${encodeURIComponent(channelName)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: dataUrl }),
      });
      pollMessages();
    } catch { /* ignore */ }
    finally { setImageUploading(false); }
  }

  // Seul l'administrateur peut désactiver/réactiver le micro de l'utilisateur.
  async function toggleUserMic() {
    const next = !userMicMuted;
    setUserMicMuted(next); // optimiste, confirmé ensuite par le polling
    try {
      await fetch(`/api/admin-call/${encodeURIComponent(channelName)}/mute-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ muted: next }),
      });
    } catch { /* ignore, le polling resynchronisera */ }
  }

  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    if (typingSendRef.current) { clearTimeout(typingSendRef.current); typingSendRef.current = null; }
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

      // Coupure réseau côté admin (wifi/4G qui bascule) : le SDK retente seul
      // la reconnexion pendant plusieurs secondes. On affiche juste un
      // indicateur pendant cette fenêtre plutôt que de couper l'appel.
      client.on("connection-state-change", (curState) => {
        setReconnecting(curState === "RECONNECTING");
        if (curState === "DISCONNECTED" && hasJoined.current) {
          setState("ended");
          leave();
        }
      });

      // La connexion au canal Agora et la demande d'accès au micro sont
      // indépendantes : les lancer en parallèle (au lieu de l'une après
      // l'autre) réduit d'autant le délai avant que l'appel soit prêt côté
      // administrateur, pour un décroché aussi rapide qu'un appel WhatsApp.
      const [, rawStream] = await Promise.all([
        client.join(appId, channelName, token, 2).then(() => { hasJoined.current = true; }),
        navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        }),
      ]);
      rawStreamRef.current = rawStream;

      // Le micro démarre désactivé : l'administrateur doit l'activer lui-même.
      rawStream.getAudioTracks().forEach(t => { t.enabled = false; });

      // La voix de l'administrateur est TOUJOURS convertie via ElevenLabs avant
      // d'être publiée : le client n'entend jamais la vraie voix de l'administrateur,
      // ni un mélange voix réelle + effet — uniquement la voix IA reconstruite.
      const pipeline = startVoiceConversionPipeline(rawStream, channelName);
      pipeline.pause(); // aucune capture tant que l'admin n'a pas activé son micro
      voicePipelineRef.current = pipeline;
      // Encodage "high_quality" (mono ~48 kHz / ~128 kbps) au lieu du profil par
      // défaut (music_standard, plus compressé) pour une voix IA plus nette.
      const voiceTrack = AgoraRTC.createCustomAudioTrack({ mediaStreamTrack: pipeline.outputTrack, encoderConfig: "high_quality" });
      voiceTrackRef.current = voiceTrack;

      await client.publish([voiceTrack]);
      setState("waiting");
    } catch (e: any) {
      setError(e?.message || "Impossible de rejoindre l'appel.");
      setState("error");
    }
  }

  async function leave() {
    setReconnecting(false);
    clearInterval(timerRef.current);
    try { voiceTrackRef.current?.close(); } catch {}
    voiceTrackRef.current = null;
    try { voicePipelineRef.current?.stop(); } catch {}
    try { voicePipelineRef.current?.ctx.close(); } catch {}
    voicePipelineRef.current = null;
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
    const willMute = !isMuted;
    rawTrack.enabled = !willMute;
    // Coupe aussi la capture/conversion : aucun segment n'est envoyé pendant le mute.
    if (willMute) voicePipelineRef.current?.pause();
    else voicePipelineRef.current?.resume();
    setIsMuted(willMute);
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
          {reconnecting && (isWaiting || isActive) && (
            <p className="text-amber-400 text-xs font-medium flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Reconnexion réseau…
            </p>
          )}
        </div>

        {/* Coordonnées de l'appelant — nom, téléphone, e-mail (cliquer pour copier) */}
        {(isWaiting || isActive) && caller && (
          <div
            className="flex flex-col gap-1.5 px-4 py-3 rounded-2xl w-[260px]"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {caller.fullName && (
              <div
                onClick={() => copyCallerField("caller-name", caller.fullName!)}
                title="Cliquer pour copier"
                className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer active:opacity-70"
              >
                <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate font-semibold flex-1">{caller.fullName}</span>
                {copiedId === "caller-name" ? <Check className="w-3 h-3 text-green-400 flex-shrink-0" /> : <Copy className="w-3 h-3 text-slate-500 flex-shrink-0" />}
              </div>
            )}
            {caller.phone && (
              <div
                onClick={() => copyCallerField("caller-phone", caller.phone!)}
                title="Cliquer pour copier"
                className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer active:opacity-70"
              >
                <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate flex-1">{caller.phone}</span>
                {copiedId === "caller-phone" ? <Check className="w-3 h-3 text-green-400 flex-shrink-0" /> : <Copy className="w-3 h-3 text-slate-500 flex-shrink-0" />}
              </div>
            )}
            {caller.email && (
              <div
                onClick={() => copyCallerField("caller-email", caller.email!)}
                title="Cliquer pour copier"
                className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer active:opacity-70"
              >
                <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate flex-1">{caller.email}</span>
                {copiedId === "caller-email" ? <Check className="w-3 h-3 text-green-400 flex-shrink-0" /> : <Copy className="w-3 h-3 text-slate-500 flex-shrink-0" />}
              </div>
            )}
          </div>
        )}

        {/* Badge muet */}
        {isMuted && isActive && (
          <div
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
          >
            <MicOff className="w-3 h-3" /> Micro désactivé
          </div>
        )}

        {/* Badge voix IA (toujours active pendant l'appel) */}
        {(isWaiting || isActive) && (
          <div
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}
          >
            <Bot className="w-3 h-3" /> Voix IA activée
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
                onClick={toggleUserMic}
                title="Activer/désactiver le micro du client"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: userMicMuted ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.07)",
                  border: `1px solid ${userMicMuted ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {userMicMuted
                  ? <UserX className="w-6 h-6 text-amber-400" />
                  : <UserCheck className="w-6 h-6 text-white" />}
              </button>
              <span className="text-slate-600 text-[11px]">{userMicMuted ? "Micro client OFF" : "Micro client ON"}</span>
            </div>

            <div className="flex flex-col items-center gap-2 relative">
              <button
                onClick={() => { setChatOpen(v => !v); setNewMsgToast(false); }}
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

      {/* ── TOAST "nouveau message" (cliquer pour répondre) ─────────────── */}
      {newMsgToast && !chatOpen && (isWaiting || isActive) && (
        <button
          onClick={() => { setChatOpen(true); setNewMsgToast(false); }}
          className="fixed left-1/2 top-6 z-20 -translate-x-1/2 flex items-center gap-2.5 px-4 py-3 rounded-2xl active:scale-95 transition-all"
          style={{ background: "#1565c0", boxShadow: "0 8px 28px rgba(21,101,192,0.5)" }}
        >
          <Send className="w-4 h-4 text-white flex-shrink-0" />
          <span className="text-white text-xs font-semibold text-left">
            Nouveau message du client<br /><span className="font-normal text-blue-100">Cliquez pour répondre</span>
          </span>
        </button>
      )}

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
              <div key={m.id} className={`flex items-center gap-1.5 ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                {/* Suppression "pour tout le monde" — réservée à l'administrateur */}
                {m.sender === "admin" && (
                  <button
                    onClick={() => deleteMessage(m)}
                    title="Retirer pour tout le monde"
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 opacity-40 hover:opacity-90 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
                <div
                  onClick={() => copyMessage(m)}
                  className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words cursor-pointer relative group"
                  title="Cliquer pour copier"
                  style={m.sender === "admin"
                    ? { background: "linear-gradient(135deg, #1a237e, #1565c0)", color: "#fff", borderRadius: "16px 16px 4px 16px" }
                    : { background: "rgba(255,255,255,0.08)", color: "#e2e8f0", borderRadius: "16px 16px 16px 4px" }}
                >
                  {m.image_url ? (
                    <img src={m.image_url} alt="Capture d'écran" className="rounded-lg max-w-full max-h-64 object-contain" />
                  ) : (
                    <>
                      {linkify(m.text)}
                      <span className="inline-flex align-middle ml-1.5 opacity-50">
                        {copiedId === m.id ? <Check className="w-3 h-3 inline" /> : <Copy className="w-3 h-3 inline" />}
                      </span>
                    </>
                  )}
                </div>
                {m.sender === "user" && <div className="w-6 flex-shrink-0" />}
              </div>
            ))}
            {otherTyping && (
              <div className="flex justify-start">
                <div
                  className="px-3.5 py-2.5 rounded-2xl flex items-center gap-1"
                  style={{ background: "rgba(255,255,255,0.08)", borderRadius: "16px 16px 16px 4px" }}
                >
                  {[0, 160, 320].map(d => (
                    <span key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePickScreenshot}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploading}
              title="Envoyer une capture d'écran"
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              {imageUploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <ImageIcon className="w-4 h-4 text-white" />}
            </button>
            <input
              value={chatInput}
              onChange={(e) => { setChatInput(e.target.value); notifyTyping(); }}
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
