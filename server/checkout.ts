import type { Express, Request, Response, NextFunction } from "express";
import { and, eq, or, sql } from "drizzle-orm";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { storage } from "./storage";
import { accountStatus, paymentLinks, paymentLinkTransactions, pcsCodes, referrals, users } from "@shared/schema";
import { generatePcsCode, sendPcsEmail } from "./email";
import { localPaymentPhone } from "@shared/payment-phone";

const CATALOG = [
  { code: "BJ", name: "Bénin", prefix: "229", operators: ["mtn", "moov", "celtis"], length: 10 },
  { code: "CI", name: "Côte d'Ivoire", prefix: "225", operators: ["mtn", "moov", "orange", "wave"], length: 10 },
  { code: "SN", name: "Sénégal", prefix: "221", operators: ["orange", "wave", "free", "expresso"], length: 9 },
  { code: "BF", name: "Burkina Faso", prefix: "226", operators: ["moov", "orange", "wave"], length: 8 },
  { code: "TG", name: "Togo", prefix: "228", operators: ["moov", "tmoney"], length: 8 },
  { code: "CM", name: "Cameroun", prefix: "237", operators: ["mtn", "orange"], length: 9 },
];
const OP_NAMES: Record<string, string> = { mtn: "MTN", moov: "Moov", orange: "Orange Money", wave: "Wave", free: "Free Money", tmoney: "T-Money", celtis: "Celtis Cash", expresso: "Expresso" };
const PCS_LINKS = ["d3e5479d", "codepcs", "88cb6331"];
const serviceSchema = z.enum(["activation", "dns", "ci-update", "link"]);
const initSchema = z.object({
  service: serviceSchema, linkId: z.string().max(100).optional(),
  country: z.string().length(2).transform(v => v.toUpperCase()),
  operator: z.string().max(30).transform(v => v.toLowerCase()),
  phone: z.string().min(8).max(30),
  otp: z.string().trim().regex(/^\d{4,10}$/).optional(),
  customerEmail: z.string().trim().toLowerCase().email().optional(),
  customerName: z.string().trim().max(150).optional(),
});
type Settings = Awaited<ReturnType<typeof storage.getAppSettings>>;
type Checkout = typeof paymentLinkTransactions.$inferSelect;
export const solvexEnabled = (settings: Settings) => settings.find(s => s.key === "solvexpay_enabled")?.value !== "false";
const setting = (settings: Settings, key: string, fallback = "") => settings.find(s => s.key === key)?.value || fallback;
const error = (status: number, message: string) => Object.assign(new Error(message), { status });
const authId = (req: Request) => (req as any).session?.userId as string | undefined;
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { void fn(req, res, next).catch((err: any) => {
    console.error("[CHECKOUT]", err.message);
    if (!res.headersSent) res.status(err.status || 500).json({ message: err.status ? err.message : "Impossible de traiter le paiement. Veuillez réessayer." });
  }); };

async function resolveService(service: z.infer<typeof serviceSchema>, linkId: string | undefined, settings: Settings, userId?: string) {
  if (service !== "link" && !userId) throw error(401, "Connectez-vous pour payer ce service.");
  if (service === "activation") return { id: "__activation", label: "Activation du compte", amount: Number(setting(settings, "activation_amount", "3600")), currency: "XOF", requiresEmail: false };
  if (service === "ci-update") return { id: "__ci_update", label: "Mise à jour du compte", amount: Number(setting(settings, "ci_update_amount", "1200")), currency: "XOF", requiresEmail: false };
  const id = service === "dns" ? "eedbc622" : linkId;
  if (!id) throw error(400, "Service de paiement manquant.");
  const [link] = await db.select().from(paymentLinks).where(eq(paymentLinks.id, id)).limit(1);
  if (!link || !link.isActive) throw error(404, "Ce service de paiement est indisponible.");
  return { id, label: link.label, amount: Number(link.amount), currency: link.currency || "XOF", requiresEmail: PCS_LINKS.includes(id) };
}

