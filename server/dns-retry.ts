import { sql } from "drizzle-orm";
import { db } from "./db";
import { getDnsUpdateStatus } from "./dns-versions";

/** Explicit retry permission; never rewrite the original financial outcome. */
export async function acknowledgeDnsRetry(userId: string, transactionId: string, retryUnconfirmed = false) {
  const acknowledged = await db.transaction(async tx => {
    // Same account/service lock as checkout initiation.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${userId}:eedbc622`}))`);
    const result = await tx.execute(sql`
      UPDATE payment_link_transactions SET dns_retry_requested = true, updated_at = now()
      WHERE id = ${transactionId} AND user_id = ${userId} AND link_id = 'eedbc622'
        AND (
          lower(trim(status)) IN ('failed','failure','rejected','declined','cancelled','canceled','expired','error','denied')
          OR (${retryUnconfirmed} AND status = 'pending' AND reference LIKE 'UCHK-%' AND solvexpay_txn_id IS NULL)
        )
        AND id = (
          SELECT id FROM payment_link_transactions WHERE user_id = ${userId} AND link_id = 'eedbc622'
          ORDER BY created_at DESC, id DESC LIMIT 1
        )
      RETURNING id
    `);
    return !!result.rows.length;
  });
  return acknowledged ? getDnsUpdateStatus(userId) : null;
}
