---
name: Agora call quality tuning
description: What actually moves the needle on Agora RTC voice-call quality/reliability in this codebase's admin/user call pages, versus what's already tuned and shouldn't be touched casually.
---

Two levers gave a real, low-risk quality/reliability improvement without touching the existing (carefully tuned) real-time voice pipeline:

1. **Audio bitrate/profile**: `createMicrophoneAudioTrack` / `createCustomAudioTrack` default to Agora's `music_standard` preset if `encoderConfig` isn't passed — noticeably more compressed than it needs to be for a voice call. Passing `encoderConfig: "high_quality"` (mono, ~48kHz/~128kbps) is a one-line change on both the real mic track (user side) and the custom track wrapping the converted-voice output (admin side).

2. **Network resilience**: both call pages only listened for `user-published` / `user-left`, so a transient network blip (wifi handoff, 4G drop) had no visible feedback — the call just went silent until Agora's own reconnection succeeded or timed out. Added an `client.on("connection-state-change", ...)` listener: show a small "Reconnexion réseau…" indicator on `RECONNECTING`, and only actually end the call on `DISCONNECTED` (Agora's own multi-second reconnection attempt is given a chance first, rather than tearing down the call on the first hiccup).

**Why:** these are the two highest-value, lowest-risk changes because they don't touch the ElevenLabs chunked voice-conversion pipeline's timing (see `elevenlabs-voice-conversion.md` / `mediarecorder-chunked-streaming.md`), which has already been tuned against real production symptoms (echo/replay effect, hallucinated speech on silence) — changing its chunk size or concurrency without a specific new symptom is likely to regress it.

**How to apply:** if asked again to "improve call quality," check first whether the ask is about clarity/bitrate (encoderConfig) or drops/reliability (connection-state-change) before reaching for the voice pipeline internals.