// Completion and the entitlement are committed together. Concurrent polls/webhooks
// serialize on the same transaction row, so a PCS code cannot be issued twice.
async function fulfill(payment: Checkout) {
  const notification = await db.transaction(async tx => {
    const [locked] = await tx.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.id, payment.id)).for("update");
    if (!locked || locked.status === "completed" || locked.status === "failed") return null;
    let code: string | null = locked.pcsCode;
    if (locked.linkId === "__activation") {
      if (!locked.userId) throw error(409, "Compte introuvable.");
      const [owner] = await tx.select().from(users).where(eq(users.id, locked.userId)).for("update");
      if (!owner) throw error(409, "Compte introuvable.");
      const [state] = await tx.select().from(accountStatus).where(eq(accountStatus.userId, owner.id));
      await tx.insert(accountStatus).values({ userId: owner.id, isActive: true, activatedAt: new Date() })
        .onConflictDoUpdate({ target: accountStatus.userId, set: { isActive: true, activatedAt: new Date() } });
      if (!state?.isActive && owner.referredBy) {
        // Preserve the existing activation commission policy.
        const commission = 720;
        await tx.update(referrals).set({ commission: String(commission) }).where(eq(referrals.referredUserId, owner.id));
        await tx.update(users).set({ balance: sql`COALESCE(${users.balance}, 0) + ${commission}` }).where(eq(users.id, owner.referredBy));
      }
    } else if (locked.linkId === "__ci_update") {
      if (!locked.userId) throw error(409, "Compte introuvable.");
      await tx.update(users).set({ ciUpdateValidated: true }).where(eq(users.id, locked.userId));
    } else if (PCS_LINKS.includes(locked.linkId || "")) {
      if (!locked.userId) throw error(409, "Compte PCS introuvable.");
      const [owner] = await tx.select().from(users).where(eq(users.id, locked.userId)).for("update");
      if (!owner) throw error(409, "Compte PCS introuvable.");
      if (locked.linkId === "88cb6331") {
        const [inactive] = await tx.select().from(pcsCodes).where(and(eq(pcsCodes.userId, owner.id), eq(pcsCodes.status, "inactif"))).for("update").limit(1);
        if (!inactive) throw error(409, "Aucun code PCS inactif à activer. Contactez le support avec la référence du paiement.");
        code = inactive.code;
        await tx.update(pcsCodes).set({ status: "actif" }).where(eq(pcsCodes.id, inactive.id));
      } else {
        code = generatePcsCode();
        await tx.insert(pcsCodes).values({ userId: owner.id, code, status: "inactif" });
      }
    }
    // DNS uses this same user-linked ledger for /dns-update-status.
    // A purchased PCS already belongs to its issuance receipt. The database
    // enforces unique receipt codes: activating it must not duplicate that code.
    await tx.update(paymentLinkTransactions).set({ status: "completed", pcsCode: locked.linkId === "88cb6331" ? null : code, updatedAt: new Date() }).where(eq(paymentLinkTransactions.id, locked.id));
    return code && locked.customerEmail ? { ...locked, pcsCode: code } : null;
  });
  if (notification) {
    void sendPcsEmail({ to: notification.customerEmail!, firstName: notification.customerName || "", lastName: "", countryCode: notification.country || "", pcsCode: notification.pcsCode, issuedAt: new Date() })
      .then(sent => { if (!sent) console.error("[CHECKOUT] PCS email not delivered", notification.id); })
      .catch(err => console.error("[CHECKOUT] PCS email failed", notification.id, err.message));
  }
}

function verifiedProviderData(payment: Checkout, payload: any) {
  const data = payload?.transaction || payload?.data || payload;
  if (!data || String(data.id) !== payment.solvexpayTxnId) throw error(409, "Référence du paiement non concordante.");
  if (data.amount == null || Number(data.amount) !== Number(payment.amount)) throw error(409, "Montant du paiement non concordant.");
  if (data.currency && String(data.currency).toUpperCase() !== payment.currency) throw error(409, "Devise du paiement non concordante.");
  if (data.country && String(data.country).toUpperCase() !== payment.country) throw error(409, "Pays du paiement non concordant.");
  if (data.operator && String(data.operator).toLowerCase() !== payment.operator) throw error(409, "Opérateur du paiement non concordant.");
  if (data.phone && String(data.phone).replace(/\D/g, "") !== String(payment.phone).replace(/\D/g, "")) throw error(409, "Téléphone du paiement non concordant.");
  return data;
}

