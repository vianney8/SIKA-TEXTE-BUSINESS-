---
name: WestPay checkout modes
description: Distinguishes WestPay fixed tokenized links from the dynamic merchant checkout.
---

WestPay URLs using `link=…` are dashboard-created payment links whose amount remains fixed by WestPay, even if an `amount` query parameter is added. Variable-price services must use a recognized dynamic merchant slug.

**Why:** A valid tokenized link opened the checkout but displayed 2,500 XOF instead of the 3,400 XOF requested by the application. Using it globally would silently charge incorrect amounts.

**How to apply:** Use tokenized links only for a service whose configured amount exactly matches the WestPay link. For activation, PCS, DNS, and other variable amounts, require the active merchant slug and verify the rendered amount before enabling RobotPay.