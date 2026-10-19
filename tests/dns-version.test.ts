import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, pool } from "../server/db";
import { dnsPublishSchema, ensureDnsVersionSchema, getDnsUpdateStatus } from "../server/dns-versions";
import { defaultDnsAnnouncement, dnsVersionIsOutdated } from "../shared/dns-version";
import { getDnsPaymentView } from "../shared/dns-payment-state";

after(async () => { await pool.end(); });

test("publishing requires a distinct version label and an editable message mentioning it", () => {
  const version = "v.025.2";
  const body = { expectedVersion: "v.025", version, message: defaultDnsAnnouncement(version) };
  assert.equal(dnsPublishSchema.safeParse(body).success, true);
  assert.equal(dnsPublishSchema.safeParse({ ...body, message: `Notification personnalisée : ${version} disponible.` }).success, true);
  assert.equal(dnsPublishSchema.safeParse({ ...body, message: "Nouvelle version sans son nom." }).success, false);
  assert.equal(dnsPublishSchema.safeParse({ ...body, version: "<script>" }).success, false);
  assert.equal(dnsVersionIsOutdated("v.025", version), true);
  assert.equal(dnsVersionIsOutdated(version, version), false);
  assert.equal(dnsVersionIsOutdated(null, version), false);
  assert.equal(getDnsPaymentView({ status: "outdated" }, false), "outdated");
  assert.equal(getDnsPaymentView({ status: "outdated" }, true), "form");
});

test("release changes preserve historical payments, target previous purchasers and accept a new payment", async () => {
  await ensureDnsVersionSchema();
  const rollback = new Error("Intentional rollback: leave all customer data and the current DNS release unchanged");
  await assert.rejects(db.transaction(async tx => {
    const userId = `dns-test-${randomUUID()}`;
    const outsiderId = `dns-test-${randomUUID()}`;
    const before = await getDnsUpdateStatus(userId, tx);
    assert.equal(before.status, "none");
    assert.equal(before.announcement, null);
    const [old] = (await tx.execute(sql`
      INSERT INTO payment_link_transactions (id, link_id, user_id, amount, status)
      VALUES (${randomUUID()}, 'eedbc622', ${userId}, 3400, 'completed')
      RETURNING id, dns_version
    `)).rows as { id: string; dns_version: string }[];
    assert.equal(old.dns_version, before.currentVersion);
    assert.equal((await getDnsUpdateStatus(userId, tx)).status, "completed");

    const version = `test-${randomUUID()}`;
    await tx.execute(sql`INSERT INTO dns_releases (version, message) VALUES (${version}, ${defaultDnsAnnouncement(version)})`);
    const obsolete = await getDnsUpdateStatus(userId, tx);
    assert.equal(obsolete.status, "outdated");
    assert.equal(obsolete.installedVersion, old.dns_version);
    assert.equal(obsolete.currentVersion, version);
    assert.equal(obsolete.announcement?.version, version);
    // An idempotent webhook must not grant a free upgrade to an old approval.
    await tx.execute(sql`UPDATE payment_link_transactions SET status = 'completed' WHERE id = ${old.id}`);
    assert.equal((await getDnsUpdateStatus(userId, tx)).status, "outdated");
    assert.equal((await getDnsUpdateStatus(outsiderId, tx)).announcement, null);
    assert.equal((await getDnsUpdateStatus(outsiderId, tx)).status, "none");

    const [renewal] = (await tx.execute(sql`
      INSERT INTO payment_link_transactions (id, link_id, user_id, amount, status, created_at)
      VALUES (${randomUUID()}, 'eedbc622', ${userId}, 3400, 'pending', clock_timestamp() + interval '1 second')
      RETURNING id, dns_version
    `)).rows as { id: string; dns_version: string }[];
    assert.equal(renewal.dns_version, version);
    assert.equal((await getDnsUpdateStatus(userId, tx)).status, "pending");
    await tx.execute(sql`UPDATE payment_link_transactions SET status = 'failed' WHERE id = ${renewal.id}`);
    assert.equal((await getDnsUpdateStatus(userId, tx)).status, "failed");
    await tx.execute(sql`UPDATE payment_link_transactions SET status = 'completed' WHERE id = ${renewal.id}`);
    const current = await getDnsUpdateStatus(userId, tx);
    assert.equal(current.status, "completed");
    assert.equal(current.installedVersion, version);
    assert.equal(current.announcement, null);
    const preserved = (await tx.execute(sql`SELECT status, dns_version FROM payment_link_transactions WHERE id = ${old.id}`)).rows[0];
    assert.equal(preserved.status, "completed");
    assert.equal(preserved.dns_version, old.dns_version);
    throw rollback;
  }), err => err === rollback);
});

test("a pending payment approved after a publication grants the current release without a second payment", async () => {
  const rollback = new Error("Intentional rollback");
  await assert.rejects(db.transaction(async tx => {
    const userId = `dns-late-test-${randomUUID()}`;
    const [pending] = (await tx.execute(sql`
      INSERT INTO payment_link_transactions (id, link_id, user_id, amount, status)
      VALUES (${randomUUID()}, 'eedbc622', ${userId}, 3400, 'pending') RETURNING id, dns_version
    `)).rows as { id: string; dns_version: string }[];
    const version = `test-${randomUUID()}`;
    await tx.execute(sql`INSERT INTO dns_releases (version, message) VALUES (${version}, ${defaultDnsAnnouncement(version)})`);
    await tx.execute(sql`UPDATE payment_link_transactions SET status = 'completed' WHERE id = ${pending.id}`);
    const state = await getDnsUpdateStatus(userId, tx);
    assert.equal(state.status, "completed");
    assert.equal(state.installedVersion, version);
    assert.equal(state.announcement, null);
    throw rollback;
  }), err => err === rollback);
});
