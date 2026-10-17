import { test } from "node:test";
import assert from "node:assert/strict";
import { serviceAmount, linkedPriceIds, matchesServiceQuote } from "../shared/service-pricing";

test("service prices accept positive decimal amounts only", () => {
  for (const value of [0, -1, "", "NaN", "Infinity", "12abc", "2e3", null, {}, "1.234", 1e13]) {
    assert.equal(serviceAmount(value), null, String(value));
  }
  assert.equal(serviceAmount("5240"), "5240.00");
  assert.equal(serviceAmount(" 3400.50 "), null);
  assert.equal(serviceAmount(" 3400.50 ", "USD"), "3400.50");
  assert.equal(serviceAmount(1200), "1200.00");
});

test("PCS purchase aliases share a tariff; other services stay independent", () => {
  assert.deepEqual(linkedPriceIds("codepcs"), ["codepcs", "d3e5479d"]);
  assert.deepEqual(linkedPriceIds("d3e5479d"), ["codepcs", "d3e5479d"]);
  for (const id of ["88cb6331", "eedbc622", "other-link"]) assert.deepEqual(linkedPriceIds(id), [id]);
});

test("a changed fee or currency cannot be debited against an old checkout quote", () => {
  const fee = { amount: 5240, currency: "XOF" };
  assert.equal(matchesServiceQuote({ amount: 5240, currency: "XOF" }, fee), true);
  assert.equal(matchesServiceQuote({ amount: 6000, currency: "XOF" }, fee), false);
  assert.equal(matchesServiceQuote({ amount: 5240, currency: "USD" }, fee), false);
  assert.equal(matchesServiceQuote({ amount: 5240 }, fee), false);
  assert.equal(matchesServiceQuote({}, fee), true);
});
