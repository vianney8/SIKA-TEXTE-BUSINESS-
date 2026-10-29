import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import DnsPaymentUnconfirmed from "../client/src/components/DnsPaymentUnconfirmed";
import { getDnsPaymentView } from "../shared/dns-payment-state";

test("uncertain DNS result offers no assistance or manual verification control", () => {
  const html = renderToStaticMarkup(<DnsPaymentUnconfirmed reference="test-reference" />);
  assert.doesNotMatch(html, /assistance|Actualiser|SolvexPay|href=/i);
  assert.match(html, /automatiquement/);
  assert.match(html, /Réessayer/);
  assert.match(html, /<button[^>]*disabled/);
  assert.match(html, /test-reference/);
});

test("automatic results unlock retry only after confirmed failure", () => {
  assert.equal(getDnsPaymentView({ status: "unconfirmed" }, true), "unconfirmed");
  assert.equal(getDnsPaymentView({ status: "failed" }, false), "failed");
  assert.equal(getDnsPaymentView({ status: "failed", retryRequested: true }, false), "form");
  assert.equal(getDnsPaymentView({ status: "completed" }, true), "completed");
});
