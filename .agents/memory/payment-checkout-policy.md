---
name: Payment checkout policy
description: User-defined scope for SolvexPay and the simplified versus historical payment presentations.
---

When SolvexPay is enabled for payments, it must apply throughout the site's service payments, not only account activation: PCS purchases and activation, DNS, updates, and other payment links.

Keep the historical checkout available. The administrator must be able to choose between the simplified common checkout and the old presentation without deleting either.

**Why:** The user explicitly requested global SolvexPay coverage and a short common payment form inspired by their checkout screenshot, while retaining an administrator-controlled old model.

**How to apply:** Treat gateway activation and checkout presentation as separate decisions. A presentation switch must not remove a service's SolvexPay support or prevent an already-started payment from being confirmed.

Selecting SolvexPay for a country must also enable its global switch, without changing the selected presentation. An explicit global disable must remain possible.

**Why:** Country settings can all show automatic SolvexPay while the global switch is off, leaving the historical pages visible and contradicting the administrator's expectation.

**How to apply:** Synchronize the switch when the administrator selects SolvexPay, and explain the blocking global state beside the presentation choice. Do not infer activation from country settings on every read, as that would override an intentional global disable.

Payment journeys should use the user's reference flow: Demande → Validation → Confirmation. Collect payer name, country, operator and phone together; manual validation shows the exact configured deposit details and existing proof fields, while automatic validation starts the transaction and shows telephone confirmation pending.

**Why:** The user requested the same professional reference design for manual, automatic and manual-review waiting screens, not only the SolvexPay form.

**How to apply:** Preserve service-specific proof/approval rules and the administrator's model choice. For a signed-in customer, keep the account email fixed in the UI and derive it from the session on the server, especially for PCS. Preserve supported guest checkout separately.

The user names the newly redesigned three-stage experience **Modèle pro**. It must be an additional administrator-selectable presentation, not an overwrite of the historical or simplified choices.

**Why:** The user explicitly asked for a distinct pro option and the ability for the administrator to switch to it.

**How to apply:** Keep gateway enablement separate from model selection, preserve existing saved choices, and apply the pro experience to both manual and automatic payments when selected.

Legacy presentations can explicitly delegate to the common SolvexPay form. That form must check gateway availability, not reject the administrator's presentation choice.

**Why:** A second presentation check blocked DNS and CI automatic payments after the historical flow had intentionally opened the common gateway.

**How to apply:** Select the presentation at the outer checkout boundary only; allow an enabled gateway in any presentation and preserve pending-payment recovery after configuration changes.

Automatic DNS payments must collect country, operator and phone only once, with the pay action starting the transaction directly. Do not prepend a historical form that subsequently opens another payment form.

**Why:** The user reported having to fill out the DNS details again after completing the initial form.

**How to apply:** Route enabled automatic DNS directly into its payment form while retaining the configured model's presentation and the existing manual DNS flow when SolvexPay is disabled.

The user requests no “Paiement sécurisé par SolvexPay” attribution on customer payment pages, distinct customized operator logos, payment animations, and administrator-editable prices for PCS purchases, PCS activation, DNS and other services.

**Why:** The user explicitly requested these changes together with navigation/return fixes and automatic propagation of price changes throughout the site.

**How to apply:** Preserve administrator-controlled historical/simple/pro choices. Use the existing service prices consistently across checkout and payment links, but never replace an already-created payment's amount with a newly configured tariff. Fixed-amount external provider links require separate provider-side updates.
