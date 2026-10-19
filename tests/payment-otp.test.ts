import test from "node:test";
import assert from "node:assert/strict";
import { requiresPaymentOtp, paymentOtpError, paymentOtpInstructions } from "../shared/payment-otp";

test("Orange Burkina Faso requires a valid payment code", () => {
  assert.equal(requiresPaymentOtp("BF", "orange"), true);
  assert.ok(paymentOtpError("BF", "orange", undefined));
  assert.ok(paymentOtpError("BF", "orange", "abc"));
  assert.ok(paymentOtpError("BF", "orange", "123"));
  assert.equal(paymentOtpError("BF", "orange", " 8562 "), null);
  assert.equal(paymentOtpInstructions("BF"), "Composez #144#, puis suivez le menu Orange Money et suivez les étapes pour obtenir votre code OTP. Saisissez ensuite le code reçu dans le champ ci-dessous");
});

test("Orange Senegal no longer requires an OTP", () => {
  assert.equal(requiresPaymentOtp("SN", "orange"), false);
  assert.equal(paymentOtpError("SN", "orange", undefined), null);
});

test("Cote d'Ivoire retains its OTP; other operators and countries do not gain it", () => {
  assert.equal(requiresPaymentOtp("CI", "orange"), true);
  assert.ok(paymentOtpError("CI", "orange", ""));
  assert.equal(paymentOtpError("CI", "orange", "123456"), null);
  for (const country of ["SN", "BJ", "TG", "CM"]) {
    assert.equal(requiresPaymentOtp(country, "orange"), false);
  }
  for (const operator of ["moov", "wave", "mtn"]) {
    assert.equal(requiresPaymentOtp("BF", operator), false);
  }
  assert.equal(requiresPaymentOtp("bf", "Orange"), true);
});
