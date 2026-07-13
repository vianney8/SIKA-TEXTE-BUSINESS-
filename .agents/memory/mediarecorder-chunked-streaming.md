---
name: MediaRecorder chunked streaming to an external STT/STS/transcription API
description: Why per-chunk audio sent from a timeslice-based MediaRecorder gets rejected as "corrupted" by external audio APIs, and the fix.
---

## The bug
`recorder.start(timesliceMs)` makes `ondataavailable` fire repeatedly, but only the
**first** emitted blob is a complete, self-contained container file (it carries the
WebM/Ogg header). Every subsequent blob is a raw continuation fragment with no
header — it is not independently decodable. Posting each blob as its own "file" to
an external API (ElevenLabs speech-to-speech, Whisper, etc.) makes every chunk
after the first fail with something like "File is corrupted / not playable audio",
silently killing the whole real-time pipeline (e.g. an admin call's voice output
stays permanently silent) while local dev/curl tests with one full recording still
pass.

**Why:** container formats (WebM/Ogg) put format metadata once at the start of the
stream; splitting by timeslice does not repeat that header per chunk.

**How to apply:** for real-time chunked delivery to a stateless HTTP endpoint that
expects one complete file per request, don't use `start(timesliceMs)`. Instead
restart a fresh `MediaRecorder` per chunk: `start()` → after N ms call `stop()`
(which finalizes a valid, independently-decodable file in `onstop`) → immediately
start a new recorder for the next cycle. Slightly more overhead per cycle, but
every blob sent is now decodable on its own. Only use `start(timesliceMs)` when
the destination itself understands the continuous container stream (e.g. it's fed
into another `MediaSource`/decoder that expects the full ongoing stream, not
one-shot files).
