---
name: Payment catalog scope
description: Constraint on changing the countries and operators shown in payment journeys.
---

Keep the established payment country and operator catalog unchanged when redesigning payment pages or integrating a gateway. Do not infer catalog expansion from provider documentation.

**Why:** The supported catalog is a product decision, not a direct mirror of every country or operator listed by WestPay.

**How to apply:** Treat UI, checkout-link, webhook, and mobile-layout work as independent from catalog changes. Add, remove, or rename countries and operators only when the user explicitly asks.