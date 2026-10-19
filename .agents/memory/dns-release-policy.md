---
name: DNS release publication policy
description: Administrator-controlled DNS versions, obsolete approvals and recurring withdrawal notices.
---

Publishing a new named DNS version includes an administrator-reviewed, editable announcement prefilled with that version. Previous successful DNS updates become obsolete without deleting or rewriting their payment history.

**Why:** The user requested version changes such as v.025 to v.025.2, notifications for users who previously updated, and an obsolete-server page leading back to the existing update/payment process.

**How to apply:** Keep publication separate from ordinary settings saves. Match approvals to the currently published version, not merely to any successful DNS payment.

The announcement appears on each new visit to the withdrawal page until the user's new DNS update is approved. “OK” dismisses it only for the current visit, not permanently.

**Why:** The user explicitly requested a recurring popup with an OK dismissal each time they open the withdrawal page.

**How to apply:** Preserve dismissal through background polling for that visit, but reset it when the user leaves and returns. A new release can show its own announcement.

Pending payments accepted after publication receive the current version when first approved. Rewriting an already-completed payment to the same status must not silently upgrade an obsolete approval.

**Why:** A version publication must not force a customer with a payment already in flight to pay twice. Existing approved purchases must still become obsolete when a subsequent release is published.

**How to apply:** Keep version assignment consistent across manual review and all automatic gateways; status callbacks and repeated webhooks must not upgrade a historical completed receipt.
