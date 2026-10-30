---
name: Payment initiation retries
description: How to handle repeated payment-initiation clicks without blocking webhook reconciliation.
---

Reuse a recent pending payment when the same user, service, amount, phone, country, and merchant start the same checkout again. If historical duplicates already exist, they may be reconciled only when every exact match targets the same account.

**Why:** Mobile users can tap twice or retry after a slow redirect. Separate pending rows then make one valid provider webhook appear ambiguous and prevent account activation.

**How to apply:** Make initiation idempotent for the target and payment details. Continue rejecting webhook matches that span different users or services.

For DNS renewals, an unresolved automatic attempt must remain protected against another debit even after the ordinary retry window or a change of phone number. A missing provider identifier is an **unconfirmed launch**, not proof of either rejection or successful initiation.

**Why:** The DNS interface showed indefinite “Demande en attente” for attempts without provider confirmation. Treating those attempts as failed just to unlock a new checkout could charge a customer twice.

**How to apply:** Show the uncertain outcome explicitly and retain the financial reference. Without an explicit retry, keep reconciling verified provider responses or signed callbacks rather than creating another charge automatically.

The user does not want assistance or manual-verification buttons on the uncertain DNS result screen; checking should happen automatically, and the action presented is retry.

**Why:** The user requested a simpler automatic-payment experience rather than an assistance-led resolution.

**How to apply:** Keep automatic status reconciliation, including while the withdrawal page is in the background.

For an unconfirmed DNS launch, the user explicitly requested an active retry **without a warning**, after being told that a late first payment could cause two debits. Do not reinstate a permanently disabled retry button for this state.

**Why:** The user replied “oui sans avertir” when asked whether to permit a new attempt after the uncertain-payment risk was explained.

**How to apply:** Require an explicit, authenticated retry acknowledgement tied to the latest owned attempt before allowing a new checkout. Preserve the original pending financial record for later callbacks; do not relabel it as failed. Opening the retry form must not charge money, and concurrent submissions must reuse a single new attempt.