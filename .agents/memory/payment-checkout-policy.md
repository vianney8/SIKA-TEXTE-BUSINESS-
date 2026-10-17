---
name: Payment checkout policy
description: User-defined scope for SolvexPay and the simplified versus historical payment presentations.
---

Payment pages must use the pale lavender surrounding the checkout card as a continuous edge-to-edge page background, rather than a colored rectangle inside another white page. Keep the checkout card and input styling distinct.

**Why:** The user requested that the existing outer checkout color cover the entire background on every payment page.

**How to apply:** Apply the same canvas to embedded DNS checkout, payment steps and status screens without changing payment routing or administrator model choices.

The administrator selects the gateway independently for each country using its four choices: SolvexPay, RobotPay, manual deposit, or redirection. A country's choice applies to all its services: account activation, PCS purchases and activation, DNS, updates, and other payment links.

Keep the historical checkout available. The administrator must be able to choose between the simplified common checkout and the old presentation without deleting either.

**Why:** The user explicitly requested global SolvexPay coverage and a short common payment form inspired by their checkout screenshot, while retaining an administrator-controlled old model.

**How to apply:** Treat gateway activation and checkout presentation as separate decisions. A presentation switch must not remove a service's SolvexPay support or prevent an already-started payment from being confirmed.

There must be no global SolvexPay switch or global SolvexPay configuration card controlling these country choices. Mixed modes must work: one country can use the API while another uses manual deposits.

**Why:** The user explicitly replaced the previous global policy with independent country-level activation and asked to remove the global option.

**How to apply:** Treat the saved country mode as authoritative and ignore obsolete global SolvexPay values. Preserve independent presentation selection and recovery of already-started payments after a mode change.

Payment journeys should use the user's reference flow: Demande → Validation → Confirmation. Collect payer name, country, operator and phone together; manual validation shows the exact configured deposit details and existing proof fields, while automatic validation starts the transaction and shows telephone confirmation pending.

**Why:** The user requested the same professional reference design for manual, automatic and manual-review waiting screens, not only the SolvexPay form.

**How to apply:** Preserve service-specific proof/approval rules and the administrator's model choice. For a signed-in customer, keep the account email fixed in the UI and derive it from the session on the server, especially for PCS. Preserve supported guest checkout separately.

Automatic payments must leave the pending screen on their own when the provider confirms completion, rejection, cancellation or expiry; the customer must not have to press a status-check button.

**Why:** The user reported that a rejected SolvexPay transaction stayed on the phone-approval screen until the customer manually checked it.

**How to apply:** Poll without caching, start/check again immediately when the page returns to the foreground or network, and normalize provider terminal statuses. Keep temporary API/network errors retryable instead of treating them as payment failure.

The user names the newly redesigned three-stage experience **Modèle pro**. It must be an additional administrator-selectable presentation, not an overwrite of the historical or simplified choices.

**Why:** The user explicitly asked for a distinct pro option and the ability for the administrator to switch to it.

**How to apply:** Keep gateway enablement separate from model selection, preserve existing saved choices, and apply the pro experience to both manual and automatic payments when selected.

Legacy presentations can explicitly delegate to the common SolvexPay form. That form must check gateway availability, not reject the administrator's presentation choice.

**Why:** A second presentation check blocked DNS and CI automatic payments after the historical flow had intentionally opened the common gateway.

**How to apply:** Select the presentation at the outer checkout boundary only; allow an enabled gateway in any presentation and preserve pending-payment recovery after configuration changes.

Automatic DNS payments must collect country, operator and phone only once, with the pay action starting the transaction directly. Do not prepend a historical form that subsequently opens another payment form.

**Why:** The user reported having to fill out the DNS details again after completing the initial form.

**How to apply:** Route enabled automatic DNS directly into its payment form while retaining the configured model's presentation and the existing manual DNS flow when SolvexPay is disabled.

Payment branding uses the official SIKA logo, the name SIKA TEXTE, a fully visible service title, and the footer “Paiement sécurisé par SIKApay”, not SolvexPay. The user also requests distinct customized operator logos, payment animations, and administrator-editable prices for PCS purchases, PCS activation, DNS and other services.

**Why:** The user explicitly requested these changes together with navigation/return fixes and automatic propagation of price changes throughout the site.

**How to apply:** Preserve administrator-controlled historical/simple/pro choices. Use the existing service prices consistently across checkout and payment links, but never replace an already-created payment's amount with a newly configured tariff. Fixed-amount external provider links require separate provider-side updates.

Do not display the inactive-account withdrawal page while activation data is missing, stale or still being checked.

**Why:** The user repeatedly reports that an activated customer sees the inactive page until manually refreshing.

**How to apply:** Require a fresh successful account-status result before displaying an inactive verdict; show a loading or explicit retry state instead of interpreting absent data as inactive.

Automatic SolvexPay payment forms must warn that transaction fees may be added to the amount debited, using small bold red text near the payment action.

**Why:** The user explicitly requested this notice only for automatic SolvexPay API payments.

**How to apply:** Show it according to the selected country's actual gateway, in historical and unified forms. Do not display it for manual, RobotPay or redirect modes, and do not change the service price.
