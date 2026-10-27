---
name: Group data isolation
description: Privacy and deployment constraints for future discussion transport and legacy-data migrations.
---

Private group content must not be sent through the site's shared, public invalidation stream. Message delivery must retain server-side session and membership checks, plus durable catch-up.

**Why:** the existing invalidation channel has no per-member recipients, and an in-process event bus alone cannot guarantee delivery across Render instances.

**How to apply:** any future SSE or WebSocket optimization must authorize each subscription and retain a database-backed way to recover missed messages. Never add private message payloads to a global broadcast.

Do not automatically expose legacy messages that have no trustworthy group identity in the official or newly created groups.

**Why:** assigning them to a group without reliable provenance could expose one conversation to unrelated members.

**How to apply:** preserve such data separately until its ownership can be established before any migration.
