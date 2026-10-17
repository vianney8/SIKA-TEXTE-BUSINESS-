import test from "node:test";
import assert from "node:assert/strict";
import { getDnsPaymentView } from "../shared/dns-payment-state";

test("an unseen DNS failure displays the failure screen", () => {
  assert.equal(getDnsPaymentView({ status: "failed", transactionId: "old" }, false), "failed");
});

test("retry acknowledgement survives returning, remounting and reloading", () => {
  const persistedStatus = { status: "failed" as const, transactionId: "old", retryRequested: true };
  assert.equal(getDnsPaymentView(persistedStatus, false), "form");
  assert.equal(getDnsPaymentView(JSON.parse(JSON.stringify(persistedStatus)), false), "form");
});

test("a new failed payment is not hidden by an acknowledged previous failure", () => {
  assert.equal(getDnsPaymentView({ status: "failed", transactionId: "new", retryRequested: false }, false), "failed");
});

test("pending and completed payments take precedence over the retry form", () => {
  for (const status of ["pending", "completed"] as const) {
    assert.equal(getDnsPaymentView({ status, retryRequested: true }, true), status);
  }
});

test("initial payment and loading states remain separate", () => {
  assert.equal(getDnsPaymentView(undefined, false), "loading");
  assert.equal(getDnsPaymentView({ status: "none" }, false), "intro");
  assert.equal(getDnsPaymentView({ status: "none" }, true), "form");
});
