import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import DnsPaymentUnconfirmed from "../client/src/components/DnsPaymentUnconfirmed";
import { getDnsPaymentView } from "../shared/dns-payment-state";

test("uncertain DNS result offers an active retry without assistance or warnings", () => {
  const html = renderToStaticMarkup(<DnsPaymentUnconfirmed reference="test-reference" onRetry={() => {}} />);
  assert.doesNotMatch(html, /assistance|Actualiser|SolvexPay|href=/i);
  assert.doesNotMatch(html, /débité|seconde fois|avertissement/i);
  assert.match(html, /Réessayer/);
  assert.doesNotMatch(html, /<button[^>]*\sdisabled(?:=""|(?=[\s>]))/);
  assert.match(html, /test-reference/);
});

test("retry is disabled only while its preparation is running", () => {
  const html = renderToStaticMarkup(<DnsPaymentUnconfirmed onRetry={() => {}} isRetrying />);
  assert.match(html, /<button[^>]*\sdisabled(?:=""|(?=[\s>]))/);
  assert.match(html, /Préparation/);
});

test("explicit retry opens the form without hiding a confirmed payment", () => {
  assert.equal(getDnsPaymentView({ status: "unconfirmed" }, true), "unconfirmed");
  assert.equal(getDnsPaymentView({ status: "unconfirmed", retryRequested: true }, false), "form");
  assert.equal(getDnsPaymentView({ status: "failed" }, false), "failed");
  assert.equal(getDnsPaymentView({ status: "failed", retryRequested: true }, false), "form");
  assert.equal(getDnsPaymentView({ status: "completed" }, true), "completed");
});
