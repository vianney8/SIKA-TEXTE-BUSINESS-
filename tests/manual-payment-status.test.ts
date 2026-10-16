import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../server/db";
import { linkManualRequests } from "../shared/schema";

// Integration test against the running development workflow; no provider/Telegram calls.
test("manual receipt status follows approval without exposing proof or contact data", {
  skip: !process.env.REPLIT_DEV_DOMAIN,
}, async () => {
  const id = randomUUID();
  const base = `https://${process.env.REPLIT_DEV_DOMAIN}/api/public/payment-links`;
  try {
    await db.insert(linkManualRequests).values({
      id, linkId: "codepcs", amount: "1", status: "pending",
      customerEmail: `${id}@example.test`, phone: "synthetic-test",
      screenshotUrl: "/synthetic-proof-not-uploaded",
    });
    const read = async () => {
      const response = await fetch(`${base}/codepcs/manual-status/${id}`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.customerEmail, undefined);
      assert.equal(data.phone, undefined);
      assert.equal(data.screenshotUrl, undefined);
      return data;
    };
    assert.equal((await read()).status, "pending");
    await db.update(linkManualRequests).set({ status: "approved", pcsCode: `TEST-${id}` }).where(eq(linkManualRequests.id, id));
    const approved = await read();
    assert.equal(approved.status, "completed");
    assert.equal(approved.pcsCode, `TEST-${id}`);
    await db.update(linkManualRequests).set({ status: "rejected" }).where(eq(linkManualRequests.id, id));
    const rejected = await read();
    assert.equal(rejected.status, "failed");
    assert.equal(rejected.pcsCode, undefined);
    assert.equal((await fetch(`${base}/wrong-service/manual-status/${id}`)).status, 404);
    assert.equal((await fetch(`${base}/codepcs/manual-status/not-a-uuid`)).status, 404);
  } finally {
    await db.delete(linkManualRequests).where(eq(linkManualRequests.id, id));
    await pool.end();
  }
});
