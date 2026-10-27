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

The principal discussion administrator must remain tied to the authorized account's stable identity. An email is suitable for initial discovery, not for continually granting authority.

**Why:** profile emails and display names are mutable. Reusing an old email or copying a name must never transfer ownership.

**How to apply:** preserve the pinned principal identity across restarts and account edits. A replacement owner needs an explicitly authorized transfer, not an automatic email lookup.

Leaving or being removed from a group ends secondary administrative rights; returning is an ordinary membership unless the principal explicitly grants those rights again.

**Why:** preserving old roles on readmission would bypass a removal and restore privileges without fresh approval.

**How to apply:** keep the same rule for direct joins and invitation redemption, and test readmission after both voluntary departure and administrative removal.
