---
name: ElevenLabs voice conversion (Speech-to-Speech) integration notes
description: Durable lessons on using ElevenLabs Speech-to-Speech for real-time voice identity replacement in a call feature, and why DSP effects chains can't achieve this.
---

## Why a Web Audio effects chain (EQ/ring-mod/chorus/reverb) cannot satisfy "voice identity replacement"
A DSP effects chain always outputs a mix derived from the original waveform — the source
timbre is mathematically still present underneath any filter, so it remains recognizable no
matter how the parameters are tuned. Genuine identity replacement requires the output to be
fully regenerated audio (a real voice-conversion or STT→TTS pipeline), never a filtered mix of
the original signal.

**How to apply:** if a user asks for a caller's/speaker's voice to be unrecognizable or replaced
with a distinct AI voice, don't reach for Web Audio filters — go straight to a real voice
conversion or resynthesis API.

## ElevenLabs API keys have scoped permissions
API keys created in the ElevenLabs dashboard can be scoped to specific permissions (e.g.
`voices_read`, speech-to-speech). A key without the right scope returns
`{"type":"authentication_error","code":"unauthorized","message":"...missing the permission ..."}`
even though the key itself is valid. When creating a key for a project needing multiple
capabilities (list voices + speech-to-speech conversion), select "All"/full access permissions,
or explicitly enable each needed scope.

## Real-time-ish Speech-to-Speech pipeline pattern used here
Architecture for converting one side of a live call to a different AI voice, with zero mixing of
raw + processed audio:
- Client captures the source mic via `MediaRecorder` in short chunks (~1.2s, `audio/webm;codecs=opus`).
- Each chunk is POSTed as multipart form-data to a server proxy endpoint, which calls
  `POST https://api.elevenlabs.io/v1/speech-to-speech/{voice_id}` with the ElevenLabs API key
  server-side (never exposed to the client) and `model_id: eleven_multilingual_sts_v2`.
- The returned MP3 is decoded client-side (`AudioContext.decodeAudioData`) and scheduled onto a
  `MediaStreamAudioDestinationNode` with sequential back-to-back playback timing (a `nextPlayTime`
  cursor) — that node's output track is the *only* track published (e.g. to Agora), so the raw
  mic track is never sent anywhere.
- Observed latency in this project: ~2s round trip per ~1.2s chunk (chunking + network + ElevenLabs
  processing) — plan for a few seconds of added call latency; this is inherent to chunk-based
  cloud STS, not a bug. True sub-300ms full-duplex conversion would need a self-hosted
  GPU-based neural VC model, which isn't available as a simple hosted API.