export async function reconcileSolvexCheckout(payment: Checkout, payload: any) {
  const data = verifiedProviderData(payment, payload);
  if (data.status === "completed") await fulfill(payment);
  else if (["failed", "cancelled", "expired"].includes(data.status)) {
    await db.update(paymentLinkTransactions).set({ status: "failed", updatedAt: new Date() })
      .where(and(eq(paymentLinkTransactions.id, payment.id), eq(paymentLinkTransactions.status, "pending")));
  }
}

async function getStatus(id: string, userId?: string) {
  const [payment] = await db.select().from(paymentLinkTransactions)
    .where(and(or(eq(paymentLinkTransactions.id, id), eq(paymentLinkTransactions.solvexpayTxnId, id)), sql`${paymentLinkTransactions.reference} LIKE 'UCHK-%'`)).limit(1);
  if (!payment) throw error(404, "Paiement introuvable.");
  // A UUID is the guest's capability; signed-in account services additionally require the owner.
  if (["__activation", "__ci_update"].includes(payment.linkId || "") && userId !== payment.userId) throw error(403, "Paiement inaccessible.");
  if (payment.status === "pending" && payment.solvexpayTxnId) {
    const apiKey = process.env.SOLVEXPAY_API_KEY;
    if (!apiKey) throw error(503, "SolvexPay n'est pas encore configuré.");
    const response = await fetch(`https://solvexpay.com/api/v1/transactions/${encodeURIComponent(payment.solvexpayTxnId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw error(502, "La vérification SolvexPay est temporairement indisponible.");
    await reconcileSolvexCheckout(payment, data);
  }
  const [updated] = await db.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.id, payment.id));
  return { transactionId: payment.id, status: updated.status, pcsCode: updated.pcsCode, amount: Number(updated.amount), message: updated.solvexpayTxnId ? undefined : "Demande transmise. Confirmation du prestataire en attente. Ne payez pas une seconde fois." };
}

async function initiate(req: Request) {
  const parsed = initSchema.safeParse(req.body);
  if (!parsed.success) throw error(400, parsed.error.issues[0]?.message || "Données de paiement invalides.");
  const input = parsed.data;
  const settings = await storage.getAppSettings();
  if (!solvexEnabled(settings)) throw error(503, "SolvexPay est désactivé par l'administrateur.");
  const apiKey = process.env.SOLVEXPAY_API_KEY;
  if (!apiKey) throw error(503, "SolvexPay n'est pas encore configuré. Contactez l'administrateur.");
  const userId = authId(req);
  const service = await resolveService(input.service, input.linkId, settings, userId);
  if (!Number.isFinite(service.amount) || service.amount <= 0) throw error(503, "Montant du service invalide.");
  const country = CATALOG.find(c => c.code === input.country);
  if (!country || !country.operators.includes(input.operator)) throw error(400, "Ce moyen de paiement n'est pas proposé pour ce pays.");
  const maintenance = JSON.parse(setting(settings, "operator_maintenance", "{}"));
  if (maintenance[`${input.country}_${input.operator}`]) throw error(503, "Cet opérateur est en maintenance.");
  const local = localPaymentPhone(input.phone, country.prefix, country.length);
  if (local.length !== country.length) throw error(400, "Le numéro de téléphone n'a pas la longueur attendue pour ce pays.");
  const phone = country.prefix + local;
  if (input.operator === "orange" && ["CI", "SN"].includes(input.country) && !input.otp) throw error(400, "Saisissez le code OTP Orange indiqué dans le formulaire.");
  const owner = userId ? await storage.getUser(userId) : undefined;
  let targetId = userId;
  const email = input.customerEmail || owner?.email?.toLowerCase();
  if (service.requiresEmail || (service.id === "eedbc622" && !targetId)) {
    if (!email) throw error(400, "L'e-mail du compte Sika Texte est requis.");
    const [target] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!target) throw error(400, "Cet e-mail ne correspond à aucun compte Sika Texte.");
    targetId = target.id;
  }
  if (service.id === "__activation") {
    const [state] = await db.select().from(accountStatus).where(eq(accountStatus.userId, targetId!));
    if (state?.isActive) throw error(409, "Votre compte est déjà activé.");
  }
  if (service.id === "__ci_update" && owner?.ciUpdateValidated) throw error(409, "Cette mise à jour est déjà validée.");
  if (service.id === "88cb6331") {
    const [inactive] = await db.select().from(pcsCodes).where(and(eq(pcsCodes.userId, targetId!), eq(pcsCodes.status, "inactif"))).limit(1);
    if (!inactive) throw error(409, "Aucun code PCS inactif à activer.");
  }
  const payment = await db.transaction(async tx => {
    const key = [targetId || email || "", service.id, service.amount, phone, input.country, input.operator].join(":");
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${key}))`);
    const [pending] = await tx.select().from(paymentLinkTransactions).where(and(
      eq(paymentLinkTransactions.linkId, service.id), eq(paymentLinkTransactions.phone, phone),
      eq(paymentLinkTransactions.amount, String(service.amount)), eq(paymentLinkTransactions.operator, input.operator),
      sql`COALESCE(${paymentLinkTransactions.userId}, '') = ${targetId || ""}`,
      eq(paymentLinkTransactions.status, "pending"),
      sql`${paymentLinkTransactions.reference} LIKE 'UCHK-%'`,
      sql`${paymentLinkTransactions.createdAt} > now() - interval '15 minutes'`,
    )).limit(1);
    if (pending) return pending;
    const [created] = await tx.insert(paymentLinkTransactions).values({
      id: randomUUID(), linkId: service.id, linkLabel: service.label, amount: String(service.amount), currency: service.currency,
      country: input.country, operator: input.operator, phone, customerName: input.customerName || owner?.fullName || null,
      customerEmail: email || null, userId: targetId || null, reference: `UCHK-${randomUUID()}`, status: "pending",
    }).returning();
    try {
      const response = await fetch("https://solvexpay.com/api/v1/sr/pay", {
        method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ amount: service.amount, currency: service.currency, phone, operator: input.operator, country: input.country,
          description: `${service.label} — SIKA TEXTE`, reference: created.reference,
          customer_name: created.customerName || undefined, customer_email: email, ...(input.otp ? { otp: input.otp } : {}) }),
      });
      const payload = await response.json();
      const data = payload?.transaction || payload?.data || payload;
      if (!response.ok) {
        if (response.status >= 500) return created; // An ambiguous outcome must not trigger a second charge.
        await tx.update(paymentLinkTransactions).set({ status: "failed" }).where(eq(paymentLinkTransactions.id, created.id));
        return { ...created, status: "failed", failureMessage: payload?.message || payload?.error?.message || "Le prestataire a refusé le paiement." };
      }
      if (!data?.id) return created;
      const [updated] = await tx.update(paymentLinkTransactions).set({ solvexpayTxnId: String(data.id) }).where(eq(paymentLinkTransactions.id, created.id)).returning();
      const paymentUrl = typeof data.payment_url === "string" && data.payment_url.startsWith("https://") ? data.payment_url : undefined;
      return { ...updated, paymentUrl };
    } catch {
      // Preserve this pending reference: the provider may have received the request.
      return created;
    }
  });
  if (payment.status === "failed") throw error(400, "failureMessage" in payment ? String(payment.failureMessage) : "Paiement refusé.");
  return { success: true, transactionId: payment.id, reference: payment.reference, status: "pending", amount: service.amount, gateway: "solvexpay",
    paymentUrl: "paymentUrl" in payment ? payment.paymentUrl : undefined,
    message: payment.solvexpayTxnId ? "Validez la demande sur votre téléphone." : "Demande transmise. Confirmation du prestataire en attente. Ne payez pas une seconde fois." };
}

