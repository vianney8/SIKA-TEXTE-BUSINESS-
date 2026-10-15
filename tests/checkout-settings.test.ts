import { test } from "node:test";
import assert from "node:assert/strict";
import { changeCheckoutSetting } from "../shared/checkout-settings";

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
