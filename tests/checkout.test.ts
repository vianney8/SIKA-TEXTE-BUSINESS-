import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "../server/db";
import { accountStatus, paymentLinkTransactions, pcsCodes, referrals, users } from "../shared/schema";
import { reconcileSolvexCheckout } from "../server/checkout";

// Only synthetic records created here are changed; no external provider calls.
test("SolvexPay fulfillment is validated and idempotent across every service", async t => {
  const ownerId = randomUUID();
  const referrerId = randomUUID();
  const paymentIds: string[] = [];
  await db.insert(users).values([
    { id: referrerId, email: `${referrerId}@example.test`, balance: "0" },
    { id: ownerId, email: `${ownerId}@example.test`, referredBy: referrerId },
  ]);
  await db.insert(referrals).values({ referrerId, referredUserId: ownerId, commission: "0" });
  async function payment(linkId: string, amount = "3600") {
    const id = randomUUID();
    paymentIds.push(id);
    const [row] = await db.insert(paymentLinkTransactions).values({
      id, linkId, userId: ownerId, amount, currency: "XOF", reference: `UCHK-test-${id}`,
      solvexpayTxnId: `test-${id}`, phone: "2290190000000", country: "BJ", operator: "mtn", status: "pending",
    }).returning();
    return row;
  }
  function payload(row: Awaited<ReturnType<typeof payment>>, status = "completed") {
    return { id: row.solvexpayTxnId, status, amount: Number(row.amount), currency: row.currency, phone: row.phone, country: row.country, operator: row.operator };
  }
  async function status(id: string) {
    return (await db.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.id, id)))[0];
  }
  try {
    await t.test("wrong amount, currency, phone or provider id cannot fulfill", async () => {
      const row = await payment("__activation");
      for (const patch of [{ amount: 1 }, { currency: "XAF" }, { phone: "2290191111111" }, { id: "wrong-id" }]) {
        await assert.rejects(() => reconcileSolvexCheckout(row, { ...payload(row), ...patch }));
      }
      assert.equal((await status(row.id)).status, "pending");
      assert.equal((await db.select().from(accountStatus).where(eq(accountStatus.userId, ownerId))).length, 0);
    });
    await t.test("concurrent activation confirmations award one referral commission", async () => {
      const row = await payment("__activation");
      await Promise.all([reconcileSolvexCheckout(row, payload(row)), reconcileSolvexCheckout(row, payload(row))]);
      assert.equal((await status(row.id)).status, "completed");
      assert.equal((await db.select().from(accountStatus).where(eq(accountStatus.userId, ownerId)))[0].isActive, true);
      assert.equal(Number((await db.select().from(users).where(eq(users.id, referrerId)))[0].balance), 720);
    });
    await t.test("CI update completes the requested account update", async () => {
      const row = await payment("__ci_update", "1200");
      await reconcileSolvexCheckout(row, payload(row));
      assert.equal((await db.select().from(users).where(eq(users.id, ownerId)))[0].ciUpdateValidated, true);
      assert.equal((await status(row.id)).status, "completed");
    });
    for (const link of ["codepcs", "d3e5479d"]) {
      await t.test(`${link} issues one owned inactive PCS code even with duplicate callbacks`, async () => {
        const row = await payment(link, "5240");
        const before = (await db.select().from(pcsCodes).where(eq(pcsCodes.userId, ownerId))).length;
        await Promise.all([reconcileSolvexCheckout(row, payload(row)), reconcileSolvexCheckout(row, payload(row))]);
        const codes = await db.select().from(pcsCodes).where(eq(pcsCodes.userId, ownerId));
        assert.equal(codes.length, before + 1);
        const ledger = await status(row.id);
        assert.equal(ledger.status, "completed");
        assert.ok(codes.some(code => code.code === ledger.pcsCode && code.status === "inactif"));
      });
    }
    await t.test("PCS activation marks one existing code active", async () => {
      const row = await payment("88cb6331", "2400");
      await Promise.all([reconcileSolvexCheckout(row, payload(row)), reconcileSolvexCheckout(row, payload(row))]);
      const ledger = await status(row.id);
      assert.equal(ledger.status, "completed");
      const activeCodes = (await db.select().from(pcsCodes).where(eq(pcsCodes.userId, ownerId))).filter(code => code.status === "actif");
      assert.equal(activeCodes.length, 1);
    });
    await t.test("DNS and general updates complete their own payment records", async () => {
      for (const link of ["eedbc622", "77450fbc"]) {
        const row = await payment(link, "3400");
        await reconcileSolvexCheckout(row, payload(row));
        assert.equal((await status(row.id)).status, "completed");
        assert.equal((await status(row.id)).userId, ownerId);
      }
    });
    await t.test("failed payments do not issue codes or become completed on stale events", async () => {
      const row = await payment("codepcs");
      await reconcileSolvexCheckout(row, payload(row, "failed"));
      await reconcileSolvexCheckout(row, payload(row));
      assert.equal((await status(row.id)).status, "failed");
      assert.equal((await status(row.id)).pcsCode, null);
    });
  } finally {
    if (paymentIds.length) await db.delete(paymentLinkTransactions).where(inArray(paymentLinkTransactions.id, paymentIds));
    await db.delete(pcsCodes).where(eq(pcsCodes.userId, ownerId));
    await db.delete(accountStatus).where(eq(accountStatus.userId, ownerId));
    await db.delete(referrals).where(eq(referrals.referredUserId, ownerId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, referrerId));
    await pool.end();
  }
});
