import { test } from "node:test";
import assert from "node:assert/strict";
import { changeCheckoutSetting, checkoutModel, usesUnifiedCheckout } from "../shared/checkout-settings";

test("choosing SolvexPay for any supported country enables it globally", () => {
  for (const country of ["bj", "ci", "sn", "bf", "tg", "cm"]) {
    const initial = { solvexpay_enabled: "false", payment_checkout_model: "simple" };
    const result = changeCheckoutSetting(initial, `${country}_activation_mode`, "solvexpay");
    assert.equal(result.solvexpay_enabled, "true");
    assert.equal(result.payment_checkout_model, "simple");
    assert.equal(initial.solvexpay_enabled, "false");
  }
});

test("gateway activation does not force the simple presentation", () => {
  const result = changeCheckoutSetting(
    { payment_checkout_model: "legacy" }, "bj_activation_mode", "solvexpay",
  );
  assert.equal(result.solvexpay_enabled, "true");
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
