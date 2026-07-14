---
name: Call/chat polling patterns (no websockets)
description: How typing indicators and call-decline signaling are done in the Agora call + chat feature, which has no websocket channel.
---

This app's call/chat system (Agora audio calls with a text side-channel between user and admin, admin side reached via an unguessable signed link, no auth) has no websocket layer — everything is short-interval polling (~1s) against Postgres-backed state on the `calls` row.

**Typing indicator**: each side stamps a timestamp column (`user_typing_at` / `admin_typing_at`) on `calls`, throttled client-side to ~once per 1.5s while typing. The existing messages-polling endpoint returns whether the other side's timestamp is "recent" (<3s old) as a boolean; the timestamp is cleared to NULL when that side actually sends a message.
**Why:** avoids adding a new channel/table and auto-expires without needing an explicit "stopped typing" event — simplest fit for an already-polling architecture.

**Admin decline via Telegram**: the incoming-call Telegram message has two inline buttons — a URL button to join the call, and a `callback_data: decline_call:<channelName>` button. The webhook handler updates `calls.status = 'declined'` (only if still `'pending'`, so it can't clobber an already-answered call) and edits the Telegram message. The user side detects this via a dedicated 1s poll of `/api/calls/status` while in the "ringing" state (separate from the chat-messages poll, since the messages endpoint's `getActiveRoomForUser` helper excludes non-pending/active statuses and would go blank on decline) and shows a "Ligne occupée" state.
**How to apply:** if adding more admin actions from Telegram that need to reach the user's browser mid-call, follow the same pattern — mutate the `calls` row and let a client poll observe it — rather than introducing a new transport.
