import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { appSettings } from "@shared/schema";
import { sql } from "drizzle-orm";

const app = express();
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // ── Seed default app settings (runs on every start, safe with ON CONFLICT DO NOTHING) ──
  const defaults = [
    { key: 'activation_amount',          value: '3600',                                              label: 'Frais activation compte' },
    { key: 'activation_link',            value: '',                                                  label: 'Lien activation en ligne' },
    { key: 'ci_update_required',         value: 'true',                                              label: 'Mise à jour +225 requise' },
    { key: 'ci_update_link',             value: 'https://clp.ci/ETPXwo',                             label: 'Lien paiement mise à jour CI' },
    { key: 'ci_update_amount',           value: '1200',                                              label: 'Frais mise à jour CI' },
    { key: 'telegram_group',             value: 'https://t.me/+A1QL2HAVBkMyMDA0',                   label: 'Groupe Telegram' },
    { key: 'whatsapp_group',             value: 'https://whatsapp.com/channel/0029VbC6vZ33bbV4eIeyXJ0T', label: 'Groupe WhatsApp' },
    { key: 'telegram_supervisor',        value: 'https://t.me/@SIKAcustomer_service',                label: 'Superviseur Telegram' },
    { key: 'telegram_supervisor_enabled',value: 'false',                                             label: 'Service Client Telegram Activé' },
    { key: 'instagram_supervisor',       value: 'superviseur_st',                                    label: 'Compte Instagram Service Client' },
    { key: 'instagram_supervisor_enabled',value: 'true',                                             label: 'Service Client Instagram Activé' },
    { key: 'whatsapp_supervisor',        value: '',                                                  label: 'WhatsApp Service Client' },
    { key: 'telegram_admin_chat_id',     value: '7457302722',                                       label: 'Telegram Admin Chat ID' },
    { key: 'chat_enabled',              value: 'true',                                              label: 'Chat en ligne activé' },
    { key: 'withdrawal_video_url',       value: '/withdrawal-video.mp4',                            label: 'Vidéo page activation' },
    { key: 'ci_manual_activation',       value: 'true',                                              label: 'Activation manuelle CI (Côte d\'Ivoire)' },
    { key: 'ci_payment_link_redirect',   value: 'true',                                              label: 'Redirection CI pour les liens de paiement' },
    { key: 'ci_payment_link_url',        value: 'https://clp.ci/ETPXwo',                             label: 'URL de redirection CI (liens de paiement)' },
    { key: 'solvexpay_enabled',         value: 'true',                                              label: 'Activer Passerelle SolvexPay' },
    { key: 'solvexpay_name',            value: 'SolvexPay — Mobile Money',                         label: 'Nom Passerelle SolvexPay' },
    { key: 'solvexpay_link',            value: '',                                                  label: 'Lien de paiement SolvexPay' },
    { key: 'whatsapp_admin_contact',    value: '',                                                  label: 'WhatsApp Administrateur (Contact Mise à jour)' },
    { key: 'demo_video_url',            value: '/promo.mp4',                                       label: 'Vidéo démonstration accueil' },
    { key: 'international_deposit_note', value: 'Assurez-vous d\'utiliser les frais corrects pour un virement international.', label: 'Note dépôt international (page paiement)' },
  ];
  try {
    for (const s of defaults) {
      await db.execute(sql`
        INSERT INTO app_settings (key, value, label)
        VALUES (${s.key}, ${s.value}, ${s.label})
        ON CONFLICT (key) DO NOTHING
      `);
    }
    log('App settings seeded');
  } catch (err) {
    log('App settings seed skipped (DB temporarily unavailable): ' + (err as Error).message);
  }

  // Add saved_pcs_code to users table if not exists
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_pcs_code varchar`);
    log('users.saved_pcs_code column ready');
  } catch (err) {
    log('users.saved_pcs_code column skipped: ' + (err as Error).message);
  }

  // Add spay settings columns to users if not exists
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS low_latency_mode boolean DEFAULT false`);
    log('users.low_latency_mode column ready');
  } catch (err) {
    log('users.low_latency_mode column skipped: ' + (err as Error).message);
  }

  // Add auto_withdrawal_mode to users table
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_withdrawal_mode varchar DEFAULT 'manual'`);
    log('users.auto_withdrawal_mode column ready');
  } catch (err) {
    log('users.auto_withdrawal_mode column skipped: ' + (err as Error).message);
  }

  // Create pcs_codes table if not exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pcs_codes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code varchar NOT NULL UNIQUE,
        status varchar NOT NULL DEFAULT 'inactif',
        created_at timestamp DEFAULT now()
      )
    `);
    log('pcs_codes table ready');
  } catch (err) {
    log('pcs_codes table setup skipped: ' + (err as Error).message);
  }

  // Create platform_notifications table if not exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_notifications (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        message text NOT NULL,
        color varchar NOT NULL DEFAULT 'green',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    log('platform_notifications table ready');
  } catch (err) {
    log('platform_notifications table skipped: ' + (err as Error).message);
  }

  // Auto-register Telegram webhook in production
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const webhookUrl = 'https://sikatexte.site/api/telegram/ci-webhook';
    fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] })
    }).then((r: any) => r.json()).then((data: any) => {
      log(`Telegram webhook registered: ${data.ok ? 'OK' : data.description}`);
    }).catch((err: any) => {
      log(`Telegram webhook setup failed: ${err}`);
    });
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
