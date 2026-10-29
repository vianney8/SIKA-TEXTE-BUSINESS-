import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../server/db";
import { storage } from "../server/storage";
import { users, paymentLinkTransactions } from "../shared/schema";
import { initiateDnsCheckout, refreshDnsCheckout } from "../server/checkout";
import { getDnsUpdateStatus } from "../server/dns-versions";

// Run with a synthetic API key. No request may reach a real payment provider.
test("DNS launches SolvexPay and reconciles rejection without a manual status click", async t => {
  const userId = randomUUID();
  const originalFetch = globalThis.fetch;
  const originalSettings = storage.getAppSettings;
  let mode = "robotpay";
  let rejectAtInit = false;
  let nestedResponse = false;
  let ambiguousInit = false;
  let postCount = 0;
  let getCount = 0;
  await db.insert(users).values({ id: userId, email: `${userId}@example.test`, fullName: "DNS Test" });
  storage.getAppSettings = async () => [
    { key: "bj_activation_mode", value: mode },
    { key: "operator_maintenance", value: "{}" },
  ] as Awaited<ReturnType<typeof originalSettings>>;
  globalThis.fetch = async (url, options) => {
    const target = String(url);
    if (target === "https://solvexpay.com/api/v1/sr/pay") {
      postCount++;
      assert.equal(options?.method, "POST");
      const body = JSON.parse(String(options?.body));
      assert.equal(body.country, "BJ");
      assert.equal(body.phone, "2290190000000");
      assert.ok(body.reference.startsWith("UCHK-"));
      if (ambiguousInit) throw new Error("Synthetic timeout; provider outcome unknown");
      const envelope = { transaction: {
        transaction_id: `dns-test-${postCount}`,
        status: rejectAtInit ? "rejected" : "pending",
        message: rejectAtInit ? "SolvexPay : Paiement refusé" : undefined,
      } };
      return Response.json(nestedResponse ? { data: envelope } : envelope);
    }
    assert.ok(target.startsWith("https://solvexpay.com/api/v1/transactions/"));
    getCount++;
    const envelope = { transaction: { transaction_id: decodeURIComponent(target.split("/").at(-1)!), status: "rejected" } };
    return Response.json(nestedResponse ? { data: envelope } : envelope, { status: nestedResponse ? 400 : 200 });
  };
  const request = () => ({
    session: { userId },
    body: { country: "BJ", operator: "mtn", phone: "0190000000", customerName: "DNS Test" },
  }) as any;
  try {
    await t.test("legacy automatic mode invokes SolvexPay, not WestPay", async () => {
      const started = await initiateDnsCheckout(request());
      assert.equal(started.gateway, "solvexpay");
      assert.equal(started.providerAccepted, true);
      assert.equal(postCount, 1);
      await refreshDnsCheckout(userId);
      assert.equal(getCount, 1);
      const row = (await db.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.id, started.transactionId)))[0];
      assert.equal(row.status, "failed");
      assert.equal((await getDnsUpdateStatus(userId)).status, "failed");
    });
    await t.test("HTTP 200 with rejected status never becomes a pending request", async () => {
      rejectAtInit = true;
      await assert.rejects(() => initiateDnsCheckout(request()), (error: Error) => {
        assert.match(error.message, /Paiement refusé/);
        assert.doesNotMatch(error.message, /solvex\s*pay/i);
        return true;
      });
      const rows = await db.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.userId, userId));
      assert.ok(rows.every(row => row.status === "failed"));
    });
    await t.test("nested provider replies and identified rejection with HTTP 400 reconcile correctly", async () => {
      rejectAtInit = false;
      nestedResponse = true;
      const started = await initiateDnsCheckout(request());
      assert.equal(started.providerAccepted, true);
      await refreshDnsCheckout(userId);
      assert.equal((await getDnsUpdateStatus(userId)).status, "failed");
    });
    await t.test("an ambiguous launch is not called pending and cannot launch a second debit after 15 minutes", async () => {
      ambiguousInit = true;
      await assert.rejects(() => initiateDnsCheckout(request()), /n’a pas confirmé/);
      const state = await getDnsUpdateStatus(userId);
      assert.equal(state.status, "unconfirmed");
      const before = postCount;
      await db.update(paymentLinkTransactions).set({ createdAt: new Date(Date.now() - 86400000) })
        .where(eq(paymentLinkTransactions.id, state.transactionId!));
      const changedPhone = request();
      changedPhone.body.phone = "0190000001";
      await assert.rejects(() => initiateDnsCheckout(changedPhone), /n’a pas confirmé/);
      assert.equal(postCount, before);
      const preserved = (await db.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.id, state.transactionId!)))[0];
      assert.equal(preserved.status, "pending", "Do not misrepresent an ambiguous debit as rejected");
    });
    await t.test("explicit manual country mode never calls the automatic API", async () => {
      mode = "manual";
      const before = postCount;
      await assert.rejects(() => initiateDnsCheckout(request()), /dépôt manuel/);
      assert.equal(postCount, before);
    });
  } finally {
    globalThis.fetch = originalFetch;
    storage.getAppSettings = originalSettings;
    await db.delete(paymentLinkTransactions).where(eq(paymentLinkTransactions.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await pool.end();
  }
});
