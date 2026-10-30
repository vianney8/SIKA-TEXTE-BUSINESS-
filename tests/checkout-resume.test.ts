import test from "node:test";
import assert from "node:assert/strict";
import { resolveCheckoutResume } from "../shared/checkout-resume";
import { getDnsPaymentView } from "../shared/dns-payment-state";

test("API DNS pending opens phone validation, not manual team approval", () => {
  assert.equal(getDnsPaymentView({ status: "pending", paymentMode: "solvexpay" }, false), "automatic-pending");
  assert.equal(getDnsPaymentView({ status: "pending", paymentMode: "manual" }, false), "pending");
  assert.equal(getDnsPaymentView({ status: "completed", paymentMode: "solvexpay" }, false), "completed");
  assert.equal(getDnsPaymentView({ status: "failed", paymentMode: "solvexpay" }, false), "failed");
});

test("a server-owned pending payment resumes without browser storage or a new debit", () => {
  assert.deepEqual(resolveCheckoutResume("server-attempt", null, { status: "pending" }, true), { transactionId: "server-attempt" });
  assert.deepEqual(resolveCheckoutResume("server-attempt", {
    transactionId: "obsolete-attempt", amount: 1, providerAccepted: true,
  }, { status: "pending" }, true), { transactionId: "server-attempt" });
});

test("matching recovery retains the charged amount and provider acceptance", () => {
  const saved = { transactionId: "same-attempt", amount: 3800, currency: "XAF", providerAccepted: true };
  assert.deepEqual(resolveCheckoutResume("same-attempt", saved, { status: "pending" }, true), saved);
  assert.deepEqual(resolveCheckoutResume(undefined, saved), saved);
});

test("acknowledged DNS attempts cannot replace the new retry form", () => {
  assert.equal(resolveCheckoutResume("old", null, {
    status: "unconfirmed", transactionId: "old", retryRequested: true,
  }, true), null);
  assert.equal(resolveCheckoutResume(undefined, {}), null);
});
