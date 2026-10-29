import { test } from "node:test";
import assert from "node:assert/strict";
import { changeCheckoutSetting, checkoutModel, usesUnifiedCheckout, countryPaymentMode } from "../shared/checkout-settings";

test("choosing SolvexPay affects only that country, not the obsolete global switch", () => {
  for (const country of ["bj", "ci", "sn", "bf", "tg", "cm"]) {
    const initial = { solvexpay_enabled: "false", payment_checkout_model: "simple" };
    const result = changeCheckoutSetting(initial, `${country}_activation_mode`, "solvexpay");
    assert.equal(result.solvexpay_enabled, "false");
    assert.equal(countryPaymentMode(result, country), "solvexpay");
    assert.equal(result.payment_checkout_model, "simple");
    assert.equal(initial.solvexpay_enabled, "false");
  }
});

test("gateway activation does not force the simple presentation", () => {
  const result = changeCheckoutSetting(
    { payment_checkout_model: "legacy" }, "bj_activation_mode", "solvexpay",
  );
  assert.equal(result.solvexpay_enabled, undefined);
  assert.equal(result.payment_checkout_model, "legacy");
});

test("explicit global disable and other providers remain available", () => {
  assert.equal(changeCheckoutSetting(
    { bj_activation_mode: "solvexpay" }, "solvexpay_enabled", "false",
  ).solvexpay_enabled, "false");
  for (const value of ["manual", "redirect", "robotpay"]) {
    assert.equal(changeCheckoutSetting(
      { solvexpay_enabled: "false" }, "bj_activation_mode", value,
    ).solvexpay_enabled, "false");
  }
  assert.equal(changeCheckoutSetting(
    { solvexpay_enabled: "false" }, "payment_checkout_model", "simple",
  ).solvexpay_enabled, "false");
});

test("pro is a separate persisted model without removing the existing models", () => {
  for (const model of ["legacy", "simple", "pro"] as const) {
    assert.equal(checkoutModel(model), model);
    const result = changeCheckoutSetting(
      { solvexpay_enabled: "false" }, "payment_checkout_model", model,
    );
    assert.equal(result.payment_checkout_model, model);
    assert.equal(result.solvexpay_enabled, "false");
  }
  assert.equal(checkoutModel("unknown"), "simple");
  assert.equal(checkoutModel(undefined), "simple");
  assert.equal(usesUnifiedCheckout("pro"), true);
  assert.equal(usesUnifiedCheckout("simple"), true);
  assert.equal(usesUnifiedCheckout("legacy"), false);
});

test("automatic DNS skips duplicate legacy collection without changing other checkouts", () => {
  for (const model of ["legacy", "simple", "pro"] as const) {
    assert.equal(usesUnifiedCheckout(model, true), true);
  }
  assert.equal(usesUnifiedCheckout("legacy"), false);
  assert.equal(usesUnifiedCheckout("legacy", false), false);
});

test("mixed payment modes stay independent even with an old global value", () => {
  for (const obsolete of ["true", "false"]) {
    const settings = { solvexpay_enabled: obsolete, bj_activation_mode: "solvexpay", sn_activation_mode: "manual", ci_activation_mode: "redirect", cm_activation_mode: "robotpay" };
    assert.equal(countryPaymentMode(settings, "BJ"), "solvexpay");
    assert.equal(countryPaymentMode(settings, "SN"), "manual");
    assert.equal(countryPaymentMode(settings, "CI"), "redirect");
    assert.equal(countryPaymentMode(settings, "CM"), "solvexpay");
    assert.equal(countryPaymentMode(settings, "BF"), "manual");
  }
});
