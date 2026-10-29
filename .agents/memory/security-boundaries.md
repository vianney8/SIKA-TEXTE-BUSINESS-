---
name: Administrator and webhook boundaries
description: Why Telegram call links still require a Sika administrator session and shared bot registration belongs to production.
---

An administrator call link is not a substitute for a verified Sika administrator session, even when the link came from Telegram.

**Why:** The user requested protection against unauthorized administrator access across the platform. Keeping convenient channel-only access would leave privileged messages and call controls outside that boundary.

**How to apply:** Preserve administrator checks on both the call page and its server operations. Help an administrator sign in and return to the call rather than reopening these operations anonymously.

Only production may automatically register the shared Telegram bot webhook. The receiving endpoint must authenticate Telegram delivery before processing any message or callback.

**Why:** A development environment can use a different session secret while targeting the production webhook URL. Registering its derived header secret against that URL would make legitimate production deliveries fail.

**How to apply:** Keep development startup from changing the shared bot registration; ensure both automatic and administrator-triggered registration install the delivery secret expected by the receiving environment.
