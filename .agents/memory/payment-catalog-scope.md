---
name: Payment catalog scope
description: Constraint on changing the countries and operators shown in payment journeys.
---

Keep the established payment countries unchanged when redesigning payment pages or integrating a gateway. Operator visibility is mode-dependent: RobotPay mode shows only RobotPay-supported networks for that fixed country; manual mode restores the historical operator list.

**Why:** The supported catalog is a product decision, not a direct mirror of every country or operator listed by WestPay.

**How to apply:** Treat UI, checkout-link, webhook, and mobile-layout work as independent from country changes. Never add countries implicitly. Keep separate RobotPay and historical-manual operator lists and choose between them from the configured country payment mode.

For RobotPay operator changes, inspect the live hosted checkout data from an active tokenized payment link rather than relying on assumptions or a generic provider-country list.