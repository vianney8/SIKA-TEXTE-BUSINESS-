import { test } from "node:test";
import assert from "node:assert/strict";
import { localPaymentPhone } from "../shared/payment-phone";

test("checkout strips an international prefix exactly once", () => {
  assert.equal(localPaymentPhone("+229 01 97 00 00 00", "229", 10), "0197000000");
  assert.equal(localPaymentPhone("2290197000000", "229", 10), "0197000000");
  assert.equal(localPaymentPhone("01 97 00 00 00", "229", 10), "0197000000");
  assert.equal(localPaymentPhone("+225 07 00 00 00 00", "225", 10), "0700000000");
  assert.equal(localPaymentPhone("+221 77 000 00 00", "221", 9), "770000000");
  assert.equal(localPaymentPhone("22900000", "228", 8), "22900000");
  assert.equal(localPaymentPhone("2250000000", "225", 10), "2250000000");
  assert.equal(localPaymentPhone("", "229", 10), "");
});
