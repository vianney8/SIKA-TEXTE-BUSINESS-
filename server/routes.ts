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
  paymentSchema 
} from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";

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
function requireAuth(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup sessions
  setupSessions(app);

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
      const validatedData = simpleRegisterSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      const user = await storage.createUser({
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        fullName: `${validatedData.firstName} ${validatedData.lastName}`,
        phone: validatedData.phone,
      });

      // Set session
      (req as any).session.userId = user.id;

      res.status(201).json({ message: "Compte créé avec succès", user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Données invalides", errors: error.issues });
      }
      res.status(500).json({ message: "Erreur lors de la création du compte" });
    }
  });

  // Simple login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = simpleLoginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      // Set session
      (req as any).session.userId = user.id;

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
      const transactions = await storage.getUserTransactions(userId, limit, type, status);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des transactions" });
    }
  });

  // Transfer money
  app.post('/api/transactions/transfer', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { recipientPhone, amount, message } = transferSchema.parse(req.body);
      
      // Check sender balance
      const balance = await storage.getUserBalance(userId);
      if (balance < amount) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      // Create transaction
      const transaction = await storage.createTransaction({
        userId,
        type: 'transfer',
        amount: amount.toString(),
        recipientPhone,
        description: message,
        status: 'completed',
      });

      // Update balance
      await storage.updateUserBalance(userId, -amount);

      res.json({ message: "Transfert effectué avec succès", transaction });
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

  // User referrals
  app.get('/api/referrals', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const referrals = await storage.getUserReferrals(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des parrainages" });
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

  const httpServer = createServer(app);
  return httpServer;
}
