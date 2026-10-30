import test from "node:test";
import assert from "node:assert/strict";
import { discardAcknowledgedDnsAttempts, getDnsPaymentView, shouldResumeDnsAttempt } from "../shared/dns-payment-state";

test("acknowledging failure clears matching DNS cache aliases, never a different payment", () => {
  const entries = new Map([
    ["sika-checkout:u:dns:eedbc622", JSON.stringify({ transactionId: "failed-attempt" })],
    ["sika-checkout:u:dns:", JSON.stringify({ transactionId: "failed-attempt" })],
    ["sika-checkout:u:link:eedbc622", JSON.stringify({ transactionId: "other-pending" })],
    ["unrelated-storage", JSON.stringify({ transactionId: "failed-attempt" })],
    ["sika-checkout:malformed", "not-json"],
  ]);
  const storage = {
    get length() { return entries.size; },
    key(index: number) { return [...entries.keys()][index] ?? null; },
    getItem(key: string) { return entries.get(key) ?? null; },
    removeItem(key: string) { entries.delete(key); },
  };
  discardAcknowledgedDnsAttempts(storage, { status: "pending", transactionId: "failed-attempt", retryRequested: true });
  assert.equal(entries.size, 5);
  discardAcknowledgedDnsAttempts(storage, { status: "failed", transactionId: "failed-attempt", retryRequested: true });
  assert.equal(entries.has("sika-checkout:u:dns:eedbc622"), false);
  assert.equal(entries.has("sika-checkout:u:dns:"), false);
  assert.equal(entries.has("sika-checkout:u:link:eedbc622"), true);
  assert.equal(entries.has("unrelated-storage"), true);
  assert.equal(entries.has("sika-checkout:malformed"), true);
});

test("a stored rejected DNS attempt cannot reappear after retry acknowledgement", () => {
  const acknowledged = { status: "failed", transactionId: "attempt-a", retryRequested: true } as const;
  assert.equal(shouldResumeDnsAttempt("attempt-a", acknowledged), false);
  assert.equal(shouldResumeDnsAttempt("different-attempt", acknowledged), true);
  assert.equal(shouldResumeDnsAttempt("attempt-a", { ...acknowledged, retryRequested: false }), true);
  assert.equal(shouldResumeDnsAttempt("attempt-a", { ...acknowledged, status: "pending" }), true);
  assert.equal(shouldResumeDnsAttempt("attempt-a", { ...acknowledged, status: "unconfirmed" }), false);
  assert.equal(shouldResumeDnsAttempt("attempt-a", undefined), true);
});

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
