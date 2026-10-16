import { test } from "node:test";
import assert from "node:assert/strict";
import { linkManualPaymentAllowed, paymentCustomerEmail } from "../shared/payment-customer";

test("authenticated payment email cannot be overridden by submitted email", () => {
  assert.equal(paymentCustomerEmail("other@example.test", "OWNER@example.test"), "owner@example.test");
  assert.equal(paymentCustomerEmail("", "owner@example.test"), "owner@example.test");
  assert.equal(paymentCustomerEmail(" Guest@example.test "), "guest@example.test");
});

test("manual payment availability follows the configured gateway, not just the link flag", () => {
  const base = { solvexEnabled: false, globalManualEnabled: true, linkManualMode: false,
    countryMode: "manual", country: "bj", operator: "mtn" };
  assert.equal(linkManualPaymentAllowed(base), true);
  assert.equal(linkManualPaymentAllowed({ ...base, countryMode: "solvexpay" }), true);
  assert.equal(linkManualPaymentAllowed({ ...base, solvexEnabled: true }), false);
  assert.equal(linkManualPaymentAllowed({ ...base, globalManualEnabled: false }), false);
  assert.equal(linkManualPaymentAllowed({ ...base, countryMode: "robotpay" }), false);
  assert.equal(linkManualPaymentAllowed({ ...base, country: "ci", operator: "wave", countryMode: "robotpay" }), true);
  assert.equal(linkManualPaymentAllowed({ ...base, countryMode: "redirect", linkManualMode: true }), true);
  assert.equal(linkManualPaymentAllowed({ ...base, countryMode: "redirect", linkManualMode: true, globalManualEnabled: false }), false);
});
