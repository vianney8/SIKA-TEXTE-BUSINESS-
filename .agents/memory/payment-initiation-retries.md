---
name: Payment initiation retries
description: How to handle repeated payment-initiation clicks without blocking webhook reconciliation.
---

Reuse a recent pending payment when the same user, service, amount, phone, country, and merchant start the same checkout again. If historical duplicates already exist, they may be reconciled only when every exact match targets the same account.

**Why:** Mobile users can tap twice or retry after a slow redirect. Separate pending rows then make one valid provider webhook appear ambiguous and prevent account activation.

**How to apply:** Make initiation idempotent for the target and payment details. Continue rejecting webhook matches that span different users or services.

For DNS renewals, an unresolved automatic attempt must remain protected against another debit even after the ordinary retry window or a change of phone number. A missing provider identifier is an **unconfirmed launch**, not proof of either rejection or successful initiation.

**Why:** The DNS interface showed indefinite “Demande en attente” for attempts without provider confirmation. Treating those attempts as failed just to unlock a new checkout could charge a customer twice.

**How to apply:** Show the uncertain outcome explicitly, retain the financial reference, and reconcile verified provider responses or signed callbacks before allowing another charge. A genuine rejected/cancelled/expired attempt should show failure and support durable retry acknowledgement.