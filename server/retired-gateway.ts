import { sql } from "drizzle-orm";
import { db } from "./db";

/** Retire provider configuration only. Never delete receipts or entitlements. */
export async function retireRobotPaySettings() {
  await db.transaction(async tx => {
    await tx.execute(sql`
      UPDATE app_settings SET value = 'solvexpay'
      WHERE key ~ '^(bj|ci|sn|bf|tg|cm)_activation_mode$'
        AND value = 'robotpay'
    `);
    await tx.execute(sql`
      DELETE FROM app_settings WHERE key ~ '^(robotpay|westpay)_'
    `);
  });
}
