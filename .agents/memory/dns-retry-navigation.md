---
name: DNS retry navigation
description: Dismiss a DNS failure permanently for that attempt when the user chooses to retry.
---

After a user sees a DNS-update failure and clicks “Réessayer”, returning without submitting another payment must reopen the retry/payment process, not the same old failure screen.

**Why:** The user explicitly requested that leaving the retry form should not make the previously acknowledged failure reappear.

**How to apply:** Remember acknowledgement per user and failed attempt, including across reloads. Do not create a payment simply by reopening the form, hide a new failure, or override a pending/completed result.