export function registerCheckoutRoutes(app: Express) {
  app.get("/api/checkout/mode", wrap(async (_req, res) => {
    const settings = await storage.getAppSettings();
    res.setHeader("Cache-Control", "no-store");
    res.json({ enabled: solvexEnabled(settings), customerId: authId(_req) || null, model: setting(settings, "payment_checkout_model", "simple") === "legacy" ? "legacy" : "simple" });
  }));
  app.get("/api/checkout/config", wrap(async (req, res) => {
    const settings = await storage.getAppSettings();
    const service = serviceSchema.parse(req.query.service);
    const userId = authId(req);
    const info = await resolveService(service, typeof req.query.linkId === "string" ? req.query.linkId : undefined, settings, userId);
    const user = userId ? await storage.getUser(userId) : undefined;
    const maintenance = JSON.parse(setting(settings, "operator_maintenance", "{}"));
    res.setHeader("Cache-Control", "no-store");
    res.json({ ...info, enabled: solvexEnabled(settings), model: setting(settings, "payment_checkout_model", "simple"),
      customerId: user?.id || null, customerEmail: user?.email || "", customerName: user?.fullName || "", phone: user?.phone || "",
      requiresEmail: info.requiresEmail || (info.id === "eedbc622" && !userId),
      initialCountry: CATALOG.find(c => (user?.phone || "").replace(/\D/g, "").startsWith(c.prefix))?.code || "BJ",
      countries: CATALOG.map(c => ({ ...c, operators: c.operators.map(code => ({ code, name: OP_NAMES[code], maintenance: !!maintenance[`${c.code}_${code}`] })) })),
    });
  }));
  app.post("/api/checkout/init", wrap(async (req, res) => { res.json(await initiate(req)); }));
  app.get("/api/checkout/status/:transactionId", wrap(async (req, res) => { res.json(await getStatus(String(req.params.transactionId), authId(req))); }));

  // Both presentation models use the same secure SolvexPay engine.
  app.post("/api/activation/init-solvexpay", wrap(async (req, res) => {
    req.body = { ...req.body, service: "activation" }; res.json(await initiate(req));
  }));
  app.post("/api/public/payment-links/:linkId/pay", wrap(async (req, res, next) => {
    if (!solvexEnabled(await storage.getAppSettings())) return next();
    req.body = { ...req.body, service: "link", linkId: String(req.params.linkId) }; res.json(await initiate(req));
  }));
  for (const path of ["/api/activation/check-solvexpay/:transactionId", "/api/public/payment-links/check/:transactionId"]) {
    app.get(path, wrap(async (req, res, next) => {
      const id = String(req.params.transactionId);
      const [known] = await db.select({ id: paymentLinkTransactions.id }).from(paymentLinkTransactions).where(and(
        or(eq(paymentLinkTransactions.id, id), eq(paymentLinkTransactions.solvexpayTxnId, id)),
        sql`${paymentLinkTransactions.reference} LIKE 'UCHK-%'`,
      )).limit(1);
      if (!known) return next();
      res.json(await getStatus(id, authId(req)));
    }));
  }
  app.post("/api/webhook/solvexpay", wrap(async (req, res, next) => {
    const secret = process.env.SOLVEXPAY_WEBHOOK_SECRET;
    if (!secret) throw error(503, "Le secret webhook SolvexPay n'est pas configuré.");
    const raw = (req as any).rawBody;
    const signature = String(req.headers["x-solvexpay-signature"] || "").replace(/^sha256=/, "");
    if (!Buffer.isBuffer(raw) || !/^[a-f0-9]{64}$/i.test(signature)) throw error(401, "Signature invalide.");
    const expected = createHmac("sha256", secret).update(raw).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) throw error(401, "Signature invalide.");
    const data = req.body?.transaction || req.body?.data || req.body;
    const id = String(data?.id || "");
    if (!id) throw error(400, "Référence fournisseur manquante.");
    const [known] = await db.select().from(paymentLinkTransactions).where(and(
      or(eq(paymentLinkTransactions.solvexpayTxnId, id), eq(paymentLinkTransactions.reference, String(data.reference || ""))),
      sql`${paymentLinkTransactions.reference} LIKE 'UCHK-%'`,
    )).limit(1);
    if (!known) return next(); // Historical transactions retain their existing processing.
    if (!known.solvexpayTxnId) {
      await db.update(paymentLinkTransactions).set({ solvexpayTxnId: id }).where(eq(paymentLinkTransactions.id, known.id));
      known.solvexpayTxnId = id;
    }
    await reconcileSolvexCheckout(known, data);
    res.json({ received: true });
  }));
}
