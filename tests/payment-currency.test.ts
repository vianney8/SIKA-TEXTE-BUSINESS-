import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentCurrency, matchesPaymentCurrency } from "../shared/payment-currency";

test("Cameroon CFA quotes and provider requests use XAF without changing the price", () => {
  assert.equal(paymentCurrency("CM", "XOF"), "XAF");
  assert.equal(paymentCurrency("cm", "xaf"), "XAF");
  for (const country of ["BJ", "CI", "SN", "BF", "TG"]) {
    assert.equal(paymentCurrency(country, "XOF"), "XOF");
    assert.equal(matchesPaymentCurrency(country, "XOF", "XAF"), false);
  }
  assert.equal(paymentCurrency("CM", "USD"), "USD");
});

test("legacy Cameroon CFA label repair does not accept other currency mismatches", () => {
  assert.equal(matchesPaymentCurrency("CM", "XOF", "XAF"), true);
  assert.equal(matchesPaymentCurrency("CM", "XAF", "XAF"), true);
  assert.equal(matchesPaymentCurrency("CM", "XOF", "XOF"), false);
  assert.equal(matchesPaymentCurrency("CM", "XAF", "XOF"), false);
  assert.equal(matchesPaymentCurrency("CM", "USD", "XAF"), false);
  assert.equal(matchesPaymentCurrency("CM", "XOF", "EUR"), false);
});
