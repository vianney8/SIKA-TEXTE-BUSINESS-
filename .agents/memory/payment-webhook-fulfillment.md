---
name: Payment webhook fulfillment
description: Integrity rules for matching provider webhooks and completing the paid service.
---

Treat a signed payment confirmation and its service fulfillment as one idempotent operation. Normalize provider field aliases and regional phone/country formats, but retain strict signature, amount, merchant, and target checks. Mark the payment completed only after the database-side action succeeds.

**Why:** Providers can send equivalent values in different shapes or local formats. Separately, recording completion before activation or PCS issuance makes a transient failure permanent because retries see an already-completed payment and skip the missing action.

**How to apply:** Claim pending work atomically, perform database fulfillment in the same transaction where possible, and finish with completed status. Keep email and Telegram delivery observable but separate from the paid entitlement.