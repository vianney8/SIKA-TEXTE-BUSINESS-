---
name: Payment initiation retries
description: How to handle repeated payment-initiation clicks without blocking webhook reconciliation.
---

Reuse a recent pending payment when the same user, service, amount, phone, country, and merchant start the same checkout again. If historical duplicates already exist, they may be reconciled only when every exact match targets the same account.

**Why:** Mobile users can tap twice or retry after a slow redirect. Separate pending rows then make one valid provider webhook appear ambiguous and prevent account activation.

**How to apply:** Make initiation idempotent for the target and payment details. Continue rejecting webhook matches that span different users or services.