---
name: Withdrawal PCS eligibility
description: Product rule for the status a PCS code must have before a user can request a withdrawal.
---

A withdrawal may proceed only with a PCS code that belongs to the user and is active at the time of the withdrawal request. This applies to codes typed into the form and codes saved to the user's profile.

**Why:** The user explicitly said an inactive PCS code must never be accepted. Codes can be deactivated after being saved, so checking only when the code is first configured is insufficient.

**How to apply:** Enforce the status check on the server before creating a withdrawal or debiting the balance. A saved inactive code must not bypass the user's code-entry flow.
