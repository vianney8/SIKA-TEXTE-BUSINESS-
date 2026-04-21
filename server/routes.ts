import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { generateCode, sendVerificationEmail, sendPasswordResetEmail, sendPcsEmail, sendPcsEmailBatch, generatePcsCode } from "./email";
import { 
  registerUserSchema, 
  loginUserSchema, 
  simpleRegisterSchema,
  simpleLoginSchema,
  transferSchema, 
  rechargeSchema, 
  paymentSchema,
  workSubmissionSchema,
  withdrawalRequestSchema,
  activationSchema,
  adminUpdateBalanceSchema,
  adminUpdatePasswordSchema,
  adminBlockUserSchema,
  adminCreditAccountSchema,
  appSettingUpdateSchema,
  bankCards,
  bkapayPayments,
  accountStatus,
  appSettings,
  users,
  paymentLinks,
  createPaymentLinkSchema,
  paymentLinkTransactions,
  ciActivationRequests,
  pcsCodes,
} from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import { db } from "./db";
import { eq, sql, and, desc, or, ilike, count, isNull } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { randomBytes, createHmac } from "crypto";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

// Session setup
function setupSessions(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // false pour development
      maxAge: sessionTtl,
    },
  }));
}

// Simple auth middleware
async function requireAuth(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || user.isBlocked) {
      // Destroy session if user is blocked
      req.session.destroy();
      return res.status(403).json({ message: "Votre compte est bloqué" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Error checking user status" });
  }
}

// Admin auth middleware
async function requireAdmin(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Error checking admin status" });
  }
}

// Helper: ensure phone is in international format (+<prefix><local>) according to country code
function formatPhoneIntl(phone: string | null | undefined, country?: string | null): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  if (trimmed.startsWith('+')) return trimmed;
  const prefixByCountry: Record<string, string> = {
    CI: '225', SN: '221', BJ: '229', BF: '226', TG: '228', ML: '223', CM: '237', NE: '227', GN: '224', GA: '241'
  };
  const prefix = (country && prefixByCountry[country]) || '225';
  const local = trimmed.replace(/^0+/, '').replace(/\D/g, '');
  if (!local) return trimmed;
  // Si le numéro contient déjà l'indicatif (ex: 22507...), juste préfixer "+"
  if (local.startsWith(prefix)) return '+' + local;
  return '+' + prefix + local;
}

