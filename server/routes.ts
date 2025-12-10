import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
  appSettings
} from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import { db } from "./db";
import { eq, sql, and, desc, or } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { randomBytes } from "crypto";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup sessions
  setupSessions(app);

  // Initialize app settings if they don't exist
  try {
    const existingSettings = await storage.getAppSettings();
    const hasActivationAmount = existingSettings.some(s => s.key === 'activation_amount');
    
    if (!hasActivationAmount) {
      await db.insert(appSettings).values({
        key: 'activation_amount',
        value: '3600',
        label: 'Montant d\'activation'
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
      res.json(user);
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
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        type: 'payment',
        amount: activationFee.toString(),
        description: 'Activation compte SIKA TEXTE',
        status: 'completed'
      });
      
      res.json({ message: 'Compte activé avec succès' });
    } catch (error: any) {
      console.error('Error activating account:', error);
      if (error.issues) {
        return res.status(400).json({ message: 'Données invalides', errors: error.issues });
      }
      res.status(500).json({ message: 'Erreur lors de l\'activation du compte' });
    }
  });

  app.post('/api/withdrawal/request', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Montant invalide' });
      }
      
      // Check if account is active
      const accountStatus = await storage.getAccountStatus(userId);
      if (!accountStatus?.isActive) {
        return res.status(400).json({ message: 'Compte non activé' });
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
      
      // Get user phone number
      const user = await storage.getUser(userId);
      const userPhone = user?.phone || '';
      
      // Generate unique reference for linking withdrawal and transaction
      const reference = `WD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
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
      if (!value) {
        return res.status(400).json({ message: 'Valeur requise' });
      }
      await storage.updateAppSetting(key, value);
      res.json({ message: 'Paramètre mis à jour avec succès' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du paramètre:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    }
  });

  // Route pour obtenir un paramètre spécifique (accessible à tous)
  app.get('/api/settings/:key', async (req: any, res) => {
    try {
      const { key } = req.params;
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

  // BKAPAY v1.3 - Activation Payment API
  // Creates payment record and redirects to BKAPay payment page
  app.post('/api/activation/init-payment', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Check if account is already active
      const statusResult = await db.select().from(accountStatus).where(eq(accountStatus.userId, userId));
      if (statusResult.length > 0 && statusResult[0].isActive) {
        return res.status(400).json({ message: 'Votre compte est déjà activé' });
      }
      
      // Get activation amount from settings
      const settings = await storage.getAppSettings();
      const activationSetting = settings.find(s => s.key === 'activation_amount');
      const activationAmount = parseInt(activationSetting?.value || '3600');
      
      // Generate unique reference
      const reference = `ACT-${userId.substring(0, 8)}-${Date.now()}`;
      
      // Create pending payment record
      await db.insert(bkapayPayments).values({
        id: crypto.randomUUID(),
        userId: userId,
        amount: activationAmount.toString(),
        reference: reference,
        status: 'pending',
        createdAt: new Date()
      });
      
      // Build BKAPay redirect URL as per v1.3 documentation
      const publicKey = process.env.BKAPAY_PUBLIC_KEY;
      if (!publicKey) {
        return res.status(500).json({ message: 'Clé API BKAPay non configurée' });
      }
      
      // Always use HTTPS for callback (Replit runs behind proxy)
      const host = req.get('host');
      const baseCallbackUrl = `https://${host}/activation-success?ref=${reference}`;
      const callbackUrl = encodeURIComponent(baseCallbackUrl);
      const description = encodeURIComponent(`Activation compte SIKA TEXTE - ${user.firstName || user.fullName || 'Utilisateur'}`);
      
      const redirectUrl = `https://bkapay.com/api-pay/${publicKey}?amount=${activationAmount}&description=${description}&callback=${callbackUrl}`;
      
      console.log('[BKAPAY-INIT] ===== PAYMENT INITIATED =====');
      console.log('[BKAPAY-INIT] User ID:', userId);
      console.log('[BKAPAY-INIT] Reference:', reference);
      console.log('[BKAPAY-INIT] Amount:', activationAmount);
      console.log('[BKAPAY-INIT] Callback URL (raw):', baseCallbackUrl);
      console.log('[BKAPAY-INIT] Callback URL (encoded):', callbackUrl);
      console.log('[BKAPAY-INIT] Full Redirect URL:', redirectUrl);
      
      res.json({ 
        redirectUrl,
        reference,
        amount: activationAmount
      });
    } catch (error) {
      console.error('[BKAPAY-INIT] Error:', error);
      res.status(500).json({ message: 'Erreur lors de l\'initiation du paiement' });
    }
  });

  // Process return from BKAPay - Activate account when user returns after payment
  // No auth required - uses payment reference to identify user
  app.post('/api/activation/process-return', async (req: any, res) => {
    try {
      const { reference, status, transactionId, amount } = req.body;
      
      console.log('[ACTIVATION-RETURN] ===== PROCESSING PAYMENT RETURN =====');
      console.log('[ACTIVATION-RETURN] Reference:', reference);
      console.log('[ACTIVATION-RETURN] Status:', status);
      console.log('[ACTIVATION-RETURN] TransactionId:', transactionId);
      console.log('[ACTIVATION-RETURN] Amount:', amount);
      
      if (!reference) {
        return res.status(400).json({ message: 'Référence manquante', activated: false });
      }

      // Find the payment record by reference
      const payments = await db.select().from(bkapayPayments)
        .where(eq(bkapayPayments.reference, reference));
      const payment = payments[0];

      if (!payment) {
        console.log('[ACTIVATION-RETURN] Payment not found for reference:', reference);
        return res.status(404).json({ message: 'Paiement non trouvé', activated: false });
      }
      
      const userId = payment.userId;
      console.log('[ACTIVATION-RETURN] User from payment:', userId);

      // Check if already completed
      if (payment.status === 'completed') {
        console.log('[ACTIVATION-RETURN] Payment already completed');
        // Still return success as account should be active
        const accountStat = await storage.getAccountStatus(userId);
        return res.json({ 
          message: 'Paiement déjà traité', 
          activated: accountStat?.isActive || false,
          alreadyProcessed: true
        });
      }

      // If status is failed from BKAPay, mark as failed
      if (status === 'failed') {
        await db.update(bkapayPayments)
          .set({ status: 'failed' })
          .where(eq(bkapayPayments.id, payment.id));
        return res.status(400).json({ message: 'Le paiement a échoué', activated: false });
      }

      // Process successful payment - Credit balance and activate account
      console.log('[ACTIVATION-RETURN] Processing successful payment...');
      
      const paymentAmount = parseFloat(payment.amount);

      // Mark payment as completed
      await db.update(bkapayPayments)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(bkapayPayments.id, payment.id));

      // Credit user balance
      await storage.updateUserBalance(userId, paymentAmount);

      // Create transaction record
      await storage.createTransaction({
        userId: userId,
        type: 'recharge',
        amount: paymentAmount.toString(),
        description: 'Dépôt via BKAPay',
        status: 'completed',
        reference: reference,
        operator: 'BKAPay'
      });

      // Activate account
      await storage.activateAccount(userId);

      console.log('[ACTIVATION-RETURN] ╔════════════════════════════════════════╗');
      console.log('[ACTIVATION-RETURN] ║  ✓ ACCOUNT ACTIVATED SUCCESSFULLY      ║');
      console.log('[ACTIVATION-RETURN] ║  User:', userId);
      console.log('[ACTIVATION-RETURN] ║  Amount:', paymentAmount, 'FCFA');
      console.log('[ACTIVATION-RETURN] ╚════════════════════════════════════════╝');

      return res.json({ 
        message: 'Compte activé avec succès', 
        activated: true,
        balanceCredited: paymentAmount
      });

    } catch (error) {
      console.error('[ACTIVATION-RETURN] Error:', error);
      res.status(500).json({ message: 'Erreur lors du traitement', activated: false });
    }
  });

  // BKAPAY WEBHOOK v1.3 - Automatic account activation via secure webhook
  // IMPORTANT: This URL MUST be configured in BKAPay Dashboard:
  //   1. Go to Dashboard → Clés API
  //   2. Click your public key (pk_live_...)
  //   3. Click "Configurer un callback"
  //   4. Enter this URL: https://sikatexte.site/api/webhook/bkapay
  //   5. Copy the secret and set as BKAPAY_SIGNATURE_SECRET env variable
  // Documentation: https://bkapay.com/documentation/v1.3
  app.post('/api/webhook/bkapay', async (req, res) => {
    try {
      const crypto = require('crypto');
      
      console.log('[BKAPAY-WEBHOOK-v1.3] ===== WEBHOOK RECEIVED =====');
      
      // BKAPay v1.3 sends signature in X-BKApay-Signature header (HMAC-SHA256)
      const signature = req.headers['x-bkapay-signature'] as string;
      const signatureSecret = process.env.BKAPAY_SIGNATURE_SECRET;
      
      console.log('[BKAPAY-WEBHOOK-v1.3] Signature received:', !!signature);
      console.log('[BKAPAY-WEBHOOK-v1.3] Secret configured:', !!signatureSecret);
      console.log('[BKAPAY-WEBHOOK-v1.3] Payload:', JSON.stringify(req.body, null, 2));
      
      // SECURITY: Verify HMAC-SHA256 signature (REQUIRED - as per BKAPay v1.3 docs)
      if (signatureSecret && signature) {
        const payload = JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac('sha256', signatureSecret)
          .update(payload)
          .digest('hex');
        
        if (signature !== expectedSignature) {
          console.log('[BKAPAY-WEBHOOK-v1.3] ✗ INVALID SIGNATURE - Rejecting');
          return res.status(401).json({ error: 'Signature invalide' });
        }
        console.log('[BKAPAY-WEBHOOK-v1.3] ✓ Signature VERIFIED');
      } else {
        console.log('[BKAPAY-WEBHOOK-v1.3] WARNING: No signature check (secret or header missing)');
      }
      
      // Extract BKAPay v1.3 webhook payload (exactly as per documentation)
      const { 
        event,
        transactionId, 
        externalReference,
        amount, 
        status, 
        customerEmail, 
        customerPhone,
        customerName,
        operator,
        description
      } = req.body;
      
      console.log('[BKAPAY-WEBHOOK-v1.3] Event:', event);
      console.log('[BKAPAY-WEBHOOK-v1.3] Transaction ID:', transactionId);
      console.log('[BKAPAY-WEBHOOK-v1.3] External Reference:', externalReference);
      console.log('[BKAPAY-WEBHOOK-v1.3] Amount:', amount);
      console.log('[BKAPAY-WEBHOOK-v1.3] Status:', status);
      console.log('[BKAPAY-WEBHOOK-v1.3] Customer:', customerName, customerEmail, customerPhone);
      console.log('[BKAPAY-WEBHOOK-v1.3] Operator:', operator);
      console.log('[BKAPAY-WEBHOOK-v1.3] Description:', description);
      
      // Find payment by externalReference (if provided) or by searching in description
      let payment = null;
      
      if (externalReference) {
        const payments = await db.select().from(bkapayPayments)
          .where(eq(bkapayPayments.reference, externalReference));
        payment = payments[0];
      }
      
      // If not found by externalReference, try to extract reference from description
      if (!payment && description) {
        // Description might contain our reference like "Activation Compte Sika Texte" or the reference itself
        const refMatch = description.match(/ACT-[a-zA-Z0-9]+-\d+/);
        if (refMatch) {
          const payments = await db.select().from(bkapayPayments)
            .where(eq(bkapayPayments.reference, refMatch[0]));
          payment = payments[0];
        }
      }
      
      // If still not found, try to find by amount and pending status for recent payments
      if (!payment && amount) {
        const recentPayments = await db.select().from(bkapayPayments)
          .where(and(
            eq(bkapayPayments.amount, amount.toString()),
            or(
              eq(bkapayPayments.status, 'pending'),
              eq(bkapayPayments.status, 'awaiting_verification')
            )
          ))
          .orderBy(desc(bkapayPayments.createdAt))
          .limit(1);
        payment = recentPayments[0];
      }
      
      if (!payment) {
        console.log('[BKAPAY-WEBHOOK-v1.3] Payment not found');
        console.log('[BKAPAY-WEBHOOK-v1.3] Searched with externalReference:', externalReference);
        console.log('[BKAPAY-WEBHOOK-v1.3] Searched with description:', description);
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      console.log('[BKAPAY-WEBHOOK-v1.3] Found payment:', payment.id, 'User:', payment.userId);
      
      // Verify amount matches
      const expectedAmount = parseFloat(payment.amount);
      const receivedAmount = amount ? parseFloat(amount) : 0;
      
      if (receivedAmount > 0 && receivedAmount !== expectedAmount) {
        console.log('[BKAPAY-WEBHOOK-v1.3] ✗ AMOUNT MISMATCH - Expected:', expectedAmount, 'Received:', receivedAmount);
        return res.status(400).json({ error: 'Amount mismatch' });
      }
      
      // Check if payment is already processed
      if (payment.status === 'completed') {
        console.log('[BKAPAY-WEBHOOK-v1.3] Payment already completed');
        return res.json({ received: true, message: 'Already processed' });
      }
      
      // According to BKAPay v1.3 docs: event=payment.completed, status=completed
      const isCompleted = (event === 'payment.completed' || status === 'completed') && status !== 'failed';
      const isFailed = event === 'payment.failed' || status === 'failed';
      
      if (isCompleted) {
        console.log('[BKAPAY-WEBHOOK-v1.3] ✓ PAYMENT CONFIRMED (event=payment.completed, status=completed)');
        console.log('[BKAPAY-WEBHOOK-v1.3] Activating account and crediting balance...');
        
        // Get the activation amount for crediting
        const activationAmount = parseFloat(payment.amount);
        
        // Mark payment as completed
        await db.update(bkapayPayments)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(bkapayPayments.id, payment.id));
        
        // CREDIT USER BALANCE with activation amount (e.g., 3600 FCFA)
        await storage.updateUserBalance(payment.userId, activationAmount);
        
        // CREATE TRANSACTION in user history - visible as a recharge/deposit
        await storage.createTransaction({
          userId: payment.userId,
          type: 'recharge',
          amount: activationAmount.toString(),
          description: `Dépôt via BKAPay`,
          status: 'completed',
          reference: payment.reference,
          operator: operator || 'BKAPay'
        });
        
        // ACTIVATE ACCOUNT automatically after successful payment
        await storage.activateAccount(payment.userId);
        
        console.log('[BKAPAY-WEBHOOK-v1.3] ');
        console.log('[BKAPAY-WEBHOOK-v1.3] ╔════════════════════════════════════════╗');
        console.log('[BKAPAY-WEBHOOK-v1.3] ║  ✓ PAYMENT SUCCESS - ACCOUNT ACTIVATED ║');
        console.log('[BKAPAY-WEBHOOK-v1.3] ╠════════════════════════════════════════╣');
        console.log('[BKAPAY-WEBHOOK-v1.3] ║ User ID:', payment.userId);
        console.log('[BKAPAY-WEBHOOK-v1.3] ║ Transaction:', transactionId);
        console.log('[BKAPAY-WEBHOOK-v1.3] ║ Amount Credited:', activationAmount, 'FCFA');
        console.log('[BKAPAY-WEBHOOK-v1.3] ║ Operator:', operator);
        console.log('[BKAPAY-WEBHOOK-v1.3] ║ Customer:', customerName, customerPhone);
        console.log('[BKAPAY-WEBHOOK-v1.3] ╚════════════════════════════════════════╝');
        
        return res.json({ 
          received: true, 
          message: 'Payment successful - account activated',
          activated: true,
          balanceCredited: activationAmount,
          userId: payment.userId
        });
      } else if (isFailed) {
        console.log('[BKAPAY-WEBHOOK-v1.3] ✗ PAYMENT FAILED - Not activating');
        
        await db.update(bkapayPayments)
          .set({ status: 'failed' })
          .where(eq(bkapayPayments.id, payment.id));
        
        return res.json({ 
          received: true, 
          message: 'Payment failed',
          activated: false
        });
      } else {
        console.log('[BKAPAY-WEBHOOK-v1.3] ? UNKNOWN EVENT - event:', event, 'status:', status);
        return res.json({ 
          received: true, 
          message: 'Event received but not processed',
          activated: false
        });
      }
    } catch (error) {
      console.error('[BKAPAY-WEBHOOK-v1.3] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Legacy webhook endpoint (kept for compatibility with old URL)
  app.post('/api/bkapay/webhook', async (req, res) => {
    console.log('[BKAPAY-WEBHOOK-LEGACY] Redirecting to new webhook endpoint');
    // Forward to new endpoint
    req.url = '/api/webhook/bkapay';
    return res.redirect(307, '/api/webhook/bkapay');
  });

  // ACTIVATION API ENDPOINTS REMOVED - Using direct link now

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
      
      // Create transaction record
      await storage.createTransaction({
        userId: payment.userId,
        type: 'recharge',
        amount: paymentAmount.toString(),
        description: 'Dépôt via BKAPay (approuvé par admin)',
        status: 'completed',
        reference: payment.reference,
        operator: 'BKAPay'
      });

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

  // AUDIT: Get fraudulent users who activated without real payment (last 5 days)
  app.get('/api/admin/audit-fraud-activations', requireAdmin, async (req: any, res) => {
    try {
      console.log('[AUDIT] Checking for fraudulent activations (last 5 days)...');
      
      // Get all completed payments from last 5 days
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      const suspiciousPayments = await db.select().from(bkapayPayments)
        .where(and(
          eq(bkapayPayments.status, 'completed'),
          sql`created_at >= ${fiveDaysAgo.toISOString()}`
        ))
        .orderBy(desc(bkapayPayments.completedAt));

      console.log(`[AUDIT] Found ${suspiciousPayments.length} completed payments in last 5 days`);

      // Check each payment with BKAPay API to verify it was real
      const fraudulentUsers = await Promise.all(
        suspiciousPayments.map(async (payment) => {
          try {
            const verifyUrl = `https://bkapay.com/api/verify-transaction/${payment.reference}`;
            const verifyResponse = await fetch(verifyUrl, {
              headers: {
                'Authorization': `Bearer ${process.env.BKAPAY_API_KEY || ''}`
              }
            });

            const verifyData = await verifyResponse.json();
            
            // If payment is NOT confirmed by BKAPay, it's fraudulent
            const isRealPayment = verifyData && (
              verifyData.status === 'success' || 
              verifyData.status === 'completed' ||
              verifyData.paid === true
            );

            if (!isRealPayment) {
              const user = await storage.getUser(payment.userId);
              return {
                paymentId: payment.id,
                reference: payment.reference,
                amount: payment.amount,
                status: payment.status,
                completedAt: payment.completedAt,
                bkapayStatus: verifyData?.status || 'NOT_FOUND',
                fraud: true,
                user: user ? {
                  id: user.id,
                  fullName: user.fullName || `${user.firstName} ${user.lastName}`,
                  phone: user.phone,
                  email: user.email,
                  isActive: user.isActive,
                  balance: user.balance
                } : null
              };
            }
            return null;
          } catch (error) {
            console.error('[AUDIT] Error checking payment:', error);
            return null;
          }
        })
      );

      const fraudDetected = fraudulentUsers.filter(f => f !== null);
      console.log(`[AUDIT] ⚠️ FRAUD DETECTED: ${fraudDetected.length} fraudulent activations found!`);
      
      res.json({
        fraudCount: fraudDetected.length,
        totalChecked: suspiciousPayments.length,
        period: '5 jours',
        fraudulentActivations: fraudDetected,
        summary: `${fraudDetected.length} utilisateurs ont activé leurs comptes sans paiement réel`
      });
    } catch (error) {
      console.error('[AUDIT] Error during fraud audit:', error);
      res.status(500).json({ message: 'Erreur lors de l\'audit' });
    }
  });

  // SECURED CALLBACK - Always verify with BKAPay API before activation
  app.post('/api/activation/callback', async (req: any, res) => {
    try {
      const { reference, status, transactionId } = req.body;
      
      console.log('[CALLBACK SECURITY] ===== PAYMENT CALLBACK RECEIVED =====');
      console.log('[CALLBACK SECURITY] Reference:', reference);
      console.log('[CALLBACK SECURITY] Status claimed:', status);
      
      if (!reference) {
        return res.status(400).json({ message: 'Référence manquante' });
      }

      // Find payment record
      const payment = await db.select().from(bkapayPayments).where(eq(bkapayPayments.reference, reference));
      const paymentRecord = payment[0];

      if (!paymentRecord) {
        console.log('[CALLBACK SECURITY] ERROR: Payment not found for reference:', reference);
        return res.status(404).json({ message: 'Paiement non trouvé' });
      }

      // CRITICAL SECURITY: Always verify with BKAPay API - NEVER trust callback status alone
      console.log('[CALLBACK SECURITY] Verifying payment with BKAPay API...');
      
      let paymentVerified = false;
      let apiResponse = null;
      
      try {
        const verifyUrl = `https://bkapay.com/api/verify-transaction/${reference}`;
        const verifyResponse = await fetch(verifyUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.BKAPAY_API_KEY || ''}`,
            'Content-Type': 'application/json'
          }
        });

        if (verifyResponse.ok) {
          const contentType = verifyResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            apiResponse = await verifyResponse.json();
            console.log('[CALLBACK SECURITY] BKAPay API response:', apiResponse);
            
            // Check for confirmed payment status
            if (apiResponse && (
              apiResponse.status === 'success' ||
              apiResponse.status === 'completed' ||
              apiResponse.status === 'approved' ||
              apiResponse.status === 'SUCCESSFUL' ||
              apiResponse.paid === true ||
              apiResponse.isPaid === true
            )) {
              paymentVerified = true;
              console.log('[CALLBACK SECURITY] ✓ Payment VERIFIED by BKAPay API');
            }
          } else {
            console.log('[CALLBACK SECURITY] WARNING: BKAPay returned non-JSON response');
          }
        } else {
          console.log('[CALLBACK SECURITY] WARNING: BKAPay API returned status:', verifyResponse.status);
        }
      } catch (apiError) {
        console.error('[CALLBACK SECURITY] BKAPay API error:', apiError);
      }

      // SECURITY: If payment NOT verified by API, DO NOT activate
      if (!paymentVerified) {
        console.log('[CALLBACK SECURITY] ✗ PAYMENT NOT VERIFIED - Activation BLOCKED');
        
        // Mark as awaiting verification for admin review
        await db.update(bkapayPayments).set({ 
          status: 'awaiting_verification'
        }).where(eq(bkapayPayments.reference, reference));

        return res.status(402).json({ 
          message: 'Paiement non confirmé par BKAPay. Votre demande sera examinée.',
          activated: false,
          verified: false
        });
      }

      // Payment verified - credit balance and activate account
      console.log('[CALLBACK SECURITY] ✓ Payment verified - Activating account...');
      
      await db.update(bkapayPayments).set({ 
        status: 'completed',
        completedAt: new Date(),
      }).where(eq(bkapayPayments.reference, reference));

      // Credit user balance with payment amount
      const depositAmount = parseFloat(paymentRecord.amount);
      await storage.updateUserBalance(paymentRecord.userId, depositAmount);

      await storage.createTransaction({
        userId: paymentRecord.userId,
        type: 'recharge',
        amount: depositAmount.toString(),
        description: 'Dépôt via BKAPay',
        status: 'completed',
        reference: transactionId || reference,
        operator: 'BKAPay'
      });

      // Activate account automatically
      await storage.activateAccount(paymentRecord.userId);

      console.log('[CALLBACK SECURITY] ===== ACCOUNT ACTIVATED =====');
      return res.json({ message: 'Compte activé avec succès', activated: true, balanceCredited: depositAmount, verified: true });
      
    } catch (error) {
      console.error('[CALLBACK SECURITY] Error processing callback:', error);
      res.status(500).json({ message: 'Erreur lors du traitement du paiement' });
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

  // Initialiser les paramètres par défaut
  storage.initializeDefaultSettings().catch(console.error);

  const httpServer = createServer(app);
  return httpServer;
}
