import type { Express, Response } from "express";

/** Only invalidation signals are public; never send account/payment payloads. */
export function installLiveUpdates(app: Express) {
  const clients = new Set<Response>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  function publish(scope: string) {
    if (timers.has(scope)) return;
    timers.set(scope, setTimeout(() => {
      timers.delete(scope);
      clients.forEach(client => {
        if (!client.destroyed && !client.writableEnded) {
          if (client.writableLength > 65536) client.end();
          else client.write(`event: refresh\ndata: ${JSON.stringify({ scope })}\n\n`);
        }
      });
    }, 250));
  }
  app.get("/api/live-updates", (req, res) => {
    res.status(200).set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write("retry: 5000\n\n");
    clients.add(res);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
    req.on("close", () => { clearInterval(heartbeat); clients.delete(res); });
  });
  app.use("/api", (req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const path = req.path;
      const configuration = /^\/admin\/(settings|payment-links|operator-maintenance|dns-version)(\/|$)/.test(path);
      const data = /payment|withdraw|activation|pcs|transfer|recharge|checkout|solvexpay|westpay|webhook|admin\/users/.test(path);
      if (configuration || data) res.on("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) publish(configuration ? "configuration" : "data");
      });
    }
    next();
  });
}
