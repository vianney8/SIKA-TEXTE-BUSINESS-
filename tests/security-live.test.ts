import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
import { db, pool } from "../server/db";

after(async () => { await pool.end(); });

test("live authentication rejects forged admin access and revokes old sessions after password reset", async () => {
  assert.ok(process.env.REPLIT_DEV_DOMAIN, "Run against the development workflow only");
  const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const id = randomUUID();
  const email = `${id}@example.test`;
  const phone = `22901${Date.now().toString().slice(-8)}`;
  const oldPassword = `Test-${randomUUID()}`;
  const newPassword = `New-${randomUUID()}`;
  const hash = await bcrypt.hash(oldPassword, 10);
  await db.execute(sql`INSERT INTO users (id,email,full_name,phone,password,password_reset_token,password_reset_expiry)
    VALUES (${id},${email},'Security fixture',${phone},${hash},'123456',now() + interval '15 minutes')`);
  const request = (path: string, method = "GET", cookie = "", body?: object, origin = base) => fetch(base + path, {
    method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(method !== "GET" ? { Origin: origin, "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    const login = await request("/api/auth/login", "POST", "", { phoneNumber: phone, password: oldPassword });
    assert.equal(login.status, 200);
    const oldCookie = login.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await request("/api/auth/user", "GET", oldCookie)).status, 200);
    assert.equal((await request("/api/admin/settings", "GET", oldCookie)).status, 403);
    assert.equal((await request("/api/admin-call/fake-room/messages", "GET", oldCookie)).status, 403);
    assert.equal((await request("/api/transactions/deposit", "POST", oldCookie, { amount: 999999 })).status, 410);
    assert.equal((await request("/api/transactions/deposit", "POST", oldCookie, { amount: 999999 }, "https://attacker.invalid")).status, 403);
    assert.equal((await request("/api/telegram/ci-webhook", "POST", "", {})).status, 401);
    const reset = await request("/api/auth/reset-password", "POST", oldCookie, { email, code: "123456", newPassword });
    assert.equal(reset.status, 200);
    const newCookie = reset.headers.get("set-cookie")!.split(";")[0];
    assert.ok(oldCookie !== newCookie, "Authentication must rotate the session");
    assert.equal((await request("/api/auth/user", "GET", oldCookie)).status, 401);
    assert.equal((await request("/api/auth/user", "GET", newCookie)).status, 200);
    assert.equal((await request("/api/auth/reset-password", "POST", newCookie, { email, code: "123456", newPassword })).status, 400);
    let throttled = false;
    for (let attempt = 0; attempt < 11; attempt++) {
      const failed = await request("/api/auth/login", "POST", "", { phoneNumber: phone, password: "Wrong-fixture-password" });
      if (failed.status === 429) {
        assert.ok(Number(failed.headers.get("retry-after")) > 0);
        throttled = true;
        break;
      }
      assert.equal(failed.status, 401);
    }
    assert.equal(throttled, true, "Repeated guesses must be rejected with HTTP 429");
  } finally {
    await db.execute(sql`DELETE FROM sessions WHERE sess::jsonb->>'userId' = ${id}`);
    await db.execute(sql`DELETE FROM users WHERE id = ${id}`);
  }
});
