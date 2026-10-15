---
name: Payment checkout policy
description: User-defined scope for SolvexPay and the simplified versus historical payment presentations.
---

When SolvexPay is enabled for payments, it must apply throughout the site's service payments, not only account activation: PCS purchases and activation, DNS, updates, and other payment links.

Keep the historical checkout available. The administrator must be able to choose between the simplified common checkout and the old presentation without deleting either.

**Why:** The user explicitly requested global SolvexPay coverage and a short common payment form inspired by their checkout screenshot, while retaining an administrator-controlled old model.

**How to apply:** Treat gateway activation and checkout presentation as separate decisions. A presentation switch must not remove a service's SolvexPay support or prevent an already-started payment from being confirmed.
