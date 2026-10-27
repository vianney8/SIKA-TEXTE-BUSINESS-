import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { groupRequestSecurity, isSafeGroupPhoto } from "../server/group-security";
import { establishUserSession } from "../server/session-security";

test("group requests reject cross-site actions, file bodies and malformed identifiers", async () => {
  const app = express();
  app.use(express.json({ limit: "256kb" }));
  app.use("/api/groups", groupRequestSecurity);
  app.use((_req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const headers = { "Content-Type": "application/json", "X-Sika-Groups": "1" };
  try {
    const post = (extra: Record<string,string> = {}, body = "{}") =>
      fetch(`${base}/api/groups/example/join`, { method: "POST", headers: { ...headers, ...extra }, body });
    assert.equal((await post({ Origin: base })).status, 200);
    assert.equal((await post({ Origin: "https://attacker.example" })).status, 403);
    assert.equal((await post({ Origin: "null" })).status, 403);
    assert.equal((await post({ "Sec-Fetch-Site": "cross-site" })).status, 403);
    assert.equal((await post({ "X-Sika-Groups": "" })).status, 403);
    assert.equal((await post({ "Content-Type": "multipart/form-data; boundary=example" })).status, 415);
    assert.equal((await post({}, JSON.stringify({ content: "a".repeat(66000) }))).status, 413);
    for (const id of ["bad", "-1", "0", "9223372036854775808"]) {
      assert.equal((await fetch(`${base}/api/groups/example/messages/${id}`)).status, 400);
    }
    const response = await fetch(`${base}/api/groups/example/messages/1`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /no-store/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("group photos accept only public HTTPS URLs without credentials", () => {
  assert.equal(isSafeGroupPhoto("https://images.example.com/photo.jpg"), true);
  for (const value of ["javascript:alert(1)", "data:image/svg+xml,test", "http://example.com/a.jpg",
    "https://localhost/a", "https://machine.local/a", "https://127.0.0.1/a", "https://[::1]/a",
    "https://user:password@example.com/a", "https://2130706433/a", "not-a-url"]) {
    assert.equal(isSafeGroupPhoto(value), false, value);
  }
});

test("authentication rotates and saves the session rather than reusing old privileges", async () => {
  const events: string[] = [];
  const req: any = {
    session: {
      userId: "previous-user", stalePrivilege: "admin",
      regenerate(callback: (error?: Error) => void) {
        events.push("rotated");
        req.session = { save(done: (error?: Error) => void) { events.push("saved"); done(); } };
        callback();
      },
    },
  };
  await establishUserSession(req, "authenticated-user");
  assert.deepEqual(events, ["rotated", "saved"]);
  assert.equal(req.session.userId, "authenticated-user");
  assert.equal(req.session.stalePrivilege, undefined);
  await assert.rejects(establishUserSession({
    session: { regenerate(callback: (error?: Error) => void) { callback(new Error("Store unavailable")); } },
  } as any, "user"), /Store unavailable/);
});
