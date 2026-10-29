import { createHmac } from "node:crypto";
import type { RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
let nextCleanup = 0;

export async function ensureSecurityRateLimits() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS security_rate_limits (
    bucket varchar(64) PRIMARY KEY, hits integer NOT NULL,
    reset_at timestamptz NOT NULL
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS security_rate_limits_expiry ON security_rate_limits(reset_at)`);
  await db.execute(sql`DELETE FROM security_rate_limits WHERE reset_at < now()`);
}

export async function takeSecurityLimit(bucket: string, limit: number, seconds: number) {
  const result = await db.execute(sql`
    INSERT INTO security_rate_limits (bucket,hits,reset_at)
    VALUES (${bucket},1,now() + ${seconds} * interval '1 second')
    ON CONFLICT (bucket) DO UPDATE SET
      hits = CASE WHEN security_rate_limits.reset_at <= now() THEN 1 ELSE security_rate_limits.hits + 1 END,
      reset_at = CASE WHEN security_rate_limits.reset_at <= now()
        THEN now() + ${seconds} * interval '1 second' ELSE security_rate_limits.reset_at END
    RETURNING hits, GREATEST(1,CEIL(EXTRACT(EPOCH FROM reset_at - now())))::int AS retry_after
  `);
  const row = result.rows[0] as { hits: number; retry_after: number };
  return { allowed: row.hits <= limit, retryAfter: row.retry_after };
}

const policies: Record<string, { ip: number; account: number; seconds: number }> = {
  "/api/auth/login": { ip: 40, account: 10, seconds: 900 },
  "/api/auth/register": { ip: 10, account: 5, seconds: 3600 },
  "/api/auth/forgot-password": { ip: 10, account: 3, seconds: 3600 },
  "/api/auth/reset-password": { ip: 20, account: 5, seconds: 900 },
  "/api/auth/resend-verification": { ip: 10, account: 3, seconds: 3600 },
  "/api/auth/send-verification": { ip: 10, account: 3, seconds: 3600 },
  "/api/auth/verify-email": { ip: 20, account: 5, seconds: 900 },
};

/** PostgreSQL counters survive restarts and are shared by application instances. */
export const protectAuthentication: RequestHandler = async (req, res, next) => {
  const policy = policies[req.path];
  if (req.method !== "POST" || !policy) return next();
  if (Date.now() >= nextCleanup) {
    nextCleanup = Date.now() + 300000;
    void db.execute(sql`DELETE FROM security_rate_limits WHERE bucket IN (
      SELECT bucket FROM security_rate_limits WHERE reset_at < now() LIMIT 1000
    )`).catch(() => console.warn("[SECURITY] Expired counter cleanup unavailable"));
  }
  if (Object.values(req.body || {}).some(value => typeof value === "string" && value.length > 1024)) {
    return res.status(400).json({ message: "Données de connexion invalides." });
  }
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("Missing session configuration");
    const identity = typeof req.body?.phoneNumber === "string"
      ? req.body.phoneNumber.replace(/\D/g, "")
      : typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const keys = [`${req.path}:ip:${req.ip || req.socket.remoteAddress || "unknown"}`];
    if (identity) keys.push(`${req.path}:account:${identity}`);
    for (let index = 0; index < keys.length; index++) {
      const bucket = createHmac("sha256", secret).update(keys[index]).digest("hex");
      const attempt = await takeSecurityLimit(bucket, index === 0 ? policy.ip : policy.account, policy.seconds);
      if (!attempt.allowed) {
        res.setHeader("Retry-After", attempt.retryAfter);
        return res.status(429).json({ message: "Trop de tentatives. Réessayez plus tard.", retryAfter: attempt.retryAfter });
      }
    }
    next();
  } catch {
    res.status(503).json({ message: "Vérification de sécurité indisponible. Veuillez réessayer." });
  }
};
