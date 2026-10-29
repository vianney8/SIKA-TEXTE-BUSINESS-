import { randomUUID } from "node:crypto";
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { INITIAL_DNS_VERSION, type DnsRelease } from "@shared/dns-version";
import type { DnsPaymentStatus } from "@shared/dns-payment-state";

const DNS_LINK = "eedbc622";
type ReleaseRow = { id: string; version: string; message: string; published_at: Date | string };

function releaseDto(row: ReleaseRow): DnsRelease {
  return { id: row.id, version: row.version, message: row.message, publishedAt: new Date(row.published_at).toISOString() };
}

/** Every gateway inserts into the same ledger, including the historical manual flow. */
export async function ensureDnsVersionSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS dns_releases (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      version varchar(48) NOT NULL UNIQUE,
      message text NOT NULL,
      published_at timestamptz NOT NULL DEFAULT clock_timestamp()
    )
  `);
  await db.execute(sql`
    INSERT INTO dns_releases (version, message, published_at)
    VALUES (${INITIAL_DNS_VERSION}, '', '1970-01-01T00:00:00Z')
    ON CONFLICT (version) DO NOTHING
  `);
  await db.execute(sql`ALTER TABLE payment_link_transactions ADD COLUMN IF NOT EXISTS dns_version varchar NOT NULL DEFAULT 'v.025'`);
  // Preserve historical approvals, but grant the current release when a pending
  // payment is first approved, so a publication never forces a second payment.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION stamp_dns_payment_version() RETURNS trigger AS $$
    BEGIN
      IF NEW.link_id = 'eedbc622' THEN
        IF TG_OP = 'INSERT' THEN
          SELECT version INTO NEW.dns_version FROM dns_releases ORDER BY published_at DESC, id DESC LIMIT 1;
        ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
          SELECT version INTO NEW.dns_version FROM dns_releases ORDER BY published_at DESC, id DESC LIMIT 1;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`
    DROP TRIGGER IF EXISTS stamp_dns_payment_version_on_insert ON payment_link_transactions;
    CREATE TRIGGER stamp_dns_payment_version_on_insert
      BEFORE INSERT OR UPDATE OF status ON payment_link_transactions
      FOR EACH ROW EXECUTE FUNCTION stamp_dns_payment_version()
  `);
}

export async function currentDnsRelease(): Promise<DnsRelease> {
  const result = await db.execute(sql`SELECT * FROM dns_releases ORDER BY published_at DESC, id DESC LIMIT 1`);
  const row = result.rows[0] as ReleaseRow | undefined;
  if (!row) throw new Error("Aucune version DNS configurée.");
  return releaseDto(row);
}

export async function getDnsUpdateStatus(userId: string, database: Pick<typeof db, "execute"> = db): Promise<DnsPaymentStatus> {
  // A single statement gives a consistent snapshot of the release and receipts.
  const result = await database.execute(sql`
    SELECT r.*,
      latest.id AS transaction_id, latest.status AS payment_status, latest.reference AS payment_reference,
      latest.dns_retry_requested,
      installed.dns_version AS installed_version,
      current_receipt.id AS current_receipt_id
    FROM (SELECT * FROM dns_releases ORDER BY published_at DESC, id DESC LIMIT 1) r
    LEFT JOIN LATERAL (
      SELECT id, status, reference, dns_retry_requested FROM payment_link_transactions
      WHERE link_id = ${DNS_LINK} AND user_id = ${userId}
      ORDER BY created_at DESC, id DESC LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
      SELECT dns_version FROM payment_link_transactions
      WHERE link_id = ${DNS_LINK} AND user_id = ${userId} AND status = 'completed'
      ORDER BY created_at DESC, id DESC LIMIT 1
    ) installed ON true
    LEFT JOIN LATERAL (
      SELECT id FROM payment_link_transactions
      WHERE link_id = ${DNS_LINK} AND user_id = ${userId} AND status = 'completed' AND dns_version = r.version
      ORDER BY created_at DESC, id DESC LIMIT 1
    ) current_receipt ON true
  `);
  const row = result.rows[0] as ReleaseRow & {
    transaction_id: string | null; payment_status: string | null; payment_reference: string | null;
    dns_retry_requested: boolean | null; installed_version: string | null; current_receipt_id: string | null;
  };
  if (!row) throw new Error("Aucune version DNS configurée.");
  const installedVersion = row.current_receipt_id ? row.version : row.installed_version;
  let status: DnsPaymentStatus["status"] = "none";
  if (row.current_receipt_id) status = "completed";
  else if (row.payment_status === "completed") status = "outdated";
  else if (row.payment_status === "failed") status = "failed";
  else if (row.payment_status) status = "pending";
  return {
    status,
    transactionId: row.current_receipt_id || row.transaction_id || undefined,
    paymentMode: row.payment_status !== "pending" ? undefined
      : row.payment_reference?.startsWith("UCHK-") ? "solvexpay"
      : row.payment_reference?.startsWith("WST-DNS-") ? "robotpay"
      : "manual",
    retryRequested: row.dns_retry_requested || false,
    currentVersion: row.version,
    installedVersion,
    announcement: installedVersion && installedVersion !== row.version && row.message ? releaseDto(row) : null,
  };
}

export const dnsPublishSchema = z.object({
  expectedVersion: z.string().min(1).max(48),
  version: z.string().trim().min(1).max(48).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Utilisez des lettres, chiffres, points ou tirets pour la version."),
  message: z.string().trim().min(10).max(4000),
}).refine(input => input.message.includes(input.version), {
  path: ["message"], message: "Le message doit mentionner la nouvelle version.",
});

export function registerDnsVersionRoutes(app: Express, requireAdmin: any) {
  app.get("/api/admin/dns-version", requireAdmin, async (_req, res) => {
    try {
      const release = await currentDnsRelease();
      const count = await db.execute(sql`
        SELECT COUNT(DISTINCT t.user_id)::int AS n FROM payment_link_transactions t
        WHERE t.link_id = ${DNS_LINK} AND t.status = 'completed' AND t.user_id IS NOT NULL
      `);
      res.set("Cache-Control", "no-store").json({ currentVersion: release.version, affectedUsers: Number(count.rows[0]?.n || 0) });
    } catch (err) {
      console.error("[DNS-VERSION] Read failed:", err);
      res.status(500).json({ message: "Impossible de charger la version DNS." });
    }
  });

  app.post("/api/admin/dns-version", requireAdmin, async (req, res) => {
    const parsed = dnsPublishSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || "Version et notification requises." });
    const { expectedVersion, version, message } = parsed.data;
    try {
      const result = await db.transaction(async tx => {
        // Serialize competing administrators; never silently overwrite a release.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('sika-dns-release-publish'))`);
        const latest = await tx.execute(sql`SELECT version FROM dns_releases ORDER BY published_at DESC, id DESC LIMIT 1`);
        if (latest.rows[0]?.version !== expectedVersion) {
          return { conflict: "La version DNS a changé. Actualisez avant de publier." };
        }
        const used = await tx.execute(sql`SELECT id FROM dns_releases WHERE lower(version) = lower(${version})`);
        if (used.rows.length) return { conflict: "Cette version existe déjà. Choisissez un nouveau nom." };
        await tx.execute(sql`INSERT INTO dns_releases (id, version, message) VALUES (${randomUUID()}, ${version}, ${message})`);
        const count = await tx.execute(sql`
          SELECT COUNT(DISTINCT user_id)::int AS n FROM payment_link_transactions
          WHERE link_id = ${DNS_LINK} AND status = 'completed' AND user_id IS NOT NULL
        `);
        return { currentVersion: version, affectedUsers: Number(count.rows[0]?.n || 0) };
      });
      if ("conflict" in result) return res.status(409).json({ message: result.conflict });
      res.json(result);
    } catch (err) {
      console.error("[DNS-VERSION] Publish failed:", err);
      res.status(500).json({ message: "Publication impossible. Aucun changement n’a été appliqué." });
    }
  });
}
