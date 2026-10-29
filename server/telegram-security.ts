import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export function telegramWebhookSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Session configuration is required");
  return createHmac("sha256", secret).update("sika-telegram-webhook-v1").digest("hex");
}

export const verifyTelegramWebhook: RequestHandler = (req, res, next) => {
  try {
    const provided = req.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (!/^[a-f0-9]{64}$/.test(provided) ||
      !timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(telegramWebhookSecret(), "hex"))) {
      return res.status(401).json({ message: "Confirmation non autorisée." });
    }
    next();
  } catch {
    res.status(503).json({ message: "Confirmation temporairement indisponible." });
  }
};
