---
name: Withdrawal PCS validation
description: Product rule for delayed validation of an inactive PCS code during withdrawal.
---

A withdrawal may be submitted with a PCS code that belongs to the user even when the code is inactive. If it is still inactive one minute after submission, cancel the pending withdrawal, refund the balance, and notify the user with the agreed message. If it becomes active before then, do not cancel it.

Cancellation must remove the withdrawal and its linked transaction from the user's history. Refund the balance directly without adding a refund-history entry. Keep the notification and its three-minute visibility after first being seen on the withdrawal page.

**Why:** The user explicitly corrected the failed-withdrawal/refund-history approach: the withdrawal must be cancelled, removed from user history, and refunded.

**Why:** The user changed the rule: the request should be accepted first, then an inactive code should trigger a delayed cancellation/refund and notification rather than an immediate rejection.

**How to apply:** Keep ownership validation server-side, persist the PCS code identity and a one-minute due time, and make the cancellation/refund/notification atomic. Let saved inactive codes follow the same delayed-check path.
