import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { installLiveUpdates } from "../server/live-updates";

test("live configuration updates send only an invalidation signal", async () => {
  const app = express();
  installLiveUpdates(app);
  app.put("/api/admin/settings/:key", (_req, res) => res.json({ value: "private-value-must-not-be-broadcast" }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.on("listening", resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}`;
  const controller = new AbortController();
  try {
    const stream = await fetch(`${url}/api/live-updates`, { signal: controller.signal });
    assert.match(stream.headers.get("content-type") || "", /text\/event-stream/);
    const reader = stream.body!.getReader();
    await reader.read(); // Initial retry instruction.
    await fetch(`${url}/api/admin/settings/payment_checkout_model`, { method: "PUT" });
    const event = await reader.read();
    const text = new TextDecoder().decode(event.value);
    assert.match(text, /event: refresh/);
    assert.match(text, /"scope":"configuration"/);
    assert.doesNotMatch(text, /private-value/);
  } finally {
    controller.abort();
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