// Helper: send the user's PCS codes list (with status badges + toggle buttons) to Telegram
async function sendUserPcsCodesListToTelegram(chatId: string, email: string, telegramToken: string) {
  try {
    const codesResult = await db.execute(sql`
      SELECT pc.id, pc.code, pc.status, pc.created_at FROM pcs_codes pc
      JOIN users u ON u.id = pc.user_id
      WHERE LOWER(u.email) = ${email.toLowerCase()}
      ORDER BY pc.created_at DESC
      LIMIT 100
    `);
    const codes = (codesResult.rows || []) as any[];
    if (!codes.length) {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `📦 <b>Codes PCS de</b> <code>${email}</code>\n\n<i>Aucun code PCS rattaché à ce compte.</i>`,
          parse_mode: 'HTML'
        })
      });
      return;
    }
    const headerText = `📦 <b>Codes PCS de</b> <code>${email}</code>\n${codes.length} code(s) — touchez un code pour basculer son statut`;
    const inline_keyboard = codes.map((c: any) => {
      const badge = c.status === 'actif' ? '🟢 Actif' : '🔴 Inactif';
      return [{ text: `${badge} — ${c.code}`, callback_data: `pcstog_pre_${c.id}` }];
    });
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: headerText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard }
      })
    });
  } catch (e) {
    console.error('[PCS-LIST-HELPER] Error:', e);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files (videos, etc.)
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir));

  // Setup sessions
  setupSessions(app);

  // Redirect common payment return URLs to the activation page
  const paymentReturnPaths = [
    '/paid', '/payment-success', '/payment-callback',
    '/paiement', '/paiement-succes', '/paiement-success',
    '/activation-callback', '/pay-success', '/pay-return'
  ];
  paymentReturnPaths.forEach(path => {
    app.get(path, (_req, res) => {
      res.redirect(302, '/activation?return=1');
    });
  });

  // Initialize app settings if they don't exist
  try {
    const existingSettings = await storage.getAppSettings();
    const hasActivationAmount = existingSettings.some(s => s.key === 'activation_amount');
    const hasLygosEnabled = existingSettings.some(s => s.key === 'lygos_enabled');
    
    if (!hasActivationAmount) {
      await db.insert(appSettings).values({
        key: 'activation_amount',
        value: '3600',
        label: 'Montant d\'activation'
      }).onConflictDoNothing();
    }
    
    if (!hasLygosEnabled) {
      await db.insert(appSettings).values({
        key: 'lygos_enabled',
        value: 'true',
        label: 'Activer Passerelle Lygos'
      }).onConflictDoNothing();
    }
    
    const hasLeekpayEnabled = existingSettings.some(s => s.key === 'leekpay_enabled');
    if (!hasLeekpayEnabled) {
      await db.insert(appSettings).values({
        key: 'leekpay_enabled',
        value: 'true',
        label: 'Activer Passerelle LeekPay'
      }).onConflictDoNothing();
    }
  } catch (error) {
    console.log('Settings already initialized or error:', error);
  }

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      console.log("User authenticated:", userId);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Include activation status from accountStatus table
      const statusResult = await db.select().from(accountStatus).where(eq(accountStatus.userId, userId));
      const isActivated = statusResult.length > 0 && statusResult[0].isActive === true;

      res.json({ ...user, isActivated });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Simple registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Support new format with fullName, email, and phone
      const { fullName, email, phone, password, referralCode } = req.body;
      
      console.log(`[REGISTER] Incoming data - Phone: ${phone}, Password length: ${password?.length}, Email: ${email}`);
      console.log(`[REGISTER DEBUG] Full request body:`, JSON.stringify({ fullName, email, phone: phone, hasPassword: !!password, referralCode }));
      
      // Basic validation
      if (!fullName || !email || !phone || !password) {
        return res.status(400).json({ message: "Nom complet, email, téléphone et mot de passe requis" });
      }
      
      if (password.length < 4) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 4 caractères" });
      }
      
      // Check if user already exists by phone
      const existingUserByPhone = await storage.getUserByPhone(phone);
      if (existingUserByPhone) {
        console.log(`[REGISTER FAILED] User already exists with phone: ${phone}`);
        return res.status(400).json({ message: "Un utilisateur avec ce numéro de téléphone existe déjà" });
      }

      // Check if user already exists by email
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        console.log(`[REGISTER FAILED] User already exists with email: ${email}`);
        return res.status(400).json({ message: "Un utilisateur avec cette adresse email existe déjà" });
      }

      // Hash password (trim to avoid accidental spaces)
      const trimmedPassword = password.trim();
      console.log(`[REGISTER] Password - Original length: ${password.length}, Trimmed length: ${trimmedPassword.length}`);
      const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
      console.log(`[REGISTER] Password hashed successfully, hash length: ${hashedPassword.length}`);

      console.log(`[REGISTER] About to create user with phone: ${phone}`);
      
      const user = await storage.createUser({
        password: hashedPassword,
        fullName: fullName,
        email: email,
        phone: phone,
        referralCode: referralCode,
      });
      
      console.log(`[REGISTER SUCCESS] User created - ID: ${user.id}, Phone SENT: ${phone}, Phone STORED: ${user.phone}, Email: ${user.email}`);
      
      // Check if phone number changed
      if (user.phone !== phone) {
        console.warn(`[REGISTER WARNING] Phone number mismatch! Sent: ${phone}, Stored: ${user.phone}`);
      }

      // Create signup bonus transaction of 600 FCFA
      await storage.createTransaction({
        userId: user.id,
        type: 'deposit',
        amount: '600',
        description: 'Bonus de bienvenue',
        status: 'completed'
      });

      // Update user balance with signup bonus
      await storage.updateUserBalance(user.id, 600);

      // Set session
      (req as any).session.userId = user.id;

      res.status(201).json({ 
        message: "Compte créé avec succès", 
        user: { 
          id: user.id, 
          fullName: user.fullName,
          email: user.email, 
          phone: user.phone 
        } 
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erreur lors de la création du compte" });
    }
  });

  // Helper: IP-based email rate limit (4 emails per hour per IP)
  const ipEmailRateLimitMap = new Map<string, { count: number; windowStart: number }>();
  const MAX_EMAILS_PER_IP = 4;
  const EMAIL_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

  function checkIpEmailRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = ipEmailRateLimitMap.get(ip);
    if (!entry || now - entry.windowStart >= EMAIL_RATE_WINDOW) {
      ipEmailRateLimitMap.set(ip, { count: 1, windowStart: now });
      return true;
    }
    if (entry.count >= MAX_EMAILS_PER_IP) return false;
    entry.count++;
    return true;
  }

  function getClientIp(req: any): string {
    return (
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown"
    );
  }

  // Send email verification code
  app.post('/api/auth/send-verification', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email requis" });

      const ip = getClientIp(req);
      if (!checkIpEmailRateLimit(ip)) {
        return res.status(429).json({ message: "Trop de demandes depuis votre réseau. Réessayez dans une heure." });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "Aucun compte associé à cet email" });

      const code = generateCode();
      const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.update(users as any)
        .set({ emailVerificationCode: code, emailVerificationExpiry: expiry })
        .where(eq((users as any).id, user.id));

      const sent = await sendVerificationEmail(email, user.fullName || user.email, code);
      if (!sent) return res.status(500).json({ message: "Impossible d'envoyer l'email. Réessayez." });

      res.json({ message: "Code envoyé" });
    } catch (err) {
      console.error("[VERIFY EMAIL] Error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Verify email code
  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ message: "Email et code requis" });

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

      if (!user.emailVerificationCode || user.emailVerificationCode !== code) {
        return res.status(400).json({ message: "Code incorrect" });
      }
      if (!user.emailVerificationExpiry || new Date() > new Date(user.emailVerificationExpiry)) {
        return res.status(400).json({ message: "Code expiré. Demandez un nouveau code." });
      }

      await db.update(users as any)
        .set({ emailVerified: true, emailVerificationCode: null, emailVerificationExpiry: null })
        .where(eq((users as any).id, user.id));

      res.json({ message: "Email vérifié avec succès" });
    } catch (err) {
      console.error("[VERIFY EMAIL] Error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Request password reset
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email requis" });

      const ip = getClientIp(req);
      if (!checkIpEmailRateLimit(ip)) {
        return res.status(429).json({ message: "Trop de demandes depuis votre réseau. Réessayez dans une heure." });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "Aucun compte n'est associé à cette adresse email. Vérifiez l'adresse saisie ou créez un compte." });
      }

      const code = generateCode();
      const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.update(users as any)
        .set({ passwordResetToken: code, passwordResetExpiry: expiry })
        .where(eq((users as any).id, user.id));

      const sent = await sendPasswordResetEmail(email, user.fullName || user.email, code);
      if (!sent) return res.status(500).json({ message: "Impossible d'envoyer l'email. Réessayez." });

      res.json({ message: "Code envoyé" });
    } catch (err) {
      console.error("[FORGOT PASSWORD] Error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Reset password with code
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "Email, code et nouveau mot de passe requis" });
      }
      if (newPassword.length < 4) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 4 caractères" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

      if (!user.passwordResetToken || user.passwordResetToken !== code) {
        return res.status(400).json({ message: "Code incorrect" });
      }
      if (!user.passwordResetExpiry || new Date() > new Date(user.passwordResetExpiry)) {
        return res.status(400).json({ message: "Code expiré. Demandez un nouveau code." });
      }

      const hashed = await bcrypt.hash(newPassword.trim(), 10);
      await db.update(users as any)
        .set({ password: hashed, passwordResetToken: null, passwordResetExpiry: null })
        .where(eq((users as any).id, user.id));

      // Auto-login: créer la session
      (req as any).session.userId = user.id;
      await new Promise<void>((resolve, reject) =>
        (req as any).session.save((err: any) => (err ? reject(err) : resolve()))
      );

      res.json({ message: "Mot de passe mis à jour avec succès", loggedIn: true });
    } catch (err) {
      console.error("[RESET PASSWORD] Error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Simple login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { phoneNumber, password } = simpleLoginSchema.parse(req.body);
      
      console.log(`[LOGIN ATTEMPT] Phone: ${phoneNumber}, Password length: ${password.length}`);
      
      const user = await storage.getUserByPhone(phoneNumber);
      if (!user) {
        console.log(`[LOGIN FAILED] User not found for phone: ${phoneNumber}`);
        return res.status(401).json({ message: "Numéro de téléphone ou mot de passe incorrect" });
      }

      if (!user.password) {
        console.log(`[LOGIN FAILED] No password set for phone: ${phoneNumber}`);
        return res.status(401).json({ message: "Numéro de téléphone ou mot de passe incorrect" });
      }

      // Check if account is blocked BEFORE checking password
      if (user.isBlocked) {
        console.log(`[LOGIN FAILED] Account blocked for user: ${phoneNumber}`);
        return res.status(403).json({ message: "Votre compte est bloqué", blocked: true });
      }

      const isValidPassword = await bcrypt.compare(password.trim(), user.password);
      console.log(`[LOGIN] Password validation result: ${isValidPassword} for phone: ${phoneNumber}`);
      console.log(`[LOGIN DEBUG] Password from request (trimmed, length): ${password.trim().length}`);
      console.log(`[LOGIN DEBUG] Stored hash (length): ${user.password.length}`);
      
      if (!isValidPassword) {
        console.log(`[LOGIN FAILED] Invalid password for user: ${phoneNumber}`);
        return res.status(401).json({ message: "Numéro de téléphone ou mot de passe incorrect" });
      }

      // Set session
      (req as any).session.userId = user.id;
      
      console.log(`[LOGIN SUCCESS] User ${phoneNumber} logged in successfully`);

      res.json({ message: "Connexion réussie", user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Données invalides", errors: error.issues });
      }
      res.status(500).json({ message: "Erreur lors de la connexion" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la déconnexion" });
      }
      res.json({ message: "Déconnexion réussie" });
    });
  });

  // User balance
  app.get('/api/user/balance', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const balance = await storage.getUserBalance(userId);
      res.json({ balance });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du solde" });
    }
  });

  // Transactions
  app.get('/api/transactions', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string;
      const status = req.query.status as string;
      const categories = req.query.categories as string; // comma-separated list of transaction types
      const transactions = await storage.getUserTransactions(userId, limit, type, status, categories);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des transactions" });
    }
  });

  // Transfer money (only between SIKA TEXTE users)
  app.post('/api/transactions/transfer', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { recipientPhone, amount, message } = transferSchema.parse(req.body);

      // Check sender account is active
      const senderStatus = await storage.getAccountStatus(userId);
      if (!senderStatus?.isActive) {
        return res.status(403).json({ message: "Votre compte doit être activé pour effectuer des transferts" });
      }

      // Check if recipient exists in SIKA TEXTE system
      const recipient = await storage.getUserByPhone(recipientPhone);
      if (!recipient) {
        return res.status(400).json({ message: "Le numéro de téléphone ne correspond à aucun compte SIKA TEXTE" });
      }
      
      // Check sender balance
      const balance = await storage.getUserBalance(userId);
      if (balance < amount) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      // Create sender transaction (debit)
      const senderTransaction = await storage.createTransaction({
        userId,
        type: 'transfer',
        amount: amount.toString(),
        recipientPhone,
        description: message || `Transfert vers ${recipient.fullName || recipient.firstName + ' ' + recipient.lastName || recipientPhone}`,
        status: 'completed',
      });

      // Create recipient transaction (credit)
      const recipientTransaction = await storage.createTransaction({
        userId: recipient.id,
        type: 'transfer_received',
        amount: amount.toString(),
        recipientPhone: userId, // Store sender ID in recipientPhone field for received transfers
        description: message || `Reçu de ${await storage.getUser(userId).then(u => u?.fullName || u?.firstName + ' ' + u?.lastName || 'Utilisateur')}`,
        status: 'completed',
      });

      // Update balances
      await storage.updateUserBalance(userId, -amount); // Debit sender
      await storage.updateUserBalance(recipient.id, amount); // Credit recipient

      res.json({ 
        message: `Transfert effectué avec succès vers ${recipient.fullName || recipient.firstName + ' ' + recipient.lastName || recipientPhone}`, 
        transaction: senderTransaction,
        recipient: {
          name: recipient.fullName || recipient.firstName + ' ' + recipient.lastName,
          phone: recipientPhone
        }
      });
    } catch (error: any) {
      console.error("Transfer error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Données invalides", errors: error.issues });
      }
      res.status(500).json({ message: "Erreur lors du transfert" });
    }
  });

  // Recharge credit
  app.post('/api/transactions/recharge', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { operator, phone, amount } = rechargeSchema.parse(req.body);
      
      // Check balance
      const balance = await storage.getUserBalance(userId);
      if (balance < amount) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      // Create transaction
      const transaction = await storage.createTransaction({
        userId,
        type: 'recharge',
        amount: amount.toString(),
        recipientPhone: phone,
        operator,
        status: 'completed',
      });

      // Update balance
      await storage.updateUserBalance(userId, -amount);

      res.json({ message: "Recharge effectuée avec succès", transaction });
    } catch (error: any) {
      console.error("Recharge error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Données invalides", errors: error.issues });
      }
      res.status(500).json({ message: "Erreur lors de la recharge" });
    }
  });

  // Merchant payment
  app.post('/api/transactions/payment', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { merchantCode, amount, description } = paymentSchema.parse(req.body);
      
      // Check balance
      const balance = await storage.getUserBalance(userId);
      if (balance < amount) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      // Create transaction
      const transaction = await storage.createTransaction({
        userId,
        type: 'payment',
        amount: amount.toString(),
        merchantCode,
        description,
        status: 'completed',
      });

      // Update balance
      await storage.updateUserBalance(userId, -amount);

      res.json({ message: "Paiement effectué avec succès", transaction });
    } catch (error: any) {
      console.error("Payment error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Données invalides", errors: error.issues });
      }
      res.status(500).json({ message: "Erreur lors du paiement" });
    }
  });

  // Deposit (for demo)
  app.post('/api/transactions/deposit', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Montant invalide" });
      }

      // Create transaction
      const transaction = await storage.createTransaction({
        userId,
        type: 'deposit',
        amount: amount.toString(),
        status: 'completed',
        description: 'Dépôt Sika',
      });

      // Update balance
      await storage.updateUserBalance(userId, amount);

      res.json({ message: "Dépôt effectué avec succès", transaction });
    } catch (error) {
      console.error("Deposit error:", error);
      res.status(500).json({ message: "Erreur lors du dépôt" });
    }
  });

  // Pointage (random bonus system)
  app.post('/api/transactions/pointage', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { amount } = req.body;
      
      if (!amount) {
        return res.status(400).json({ message: "Montant invalide" });
      }

      // Check if user already did pointage today
      const today = new Date().toISOString().split('T')[0];
      const existingPointage = await storage.getUserTransactions(userId, 50, 'pointage');
      const todayPointage = existingPointage.find(t => 
        t.createdAt && new Date(t.createdAt).toISOString().split('T')[0] === today
      );
      
      if (todayPointage) {
        return res.status(400).json({ message: "Vous ne pouvez faire qu'un pointage par jour" });
      }

      // Ensure amount is positive (300-800 FCFA)
      const positiveAmount = Math.abs(amount);
      const validAmount = Math.min(Math.max(positiveAmount, 300), 800);

      // Create transaction
      const transaction = await storage.createTransaction({
        userId,
        type: 'pointage',
        amount: validAmount.toString(),
        status: 'completed',
        description: 'Bonus Pointage',
      });

      // Update balance
      await storage.updateUserBalance(userId, validAmount);

      res.json({ 
        message: "Bonus reçu avec succès!", 
        transaction,
        amount: validAmount
      });
    } catch (error) {
      console.error("Pointage error:", error);
      res.status(500).json({ message: "Erreur lors du pointage" });
    }
  });

  // Referral stats
  app.get('/api/referrals/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const stats = await storage.getReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des statistiques" });
    }
  });


  // Update profile
  app.put('/api/user/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { fullName, phone, email } = req.body;

      if (!email || !email.trim()) {
        return res.status(400).json({ message: "L'adresse email est obligatoire" });
      }
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Adresse email invalide" });
      }

      const user = await storage.upsertUser({
        id: userId,
        fullName,
        phone,
        email,
        updatedAt: new Date(),
      });

      res.json({ message: "Profil mis à jour avec succès", user });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
    }
  });

  // SIKA TEXTE BUSINESS - Work routes
  app.get('/api/work/progress', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const today = new Date().toISOString().split('T')[0];
      const progress = await storage.getWorkProgress(userId, today);
      const maxPerDay = 12;
      const canWorkToday = !progress || progress.correctionsCount < maxPerDay;
      
      res.json({
        correctedToday: progress?.correctionsCount || 0,
        maxPerDay,
        totalEarned: progress?.earningsToday || 0,
        canWorkToday,
        nextWorkTime: canWorkToday ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error('Error fetching work progress:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération du progrès' });
    }
  });

  app.get('/api/work/sentences', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const sentences = await storage.getDailySentences(userId, 12);
      res.json(sentences);
    } catch (error) {
      console.error('Error fetching daily sentences:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des phrases quotidiennes' });
    }
  });

  app.post('/api/work/submit', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { sentenceId, answer } = workSubmissionSchema.parse(req.body);
      
      const result = await storage.submitCorrection(userId, sentenceId, answer);
      if (result.correct) {
        await storage.updateUserBalance(userId, result.reward);
        
        // Create a transaction record for the correction earnings
        await storage.createTransaction({
          userId,
          type: 'deposit',
          amount: result.reward.toString(),
          status: 'completed',
          description: 'Gains de correction de phrase'
        });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error('Error submitting correction:', error);
      if (error.issues) {
        return res.status(400).json({ message: 'Données invalides', errors: error.issues });
      }
      res.status(500).json({ message: 'Erreur lors de la soumission' });
    }
  });

  // Account activation routes
  app.get('/api/withdrawal', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const accountStatus = await storage.getAccountStatus(userId);
      const withdrawals = await storage.getUserWithdrawals(userId);
      const balance = await storage.getUserBalance(userId);
      
      res.json({
        balance,
        isAccountActive: accountStatus?.isActive || false,
        withdrawalHistory: withdrawals
      });
    } catch (error) {
      console.error('Error fetching withdrawal data:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des données de retrait' });
    }
  });

  app.post('/api/account/activate', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { activationFee } = activationSchema.parse(req.body);
      
      // Check if user has sufficient balance
      const balance = await storage.getUserBalance(userId);
      if (balance < activationFee) {
        return res.status(400).json({ message: 'Solde insuffisant pour l\'activation' });
      }

      // Deduct activation fee and activate account
      await storage.updateUserBalance(userId, -activationFee);
      await storage.activateAccount(userId);
      
      res.json({ message: 'Compte activé avec succès' });
    } catch (error: any) {
      console.error('Error activating account:', error);
      if (error.issues) {
        return res.status(400).json({ message: 'Données invalides', errors: error.issues });
      }
      res.status(500).json({ message: 'Erreur lors de l\'activation du compte' });
    }
  });

  // ── Spay Network Settings ────────────────────────────────
  app.get('/api/user/spay-settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const result = await db.execute(sql`SELECT saved_pcs_code, low_latency_mode FROM users WHERE id = ${userId}`);
      const row = result.rows?.[0] as any;
      const hasSavedCode = !!(row?.saved_pcs_code);
      res.json({
        hasSavedPcsCode: hasSavedCode,
        savedPcsCodeMasked: hasSavedCode ? `${(row.saved_pcs_code as string).slice(0, 4)}${'*'.repeat(Math.max(0, (row.saved_pcs_code as string).length - 4))}` : null,
        lowLatencyMode: !!(row?.low_latency_mode),
      });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  app.post('/api/user/spay-settings/pcs-code', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { pcsCode } = req.body;
      if (!pcsCode || typeof pcsCode !== 'string') {
        return res.status(400).json({ message: 'Code PCS invalide' });
      }
      const normalized = pcsCode.trim().toUpperCase();
      // Validate PCS format: PCS-XXXX-XXXX-XXXX-XXXX
      const pcsFormatRegex = /^PCS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
      if (!pcsFormatRegex.test(normalized)) {
        return res.status(400).json({ message: 'Format de code invalide. Format attendu: PCS-XXXX-XXXX-XXXX-XXXX' });
      }

      // Check if code exists in pcs_codes and belongs to this user
      const [existingCode] = await db.select()
        .from(pcsCodes)
        .where(and(eq(pcsCodes.code, normalized), eq(pcsCodes.userId, userId)))
        .limit(1);

      if (!existingCode) {
        // Code doesn't exist for this user at all
        return res.status(400).json({
          message: '❌ Code PCS introuvable. Ce code n\'est pas associé à votre compte. Vérifiez le code reçu ou contactez le support.',
        });
      }

      if (existingCode.status !== 'actif') {
        // Code exists but is inactive — admin hasn't activated it yet
        return res.status(400).json({
          message: '⏳ Code PCS Spay inactif.',
        });
      }

      // Code is valid and active — save it
      await db.execute(sql`UPDATE users SET saved_pcs_code = ${normalized} WHERE id = ${userId}`);
      res.json({ success: true, message: '✅ Code PCS configuré avec succès. Vos retraits sont désormais sécurisés.' });
    } catch (err) {
      console.error('[PCS CONFIG]', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  app.delete('/api/user/spay-settings/pcs-code', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      await db.execute(sql`UPDATE users SET saved_pcs_code = NULL WHERE id = ${userId}`);
      res.json({ success: true, message: 'Code PCS supprimé' });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  app.post('/api/user/spay-settings/low-latency', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { enabled } = req.body;
      await db.execute(sql`UPDATE users SET low_latency_mode = ${!!enabled} WHERE id = ${userId}`);
      res.json({ success: true, lowLatencyMode: !!enabled });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  app.post('/api/withdrawal/request', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { amount, pcsCode } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Montant invalide' });
      }
      
      // Check if account is active
      const accountStatus = await storage.getAccountStatus(userId);
      if (!accountStatus?.isActive) {
        return res.status(400).json({ message: 'Compte non activé' });
      }

      // Validate PCS code — use saved code if available, otherwise require from request
      let resolvedPcsCode = pcsCode ? pcsCode.trim().toUpperCase() : null;
      if (!resolvedPcsCode) {
        // Try to use saved PCS code from user profile
        const savedResult = await db.execute(sql`SELECT saved_pcs_code FROM users WHERE id = ${userId}`);
        const savedRow = savedResult.rows?.[0] as any;
        if (savedRow?.saved_pcs_code) {
          resolvedPcsCode = savedRow.saved_pcs_code as string;
        }
      }
      if (!resolvedPcsCode) {
        return res.status(400).json({ message: 'Code PCS Secure Pay requis', requiresPcsCode: true });
      }
      const [matchingCode] = await db.select()
        .from(pcsCodes)
        .where(and(eq(pcsCodes.userId, userId), eq(pcsCodes.code, resolvedPcsCode)))
        .limit(1);
      if (!matchingCode) {
        return res.status(400).json({ message: 'Code PCS Secure Pay invalide ou non associé à votre compte', requiresPcsCode: true });
      }
      
      // Check if user has a bank card
      const bankCard = await storage.getUserBankCard(userId);
      if (!bankCard) {
        return res.status(400).json({ message: 'Aucune carte bancaire enregistrée. Veuillez ajouter une carte avant de faire un retrait.' });
      }
      
      // Check balance
      const balance = await storage.getUserBalance(userId);
      if (balance < amount) {
        return res.status(400).json({ message: 'Solde insuffisant' });
      }
      
      // Get user phone number and auto_withdrawal_mode
      const user = await storage.getUser(userId);
      const userPhone = user?.phone || '';

      // Check auto withdrawal mode
      const modeResult = await db.execute(sql`SELECT auto_withdrawal_mode FROM users WHERE id = ${userId}`);
      const withdrawalMode = (modeResult.rows?.[0] as any)?.auto_withdrawal_mode || 'manual';
      
      // Generate unique reference for linking withdrawal and transaction
      const reference = `WD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      if (withdrawalMode === 'auto') {
        // Auto mode: create withdrawal and immediately mark as completed
        const withdrawal = await storage.createWithdrawal(
          userId, amount, userPhone,
          bankCard.firstName, bankCard.lastName, bankCard.cardNumber, reference
        );
        await storage.updateUserBalance(userId, -amount);
        // Mark withdrawal as completed immediately
        await db.execute(sql`UPDATE withdrawals SET status = 'completed' WHERE id = ${withdrawal.id}`);
        await storage.createTransaction({
          userId, type: 'withdrawal', amount: amount.toString(),
          recipientPhone: userPhone, description: 'Retrait automatique sur carte bancaire',
          status: 'completed', reference
        });
        return res.json({ message: 'Retrait traité avec succès', withdrawal, autoWithdrawal: true });
      }
      
      // Create withdrawal request using bank card (save card info at time of withdrawal)
      const withdrawal = await storage.createWithdrawal(
        userId, 
        amount, 
        userPhone,
        bankCard.firstName,
        bankCard.lastName,
        bankCard.cardNumber,
        reference
      );
      
      // Deduct from balance
      await storage.updateUserBalance(userId, -amount);
      
      // Create transaction record with same reference
      await storage.createTransaction({
        userId,
        type: 'withdrawal',
        amount: amount.toString(),
        recipientPhone: userPhone,
        description: 'Retrait sur carte bancaire',
        status: 'pending',
        reference
      });
      
      res.json({ message: 'Demande de retrait créée avec succès', withdrawal });
    } catch (error: any) {
      console.error('Error creating withdrawal:', error);
      if (error.issues) {
        return res.status(400).json({ message: 'Données invalides', errors: error.issues });
      }
      res.status(500).json({ message: 'Erreur lors de la création de la demande de retrait' });
    }
  });

  // Enhanced referrals with proper data
  app.get('/api/referrals', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const referrals = await storage.getUserReferrals(userId);
      const stats = await storage.getReferralStats(userId);
      
      // Ensure user has a referral code, generate and save one if missing
      let referralCode = user?.referralCode;
      if (!referralCode) {
        referralCode = randomBytes(3).toString('hex').toUpperCase();
        await storage.upsertUser({ id: userId, referralCode });
      }
      
      // Get account activation status for each referred user
      const activatedReferralsCount = await Promise.all(
        referrals.filter(r => r.referredUser).map(async (r) => {
          const accountStatus = await storage.getAccountStatus(r.referredUserId);
          return accountStatus?.isActive === true ? 1 : 0;
        })
      ).then(results => results.reduce((sum: number, val: number) => sum + val, 0));
      
      const referralData = {
        referralCode,
        totalReferrals: stats.totalReferrals,
        activeReferrals: activatedReferralsCount, // Count only activated accounts
        totalCommission: stats.totalCommission,
        monthlyCommission: stats.monthlyCommission,
        referrals: referrals.map(r => ({
          id: r.id,
          name: r.referredUser?.fullName || 'Utilisateur',
          joinDate: r.createdAt,
          isActive: true, // Simplified for now
          commissionEarned: parseFloat((r.commission || '0').toString())
        }))
      };
      
      res.json(referralData);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des parrainages' });
    }
  });

  // Bank card operations
  app.get('/api/bank-card', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const bankCard = await storage.getUserBankCard(userId);
      res.json(bankCard);
    } catch (error) {
      console.error('Error fetching bank card:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération de la carte bancaire' });
    }
  });

  app.post('/api/bank-card', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { firstName, lastName, cardNumber, operator, country } = req.body;

      if (!firstName || !lastName || !cardNumber || !operator || !country) {
        return res.status(400).json({ message: 'Prénom, nom, numéro de retrait, opérateur et pays requis' });
      }

      if (!/^\+[0-9]{3}[0-9]{8,}$/.test(cardNumber)) {
        return res.status(400).json({ message: 'Le numéro doit commencer par l\'indicatif (+228, +229, etc.)' });
      }

      const bankCard = await storage.createBankCard(userId, firstName, lastName, cardNumber, operator, country);
      res.status(201).json({ message: 'Carte bancaire enregistrée avec succès', bankCard });
    } catch (error: any) {
      console.error('Error creating bank card:', error);
      res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la carte bancaire' });
    }
  });

  app.put('/api/bank-card/:cardId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { cardId } = req.params;
      const { firstName, lastName, cardNumber, operator, country } = req.body;

      if (!firstName || !lastName || !cardNumber || !operator || !country) {
        return res.status(400).json({ message: 'Prénom, nom, numéro de retrait, opérateur et pays requis' });
      }

      if (!/^\+[0-9]{3}[0-9]{8,}$/.test(cardNumber)) {
        return res.status(400).json({ message: 'Le numéro doit commencer par l\'indicatif (+228, +229, etc.)' });
      }

      const bankCard = await storage.updateBankCard(cardId, userId, firstName, lastName, cardNumber, operator, country);
      res.json({ message: 'Carte bancaire mise à jour avec succès', bankCard });
    } catch (error: any) {
      console.error('Error updating bank card:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour de la carte bancaire' });
    }
  });

  app.delete('/api/bank-card/:cardId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { cardId } = req.params;
      
      const success = await storage.deleteBankCard(cardId, userId);
      if (!success) {
        return res.status(404).json({ message: 'Carte bancaire non trouvée' });
      }
      res.json({ message: 'Carte bancaire supprimée avec succès' });
    } catch (error: any) {
      console.error('Error deleting bank card:', error);
      res.status(500).json({ message: 'Erreur lors de la suppression de la carte bancaire' });
    }
  });

  // Admin routes - Système administrateur complet
  
  // Statistiques du site pour admin
  // Get identity verifications (admin only)
  app.get('/api/admin/identity-verifications', requireAdmin, async (req: any, res) => {
    try {
      const verifications = await storage.getAllIdentityVerifications();
      res.json(verifications);
    } catch (error) {
      console.error("Error fetching identity verifications:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des vérifications d'identité" });
    }
  });

  // Get pending withdrawals for admin
  app.get('/api/admin/withdrawals/pending', requireAdmin, async (req: any, res) => {
    try {
      const withdrawals = await storage.getPendingWithdrawalsList();
      res.json(withdrawals);
    } catch (error) {
      console.error("Error fetching pending withdrawals:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des retraits" });
    }
  });

  // Approve withdrawal
  app.post('/api/admin/withdrawals/:id/approve', requireAdmin, async (req: any, res) => {
    try {
      console.log('[ADMIN] Approving withdrawal:', req.params.id);
      await storage.updateWithdrawalStatus(req.params.id, 'completed');
      console.log('[ADMIN] Withdrawal approved successfully:', req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      res.status(500).json({ message: "Erreur lors de l'approbation" });
    }
  });

  // Reject withdrawal
  app.post('/api/admin/withdrawals/:id/reject', requireAdmin, async (req: any, res) => {
    try {
      console.log('[ADMIN WITHDRAWAL REJECT] Starting rejection for withdrawal:', req.params.id);
      const withdrawal = await storage.getWithdrawalById(req.params.id);
      if (!withdrawal) {
        console.log('[ADMIN WITHDRAWAL REJECT] Withdrawal not found:', req.params.id);
        return res.status(404).json({ message: "Retrait non trouvé" });
      }
      
      console.log(`[ADMIN WITHDRAWAL REJECT] Withdrawal found - User: ${withdrawal.userId}, Amount: ${withdrawal.amount}, Status: ${withdrawal.status}`);
      
      // Check if withdrawal is still pending (prevent double refunds)
      if (withdrawal.status !== 'pending') {
        console.log(`[ADMIN WITHDRAWAL REJECT] Withdrawal already processed with status: ${withdrawal.status}`);
        return res.status(409).json({ 
          message: `Ce retrait a déjà été traité (statut: ${withdrawal.status})`,
          alreadyProcessed: true,
          currentStatus: withdrawal.status
        });
      }
      
      // Get user info before refund
      const userBefore = await storage.getUser(withdrawal.userId);
      const balanceBefore = parseFloat(userBefore?.balance || '0');
      
      // Refund the amount to user's balance
      const refundAmount = parseFloat(withdrawal.amount);
      await storage.updateUserBalance(withdrawal.userId, refundAmount);
      
      console.log(`[ADMIN WITHDRAWAL REJECT] Refunded ${refundAmount} FCFA to user ${withdrawal.userId}. Balance: ${balanceBefore} → ${balanceBefore + refundAmount}`);
      
      // Create refund transaction for tracking
      await storage.createTransaction({
        userId: withdrawal.userId,
        type: 'deposit',
        amount: withdrawal.amount,
        description: 'Remboursement retrait rejeté',
        status: 'completed'
      });
      
      console.log('[ADMIN WITHDRAWAL REJECT] Refund transaction created');
      
      // Update withdrawal status to failed
      await storage.updateWithdrawalStatus(req.params.id, 'failed');
      
      console.log('[ADMIN WITHDRAWAL REJECT] Withdrawal rejected successfully:', req.params.id);
      res.json({ success: true, message: 'Retrait rejeté et montant remboursé' });
    } catch (error) {
      console.error("[ADMIN WITHDRAWAL REJECT] Error rejecting withdrawal:", error);
      res.status(500).json({ message: "Erreur lors du rejet" });
    }
  });

  // Admin update user bank card
  app.put('/api/admin/bank-card/:cardId', requireAdmin, async (req: any, res) => {
    try {
      const { cardId } = req.params;
      const { firstName, lastName, cardNumber } = req.body;

      if (!firstName || !lastName || !cardNumber) {
        return res.status(400).json({ message: 'Prénom, nom et numéro de carte requis' });
      }

      // For admin, we bypass userId check and update directly
      const [card] = await db
        .update(bankCards)
        .set({
          firstName,
          lastName,
          cardNumber,
          updatedAt: new Date(),
        })
        .where(eq(bankCards.id, cardId))
        .returning();

      if (!card) {
        return res.status(404).json({ message: 'Carte bancaire non trouvée' });
      }

      res.json({ message: 'Carte bancaire mise à jour avec succès', bankCard: card });
    } catch (error: any) {
      console.error('Error updating bank card:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour de la carte bancaire' });
    }
  });

  // Approve all pending withdrawals
  app.post('/api/admin/withdrawals/approve-all', requireAdmin, async (req: any, res) => {
    try {
      const pendingWithdrawals = await storage.getPendingWithdrawalsList();
      
      // Approve all pending withdrawals
      for (const withdrawal of pendingWithdrawals) {
        await storage.updateWithdrawalStatus(withdrawal.id, 'completed');
      }
      
      res.json({ 
        success: true, 
        count: pendingWithdrawals.length,
        message: `${pendingWithdrawals.length} retrait(s) approuvé(s) avec succès`
      });
    } catch (error) {
      console.error("Error approving all withdrawals:", error);
      res.status(500).json({ message: 'Erreur lors de la validation des retraits' });
    }
  });

  // Reject all pending withdrawals
  app.post('/api/admin/withdrawals/reject-all', requireAdmin, async (req: any, res) => {
    try {
      console.log('[ADMIN WITHDRAWAL REJECT-ALL] Starting bulk rejection');
      const pendingWithdrawals = await storage.getPendingWithdrawalsList();
      
      console.log(`[ADMIN WITHDRAWAL REJECT-ALL] Found ${pendingWithdrawals.length} pending withdrawals`);
      
      let refundedCount = 0;
      let totalRefunded = 0;
      
      // Reject all pending withdrawals and refund users
      for (const withdrawal of pendingWithdrawals) {
        const refundAmount = parseFloat(withdrawal.amount);
        
        // Refund the user
        await storage.updateUserBalance(withdrawal.userId, refundAmount);
        
        // Create refund transaction
        await storage.createTransaction({
          userId: withdrawal.userId,
          type: 'deposit',
          amount: withdrawal.amount,
          description: 'Remboursement retrait rejeté (rejet en masse)',
          status: 'completed'
        });
        
        // Update withdrawal status
        await storage.updateWithdrawalStatus(withdrawal.id, 'failed');
        
        refundedCount++;
        totalRefunded += refundAmount;
        
        console.log(`[ADMIN WITHDRAWAL REJECT-ALL] Refunded ${refundAmount} FCFA to user ${withdrawal.userId}`);
      }
      
      console.log(`[ADMIN WITHDRAWAL REJECT-ALL] Completed: ${refundedCount} withdrawals rejected, ${totalRefunded} FCFA refunded`);
      
      res.json({ 
        success: true, 
        count: refundedCount,
        totalRefunded: totalRefunded,
        message: `${refundedCount} retrait(s) rejeté(s) et ${totalRefunded} FCFA remboursé(s)`
      });
    } catch (error) {
      console.error("[ADMIN WITHDRAWAL REJECT-ALL] Error rejecting all withdrawals:", error);
      res.status(500).json({ message: "Erreur lors du rejet des retraits" });
    }
  });

  // Cancel withdrawal (delete + refund) - fully atomic transaction
  app.post('/api/admin/withdrawals/:id/cancel', requireAdmin, async (req: any, res) => {
    try {
      console.log('[ADMIN WITHDRAWAL CANCEL] Starting atomic cancellation for withdrawal:', req.params.id);
      
      // Atomic operation: delete + refund + create transaction all in one DB transaction
      const result = await storage.cancelWithdrawalAtomic(
        req.params.id,
        'Remboursement retrait annulé'
      );
      
      if (!result.success) {
        if (result.error === 'not_found_or_processed') {
          console.log('[ADMIN WITHDRAWAL CANCEL] Withdrawal not found or already processed:', req.params.id);
          return res.status(409).json({ 
            message: "Ce retrait a déjà été traité ou n'existe pas",
            alreadyProcessed: true
          });
        }
        
        console.error('[ADMIN WITHDRAWAL CANCEL] Transaction failed:', result.error);
        return res.status(500).json({ message: "Erreur lors de l'annulation du retrait" });
      }
      
      console.log('[ADMIN WITHDRAWAL CANCEL] Withdrawal canceled successfully:', req.params.id);
      res.json({ success: true, message: 'Retrait annulé et montant remboursé' });
    } catch (error) {
      console.error("[ADMIN WITHDRAWAL CANCEL] Error canceling withdrawal:", error);
      res.status(500).json({ message: "Erreur lors de l'annulation du retrait" });
    }
  });

  // Cancel all pending withdrawals (delete + refund) - uses atomic cancellation
  app.post('/api/admin/withdrawals/cancel-all', requireAdmin, async (req: any, res) => {
    try {
      console.log('[ADMIN WITHDRAWAL CANCEL-ALL] Starting bulk atomic cancellation');
      const pendingWithdrawals = await storage.getPendingWithdrawalsList();
      
      console.log(`[ADMIN WITHDRAWAL CANCEL-ALL] Found ${pendingWithdrawals.length} pending withdrawals at snapshot time`);
      
      let canceledCount = 0;
      let totalRefunded = 0;
      let skippedCount = 0;
      
      for (const withdrawal of pendingWithdrawals) {
        // Use atomic cancel (delete + refund + transaction) in one DB transaction
        const result = await storage.cancelWithdrawalAtomic(
          withdrawal.id,
          'Remboursement retrait annulé (annulation en masse)'
        );
        
        if (!result.success) {
          // Withdrawal was already processed by another request
          console.log(`[ADMIN WITHDRAWAL CANCEL-ALL] Skipping withdrawal ${withdrawal.id} - already processed or failed`);
          skippedCount++;
          continue;
        }
        
        const refundAmount = parseFloat(result.withdrawal!.amount);
        canceledCount++;
        totalRefunded += refundAmount;
        
        console.log(`[ADMIN WITHDRAWAL CANCEL-ALL] Canceled and refunded ${refundAmount} FCFA to user ${result.withdrawal!.userId}`);
      }
      
      console.log(`[ADMIN WITHDRAWAL CANCEL-ALL] Completed: ${canceledCount} withdrawals canceled, ${skippedCount} skipped, ${totalRefunded} FCFA refunded`);
      
      res.json({ 
        success: true, 
        count: canceledCount,
        skipped: skippedCount,
        totalRefunded: totalRefunded,
        message: `${canceledCount} retrait(s) annulé(s) et ${totalRefunded} FCFA remboursé(s)`
      });
    } catch (error) {
      console.error("[ADMIN WITHDRAWAL CANCEL-ALL] Error canceling all withdrawals:", error);
      res.status(500).json({ message: "Erreur lors de l'annulation des retraits" });
    }
  });

  // Notifications routes
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des notifications" });
    }
  });

  app.post('/api/admin/notifications', requireAdmin, async (req: any, res) => {
    try {
      const { userId, message } = req.body;
      if (!userId || !message) {
        return res.status(400).json({ message: "userId et message requis" });
      }
      const notification = await storage.createNotification(userId, message);
      res.json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Erreur lors de la création de la notification" });
    }
  });

  app.post('/api/notifications/seen', requireAuth, async (req: any, res) => {
    try {
      const { notificationId } = req.body;
      if (!notificationId) {
        return res.status(400).json({ message: "notificationId requis" });
      }
      await storage.markNotificationSeen(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as seen:", error);
      res.status(500).json({ message: "Erreur lors du marquage de la notification" });
    }
  });

  // Route pour notifier en masse tous les utilisateurs avec retraits en attente
  app.post('/api/admin/notify-all-pending-withdrawals', requireAdmin, async (req: any, res) => {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Le message ne peut pas être vide" });
      }
      
      console.log("[ADMIN NOTIFY-ALL] Starting bulk notification for pending withdrawals");
      const result = await storage.notifyAllPendingWithdrawals(message.trim());
      
      console.log(`[ADMIN NOTIFY-ALL] Notified ${result.count} user(s) with pending withdrawals`);
      
      res.json({ 
        success: true, 
        count: result.count,
        message: `${result.count} utilisateur(s) notifié(s) avec succès`
      });
    } catch (error) {
      console.error("Error notifying pending withdrawals:", error);
      res.status(500).json({ message: "Erreur lors de l'envoi des notifications" });
    }
  });

  app.get('/api/admin/stats', requireAdmin, async (req: any, res) => {
    try {
      const totalUsers = await storage.getTotalUsersCount();
      const totalDeposits = await storage.getTotalDepositsCount();
      const totalWithdrawals = await storage.getTotalWithdrawalsCount();
      const pendingWithdrawals = await storage.getPendingWithdrawalsCount();
      const pendingDeposits = await storage.getPendingDepositsCount();
      const completedDeposits = await storage.getCompletedDepositsCount();
      const completedWithdrawals = await storage.getCompletedWithdrawalsCount();
      
      res.json({
        totalUsers,
        totalDeposits,
        totalWithdrawals,
        pendingWithdrawals,
        pendingDeposits,
        completedDeposits,
        completedWithdrawals
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
    }
  });

  // Recherche d'utilisateurs par téléphone ou email pour admin
  app.get('/api/admin/users/search', requireAdmin, async (req: any, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ message: 'Critère de recherche requis' });
      }
      
      const users = await storage.searchUsersByPhoneOrEmail(query);
      res.json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: 'Erreur lors de la recherche des utilisateurs' });
    }
  });

  // Utilisateurs connectés actuellement
  app.get('/api/admin/users/online', requireAdmin, async (req: any, res) => {
    try {
      const onlineUsers = await storage.getOnlineUsers();
      res.json(onlineUsers);
    } catch (error) {
      console.error('Error fetching online users:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs en ligne' });
    }
  });

  // Obtenir tous les utilisateurs avec parrainages pour admin
  app.get('/api/admin/users', requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsersWithReferrals();
      res.json(users);
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
    }
  });

  // Modifier le solde d'un utilisateur (admin seulement)
  app.post('/api/admin/users/:userId/balance', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { amount, description } = adminUpdateBalanceSchema.parse(req.body);
      
      await storage.updateUserBalance(userId, amount);
      
      // Créer une transaction pour l'historique
      await storage.createTransaction({
        userId,
        type: 'deposit',
        amount: amount.toString(),
        description: `ADMIN: ${description}`,
        status: 'completed'
      });
      
      res.json({ message: 'Solde mis à jour avec succès' });
    } catch (error: any) {
      console.error('Error updating user balance:', error);
      if (error.issues) {
        return res.status(400).json({ message: 'Données invalides', errors: error.issues });
      }
      res.status(500).json({ message: 'Erreur lors de la mise à jour du solde' });
    }
  });

  // Modifier le solde d'un utilisateur sans historique (admin seulement)
  app.post('/api/admin/users/:userId/balance-no-history', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { amount } = adminUpdateBalanceSchema.parse(req.body);
      
      await storage.setUserBalance(userId, amount);
      
      res.json({ message: 'Solde défini avec succès (sans historique)' });
    } catch (error: any) {
      console.error('Error setting user balance without history:', error);
      if (error.issues) {
        return res.status(400).json({ message: 'Données invalides', errors: error.issues });
      }
      res.status(500).json({ message: 'Erreur lors de la définition du solde' });
    }
  });

  // Get all PCS codes for a user (admin)
  app.get('/api/admin/users/:userId/pcs-codes', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const codes = await db.select({
        id: pcsCodes.id,
        code: pcsCodes.code,
        status: pcsCodes.status,
        createdAt: pcsCodes.createdAt,
      })
        .from(pcsCodes)
        .where(eq(pcsCodes.userId, userId))
        .orderBy(desc(pcsCodes.createdAt));
      res.json(codes);
    } catch (error) {
      console.error('Error fetching user PCS codes:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des codes PCS' });
    }
  });

  // Update PCS code status (admin)
  app.patch('/api/admin/pcs-codes/:codeId/status', requireAdmin, async (req: any, res) => {
    try {
      const { codeId } = req.params;
      const { status } = req.body;
      if (!['actif', 'inactif'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide. Utilisez actif ou inactif.' });
      }
      await db.update(pcsCodes).set({ status }).where(eq(pcsCodes.id, codeId));
      res.json({ success: true, codeId, status });
    } catch (error) {
      console.error('Error updating PCS code status:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour du statut' });
    }
  });

  // Delete PCS code (admin)
  app.delete('/api/admin/pcs-codes/:codeId', requireAdmin, async (req: any, res) => {
    try {
      const { codeId } = req.params;
      const [existing] = await db.select().from(pcsCodes).where(eq(pcsCodes.id, codeId)).limit(1);
      if (!existing) return res.status(404).json({ message: 'Code PCS introuvable.' });
      await db.delete(pcsCodes).where(eq(pcsCodes.id, codeId));
      console.log(`[ADMIN PCS] Deleted code ${existing.code} (id: ${codeId})`);
      res.json({ success: true, deleted: existing.code });
    } catch (error) {
      console.error('Error deleting PCS code:', error);
      res.status(500).json({ message: 'Erreur lors de la suppression du code PCS.' });
    }
  });

  app.post('/api/admin/pcs-codes/:codeId/update-and-send', requireAdmin, async (req: any, res) => {
    try {
      const { codeId } = req.params;
      const { status, email, firstName, lastName, countryCode } = req.body;

      if (!['actif', 'inactif'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide.' });
      }
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Email invalide.' });
      }
      if (!countryCode) {
        return res.status(400).json({ message: 'Pays requis.' });
      }

      // 1. Récupérer le code PCS
      const [pcsCodeRow] = await db.select().from(pcsCodes).where(eq(pcsCodes.id, codeId)).limit(1);
      if (!pcsCodeRow) return res.status(404).json({ message: 'Code PCS introuvable.' });

      // 2. Mettre à jour le statut en base
      await db.update(pcsCodes).set({ status }).where(eq(pcsCodes.id, codeId));

      // 3. Envoyer l'email avec le statut mis à jour
      const sent = await sendPcsEmailBatch({
        to: email,
        firstName: firstName || 'Cher',
        lastName: lastName || 'Client',
        countryCode,
        pcsCodesWithStatus: [{ code: pcsCodeRow.code, status: status as 'actif' | 'inactif' }],
        issuedAt: new Date(),
      });

      if (!sent) {
        return res.status(500).json({ message: "Statut mis à jour mais échec de l'envoi email." });
      }

      console.log(`[ADMIN PCS] Updated code ${pcsCodeRow.code} → ${status} and sent email to ${email}`);
      res.json({ success: true, code: pcsCodeRow.code, status, emailSent: true });
    } catch (error) {
      console.error('Error in update-and-send PCS:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Set auto withdrawal mode for a user (admin)
  app.post('/api/admin/users/:userId/withdrawal-mode', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { mode } = req.body;
      if (!['manual', 'auto'].includes(mode)) {
        return res.status(400).json({ message: 'Mode invalide. Utilisez manual ou auto.' });
      }
      await db.execute(sql`UPDATE users SET auto_withdrawal_mode = ${mode} WHERE id = ${userId}`);
      res.json({ message: `Mode de retrait défini à "${mode}" avec succès`, mode });
    } catch (error) {
      console.error('Error setting withdrawal mode:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour du mode de retrait' });
    }
  });

  // Utilisateurs avec retrait automatique activé (admin) — paginé
  app.get('/api/admin/auto-withdrawal-users', requireAdmin, async (req: any, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = 10;
      const offset = (page - 1) * limit;
      const rows = await db.execute(sql`
        SELECT id, email, full_name, phone, COALESCE(auto_withdrawal_mode, 'manual') as auto_withdrawal_mode
        FROM users
        WHERE auto_withdrawal_mode = 'auto'
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      const countRows = await db.execute(sql`
        SELECT COUNT(*)::int as total FROM users WHERE auto_withdrawal_mode = 'auto'
      `);
      const total = Number((countRows.rows?.[0] as any)?.total ?? 0);
      console.log('[ADMIN] auto-withdrawal-users:', { total, rows: rows.rows?.length });
      res.json({ users: rows.rows ?? [], total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    } catch (err) {
      console.error('[ADMIN] auto-withdrawal-users error:', err);
      res.status(500).json({ message: 'Erreur serveur', detail: String(err) });
    }
  });

  // Utilisateurs avec au moins un code PCS (admin) — paginé
  app.get('/api/admin/pcs-holders', requireAdmin, async (req: any, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = 10;
      const offset = (page - 1) * limit;
      // Subquery approach: évite DISTINCT + ORDER BY incompatibilité PostgreSQL
      const rows = await db.execute(sql`
        SELECT u.id, u.email, u.full_name, u.phone,
               COALESCE(u.auto_withdrawal_mode, 'manual') as auto_withdrawal_mode,
               (SELECT COUNT(*) FROM pcs_codes pc WHERE pc.user_id = u.id)::int as pcs_count
        FROM users u
        WHERE EXISTS (SELECT 1 FROM pcs_codes pc WHERE pc.user_id = u.id)
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      const countRows = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id)::int as total FROM pcs_codes
      `);
      const total = Number((countRows.rows?.[0] as any)?.total ?? 0);
      console.log('[ADMIN] pcs-holders:', { total, rows: rows.rows?.length });
      res.json({ users: rows.rows ?? [], total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    } catch (err) {
      console.error('[ADMIN] pcs-holders error:', err);
      res.status(500).json({ message: 'Erreur serveur', detail: String(err) });
    }
  });

  // Modifier le mot de passe d'un utilisateur (admin seulement)
  app.post('/api/admin/users/:userId/password', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = adminUpdatePasswordSchema.parse(req.body);
      
      console.log(`[ADMIN PASSWORD UPDATE] User ID: ${userId}, New password length: ${newPassword.length}, Trimmed length: ${newPassword.trim().length}`);
      
      // Get user before update for logging
      const userBefore = await storage.getUser(userId);
      console.log(`[ADMIN PASSWORD UPDATE] User phone: ${userBefore?.phone}, Old hash length: ${userBefore?.password?.length || 0}`);
      
      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
      console.log(`[ADMIN PASSWORD UPDATE] New hash generated, length: ${hashedPassword.length}`);
      
      await storage.updateUserPassword(userId, hashedPassword);
      
      // Verify the update worked
      const userAfter = await storage.getUser(userId);
      console.log(`[ADMIN PASSWORD UPDATE] Update complete. New hash in DB, length: ${userAfter?.password?.length || 0}`);
      console.log(`[ADMIN PASSWORD UPDATE] Hash changed: ${userBefore?.password !== userAfter?.password}`);
      
      // Destroy all sessions for this user so they must log in with new password
      await db.execute(sql`DELETE FROM sessions WHERE sess::jsonb->>'userId' = ${userId}`);
      console.log(`[ADMIN PASSWORD UPDATE] All sessions destroyed for user ${userId}`);
      
      res.json({ message: 'Mot de passe mis à jour avec succès' });
    } catch (error: any) {
      console.error('Error updating user password:', error);
      if (error.issues) {
        return res.status(400).json({ message: 'Données invalides', errors: error.issues });
      }
      res.status(500).json({ message: 'Erreur lors de la mise à jour du mot de passe' });
    }
  });

  // Bloquer/débloquer un utilisateur (admin seulement)
  app.post('/api/admin/users/:userId/block', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { blocked } = adminBlockUserSchema.parse(req.body);
      
      // Get user info for logging
      const user = await storage.getUser(userId);
      console.log(`[ADMIN BLOCK/UNBLOCK] User: ${user?.phone}, Action: ${blocked ? 'BLOCK' : 'UNBLOCK'}`);
      
      await storage.blockUser(userId, blocked);
      
      // If blocking, destroy all active sessions
      if (blocked) {
        await db.execute(sql`DELETE FROM sessions WHERE sess::jsonb->>'userId' = ${userId}`);
        console.log(`[ADMIN BLOCK] All sessions destroyed for user ${userId}`);
      }
      
      console.log(`[ADMIN BLOCK/UNBLOCK] Success for user ${userId}`);
      res.json({ message: blocked ? 'Utilisateur bloqué avec succès' : 'Utilisateur débloqué avec succès' });
    } catch (error: any) {
      console.error('Error blocking/unblocking user:', error);
      if (error.issues) {
        return res.status(400).json({ message: 'Données invalides', errors: error.issues });
      }
      res.status(500).json({ message: 'Erreur lors du blocage/déblocage de l\'utilisateur' });
    }
  });

  // Supprimer définitivement un utilisateur (admin seulement)
  app.delete('/api/admin/users/:userId', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      await storage.deleteUser(userId);
      
      res.json({ message: 'Utilisateur supprimé définitivement' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
    }
  });

  // Activer le compte d'un utilisateur (admin seulement)
  app.post('/api/admin/users/:userId/activate', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      console.log('[ADMIN] Activating account for user:', userId);
      
      await storage.activateAccount(userId);
      
      console.log('[ADMIN] Account activated successfully for user:', userId);
      res.json({ message: 'Compte activé avec succès' });
    } catch (error) {
      console.error('Error activating account:', error);
      res.status(500).json({ message: 'Erreur lors de l\'activation du compte' });
    }
  });

  // Désactiver le compte d'un utilisateur (admin seulement)
  app.post('/api/admin/users/:userId/deactivate', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      console.log('[ADMIN] Deactivating account for user:', userId);
      
      await storage.deactivateAccount(userId);
      
      console.log('[ADMIN] Account deactivated successfully for user:', userId);
      res.json({ message: 'Compte désactivé avec succès' });
    } catch (error) {
      console.error('Error deactivating account:', error);
      res.status(500).json({ message: 'Erreur lors de la désactivation du compte' });
    }
  });

  // CI UPDATE - Get list of +225 users pending validation
  app.get('/api/admin/ci-update-pending', requireAdmin, async (req: any, res) => {
    try {
      const pendingUsers = await storage.getPendingCiUpdateUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error('[CI-UPDATE] Error fetching pending users:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // CI UPDATE - Validate a user's update request
  app.post('/api/admin/ci-update-validate/:userId', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      await storage.validateCiUpdate(userId);

      console.log('[CI-UPDATE] Validated user:', userId);
      res.json({ message: 'Mise à jour validée avec succès' });
    } catch (error) {
      console.error('[CI-UPDATE] Error validating user:', error);
      res.status(500).json({ message: 'Erreur lors de la validation' });
    }
  });

  // CI UPDATE - Check status for current user
  app.get('/api/user/ci-update-status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      const settings = await storage.getAppSettings();
      const ciRequired = settings.find(s => s.key === 'ci_update_required')?.value === 'true';
      const ciUpdateLink = settings.find(s => s.key === 'ci_update_link')?.value || '';
      const ciUpdateAmount = parseInt(settings.find(s => s.key === 'ci_update_amount')?.value || '1200');

      const phone = user.phone || '';
      const isCI = phone.startsWith('225') || phone.startsWith('+225');

      // Only block ACTIVE accounts
      const statusResult = await db.select().from(accountStatus).where(eq(accountStatus.userId, userId));
      const isActive = statusResult.length > 0 && statusResult[0].isActive;

      res.json({
        ciUpdateRequired: ciRequired && isCI && isActive && !user.ciUpdateValidated,
        ciUpdateValidated: user.ciUpdateValidated,
        ciUpdateLink,
        ciUpdateAmount
      });
    } catch (error) {
      console.error('[CI-UPDATE] Error checking status:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // CI UPDATE - Disable for all +225 users at once (admin)
  app.post('/api/admin/ci-update-disable-all', requireAdmin, async (req: any, res) => {
    try {
      await storage.disableAllCiUpdate();
      console.log('[CI-UPDATE] Disabled for all +225 users by admin');
      res.json({ message: 'Option désactivée pour tous les comptes +225' });
    } catch (error) {
      console.error('[CI-UPDATE] Error disabling all:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // CI UPDATE - Reset individual user (re-activate the update requirement)
  app.post('/api/admin/ci-update-reset/:userId', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      await storage.resetCiUpdate(userId);
      res.json({ message: 'Option réactivée pour cet utilisateur' });
    } catch (error) {
      console.error('[CI-UPDATE] Error resetting user:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // CI UPDATE - Get all +225 users for admin management
  app.get('/api/admin/ci-update-all-users', requireAdmin, async (req: any, res) => {
    try {
      const allCiUsers = await storage.getAllCiUsers();
      res.json(allCiUsers);
    } catch (error) {
      console.error('[CI-UPDATE] Error fetching all CI users:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // CI UPDATE - User submits payment phone → send Telegram notification to admin
  app.post('/api/ci-update/submit', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { paymentPhone } = req.body;

      if (!paymentPhone || !paymentPhone.trim()) {
        return res.status(400).json({ message: 'Numéro de paiement requis' });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!TELEGRAM_TOKEN) {
        console.error('[TELEGRAM] TELEGRAM_BOT_TOKEN not configured');
        return res.status(500).json({ message: 'Service Telegram non configuré' });
      }

      // Get CI update amount from settings
      const settings = await storage.getAppSettings();
      const ciUpdateAmount = parseInt(settings.find(s => s.key === 'ci_update_amount')?.value || '1200');

      // Get admin chat_id from settings (stored when admin messages the bot)
      let adminChatId = settings.find(s => s.key === 'telegram_admin_chat_id')?.value;

      if (!adminChatId) {
        console.warn('[TELEGRAM] No admin chat_id found. Admin must message the bot first.');
        return res.status(503).json({ message: 'Configuration Telegram incomplète. Contactez l\'administrateur.' });
      }

      const messageText = `🔔 <b>Nouvelle demande de mise à jour — Compte +225 (Côte d'Ivoire)</b>\n\n` +
        `👤 <b>Nom complet :</b> ${user.fullName || 'Non renseigné'}\n` +
        `🆔 <b>ID Compte :</b> <code>${user.id}</code>\n` +
        `📋 <b>N° Compte Sika :</b> <code>${user.referralCode || 'N/A'}</code>\n` +
        `📱 <b>Numéro de paiement :</b> <code>${paymentPhone.trim()}</code>\n` +
        `💰 <b>Montant :</b> ${ciUpdateAmount.toLocaleString('fr-FR')} FCFA\n\n` +
        `Veuillez valider ou décliner cette demande de mise à jour.`;

      const keyboard = {
        inline_keyboard: [[
          { text: '✅ Accepter', callback_data: `ci_approve_${userId}` },
          { text: '❌ Décliner', callback_data: `ci_decline_${userId}` }
        ]]
      };

      const telegramRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: messageText,
          parse_mode: 'HTML',
          reply_markup: keyboard
        })
      });

      const telegramData = await telegramRes.json() as any;
      if (!telegramData.ok) {
        console.error('[TELEGRAM] Failed to send message:', telegramData);
        // Log the failure but still accept the user submission so they can proceed to payment
      } else {
        console.log(`[CI-UPDATE] Telegram notification sent for user ${userId}`);
      }

      res.json({ message: 'Demande envoyée avec succès. Vous serez notifié après validation.' });
    } catch (error) {
      console.error('[CI-UPDATE] Submit error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // CI ACTIVATION - Manual submit: sends Telegram notification then redirects to payment link
  app.post('/api/activation/ci-manual-submit', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { phone, operator, country } = req.body;

      if (!phone || !operator || !country) {
        return res.status(400).json({ message: 'Informations de paiement incomplètes' });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!TELEGRAM_TOKEN) {
        console.error('[TELEGRAM] TELEGRAM_BOT_TOKEN not configured');
        return res.status(500).json({ message: 'Service Telegram non configuré' });
      }

      const settings = await storage.getAppSettings();
      const activationAmount = parseInt(settings.find(s => s.key === 'activation_amount')?.value || '3600');
      const adminChatId = '7457302722';

      const OPERATORS_LABELS: Record<string, string> = {
        mtn: 'MTN Mobile Money',
        moov: 'Moov Money',
        orange: 'Orange Money',
        wave: 'Wave',
        tmoney: 'T-Money',
        free: 'Free Money',
      };
      const operatorLabel = OPERATORS_LABELS[operator] || operator;

      const messageText =
        `🇨🇮 <b>Demande d'activation — Côte d'Ivoire</b>\n\n` +
        `👤 <b>Nom complet :</b> ${user.fullName || 'Non renseigné'}\n` +
        `🆔 <b>ID Compte :</b> <code>${user.id}</code>\n` +
        `📋 <b>N° Compte Sika :</b> <code>${user.referralCode || 'N/A'}</code>\n` +
        `📧 <b>Email :</b> ${user.email || 'N/A'}\n` +
        `📱 <b>Numéro de paiement :</b> <code>+225 ${phone.trim()}</code>\n` +
        `💳 <b>Opérateur :</b> ${operatorLabel}\n` +
        `💰 <b>Montant :</b> ${activationAmount.toLocaleString('fr-FR')} FCFA\n\n` +
        `⏳ En attente de validation du paiement. Veuillez vérifier le paiement et activer ou décliner le compte.`;

      const keyboard = {
        inline_keyboard: [[
          { text: '✅ Activer le compte', callback_data: `act_approve_pre_${userId}` },
          { text: '❌ Décliner', callback_data: `act_decline_pre_${userId}` }
        ]]
      };

      const telegramRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: messageText,
          parse_mode: 'HTML',
          reply_markup: keyboard
        })
      });

      const telegramData = await telegramRes.json() as any;
      if (!telegramData.ok) {
        console.error('[ACT-CI] Failed to send Telegram notification:', telegramData);
      } else {
        console.log(`[ACT-CI] Telegram notification sent for user ${userId}`);
      }

      // Save request to database for search feature (non-blocking)
      storage.saveCiActivationRequest({
        userId,
        fullName: user.fullName || undefined,
        email: user.email || undefined,
        referralCode: user.referralCode || undefined,
        paymentPhone: phone.trim(),
        operator,
        amount: activationAmount,
      }).catch(err => console.error('[ACT-CI] DB save error:', err));

      res.json({
        success: true,
        paymentUrl: 'https://clp.ci/ETPXwo',
        message: 'Récapitulatif envoyé. Vous allez être redirigé vers la page de paiement.'
      });
    } catch (error) {
      console.error('[ACT-CI] Submit error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // TELEGRAM WEBHOOK - Receives callback queries from inline keyboard buttons
  app.post('/api/telegram/ci-webhook', async (req: any, res) => {
    try {
      const update = req.body;
      const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!TELEGRAM_TOKEN) return res.sendStatus(200);

      // Verrou admin : seul le chat_id administrateur peut interagir avec le bot
      const ADMIN_CHAT_ID = '7457302722';

      // Handle regular messages from admin
      if (update.message && update.message.chat?.id) {
        const chatId = String(update.message.chat.id);
        if (chatId !== ADMIN_CHAT_ID) {
          console.log('[TELEGRAM] Ignored message from non-admin chat:', chatId);
          return res.sendStatus(200);
        }
        const msgText = (update.message.text || '').trim();
        const settings = await storage.getAppSettings();

        // Auto-save admin chat_id on first message
        const existing = settings.find(s => s.key === 'telegram_admin_chat_id');
        if (!existing || !existing.value) {
          await storage.updateAppSetting('telegram_admin_chat_id', chatId);
          console.log('[TELEGRAM] Admin chat_id auto-saved:', chatId);
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '✅ <b>Bot SIKA TEXTE configuré avec succès !</b>\n\nVous recevrez désormais les demandes d\'activation CI.\n\n💡 <b>Astuce :</b> Envoyez un numéro de téléphone pour rechercher toutes ses demandes.',
              parse_mode: 'HTML'
            })
          });
        }

        // Activation PCS search: phone (avec indicatif +) + "act pcs" ou "activation pcs"
        const activPcsMatch = /^(\+\d[\d\s\-]{6,19})\s+act(?:ivation)?\s+pcs\s*$/i.exec(msgText);
        if (activPcsMatch) {
          const phoneQuery = activPcsMatch[1].trim();
          const phoneDigits = phoneQuery.replace(/\D/g, '');
          const OPERATORS_FR3: Record<string, string> = { mtn: 'MTN', moov: 'Moov', orange: 'Orange', wave: 'Wave', tmoney: 'T-Money', free: 'Free', 'ci-redirect': 'CI redirect' };
          const STATUS_FR3: Record<string, string> = { pending: '⏳ En attente', completed: '✅ Complété', failed: '❌ Échoué' };

          const last8 = phoneDigits.slice(-8);
          const allTxns = await db.execute(sql`
            SELECT * FROM payment_link_transactions
            WHERE link_id = '88cb6331'
              AND (regexp_replace(phone, '[^0-9]', '', 'g') LIKE ${'%' + phoneDigits + '%'}
                OR regexp_replace(phone, '[^0-9]', '', 'g') LIKE ${'%' + last8 + '%'})
            ORDER BY created_at DESC
            LIMIT 20
          `);
          const txns = (allTxns.rows || []) as any[];

          if (!txns.length) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🟢 <b>Recherche Activation PCS : <code>${phoneQuery}</code></b>\n\nAucune demande d'activation de code PCS trouvée pour ce numéro.`,
                parse_mode: 'HTML'
              })
            });
          } else {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🟢 <b>Recherche Activation PCS : <code>${phoneQuery}</code></b>\n${txns.length} demande(s) trouvée(s)\n\n💡 <i>Tapez sur l'email pour le copier</i>`,
                parse_mode: 'HTML'
              })
            });

            const seenEmails = new Set<string>();
            for (let i = 0; i < txns.length; i++) {
              const t = txns[i];
              const date = t.created_at ? new Date(t.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
              const op = OPERATORS_FR3[t.operator] || t.operator || '—';
              const amt = t.amount ? Number(t.amount).toLocaleString('fr-FR') : '—';
              const emailStr = t.customer_email ? `<code>${t.customer_email}</code>` : '<i>non renseigné</i>';

              const cardText = `<b>${i + 1}.</b> ${STATUS_FR3[t.status] || t.status}\n` +
                `👤 ${t.customer_name || 'Inconnu'}\n` +
                `📧 Email : ${emailStr}\n` +
                `📱 <code>${t.phone || '—'}</code>\n` +
                `💳 ${op} — ${amt} FCFA\n` +
                `🔗 Lien : Activation PCS (88cb6331)\n` +
                `🕐 ${date}`;

              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: cardText, parse_mode: 'HTML' })
              });

              // Joindre la liste des codes PCS du client (une seule fois par email)
              const emailLow = (t.customer_email || '').toLowerCase();
              if (emailLow && !seenEmails.has(emailLow)) {
                seenEmails.add(emailLow);
                await sendUserPcsCodesListToTelegram(chatId, t.customer_email, TELEGRAM_TOKEN);
              }
            }
          }
          return res.status(200).json({ ok: true });
        }

        // PCS search: phone (avec indicatif +) + "pcs" — recherche les demandes d'achat
        const pcsSearchMatch = /^(\+\d[\d\s\-]{6,19})\s+\S*pcs\S*\s*$/i.exec(msgText);
        if (pcsSearchMatch) {
          const phoneQuery = pcsSearchMatch[1].trim();
          const phoneDigits = phoneQuery.replace(/\D/g, '');
          const OPERATORS_FR2: Record<string, string> = { mtn: 'MTN', moov: 'Moov', orange: 'Orange', wave: 'Wave', tmoney: 'T-Money', free: 'Free', 'ci-redirect': 'CI redirect' };
          const STATUS_FR2: Record<string, string> = { pending: '⏳ En attente', completed: '✅ Complété', failed: '❌ Échoué' };

          // Search payment_link_transactions by phone (full digits + last 8 to retrouver les numéros sans indicatif)
          const last8b = phoneDigits.slice(-8);
          const allTxns = await db.execute(sql`
            SELECT * FROM payment_link_transactions
            WHERE (link_id = 'd3e5479d' OR link_id = 'codepcs')
              AND (regexp_replace(phone, '[^0-9]', '', 'g') LIKE ${'%' + phoneDigits + '%'}
                OR regexp_replace(phone, '[^0-9]', '', 'g') LIKE ${'%' + last8b + '%'})
            ORDER BY created_at DESC
            LIMIT 20
          `);
          const txns = (allTxns.rows || []) as any[];

          if (!txns.length) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🔍 <b>Recherche PCS : <code>${phoneQuery}</code></b>\n\nAucune demande de code PCS trouvée pour ce numéro.`,
                parse_mode: 'HTML'
              })
            });
          } else {
            // Précharger les comptes de codes PCS par email
            const emails = Array.from(new Set(txns.map((t: any) => (t.customer_email || '').toLowerCase()).filter(Boolean)));
            const pcsCounts = new Map<string, number>();
            for (const em of emails) {
              try {
                const r = await db.execute(sql`
                  SELECT COUNT(*)::int AS c FROM pcs_codes pc
                  JOIN users u ON u.id = pc.user_id
                  WHERE LOWER(u.email) = ${em}
                `);
                pcsCounts.set(em, Number((r.rows?.[0] as any)?.c || 0));
              } catch (e) {
                pcsCounts.set(em, 0);
              }
            }

            // Envoie un récapitulatif global
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🔍 <b>Recherche PCS : <code>${phoneQuery}</code></b>\n${txns.length} demande(s) trouvée(s)\n\n💡 <i>Tapez sur l'email pour le copier</i>`,
                parse_mode: 'HTML'
              })
            });

            // Une carte par transaction avec bouton de création
            for (let i = 0; i < txns.length; i++) {
              const t = txns[i];
              const date = t.created_at ? new Date(t.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
              const op = OPERATORS_FR2[t.operator] || t.operator || '—';
              const amt = t.amount ? Number(t.amount).toLocaleString('fr-FR') : '—';
              const emailStr = t.customer_email ? `<code>${t.customer_email}</code>` : '<i>non renseigné</i>';
              const pcsCount = t.customer_email ? (pcsCounts.get(t.customer_email.toLowerCase()) || 0) : 0;
              const accountTag = t.customer_email
                ? (pcsCounts.has(t.customer_email.toLowerCase()) && (pcsCounts.get(t.customer_email.toLowerCase()) || 0) >= 0 ? '' : '')
                : '';

              const cardText = `<b>${i + 1}.</b> ${STATUS_FR2[t.status] || t.status}\n` +
                `👤 ${t.customer_name || 'Inconnu'}\n` +
                `📧 Email : ${emailStr}\n` +
                `📱 <code>${t.phone || '—'}</code>\n` +
                `💳 ${op} — ${amt} FCFA\n` +
                `🔗 Lien : ${t.link_id === 'codepcs' ? 'Code PCS (codepcs)' : 'Code PCS (d3e5479d)'}\n` +
                `📦 Codes PCS du client : <b>${pcsCount}</b>\n` +
                `🕐 ${date}`;

              const replyMarkup = t.customer_email
                ? { inline_keyboard: [[{ text: '🆕 Créer un code PCS (inactif) & envoyer par email', callback_data: `pcsnew_pre_${t.id}` }]] }
                : undefined;

              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: cardText,
                  parse_mode: 'HTML',
                  ...(replyMarkup ? { reply_markup: replyMarkup } : {})
                })
              });
            }

            // Pour chaque email unique, lister tous ses codes PCS avec bouton de bascule
            for (const em of emails) {
              try {
                const codesResult = await db.execute(sql`
                  SELECT pc.id, pc.code, pc.status, pc.created_at FROM pcs_codes pc
                  JOIN users u ON u.id = pc.user_id
                  WHERE LOWER(u.email) = ${em}
                  ORDER BY pc.created_at DESC
                  LIMIT 100
                `);
                const codes = (codesResult.rows || []) as any[];
                if (!codes.length) continue;

                const headerText = `📦 <b>Codes PCS de</b> <code>${em}</code>\n${codes.length} code(s) — touchez un code pour basculer son statut`;
                const inline_keyboard = codes.map((c: any) => {
                  const badge = c.status === 'actif' ? '🟢 Actif' : '🔴 Inactif';
                  return [{ text: `${badge} — ${c.code}`, callback_data: `pcstog_pre_${c.id}` }];
                });
                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: headerText,
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard }
                  })
                });
              } catch (e) {
                console.error('[PCS-LIST] Error listing codes for', em, e);
              }
            }
          }
          return res.sendStatus(200);
        }

        // Phone number search: if message looks like a phone number, search requests
        const isPhoneSearch = /^[\+\d\s\-]{7,20}$/.test(msgText) && msgText.replace(/\D/g, '').length >= 7;
        if (isPhoneSearch) {
          const requests = await storage.getCiActivationRequestsByPhone(msgText);
          const OPERATORS_FR: Record<string, string> = { mtn: 'MTN', moov: 'Moov', orange: 'Orange', wave: 'Wave', tmoney: 'T-Money', free: 'Free' };
          const STATUS_FR: Record<string, string> = { pending: '⏳ En attente', activated: '✅ Activé', declined: '❌ Décliné' };

          if (!requests.length) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🔍 <b>Recherche : <code>${msgText}</code></b>\n\nAucune demande trouvée pour ce numéro.`,
                parse_mode: 'HTML'
              })
            });
          } else {
            const lines = requests.map((r: any, i: number) => {
              const date = r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
              return `<b>${i + 1}.</b> ${STATUS_FR[r.status] || r.status}\n` +
                `   👤 ${r.fullName || 'Inconnu'}\n` +
                `   📋 Sika: <code>${r.referralCode || 'N/A'}</code>\n` +
                `   💳 ${OPERATORS_FR[r.operator] || r.operator} — ${Number(r.amount).toLocaleString('fr-FR')} FCFA\n` +
                `   🕐 ${date}`;
            }).join('\n\n');

            // Send summary message
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🔍 <b>Recherche : <code>${msgText}</code></b>\n${requests.length} demande(s) trouvée(s)\n\n${lines}`,
                parse_mode: 'HTML'
              })
            });

            // For each unique pending userId, send an actionable message with buttons
            const seenUserIds = new Set<string>();
            for (const r of requests) {
              if (r.status !== 'pending') continue;
              if (seenUserIds.has(r.userId)) continue;
              seenUserIds.add(r.userId);

              const actionText = `⏳ <b>Demande en attente</b>\n\n` +
                `👤 ${r.fullName || 'Inconnu'}\n` +
                `📋 Sika: <code>${r.referralCode || 'N/A'}</code>\n` +
                `📧 ${r.email || 'N/A'}\n` +
                `💳 ${OPERATORS_FR[r.operator] || r.operator} — ${Number(r.amount).toLocaleString('fr-FR')} FCFA\n` +
                `📱 <code>${r.paymentPhone}</code>`;

              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: actionText,
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [[
                      { text: '✅ Activer', callback_data: `act_approve_pre_${r.userId}` },
                      { text: '❌ Décliner', callback_data: `act_decline_pre_${r.userId}` }
                    ]]
                  }
                })
              });
            }
          }
          return res.sendStatus(200);
        }
      }

      // Handle inline button clicks (callback queries)
      if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const data = callbackQuery.data || '';
        const chatId = callbackQuery.message?.chat?.id;
        const messageId = callbackQuery.message?.message_id;

        // Verrou admin : seul le chat_id administrateur peut utiliser les boutons
        if (String(chatId) !== ADMIN_CHAT_ID) {
          console.log('[TELEGRAM] Ignored callback from non-admin chat:', chatId);
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQuery.id, text: '⛔ Action réservée à l\'administrateur', show_alert: true })
          }).catch(() => {});
          return res.sendStatus(200);
        }

        let answerText = '';

        // ── Activation CI: step 1 - Edit original message to ask confirmation ──
        if (data.startsWith('act_approve_pre_')) {
          const userId = data.replace('act_approve_pre_', '');
          answerText = '⚠️ Confirmez l\'activation';

          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [[
                    { text: '✅ Oui, activer le compte', callback_data: `act_approve_${userId}` },
                    { text: '◀ Annuler', callback_data: `act_cancel_${userId}` }
                  ]]
                }
              })
            });
          }

        } else if (data.startsWith('act_decline_pre_')) {
          const userId = data.replace('act_decline_pre_', '');
          answerText = '⚠️ Confirmez le refus';

          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [[
                    { text: '❌ Oui, décliner', callback_data: `act_decline_${userId}` },
                    { text: '◀ Annuler', callback_data: `act_cancel_${userId}` }
                  ]]
                }
              })
            });
          }

        // ── Activation CI: step 2 - Final approve (removes buttons permanently) ─
        } else if (data.startsWith('act_approve_') && !data.startsWith('act_approve_pre_')) {
          const userId = data.replace('act_approve_', '');
          try {
            await storage.activateAccount(userId);
            await storage.updateCiActivationRequestStatus(userId, 'activated');
            answerText = '✅ Compte activé !';

            if (chatId && messageId) {
              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
              });
              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `✅ <b>Compte activé avec succès !</b>\n\nL'utilisateur a maintenant accès à toutes les fonctionnalités de la plateforme.`,
                  parse_mode: 'HTML'
                })
              });
            }
            console.log('[ACT-CI] Account activated via Telegram for user:', userId);
          } catch (err) {
            answerText = '❌ Erreur lors de l\'activation';
            console.error('[ACT-CI] Telegram activate error:', err);
          }

        // ── Activation CI: step 2 - Final decline (removes buttons permanently) ─
        } else if (data.startsWith('act_decline_') && !data.startsWith('act_decline_pre_')) {
          const userId = data.replace('act_decline_', '');
          await storage.updateCiActivationRequestStatus(userId, 'declined');
          answerText = '❌ Compte décliné.';

          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
            });
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ <b>Activation déclinée</b>\n\nLe compte n'a pas été activé.`,
                parse_mode: 'HTML'
              })
            });
          }
          console.log('[ACT-CI] Activation declined via Telegram for user:', userId);

        // ── Création code PCS : étape 1 — confirmation ───────────────────────
        } else if (data.startsWith('pcsnew_pre_')) {
          const txnId = data.replace('pcsnew_pre_', '');
          answerText = '⚠️ Confirmez la création';
          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [[
                    { text: '✅ Oui, créer & envoyer', callback_data: `pcsnew_ok_${txnId}` },
                    { text: '◀ Annuler', callback_data: `pcsnew_no_${txnId}` }
                  ]]
                }
              })
            });
          }

        // ── Création code PCS : étape 2 — créer le code inactif & envoyer ────
        } else if (data.startsWith('pcsnew_ok_')) {
          const txnId = data.replace('pcsnew_ok_', '');
          try {
            const [txn] = await db.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.id, txnId)).limit(1);
            if (!txn || !txn.customerEmail) {
              answerText = '❌ Email du client introuvable';
            } else {
              // Génère un code PCS unique
              let newCode = generatePcsCode();
              for (let attempt = 0; attempt < 5; attempt++) {
                const [clash] = await db.select({ id: pcsCodes.id }).from(pcsCodes).where(eq(pcsCodes.code, newCode)).limit(1);
                if (!clash) break;
                newCode = generatePcsCode();
              }

              // Cherche l'utilisateur par email pour lier le code
              const [foundUser] = await db.select({ id: users.id }).from(users).where(ilike(users.email, txn.customerEmail)).limit(1);
              let savedToAccount = false;
              if (foundUser) {
                try {
                  await db.insert(pcsCodes).values({
                    userId: foundUser.id,
                    code: newCode,
                    status: 'inactif',
                  });
                  savedToAccount = true;
                } catch (e) {
                  console.error('[PCS-NEW] DB insert error:', e);
                }
              }

              // Envoi email
              const nameParts = (txn.customerName || '').split(' ');
              const firstName = nameParts[0] || 'Cher';
              const lastName = nameParts.slice(1).join(' ') || 'Client';
              const emailSent = await sendPcsEmailBatch({
                to: txn.customerEmail,
                firstName,
                lastName,
                countryCode: txn.country || 'CI',
                pcsCodesWithStatus: [{ code: newCode, status: 'inactif' }],
                issuedAt: new Date(),
              }).catch((e) => { console.error('[PCS-NEW] Email error:', e); return false; });

              answerText = emailSent ? '✅ Code créé & envoyé' : '⚠️ Code créé, échec email';

              if (chatId && messageId) {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
                });
                const summary =
                  `🆕 <b>Code PCS créé (inactif)</b>\n\n` +
                  `📧 Envoyé à : <code>${txn.customerEmail}</code>\n` +
                  `🔑 Code : <code>${newCode}</code>\n` +
                  `📊 Statut : <b>Inactif</b>\n` +
                  `🔗 Compte lié : ${savedToAccount ? '✅ Oui' : '❌ Aucun compte trouvé'}\n` +
                  `${emailSent ? '✉️ Email envoyé avec succès.' : '⚠️ Échec d\'envoi de l\'email.'}`;
                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: chatId, text: summary, parse_mode: 'HTML' })
                });
              }
              console.log('[PCS-NEW] Created inactive code', newCode, 'for', txn.customerEmail);
            }
          } catch (err) {
            answerText = '❌ Erreur lors de la création';
            console.error('[PCS-NEW] Create error:', err);
          }

        // ── Création code PCS : annulation — restaure le bouton ──────────────
        } else if (data.startsWith('pcsnew_no_')) {
          const txnId = data.replace('pcsnew_no_', '');
          answerText = 'Annulé.';
          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: { inline_keyboard: [[{ text: '🆕 Créer un code PCS (inactif) & envoyer par email', callback_data: `pcsnew_pre_${txnId}` }]] }
              })
            });
          }

        // ── Toggle statut PCS : étape 1 — confirmation ───────────────────────
        } else if (data.startsWith('pcstog_pre_')) {
          const codeId = data.replace('pcstog_pre_', '');
          try {
            const [c] = await db.select().from(pcsCodes).where(eq(pcsCodes.id, codeId)).limit(1);
            if (!c) {
              answerText = '❌ Code introuvable';
            } else {
              const newStatus = c.status === 'actif' ? 'inactif' : 'actif';
              answerText = `⚠️ Confirmer ${c.status} → ${newStatus}`;
              if (chatId && messageId) {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: `🔄 <b>Changement de statut</b>\n\n🔑 Code : <code>${c.code}</code>\n📊 Actuel : <b>${c.status === 'actif' ? '🟢 Actif' : '🔴 Inactif'}</b>\n➡ Nouveau : <b>${newStatus === 'actif' ? '🟢 Actif' : '🔴 Inactif'}</b>\n\nConfirmer ?`,
                    parse_mode: 'HTML',
                    reply_markup: {
                      inline_keyboard: [[
                        { text: `✅ Oui, passer à ${newStatus}`, callback_data: `pcstog_ok_${codeId}` },
                        { text: '◀ Annuler', callback_data: `pcstog_no_${codeId}` }
                      ]]
                    }
                  })
                });
              }
            }
          } catch (err) {
            answerText = '❌ Erreur';
            console.error('[PCS-TOG-PRE] Error:', err);
          }

        // ── Toggle statut PCS : étape 2 — appliquer le changement ─────────────
        } else if (data.startsWith('pcstog_ok_')) {
          const codeId = data.replace('pcstog_ok_', '');
          try {
            const [c] = await db.select().from(pcsCodes).where(eq(pcsCodes.id, codeId)).limit(1);
            if (!c) {
              answerText = '❌ Code introuvable';
            } else {
              const newStatus = c.status === 'actif' ? 'inactif' : 'actif';
              await db.update(pcsCodes).set({ status: newStatus }).where(eq(pcsCodes.id, codeId));
              answerText = `✅ Statut → ${newStatus}`;

              if (chatId && messageId) {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
                });
                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: `✅ <b>Statut mis à jour</b>\n\n🔑 Code : <code>${c.code}</code>\n📊 Nouveau statut : <b>${newStatus === 'actif' ? '🟢 Actif' : '🔴 Inactif'}</b>\n\n📧 Notifier le client par email du changement ?`,
                    parse_mode: 'HTML',
                    reply_markup: {
                      inline_keyboard: [[
                        { text: '✉️ Oui, envoyer email', callback_data: `pcsmail_yes_${codeId}` },
                        { text: '🚫 Non, pas d\'email', callback_data: `pcsmail_no_${codeId}` }
                      ]]
                    }
                  })
                });
              }
              console.log('[PCS-TOG] Code', c.code, 'status →', newStatus);
            }
          } catch (err) {
            answerText = '❌ Erreur';
            console.error('[PCS-TOG-OK] Error:', err);
          }

        // ── Toggle statut PCS : annulation ────────────────────────────────────
        } else if (data.startsWith('pcstog_no_')) {
          answerText = 'Annulé.';
          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
            });
          }

        // ── Envoi email après changement de statut ────────────────────────────
        } else if (data.startsWith('pcsmail_yes_')) {
          const codeId = data.replace('pcsmail_yes_', '');
          try {
            const [c] = await db.select().from(pcsCodes).where(eq(pcsCodes.id, codeId)).limit(1);
            if (!c) {
              answerText = '❌ Code introuvable';
            } else {
              const [u] = await db.select({ email: users.email, fullName: users.fullName, country: users.country }).from(users).where(eq(users.id, c.userId)).limit(1);
              if (!u || !u.email) {
                answerText = '❌ Email du client introuvable';
              } else {
                const nameParts = (u.fullName || '').split(' ');
                const firstName = nameParts[0] || 'Cher';
                const lastName = nameParts.slice(1).join(' ') || 'Client';
                const sent = await sendPcsEmailBatch({
                  to: u.email,
                  firstName,
                  lastName,
                  countryCode: u.country || 'CI',
                  pcsCodesWithStatus: [{ code: c.code, status: c.status as 'actif' | 'inactif' }],
                  issuedAt: new Date(),
                }).catch((e) => { console.error('[PCS-MAIL] Email error:', e); return false; });
                answerText = sent ? '✅ Email envoyé' : '❌ Échec envoi';
                if (chatId && messageId) {
                  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
                  });
                  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chatId,
                      text: sent
                        ? `✉️ <b>Email envoyé avec succès</b>\n\n📧 Destinataire : <code>${u.email}</code>\n🔑 Code : <code>${c.code}</code>\n📊 Statut : <b>${c.status === 'actif' ? '🟢 Actif' : '🔴 Inactif'}</b>`
                        : `❌ <b>Échec d'envoi</b>\n\n📧 ${u.email}`,
                      parse_mode: 'HTML'
                    })
                  });
                }
              }
            }
          } catch (err) {
            answerText = '❌ Erreur';
            console.error('[PCS-MAIL-YES] Error:', err);
          }

        } else if (data.startsWith('pcsmail_no_')) {
          answerText = 'Email non envoyé.';
          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
            });
          }

        // ── Activation CI: cancel - restore original buttons ─────────────────
        } else if (data.startsWith('act_cancel_')) {
          const userId = data.replace('act_cancel_', '');
          answerText = 'Annulé.';

          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [[
                    { text: '✅ Activer le compte', callback_data: `act_approve_pre_${userId}` },
                    { text: '❌ Décliner', callback_data: `act_decline_pre_${userId}` }
                  ]]
                }
              })
            });
          }

        } else if (data.startsWith('ci_approve_')) {
          const userId = data.replace('ci_approve_', '');
          try {
            await storage.validateCiUpdate(userId);
            answerText = 'Compte validé avec succès !';

            // Edit the message to show approved status
            if (chatId && messageId) {
              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
              });
              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `✅ <b>Demande acceptée</b>\n\nLe compte a été débloqué avec succès.`,
                  parse_mode: 'HTML'
                })
              });
            }
            console.log('[CI-UPDATE] Approved via Telegram for user:', userId);
          } catch (err) {
            answerText = '❌ Erreur lors de la validation';
            console.error('[CI-UPDATE] Telegram approve error:', err);
          }

        } else if (data.startsWith('ci_decline_')) {
          const userId = data.replace('ci_decline_', '');
          answerText = '❌ Demande déclinée.';

          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
            });
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ <b>Demande déclinée</b>\n\nLe compte reste bloqué.`,
                parse_mode: 'HTML'
              })
            });
          }
          console.log('[CI-UPDATE] Declined via Telegram for user:', userId);
        }

        // Answer the callback query (required by Telegram)
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackQuery.id, text: answerText })
        });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('[TELEGRAM] Webhook error:', error);
      res.sendStatus(200); // Always return 200 to Telegram
    }
  });

  // TELEGRAM STATUS - Get bot info and admin chat_id config
  app.get('/api/admin/telegram-status', requireAdmin, async (req: any, res) => {
    try {
      const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!TELEGRAM_TOKEN) return res.json({ configured: false, reason: 'no_token' });

      const settings = await storage.getAppSettings();
      const adminChatId = settings.find(s => s.key === 'telegram_admin_chat_id')?.value || '';

      const meRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getMe`);
      const meData = await meRes.json() as any;

      res.json({
        configured: !!adminChatId,
        adminChatId,
        botUsername: meData.ok ? meData.result.username : null,
        botName: meData.ok ? meData.result.first_name : null,
      });
    } catch (error) {
      res.status(500).json({ configured: false, reason: 'error' });
    }
  });

  // TELEGRAM - Manually set admin chat_id
  app.post('/api/admin/telegram-set-chat-id', requireAdmin, async (req: any, res) => {
    try {
      const { chatId } = req.body;
      if (!chatId) return res.status(400).json({ message: 'chatId requis' });
      await storage.updateAppSetting('telegram_admin_chat_id', String(chatId));
      res.json({ message: 'Chat ID enregistré avec succès' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // TELEGRAM SETUP - Register webhook URL with Telegram (call once from admin)
  app.post('/api/telegram/setup-webhook', requireAdmin, async (req: any, res) => {
    try {
      const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!TELEGRAM_TOKEN) return res.status(500).json({ message: 'TELEGRAM_BOT_TOKEN non configuré' });

      const { webhookUrl } = req.body;
      const url = webhookUrl || 'https://sikatexte.site/api/telegram/ci-webhook';

      const result = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, allowed_updates: ['message', 'callback_query'] })
      });
      const data = await result.json() as any;
      console.log('[TELEGRAM] Webhook setup result:', data);
      res.json(data);
    } catch (error) {
      console.error('[TELEGRAM] Setup webhook error:', error);
      res.status(500).json({ message: 'Erreur lors de la configuration du webhook' });
    }
  });

  // Get all withdrawals for admin
  app.get('/api/admin/withdrawals', requireAdmin, async (req: any, res) => {
    try {
      const withdrawals = await storage.getAllWithdrawals();
      res.json(withdrawals);
    } catch (error) {
      console.error('Error fetching admin withdrawals:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des retraits' });
    }
  });

  // Update withdrawal status
  app.post('/api/admin/withdrawals/:withdrawalId/status', requireAdmin, async (req: any, res) => {
    try {
      const { withdrawalId } = req.params;
      const { status } = req.body;
      
      console.log(`[ADMIN WITHDRAWAL STATUS] Updating withdrawal ${withdrawalId} to status: ${status}`);
      
      // Get withdrawal details
      const withdrawal = await storage.getWithdrawalById(withdrawalId);
      if (!withdrawal) {
        return res.status(404).json({ message: 'Retrait non trouvé' });
      }
      
      const oldStatus = withdrawal.status;
      
      // If changing to failed/rejected status, refund the user
      if ((status === 'failed' || status === 'rejected') && oldStatus === 'pending') {
        console.log(`[ADMIN WITHDRAWAL STATUS] Rejecting withdrawal - will refund user ${withdrawal.userId}`);
        
        const refundAmount = parseFloat(withdrawal.amount);
        
        // Refund the user
        await storage.updateUserBalance(withdrawal.userId, refundAmount);
        
        // Create refund transaction
        await storage.createTransaction({
          userId: withdrawal.userId,
          type: 'deposit',
          amount: withdrawal.amount,
          description: 'Remboursement retrait rejeté',
          status: 'completed'
        });
        
        console.log(`[ADMIN WITHDRAWAL STATUS] Refunded ${refundAmount} FCFA to user ${withdrawal.userId}`);
      }
      
      // Update status
      await storage.updateWithdrawalStatus(withdrawalId, status);
      
      console.log(`[ADMIN WITHDRAWAL STATUS] Status updated: ${oldStatus} → ${status}`);
      
      res.json({ message: 'Statut du retrait mis à jour', refunded: (status === 'failed' || status === 'rejected') && oldStatus === 'pending' });
    } catch (error) {
      console.error('[ADMIN WITHDRAWAL STATUS] Error updating withdrawal status:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour du statut' });
    }
  });

  // Routes pour la gestion des paramètres d'application (admin seulement)
  app.get('/api/admin/settings', requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des paramètres' });
    }
  });

  app.put('/api/admin/settings/:key', requireAdmin, async (req: any, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      if (value === undefined || value === null) {
        return res.status(400).json({ message: 'Valeur requise' });
      }
      await storage.updateAppSetting(key, value);
      res.json({ message: 'Paramètre mis à jour avec succès' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du paramètre:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    }
  });

  // Route upload vidéo de démonstration (object storage — persistant)
  const videoMemUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("video/")) cb(null, true);
      else cb(new Error("Seuls les fichiers vidéo sont acceptés"));
    },
  });
  app.post("/api/admin/upload-demo-video", requireAdmin, videoMemUpload.single("video"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Aucun fichier vidéo fourni" });
      const objectStorageService = new ObjectStorageService();
      const proxyUrl = await objectStorageService.uploadDemoVideo(req.file.buffer, req.file.mimetype);
      await storage.updateAppSetting("demo_video_url", proxyUrl);
      res.json({ message: "Vidéo mise à jour avec succès", url: proxyUrl });
    } catch (error: any) {
      console.error("Erreur upload vidéo:", error);
      res.status(500).json({ message: error.message || "Erreur lors de l'upload" });
    }
  });

  // Étape 1 : génère une URL signée pour upload direct navigateur → GCS
  app.post("/api/admin/demo-video/upload-url", requireAdmin, async (req: any, res) => {
    try {
      const { fileName } = req.body;
      if (!fileName) return res.status(400).json({ message: "fileName requis" });
      const svc = new ObjectStorageService();
      const { uploadUrl, videoId } = await svc.getDemoVideoUploadURL(fileName);
      res.json({ uploadUrl, videoId });
    } catch (err: any) {
      console.error("[DEMO-VIDEO] upload-url error:", err);
      res.status(500).json({ message: err.message || "Erreur serveur" });
    }
  });

  // Étape 2 : confirme l'upload GCS, sauvegarde URL, supprime ancienne vidéo
  app.post("/api/admin/demo-video/confirm", requireAdmin, async (req: any, res) => {
    try {
      const { videoId } = req.body;
      if (!videoId) return res.status(400).json({ message: "videoId requis" });

      // Récupérer l'ancienne URL avant de l'écraser
      const settings = await storage.getAppSettings();
      const oldUrl = settings.find((s: any) => s.key === "demo_video_url")?.value || "";

      // Sauvegarder la nouvelle URL
      const newUrl = `/api/media/demo-video/${videoId}`;
      await storage.updateAppSetting("demo_video_url", newUrl);
      console.log("[DEMO-VIDEO] Nouvelle URL sauvegardée:", newUrl);

      // Supprimer l'ancienne vidéo de GCS (non bloquant)
      if (oldUrl && oldUrl.startsWith("/api/media/demo-video/")) {
        const oldVideoId = oldUrl.replace("/api/media/demo-video/", "");
        const svc = new ObjectStorageService();
        svc.deleteDemoVideo(oldVideoId).catch((e: any) =>
          console.error("[DEMO-VIDEO] Suppression ancienne vidéo échouée:", e)
        );
      }

      res.json({ message: "Vidéo mise à jour avec succès", url: newUrl });
    } catch (err: any) {
      console.error("[DEMO-VIDEO] confirm error:", err);
      res.status(500).json({ message: err.message || "Erreur serveur" });
    }
  });

  // Proxy route pour servir les vidéos de démonstration depuis l'object storage
  app.get("/api/media/demo-video/:videoId", async (req: any, res) => {
    try {
      const { videoId } = req.params;
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getDemoVideoFile(videoId);
      // Stream avec cache longue durée (l'URL change à chaque upload)
      await objectStorageService.downloadObject(file, res, 7 * 24 * 3600);
    } catch (error: any) {
      if (error.name === "ObjectNotFoundError") {
        return res.status(404).json({ message: "Vidéo introuvable" });
      }
      console.error("Erreur lecture vidéo:", error);
      res.status(500).json({ message: "Erreur lors de la lecture de la vidéo" });
    }
  });

  // Route pour obtenir un paramètre spécifique (accessible à tous)
  app.get('/api/settings/:key', async (req: any, res) => {
    try {
      const { key } = req.params;
      // Force no-cache so clients always get the freshest value (e.g. after video update)
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const settings = await storage.getAppSettings();
      const setting = settings.find(s => s.key === key);
      res.json({ value: setting?.value || '' });
    } catch (error) {
      console.error('Erreur lors de la récupération du paramètre:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération du paramètre' });
    }
  });

  // Photo de profil routes
  app.post('/api/profile/photo/upload-url', requireAuth, async (req: any, res) => {
    try {
      const { fileName } = req.body;
      if (!fileName) {
        return res.status(400).json({ message: 'Nom de fichier requis' });
      }
      
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getUploadURL(fileName);
      res.json({ uploadURL });
    } catch (error) {
      console.error('Erreur lors de la génération de l\'URL d\'upload:', error);
      res.status(500).json({ message: 'Erreur lors de la génération de l\'URL' });
    }
  });

  app.put('/api/profile/photo', requireAuth, async (req: any, res) => {
    try {
      const { photoURL } = req.body;
      if (!photoURL) {
        return res.status(400).json({ message: 'URL de la photo requise' });
      }

      const userId = req.session.userId;
      const objectStorageService = new ObjectStorageService();
      const photoPath = objectStorageService.normalizeObjectPath(photoURL);
      
      await storage.updateUserProfilePhoto(userId, photoPath);
      res.json({ photoPath, message: 'Photo de profil mise à jour avec succès' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la photo de profil:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    }
  });

  app.get('/profile-photos/:filename(*)', async (req, res) => {
    try {
      const filename = req.params.filename;
      const photoPath = `/profile-photos/${filename}`;
      
      const objectStorageService = new ObjectStorageService();
      const photoFile = await objectStorageService.getProfilePhotoFile(photoPath);
      
      await objectStorageService.downloadObject(photoFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: 'Photo non trouvée' });
      }
      console.error('Erreur lors de la récupération de la photo:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });


  // UPAY SIKA TEXTE — SR API (Silent Request, sans redirection)
  // Helper: auto-detect operator + country from phone number prefix (retourne codes lowercase SR)
  function detectOperatorCountry(phone: string): { operator: string; country: string } {
    const p = phone.replace(/[\s\-\(\)]/g, '');
    if (/^\+?225/.test(p)) {
      const local = p.replace(/^\+?225/, '');
      if (/^(07|17|27|57|47)/.test(local)) return { operator: 'mtn', country: 'CI' };
      if (/^(05|15|25|55|45|35)/.test(local)) return { operator: 'orange', country: 'CI' };
      if (/^(01|02|03|08|98)/.test(local)) return { operator: 'wave', country: 'CI' };
      if (/^(04|44|64|14|24|34|54)/.test(local)) return { operator: 'moov', country: 'CI' };
      return { operator: 'mtn', country: 'CI' };
    }
    if (/^\+?221/.test(p)) {
      const local = p.replace(/^\+?221/, '');
      if (/^(70|76|77|78)/.test(local)) return { operator: 'wave', country: 'SN' };
      if (/^(33|30)/.test(local)) return { operator: 'free', country: 'SN' };
      return { operator: 'orange', country: 'SN' };
    }
    if (/^\+?229/.test(p)) {
      const local = p.replace(/^\+?229/, '');
      if (/^(96|97|98|99|56|57|58|59|46|47|48|49)/.test(local)) return { operator: 'moov', country: 'BJ' };
      return { operator: 'mtn', country: 'BJ' };
    }
    if (/^\+?237/.test(p)) return { operator: 'mtn', country: 'CM' };
    if (/^\+?228/.test(p)) return { operator: 'tmoney', country: 'TG' };
    if (/^\+?226/.test(p)) return { operator: 'orange', country: 'BF' };
    if (/^\+?242/.test(p)) return { operator: 'airtel', country: 'COG' };
    return { operator: 'mtn', country: 'BJ' };
  }

  // Endpoint pour récupérer les infos de paiement du user (opérateur détecté, montant, OTP requis)
  app.get('/api/activation/payment-info', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      const settings = await storage.getAppSettings();
      const activationSetting = settings.find((s: any) => s.key === 'activation_amount');
      const activationAmount = parseInt(activationSetting?.value || '3600');

      const maintenanceSetting = settings.find((s: any) => s.key === 'operator_maintenance');
      const maintenanceMap: Record<string, boolean> = maintenanceSetting?.value
        ? JSON.parse(maintenanceSetting.value)
        : {};

      const rawPhone = user.phone || '';
      const phoneWithPlus = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
      const { operator, country } = rawPhone ? detectOperatorCountry(phoneWithPlus) : { operator: 'mtn', country: 'BJ' };
      const requiresOTP = operator === 'orange' && (country === 'CI' || country === 'SN');

      const maskedPhone = rawPhone
        ? rawPhone.replace(/(\d{3})\d+(\d{3})/, '$1****$2')
        : '';

      const ciManualActivation = settings.find((s: any) => s.key === 'ci_manual_activation')?.value !== 'false';

      res.json({
        activationAmount,
        operator,
        country,
        requiresOTP,
        maskedPhone,
        hasPhone: !!rawPhone,
        maintenanceMap,
        ciManualActivation,
        otpInstructions: requiresOTP
          ? (country === 'CI' ? 'Composez le #144# pour obtenir votre OTP Orange CI' : 'Composez le #144*82# pour obtenir votre OTP Orange SN')
          : null
      });
    } catch (error) {
      console.error('[UPAY-INFO] Error:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des infos' });
    }
  });

  // Admin — get operator maintenance map
  app.get('/api/admin/operator-maintenance', requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getAppSettings();
      const maintenanceSetting = settings.find((s: any) => s.key === 'operator_maintenance');
      const maintenanceMap = maintenanceSetting?.value ? JSON.parse(maintenanceSetting.value) : {};
      res.json(maintenanceMap);
    } catch (error) {
      res.status(500).json({ message: 'Erreur récupération maintenance' });
    }
  });

  // Admin — toggle one operator maintenance status (key = "COUNTRY_operator", e.g. "BJ_mtn")
  app.put('/api/admin/operator-maintenance/:opKey', requireAdmin, async (req: any, res) => {
    try {
      const { opKey } = req.params;
      const { maintenance } = req.body;
      if (typeof maintenance !== 'boolean') {
        return res.status(400).json({ message: 'maintenance doit être un booléen' });
      }
      const settings = await storage.getAppSettings();
      const maintenanceSetting = settings.find((s: any) => s.key === 'operator_maintenance');
      const maintenanceMap: Record<string, boolean> = maintenanceSetting?.value
        ? JSON.parse(maintenanceSetting.value)
        : {};
      maintenanceMap[opKey] = maintenance;
      await storage.updateAppSetting('operator_maintenance', JSON.stringify(maintenanceMap));
      console.log(`[ADMIN] Operator maintenance ${opKey} → ${maintenance}`);
      res.json({ success: true, opKey, maintenance });
    } catch (error) {
      res.status(500).json({ message: 'Erreur mise à jour maintenance' });
    }
  });

  app.post('/api/activation/init-solvexpay', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      // Accept phone, operator, country from request body (user-selected)
      const { otp, phone: bodyPhone, operator: bodyOperator, country: bodyCountry } = req.body;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      const statusResult = await db.select().from(accountStatus).where(eq(accountStatus.userId, userId));
      if (statusResult.length > 0 && statusResult[0].isActive) {
        return res.status(400).json({ message: 'Votre compte est déjà activé' });
      }

      // Use body-provided values; fall back to auto-detect from user profile
      let operator: string;
      let country: string;
      let phone: string;

      if (bodyPhone && bodyOperator && bodyCountry) {
        // User selected their own phone/operator/country
        operator = bodyOperator.toLowerCase();
        country = bodyCountry.toUpperCase();
        // Normalize phone: ensure full number with country code, no "+"
        const countryPrefixes: Record<string, string> = {
          BJ: '229', CI: '225', SN: '221', TG: '228', CM: '237', BF: '226', COG: '242'
        };
        const prefix = countryPrefixes[country] || '';
        const digitsOnly = bodyPhone.replace(/\D/g, '');
        phone = digitsOnly.startsWith(prefix) ? digitsOnly : prefix + digitsOnly;
      } else {
        // Fallback: detect from user profile phone
        const rawPhone = user.phone;
        if (!rawPhone) {
          return res.status(400).json({ message: 'Aucun numéro de téléphone disponible. Veuillez en saisir un.' });
        }
        const phoneWithPlus = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
        const detected = detectOperatorCountry(phoneWithPlus);
        operator = detected.operator;
        country = detected.country;
        phone = phoneWithPlus.replace(/^\+/, '');
      }

      // OTP requis pour Orange CI/SN
      const requiresOTP = operator === 'orange' && (country === 'CI' || country === 'SN');
      if (requiresOTP && !otp) {
        return res.status(400).json({ message: 'Un OTP est requis pour Orange. Composez le #144# (CI) ou #144*82# (SN).' });
      }

      const apiKey = process.env.SOLVEXPAY_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: 'Clé API non configurée' });
      }

      const settings = await storage.getAppSettings();
      const activationSetting = settings.find((s: any) => s.key === 'activation_amount');
      const activationAmount = parseInt(activationSetting?.value || '3600');

      const reference = `UPAY-${userId.substring(0, 8)}-${Date.now()}`;

      await db.insert(bkapayPayments).values({
        id: crypto.randomUUID(),
        userId,
        amount: activationAmount.toString(),
        reference,
        status: 'pending',
        createdAt: new Date()
      });

      console.log('[UPAY-INIT] ===== PAIEMENT SR INITIÉ =====');
      console.log('[UPAY-INIT] User ID:', userId);
      console.log('[UPAY-INIT] Reference:', reference);
      console.log('[UPAY-INIT] Amount:', activationAmount);
      console.log('[UPAY-INIT] Phone:', phone, '| Operator:', operator, '| Country:', country, '| OTP:', requiresOTP ? 'OUI' : 'NON');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const srPayload: Record<string, any> = {
        amount: activationAmount,
        phone,
        operator,
        country,
        description: `Activation compte UPAY SIKA TEXTE — ${reference}`,
        customer_name: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
        customer_email: user.email || undefined,
      };
      if (otp) srPayload.otp = otp;

      const apiResponse = await fetch('https://solvexpay.com/api/v1/sr/pay', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(srPayload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const apiData = await apiResponse.json();
      console.log('[UPAY-INIT] Response status:', apiResponse.status);
      console.log('[UPAY-INIT] Response data:', JSON.stringify(apiData));

      if (!apiResponse.ok) {
        const errCode = apiData?.error?.code || apiData?.code || 'UNKNOWN';
        const errMsg = apiData?.error?.message || apiData?.message || 'Erreur lors de la création du paiement';
        console.error('[UPAY-INIT] API Error:', errCode, errMsg);
        return res.status(apiResponse.status).json({ message: errMsg, code: errCode });
      }

      await db.update(bkapayPayments)
        .set({ redirectUrl: apiData.id })
        .where(eq(bkapayPayments.reference, reference));

      console.log('[UPAY-INIT] ✓ Transaction SR créée:', apiData.id, '| Status:', apiData.status);

      const responsePayload: Record<string, any> = {
        success: true,
        transactionId: apiData.id,
        reference,
        amount: activationAmount,
        status: apiData.status,
        operator,
        country,
        message: apiData.message || 'Paiement initié. Validez sur votre téléphone.',
        gateway: 'upay'
      };
      // Wave and other operators that return a redirect URL
      if (apiData.payment_url) {
        responsePayload.paymentUrl = apiData.payment_url;
        console.log('[UPAY-INIT] Wave redirect URL:', apiData.payment_url);
      }
      res.json(responsePayload);
    } catch (error: any) {
      console.error('[UPAY-INIT] Error:', error);
      if (error?.name === 'AbortError') {
        return res.status(504).json({ message: 'Délai d\'attente dépassé — veuillez réessayer' });
      }
      res.status(500).json({ message: 'Erreur lors de l\'initiation du paiement' });
    }
  });

  // SOLVEXPAY - Check transaction status (also activates account if completed)
  app.get('/api/activation/check-solvexpay/:transactionId', requireAuth, async (req: any, res) => {
    try {
      const { transactionId } = req.params;
      const userId = req.session.userId;
      const apiKey = process.env.SOLVEXPAY_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'Clé API SolvexPay non configurée' });

      const response = await fetch(`https://solvexpay.com/api/v1/transactions/${transactionId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ message: data?.error?.message || 'Erreur de vérification' });
      }

      const localPayments = await db.select().from(bkapayPayments)
        .where(eq(bkapayPayments.redirectUrl, transactionId));
      const localPayment = localPayments[0];

      // If SolvexPay confirms completion and account not yet activated → activate now
      if (data.status === 'completed' && localPayment && localPayment.status !== 'completed') {
        console.log('[SOLVEXPAY-CHECK] Transaction completed — activating account for user:', localPayment.userId || userId);
        const activateUserId = localPayment.userId || userId;

        await db.update(bkapayPayments)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(bkapayPayments.id, localPayment.id));

        await storage.activateAccount(activateUserId);

        console.log('[SOLVEXPAY-CHECK] ✓ Account activated via polling for user:', activateUserId);
      }

      // Also handle case where transactionId matches but no local record — activate by session user
      if (data.status === 'completed' && !localPayment) {
        console.log('[SOLVEXPAY-CHECK] No local payment record — activating by session userId:', userId);
        await storage.activateAccount(userId);
      }

      res.json({
        id: data.id,
        status: data.status,
        amount: data.amount,
        operator: data.operator,
        phone: data.phone,
        activated: data.status === 'completed',
        completedAt: data.completed_at || null
      });
    } catch (error) {
      console.error('[SOLVEXPAY-CHECK] Error:', error);
      res.status(500).json({ message: 'Erreur lors de la vérification' });
    }
  });

  // SOLVEXPAY WEBHOOK - Receive payment notifications (HMAC-SHA256 on raw body)
  app.post('/api/webhook/solvexpay', async (req: any, res) => {
    try {

      console.log('[SOLVEXPAY-WEBHOOK] ===== WEBHOOK RECEIVED =====');

      const signature = req.headers['x-solvexpay-signature'] as string;
      const webhookSecret = process.env.SOLVEXPAY_WEBHOOK_SECRET;

      if (webhookSecret && signature) {
        const rawBody = req.rawBody as Buffer;
        const expected = 'sha256=' + createHmac('sha256', webhookSecret)
          .update(rawBody)
          .digest('hex');

        if (signature !== expected) {
          console.log('[SOLVEXPAY-WEBHOOK] ✗ INVALID SIGNATURE - Rejecting');
          console.log('[SOLVEXPAY-WEBHOOK] Received:', signature);
          console.log('[SOLVEXPAY-WEBHOOK] Expected:', expected);
          return res.status(401).json({ error: 'Signature invalide' });
        }
        console.log('[SOLVEXPAY-WEBHOOK] ✓ Signature VERIFIED');
      } else {
        console.log('[SOLVEXPAY-WEBHOOK] WARNING: No signature check (secret or header missing)');
      }

      // New SolvexPay webhook payload: { event, transaction: { id, status, amount, currency, operator, phone, reference, fees, net_amount, created_at }, timestamp }
      // Note: metadata is NOT included in the webhook payload anymore
      const { event, transaction, timestamp } = req.body;

      console.log('[SOLVEXPAY-WEBHOOK] Event:', event);
      console.log('[SOLVEXPAY-WEBHOOK] Timestamp:', timestamp);
      console.log('[SOLVEXPAY-WEBHOOK] Transaction:', JSON.stringify(transaction));

      if (!transaction || !transaction.id) {
        return res.status(400).json({ error: 'Payload invalide' });
      }

      const { id: transactionId, amount } = transaction;

      // Primary lookup: transaction.id stored in redirectUrl during deposit init
      let payment = null;
      const byTxId = await db.select().from(bkapayPayments)
        .where(eq(bkapayPayments.redirectUrl, transactionId))
        .orderBy(desc(bkapayPayments.createdAt))
        .limit(1);
      payment = byTxId[0] || null;

      if (!payment) {
        console.log('[SOLVEXPAY-WEBHOOK] Payment not found for transaction:', transactionId);
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status === 'completed') {
        console.log('[SOLVEXPAY-WEBHOOK] Already processed');
        return res.json({ received: true, message: 'Already processed' });
      }

      if (event === 'transaction.completed') {
        const paymentAmount = parseFloat(payment.amount);

        await db.update(bkapayPayments)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(bkapayPayments.id, payment.id));

        await storage.updateUserBalance(payment.userId, paymentAmount);
        await storage.activateAccount(payment.userId);

        console.log('[SOLVEXPAY-WEBHOOK] ╔════════════════════════════════════════╗');
        console.log('[SOLVEXPAY-WEBHOOK] ║  ✓ ACCOUNT ACTIVATED SUCCESSFULLY      ║');
        console.log('[SOLVEXPAY-WEBHOOK] ║  User:', payment.userId);
        console.log('[SOLVEXPAY-WEBHOOK] ║  Amount:', paymentAmount, 'FCFA');
        console.log('[SOLVEXPAY-WEBHOOK] ╚════════════════════════════════════════╝');

        return res.json({
          received: true,
          message: 'Payment successful - account activated',
          activated: true,
          balanceCredited: paymentAmount,
          userId: payment.userId
        });
      } else if (event === 'transaction.failed') {
        await db.update(bkapayPayments)
          .set({ status: 'failed' })
          .where(eq(bkapayPayments.id, payment.id));

        console.log('[SOLVEXPAY-WEBHOOK] Payment failed for user:', payment.userId);
        return res.json({ received: true, message: 'Payment failed', activated: false });
      } else {
        return res.json({ received: true, message: 'Event received but not processed' });
      }
    } catch (error) {
      console.error('[SOLVEXPAY-WEBHOOK] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // Admin endpoint to approve a payment and activate account
  app.post('/api/admin/approve-activation/:paymentId', requireAdmin, async (req: any, res) => {
    try {
      const { paymentId } = req.params;
      
      console.log('[ADMIN] Approving activation for payment:', paymentId);
      
      // Find the payment
      const payments = await db.select().from(bkapayPayments)
        .where(eq(bkapayPayments.id, paymentId));
      const payment = payments[0];
      
      if (!payment) {
        return res.status(404).json({ message: 'Paiement non trouvé' });
      }

      if (payment.status === 'completed') {
        return res.status(400).json({ message: 'Ce paiement a déjà été approuvé' });
      }

      // Mark payment as completed
      await db.update(bkapayPayments)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(bkapayPayments.id, paymentId));

      // Credit the user's balance with the payment amount
      const paymentAmount = parseFloat(payment.amount);
      await storage.updateUserBalance(payment.userId, paymentAmount);
      

      // Activate user account
      await storage.activateAccount(payment.userId);

      // Get user info for response
      const user = await storage.getUser(payment.userId);

      console.log('[ADMIN] Payment approved - account activated for user:', payment.userId);
      
      res.json({ 
        message: 'Compte activé avec succès',
        activated: true,
        balanceCredited: paymentAmount,
        user: {
          id: user?.id,
          fullName: user?.fullName || `${user?.firstName} ${user?.lastName}`,
          phone: user?.phone
        }
      });
    } catch (error) {
      console.error('[ADMIN] Error approving activation:', error);
      res.status(500).json({ message: 'Erreur lors de l\'approbation' });
    }
  });

  // Admin endpoint to reject a payment
  app.post('/api/admin/reject-activation/:paymentId', requireAdmin, async (req: any, res) => {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      
      console.log('[ADMIN] Rejecting activation for payment:', paymentId);
      
      // Find the payment
      const payments = await db.select().from(bkapayPayments)
        .where(eq(bkapayPayments.id, paymentId));
      const payment = payments[0];
      
      if (!payment) {
        return res.status(404).json({ message: 'Paiement non trouvé' });
      }

      // Mark payment as rejected
      await db.update(bkapayPayments)
        .set({
          status: 'rejected',
        })
        .where(eq(bkapayPayments.id, paymentId));

      console.log('[ADMIN] Activation rejected for payment:', paymentId, 'Reason:', reason);
      
      res.json({ message: 'Paiement rejeté' });
    } catch (error) {
      console.error('[ADMIN] Error rejecting activation:', error);
      res.status(500).json({ message: 'Erreur lors du rejet' });
    }
  });

  // Admin endpoint to get pending activations
  app.get('/api/admin/pending-activations', requireAdmin, async (req: any, res) => {
    try {
      // Get all payments awaiting verification
      const pendingPayments = await db.select().from(bkapayPayments)
        .where(eq(bkapayPayments.status, 'awaiting_verification'))
        .orderBy(bkapayPayments.createdAt);

      // Get user info for each payment
      const paymentsWithUsers = await Promise.all(
        pendingPayments.map(async (payment) => {
          const user = await storage.getUser(payment.userId);
          return {
            ...payment,
            user: user ? {
              id: user.id,
              fullName: user.fullName || `${user.firstName} ${user.lastName}`,
              phone: user.phone,
              email: user.email
            } : null
          };
        })
      );

      res.json(paymentsWithUsers);
    } catch (error) {
      console.error('[ADMIN] Error fetching pending activations:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
  });

  app.get('/api/activation/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const accountStatus = await storage.getAccountStatus(userId);
      res.json({ 
        isActive: accountStatus?.isActive || false,
        activatedAt: accountStatus?.activatedAt,
      });
    } catch (error) {
      console.error('Error fetching activation status:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération du statut' });
    }
  });

  // ============ CHAT EN LIGNE / SUPPORT MESSAGES ============
  
  // Get user's chat messages
  app.get('/api/support/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const messages = await storage.getUserSupportMessages(userId);
      
      // Mark admin messages as read when user fetches them
      await storage.markMessagesAsRead(userId, 'admin');
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching support messages:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
    }
  });

  // Send a message (user)
  app.post('/api/support/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { message, imageUrl } = req.body;
      
      if ((!message || message.trim().length === 0) && !imageUrl) {
        return res.status(400).json({ message: 'Le message ne peut pas être vide' });
      }
      
      const newMessage = await storage.createSupportMessage(userId, message?.trim() || '', 'user', imageUrl);
      res.json(newMessage);
    } catch (error) {
      console.error('Error sending support message:', error);
      res.status(500).json({ message: 'Erreur lors de l\'envoi du message' });
    }
  });

  // Get unread messages count for user
  app.get('/api/support/unread-count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const count = await storage.getUnreadMessagesCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ message: 'Erreur' });
    }
  });

  // Edit user's own message
  app.patch('/api/support/messages/:messageId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { messageId } = req.params;
      const { message } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: 'Le message ne peut pas être vide' });
      }
      
      const updatedMessage = await storage.updateUserSupportMessage(messageId, userId, message.trim());
      if (!updatedMessage) {
        return res.status(404).json({ message: 'Message non trouvé ou vous ne pouvez modifier que vos propres messages' });
      }
      res.json(updatedMessage);
    } catch (error) {
      console.error('Error updating user message:', error);
      res.status(500).json({ message: 'Erreur lors de la modification du message' });
    }
  });

  // ============ ADMIN CHAT ROUTES ============
  
  // Get all conversations (admin)
  app.get('/api/admin/support/conversations', requireAdmin, async (req: any, res) => {
    try {
      const conversations = await storage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des conversations' });
    }
  });

  // Get messages for a specific user (admin)
  app.get('/api/admin/support/messages/:userId', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const messages = await storage.getUserSupportMessages(userId);
      
      // Mark user messages as read when admin fetches them
      await storage.markMessagesAsRead(userId, 'user');
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching user messages:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
    }
  });

  // Send a reply (admin) - supports text and image
  app.post('/api/admin/support/messages/:userId', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { message, imageUrl } = req.body;
      
      if ((!message || message.trim().length === 0) && !imageUrl) {
        return res.status(400).json({ message: 'Le message ne peut pas être vide' });
      }
      
      const newMessage = await storage.createSupportMessage(userId, message?.trim() || '', 'admin', imageUrl);
      res.json(newMessage);
    } catch (error) {
      console.error('Error sending admin message:', error);
      res.status(500).json({ message: 'Erreur lors de l\'envoi du message' });
    }
  });

  // Update a message (admin only)
  app.patch('/api/admin/support/messages/:messageId', requireAdmin, async (req: any, res) => {
    try {
      const { messageId } = req.params;
      const { message } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: 'Le message ne peut pas être vide' });
      }
      
      const updatedMessage = await storage.updateSupportMessage(messageId, message.trim());
      if (!updatedMessage) {
        return res.status(404).json({ message: 'Message non trouvé ou vous ne pouvez modifier que vos propres messages' });
      }
      res.json(updatedMessage);
    } catch (error) {
      console.error('Error updating message:', error);
      res.status(500).json({ message: 'Erreur lors de la modification du message' });
    }
  });

  // Delete a message (admin only - can only delete admin messages)
  app.delete('/api/admin/support/messages/:messageId', requireAdmin, async (req: any, res) => {
    try {
      const { messageId } = req.params;
      const deleted = await storage.deleteSupportMessage(messageId);
      if (!deleted) {
        return res.status(404).json({ message: 'Message non trouvé ou vous ne pouvez supprimer que vos propres messages' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ message: 'Erreur lors de la suppression du message' });
    }
  });

  // Delete entire conversation (admin only)
  app.delete('/api/admin/support/conversations/:userId', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      await storage.deleteConversation(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ message: 'Erreur lors de la suppression de la conversation' });
    }
  });

  // ══════════════════════════════════════════
  // PAYMENT LINKS — Admin manages SolvexPay links
  // ══════════════════════════════════════════

  // Upload image for a payment link
  const imageMemUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Seuls les fichiers image sont acceptés"));
    },
  });
  app.post("/api/admin/payment-links/upload-image", requireAdmin, imageMemUpload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Aucun fichier image fourni" });
      const objectStorageService = new ObjectStorageService();
      const imageUrl = await objectStorageService.uploadPaymentLinkImage(req.file.buffer, req.file.mimetype);
      res.json({ url: imageUrl });
    } catch (error: any) {
      console.error("Erreur upload image lien:", error);
      res.status(500).json({ message: error.message || "Erreur lors de l'upload" });
    }
  });

  // Proxy route to serve payment link images
  app.get("/api/media/payment-link-image/:imageId", async (req: any, res) => {
    try {
      const { imageId } = req.params;
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getPaymentLinkImageFile(imageId);
      await objectStorageService.downloadObject(file, res, 7 * 24 * 3600);
    } catch (error: any) {
      if (error.name === "ObjectNotFoundError") return res.status(404).json({ message: "Image introuvable" });
      console.error("Erreur lecture image lien:", error);
      res.status(500).json({ message: "Erreur" });
    }
  });

  // List all payment links
  app.get('/api/admin/payment-links', requireAdmin, async (_req, res) => {
    try {
      const links = await db.select().from(paymentLinks).orderBy(desc(paymentLinks.createdAt));
      res.json(links);
    } catch (err) {
      console.error('[PAYMENT-LINKS] List error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Create a payment link (hosted on SIKA TEXTE — SR push via SolvexPay)
  app.post('/api/admin/payment-links', requireAdmin, async (req: any, res) => {
    try {
      const parsed = createPaymentLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { label, amount, currency, description } = parsed.data;

      // Generate a unique ID first, then build the link URL from it
      const linkId = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.hostname;
      const linkUrl = `${proto}://${host}/pay/${linkId}`;

      const { imageUrl } = parsed.data;

      const [created] = await db.insert(paymentLinks).values({
        id: linkId,
        label,
        amount: amount.toString(),
        currency: currency || 'XOF',
        description: description || null,
        linkUrl,
        solvexpayLinkId: null,
        imageUrl: imageUrl || null,
        isActive: true,
      }).returning();

      res.status(201).json(created);
    } catch (err) {
      console.error('[PAYMENT-LINKS] Create error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // ── Public routes (no auth required) ──

  // Get all PCS codes for the logged-in user
  app.get('/api/user/pcs-codes', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const codes = await db.select({
        id: pcsCodes.id,
        code: pcsCodes.code,
        status: pcsCodes.status,
        createdAt: pcsCodes.createdAt,
      })
        .from(pcsCodes)
        .where(eq(pcsCodes.userId, userId))
        .orderBy(desc(pcsCodes.createdAt));
      res.json(codes);
    } catch (error) {
      console.error('Error fetching user PCS codes:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des codes PCS' });
    }
  });

  // Get payment link details (for the checkout page)
  app.get('/api/public/payment-links/:linkId', async (req, res) => {
    try {
      const { linkId } = req.params;
      const [link] = await db.select().from(paymentLinks).where(eq(paymentLinks.id, linkId));
      if (!link) return res.status(404).json({ message: 'Lien introuvable' });
      if (!link.isActive) return res.status(403).json({ message: 'Ce lien de paiement est désactivé' });
      const settings = await storage.getAppSettings();
      const ciRedirect = settings.find((s: any) => s.key === 'ci_payment_link_redirect')?.value !== 'false';
      const ciRedirectUrl = settings.find((s: any) => s.key === 'ci_payment_link_url')?.value || 'https://clp.ci/ETPXwo';
      res.json({
        id: link.id,
        label: link.label,
        amount: link.amount,
        currency: link.currency,
        description: link.description,
        imageUrl: link.imageUrl || null,
        ciRedirect,
        ciRedirectUrl,
      });
    } catch (err) {
      console.error('[PAYMENT-LINKS] Public get error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Initiate SR payment for a payment link (public — called by checkout page)
  app.post('/api/public/payment-links/:linkId/pay', async (req, res) => {
    try {
      const { linkId } = req.params;
      const [link] = await db.select().from(paymentLinks).where(eq(paymentLinks.id, linkId));
      if (!link) return res.status(404).json({ message: 'Lien introuvable' });
      if (!link.isActive) return res.status(403).json({ message: 'Ce lien est désactivé' });

      const { phone, operator, country, otp, customerName, customerEmail } = req.body;
      if (!phone || !operator || !country) {
        return res.status(400).json({ message: 'Téléphone, opérateur et pays requis' });
      }

      const apiKey = process.env.SOLVEXPAY_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'Clé API non configurée' });

      const countryPrefixes: Record<string, string> = {
        BJ: '229', CI: '225', SN: '221', TG: '228', CM: '237', BF: '226', COG: '242'
      };
      const prefix = countryPrefixes[country] || '';
      const digitsOnly = phone.replace(/\D/g, '');
      const fullPhone = digitsOnly.startsWith(prefix) ? digitsOnly : prefix + digitsOnly;

      const payload: Record<string, any> = {
        amount: parseFloat(link.amount),
        phone: fullPhone,
        operator: operator.toLowerCase(),
        country,
        description: `${link.label} — SIKA TEXTE`,
        customer_name: customerName || undefined,
        customer_email: customerEmail || undefined,
      };
      if (otp) payload.otp = otp;

      console.log('[PAYMENT-LINKS-PAY] Initiating SR for link:', linkId, 'amount:', link.amount, 'phone:', fullPhone, 'operator:', operator);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const spRes = await fetch('https://solvexpay.com/api/v1/sr/pay', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const spData = await spRes.json();
      console.log('[PAYMENT-LINKS-PAY] SolvexPay response status:', spRes.status, JSON.stringify(spData));

      if (!spRes.ok) {
        const errMsg = spData?.message || spData?.error?.message || 'Erreur SolvexPay';
        return res.status(spRes.status).json({ message: errMsg });
      }

      // Save transaction record (dédup : éviter les doublons en moins de 5 min pour le même phone+lien)
      try {
        const dupRes = await db.execute(sql`
          SELECT id FROM payment_link_transactions
          WHERE link_id = ${linkId} AND phone = ${fullPhone} AND status = 'pending'
            AND created_at > now() - interval '5 minutes'
          LIMIT 1
        `);
        const isDuplicate = (dupRes.rows || []).length > 0;

        if (!isDuplicate) {
          await db.insert(paymentLinkTransactions).values({
            linkId,
            linkLabel: link.label,
            amount: link.amount,
            currency: link.currency || 'XOF',
            phone: fullPhone,
            operator: operator.toLowerCase(),
            country,
            customerName: customerName || null,
            customerEmail: customerEmail || null,
            solvexpayTxnId: spData.id,
            reference: spData.reference || null,
            status: spData.status || 'pending',
          });
        } else {
          console.log('[PAYMENT-LINKS-PAY] Doublon ignoré (pending récent) pour', fullPhone, linkId);
        }

        // Send Telegram notification for PCS purchase / activation links
        if (!isDuplicate && (linkId === 'd3e5479d' || linkId === 'codepcs' || linkId === '88cb6331')) {
          const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
          if (TELEGRAM_TOKEN) {
            const adminChatId = '7457302722';
            const OPERATORS_FR: Record<string, string> = { mtn: 'MTN', moov: 'Moov', orange: 'Orange', wave: 'Wave', tmoney: 'T-Money', free: 'Free' };
            const emailDisplay = customerEmail ? `<code>${customerEmail}</code>` : '<i>non renseigné</i>';
            const titlePrefix = linkId === '88cb6331' ? '🟢 <b>Activation Code PCS</b>' : '🔔 <b>Nouvelle demande — Code PCS</b>';
            const emailWarning = (!customerEmail && linkId === '88cb6331') ? `\n⚠️ <b>Email manquant</b> — impossible d'attacher la liste des codes PCS du client.\n` : '';
            const notifText =
              `${titlePrefix}\n\n` +
              `👤 <b>Nom :</b> ${customerName || 'Non renseigné'}\n` +
              `📧 <b>Email :</b> ${emailDisplay}\n` +
              `📱 <b>Téléphone :</b> <code>${formatPhoneIntl(fullPhone, country)}</code>\n` +
              `💳 <b>Opérateur :</b> ${OPERATORS_FR[operator.toLowerCase()] || operator}\n` +
              `💰 <b>Montant :</b> ${Number(link.amount).toLocaleString('fr-FR')} FCFA\n` +
              `🔗 <b>Lien :</b> ${linkId}\n` +
              emailWarning +
              `\n⏳ Paiement USSD initié. Envoyez ${linkId === '88cb6331' ? `<code>${formatPhoneIntl(fullPhone, country)} act pcs</code>` : `<code>${formatPhoneIntl(fullPhone, country)} pcs</code>`} pour retrouver cette demande.`;
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: adminChatId, text: notifText, parse_mode: 'HTML' })
            }).catch(e => console.error('[PAYMENT-LINKS-PAY] Telegram notify error:', e));

            // Joindre automatiquement la liste des codes PCS du client (tous liens PCS)
            if (customerEmail) {
              await sendUserPcsCodesListToTelegram(adminChatId, customerEmail, TELEGRAM_TOKEN);
            }
          }
        }
      } catch (dbErr) {
        console.error('[PAYMENT-LINKS-PAY] Failed to save transaction:', dbErr);
      }

      res.json({
        success: true,
        transactionId: spData.id,
        reference: spData.reference,
        status: spData.status,
        message: spData.message || 'Paiement initié. Validez sur votre téléphone.',
        amount: spData.amount,
        fees: spData.fees,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return res.status(504).json({ message: 'SolvexPay ne répond pas. Réessayez.' });
      }
      console.error('[PAYMENT-LINKS-PAY] Error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Enregistre une transaction CI en attente (redirection externe, pas SolvexPay)
  app.post('/api/public/payment-links/:linkId/ci-record', async (req, res) => {
    try {
      const { linkId } = req.params;
      const { phone, operator, country, customerName, customerEmail } = req.body;

      // Vérifier que le lien existe
      const [link] = await db.select().from(paymentLinks).where(
        and(eq(paymentLinks.id, linkId), eq(paymentLinks.isActive, true))
      ).limit(1);
      if (!link) return res.status(404).json({ message: 'Lien introuvable ou inactif' });

      // Dédup : éviter les doublons en moins de 5 min pour le même phone+lien
      const dupResCi = await db.execute(sql`
        SELECT id FROM payment_link_transactions
        WHERE link_id = ${linkId} AND phone = ${phone || ''} AND status = 'pending'
          AND created_at > now() - interval '5 minutes'
        LIMIT 1
      `);
      const isDuplicateCi = (dupResCi.rows || []).length > 0;

      let txn: any = null;
      if (!isDuplicateCi) {
        const [t] = await db.insert(paymentLinkTransactions).values({
          linkId,
          linkLabel: link.label,
          amount: link.amount,
          currency: link.currency || 'XOF',
          phone: phone || null,
          operator: operator || 'ci-redirect',
          country: country || 'CI',
          customerName: customerName || null,
          customerEmail: customerEmail || null,
          solvexpayTxnId: null,
          reference: null,
          status: 'pending',
        }).returning();
        txn = t;
        console.log('[CI-RECORD] Pending transaction created:', txn.id, customerEmail);
      } else {
        console.log('[CI-RECORD] Doublon ignoré (pending récent) pour', phone, linkId);
      }

      // Send Telegram notification for PCS purchase / activation links
      if (!isDuplicateCi && (linkId === 'd3e5479d' || linkId === 'codepcs' || linkId === '88cb6331')) {
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (TELEGRAM_TOKEN) {
          const adminChatId = '7457302722';
          const OPERATORS_FR: Record<string, string> = { mtn: 'MTN', moov: 'Moov', orange: 'Orange', wave: 'Wave', tmoney: 'T-Money', free: 'Free', 'ci-redirect': 'CI (lien)' };
          const emailDisplay = customerEmail ? `<code>${customerEmail}</code>` : '<i>non renseigné</i>';
          const titlePrefix = linkId === '88cb6331' ? '🟢 <b>Activation Code PCS</b>' : '🔔 <b>Nouvelle demande — Code PCS</b>';
          const emailWarning = (!customerEmail && linkId === '88cb6331') ? `\n⚠️ <b>Email manquant</b> — impossible d'attacher la liste des codes PCS du client.\n` : '';
          const notifText =
            `${titlePrefix}\n\n` +
            `👤 <b>Nom :</b> ${customerName || 'Non renseigné'}\n` +
            `📧 <b>Email :</b> ${emailDisplay}\n` +
            `📱 <b>Téléphone :</b> <code>${formatPhoneIntl(phone, country) || '—'}</code>\n` +
            `💳 <b>Opérateur :</b> ${OPERATORS_FR[operator] || operator || '—'}\n` +
            `💰 <b>Montant :</b> ${Number(link.amount).toLocaleString('fr-FR')} FCFA\n` +
            `🔗 <b>Lien :</b> ${linkId}\n` +
            emailWarning +
            `\n⏳ En attente de validation. Envoyez ${linkId === '88cb6331' ? `<code>${formatPhoneIntl(phone, country) || 'numéro'} act pcs</code>` : `<code>${formatPhoneIntl(phone, country) || 'numéro'} pcs</code>`} pour retrouver cette demande.`;
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: adminChatId, text: notifText, parse_mode: 'HTML' })
          }).catch(e => console.error('[CI-RECORD] Telegram notify error:', e));

          // Joindre automatiquement la liste des codes PCS du client (tous liens PCS)
          if (customerEmail) {
            await sendUserPcsCodesListToTelegram(adminChatId, customerEmail, TELEGRAM_TOKEN);
          }
        }
      }

      res.json({ success: true, id: txn?.id || null, duplicate: isDuplicateCi });
    } catch (err) {
      console.error('[CI-RECORD] Error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Check transaction status (public polling)
  app.get('/api/public/payment-links/check/:txnId', async (req, res) => {
    try {
      const { txnId } = req.params;
      const apiKey = process.env.SOLVEXPAY_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'Clé API non configurée' });

      const spRes = await fetch(`https://solvexpay.com/api/v1/transactions/${txnId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const spData = await spRes.json();
      const newStatus = spData?.status || 'unknown';
      // Update local DB status if changed
      if (newStatus === 'completed' || newStatus === 'failed') {
        // Fetch transaction to check if PCS email needs to be sent
        const [existingTxn] = await db.select().from(paymentLinkTransactions)
          .where(eq(paymentLinkTransactions.solvexpayTxnId, txnId));

        if (newStatus === 'completed' && existingTxn?.linkId === 'd3e5479d' && existingTxn.customerEmail) {
          // ── LIEN d3e5479d : génère un code PCS aléatoire ──
          let pcsCode = generatePcsCode();
          for (let attempt = 1; attempt < 5; attempt++) {
            const clash = await db.select({ id: paymentLinkTransactions.id })
              .from(paymentLinkTransactions)
              .where(eq(paymentLinkTransactions.pcsCode, pcsCode))
              .limit(1);
            if (clash.length === 0) break;
            pcsCode = generatePcsCode();
          }
          // Atomic: only update if pcs_code IS NULL (prevents double-send on concurrent polls)
          const updated = await db.update(paymentLinkTransactions)
            .set({ status: newStatus, pcsCode, updatedAt: new Date() })
            .where(and(
              eq(paymentLinkTransactions.solvexpayTxnId, txnId),
              isNull(paymentLinkTransactions.pcsCode),
            ))
            .returning();
          // Only send email if this request actually wrote the code
          if (updated.length > 0) {
            const nameParts = (existingTxn.customerName || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
            sendPcsEmail({
              to: existingTxn.customerEmail,
              firstName,
              lastName,
              countryCode: existingTxn.country || '',
              pcsCode,
              issuedAt: new Date(),
            }).catch(e => console.error('[PCS-EMAIL] Send failed:', e));
          }
        } else if (newStatus === 'completed' && existingTxn?.linkId === 'codepcs' && existingTxn.customerEmail) {
          // ── LIEN codepcs : génère un NOUVEAU code PCS et l'envoie par email ──
          let pcsCode = generatePcsCode();
          for (let attempt = 1; attempt < 5; attempt++) {
            const clash = await db.select({ id: paymentLinkTransactions.id })
              .from(paymentLinkTransactions)
              .where(eq(paymentLinkTransactions.pcsCode, pcsCode))
              .limit(1);
            if (clash.length === 0) break;
            pcsCode = generatePcsCode();
          }
          // Atomic: only update if pcs_code IS NULL (prevents double-send on concurrent polls)
          const updated = await db.update(paymentLinkTransactions)
            .set({ status: newStatus, pcsCode, updatedAt: new Date() })
            .where(and(
              eq(paymentLinkTransactions.solvexpayTxnId, txnId),
              isNull(paymentLinkTransactions.pcsCode),
            ))
            .returning();
          if (updated.length > 0) {
            const nameParts = (existingTxn.customerName || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
            sendPcsEmail({
              to: existingTxn.customerEmail,
              firstName,
              lastName,
              countryCode: existingTxn.country || '',
              pcsCode,
              issuedAt: new Date(),
            }).catch(e => console.error('[PCS-EMAIL-CODEPCS] Send failed:', e));
            console.log(`[PCS-CODEPCS] Nouveau code ${pcsCode} envoyé à ${existingTxn.customerEmail}`);
          }
        } else {
          db.update(paymentLinkTransactions)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(eq(paymentLinkTransactions.solvexpayTxnId, txnId))
            .catch(() => {});
        }
      }
      res.json({ status: newStatus, transaction: spData });
    } catch (err) {
      console.error('[PAYMENT-LINKS-CHECK] Error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Update a payment link
  app.patch('/api/admin/payment-links/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const [current] = await db.select().from(paymentLinks).where(eq(paymentLinks.id, id));
      if (!current) return res.status(404).json({ message: 'Lien introuvable' });
      const { label, amount, description, imageUrl } = req.body;
      const updates: Record<string, any> = {};
      if (label !== undefined) updates.label = label;
      if (amount !== undefined) updates.amount = parseFloat(amount).toString();
      if (description !== undefined) updates.description = description || null;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl || null;
      const [updated] = await db.update(paymentLinks).set(updates).where(eq(paymentLinks.id, id)).returning();
      res.json(updated);
    } catch (err) {
      console.error('[PAYMENT-LINKS] Update error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Toggle active/inactive
  app.patch('/api/admin/payment-links/:id/toggle', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const [current] = await db.select().from(paymentLinks).where(eq(paymentLinks.id, id));
      if (!current) return res.status(404).json({ message: 'Lien introuvable' });
      const [updated] = await db.update(paymentLinks)
        .set({ isActive: !current.isActive })
        .where(eq(paymentLinks.id, id))
        .returning();
      res.json(updated);
    } catch (err) {
      console.error('[PAYMENT-LINKS] Toggle error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Delete a payment link
  app.delete('/api/admin/payment-links/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      if (id === 'd3e5479d' || id === 'codepcs' || id === '88cb6331') {
        return res.status(403).json({ message: 'Ce lien est protégé et ne peut pas être supprimé.' });
      }
      await db.delete(paymentLinks).where(eq(paymentLinks.id, id));
      res.json({ success: true });
    } catch (err) {
      console.error('[PAYMENT-LINKS] Delete error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Admin — historique des transactions par lien
  app.get('/api/admin/payment-link-transactions', requireAdmin, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
      const offset = (page - 1) * limit;
      const search = (req.query.search as string || '').trim();
      const statusFilter = (req.query.status as string || '').trim();

      const conditions: any[] = [];
      if (search) {
        conditions.push(or(
          ilike(paymentLinkTransactions.customerName, `%${search}%`),
          ilike(paymentLinkTransactions.customerEmail, `%${search}%`),
          ilike(paymentLinkTransactions.phone, `%${search}%`),
        ));
      }
      if (statusFilter && statusFilter !== 'all') {
        conditions.push(eq(paymentLinkTransactions.status, statusFilter));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totals] = await Promise.all([
        db.select().from(paymentLinkTransactions)
          .where(where)
          .orderBy(desc(paymentLinkTransactions.createdAt))
          .limit(limit).offset(offset),
        db.select({ total: count() }).from(paymentLinkTransactions).where(where),
      ]);

      res.json({
        transactions: rows,
        total: Number(totals[0]?.total || 0),
        page,
        limit,
        pages: Math.ceil(Number(totals[0]?.total || 0) / limit),
      });
    } catch (err) {
      console.error('[PAYMENT-LINK-TXN] List error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Admin — mise à jour manuelle du statut (transactions CI sans solvexpayTxnId)
  app.patch('/api/admin/payment-link-transactions/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['completed', 'failed', 'pending'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide' });
      }
      const [txn] = await db.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.id, id));
      if (!txn) return res.status(404).json({ message: 'Transaction introuvable' });

      // Génère un code PCS pour le lien codepcs si marqué "completed" et email présent
      if (status === 'completed' && txn.linkId === 'codepcs' && txn.customerEmail) {
        // Éviter la double génération si déjà un code
        if (txn.pcsCode) {
          const [updated] = await db.update(paymentLinkTransactions)
            .set({ status, updatedAt: new Date() })
            .where(eq(paymentLinkTransactions.id, id))
            .returning();
          return res.json(updated);
        }
        let pcsCode = generatePcsCode();
        for (let attempt = 1; attempt < 5; attempt++) {
          const clash = await db.select({ id: paymentLinkTransactions.id })
            .from(paymentLinkTransactions)
            .where(eq(paymentLinkTransactions.pcsCode, pcsCode))
            .limit(1);
          if (clash.length === 0) break;
          pcsCode = generatePcsCode();
        }
        // Mise à jour atomique — seulement si pcs_code est encore NULL
        const atomicUpdated = await db.update(paymentLinkTransactions)
          .set({ status, pcsCode, updatedAt: new Date() })
          .where(and(
            eq(paymentLinkTransactions.id, id),
            isNull(paymentLinkTransactions.pcsCode),
          ))
          .returning();
        if (atomicUpdated.length > 0) {
          const nameParts = (txn.customerName || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
          sendPcsEmail({
            to: txn.customerEmail,
            firstName,
            lastName,
            countryCode: txn.country || 'CI',
            pcsCode,
            issuedAt: new Date(),
          }).catch(e => console.error('[PCS-EMAIL-MANUAL-CODEPCS] Send failed:', e));
          console.log(`[PCS-CODEPCS-MANUAL] Code ${pcsCode} généré et envoyé à ${txn.customerEmail}`);
          return res.json(atomicUpdated[0]);
        }
        const [current] = await db.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.id, id));
        return res.json(current);
      }

      const [updated] = await db.update(paymentLinkTransactions)
        .set({ status, updatedAt: new Date() })
        .where(eq(paymentLinkTransactions.id, id))
        .returning();
      res.json(updated);
    } catch (err) {
      console.error('[PAYMENT-LINK-TXN] Manual update error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Admin — rafraîchir le statut d'une transaction via SolvexPay
  app.post('/api/admin/payment-link-transactions/:id/refresh', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const [txn] = await db.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.id, id));
      if (!txn || !txn.solvexpayTxnId) return res.status(404).json({ message: 'Transaction introuvable' });
      const apiKey = process.env.SOLVEXPAY_API_KEY;
      if (!apiKey) return res.status(500).json({ message: 'Clé API non configurée' });
      const spRes = await fetch(`https://solvexpay.com/api/v1/transactions/${txn.solvexpayTxnId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const spData = await spRes.json();
      const newStatus = spData?.status || txn.status || 'pending';

      // Generate PCS code and send email if this is the PCS link completing for the first time
      if (newStatus === 'completed' && txn.linkId === 'd3e5479d' && txn.customerEmail) {
        // Uniqueness-safe PCS code generation with retry
        let pcsCode = generatePcsCode();
        for (let attempt = 1; attempt < 5; attempt++) {
          const clash = await db.select({ id: paymentLinkTransactions.id })
            .from(paymentLinkTransactions)
            .where(eq(paymentLinkTransactions.pcsCode, pcsCode))
            .limit(1);
          if (clash.length === 0) break;
          pcsCode = generatePcsCode();
        }
        // Atomic: only update if pcs_code IS NULL (prevents double-send on concurrent refreshes)
        const atomicUpdated = await db.update(paymentLinkTransactions)
          .set({ status: newStatus, pcsCode, updatedAt: new Date() })
          .where(and(
            eq(paymentLinkTransactions.id, id),
            isNull(paymentLinkTransactions.pcsCode),
          ))
          .returning();
        // Only send email if this request actually wrote the code
        if (atomicUpdated.length > 0) {
          const nameParts = (txn.customerName || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
          sendPcsEmail({
            to: txn.customerEmail,
            firstName,
            lastName,
            countryCode: txn.country || '',
            pcsCode,
            issuedAt: new Date(),
          }).catch(e => console.error('[PCS-EMAIL] Refresh send failed:', e));
          return res.json(atomicUpdated[0]);
        }
        // Code was already assigned (another concurrent request beat us) — return current state
        const [current] = await db.select().from(paymentLinkTransactions).where(eq(paymentLinkTransactions.id, id));
        return res.json(current);
      }

      const [updated] = await db.update(paymentLinkTransactions)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(paymentLinkTransactions.id, id))
        .returning();
      res.json(updated);
    } catch (err) {
      console.error('[PAYMENT-LINK-TXN] Refresh error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Admin: chercher un utilisateur par email pour auto-remplissage
  app.get('/api/admin/user-by-email', requireAdmin, async (req: any, res) => {
    try {
      const email = (req.query.email as string || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Email invalide' });
      }
      const [user] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
      }).from(users).where(ilike(users.email, email)).limit(1);

      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
      res.json(user);
    } catch (err) {
      console.error('[ADMIN USER-BY-EMAIL] Error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Admin: envoyer codes PCS par email (ou enregistrer sans email)
  app.post('/api/admin/send-pcs', requireAdmin, async (req: any, res) => {
    try {
      const { email, firstName, lastName, countryCode, codes, statuses, quantity, skipEmail } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: 'Adresse email invalide' });
      }
      if (!skipEmail && !countryCode) {
        return res.status(400).json({ message: 'Pays requis' });
      }

      let pcsCodesWithStatus: { code: string; status: 'actif' | 'inactif' }[] = [];

      if (Array.isArray(codes) && codes.length > 0) {
        pcsCodesWithStatus = codes
          .filter((c: string) => typeof c === 'string' && c.trim())
          .map((c: string, i: number) => ({
            code: c.trim(),
            status: (Array.isArray(statuses) && statuses[i] === 'actif') ? 'actif' : 'inactif',
          }));
      } else if (quantity && Number(quantity) > 0) {
        const n = Math.min(Number(quantity), 20);
        for (let i = 0; i < n; i++) pcsCodesWithStatus.push({ code: generatePcsCode(), status: 'inactif' });
      }

      if (pcsCodesWithStatus.length === 0) {
        return res.status(400).json({ message: 'Au moins un code PCS est requis' });
      }

      // Save codes to DB if user found by email
      const [foundUser] = await db.select({ id: users.id })
        .from(users).where(ilike(users.email, email)).limit(1);
      if (foundUser) {
        for (const { code, status } of pcsCodesWithStatus) {
          try {
            await db.insert(pcsCodes).values({
              userId: foundUser.id,
              code,
              status,
            }).onConflictDoUpdate({
              target: pcsCodes.code,
              set: { status },
            });
          } catch (e) {
            console.error('[ADMIN PCS] Failed to save code to DB:', e);
          }
        }
        console.log(`[ADMIN PCS] Saved ${pcsCodesWithStatus.length} code(s) to DB for user ${foundUser.id}`);
      } else {
        console.log(`[ADMIN PCS] No user found for email ${email} — codes not saved to DB`);
      }

      const pcsCodeValues = pcsCodesWithStatus.map(x => x.code);

      // Skip email if requested (enregistrement uniquement)
      if (skipEmail) {
        return res.json({ success: true, sent: 0, codes: pcsCodeValues, linkedToAccount: !!foundUser, emailSkipped: true });
      }

      const sent = await sendPcsEmailBatch({
        to: email,
        firstName: firstName || 'Cher',
        lastName: lastName || 'Client',
        countryCode,
        pcsCodesWithStatus,
        issuedAt: new Date(),
      });

      if (!sent) {
        return res.status(500).json({ message: "Échec de l'envoi de l'email" });
      }

      console.log(`[ADMIN PCS] Sent ${pcsCodeValues.length} PCS code(s) to ${email}`);
      res.json({ success: true, sent: pcsCodeValues.length, codes: pcsCodeValues, linkedToAccount: !!foundUser });
    } catch (err) {
      console.error('[ADMIN PCS] Error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Initialiser les paramètres par défaut
  storage.initializeDefaultSettings().catch(console.error);

  const httpServer = createServer(app);
  return httpServer;
}
