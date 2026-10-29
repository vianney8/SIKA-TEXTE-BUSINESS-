import test, { after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import session from "express-session";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, pool } from "../server/db";
import { createAdminGuard } from "../server/admin-access";
import { installHttpSecurity, sameOriginMutation } from "../server/http-security";
import { ensureSecurityRateLimits, takeSecurityLimit } from "../server/security-rate-limit";
import { newPasswordError } from "../server/session-security";
import { telegramWebhookSecret, verifyTelegramWebhook } from "../server/telegram-security";

after(async () => { await pool.end(); });

test("new passwords reject short, blank and bcrypt-truncated values", () => {
  assert.ok(newPasswordError("1234567"));
  assert.ok(newPasswordError("1234    "));
  assert.ok(newPasswordError("é".repeat(40)));
  assert.equal(newPasswordError("Good-test-password!"), null);
});

test("security boundaries work over HTTP without using real accounts or providers", async () => {
  const app = express();
  app.set("trust proxy", 1);
  installHttpSecurity(app, true);
  app.use(express.json());
  app.use(session({ secret: randomUUID(), resave: false, saveUninitialized: false }));
  app.post("/fixture", (req: any, res) => {
    req.session.userId = req.body.id;
    req.session.authenticatedAt = req.body.stale ? Date.now() - 31 * 60000 : Date.now();
    res.json({ ok: true });
  });
  app.use("/api", sameOriginMutation);
  const people = new Map([
    ["member", { id: "member", role: "user", isBlocked: false }],
    ["admin", { id: "admin", role: "admin", isBlocked: false }],
    ["blocked", { id: "blocked", role: "admin", isBlocked: true }],
  ]);
  app.use(["/api/admin", "/api/admin-call"], createAdminGuard(async id => people.get(id)));
  app.all(["/api/admin/probe", "/api/admin-call/room/messages"], (_req, res) => res.json({ ok: true }));
  app.post("/api/write", (_req, res) => res.json({ ok: true }));
  app.post("/api/telegram/ci-webhook", verifyTelegramWebhook, (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const call = (path: string, options?: RequestInit) => fetch(base + path, options);
  const login = async (id: string, stale = false) => {
    const response = await call("/fixture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, stale }) });
    return response.headers.get("set-cookie")!.split(";")[0];
  };
  try {
    assert.equal((await call("/api/admin/probe")).status, 401);
    assert.equal((await call("/api/admin-call/room/messages")).status, 401);
    const member = await login("member");
    assert.equal((await call("/api/admin/probe?role=admin", { headers: { Cookie: member } })).status, 403);
    const blocked = await login("blocked");
    assert.equal((await call("/api/admin/probe", { headers: { Cookie: blocked } })).status, 403);
    const stale = await login("admin", true);
    assert.equal((await call("/api/admin/probe", { headers: { Cookie: stale } })).status, 401);
    const admin = await login("admin");
    assert.equal((await call("/api/admin/probe", { headers: { Cookie: admin } })).status, 200);
    people.get("admin")!.role = "user";
    assert.equal((await call("/api/admin/probe", { headers: { Cookie: admin } })).status, 403);
    assert.equal((await call("/api/write", { method: "POST", headers: { Cookie: member, Origin: "https://attacker.invalid" } })).status, 403);
    assert.equal((await call("/api/write", { method: "POST", headers: { Cookie: member } })).status, 403);
    assert.equal((await call("/api/write", { method: "POST", headers: { Cookie: member, Origin: base } })).status, 200);
    assert.equal((await call("/api/telegram/ci-webhook", { method: "POST" })).status, 401);
    assert.equal((await call("/api/telegram/ci-webhook", { method: "POST", headers: { "X-Telegram-Bot-Api-Secret-Token": telegramWebhookSecret() } })).status, 200);
    for (const path of ["/.env", "/.git/config", "/server/routes.ts", "/dump.sql", "/assets/site.js.map"]) {
      assert.equal((await call(path)).status, 404);
    }
    const response = await call("/api/admin/probe", { headers: { "X-Forwarded-Proto": "https" } });
    assert.equal(response.headers.get("x-powered-by"), null);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(response.headers.get("cache-control")!, /no-store/);
    assert.match(response.headers.get("strict-transport-security")!, /max-age/);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test("shared rate counters are atomic, survive another call and expire correctly", async () => {
  await ensureSecurityRateLimits();
  const bucket = `security-test-${randomUUID()}`;
  try {
    const results = await Promise.all(Array.from({ length: 8 }, () => takeSecurityLimit(bucket, 5, 900)));
    assert.equal(results.filter(result => result.allowed).length, 5);
    const denied = await takeSecurityLimit(bucket, 5, 900);
    assert.equal(denied.allowed, false);
    assert.ok(denied.retryAfter > 0);
    await db.execute(sql`UPDATE security_rate_limits SET reset_at = now() - interval '1 second' WHERE bucket = ${bucket}`);
    assert.equal((await takeSecurityLimit(bucket, 5, 900)).allowed, true);
  } finally { await db.execute(sql`DELETE FROM security_rate_limits WHERE bucket = ${bucket}`); }
});
