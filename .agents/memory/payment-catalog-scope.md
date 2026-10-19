---
name: Payment catalog scope
description: Constraint on changing the countries and operators shown in payment journeys.
---

Keep the established payment countries unchanged when redesigning payment pages or integrating a gateway. Operator visibility is mode-dependent: RobotPay mode shows only RobotPay-supported networks for that fixed country; manual mode restores the historical operator list.

**Why:** The supported catalog is a product decision, not a direct mirror of every country or operator listed by WestPay.

**How to apply:** Treat UI, checkout-link, webhook, and mobile-layout work as independent from country changes. Never add countries implicitly. Keep separate RobotPay and historical-manual operator lists and choose between them from the configured country payment mode.

For RobotPay operator changes, use the user's confirmed product catalog as the source of truth. A live checkout bundle may expose additional provider options that should not automatically appear in SIKA TEXTE.

The user explicitly requested adding Celtis for Bénin and Expresso for Sénégal to the site's payment catalog.

**Why:** User-specified additions to the supported operator catalog, not an invitation to add other countries or networks.

**How to apply:** Include these operators in SolvexPay and historical forms, server validation and administrator controls. Do not assume this establishes support by another payment provider.

Orange Burkina Faso must request a payment OTP and explicitly instruct customers to dial #144# to obtain it; Orange Sénégal must not request one. Keep the existing Côte d’Ivoire requirement unchanged.

**Why:** The user explicitly requested moving the Orange OTP section from Sénégal to Burkina Faso and specified #144# after the initial instructions omitted it.

**How to apply:** Keep this rule consistent across automatic payment forms and server checks for every service. Do not apply it to manual deposits or infer changes to other gateways.